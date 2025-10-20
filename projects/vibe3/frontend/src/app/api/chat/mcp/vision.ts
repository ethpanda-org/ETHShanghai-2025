import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient } from "ai";

export async function getVisionTools() {
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.Z_AI_VISION_MCP!),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.Z_AI_API_KEY!}`,
        },
      },
    }
  );

  const stdioClient = await experimental_createMCPClient({
    transport,
  });

  const tools = await stdioClient.tools();

  return {
    tools,
    close: () => {
      stdioClient.close();
    },
  }
}
