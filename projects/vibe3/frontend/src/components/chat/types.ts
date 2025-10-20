import { type UIMessage } from "ai";
import { z } from "zod";

export enum ToolType {
  modify_action_edit_file = "modify_action_edit_file",
  modify_action_edit_file_smart = "modify_action_edit_file_smart",
  modify_action_create_file = "modify_action_create_file",
  modify_action_delete_file = "modify_action_delete_file",
  modify_action_rename_file = "modify_action_rename_file",
  modify_action_move_file = "modify_action_move_file",
  modify_action_create_directory = "modify_action_create_directory",
  modify_action_delete_directory = "modify_action_delete_directory",
  modify_action_rename_directory = "modify_action_rename_directory",
  modify_action_move_directory = "modify_action_move_directory",
  read_action_files = "read_action_files",
  read_action_directory = "read_action_directory",
  check_action_linting = "check_action_linting",
  npm_install = "npm_install",
}

// 新的文件编辑操作类型
export enum FileEditOperation {
  REPLACE = "replace", // 替换匹配的内容
  INSERT_BEFORE = "insert_before", // 在匹配内容前插入
  INSERT_AFTER = "insert_after", // 在匹配内容后插入
  DELETE = "delete", // 删除匹配的内容
  APPEND = "append", // 在文件末尾追加
  PREPEND = "prepend", // 在文件开头插入
}

// 匹配策略
export enum MatchStrategy {
  EXACT = "exact", // 精确匹配
  FUZZY = "fuzzy", // 模糊匹配（忽略空白字符差异）
  LINE_START = "line_start", // 行首匹配
  LINE_END = "line_end", // 行尾匹配
}

export type ModifyActionEditFilePartialInput = {
  path: string;
  fromLine: number;
  toLine: number;
  originalContent: string;
  newContent: string;
};

export interface ModifyActionEditFilePartialOutput
  extends ModifyActionEditFilePartialInput {
  type: ToolType.modify_action_edit_file_smart;
}

// 新的智能文件编辑输入类型
export type ModifyActionEditFileSmartInput = {
  path: string;
  operation: FileEditOperation;
  targetContent?: string; // 要匹配的目标内容（可选）
  newContent: string; // 新的内容
  matchStrategy?: MatchStrategy; // 匹配策略，默认为 EXACT
  contextLines?: number; // 上下文行数，用于更精确的匹配
};

export interface ModifyActionEditFileSmartOutput
  extends ModifyActionEditFileSmartInput {
  type: ToolType.modify_action_edit_file_smart;
}

export type ModifyActionEditFileInput = {
  path: string;
  content: string;
};

export type ModifyActionEditFileOutput = {
  type: ToolType.modify_action_edit_file;
  path: string;
  content: string;
};

export type ModifyActionCreateFileInput = {
  path: string;
  content: string;
};

export type ModifyActionCreateFileOutput = {
  type: ToolType.modify_action_create_file;
  path: string;
  content: string;
};

export type ModifyActionDeleteFileInput = {
  path: string;
};

export interface ModifyActionDeleteFileOutput
  extends ModifyActionDeleteFileInput {
  type: ToolType.modify_action_delete_file;
}

export type ModifyActionRenameFileInput = {
  path: string;
  newPath: string;
};

export interface ModifyActionRenameFileOutput
  extends ModifyActionRenameFileInput {
  type: ToolType.modify_action_rename_file;
}

export type ModifyActionMoveFileInput = {
  path: string;
  newPath: string;
};

export interface ModifyActionMoveFileOutput extends ModifyActionMoveFileInput {
  type: ToolType.modify_action_move_file;
}

export type ModifyActionCreateDirectoryInput = {
  path: string;
};

export interface ModifyActionCreateDirectoryOutput
  extends ModifyActionCreateDirectoryInput {
  type: ToolType.modify_action_create_directory;
  path: string;
}

export type ModifyActionDeleteDirectoryInput = {
  path: string;
};

export interface ModifyActionDeleteDirectoryOutput
  extends ModifyActionDeleteDirectoryInput {
  type: ToolType.modify_action_delete_directory;
}

export type ModifyActionRenameDirectoryInput = {
  path: string;
  newPath: string;
};

export interface ModifyActionRenameDirectoryOutput
  extends ModifyActionRenameDirectoryInput {
  type: ToolType.modify_action_rename_directory;
}

export type ModifyActionMoveDirectoryInput = {
  path: string;
  newPath: string;
};

export interface ModifyActionMoveDirectoryOutput
  extends ModifyActionMoveDirectoryInput {
  type: ToolType.modify_action_move_directory;
}

// union type for all modify action inputs
export type ModifyActionInput =
  | ModifyActionEditFileInput
  | ModifyActionEditFileSmartInput
  | ModifyActionCreateFileInput
  | ModifyActionDeleteFileInput
  | ModifyActionRenameFileInput
  | ModifyActionMoveFileInput
  | ModifyActionCreateDirectoryInput
  | ModifyActionDeleteDirectoryInput
  | ModifyActionRenameDirectoryInput
  | ModifyActionMoveDirectoryInput;

// union type for all modify action outputs
export type ModifyActionOutput =
  | ModifyActionEditFileOutput
  | ModifyActionEditFileSmartOutput
  | ModifyActionCreateFileOutput
  | ModifyActionDeleteFileOutput
  | ModifyActionRenameFileOutput
  | ModifyActionMoveFileOutput
  | ModifyActionCreateDirectoryOutput
  | ModifyActionDeleteDirectoryOutput
  | ModifyActionRenameDirectoryOutput
  | ModifyActionMoveDirectoryOutput;

export type ModifyActionOutputs = Array<ModifyActionOutput>;
export type ModifyActionInputs = Array<ModifyActionInput>;

export type ReadActionFilesInput = {
  paths: string[];
};

export interface ReadActionFilesOutput extends ReadActionFilesInput {
  type: ToolType.read_action_files;
  result: { content: string; path: string }[];
}

export type ReadActionDirectoryInput = {
  path: string;
};

export interface ReadActionDirectoryOutput extends ReadActionDirectoryInput {
  type: ToolType.read_action_directory;
  content: { path: string; isDirectory: boolean }[];
}

export type ReadActionOutputs = Array<
  ReadActionFilesOutput | ReadActionDirectoryOutput
>;
export type ReadActionInputs = Array<
  ReadActionFilesInput | ReadActionDirectoryInput
>;

export type LintingInput = {
  paths: string[];
};

export interface LintingOutput extends LintingInput {
  type: ToolType.check_action_linting;
  result: string;
}

export type NpmInstallInput = {
  packageNames: string[];
  args?: string[];
};

export interface NpmInstallOutput extends NpmInstallInput {
  type: ToolType.npm_install;
  result: string;
}

export type SendMessagesRequestBody = {
  appid: string;
  client_chatid: string;
  messages: UIMessage[];
};

export type UIMessageMetadata = {
    model: string;
}

export interface SendMessagesRequestParams {
  headers: Record<string, string>;
  body: SendMessagesRequestBody;
}
