# AI prompts

This folder will hold the AI worker prompts starting in Phase 6:

- Visit summary from the edited transcription and notes.
- Issue proposals (`ai_draft` drafts).
- Pending decision proposals (`ai_draft` drafts).
- Weekly summary for owners (Phase 8).

Rules for every prompt:

- Text input only: transcriptions, notes, zone/trade metadata, budget line items and textual
  documents.
- Never photos as AI input.
- Output is always validated with Zod before persisting.
- AI must distinguish: observed fact, suspicion, recommendation, and data pending confirmation.
- AI never asserts definitive contractual breaches.
