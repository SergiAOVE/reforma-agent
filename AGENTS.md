# AGENTS.md

## Project

`reforma-agent` is an open source PWA for intelligent renovation tracking.

## Stack

- Next.js App Router
- TypeScript strict
- Supabase Auth/Postgres/Storage/RLS
- Node.js/TypeScript worker
- Zod
- Vitest
- pnpm

## Non-negotiable rules

- No AI photo analysis in the MVP.
- Photos are evidence, not AI vision input.
- No NanoClaw, OpenClaw or Telegram as core dependencies.
- Never expose the service role key to the client.
- Never run long AI jobs inside normal web requests.
- All AI-generated content must be a reviewable draft.
- Write everything in English: documentation, code identifiers, commits.
- Update `PLAN.md` after each phase.
- Add or update tests whenever logic changes.
- Run lint, typecheck and tests before finishing.
- If a command cannot be run, document why.

## Workflow

1. Read `PLAN.md` before implementing.
2. Implement only the requested phase.
3. Do not implement features from future phases.
4. Keep changes small and reviewable.
5. When done, explain changes, commands run and the suggested next prompt.
