# AI Proposal Assistant — Frontend (Next.js + wagmi/viem)

MVP UI to pair with the FastAPI backend. Left side is **Chat (Coze)**,
right side is **Proposal Draft** (simulate → submit with wallet).

## Quickstart
```bash
pnpm i  # or npm i / yarn
cp .env.local.example .env.local
pnpm dev  # http://localhost:3000
```

## Folders
- `app/` — App Router pages
- `components/` — UI & panels
- `lib/` — wagmi config, ABI, stores, utils
- `app/api/coze/` — server route that can proxy to Coze Chat API (optional)

## Configure
- `NEXT_PUBLIC_*` — used in the browser
- `COZE_*` — used on server route `/api/coze` to forward chat messages (optional; falls back to echo)

## Flow
1) User chats; agent may return an **Action JSON** (type=`proposal_draft`).
2) UI fills **Proposal Draft Panel**.
3) Click **Simulate** → calls backend `/v1/dao/simulate`.
4) Click **Submit on-chain** → wallet signs `proposeAI(...)`.
