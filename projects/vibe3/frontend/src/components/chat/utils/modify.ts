import * as ActionTypes from "../types";
import {
  FileSystemTree,
  DirectoryNode,
  FileNode,
  type WebContainer,
} from "@webcontainer/api";
import { reportError } from "@/services/error_report";
import { FileEditOperation, MatchStrategy } from "../types";

// 递归复制目录的辅助函数
async function copyDirectoryRecursively(
  webContainer: WebContainer,
  sourcePath: string,
  targetPath: string
) {
  // 创建目标目录
  await webContainer.fs.mkdir(targetPath, { recursive: true });

  // 读取源目录内容
  const entries = await webContainer.fs.readdir(sourcePath, {
    withFileTypes: true,
    encoding: "utf-8",
  });

  for (const entry of entries) {
    const sourceEntryPath = `${sourcePath}/${entry.name}`;
    const targetEntryPath = `${targetPath}/${entry.name}`;

    if (entry.isFile()) {
      // 复制文件
      const content = await webContainer.fs.readFile(sourceEntryPath, "utf-8");
      await webContainer.fs.writeFile(targetEntryPath, content, "utf-8");
    } else if (entry.isDirectory()) {
      // 递归复制子目录
      await copyDirectoryRecursively(
        webContainer,
        sourceEntryPath,
        targetEntryPath
      );
    }
  }
}

// 处理 package.json 变化时的特殊逻辑
async function handlePackageJsonChange(webContainer: WebContainer) {
  try {
    console.log(
      "Package.json or package-lock.json changed, restarting development server..."
    );

    // 1. 停止当前的开发服务器
    try {
      // 查找并终止可能正在运行的 npm dev 进程
      const killProcess = await webContainer.spawn("pkill", ["-f", "npm.*dev"]);
      await killProcess.exit;
      console.log("Stopped existing npm dev process");
    } catch (error) {
      // 如果没有正在运行的进程，这个错误是正常的
      console.log("No existing npm dev process to stop");
    }

    // 2. 重新安装依赖
    console.log("Installing dependencies...");
    const installProcess = await webContainer.spawn("npm", ["install"]);
    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      console.error("Failed to install dependencies");
      return;
    }
    console.log("Dependencies installed successfully");

    // 3. 启动开发服务器
    console.log("Starting development server...");
    const devProcess = await webContainer.spawn("npm", ["run", "dev"]);

    console.log("Development server started successfully");
  } catch (error) {
    console.error("Failed to handle package.json change:", error);
  }
}

// 安全地分割文件内容为行数组
function splitIntoLines(content: string): string[] {
  // 统一换行符为 \n，然后分割
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  
  // 如果文件末尾有换行符，split 会产生一个空字符串，我们需要保留它
  // 如果文件末尾没有换行符，我们不需要添加额外的空行
  return lines;
}

// 安全地合并行数组为文件内容
function joinLines(lines: string[]): string {
  return lines.join('\n');
}

// 深度复制目录结构的辅助函数
export function deepCopyDirectory(directory: FileSystemTree): FileSystemTree {
  const copy: FileSystemTree = {};

  for (const [name, node] of Object.entries(directory)) {
    if ("file" in node) {
      const fileNode = node as FileNode;
      copy[name] = {
        file: {
          contents: fileNode.file.contents,
        },
      };
    } else if ("directory" in node) {
      const dirNode = node as DirectoryNode;
      copy[name] = {
        directory: deepCopyDirectory(dirNode.directory),
      };
    }
  }

  return copy;
}

// 内容匹配辅助函数
function normalizeContent(content: string): string {
  // 统一换行符并标准化空白字符
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// 查找内容在文件中的位置
function findContentPosition(
  fileContent: string,
  targetContent: string,
  matchStrategy: MatchStrategy = MatchStrategy.EXACT
): { start: number; end: number } | null {
  const lines = splitIntoLines(fileContent);
  
  switch (matchStrategy) {
    case MatchStrategy.EXACT:
      const exactIndex = fileContent.indexOf(targetContent);
      if (exactIndex !== -1) {
        return {
          start: exactIndex,
          end: exactIndex + targetContent.length
        };
      }
      break;
      
    case MatchStrategy.FUZZY:
      const normalizedTarget = normalizeContent(targetContent);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (normalizeContent(line).includes(normalizedTarget)) {
          const start = fileContent.indexOf(line);
          return {
            start: start,
            end: start + line.length
          };
        }
      }
      break;
      
    case MatchStrategy.LINE_START:
      const targetLines = splitIntoLines(targetContent);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(targetLines[0].trim())) {
          const start = fileContent.indexOf(lines[i]);
          return {
            start: start,
            end: start + lines[i].length
          };
        }
      }
      break;
      
    case MatchStrategy.LINE_END:
      const targetLinesEnd = splitIntoLines(targetContent);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().endsWith(targetLinesEnd[targetLinesEnd.length - 1].trim())) {
          const start = fileContent.indexOf(lines[i]);
          return {
            start: start,
            end: start + lines[i].length
          };
        }
      }
      break;
  }
  
  return null;
}

// 新的智能文件编辑函数
export async function resolveEditFileSmart(
  action: ActionTypes.ModifyActionEditFileSmartInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 智能编辑文件 =>", action);
  
  // 输入参数验证
  if (!action || !action.path || action.newContent === undefined) {
    console.warn("Invalid action parameters for resolveEditFileSmart");
    return;
  }

  if (!webContainer) {
    console.warn("WebContainer is null or undefined");
    return;
  }

  // 验证操作类型
  if (!Object.values(FileEditOperation).includes(action.operation)) {
    console.warn(`Invalid operation: ${action.operation}`);
    return;
  }

  try {
    // 读取当前文件内容
    const currentContent = await webContainer.fs.readFile(action.path, "utf-8");
    let newFileContent = currentContent;
    
    const matchStrategy = action.matchStrategy || MatchStrategy.EXACT;
    
    switch (action.operation) {
      case FileEditOperation.APPEND:
        // 在文件末尾追加内容
        newFileContent = currentContent + (currentContent.endsWith('\n') ? '' : '\n') + action.newContent;
        break;
        
      case FileEditOperation.PREPEND:
        // 在文件开头插入内容
        newFileContent = action.newContent + (currentContent.startsWith('\n') ? '' : '\n') + currentContent;
        break;
        
      case FileEditOperation.DELETE:
        // 删除匹配的内容
        if (!action.targetContent) {
          console.warn("targetContent is required for DELETE operation");
          return;
        }
        const deletePosition = findContentPosition(currentContent, action.targetContent, matchStrategy);
        if (deletePosition) {
          newFileContent = currentContent.slice(0, deletePosition.start) + 
                          currentContent.slice(deletePosition.end);
        } else {
          console.warn(`Target content not found for DELETE operation: ${action.targetContent}`);
          return;
        }
        break;
        
      case FileEditOperation.REPLACE:
        // 替换匹配的内容
        if (!action.targetContent) {
          console.warn("targetContent is required for REPLACE operation");
          return;
        }
        const replacePosition = findContentPosition(currentContent, action.targetContent, matchStrategy);
        if (replacePosition) {
          newFileContent = currentContent.slice(0, replacePosition.start) + 
                          action.newContent + 
                          currentContent.slice(replacePosition.end);
        } else {
          console.warn(`Target content not found for REPLACE operation: ${action.targetContent}`);
          return;
        }
        break;
        
      case FileEditOperation.INSERT_BEFORE:
        // 在匹配内容前插入
        if (!action.targetContent) {
          console.warn("targetContent is required for INSERT_BEFORE operation");
          return;
        }
        const insertBeforePosition = findContentPosition(currentContent, action.targetContent, matchStrategy);
        if (insertBeforePosition) {
          newFileContent = currentContent.slice(0, insertBeforePosition.start) + 
                          action.newContent + 
                          currentContent.slice(insertBeforePosition.start);
        } else {
          console.warn(`Target content not found for INSERT_BEFORE operation: ${action.targetContent}`);
          return;
        }
        break;
        
      case FileEditOperation.INSERT_AFTER:
        // 在匹配内容后插入
        if (!action.targetContent) {
          console.warn("targetContent is required for INSERT_AFTER operation");
          return;
        }
        const insertAfterPosition = findContentPosition(currentContent, action.targetContent, matchStrategy);
        if (insertAfterPosition) {
          newFileContent = currentContent.slice(0, insertAfterPosition.end) + 
                          action.newContent + 
                          currentContent.slice(insertAfterPosition.end);
        } else {
          console.warn(`Target content not found for INSERT_AFTER operation: ${action.targetContent}`);
          return;
        }
        break;
        
      default:
        console.warn(`Unsupported operation: ${action.operation}`);
        return;
    }

    // 写入更新后的文件内容
    await webContainer.fs.writeFile(action.path, newFileContent, "utf-8");
    console.log(`Successfully updated file with smart edit: ${action.path} (operation: ${action.operation})`);
  } catch (error) {
    reportError(error as Error, "resolve-edit-file-smart", action);
    console.error(`Failed to update file with smart edit ${action.path}:`, error);
  }
}


export async function resolveEditFile(
  action: ActionTypes.ModifyActionEditFileInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 修改文件 =>", action);
  // 输入参数验证
  if (!action || !action.path || action.content === undefined) {
    console.warn("Invalid action parameters for resolveEditFile");
    return;
  }

  if (!webContainer) {
    console.warn("WebContainer is null or undefined");
    return;
  }

  // 安全地更新文件内容
  try {
    // 确保内容类型正确
    const content =
      typeof action.content === "string"
        ? action.content
        : String(action.content);

    // 更新 WebContainer 中的文件
    await webContainer.fs.writeFile(action.path, content, "utf-8");
    console.log(`Successfully updated file in WebContainer: ${action.path}`);

    // 检查是否是 package.json 或 package-lock.json 文件
    if (action.path === "package.json" || action.path === "package-lock.json") {
      await handlePackageJsonChange(webContainer);
    }
  } catch (error) {
    reportError(error as Error, "resolve-edit-file", action);
    console.error(`Failed to update file ${action.path}:`, error);
  }
}

export async function resolveCreateFile(
  action: ActionTypes.ModifyActionCreateFileInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 创建文件 =>", action);
  // 输入参数验证
  if (!action || !action.path || action.content === undefined) {
    console.warn("Invalid action parameters for resolveCreateFile");
    return;
  }

  // 验证路径格式
  if (action.path.trim() === "" || action.path.includes("//")) {
    console.warn(`Invalid file path: ${action.path}`);
    return;
  }

  try {
    // 解析路径
    const pathParts = action.path.split("/").filter((part) => part !== "");
    if (pathParts.length === 0) {
      console.warn("Invalid file path: empty path");
      return;
    }

    const fileName = pathParts.pop()!;
    const parentPath = pathParts.join("/");

    // 确保内容类型正确
    const content =
      typeof action.content === "string"
        ? action.content
        : String(action.content);

    // 创建 WebContainer 中的文件
    if (webContainer) {
      try {
        // 确保父目录存在
        if (parentPath !== "") {
          await webContainer.fs.mkdir(parentPath, { recursive: true });
        }
        await webContainer.fs.writeFile(action.path, content, "utf-8");
        console.log(
          `Successfully created file in WebContainer: ${action.path}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to create file in WebContainer ${action.path}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(`Successfully created file: ${action.path}`);
    }
  } catch (error) {
    reportError(error as Error, "resolve-create-file", action);
    console.error(`Failed to create file ${action.path}:`, error);
  }
}

export async function resolveDeleteFile(
  action: ActionTypes.ModifyActionDeleteFileInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 删除文件 =>", action);
  // 输入参数验证
  if (!action || !action.path) {
    console.warn("Invalid action parameters for resolveDeleteFile");
    return;
  }

  // 验证路径格式
  if (action.path.trim() === "" || action.path.includes("//")) {
    console.warn(`Invalid file path: ${action.path}`);
    return;
  }

  try {
    // 删除 WebContainer 中的文件
    if (webContainer) {
      try {
        await webContainer.fs.rm(action.path);
        console.log(
          `Successfully deleted file in WebContainer: ${action.path}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to delete file in WebContainer ${action.path}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(`Successfully deleted file: ${action.path}`);
    }
  } catch (error) {
    reportError(error as Error, "resolve-delete-file", action);
    console.error(`Failed to delete file ${action.path}:`, error);
  }
}

export async function resolveRenameFile(
  action: ActionTypes.ModifyActionRenameFileInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 重命名文件 =>", action);
  // 输入参数验证
  if (!action || !action.path || !action.newPath) {
    console.warn("Invalid action parameters for resolveRenameFile");
    return;
  }

  // 验证路径格式
  if (
    action.path.trim() === "" ||
    action.newPath.trim() === "" ||
    action.path.includes("//") ||
    action.newPath.includes("//")
  ) {
    console.warn(`Invalid file paths: ${action.path} -> ${action.newPath}`);
    return;
  }

  // 检查源路径和目标路径是否相同
  if (action.path === action.newPath) {
    console.warn("Source and target paths are the same");
    return;
  }

  try {
    // 同步重命名 WebContainer 中的文件（使用创建+删除的方式）
    if (webContainer) {
      try {
        // 读取原文件内容
        const originalContent = await webContainer.fs.readFile(
          action.path,
          "utf-8"
        );

        // 确保新文件的父目录存在
        const newPathParts = action.newPath
          .split("/")
          .filter((part) => part !== "");
        if (newPathParts.length > 1) {
          const newParentPath = newPathParts.slice(0, -1).join("/");
          await webContainer.fs.mkdir(newParentPath, { recursive: true });
        }

        // 创建新文件
        await webContainer.fs.writeFile(
          action.newPath,
          originalContent,
          "utf-8"
        );

        // 删除原文件
        await webContainer.fs.rm(action.path);

        console.log(
          `Successfully renamed file in WebContainer: ${action.path} -> ${action.newPath}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to rename file in WebContainer ${action.path} to ${action.newPath}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(
        `Successfully renamed file: ${action.path} -> ${action.newPath}`
      );
    }
  } catch (error) {
    reportError(error as Error, "resolve-rename-file", action);
    console.error(
      `Failed to rename file ${action.path} to ${action.newPath}:`,
      error
    );
  }
}

export async function resolveMoveFile(
  action: ActionTypes.ModifyActionMoveFileInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 移动文件 =>", action);
  // 输入参数验证
  if (!action || !action.path || !action.newPath) {
    console.warn("Invalid action parameters for resolveMoveFile");
    return;
  }

  // 验证路径格式
  if (
    action.path.trim() === "" ||
    action.newPath.trim() === "" ||
    action.path.includes("//") ||
    action.newPath.includes("//")
  ) {
    console.warn(`Invalid file paths: ${action.path} -> ${action.newPath}`);
    return;
  }

  // 检查源路径和目标路径是否相同
  if (action.path === action.newPath) {
    console.warn("Source and target paths are the same");
    return;
  }

  try {
    // 同步移动 WebContainer 中的文件（使用创建+删除的方式）
    if (webContainer) {
      try {
        // 读取原文件内容
        const originalContent = await webContainer.fs.readFile(
          action.path,
          "utf-8"
        );

        // 确保新文件的父目录存在
        const newPathParts = action.newPath
          .split("/")
          .filter((part) => part !== "");
        if (newPathParts.length > 1) {
          const newParentPath = newPathParts.slice(0, -1).join("/");
          await webContainer.fs.mkdir(newParentPath, { recursive: true });
        }

        // 创建新文件
        await webContainer.fs.writeFile(
          action.newPath,
          originalContent,
          "utf-8"
        );

        // 删除原文件
        await webContainer.fs.rm(action.path);

        console.log(
          `Successfully moved file in WebContainer: ${action.path} -> ${action.newPath}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to move file in WebContainer ${action.path} to ${action.newPath}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(
        `Successfully moved file: ${action.path} -> ${action.newPath}`
      );
    }
  } catch (error) {
    reportError(error as Error, "resolve-move-file", action);
    console.error(
      `Failed to move file ${action.path} to ${action.newPath}:`,
      error
    );
  }
}

export async function resolveCreateDirectory(
  action: ActionTypes.ModifyActionCreateDirectoryInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 创建目录 =>", action);
  // 输入参数验证
  if (!action || !action.path) {
    console.warn("Invalid action parameters for resolveCreateDirectory");
    return;
  }

  // 验证路径格式
  if (action.path.trim() === "" || action.path.includes("//")) {
    console.warn(`Invalid directory path: ${action.path}`);
    return;
  }

  try {
    // 同步创建 WebContainer 中的目录
    if (webContainer) {
      try {
        await webContainer.fs.mkdir(action.path, { recursive: true });
        console.log(
          `Successfully created directory in WebContainer: ${action.path}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to create directory in WebContainer ${action.path}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(`Successfully created directory: ${action.path}`);
    }
  } catch (error) {
    reportError(error as Error, "resolve-create-directory", action);
    console.error(`Failed to create directory ${action.path}:`, error);
  }
}

export async function resolveDeleteDirectory(
  action: ActionTypes.ModifyActionDeleteDirectoryInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 删除目录 =>", action);
  // 输入参数验证
  if (!action || !action.path) {
    console.warn("Invalid action parameters for resolveDeleteDirectory");
    return;
  }

  // 验证路径格式
  if (action.path.trim() === "" || action.path.includes("//")) {
    console.warn(`Invalid directory path: ${action.path}`);
    return;
  }

  try {
    // 同步删除 WebContainer 中的目录
    if (webContainer) {
      try {
        await webContainer.fs.rm(action.path, { recursive: true });
        console.log(
          `Successfully deleted directory in WebContainer: ${action.path}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to delete directory in WebContainer ${action.path}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(`Successfully deleted directory: ${action.path}`);
    }
  } catch (error) {
    reportError(error as Error, "resolve-delete-directory", action);
    console.error(`Failed to delete directory ${action.path}:`, error);
  }
}

export async function resolveRenameDirectory(
  action: ActionTypes.ModifyActionRenameDirectoryInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 重命名目录 =>", action);
  // 输入参数验证
  if (!action || !action.path || !action.newPath) {
    console.warn("Invalid action parameters for resolveRenameDirectory");
    return;
  }

  // 验证路径格式
  if (
    action.path.trim() === "" ||
    action.newPath.trim() === "" ||
    action.path.includes("//") ||
    action.newPath.includes("//")
  ) {
    console.warn(
      `Invalid directory paths: ${action.path} -> ${action.newPath}`
    );
    return;
  }

  // 检查源路径和目标路径是否相同
  if (action.path === action.newPath) {
    console.warn("Source and target paths are the same");
    return;
  }

  try {
    // 同步重命名 WebContainer 中的目录（使用创建+删除的方式）
    if (webContainer) {
      try {
        // 递归复制目录内容
        await copyDirectoryRecursively(
          webContainer,
          action.path,
          action.newPath
        );

        // 删除原目录
        await webContainer.fs.rm(action.path, { recursive: true });

        console.log(
          `Successfully renamed directory in WebContainer: ${action.path} -> ${action.newPath}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to rename directory in WebContainer ${action.path} to ${action.newPath}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(
        `Successfully renamed directory: ${action.path} -> ${action.newPath}`
      );
    }
  } catch (error) {
    reportError(error as Error, "resolve-rename-directory", action);
    console.error(
      `Failed to rename directory ${action.path} to ${action.newPath}:`,
      error
    );
  }
}

export async function resolveMoveDirectory(
  action: ActionTypes.ModifyActionMoveDirectoryInput,
  webContainer: WebContainer
): Promise<void> {
  console.log("[vibe3]: 移动目录 =>", action);
  // 输入参数验证
  if (!action || !action.path || !action.newPath) {
    console.warn("Invalid action parameters for resolveMoveDirectory");
    return;
  }

  // 验证路径格式
  if (
    action.path.trim() === "" ||
    action.newPath.trim() === "" ||
    action.path.includes("//") ||
    action.newPath.includes("//")
  ) {
    console.warn(
      `Invalid directory paths: ${action.path} -> ${action.newPath}`
    );
    return;
  }

  // 检查源路径和目标路径是否相同
  if (action.path === action.newPath) {
    console.warn("Source and target paths are the same");
    return;
  }

  // 检查目标路径是否是源路径的子目录（防止循环移动）
  if (action.newPath.startsWith(action.path + "/")) {
    console.warn(
      `Cannot move directory ${action.path} into its own subdirectory ${action.newPath}`
    );
    return;
  }

  try {
    // 同步移动 WebContainer 中的目录（使用创建+删除的方式）
    if (webContainer) {
      try {
        // 递归复制目录内容
        await copyDirectoryRecursively(
          webContainer,
          action.path,
          action.newPath
        );

        // 删除原目录
        await webContainer.fs.rm(action.path, { recursive: true });

        console.log(
          `Successfully moved directory in WebContainer: ${action.path} -> ${action.newPath}`
        );
      } catch (webContainerError) {
        console.error(
          `Failed to move directory in WebContainer ${action.path} to ${action.newPath}:`,
          webContainerError
        );
        throw webContainerError;
      }
    } else {
      console.log(
        `Successfully moved directory: ${action.path} -> ${action.newPath}`
      );
    }
  } catch (error) {
    reportError(error as Error, "resolve-move-directory", action);
    console.error(
      `Failed to move directory ${action.path} to ${action.newPath}:`,
      error
    );
  }
}


export async function resolveModifyAction(
  action: ActionTypes.ModifyActionOutput,
  webContainer: WebContainer
): Promise<void> {
  // 输入参数验证
  if (!action || !action.type) {
    console.warn("Invalid action parameter: missing type");
    return;
  }

  if (!webContainer) {
    console.warn("WebContainer is null or undefined");
    return;
  }

  console.log(`Processing single modify action: ${action.type}`);

  try {
    // 根据操作类型分发到相应的处理函数
    switch (action.type) {
      case "modify_action_edit_file":
        await resolveEditFile(action, webContainer);
        break;

      case "modify_action_edit_file_smart":
        await resolveEditFileSmart(action, webContainer);
        break;

      case "modify_action_create_file":
        await resolveCreateFile(action, webContainer);
        break;

      case "modify_action_delete_file":
        await resolveDeleteFile(action, webContainer);
        break;

      case "modify_action_rename_file":
        await resolveRenameFile(action, webContainer);
        break;

      case "modify_action_move_file":
        await resolveMoveFile(action, webContainer);
        break;

      case "modify_action_create_directory":
        await resolveCreateDirectory(action, webContainer);
        break;

      case "modify_action_delete_directory":
        await resolveDeleteDirectory(action, webContainer);
        break;

      case "modify_action_rename_directory":
        await resolveRenameDirectory(action, webContainer);
        break;

      case "modify_action_move_directory":
        await resolveMoveDirectory(action, webContainer);
        break;

      default:
        console.warn(`Unknown action type: ${JSON.stringify(action)}`);
        break;
    }

    console.log(`Successfully processed single modify action: ${action.type}`);
  } catch (error) {
    console.error(
      `Failed to process single modify action (${action.type}):`,
      error
    );
    reportError(error as Error, "resolve-single-modify-action", action);
    throw error;
  }
}


