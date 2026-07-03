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

## What AI can do

- Transcribe audio evidence through `transcribe_audio` jobs.
- Summarize visits from text (edited transcription + notes).
- Propose issues and pending decisions from text.
- Generate weekly summaries in a later phase.
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

Phase 7 implements the human side of the flow. Summaries, issues and decisions can be approved,
edited or rejected; issues and decisions can also be closed. Review actions write `audit_log`
entries and never call the AI provider.

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
