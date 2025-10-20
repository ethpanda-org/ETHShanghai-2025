/* 
the api for ai dimsum devs.
*/
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { Application, Router } from "oak";
import { oakCors } from "cors";

console.log("");

const router = new Router();

router
.get("/", async (context) => {
  context.response.body = { result: `# AI DimSum RightProof API Documentation

**base url:** \`https://right-proof-api.deno.dev\`

## Get Methods

### \`/license_nfts\`

Retrieves a list of all license NFTs in the system.

### \`/license_nft?id=id\`

Retrieves a specific license NFT by its ID.

**Parameters:**

- \`id\` (required): The unique identifier of the license NFT

- \`addr\` (optional): The owner of the license NFT

### \`/copyright_nfts\`

Retrieves a list of all copyright NFTs (datasets) in the system.

### \`/copyright_nft?id=id\`

Retrieves a specific copyright NFT by its ID.

**Parameters:**

- \`id\` (optional): The unique identifier of the copyright NFT
- \`addr\` (optional): The owner of the copyright NFT

## Post Methods

### \`/license_nft/new\`

Creates a new license NFT for an existing copyright.

### \`/copyright_nft/new\`

Creates a new copyright NFT for a dataset.
` };
})

const app = new Application();

app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());

console.info("CORS-enabled web server listening on port 8000");
await app.listen({ port: 8000 });
