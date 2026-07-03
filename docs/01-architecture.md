# Architecture

The repository is a simple pnpm monorepo.

```text
apps/web        Next.js App Router PWA
apps/worker     Node.js TypeScript worker for async jobs
packages/core   Domain enums, types, and Zod schemas
packages/ai     AI provider interfaces, prompts, parsers, and mock provider
packages/db     Future Supabase clients and typed helpers
supabase         Future migrations, seeds, and policies
```

## Principles

- The web app handles user workflows and review.
- Supabase owns auth, data, permissions, and private storage.
- The worker handles long-running AI and transcription jobs.
- AI outputs are validated and stored as reviewable drafts.
- Photos are never sent to vision models in the MVP.

## Runtime Boundaries

The web app must not run long AI jobs inside normal requests. It may enqueue jobs in future phases. The worker will process jobs independently and update Supabase with controlled results.

## Package Boundaries

`packages/core` contains shared domain definitions. `packages/ai` contains AI-facing interfaces and future parsers. `packages/db` will contain Supabase clients and query helpers when Supabase is introduced.
