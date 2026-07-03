# AI and worker

## Execution model

AI processing never happens inside a normal web request. The flow is:

```text
apps/web  →  inserts a row into agent_jobs (pending)
apps/worker  →  polling → lock → process → completed/failed
apps/web  →  shows the result as a reviewable draft
```

The worker implements (Phase 5+):

- Locking (`locked_at`, `locked_by`) through the `claim_agent_job()` RPC.
- Concurrent-safe polling with `FOR UPDATE SKIP LOCKED`.
- Idempotent audio transcription through a unique `audio_transcriptions.evidence_id` index.
- Text-only visit extraction for summaries, issue drafts and decision drafts.
- Text-only weekly summary generation for owner review.
- Retries with `attempt_count`, `max_attempts` and `error_message`; permanent input errors fail
  without retry.
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

Phase 10 does not add worker job types. The optional Telegram gateway only forwards validated
text-command intents to first-party server APIs; it does not enqueue AI work and does not run AI
inside web requests.

## What AI can do

- Transcribe audio evidence through `transcribe_audio` jobs.
- Summarize visits from text (edited transcription + notes).
- Propose issues and pending decisions from text.
- Generate reviewable weekly summaries from project text.
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

Phase 7 implements the human side of the flow for visit summaries, issues and decisions.
Phase 8 adds weekly summary review. Review actions write `audit_log` entries and never call the
AI provider.

## Swappable AI provider

`packages/ai` defines the `AiProvider` interface. It includes:

- `MockAiProvider`: deterministic local/test transcriptions when no API key is configured.
- `OpenAiProvider`: optional production transcription through OpenAI's audio transcription API
  and structured text extraction when `OPENAI_API_KEY` or `AI_PROVIDER_API_KEY` is configured.

Default transcription model: `gpt-4o-mini-transcribe`, configurable with
`OPENAI_TRANSCRIPTION_MODEL`.

Default text model: `gpt-4o-mini`, configurable with `OPENAI_TEXT_MODEL`.

## Phase 5 job contract

`transcribe_audio` jobs use this input:

```json
{
  "evidenceId": "uuid",
  "language": "optional BCP-47-ish language hint"
}
```

The worker output stores the created transcript metadata:

```json
{
  "evidenceId": "uuid",
  "transcriptionId": "uuid",
  "provider": "mock | openai",
  "model": "model name",
  "language": "detected or requested language, if known"
}
```

The worker downloads only audio evidence (`type = 'audio'` and `mime_type` starts with
`audio/`). Photos remain evidence only and are never sent to a vision model.

## Phase 6 job contracts

The three Phase 6 jobs use the same input:

```json
{
  "visitId": "uuid"
}
```

Allowed inputs are deliberately text-only:

- Visit title, date, general status, human notes and existing summary.
- Edited audio transcripts, falling back to raw transcripts if no edit exists.
- Zone and trade names/descriptions.
- Budget line item metadata (`contract_items` title, description, notes, amount and references).
- Document metadata (`documents` type, title, notes and original filename).

The worker does **not** download document files, image files, video files or photo bytes for
Phase 6. It does not run OCR and does not call a vision model.

`generate_visit_summary` validates this shape and writes the result to `visits.summary`:

```json
{
  "summary": "reviewable text"
}
```

The completed job output stores provider metadata:

```json
{
  "visitId": "uuid",
  "summary": "reviewable text",
  "provider": "mock | openai",
  "model": "model name"
}
```

The visit row is also marked as `summary_source = 'ai'` and
`summary_review_state = 'ai_draft'`, with `summary_created_by_job_id` pointing to the worker job.

`suggest_issues` validates up to 10 draft issues. The worker writes them to `issues` with
`status = 'ai_draft'`, `review_state = 'ai_draft'`, `source = 'ai'` and `created_by_job_id`
pointing back to the job.

`suggest_decisions` follows the same pattern for `decisions`. The worker only accepts zone,
trade and budget references that already exist in the text context; unknown ids fail the job
before any rows are inserted.

## Phase 8 job contract

`generate_weekly_summary` jobs use this input:

```json
{
  "weekStart": "2026-06-29",
  "weekEnd": "2026-07-05"
}
```

Allowed inputs are deliberately text-only:

- Visits in the requested date range: title, date, status, general status and human notes.
- Reviewed visit summaries only (`approved`, `edited` or human-created), never rejected drafts.
- Open reviewed issues.
- Pending or approved reviewed decisions.
- Zone and trade names/descriptions.
- Budget line item metadata (`contract_items` title, description, notes, amount and references).
- Document metadata (`documents` type, title, notes and original filename).

The worker does **not** download Storage files for weekly summaries. It does not OCR documents,
does not inspect document contents, does not analyze photos and does not use a vision model.

The AI provider validates this shape:

```json
{
  "title": "Week 2026-06-29 to 2026-07-05",
  "summary": "Reviewable weekly summary text"
}
```

The worker writes one `weekly_summaries` row per completed job with:

```json
{
  "source": "ai",
  "review_state": "ai_draft",
  "created_by_job_id": "agent job id"
}
```

The completed job output stores the created row id and provider metadata:

```json
{
  "weeklySummaryId": "uuid",
  "projectId": "uuid",
  "weekStart": "2026-06-29",
  "weekEnd": "2026-07-05",
  "provider": "mock | openai",
  "model": "model name"
}
```

## Phase 10 Telegram boundary

Telegram is not part of the AI pipeline. It cannot submit photos for analysis, cannot trigger
OCR, cannot create drafts directly and cannot write to Supabase. Any future Telegram action that
creates project data must call a first-party API that authenticates the app user, checks project
membership and produces the same reviewable drafts as the web app and worker flows.
