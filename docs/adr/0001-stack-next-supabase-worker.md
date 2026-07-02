# ADR-0001 — Stack: Next.js App Router + Supabase + separate TypeScript worker

- Status: accepted
- Date: 2026-07-02

## Context

`reforma-agent` needs a mobile-installable web app (PWA), a backend with auth and fine-grained
permissions, private storage for photos/audio/documents, and asynchronous AI processing
(transcription, extractions, summaries) that can take minutes.

## Decision

- **Next.js App Router + TypeScript** for the web app/PWA.
- **Supabase** as the source of truth: Auth, Postgres, private Storage and RLS.
- **Separate Node.js/TypeScript worker** that processes an `agent_jobs` queue in Postgres.
- **Zod** for domain and AI output validation; **Vitest** for tests; **pnpm** monorepo.

## Alternatives rejected

- **Native app**: higher cost; a PWA covers the use case (mobile capture + remote viewing).
- **Everything in Next.js** (AI jobs inside requests/route handlers): timeouts, hard retries and
  coupling; long jobs go to a polling worker instead.
- **Full custom backend (Express/Nest + managed Postgres)**: reinvents auth, storage and
  permissions that Supabase already solves with RLS.

## Consequences

- The worker and the web app communicate only via the database (`agent_jobs`) → independently
  deployable and testable.
- Data security relies on RLS based on `project_members` from the first migration.
- Accepted risk: dependency on Supabase as a platform; mitigated because it is open source and
  self-hostable, and each user deploys their own instance.
