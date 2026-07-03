import { describe, expect, it } from "vitest";

import { createAiProviderFromEnv, MockAiProvider, OpenAiProvider } from "./index";

const visitContext = {
  project: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Flat renovation",
    addressLabel: "Barcelona flat",
  },
  visit: {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Kitchen visit",
    visitDate: "2026-07-03",
    generalStatus: "Cabinets installed, plumbing pending.",
    humanNotes: "Builder mentioned a possible delay around the sink connection.",
    summary: null,
  },
  transcripts: [
    {
      evidenceId: "33333333-3333-4333-8333-333333333333",
      text: "The sink connection needs confirmation before the worktop is measured.",
    },
  ],
  zones: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Kitchen",
      description: null,
    },
  ],
  trades: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Plumbing",
      description: null,
    },
  ],
  contractItems: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      code: "P01",
      title: "Sink plumbing",
      description: null,
      tradeId: "55555555-5555-4555-8555-555555555555",
      zoneId: "44444444-4444-4444-8444-444444444444",
      totalAmount: 450,
      status: "draft",
      notes: null,
    },
  ],
  documents: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      type: "quote",
      title: "Builder quote",
      notes: "Includes plumbing allowance.",
      originalFilename: "quote.pdf",
    },
  ],
};

const weeklyContext = {
  project: visitContext.project,
  weekStart: "2026-06-29",
  weekEnd: "2026-07-05",
  visits: [
    {
      id: visitContext.visit.id,
      title: visitContext.visit.title,
      visitDate: visitContext.visit.visitDate,
      status: "published",
      generalStatus: visitContext.visit.generalStatus,
      humanNotes: visitContext.visit.humanNotes,
      reviewedSummary: "Kitchen cabinets progressed; plumbing needs owner follow-up.",
    },
  ],
  issues: [
    {
      id: "88888888-8888-4888-8888-888888888888",
      title: "Confirm sink connection",
      description: "Builder needs plumbing confirmation before worktop measurement.",
      priority: "high",
      status: "open",
      reviewState: "approved",
      zoneName: "Kitchen",
      tradeName: "Plumbing",
      costRisk: null,
      scheduleRisk: "Could delay measurement.",
    },
  ],
  decisions: [
    {
      id: "99999999-9999-4999-8999-999999999999",
      title: "Choose countertop material",
      description: "Owner needs to choose before ordering cabinets.",
      priority: "medium",
      status: "pending",
      deadline: "2026-07-15",
      reviewState: "human_created",
      zoneName: "Kitchen",
      tradeName: null,
      recommendation: "Review quartz and laminate options.",
      costImpact: null,
      scheduleImpact: "Blocks cabinet ordering.",
    },
  ],
  zones: visitContext.zones,
  trades: visitContext.trades,
  contractItems: visitContext.contractItems,
  documents: visitContext.documents,
};

describe("MockAiProvider", () => {
  it("returns a deterministic local transcript", async () => {
    const provider = new MockAiProvider();
    const result = await provider.transcribeAudio({
      audio: new Blob(["hello"], { type: "audio/webm" }),
      filename: "visit.webm",
      mimeType: "audio/webm",
      language: "en",
    });

    expect(result).toEqual({
      text: "[mock transcript] file=visit.webm mime=audio/webm bytes=5",
      language: "en",
      provider: "mock",
      model: "mock-transcriber",
    });
  });

  it("returns a deterministic visit summary draft", async () => {
    const provider = new MockAiProvider();
    const result = await provider.generateVisitSummary({ context: visitContext });

    expect(result.provider).toBe("mock");
    expect(result.model).toBe("mock-text-extractor");
    expect(result.summary).toContain("Kitchen visit");
    expect(result.summary).toContain("Cabinets installed");
  });

  it("returns a deterministic weekly summary draft", async () => {
    const provider = new MockAiProvider();
    const result = await provider.generateWeeklySummary({ context: weeklyContext });

    expect(result.provider).toBe("mock");
    expect(result.model).toBe("mock-text-extractor");
    expect(result.title).toBe("Week 2026-06-29 to 2026-07-05");
    expect(result.summary).toContain("Flat renovation");
    expect(result.summary).toContain("Confirm sink connection");
  });

  it("returns deterministic issue drafts from visit text", async () => {
    const provider = new MockAiProvider();
    const result = await provider.suggestIssues({ context: visitContext });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      title: "Review Plumbing follow-up",
      priority: "medium",
      zoneId: "44444444-4444-4444-8444-444444444444",
      tradeId: "55555555-5555-4555-8555-555555555555",
      contractItemId: "66666666-6666-4666-8666-666666666666",
    });
  });

  it("returns deterministic decision drafts from visit text", async () => {
    const provider = new MockAiProvider();
    const result = await provider.suggestDecisions({ context: visitContext });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({
      title: "Confirm next step for Kitchen",
      priority: "medium",
      zoneId: "44444444-4444-4444-8444-444444444444",
      tradeId: "55555555-5555-4555-8555-555555555555",
    });
    expect(result.decisions[0]?.options).toHaveLength(2);
  });
});

describe("createAiProviderFromEnv", () => {
  it("uses the mock provider when no key is configured", () => {
    expect(createAiProviderFromEnv({})).toBeInstanceOf(MockAiProvider);
  });

  it("uses OpenAI when an API key is configured", () => {
    expect(createAiProviderFromEnv({ OPENAI_API_KEY: "test-key" })).toBeInstanceOf(OpenAiProvider);
  });

  it("accepts separate OpenAI transcription and text model configuration", () => {
    expect(
      createAiProviderFromEnv({
        OPENAI_API_KEY: "test-key",
        OPENAI_TRANSCRIPTION_MODEL: "transcriber",
        OPENAI_TEXT_MODEL: "text-model",
      }),
    ).toBeInstanceOf(OpenAiProvider);
  });
});
