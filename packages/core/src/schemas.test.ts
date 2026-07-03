import { describe, expect, it } from "vitest";
import {
  AgentJobSchema,
  DecisionStatusSchema,
  DocumentSchema,
  EvidenceTypeSchema,
  IssueSchema,
  PhaseSchema,
  ProjectMemberSchema,
  ProjectRoleSchema,
  ReviewStateSchema,
  VisitSchema,
  VisitStatusSchema,
  jobTypeValues,
  projectRoleValues
} from "./index.js";

const now = "2026-07-03T09:30:00.000Z";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const visitId = "33333333-3333-4333-8333-333333333333";
const zoneId = "44444444-4444-4444-8444-444444444444";
const tradeId = "55555555-5555-4555-8555-555555555555";
const jobId = "66666666-6666-4666-8666-666666666666";

describe("core schemas", () => {
  it("accepts valid phase metadata", () => {
    const result = PhaseSchema.parse({
      phase: 0,
      title: "Bootstrap repo",
      status: "in_progress"
    });

    expect(result.phase).toBe(0);
  });

  it("rejects unsupported evidence types", () => {
    expect(() => EvidenceTypeSchema.parse("image_analysis")).toThrow();
  });

  it("keeps visit and review states explicit", () => {
    expect(VisitStatusSchema.parse("draft")).toBe("draft");
    expect(ReviewStateSchema.parse("ai_draft")).toBe("ai_draft");
  });

  it("matches the Phase 1 project role enum", () => {
    expect(projectRoleValues).toEqual(["owner", "admin", "editor", "viewer"]);
    expect(ProjectRoleSchema.parse("owner")).toBe("owner");
  });

  it("matches the Phase 1 job type enum", () => {
    expect(jobTypeValues).toContain("generate_weekly_summary");
  });

  it("validates project membership roles", () => {
    const member = ProjectMemberSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      projectId,
      userId,
      role: "admin",
      createdAt: now,
      updatedAt: now
    });

    expect(member.role).toBe("admin");
    expect(() =>
      ProjectMemberSchema.parse({ ...member, role: "contractor" })
    ).toThrow();
  });

  it("validates visit dates and status", () => {
    const visit = VisitSchema.parse({
      id: visitId,
      projectId,
      title: "Initial inspection",
      visitDate: "2026-07-03",
      status: "draft",
      generalStatus: null,
      summary: null,
      humanNotes: "Synthetic notes only.",
      primaryZoneId: zoneId,
      primaryTradeId: tradeId,
      createdBy: userId,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    });

    expect(visit.status).toBe("draft");
    expect(() =>
      VisitSchema.parse({ ...visit, visitDate: "03/07/2026" })
    ).toThrow();
  });

  it("validates document metadata without requiring real storage files", () => {
    const document = DocumentSchema.parse({
      id: "88888888-8888-4888-8888-888888888888",
      projectId,
      type: "quote",
      title: "Synthetic quote",
      storagePath: "projects/demo/documents/quote.pdf",
      originalFilename: "quote.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      notes: null,
      uploadedBy: userId,
      createdAt: now,
      updatedAt: now
    });

    expect(document.type).toBe("quote");
    expect(() => DocumentSchema.parse({ ...document, sizeBytes: -1 })).toThrow();
  });

  it("validates reviewable issue drafts", () => {
    const issue = IssueSchema.parse({
      id: "99999999-9999-4999-8999-999999999999",
      projectId,
      visitId,
      title: "Confirm kitchen tile delivery",
      description: null,
      zoneId,
      tradeId,
      priority: "medium",
      status: "ai_draft",
      reviewState: "ai_draft",
      source: "mock_ai",
      contractItemId: null,
      costRisk: null,
      scheduleRisk: "Potential delay if not confirmed.",
      createdBy: null,
      createdByJobId: jobId,
      createdAt: now,
      updatedAt: now
    });

    expect(issue.status).toBe("ai_draft");
  });

  it("validates decisions and agent jobs", () => {
    expect(DecisionStatusSchema.parse("pending")).toBe("pending");

    const job = AgentJobSchema.parse({
      id: jobId,
      projectId,
      type: "generate_visit_summary",
      status: "pending",
      input: { visitId },
      output: null,
      errorMessage: null,
      attemptCount: 0,
      maxAttempts: 3,
      lockedAt: null,
      lockedBy: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    });

    expect(job.type).toBe("generate_visit_summary");
  });
});
