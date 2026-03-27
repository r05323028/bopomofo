# AGENTS.md — Repository Guide for Coding Agents
This document defines verified commands and coding conventions for `bopomo`.
Use this as the operational baseline for all edits in this repo.

## 1) Stack and Architecture
- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Socket.IO for realtime multiplayer
- Biome for lint + format
- Vitest for testing

Main directories/files:
- `server.ts` — custom Node HTTP server + Socket.IO bootstrap
- `app/**` — Next.js routes and UI
- `lib/game/**` — room/game logic
- `__tests__/stress/**` — stress/integration style tests
- `vitest.config.ts` — test behavior
- `biome.json` / `tsconfig.json` — style/type baseline

## 2) Build, Run, and Quality Commands
Install dependencies:
```bash
npm install
```

Development:
```bash
npm run dev
```

Build app + server:
```bash
npm run build
```

Build server only:
```bash
npm run build:server
```

Start production server:
```bash
npm start
```

Lint and format:
```bash
npm run lint
npm run format
```

## 3) Test Commands (including single tests)
Run all tests:
```bash
npm test
```

Run stress suite:
```bash
npm run test:stress
```

Run one test file:
```bash
npm test -- __tests__/stress/game-flow.test.ts
```

Run one test case by name:
```bash
npm test -- -t "should complete full game flow with 10 players and reconnections"
```

Run in non-watch mode:
```bash
npm test -- run
```

Vitest settings from `vitest.config.ts`:
- environment: `node`
- include glob: `**/*.test.ts`
- `testTimeout`: `120000`
- `hookTimeout`: `30000`

Stress test note:
- Stress tests expect server availability at `http://localhost:3000`.

## 4) TypeScript Rules
From `tsconfig.json`:
- `strict: true` (do not weaken)
- `moduleResolution: "bundler"`
- path alias `@/*` points to project root

Agent constraints:
- Never use `as any`
- Never use `@ts-ignore` / `@ts-expect-error`
- Prefer explicit narrowing and type guards

## 5) Imports, Formatting, and File Style
Biome baseline (`biome.json`):
- 2-space indentation
- recommended lint rules enabled
- Next and React lint domains enabled
- organizeImports enabled
- `noUnknownAtRules` disabled (Tailwind compatibility)

Import ordering pattern used in repo:
1. Node built-ins (`node:*`) where applicable
2. Third-party packages (`next`, `react`, `socket.io`, etc.)
3. Internal imports (`@/...` or relative)
4. `import type` for type-only imports

Formatting expectations:
- Keep files Biome-formatted
- Avoid manual import sorting conflicts with Biome
- Keep changes minimal and local to task scope

## 6) Naming Conventions
- Components: PascalCase (e.g., `RootLayout`, `Home`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE when truly constant
- Next route files: framework names (`page.tsx`, `layout.tsx`)
- Tests: `*.test.ts`

Follow nearby naming in the same module before introducing new patterns.

## 7) React / Next.js Usage in This Repo
- Use App Router structure in `app/`
- Add `"use client"` only when needed (hooks/events/browser APIs)
- Prefer server components when client behavior is not required
- Keep route metadata in `layout.tsx` using `export const metadata`
- Layout props commonly use `Readonly<{ children: React.ReactNode }>`

Because Socket.IO runs through `server.ts`, avoid serverless-only assumptions.

## 8) Error Handling Guidelines
Observed style:
- Catch errors only when adding clear behavior/recovery
- Narrow with `instanceof Error` before reading `.message`
- Return structured JSON error payloads for API failures

Do not:
- Use empty catch blocks
- Swallow errors silently
- Replace explicit validation with vague fallback branches

## 9) Agent Execution Checklist
Before finishing any code change:
1. Read neighboring files for local patterns
2. Implement minimal, focused edits
3. Run `npm run lint`
4. Run targeted tests first (single file or `-t`)
5. Run broader validation (`npm test`, then `npm run build` as needed)
6. Confirm no unrelated file changes were introduced

## 10) Cursor and Copilot Rules Status
Checked paths in this repository:
- `.cursor/rules/` (not present)
- `.cursorrules` (not present)
- `.github/copilot-instructions.md` (not present)

If these files are added later, treat them as higher-priority local instructions.

## 11) Prior Repo Guidance to Keep
Previous AGENTS guidance included this useful reminder:
> For uncertain Next.js behavior, consult local docs in
> `node_modules/next/dist/docs/` before implementing.

Final principle: prefer current repository evidence over assumptions.
