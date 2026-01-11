# AGENTS.md

This file guides agents (and humans) working in this repo.
Keep changes minimal, follow existing patterns, and prefer safe execution.

## Repo Facts (Ground Truth)

- Framework: Next.js **16.1.1** (App Router)
- UI: React **19.2.3**
- Language: TypeScript (**strict**), path alias `@/* -> src/*`
- Linting: ESLint **v9** using **flat config** (`eslint.config.mjs`)
- Testing: **No test runner configured** (no Jest/Vitest/Playwright/Cypress found)

## Commands

Package manager appears to be **npm** (lockfile: `package-lock.json`).

### Dev / Build

- Dev server: `npm run dev`
- Production build: `npm run build`
- Start (prod): `npm run start`
- Start bound to host/port: `npm run serve` (0.0.0.0:3001)

### Lint

- Lint all: `npm run lint`
- Lint a single file: `npm run lint -- src/app/api/command/route.ts`
- Lint a folder: `npm run lint -- src/lib`

Notes:
- ESLint config lives in `eslint.config.mjs` and composes `eslint-config-next` presets.
- Prefer fixing lint at the source; avoid blanket disables.

### Typecheck

There is no dedicated script, but TS is strict and `noEmit` is set.

- Typecheck all: `npx tsc -p tsconfig.json --noEmit`

(Per-file typecheck isn’t a standard TS workflow; typecheck the project.)

### Tests

No test runner is configured currently.

- Test all: **N/A**
- Run a single test: **N/A**

If you add tests, choose one runner and wire `npm test` accordingly.

## Code Style (TS / React)

### Formatting

- Prefer small, focused diffs; do not reformat unrelated code.
- If a file already uses a style (quotes/indent), follow that file.
- Let ESLint (and the editor) drive formatting; no Prettier config is present.

### Imports

- Group imports in this order:
  1) Node built-ins
  2) Third-party packages
  3) App absolute imports (`@/...`)
  4) Relative imports (`./`, `../`)
- Use `import type { ... }` for type-only imports.
- Keep API route imports server-safe (avoid importing client-only modules).

### Types

- Prefer:
  - `type` for unions, discriminated unions, and function types.
  - `interface` for object shapes that are intended to be extended/merged.
- Avoid `any` unless bridging unknown input; if unavoidable, narrow quickly.
- Preserve discriminated unions (e.g., `AgentIntent`, `RuntimeEvent`) so reducers
  and event handlers can be exhaustively checked.

### Naming

- Components: `PascalCase` (e.g., `MissionControl`)
- Hooks: `useXxx`
- Functions/vars: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` only for true constants (rare)
- Files:
  - Components follow existing `PascalCase.tsx` convention.
  - Routes follow Next’s required `route.ts` naming.

### Error Handling

- Validate external input at boundaries:
  - API routes (`src/app/api/**/route.ts`)
  - WebSocket / stream handlers
  - DB reads/writes
- Return structured errors from routes:
  - Prefer `NextResponse.json({ error: "..." }, { status: 400 })` for bad input.
  - Use `500` for unexpected failures.
- Don’t leak secrets or internal paths in error responses.
- If parsing JSON from `request.json()`, consider guarding with `try/catch` when
  accepting arbitrary clients.

## Security & Command Execution

This repo includes runtime/agent code that may execute system commands.
Treat all command execution as high risk.

- Never execute commands that are not explicitly required to complete the task.
- Do not run:
  - `curl | sh`-style installers
  - opaque scripts from untrusted sources
  - destructive commands (`rm -rf`, `git reset --hard`, etc.) unless the user
    explicitly requests it
- Prefer safe, explicit invocation:
  - Use known scripts (`npm run ...`) or fully-qualified commands.
  - When building command strings, avoid concatenating user input.
  - Prefer allowlists and structured args over free-form shell strings.
- Assume any string coming from UI/API is untrusted; validate and sanitize.

## Shared Types Modules (Keep Contracts Consistent)

There are multiple “types hubs”:

- `src/types.ts` (imported as `@/types`):
  - Shared UI <-> host/runtime contract types like `AgentIntent`, `RuntimeEvent`.
- `src/lib/types.ts`:
  - Internal runtime/library types (similar concepts, not necessarily identical).

Guidelines:

- Avoid creating a third overlapping shared-types file.
- If you need to extend the UI/host contract, prefer editing `src/types.ts` and
  updating all consumers.
- If you need purely internal types for lib code, prefer `src/lib/types.ts`.
- If a type must cross the network/process boundary, it belongs in `src/types.ts`.

## ESLint / Next Rules

- ESLint entrypoint: `eslint.config.mjs` (flat config)
- Presets: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores include `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`

When in doubt, match the existing Next/ESLint guidance rather than inventing
new conventions.

## Editor/Assistant Rules (Cursor/Copilot)

- Cursor rules: **not found** (no `.cursorrules` or `.cursor/` directory)
- GitHub Copilot instructions: **not found** (no `.github/copilot-*` files)

If you add editor-specific rules later, keep `AGENTS.md` as the canonical source
of project-wide conventions.

## Quick PR Checklist

- `npm run lint` passes
- `npx tsc -p tsconfig.json --noEmit` passes
- API routes validate inputs and return consistent errors
- Shared contract types updated in `src/types.ts` when needed
