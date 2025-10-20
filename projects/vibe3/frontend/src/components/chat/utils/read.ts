import * as ActionTypes from "../types";
import { WebContainer } from "@webcontainer/api";
import { FilePath } from "@/uitls/files";

export async function resolveReadFiles(
    action: ActionTypes.ReadActionFilesOutput,
    webContainer: WebContainer
  ): Promise<{result: {content: string, path: string}[]} | {error: string}> {
    console.log("[vibe3]: 读取文件 =>", action);
  
    // 输入参数验证
    if (!action || !action.paths) {
      console.warn("Invalid action parameters for resolveReadFile");
      return {error: "Invalid action parameters for resolveReadFile"};
    }
  
    // 验证路径格式
    for (const path of action.paths) {
        if (path.trim() === "" || path.includes("..") || path.startsWith("/")) {
            console.warn(`Invalid file path: ${path}`);
            return {error: "Invalid file path"};
        }
    }
  
    if (!webContainer) {
      console.warn("WebContainer is null or undefined");
      return {error: "WebContainer is null or undefined"};
    }

    const result = [] as {content: string, path: string}[];
    for (const path of action.paths) {
        try {
            const content = await webContainer.fs.readFile(path, "utf-8");
            result.push({content, path});
        } catch (error) {
            console.error(`Failed to read file ${path}:`, error);
            result.push({content: 'file not found', path});
        }
    }

    return {result};
  }
  
  export async function resolveReadDirectory(
    action: ActionTypes.ReadActionDirectoryOutput,
    webContainer: WebContainer
  ): Promise<{path: string, content: FilePath[]} | { error: string }> {
    console.log("[vibe3]: 读取目录 =>", action);
  
    // 输入参数验证
    if (!action || !action.path) {
      console.warn("Invalid action parameters for resolveReadDirectory");
      return { error: "Invalid action parameters for resolveReadDirectory" };
    }
  
    // 验证路径格式
    if (action.path.trim() === "" || action.path.includes("//")) {
      console.warn(`Invalid directory path: ${action.path}`);
      return { error: "Invalid directory path" };
    }
  
    if (!webContainer) {
      console.warn("WebContainer is null or undefined");
      return { error: "WebContainer is null or undefined" };
    }
  
    try {
      // 读取目录内容
      const entries = await webContainer.fs.readdir(action.path, {
        withFileTypes: true,
      });
  
      // 将目录内容转换为所需的格式
      const content: FilePath[] = entries.map((entry) => ({
        path: entry.name,
        isDirectory: entry.isDirectory(),
      }));
  
      return {path: action.path, content};
    } catch (error) {
      // 使用 console.error 记录错误
      console.error(`Failed to read directory ${action.path}:`, error);
  
      // 如果目录不存在，设置空内容
      if (error instanceof Error && error.message.includes("ENOENT")) {
        console.warn(`Directory ${action.path} does not exist`);
        return { error: `Directory ${action.path} does not exist` };
      } else {
        // 其他错误，设置错误信息
        return {
          error: `Error reading directory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }
  }