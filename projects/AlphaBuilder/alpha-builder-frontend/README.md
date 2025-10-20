# Alpha Builder – Frontend

React + Vite dashboard scaffold for account onboarding experiments.

## Features

- Email + password authentication views powered by a lightweight context provider.
- Automatic ZeroDev-compatible AA wallet provisioning for logged-in users, with keys
  safely kept in browser storage for prototyping.
- Placeholder marketing routes for products, resources, and blog content.
- Component library based on Tailwind UI primitives for rapid iteration.

## Environment

Copy `.env.example` to `.env` and point to the backend:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/<project-uuid>/chain/223
# (Optional) set this only if your RPC URL does not embed the chain id:
# VITE_ZERODEV_CHAIN_ID=223
```

The auth provider posts credentials to the configured endpoints and expects a JSON
response of the form:

```json
{
  "token": "<jwt-or-session-token>",
  "user": { "email": "user@example.com", "name": "Jane Doe" }
}
```

Adjust the response parsing in `src/hooks/useEmailAuth.tsx` if your backend returns
different field names.

When authentication succeeds, the provider derives or retrieves a deterministic
local private key per email and instantiates a `SimpleAccount` smart account via
ZeroDev’s 2024 RPC unifies bundler and paymaster routes. Point
`VITE_ZERODEV_RPC_URL` to the project URL copied from the ZeroDev dashboard
(it already includes the chain id segment, for example `/chain/223`). If your
URL does not include the chain id, set `VITE_ZERODEV_CHAIN_ID` manually.

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```
