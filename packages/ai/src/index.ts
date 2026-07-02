/**
 * Minimal contract for a swappable AI provider.
 *
 * Phase 5 adds the real methods (audio transcription) and a `MockAiProvider`
 * for tests. Phase 6 adds textual extractions (summaries, issue drafts and
 * decision drafts) validated with Zod.
 *
 * Non-negotiable rule: AI does not analyze photos in the MVP; it only works
 * on text (transcriptions, notes and textual documents).
 */
export interface AiProvider {
  /** Provider identifier, e.g. "mock" or "openai". */
  readonly name: string;
}
