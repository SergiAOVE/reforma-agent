export const phaseStatusValues = [
  "planned",
  "in_progress",
  "complete"
] as const;

export const projectRoleValues = ["owner", "admin", "editor", "viewer"] as const;

export const projectStatusValues = [
  "active",
  "paused",
  "completed",
  "archived"
] as const;

export const visitStatusValues = ["draft", "published", "archived"] as const;

export const evidenceTypeValues = [
  "photo",
  "audio",
  "video",
  "document"
] as const;

export const documentTypeValues = [
  "plan",
  "quote",
  "technical_memory",
  "annex",
  "invoice",
  "warranty",
  "change_order",
  "other"
] as const;

export const issueStatusValues = [
  "ai_draft",
  "open",
  "in_review",
  "waiting_builder",
  "waiting_owner",
  "resolved",
  "closed",
  "rejected"
] as const;

export const decisionStatusValues = [
  "ai_draft",
  "pending",
  "approved",
  "rejected",
  "superseded",
  "closed"
] as const;

export const priorityValues = ["low", "medium", "high", "critical"] as const;

export const jobTypeValues = [
  "transcribe_audio",
  "extract_visit",
  "generate_visit_summary",
  "suggest_issues",
  "suggest_decisions",
  "generate_weekly_summary"
] as const;

export const jobStatusValues = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled"
] as const;

export const reviewStateValues = [
  "human_created",
  "ai_draft",
  "approved",
  "edited",
  "rejected"
] as const;
