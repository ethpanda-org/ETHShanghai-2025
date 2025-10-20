import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createIdGenerator,
  UIMessage,
} from "ai";
import { BUILD_SYSTEM_PROMPT } from "@/components/chat/prompt_v1";
import { z } from "zod";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { ProxyAgent } from "undici";
import { appendMessage, setTokenUsage } from "@/services/vibe3_api/messages";
import { instantdb_tools } from "@/services/instantdb_api/tools";
import { getWebSearchTools } from "./mcp/web-search";
import { getVisionTools } from "./mcp/vision";

// Allow streaming responses up to 120 seconds
export const maxDuration = 300;

export type ClientMetadata = {
  appid: string;
  client_chatid: string;
  model?: string;
};

export async function POST(req: Request) {
  // Authorization
  const { headers } = req;
  const token = headers.get("Authorization");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, appid, client_chatid } = await req.json();
  const model = "z-ai/glm-4.5";
  const messageid = createIdGenerator({
    prefix: "msg",
    size: 32,
  })();

  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return new Response("No messages", { status: 400 });
  }

  let lastUserMessage: UIMessage;
  if (lastMessage.role === "user") {
    // save the the user message
    console.log(`[Save user message]:`, lastMessage.id);
    lastUserMessage = lastMessage;
    try {
      await appendMessage(
        {
          appId: appid,
          clientChatId: client_chatid,
          content: lastMessage,
          clientMessageId: lastMessage.id,
          model: model,
        },
        token
      );
    } catch (error) {
      return new Response("Failed to append message", { status: 500 });
    }
  } else {
    lastUserMessage = messages[messages.length - 2];
  }

  const { tools: searchTools, close: closeWebSearchTools } =
    await getWebSearchTools();

  const { tools: visionTools, close: closeVisionTools } =
    await getVisionTools();

  // stream the response
  const result = streamText({
    system: BUILD_SYSTEM_PROMPT,
    stopWhen: stepCountIs(50),
    model: getModel(),
    messages: convertToModelMessages(messages),
    onFinish: (result) => {
      closeWebSearchTools();
      closeVisionTools();
      setTokenUsage(
        {
          appId: appid,
          clientMessageId: lastUserMessage.id,
          inputTokens: result.usage.inputTokens || 0,
          outputTokens: result.usage.outputTokens || 0,
        },
        token
      );
    },
    onError: (error) => {
      closeWebSearchTools();
      closeVisionTools();
      console.error(error);
    },
    tools: {
      npm_install: {
        description:
          "Install npm packages, it will return the result of the npm install: {result: string} or {error: string}",
        inputSchema: z.object({
          packageNames: z
            .string()
            .array()
            .describe(
              "The names of the npm packages to install, eg: ['react@latest', 'react-dom']"
            ),
          args: z
            .string()
            .array()
            .optional()
            .describe(
              "The arguments to pass to the npm install command, eg: ['--save', '--save-dev']"
            ),
        }),
      },
      modify_action_edit_file_smart: {
        description:
          "Smart file editing with multiple operation types: replace, insert, delete, append, etc. Based on content matching instead of line numbers for better accuracy and reliability. NEVER use this tool to modify `instant.schema.ts`",
        inputSchema: z.object({
          path: z.string().describe("File path, e.g.: src/components/App.tsx"),
          operation: z
            .enum([
              "replace",
              "insert_before",
              "insert_after",
              "delete",
              "append",
              "prepend",
            ])
            .describe(
              "Operation type: replace (replace content), insert_before (insert before target), insert_after (insert after target), delete (delete content), append (append to file end), prepend (insert at file start)"
            ),
          targetContent: z
            .string()
            .optional()
            .describe(
              "Target content to match (required for replace, insert_before, insert_after, delete operations)"
            ),
          newContent: z
            .string()
            .describe(
              "New content to insert (can be empty string for delete operation)"
            ),
          matchStrategy: z
            .enum(["exact", "fuzzy", "line_start", "line_end"])
            .optional()
            .describe(
              "Matching strategy: exact (exact match, default), fuzzy (ignore whitespace differences), line_start (match line start), line_end (match line end)"
            ),
          contextLines: z
            .number()
            .optional()
            .describe(
              "Number of context lines for more precise matching (optional)"
            ),
        }),
      },

      modify_action_create_file: {
        description:
          "Create a file, NEVER use this tool to create `instant.schema.ts`",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the file to create, eg: src/components/chat/index.tsx"
            ),
          content: z.string().describe("The content to create the file with"),
        }),
        // execute: ({ path, content }) => {
        //   return { path, content, type: "modify_action_create_file" };
        // },
      },

      modify_action_delete_file: {
        description:
          "Delete a file, NEVER use this tool to delete `instant.schema.ts`",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the file to delete, eg: src/components/chat/index.tsx"
            ),
        }),
        // execute: ({ path }) => {
        //   return { path, type: "modify_action_delete_file" };
        // },
      },

      // rename
      modify_action_rename_file: {
        description: "Rename a file",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the file to rename, eg: src/components/chat/index.tsx"
            ),
          newPath: z
            .string()
            .describe(
              "The new path to the file, eg: src/components/chat/index.tsx"
            ),
        }),
        // execute: ({ path, newPath }) => {
        //   return { path, newPath, type: "modify_action_rename_file" };
        // },
      },

      modify_action_move_file: {
        description: "Move a file",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the file to move, eg: src/components/chat/index.tsx"
            ),
          newPath: z
            .string()
            .describe(
              "The new path to the file, eg: src/components/chat/index.tsx"
            ),
        }),
        // execute: ({ path, newPath }) => {
        //   return { path, newPath, type: "modify_action_move_file" };
        // },
      },

      // directory
      modify_action_create_directory: {
        description: "Create a directory",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the directory to create, eg: src/components/chat"
            ),
        }),
        // execute: ({ path }) => {
        //   return { path, type: "modify_action_create_directory" };
        // },
      },

      modify_action_delete_directory: {
        description: "Delete a directory",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the directory to delete, eg: src/components/chat"
            ),
        }),
        // execute: ({ path }) => {
        //   return { path, type: "modify_action_delete_directory" };
        // },
      },

      modify_action_rename_directory: {
        description: "Rename a directory",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the directory to rename, eg: src/components/chat"
            ),
          newPath: z
            .string()
            .describe("The new path to the directory, eg: src/components/chat"),
        }),
        // execute: ({ path, newPath }) => {
        //   return { path, newPath, type: "modify_action_rename_directory" };
        // },
      },

      modify_action_move_directory: {
        description: "Move a directory",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the directory to move, eg: src/components/chat"
            ),
          newPath: z
            .string()
            .describe("The new path to the directory, eg: src/components/chat"),
        }),
        // execute: ({ path, newPath }) => {
        //   return { path, newPath, type: "modify_action_move_directory" };
        // },
      },

      read_action_files: {
        description:
          "Read multiple files, it will return the content of the files: {result: Array<{content: string, path: string}>} or {error: string}. DO NOT use this tool to edit file",
        inputSchema: z.object({
          paths: z
            .string()
            .array()
            .describe(
              "The path to the file to read, eg: src/components/chat/index.tsx"
            ),
        }),
      },

      read_action_directory: {
        description:
          "Read a directory, it will return the paths list in the directory: {directory: string, paths: {path: string, isDirectory: boolean}[]} or {error: string}. DO NOT use this tool to edit directory",
        inputSchema: z.object({
          path: z
            .string()
            .describe(
              "The path to the directory to read, eg: src/components/chat"
            ),
        }),
      },

      check_action_linting: {
        description:
          "Check the linting of the codebase, it will return the linting result: {result: string} or {error: string}",
        inputSchema: z.object({
          paths: z
            .string()
            .array()
            .optional()
            .describe(
              "The paths to the files to check, eg: ['src/components/chat/index.tsx'], if not provided, it will check the whole codebase"
            ),
        }),
      },
      ...instantdb_tools,
      ...searchTools,
      ...visionTools,
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => {
      return messageid;
    },
    messageMetadata: () => {
      return {
        model: model,
      };
    },
  });
}

function getModel() {
  const providerSetting = process.env.LLM_PROVIDER;
  if (providerSetting === "qwen") {
    return createOpenAICompatible({
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      name: "vibe3",
      apiKey: process.env.DASHSCOPE_API_KEY!,
    }).chatModel("qwen3-coder-plus");
  } else if (providerSetting == "genmini") {
    if (process.env.NODE_ENV === "development") {
      const proxyAgent = new ProxyAgent("http://127.0.0.1:1087");
      const customFetch: typeof fetch = (url, options) => {
        return fetch(url, { ...options, dispatcher: proxyAgent } as any);
      };
      const google = createGoogleGenerativeAI({
        fetch: customFetch as any,
      });
      return google("gemini-2.5-pro");
    }

    return google("gemini-2.5-flash");
  } else if (providerSetting === "zai") {
    return createOpenAICompatible({
      baseURL: "https://api.z.ai/api/coding/paas/v4",
      name: "vibe3",
      apiKey: process.env.Z_AI_API_KEY!,
    }).chatModel("glm-4.6");
  } else {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });
    // return openrouter.chat("openai/gpt-4.1-mini");
    // return openrouter.chat("deepseek/deepseek-chat-v3.1");
    return openrouter.chat("z-ai/glm-4.5");
  }
}
