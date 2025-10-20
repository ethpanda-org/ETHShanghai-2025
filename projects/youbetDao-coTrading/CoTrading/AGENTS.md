# Repository Guidelines

## Project Structure & Module Organization
- Next.js (App Router, TypeScript). Key folders:
  - `app/` route groups, API routes in `app/api/`, global styles in `app/globals.css`.
  - `components/`, `hooks/`, `lib/` (utils, `lib/db` with Drizzle), `public/` assets.
  - `tests/` E2E with Playwright (`tests/e2e/*.test.ts`).
  - Config: `next.config.ts`, `tailwind.config.ts`, `biome.jsonc`, `playwright.config.ts`.

## Build, Test, and Development Commands
- `pnpm dev` — Run Next.js locally.
- `pnpm build` — Run DB migrate (`tsx lib/db/migrate`) then `next build`.
- `pnpm start` — Start production server.
- `pnpm lint` / `pnpm lint:fix` — ESLint + Biome linting.
- `pnpm format` — Format with Biome.
- `pnpm test` — Run Playwright tests.
- DB tooling: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`.

## Coding Style & Naming Conventions
- TypeScript, 2-space indent. Prefer functional React components.
- Filenames: kebab-case (e.g., `sidebar-history.tsx`); hooks `use-*.ts` in `hooks/`.
- Keep server-only logic out of client components; mark client files with `"use client"` when required.
- Linting/formatting enforced by ESLint + Biome; run `pnpm lint` and `pnpm format` before PRs.

## Testing Guidelines
- E2E tests with Playwright live in `tests/e2e/` (e.g., `chat.test.ts`).
- Name tests `*.test.ts`; keep helpers in `tests/helpers.ts` and `tests/fixtures.ts`.
- Run locally with `pnpm test`. Add new flows alongside related routes.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Branches: `feat/<scope>` or `fix/<scope>` (e.g., `feat/chat-sidebar`).
- PRs must include: purpose, linked issues, screenshots/GIFs for UI, test plan, and checklist that lint/tests pass.

## Security & Configuration
- Never commit secrets. Use `.env.local` for local dev. Required vars include DB and auth; build runs migrations.
- Optional: generate OpenAPI client with `pnpm openapi:client` (skipped by default scripts).
