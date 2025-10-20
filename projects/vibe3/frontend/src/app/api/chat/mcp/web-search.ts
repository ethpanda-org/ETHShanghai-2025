import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient } from "ai";

export async function getWebSearchTools() {
  const transport = new StreamableHTTPClientTransport(
    new URL("https://api.z.ai/api/mcp/web_search_prime/mcp"),
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
