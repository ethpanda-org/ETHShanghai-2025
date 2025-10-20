import {
  BlobReader,
  ZipReader,
  BlobWriter,
  ZipWriter,
} from "@zip.js/zip.js";
import {
  type FileSystemTree,
  type DirectoryNode,
  type FileNode,
  type WebContainer,
} from "@webcontainer/api";

export const IGNORE_LIST = ["node_modules", ".git"];
export const IGNORE_FILE_LIST = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
];

/**
 * Check if a file is a text file based on its extension
 * @param filename - filename
 * @returns boolean - whether it's a text file
 */
export const isTextFileByExtension = (filename: string): boolean => {
  if (!filename || typeof filename !== "string") {
    return false;
  }

  if (
    filename.includes("LICENSE") ||
    filename.includes("README") ||
    filename.includes("license") ||
    filename.includes("readme")
  ) {
    return true;
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));

  // 使用 Set 提高查找性能
  const textExtensions = new Set([
    // Code files
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".vue",
    ".svelte",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".py",
    ".rb",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".clj",
    ".hs",
    ".ml",
    ".fs",
    ".r",
    ".php",
    ".svg",
    ".sol",
    ".cts",
    ".cjs",
    ".mjs",
    ".mts",
    ".njs",
    ".jst",

    // Config files
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".xml",
    ".csv",
    ".sql",
    ".log",

    // Text files
    ".txt",
    ,
    ".md",
    ".rst",
    ".rtf",
    ".map",
    ".flow",
    ".bnf",

    // Shell scripts
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".cmd",

    // Other text formats
    ".dockerfile",
    ".gitignore",
    ".gitattributes",
    ".env",
    ".env.example",
    ".env.local",
    ".env.development",
    ".env.production",
    ".eslintrc",
    ".prettierrc",
    ".babelrc",
    ".editorconfig",
    ".license",
    ".readme",
    ".changelog",
    ".npmignore",
    ".gitkeep",
    ".nvmrc",
    ".eslintignore",
    ".lock",
    ".def",
  ]);

  return textExtensions.has(extension);
};

/**
 * Get MIME type based on file extension
 * @param filename - filename
 * @returns string - MIME type
 */
export const getMimeType = (filename: string): string => {
  if (!filename || typeof filename !== "string") {
    return "application/octet-stream";
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));

  const mimeTypes: Record<string, string> = {
    // Text files
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".js": "application/javascript",
    ".ts": "application/typescript",
    ".jsx": "text/javascript",
    ".tsx": "text/typescript",
    ".html": "text/html",
    ".css": "text/css",
    ".scss": "text/scss",
    ".sass": "text/sass",
    ".xml": "application/xml",
    ".yaml": "application/x-yaml",
    ".yml": "application/x-yaml",
    ".toml": "application/toml",
    ".ini": "text/plain",
    ".cfg": "text/plain",
    ".conf": "text/plain",
    ".log": "text/plain",
    ".csv": "text/plain",
    ".sql": "application/sql",
    ".vue": "text/vue",
    ".svelte": "text/svelte",
    ".php": "application/x-httpd-php",
    ".py": "text/x-python",
    ".rb": "text/x-ruby",
    ".java": "text/x-java-source",
    ".c": "text/x-c",
    ".cpp": "text/x-c++src",
    ".h": "text/x-c",
    ".hpp": "text/x-c++src",
    ".go": "text/x-go",
    ".rs": "text/x-rust",
    ".swift": "text/x-swift",
    ".kt": "text/x-kotlin",
    ".scala": "text/x-scala",
    ".clj": "text/x-clojure",
    ".hs": "text/x-haskell",
    ".ml": "text/x-ocaml",
    ".fs": "text/x-fsharp",
    ".r": "text/x-r",
    ".sh": "application/x-sh",
    ".bash": "application/x-sh",
    ".zsh": "application/x-sh",
    ".fish": "application/x-fish",
    ".ps1": "application/x-powershell",
    ".bat": "application/x-msdos-program",
    ".cmd": "application/x-msdos-program",
    ".dockerfile": "text/plain",
    ".gitignore": "text/plain",
    ".env": "text/plain",
    ".env.example": "text/plain",
    ".env.local": "text/plain",
    ".env.development": "text/plain",
    ".env.production": "text/plain",

    // Image files
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",

    // Font files
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",

    // Audio files
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",

    // Video files
    ".mp4": "video/mp4",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".webm": "video/webm",

    // Document files
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Archive files
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",

    // Others
    ".exe": "application/x-msdownload",
    ".dll": "application/x-msdownload",
    ".so": "application/x-sharedlib",
    ".dylib": "application/x-mach-binary",
  };

  return mimeTypes[extension] || "application/octet-stream";
};

/**
 * Convert zip file content to WebContainers file tree format
 * @param zipBuffer - zip file ArrayBuffer
 * @returns Promise<FileSystemTree> - WebContainers file tree
 */
export const zipToFileSystemTree = async (
  zipBuffer: Blob,
  ignoreList: string[] = IGNORE_LIST
): Promise<FileSystemTree> => {
  const reader = new ZipReader(new BlobReader(zipBuffer));

  try {
    const entries = await reader.getEntries();
    const fileTree: FileSystemTree = {};

    // 预处理忽略列表，提高性能
    const ignorePatterns = [
      "__MACOSX/",
      ".DS_Store",
      "/.DS_Store",
      ".snap",
      "__tests__",
      "__snapshots__",
      ".nycrc",
      ".nix",
      ...ignoreList.map((path) => `${path}/`),
    ];

    for (const entry of entries) {
      // 优化文件过滤逻辑
      if (ignorePatterns.some((pattern) => entry.filename.includes(pattern))) {
        continue;
      }

      if (entry.directory) {
        // 处理目录 - 优化路径处理
        const pathParts = entry.filename.split("/").filter(Boolean);
        let currentLevel = fileTree;

        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (!currentLevel[part]) {
            currentLevel[part] = { directory: {} };
          }
          if (i < pathParts.length - 1) {
            const node = currentLevel[part] as DirectoryNode;
            currentLevel = node.directory;
          }
        }
      } else {
        // 处理文件 - 优化内容读取
        const pathParts = entry.filename.split("/").filter(Boolean);
        const fileName = pathParts.pop();

        if (!fileName) {
          console.warn(`Invalid file entry: ${entry.filename}`);
          continue;
        }

        let currentLevel = fileTree;

        // 创建目录结构
        for (const part of pathParts) {
          if (!currentLevel[part]) {
            currentLevel[part] = { directory: {} };
          }
          const node = currentLevel[part] as DirectoryNode;
          currentLevel = node.directory;
        }

        // 添加文件内容 - 改进错误处理
        try {
          const content = await extractFileContent(entry);
          currentLevel[fileName] = {
            file: { contents: content },
          } as FileNode;
        } catch (error) {
          console.warn(
            `Failed to extract content for ${entry.filename}:`,
            error
          );
          // 根据文件类型设置默认内容
          const isTextFile = isTextFileByExtension(entry.filename);
          const defaultContent = isTextFile ? "" : new ArrayBuffer(0);
          currentLevel[fileName] = {
            file: { contents: defaultContent },
          } as FileNode;
        }
      }
    }

    return fileTree;
  } finally {
    await reader.close();
  }
};

/**
 * Extract file content from zip entry with optimized error handling
 * @param entry - zip entry
 * @returns Promise<ArrayBuffer | string> - file content
 */
const extractFileContent = async (entry: any): Promise<Uint8Array | string> => {
  try {
    const blob =
      (await entry.getData?.(new BlobWriter(getMimeType(entry.filename)))) ||
      new Blob();
    if (isTextFileByExtension(entry.filename)) {
      const arrayBuffer = await blob.arrayBuffer();
      return new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
    } else {
      return new Uint8Array(await blob.arrayBuffer());
    }
  } catch (error) {
    throw new Error(
      `Failed to extract content: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Validate if file tree structure conforms to WebContainers format
 * @param fileTree - file tree object
 * @returns boolean - whether it's valid
 */
export const validateFileSystemTree = (fileTree: FileSystemTree): boolean => {
  if (!fileTree || typeof fileTree !== "object") {
    console.error("Invalid file tree: not an object");
    return false;
  }

  for (const [path, item] of Object.entries(fileTree)) {
    if (!item || typeof item !== "object") {
      console.error(`Invalid item at path ${path}: not an object`);
      return false;
    }

    const hasFile = "file" in item;
    const hasDirectory = "directory" in item;
    const hasSymlink = "symlink" in item;

    // 检查节点类型冲突
    const nodeTypes = [hasFile, hasDirectory, hasSymlink].filter(
      Boolean
    ).length;
    if (nodeTypes > 1) {
      console.error(
        `Path ${path} has multiple node types (file: ${hasFile}, directory: ${hasDirectory}, symlink: ${hasSymlink})`
      );
      return false;
    }

    if (nodeTypes === 0) {
      console.error(`Path ${path} has no valid node type`);
      return false;
    }

    // 递归验证目录
    if (hasDirectory) {
      const dirNode = item as DirectoryNode;
      if (!dirNode.directory || typeof dirNode.directory !== "object") {
        console.error(`Invalid directory structure at path ${path}`);
        return false;
      }
      if (!validateFileSystemTree(dirNode.directory)) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Get template file tree from remote URL
 * @param url - template URL (optional, defaults to localhost)
 * @returns Promise<FileSystemTree> - template file tree
 */
export const getTemplate = async (url?: string): Promise<FileSystemTree> => {
  const templateUrl =
    url || "http://localhost:5173/vite-react-ts-tailwind-starter.zip";

  try {
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch template: ${response.status} ${response.statusText}`
      );
    }

    const templateBuffer = await response.arrayBuffer();

    if (templateBuffer.byteLength === 0) {
      throw new Error("Template file is empty");
    }

    const fileTree = await zipToFileSystemTree(new Blob([templateBuffer]));

    // Validate file tree structure
    if (!validateFileSystemTree(fileTree)) {
      throw new Error("File tree structure validation failed");
    }

    return fileTree;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get template:", errorMessage);
    throw new Error(`Template loading failed: ${errorMessage}`);
  }
};

/**
 * Get language identifier from file path
 * @param path - file path
 * @returns string - language identifier
 */
export const getLanguageFromPath = (path: string): string => {
  const extension = path.toLowerCase().substring(path.lastIndexOf("."));

  // 使用 Map 提高查找性能，避免重复的 case 语句
  const languageMap = new Map<string, string>([
    // Text and markup
    [".txt", "text"],
    [".md", "markdown"],
    [".html", "html"],
    [".xml", "xml"],

    // Data formats
    [".json", "json"],
    [".yaml", "yaml"],
    [".yml", "yaml"],
    [".toml", "toml"],
    [".ini", "ini"],
    [".cfg", "ini"],
    [".conf", "ini"],
    [".csv", "csv"],
    [".sql", "sql"],
    [".log", "log"],

    // Web technologies
    [".js", "javascript"],
    [".jsx", "javascript"],
    [".ts", "typescript"],
    [".tsx", "typescript"],
    [".css", "css"],
    [".scss", "scss"],
    [".sass", "sass"],
    [".vue", "vue"],
    [".svelte", "svelte"],

    // Programming languages
    [".py", "python"],
    [".rb", "ruby"],
    [".java", "java"],
    [".c", "c"],
    [".cpp", "cpp"],
    [".h", "c"],
    [".hpp", "cpp"],
    [".go", "go"],
    [".rs", "rust"],
    [".swift", "swift"],
    [".kt", "kotlin"],
    [".scala", "scala"],
    [".clj", "clojure"],
    [".php", "php"],
  ]);

  return languageMap.get(extension) || "text";
};

/**
 * Get file node from file tree by path
 * @param fileTree - file tree object
 * @param filePath - file path
 * @returns FileNode | null - file node or null if not found
 */
export function getFileFromFileTree(
  fileTree: FileSystemTree | null,
  filePath?: string
): FileNode | null {
  if (!fileTree || !filePath) {
    return null;
  }

  // 规范化路径
  const normalizedPath = filePath.trim();
  if (!normalizedPath) {
    return null;
  }

  // 检查是否以斜杠结尾（表示目录路径）
  if (normalizedPath.endsWith("/") && normalizedPath.length > 1) {
    console.warn(
      `The path ${normalizedPath} appears to be a directory path, not a file path`
    );
    return null;
  }

  const levelPaths = normalizedPath.split("/").filter(Boolean);
  if (levelPaths.length === 0) {
    console.warn(`Invalid path ${normalizedPath}`);
    return null;
  }

  let currentLevel = fileTree;
  for (let i = 0; i < levelPaths.length; i++) {
    const path = levelPaths[i];
    const node = currentLevel[path];

    if (!node) {
      return null;
    }

    if ("file" in node) {
      // 如果是最后一个路径段，返回文件节点
      if (i === levelPaths.length - 1) {
        return node as FileNode;
      } else {
        // 文件不能有子路径
        console.warn(
          `Path ${normalizedPath} tries to access sub-path of file ${path}`
        );
        return null;
      }
    } else if ("directory" in node) {
      // 继续遍历目录
      currentLevel = (node as DirectoryNode).directory;
    } else if ("symlink" in node) {
      console.warn(
        `The path ${normalizedPath} contains a symlink which is not supported`
      );
      return null;
    } else {
      console.warn(`Unknown node type at path ${normalizedPath}`);
      return null;
    }
  }

  return null;
}

/**
 * Get directory from file tree by path
 * @param fileTree - file tree object
 * @param filePath - directory path
 * @returns FileSystemTree | null - directory tree or null if not found
 */
export function getDirectoryFromFileTree(
  fileTree: FileSystemTree | null,
  filePath?: string
): FileSystemTree | null {
  if (!fileTree) {
    return null;
  }

  // 处理空路径和根路径
  if (!filePath || filePath === "" || filePath === "/") {
    return fileTree;
  }

  // 规范化路径：移除末尾的斜杠，但保留开头的斜杠
  const normalizedPath =
    filePath.endsWith("/") && filePath.length > 1
      ? filePath.slice(0, -1)
      : filePath.trim();

  if (!normalizedPath) {
    return fileTree;
  }

  const levelPaths = normalizedPath.split("/").filter(Boolean);
  if (levelPaths.length === 0) {
    return fileTree;
  }

  let currentLevel = fileTree;
  for (const path of levelPaths) {
    const node = currentLevel[path];

    if (!node) {
      return null;
    }

    if ("file" in node) {
      console.warn(`The path ${filePath} is a file, not a directory`);
      return null;
    } else if ("directory" in node) {
      currentLevel = (node as DirectoryNode).directory;
    } else if ("symlink" in node) {
      console.warn(
        `The path ${filePath} contains a symlink which is not supported`
      );
      return null;
    } else {
      console.warn(`Unknown node type at path ${filePath}`);
      return null;
    }
  }

  return currentLevel;
}

/**
 * Convert FileSystemTree to ZIP file
 * @param fileTree - WebContainers file tree
 * @returns Promise<Blob> - Generated ZIP file blob
 */
export async function fileTreeToZip(fileTree: FileSystemTree): Promise<Blob> {
  if (!fileTree || Object.keys(fileTree).length === 0) {
    throw new Error("Invalid file tree: tree is empty or null");
  }

  const writer = new ZipWriter(new BlobWriter("application/zip"), {
    bufferedWrite: true,
    level: 6, // 平衡压缩率和速度
  });

  /**
   * Recursively process file tree and add files to ZIP
   * @param tree - Current level of file tree
   * @param currentPath - Current path in the ZIP file
   */
  const processFileTree = async (
    tree: FileSystemTree,
    currentPath: string = ""
  ): Promise<void> => {
    const entries = Object.entries(tree);

    // 并行处理文件以提高性能
    const filePromises = entries.map(async ([name, node]) => {
      // 如果文件路径包含忽略列表中的路径，则跳过
      if (IGNORE_FILE_LIST.includes(name)) {
        return;
      }
      
      const filePath = currentPath ? `${currentPath}/${name}` : name;

      if ("file" in node) {
        const fileNode = node as FileNode;
        const content = await createBlobFromFileContent(
          fileNode.file.contents,
          name
        );
        await writer.add(filePath, new BlobReader(content));
      } else if ("directory" in node) {
        const dirNode = node as DirectoryNode;
        await processFileTree(dirNode.directory, filePath);
      }
    });

    await Promise.all(filePromises);
  };

  try {
    await processFileTree(fileTree);
    return await writer.close();
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    throw new Error(
      `Failed to create ZIP file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Create Blob from file content with optimized handling
 * @param contents - file contents
 * @param filename - filename for MIME type detection
 * @returns Promise<Blob> - blob content
 */
const createBlobFromFileContent = async (
  contents: string | Uint8Array,
  filename: string
): Promise<Blob> => {
  try {
    if (typeof contents === "string") {
      return new Blob([contents], { type: getMimeType(filename) });
    } else if (contents instanceof Uint8Array) {
      return new Blob([contents] as any, { type: getMimeType(filename) });
    } else {
      // 空内容或未知类型
      return new Blob([], { type: getMimeType(filename) });
    }
  } catch (error) {
    console.warn(`Failed to create blob for ${filename}:`, error);
    return new Blob([], { type: getMimeType(filename) });
  }
};

/**
 * Export file tree from WebContainer with optimized error handling
 * @param webContainer - WebContainer instance
 * @returns Promise<FileSystemTree> - exported file tree
 */
export async function exportFileTreeFromWebContainer(
  webContainer: WebContainer,
  startPath: string = "/",
  ignoreList: string[] = IGNORE_LIST
): Promise<FileSystemTree> {
  if (!webContainer) {
    throw new Error("WebContainer instance is required");
  }

  const fileTree: FileSystemTree = {};

  /**
   * 递归读取目录并构建文件树
   * @param currentPath - 当前路径
   * @param parentNode - 父级节点
   */
  const readDirectory = async (
    currentPath: string,
    parentNode: FileSystemTree
  ): Promise<void> => {
    try {
      const entries = await webContainer.fs.readdir(currentPath, {
        withFileTypes: true,
      });

      // 并行处理文件以提高性能
      const filePromises = entries.map(async (entry) => {
        const entryPath =
          currentPath === "/"
            ? `/${entry.name}`
            : `${currentPath}/${entry.name}`;
        const entryName = entry.name;

        if (entry.isFile()) {
          try {
            const contents = await readFileContent(
              webContainer,
              entryPath,
              entryName
            );
            parentNode[entryName] = {
              file: { contents },
            } as FileNode;
          } catch (fileError) {
            console.warn(`Failed to read file ${entryPath}:`, fileError);
            const defaultContent = isTextFileByExtension(entryName)
              ? ""
              : new ArrayBuffer(0);
            parentNode[entryName] = {
              file: { contents: defaultContent },
            } as FileNode;
          }
        } else if (entry.isDirectory() && !ignoreList.includes(entryName)) {
          const dirNode: DirectoryNode = { directory: {} };
          parentNode[entryName] = dirNode;
          await readDirectory(entryPath, dirNode.directory);
        }
      });

      await Promise.all(filePromises);
    } catch (dirError) {
      console.warn(`Failed to read directory ${currentPath}:`, dirError);
    }
  };

  await readDirectory(startPath, fileTree);
  return fileTree;
}

/**
 * Read file content with optimized handling for different file types
 * @param webContainer - WebContainer instance
 * @param entryPath - file path
 * @param entryName - file name
 * @returns Promise<ArrayBuffer | string> - file content
 */
const readFileContent = async (
  webContainer: WebContainer,
  entryPath: string,
  entryName: string
): Promise<Uint8Array | string> => {
  if (isTextFileByExtension(entryName)) {
    return await webContainer.fs.readFile(entryPath, "utf-8");
  } else {
    return await webContainer.fs.readFile(entryPath);
  }
};

export type FilePath = {
  path: string;
  isDirectory: boolean;
};

export async function exportRootDirectoryFilePaths(
  webContainer: WebContainer,
  path: string
): Promise<FilePath[]> {
  const filePaths = [] as { path: string; isDirectory: boolean }[];

  try {
    const entries = await webContainer.fs.readdir(path, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath =
        path === "/" ? `/${entry.name}` : `${path}/${entry.name}`;
      const isDirectory = entry.isDirectory();

      // 只添加第一层的条目到结果列表
      filePaths.push({ path: entryPath, isDirectory });
    }
  } catch (error) {
    console.warn(`Failed to read directory ${path}:`, error);
  }

  return filePaths;
}

export function filePathsToMarkdownTable(filePaths: FilePath[]): string {
  if (filePaths.length === 0) {
    return "| path | isDirectory |\n|------|-------------|\n";
  }

  const header = "| path | isDirectory |\n|------|-------------|\n";
  const rows = filePaths
    .map((f) => `| \`${f.path}\` | ${f.isDirectory} |`)
    .join("\n");

  return header + rows;
}

export function uint8ArrayToBase64Url(u8arr: Uint8Array) {
  let binary = "";
  for (let i = 0; i < u8arr.length; i++) {
    binary += String.fromCharCode(u8arr[i]);
  }
  const base64 = btoa(binary);
  return base64;
}

/**
 * Mount files from FileSystemTree to WebContainer
 * @param fileTree - WebContainers file tree
 * @param webContainer - WebContainer instance
 */
export async function mountUint8ArrayFilesFromFileTree(
  fileTree: FileSystemTree,
  webContainer: WebContainer
): Promise<void> {
  const flattenedTree: { [index: string]: string | Uint8Array } = {};

  const flattenFileSystemTree = (tree: FileSystemTree, path: string = "") => {
    for (const [name, node] of Object.entries(tree)) {
      const fullPath = path ? `${path}/${name}` : "/" + name;
      if ("file" in node) {
        if ((node.file as FileNode["file"]).contents instanceof Uint8Array) {
          flattenedTree[fullPath] = (node.file as FileNode["file"]).contents;
        }
      } else if ("directory" in node) {
        flattenFileSystemTree(node.directory, fullPath);
      }
    }
  };

  flattenFileSystemTree(fileTree);

  // 使用 Promise.all() 并行写入所有文件以提高速度
  const writePromises = Object.entries(flattenedTree).map(
    async ([path, contents]) => {
      try {
        if (isTextFileByExtension(path)) {
          await webContainer.fs.writeFile(path, contents, "utf-8");
        } else {
          await webContainer.fs.writeFile(path, contents);
        }
      } catch (error) {
        console.warn(`Failed to write file ${path} to WebContainer:`, error);
      }
    }
  );

  await Promise.all(writePromises);
}
