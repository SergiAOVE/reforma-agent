# ADR 0001: Stack with Next.js, Supabase, and Worker

## Status

Accepted.

## Context

The product needs a web app, private data and file storage, project-level permissions, and controlled async AI processing.

## Decision

Use Next.js App Router with TypeScript for the web app, Supabase for Auth/Postgres/Storage/RLS, and a separate Node.js TypeScript worker for long-running AI jobs.

## Consequences

- The web app can stay focused on user workflows.
- Supabase provides a clear security model with RLS.
- The worker prevents long AI jobs from blocking normal web requests.
- Future deployments must run both the web app and worker.
