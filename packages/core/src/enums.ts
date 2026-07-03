export const phaseStatusValues = [
  "planned",
  "in_progress",
  "complete"
] as const;

export const evidenceTypeValues = [
  "photo",
  "audio",
  "video",
  "document"
] as const;

export const visitStatusValues = ["draft", "published", "archived"] as const;

export const reviewStateValues = [
  "human_created",
  "ai_draft",
  "approved",
  "edited",
  "rejected"
] as const;
