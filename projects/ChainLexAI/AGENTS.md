# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives in `app/`; each route folder carries its `page.tsx` (and optional `layout.tsx`). Shared UI lives in `components/`, where `components/ui` mirrors shadcn primitives and domain widgets sit beside layout helpers. Keep cross-cutting logic in `lib/` (wagmi bootstrapping, AI helpers, database clients) and import through the `@/` alias declared in `tsconfig.json`. Product references and prototypes sit in `design/`; refresh `development-plan.md` whenever the shipped experience diverges.

## Build, Test, and Development Commands
Run `npm install` once per machine. Use `npm run dev` for hot reload, `npm run build` before merging, and `npm run start` to smoke-test the compiled bundle. Lint with `npm run lint`, which wraps `next lint` and respects `.eslintrc.json`.

## Coding Style & Naming Conventions
Write strict TypeScript with 2-space indentation and Prettier defaults. Name React components and contexts with `PascalCase`, keep hooks and utilities in `camelCase`, and keep file names kebab-case unless the file exports a component. Prefer `@/` imports over deep relatives. Compose UI with shadcn primitives and Tailwind tokens, extracting repeat patterns into focused components or shared CSS in `app/globals.css`.

## Testing Guidelines
Automated tests are not configured yet; add coverage as you touch modules. Use Next.js’s Jest preset with Testing Library (or Vitest + jsdom) so components and wagmi hooks can be verified in isolation. Keep specs beside sources as `*.test.ts(x)` files, mock external services (Neon, LLM, viem) at the module boundary, and document fixtures until a dedicated guide ships. Plan to gate merges on a future `npm run test` once wired.

## Commit & Pull Request Guidelines
Commit history follows Conventional Commits (`feat: …`, `init: …`); keep changes scoped and reference issues or roadmap bullets when relevant. Before opening a pull request, run `npm run lint` and `npm run build`, describe how the work maps to `development-plan.md`, add UI screenshots when layouts change, note environment updates, and request review only after local checks pass.

## Environment & Configuration Tips
Copy `.env.example` to `.env.local` for secrets such as Neon credentials, AI providers, or storage endpoints, and keep populated files untracked. Update the template when adding variables, document expected formats inline, coordinate schema or contract shifts with counterpart services, and call out migrations or deployment scripts in the PR.
