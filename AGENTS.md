# AGENTS.md

## Project

`reforma-agent` is an open source PWA for intelligent home renovation tracking.

## Stack

- Next.js App Router
- TypeScript strict
- Supabase Auth/Postgres/Storage/RLS
- Node.js/TypeScript worker
- Zod
- Vitest
- pnpm

## Non-negotiable Rules

- No AI image analysis in the MVP.
- Photos are evidence only, not AI vision input.
- No NanoClaw, OpenClaw, or Telegram as core dependencies.
- Never expose Supabase service role to the client.
- Do not run long AI jobs inside normal web requests.
- All AI-generated content must be reviewable drafts.
- Use English for docs and code.
- Update `PLAN.md` after each phase.
- Add or update tests when changing logic.
- Run lint, typecheck, and tests before finishing.
- If a command cannot run, document why.

## Workflow

1. Read `PLAN.md` before implementing.
2. Implement only the requested phase.
3. Do not implement future-phase features early.
4. Keep changes small and reviewable.
5. At the end, explain changes, commands run, and the suggested next prompt.
