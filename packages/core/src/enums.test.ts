import { describe, expect, it } from "vitest";

import {
  CONTENT_SOURCES,
  DECISION_STATUSES,
  DOCUMENT_TYPES,
  EVIDENCE_TYPES,
  ISSUE_STATUSES,
  JOB_STATUSES,
  JOB_TYPES,
  PRIORITIES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  REVIEW_STATES,
  STAKEHOLDER_TYPES,
  VISIT_STATUSES,
  decisionStatusSchema,
  documentTypeSchema,
  evidenceTypeSchema,
  issueStatusSchema,
  jobStatusSchema,
  jobTypeSchema,
  prioritySchema,
  projectRoleSchema,
  projectStatusSchema,
  reviewStateSchema,
  stakeholderTypeSchema,
  visitStatusSchema,
} from "./enums";

// These value lists must stay in sync with the Postgres enums defined in
// supabase/migrations/20260702120000_create_enums.sql.
describe("enum values mirror the SQL migration", () => {
  it("project_role", () => {
    expect(PROJECT_ROLES).toEqual(["owner", "admin", "editor", "viewer"]);
  });

  it("stakeholder_type", () => {
    expect(STAKEHOLDER_TYPES).toEqual([
      "customer",
      "site_manager",
      "architect",
      "engineer",
      "contractor",
      "foreman",
      "worker",
      "consultant",
      "other",
    ]);
  });

  it("project_status", () => {
    expect(PROJECT_STATUSES).toEqual(["active", "paused", "completed", "archived"]);
  });

  it("visit_status", () => {
    expect(VISIT_STATUSES).toEqual(["draft", "published", "archived"]);
  });

  it("evidence_type", () => {
    expect(EVIDENCE_TYPES).toEqual(["photo", "audio", "video", "document"]);
  });

  it("document_type", () => {
    expect(DOCUMENT_TYPES).toEqual([
      "plan",
      "quote",
      "technical_memory",
      "annex",
      "invoice",
      "warranty",
      "change_order",
      "other",
    ]);
  });

  it("issue_status", () => {
    expect(ISSUE_STATUSES).toEqual([
      "ai_draft",
      "open",
      "in_review",
      "waiting_builder",
      "waiting_owner",
      "resolved",
      "closed",
      "rejected",
    ]);
  });

  it("decision_status", () => {
    expect(DECISION_STATUSES).toEqual([
      "ai_draft",
      "pending",
      "approved",
      "rejected",
      "superseded",
      "closed",
    ]);
  });

  it("priority", () => {
    expect(PRIORITIES).toEqual(["low", "medium", "high", "critical"]);
  });

  it("job_type", () => {
    expect(JOB_TYPES).toEqual([
      "transcribe_audio",
      "extract_visit",
      "generate_visit_summary",
      "suggest_issues",
      "suggest_decisions",
      "generate_weekly_summary",
      "analyze_document",
    ]);
  });

  it("job_status", () => {
    expect(JOB_STATUSES).toEqual(["pending", "processing", "completed", "failed", "cancelled"]);
  });

  it("review_state and content source (text columns, validated app-side)", () => {
    expect(REVIEW_STATES).toEqual(["human_created", "ai_draft", "approved", "edited", "rejected"]);
    expect(CONTENT_SOURCES).toEqual(["human", "ai"]);
  });
});

describe("enum schemas accept members and reject unknown values", () => {
  const cases = [
    { schema: projectRoleSchema, valid: "owner" },
    { schema: stakeholderTypeSchema, valid: "site_manager" },
    { schema: projectStatusSchema, valid: "active" },
    { schema: visitStatusSchema, valid: "draft" },
    { schema: evidenceTypeSchema, valid: "photo" },
    { schema: documentTypeSchema, valid: "quote" },
    { schema: issueStatusSchema, valid: "open" },
    { schema: decisionStatusSchema, valid: "pending" },
    { schema: prioritySchema, valid: "high" },
    { schema: jobTypeSchema, valid: "transcribe_audio" },
    { schema: jobStatusSchema, valid: "pending" },
    { schema: reviewStateSchema, valid: "ai_draft" },
  ] as const;

  it.each(cases)("accepts $valid", ({ schema, valid }) => {
    expect(schema.parse(valid)).toBe(valid);
  });

  it.each(cases)("rejects an unknown value (valid sample: $valid)", ({ schema }) => {
    expect(schema.safeParse("not-a-real-value").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });
});
