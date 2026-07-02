# AI and worker

## Execution model

AI processing never happens inside a normal web request. The flow is:

```text
apps/web  →  inserts a row into agent_jobs (pending)
apps/worker  →  polling → lock → process → completed/failed
apps/web  →  shows the result as a reviewable draft
```

The worker will implement (Phase 5+):

- Locking (`locked_at`, `locked_by`) and idempotency to avoid double processing.
- Retries with `attempt_count`, `max_attempts` and `error_message`.
- Clear logs without secrets.

## Planned job types

| job_type                  | Description                           | Phase |
| ------------------------- | ------------------------------------- | ----- |
| `transcribe_audio`        | Transcribe a visit audio recording    | 5     |
| `extract_visit`           | Structured extraction from visit text | 6     |
| `generate_visit_summary`  | Visit summary                         | 6     |
| `suggest_issues`          | Issue drafts                          | 6     |
| `suggest_decisions`       | Pending decision drafts               | 6     |
| `generate_weekly_summary` | Weekly summary for owners             | 8     |

## What AI can do

- Transcribe audio.
- Summarize visits from text (edited transcription + notes).
- Propose issues and pending decisions from text.
- Generate weekly summaries.
- Link an issue to a budget line item when there is a clear textual match.

## What AI can NOT do

- Analyze photos in the MVP (no AI vision).
- Assert definitive contractual breaches.
- Approve cost changes, send claims or modify contractual documents.
- Delete evidence.
- Make final decisions on behalf of the owners.

## Human review

All AI-generated content starts as a draft:

```text
ai_draft → edited / approved / rejected
```

AI outputs must distinguish: facts observed by the user, suspicions, recommendations, and data
pending confirmation. Outputs are validated with Zod; if validation fails, the job is marked as
failed and no inconsistent data is persisted.

## Swappable AI provider

`packages/ai` defines the `AiProvider` interface. There will be a `MockAiProvider` for tests and
optional real providers enabled by API key. Without an API key, the system runs with the mock.
