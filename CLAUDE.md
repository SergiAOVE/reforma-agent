# CLAUDE.md

This repository contains `reforma-agent`, an open source PWA for renovation tracking.

Use English for everything: product documentation, user-facing docs, code identifiers,
database names, variables and commits.

Core decisions:

- Next.js App Router + TypeScript.
- Supabase for Auth, Postgres, Storage and RLS.
- Separate Node/TypeScript worker for async AI jobs.
- No AI image analysis in the MVP.
- Photos are evidence only.
- No NanoClaw/OpenClaw as core dependencies.
- AI-generated content must be reviewable drafts.

Before coding:

- Read PLAN.md.
- Read docs/en.
- Implement only the requested phase.
- Prefer simple, maintainable code.
- Avoid unnecessary dependencies.
- Keep security and RLS in mind.
- Update docs and tests.

At the end of each task, report:

- What changed.
- Files touched.
- Commands run.
- Checks passed/failed.
- Risks.
- Recommended next phase prompt.
