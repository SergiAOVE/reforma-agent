import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  audioTranscriptionEditSchema,
  contractItemFormSchema,
  decisionCreateFormSchema,
  decisionReviewFormSchema,
  documentMetadataSchema,
  evidenceMetadataSchema,
  evidenceMimeTypeMatchesType,
  evidenceTypeFromMimeType,
  issueCreateFormSchema,
  issueReviewFormSchema,
  parseBudgetCsv,
  projectFormSchema,
  projectSettingsSchema,
  signInSchema,
  signUpSchema,
  summaryReviewFormSchema,
  visitFormSchema,
  visitStatusTransitionSchema,
  weeklySummaryRequestSchema,
  weeklySummaryReviewFormSchema,
  zoneTradeFormSchema,
} from "./forms";

describe("signInSchema", () => {
  it("accepts a valid email and password, trimming the email", () => {
    const parsed = signInSchema.parse({ email: "  ana@example.com ", password: "password123" });
    expect(parsed.email).toBe("ana@example.com");
  });

  it("rejects invalid emails and short passwords", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "password123" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("requires a non-empty full name", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.com", password: "password123", fullName: "  " }).success,
    ).toBe(false);
  });
});

describe("projectFormSchema", () => {
  it("normalizes empty optional fields to null", () => {
    const parsed = projectFormSchema.parse({
      name: " Demo ",
      addressLabel: "  ",
      description: undefined,
    });
    expect(parsed).toEqual({ name: "Demo", addressLabel: null, description: null });
  });

  it("rejects an empty name", () => {
    expect(projectFormSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("keeps provided optional values", () => {
    const parsed = projectFormSchema.parse({ name: "Demo", addressLabel: "Barcelona flat" });
    expect(parsed.addressLabel).toBe("Barcelona flat");
  });
});

describe("projectSettingsSchema", () => {
  it("requires a valid status", () => {
    expect(projectSettingsSchema.safeParse({ name: "Demo", status: "active" }).success).toBe(true);
    expect(projectSettingsSchema.safeParse({ name: "Demo", status: "bogus" }).success).toBe(false);
  });
});

describe("addMemberSchema", () => {
  it("accepts a valid email and role", () => {
    expect(addMemberSchema.safeParse({ email: "luis@example.com", role: "viewer" }).success).toBe(
      true,
    );
  });

  it("rejects unknown roles", () => {
    expect(addMemberSchema.safeParse({ email: "luis@example.com", role: "boss" }).success).toBe(
      false,
    );
  });
});

describe("zoneTradeFormSchema", () => {
  it("trims names and normalizes optional descriptions", () => {
    const parsed = zoneTradeFormSchema.parse({
      name: " Kitchen ",
      description: " ",
      sortOrder: "2",
    });

    expect(parsed).toEqual({ name: "Kitchen", description: null, sortOrder: 2 });
  });

  it("rejects empty names and out-of-range sort orders", () => {
    expect(
      zoneTradeFormSchema.safeParse({
        name: " ",
        description: "",
        sortOrder: "1",
      }).success,
    ).toBe(false);
    expect(
      zoneTradeFormSchema.safeParse({
        name: "Kitchen",
        description: "",
        sortOrder: "10001",
      }).success,
    ).toBe(false);
  });
});

describe("documentMetadataSchema", () => {
  it("accepts a known document type", () => {
    expect(
      documentMetadataSchema.safeParse({ type: "plan", title: "Ground floor plan", notes: "" })
        .success,
    ).toBe(true);
  });

  it("rejects unknown document types", () => {
    expect(
      documentMetadataSchema.safeParse({ type: "blueprint", title: "Plan", notes: "" }).success,
    ).toBe(false);
  });
});

describe("contractItemFormSchema", () => {
  it("parses optional decimals and UUID references from form values", () => {
    const parsed = contractItemFormSchema.parse({
      title: "Kitchen cabinets",
      quantity: "3",
      unitPrice: "1200.5",
      totalAmount: "",
      tradeId: "",
      zoneId: "",
      sourceDocumentId: "",
    });

    expect(parsed.quantity).toBe(3);
    expect(parsed.unitPrice).toBe(1200.5);
    expect(parsed.totalAmount).toBeNull();
    expect(parsed.tradeId).toBeNull();
  });

  it("rejects negative amounts", () => {
    expect(contractItemFormSchema.safeParse({ title: "Bad", totalAmount: "-1" }).success).toBe(
      false,
    );
  });
});

describe("parseBudgetCsv", () => {
  it("imports valid CSV rows and handles quoted commas", () => {
    const result =
      parseBudgetCsv(`code,title,description,trade,zone,quantity,unit,unit_price,total_amount,included_excluded,source_page,notes
K01,"Kitchen, cabinets",Base units,Carpentry,Kitchen,2,unit,1200,2400,included,4,"Oak finish, matte"`);

    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      code: "K01",
      title: "Kitchen, cabinets",
      quantity: 2,
      unit_price: 1200,
      total_amount: 2400,
      notes: "Oak finish, matte",
    });
  });

  it("reports missing required headers", () => {
    const result = parseBudgetCsv("code,total_amount\nA,10");

    expect(result.items).toEqual([]);
    expect(result.errors).toContain("Missing required header: title.");
  });

  it("reports row numbers for invalid numbers", () => {
    const result = parseBudgetCsv("title,total_amount\nPaint,-10");

    expect(result.items).toEqual([]);
    expect(result.errors[0]).toMatch(/^Row 2:/);
  });
});

describe("visitFormSchema", () => {
  it("accepts a dated visit and normalizes optional fields", () => {
    const parsed = visitFormSchema.parse({
      title: " Week 8 visit ",
      visitDate: "2026-07-03",
      generalStatus: "  progressing ",
      summary: "",
      humanNotes: undefined,
      primaryZoneId: "",
      primaryTradeId: "",
    });

    expect(parsed).toEqual({
      title: "Week 8 visit",
      visitDate: "2026-07-03",
      generalStatus: "progressing",
      summary: null,
      humanNotes: null,
      primaryZoneId: null,
      primaryTradeId: null,
    });
  });

  it("rejects non-ISO dates", () => {
    expect(visitFormSchema.safeParse({ title: "Visit", visitDate: "03/07/2026" }).success).toBe(
      false,
    );
  });
});

describe("visitStatusTransitionSchema", () => {
  it("only accepts known visit statuses", () => {
    expect(visitStatusTransitionSchema.safeParse({ status: "published" }).success).toBe(true);
    expect(visitStatusTransitionSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("evidenceMetadataSchema", () => {
  it("normalizes optional visit evidence references", () => {
    const parsed = evidenceMetadataSchema.parse({
      type: "photo",
      zoneId: "",
      tradeId: "",
      manualNote: "  Sink wall before tiling ",
    });

    expect(parsed).toEqual({
      type: "photo",
      zoneId: null,
      tradeId: null,
      manualNote: "Sink wall before tiling",
    });
  });
});

describe("evidence MIME helpers", () => {
  it("maps common MIME families to evidence types", () => {
    expect(evidenceTypeFromMimeType("image/jpeg")).toBe("photo");
    expect(evidenceTypeFromMimeType("image/heic")).toBe("photo");
    expect(evidenceTypeFromMimeType("audio/webm")).toBe("audio");
    expect(evidenceTypeFromMimeType("video/mp4")).toBe("video");
    expect(evidenceTypeFromMimeType("application/pdf")).toBe("document");
    expect(evidenceTypeFromMimeType("text/csv")).toBe("document");
    expect(
      evidenceTypeFromMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("document");
  });

  it("rejects a type/MIME mismatch", () => {
    expect(evidenceMimeTypeMatchesType("image/png", "photo")).toBe(true);
    expect(evidenceMimeTypeMatchesType("image/png", "audio")).toBe(false);
  });
});

describe("audioTranscriptionEditSchema", () => {
  it("normalizes edited transcript text", () => {
    expect(audioTranscriptionEditSchema.parse({ editedTranscript: "  Looks good. " })).toEqual({
      editedTranscript: "Looks good.",
    });
  });

  it("stores empty edits as null", () => {
    expect(audioTranscriptionEditSchema.parse({ editedTranscript: "" })).toEqual({
      editedTranscript: null,
    });
  });
});

describe("summaryReviewFormSchema", () => {
  it("accepts summary review actions and normalizes text", () => {
    expect(
      summaryReviewFormSchema.parse({ action: "edit", summary: "  Work looks good. " }),
    ).toEqual({
      action: "edit",
      summary: "Work looks good.",
    });
  });

  it("rejects unknown summary review actions", () => {
    expect(summaryReviewFormSchema.safeParse({ action: "close", summary: "" }).success).toBe(false);
  });
});

describe("weeklySummaryRequestSchema", () => {
  it("accepts a valid weekly summary date range", () => {
    expect(
      weeklySummaryRequestSchema.parse({
        weekStart: "2026-06-29",
        weekEnd: "2026-07-05",
      }),
    ).toEqual({
      weekStart: "2026-06-29",
      weekEnd: "2026-07-05",
    });
  });

  it("rejects a reversed weekly summary date range", () => {
    expect(
      weeklySummaryRequestSchema.safeParse({
        weekStart: "2026-07-05",
        weekEnd: "2026-06-29",
      }).success,
    ).toBe(false);
  });
});

describe("weeklySummaryReviewFormSchema", () => {
  it("accepts weekly summary review edits", () => {
    expect(
      weeklySummaryReviewFormSchema.parse({
        action: "edit",
        title: "  Week 27 summary ",
        summary: "  Main risks are plumbing and countertop timing. ",
      }),
    ).toEqual({
      action: "edit",
      title: "Week 27 summary",
      summary: "Main risks are plumbing and countertop timing.",
    });
  });

  it("rejects unknown weekly summary review actions", () => {
    expect(
      weeklySummaryReviewFormSchema.safeParse({
        action: "close",
        title: "Week",
        summary: "",
      }).success,
    ).toBe(false);
  });
});

describe("issueReviewFormSchema", () => {
  it("accepts issue review edits with optional references", () => {
    const parsed = issueReviewFormSchema.parse({
      action: "edit",
      title: "  Confirm moisture source ",
      description: "",
      priority: "high",
      zoneId: "",
      tradeId: "",
      contractItemId: "",
      costRisk: "  possible variation ",
      scheduleRisk: "",
    });

    expect(parsed).toMatchObject({
      action: "edit",
      title: "Confirm moisture source",
      description: null,
      priority: "high",
      zoneId: null,
      tradeId: null,
      contractItemId: null,
      costRisk: "possible variation",
      scheduleRisk: null,
    });
  });

  it("rejects issue edits without a title", () => {
    expect(
      issueReviewFormSchema.safeParse({ action: "edit", title: "", priority: "medium" }).success,
    ).toBe(false);
  });
});

describe("issueCreateFormSchema", () => {
  it("accepts a human issue with optional visit and references", () => {
    const parsed = issueCreateFormSchema.parse({
      title: "  Water stain in kitchen ",
      description: "",
      priority: "high",
      visitId: "11111111-1111-4111-8111-111111111111",
      zoneId: "",
      tradeId: "",
      contractItemId: "",
      costRisk: "",
      scheduleRisk: "Needs inspection before closing the wall.",
    });

    expect(parsed).toMatchObject({
      title: "Water stain in kitchen",
      description: null,
      priority: "high",
      visitId: "11111111-1111-4111-8111-111111111111",
      zoneId: null,
      tradeId: null,
      contractItemId: null,
      costRisk: null,
      scheduleRisk: "Needs inspection before closing the wall.",
    });
  });

  it("rejects human issues without a title", () => {
    expect(issueCreateFormSchema.safeParse({ title: "", priority: "medium" }).success).toBe(false);
  });
});

describe("decisionReviewFormSchema", () => {
  it("accepts decision review edits with a nullable deadline", () => {
    const parsed = decisionReviewFormSchema.parse({
      action: "approve",
      title: "Choose tiles",
      description: "Owner needs to choose.",
      priority: "medium",
      zoneId: "",
      tradeId: "",
      deadline: "",
      optionsText: "Quartz\nLaminate",
      recommendation: "Choose quartz.",
      costImpact: "",
      scheduleImpact: "May block ordering.",
    });

    expect(parsed).toMatchObject({
      action: "approve",
      title: "Choose tiles",
      priority: "medium",
      zoneId: null,
      tradeId: null,
      deadline: null,
      optionsText: "Quartz\nLaminate",
      costImpact: null,
      scheduleImpact: "May block ordering.",
    });
  });

  it("rejects invalid decision deadlines", () => {
    expect(
      decisionReviewFormSchema.safeParse({
        action: "edit",
        title: "Choose tiles",
        priority: "medium",
        deadline: "07/03/2026",
      }).success,
    ).toBe(false);
  });
});

describe("decisionCreateFormSchema", () => {
  it("accepts a pending decision with optional context", () => {
    const parsed = decisionCreateFormSchema.parse({
      title: "Choose bathroom tile",
      description: "Owner selection needed.",
      priority: "medium",
      visitId: "",
      zoneId: "",
      tradeId: "",
      deadline: "2026-07-15",
      optionsText: "Porcelain\nCeramic",
      recommendation: "",
      costImpact: "Porcelain is higher cost.",
      scheduleImpact: "",
    });

    expect(parsed).toMatchObject({
      title: "Choose bathroom tile",
      description: "Owner selection needed.",
      priority: "medium",
      visitId: null,
      deadline: "2026-07-15",
      optionsText: "Porcelain\nCeramic",
      recommendation: null,
      costImpact: "Porcelain is higher cost.",
      scheduleImpact: null,
    });
  });

  it("rejects invalid pending decision deadlines", () => {
    expect(
      decisionCreateFormSchema.safeParse({
        title: "Choose bathroom tile",
        priority: "medium",
        deadline: "15/07/2026",
      }).success,
    ).toBe(false);
  });
});
