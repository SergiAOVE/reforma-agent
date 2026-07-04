import { describe, expect, it } from "vitest";

import {
  analyzeDocumentJobInputSchema,
  analyzeDocumentJobOutputSchema,
  documentInsightResultSchema,
  isSupportedDocumentIntelligenceMimeType,
  suggestDecisionsJobOutputSchema,
  suggestDecisionsResultSchema,
  suggestedDecisionSchema,
  suggestedIssueSchema,
  suggestIssuesJobOutputSchema,
  suggestIssuesResultSchema,
  transcribeAudioJobInputSchema,
  transcribeAudioJobOutputSchema,
  weeklySummaryJobInputSchema,
  weeklySummaryJobOutputSchema,
  weeklySummaryResultSchema,
  visitSummaryJobOutputSchema,
  visitSummaryResultSchema,
  visitTextExtractionJobInputSchema,
  visitTextExtractionJobTypeSchema,
} from "./jobs";

const evidenceId = "44444444-4444-4444-8444-444444444444";
const transcriptionId = "55555555-5555-4555-8555-555555555555";
const visitId = "66666666-6666-4666-8666-666666666666";
const issueId = "77777777-7777-4777-8777-777777777777";
const decisionId = "88888888-8888-4888-8888-888888888888";
const weeklySummaryId = "99999999-9999-4999-8999-999999999999";
const projectId = "11111111-1111-4111-8111-111111111111";
const documentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const documentInsightId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("transcribeAudioJobInputSchema", () => {
  it("accepts an evidence id and optional language", () => {
    expect(transcribeAudioJobInputSchema.parse({ evidenceId, language: " en " })).toMatchObject({
      evidenceId,
      language: "en",
    });
  });

  it("normalizes missing language to null", () => {
    expect(transcribeAudioJobInputSchema.parse({ evidenceId }).language).toBeNull();
  });

  it("rejects invalid evidence ids", () => {
    expect(transcribeAudioJobInputSchema.safeParse({ evidenceId: "bad" }).success).toBe(false);
  });
});

describe("transcribeAudioJobOutputSchema", () => {
  it("accepts provider metadata for a created transcription", () => {
    expect(
      transcribeAudioJobOutputSchema.safeParse({
        evidenceId,
        transcriptionId,
        provider: "mock",
        model: "mock-transcriber",
        language: null,
      }).success,
    ).toBe(true);
  });
});

describe("visitTextExtractionJobTypeSchema", () => {
  it("accepts only the Phase 6 text extraction job types", () => {
    expect(visitTextExtractionJobTypeSchema.safeParse("generate_visit_summary").success).toBe(true);
    expect(visitTextExtractionJobTypeSchema.safeParse("suggest_issues").success).toBe(true);
    expect(visitTextExtractionJobTypeSchema.safeParse("suggest_decisions").success).toBe(true);
    expect(visitTextExtractionJobTypeSchema.safeParse("transcribe_audio").success).toBe(false);
    expect(visitTextExtractionJobTypeSchema.safeParse("generate_weekly_summary").success).toBe(
      false,
    );
  });
});

describe("visitTextExtractionJobInputSchema", () => {
  it("accepts a visit id", () => {
    expect(visitTextExtractionJobInputSchema.parse({ visitId })).toEqual({ visitId });
  });

  it("rejects invalid visit ids", () => {
    expect(visitTextExtractionJobInputSchema.safeParse({ visitId: "bad" }).success).toBe(false);
  });
});

describe("weeklySummaryJobInputSchema", () => {
  it("accepts a valid weekly summary date range", () => {
    expect(
      weeklySummaryJobInputSchema.parse({
        weekStart: "2026-06-29",
        weekEnd: "2026-07-05",
      }),
    ).toEqual({
      weekStart: "2026-06-29",
      weekEnd: "2026-07-05",
    });
  });

  it("rejects reversed weekly summary date ranges", () => {
    expect(
      weeklySummaryJobInputSchema.safeParse({
        weekStart: "2026-07-05",
        weekEnd: "2026-06-29",
      }).success,
    ).toBe(false);
  });
});

describe("analyzeDocumentJobInputSchema", () => {
  it("accepts a project document id", () => {
    expect(analyzeDocumentJobInputSchema.parse({ documentId })).toEqual({ documentId });
  });

  it("rejects invalid document ids", () => {
    expect(analyzeDocumentJobInputSchema.safeParse({ documentId: "bad" }).success).toBe(false);
  });
});

describe("visitSummaryResultSchema", () => {
  it("accepts a non-empty summary", () => {
    expect(visitSummaryResultSchema.parse({ summary: "  Work progressed. " })).toEqual({
      summary: "Work progressed.",
    });
  });

  it("rejects empty summaries", () => {
    expect(visitSummaryResultSchema.safeParse({ summary: "   " }).success).toBe(false);
  });
});

describe("weeklySummaryResultSchema", () => {
  it("accepts reviewable weekly summary text", () => {
    expect(
      weeklySummaryResultSchema.parse({
        title: "  Week of June 29 ",
        summary: "  Kitchen demolition completed and plumbing follow-up remains open. ",
      }),
    ).toEqual({
      title: "Week of June 29",
      summary: "Kitchen demolition completed and plumbing follow-up remains open.",
    });
  });

  it("rejects blank weekly summaries", () => {
    expect(weeklySummaryResultSchema.safeParse({ title: "Week", summary: " " }).success).toBe(
      false,
    );
  });
});

describe("documentInsightResultSchema", () => {
  it("accepts reviewable document insight output", () => {
    expect(
      documentInsightResultSchema.parse({
        title: "  Quote review ",
        summary: "  The quote includes kitchen cabinets and excludes lighting. ",
        keyPoints: ["  Kitchen cabinets included "],
        suggestedActions: [" Confirm lighting scope "],
      }),
    ).toEqual({
      title: "Quote review",
      summary: "The quote includes kitchen cabinets and excludes lighting.",
      keyPoints: ["Kitchen cabinets included"],
      suggestedActions: ["Confirm lighting scope"],
    });
  });

  it("rejects empty summaries", () => {
    expect(
      documentInsightResultSchema.safeParse({
        title: "Quote",
        summary: " ",
      }).success,
    ).toBe(false);
  });

  it("limits key points and suggested actions", () => {
    expect(
      documentInsightResultSchema.safeParse({
        title: "Quote",
        summary: "Summary",
        keyPoints: Array.from({ length: 21 }, (_, index) => `Point ${index}`),
      }).success,
    ).toBe(false);
    expect(
      documentInsightResultSchema.safeParse({
        title: "Quote",
        summary: "Summary",
        suggestedActions: Array.from({ length: 11 }, (_, index) => `Action ${index}`),
      }).success,
    ).toBe(false);
  });
});

describe("suggestedIssueSchema", () => {
  it("normalizes optional references and defaults priority", () => {
    expect(
      suggestedIssueSchema.parse({
        title: "Review plumbing leak",
        description: "",
        zoneId: "",
        tradeId: null,
        contractItemId: undefined,
        costRisk: "  possible change order ",
        scheduleRisk: "",
      }),
    ).toEqual({
      title: "Review plumbing leak",
      description: null,
      priority: "medium",
      zoneId: null,
      tradeId: null,
      contractItemId: null,
      costRisk: "possible change order",
      scheduleRisk: null,
    });
  });

  it("limits issue batches", () => {
    expect(
      suggestIssuesResultSchema.safeParse({
        issues: Array.from({ length: 11 }, (_, index) => ({ title: `Issue ${index}` })),
      }).success,
    ).toBe(false);
  });
});

describe("suggestedDecisionSchema", () => {
  it("accepts reviewable decision options", () => {
    expect(
      suggestedDecisionSchema.parse({
        title: "Choose kitchen tile",
        options: [{ label: "Matte tile", note: "Lower slip risk" }],
        recommendation: "Confirm sample in daylight.",
      }),
    ).toMatchObject({
      title: "Choose kitchen tile",
      priority: "medium",
      options: [{ label: "Matte tile", note: "Lower slip risk" }],
      recommendation: "Confirm sample in daylight.",
    });
  });

  it("limits decision batches", () => {
    expect(
      suggestDecisionsResultSchema.safeParse({
        decisions: Array.from({ length: 11 }, (_, index) => ({ title: `Decision ${index}` })),
      }).success,
    ).toBe(false);
  });
});

describe("Phase 6 job output schemas", () => {
  it("accepts summary output metadata", () => {
    expect(
      visitSummaryJobOutputSchema.safeParse({
        visitId,
        summary: "Reviewed summary.",
        provider: "mock",
        model: "mock-text",
      }).success,
    ).toBe(true);
  });

  it("accepts created issue ids", () => {
    expect(
      suggestIssuesJobOutputSchema.safeParse({
        visitId,
        issueIds: [issueId],
        provider: "mock",
        model: "mock-text",
      }).success,
    ).toBe(true);
  });

  it("accepts created decision ids", () => {
    expect(
      suggestDecisionsJobOutputSchema.safeParse({
        visitId,
        decisionIds: [decisionId],
        provider: "mock",
        model: "mock-text",
      }).success,
    ).toBe(true);
  });
});

describe("Phase 8 job output schemas", () => {
  it("accepts created weekly summary metadata", () => {
    expect(
      weeklySummaryJobOutputSchema.safeParse({
        weeklySummaryId,
        projectId,
        weekStart: "2026-06-29",
        weekEnd: "2026-07-05",
        provider: "mock",
        model: "mock-text",
      }).success,
    ).toBe(true);
  });
});

describe("Phase 12 document intelligence schemas", () => {
  it("accepts created document insight metadata", () => {
    expect(
      analyzeDocumentJobOutputSchema.safeParse({
        documentInsightId,
        documentId,
        projectId,
        provider: "mock",
        model: "mock-text",
      }).success,
    ).toBe(true);
  });

  it("allows text-like documents only", () => {
    expect(isSupportedDocumentIntelligenceMimeType("text/plain")).toBe(true);
    expect(isSupportedDocumentIntelligenceMimeType("text/csv")).toBe(true);
    expect(isSupportedDocumentIntelligenceMimeType("image/png")).toBe(false);
    expect(isSupportedDocumentIntelligenceMimeType("application/pdf")).toBe(false);
  });
});
