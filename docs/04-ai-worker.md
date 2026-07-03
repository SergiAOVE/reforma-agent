# AI Worker

The worker is a separate Node.js TypeScript process. It will eventually process queued `agent_jobs` for transcription, visit extraction, summary generation, issue suggestions, decision suggestions, and weekly summaries.

## Rules

- AI results are drafts until a human approves, edits, or rejects them.
- AI may use text inputs in the MVP.
- AI may not analyze photos in the MVP.
- AI must not make final decisions for owners.
- AI must not assert definitive contractual breach.
- Long-running AI jobs must not run inside normal Next.js web requests.

## Current Status

The worker only starts and writes one controlled log. Phase 1 adds the future `agent_jobs` table, but does not implement worker processing, Supabase integration, transcription, or AI provider calls.
