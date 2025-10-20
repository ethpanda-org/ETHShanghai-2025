# CAI × ERC-8004 Next.js Service

Unified Next.js application that combines the CAI Framework audit dashboard with backend API routes for verifiable credential (VC) issuance, AHIN anchoring, and audit bundle generation.

## Getting Started

```bash
npm install
cp .env.example .env.local
# update environment variables
npm run dev
```

Then open `http://localhost:3000`.

## Available Scripts

- `npm run dev` – start the development server
- `npm run build` – build for production
- `npm run start` – start the production server
- `npm run lint` – run ESLint
- `npm run type-check` – run the TypeScript compiler in no-emit mode

## Project Structure

```
src/
├── components/       # Reusable UI components
├── config/           # Contract addresses & ABIs
├── hooks/            # Wagmi contract hooks
├── lib/              # Wagmi client config
├── pages/            # Next.js pages & API routes
│   └── api/          # Full backend feature parity
├── server/           # Backend services & utilities
└── styles/           # Global styles (Tailwind)
```

## API Overview

- `POST /api/vc/mandate` – create Mandate VC (optional on-chain issuance)
- `POST /api/vc/cart` – create Cart VC
- `GET /api/vc/verify/:vcHash` – verify VC
- `POST /api/ahin/transaction` – queue AHIN transaction
- `GET /api/ahin/proof/:txId` – Merkle proof for transaction
- `GET /api/ahin/stats` – AHIN stats
- `POST /api/ahin/anchor` – manually anchor pending blocks
- `POST /api/audit/bundle` – generate signed audit bundle

## Environment Variables

See `.env.example` for required configuration. Public variables (prefixed with `NEXT_PUBLIC_`) are exposed to the browser; the rest are used by server-side API routes.

## Tech Stack

- Next.js 14 + TypeScript
- Tailwind CSS for styling
- Wagmi + RainbowKit + Ethers for web3 interactions
- Winston for structured logging
- Joi for request validation

## Notes

- AHIN anchoring runs on an in-memory queue – it resets when the server restarts.
- The wallet signer defaults to a random throwaway key when `PRIVATE_KEY` is not set, so configure a key for production use.
