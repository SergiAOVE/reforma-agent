# Data Model

Phase 0 does not create database tables. The first real schema arrives in Phase 1 with Supabase migrations and RLS.

## Planned Tables

- profiles
- projects
- project_members
- zones
- trades
- visits
- evidence
- documents
- contract_items
- audio_transcriptions
- issues
- decisions
- agent_jobs
- audit_log

## Planned Diagram

```mermaid
erDiagram
  profiles ||--o{ project_members : has
  projects ||--o{ project_members : includes
  projects ||--o{ zones : contains
  projects ||--o{ trades : contains
  projects ||--o{ visits : records
  projects ||--o{ evidence : stores
  projects ||--o{ documents : stores
  projects ||--o{ contract_items : budgets
  projects ||--o{ issues : tracks
  projects ||--o{ decisions : tracks
  projects ||--o{ agent_jobs : queues
  visits ||--o{ evidence : includes
  evidence ||--o{ audio_transcriptions : transcribes
```

## Phase 1 Direction

Phase 1 should add enums, migrations, project-membership based RLS, synthetic seed data, and matching schemas in `packages/core`.
