# Roadmap

The up-to-date phase-by-phase status lives in [PLAN.md](../../PLAN.md). Summary:

```text
Phase 0 — Bootstrap repo, docs, monorepo, checks. Done.
Phase 1 — Supabase schema, enums, RLS, seed. Done.
Phase 2 — Auth, profiles, projects, memberships. Done.
Phase 3 — Zones, trades, documents, contract_items. Done.
Phase 4 — Visits and evidence uploads. Done.
Phase 5 — Worker, agent_jobs, audio transcription.
Phase 6 — Textual AI extraction: summaries, issue drafts, decision drafts.
Phase 7 — Review workflow and dashboard.
Phase 8 — Weekly summary.
Phase 9 — Deployment docs.
Phase 10 — Optional Telegram gateway.
Phase 11 — Optional NanoClaw gateway.
Phase 12 — Optional document intelligence.
```

## Roadmap rules

- Each phase is implemented with a small, specific prompt; features are never implemented ahead
  of their phase.
- A phase is not done if it does not compile, fails typecheck, breaks tests, lacks documentation,
  introduces unapproved core dependencies, exposes secrets or uses AI vision on photos.
- Optional integrations (Telegram, NanoClaw, document intelligence) come only after a useful MVP,
  and always as gateways against a first-party API, with no direct database access.
