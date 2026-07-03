import { z } from "zod";

/**
 * Domain enums.
 *
 * These mirror the Postgres enums created in
 * supabase/migrations/20260702120000_create_enums.sql.
 * Keep both sides in sync: any change requires a new SQL migration
 * and an update here.
 */

export const PROJECT_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export const projectRoleSchema = z.enum(PROJECT_ROLES);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

export const PROJECT_STATUSES = ["active", "paused", "completed", "archived"] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const VISIT_STATUSES = ["draft", "published", "archived"] as const;
export const visitStatusSchema = z.enum(VISIT_STATUSES);
export type VisitStatus = z.infer<typeof visitStatusSchema>;

export const EVIDENCE_TYPES = ["photo", "audio", "video", "document"] as const;
export const evidenceTypeSchema = z.enum(EVIDENCE_TYPES);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const DOCUMENT_TYPES = [
  "plan",
  "quote",
  "technical_memory",
  "annex",
  "invoice",
  "warranty",
  "change_order",
  "other",
] as const;
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const ISSUE_STATUSES = [
  "ai_draft",
  "open",
  "in_review",
  "waiting_builder",
  "waiting_owner",
  "resolved",
  "closed",
  "rejected",
] as const;
export const issueStatusSchema = z.enum(ISSUE_STATUSES);
export type IssueStatus = z.infer<typeof issueStatusSchema>;

export const DECISION_STATUSES = [
  "ai_draft",
  "pending",
  "approved",
  "rejected",
  "superseded",
  "closed",
] as const;
export const decisionStatusSchema = z.enum(DECISION_STATUSES);
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

export const JOB_TYPES = [
  "transcribe_audio",
  "extract_visit",
  "generate_visit_summary",
  "suggest_issues",
  "suggest_decisions",
  "generate_weekly_summary",
] as const;
export const jobTypeSchema = z.enum(JOB_TYPES);
export type JobType = z.infer<typeof jobTypeSchema>;

export const JOB_STATUSES = ["pending", "processing", "completed", "failed", "cancelled"] as const;
export const jobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/**
 * Review lifecycle of human/AI content (issues, decisions).
 * Stored as text in Postgres (not a SQL enum) to stay flexible while the
 * review workflow is built out in Phases 6-7; validated here at the edges.
 */
export const REVIEW_STATES = [
  "human_created",
  "ai_draft",
  "approved",
  "edited",
  "rejected",
] as const;
export const reviewStateSchema = z.enum(REVIEW_STATES);
export type ReviewState = z.infer<typeof reviewStateSchema>;

/** Origin of a row: created by a human or proposed by AI. */
export const CONTENT_SOURCES = ["human", "ai"] as const;
export const contentSourceSchema = z.enum(CONTENT_SOURCES);
export type ContentSource = z.infer<typeof contentSourceSchema>;
