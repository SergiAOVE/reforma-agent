# Roadmap

The up-to-date phase-by-phase status lives in [PLAN.md](../../PLAN.md). Summary:

```text
Phase 0 — Bootstrap repo, docs, monorepo, checks. Done.
Phase 1 — Supabase schema, enums, RLS, seed. Done.
Phase 2 — Auth, profiles, projects, memberships. Done.
Phase 3 — Zones, trades, documents, contract_items. Done.
Phase 4 — Visits and evidence uploads. Done.
Phase 5 — Worker, agent_jobs, audio transcription. Done.
Phase 6 — Textual AI extraction: summaries, issue drafts, decision drafts. Done.
Phase 7 — Review workflow and dashboard. Done.
Phase 8 — Weekly summary. Done.
Phase 9 — Deployment docs. Done.
Phase 10 — Optional Telegram gateway. Done.
Phase 11 — Optional NanoClaw gateway. Done.
Phase 12 — Optional document intelligence. Done.
Phase 13 — Stakeholder functions and issue/decision responsibilities. Done.
Phase 14 — Site manager field workflow and simplified daily reporting. Done.
```

## Roadmap rules

- Each phase is implemented with a small, specific prompt; features are never implemented ahead
  of their phase.
- A phase is not done if it does not compile, fails typecheck, breaks tests, lacks documentation,
  introduces unapproved core dependencies, exposes secrets or uses AI vision on photos.
- Optional integrations (Telegram, NanoClaw, document intelligence) come only after a useful MVP,
  and always as gateways against a first-party API, with no direct database access.

Deployment guidance for the current MVP lives in [07-deployment.md](07-deployment.md).
