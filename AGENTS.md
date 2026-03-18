# AGENTS.md - Coding Guidelines for bopomo

## Project Overview
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Linter/Formatter**: Biome 2.2.0
- **Runtime**: React 19.2.3

---

## Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Production build
npm start                # Start production server
```

### Code Quality
```bash
npm run lint             # Run Biome linter
npm run format           # Format code with Biome
```

### Testing
**No test framework configured yet.** When adding tests, update this section.

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled**: All strict checks are ON
- **Target**: ES2017
- **Module resolution**: bundler (Next.js optimized)
- **Path alias**: `@/*` maps to project root
- Never use `any` — leverage strict typing
- Never suppress errors with `@ts-ignore` or `@ts-expect-error`

### Formatting (Biome)
- **Indentation**: 2 spaces (not tabs)
- **Line width**: 80 (Biome default)
- **Import organization**: Auto-organize imports via Biome assist
- Run `npm run format` before committing

### Linting Rules
- **Biome recommended rules**: Enabled
- **React linting**: Enabled (recommended domain)
- **Next.js linting**: Enabled (recommended domain)
- **Unknown at-rules**: Disabled (for Tailwind v4 compatibility)
- Run `npm run lint` to check for issues

### Import Patterns
```typescript
// 1. Type imports first (with 'type' keyword)
import type { Metadata } from "next";
import type { NextConfig } from "next";

// 2. External dependencies
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

// 3. Internal imports (use @ alias for project root)
import "@/app/globals.css";
import { ComponentName } from "@/components/ComponentName";

// 4. Relative imports (for sibling files)
import "./globals.css";
```

### File Naming
- **Components**: PascalCase for React components (e.g., `RootLayout.tsx`, `HomePage.tsx`)
- **Routes**: lowercase for Next.js routes (e.g., `page.tsx`, `layout.tsx`)
- **Config files**: lowercase with extension (e.g., `next.config.ts`, `biome.json`)
- **Utilities**: camelCase for non-component files (e.g., `utils.ts`)

### Component Structure
```typescript
// Route components (app/ directory)
export default function PageName() {
  return (
    <div>
      {/* JSX content */}
    </div>
  );
}

// Layout components with metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
};

export default function LayoutName({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div>{children}</div>;
}
```

### Naming Conventions
- **Components**: PascalCase (`RootLayout`, `Home`)
- **Functions**: camelCase (`handleClick`, `fetchData`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for configured objects
- **Variables**: camelCase (`userName`, `isActive`)
- **Type/Interface**: PascalCase (`Metadata`, `NextConfig`)

### React & Next.js Patterns
- Use Server Components by default (App Router default)
- Add `"use client"` directive only when needed (event handlers, hooks, browser APIs)
- Use `next/image` for images (with width, height, alt)
- Use `next/font` for font optimization
- Prefer `Readonly<>` for props that shouldn't be mutated
- Use route-specific metadata exports in `layout.tsx` files

### Styling with Tailwind CSS v4
- Use utility classes directly in JSX
- Follow mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Use dark mode variants (`dark:`) for theme support
- Group related utilities logically (layout → spacing → colors → typography)
- Prefer Tailwind utilities over custom CSS when possible

### Error Handling
```typescript
// Preferred: Let Next.js error boundaries handle errors
export default async function Page() {
  const data = await fetchData(); // Errors bubble to nearest error.tsx
  return <div>{data}</div>;
}

// For client components: use try/catch with proper error types
try {
  await someOperation();
} catch (error) {
  // Type guard error before using
  if (error instanceof Error) {
    console.error("Operation failed:", error.message);
  }
}
```

### Git Workflow
- Biome integrates with Git (VCS enabled in config)
- Changes tracked files are linted automatically
- Never commit code that fails `npm run lint`
- Format code before committing: `npm run format`

---

## File Structure
```
bopomo/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts & metadata
│   ├── page.tsx           # Home page route
│   └── globals.css        # Global styles (Tailwind imports)
├── public/                # Static assets
├── biome.json             # Biome linter & formatter config
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies & scripts
└── AGENTS.md             # This file
```

---

## Pre-Commit Checklist
1. [ ] Run `npm run lint` — all checks pass
2. [ ] Run `npm run format` — code formatted
3. [ ] Run `npm run build` — builds successfully
4. [ ] TypeScript has no errors (strict mode)
5. [ ] Imports organized (Biome auto-organizes)
6. [ ] No `any` types or error suppressions

---

## Notes for AI Agents
- This is a fresh Next.js 16 project with minimal customization
- No testing framework configured yet — recommend Vitest or Jest when needed
- Biome replaces ESLint + Prettier — don't add them
- Tailwind CSS v4 uses PostCSS — config in `postcss.config.mjs`
- All React components should follow Next.js App Router patterns
- Strict TypeScript enforces type safety — embrace it, don't fight it

---

<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->
