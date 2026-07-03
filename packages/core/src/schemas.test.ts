import { describe, expect, it } from "vitest";
import {
  EvidenceTypeSchema,
  PhaseSchema,
  ReviewStateSchema,
  VisitStatusSchema
} from "./index.js";

describe("core schemas", () => {
  it("accepts valid Phase 0 metadata", () => {
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
});
