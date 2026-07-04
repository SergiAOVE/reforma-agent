/**
 * Swappable AI provider contracts.
 *
 * The worker is the only caller. Web requests enqueue jobs and never invoke
 * provider methods directly. Non-negotiable rule: AI does not analyze photos
 * in the MVP.
 */

import type {
  DocumentInsightResult,
  SuggestDecisionsResult,
  SuggestIssuesResult,
  VisitSummaryResult,
  WeeklySummaryResult,
} from "@reforma/core";

export interface TranscribeAudioInput {
  audio: Blob;
  filename: string;
  mimeType: string;
  language?: string | null;
}

export interface TranscribeAudioResult {
  text: string;
  language: string | null;
  provider: string;
  model: string;
}

export interface VisitTextContext {
  project: {
    id: string;
    name: string;
    addressLabel: string | null;
  };
  visit: {
    id: string;
    title: string;
    visitDate: string;
    generalStatus: string | null;
    humanNotes: string | null;
    summary: string | null;
  };
  transcripts: {
    evidenceId: string;
    text: string;
  }[];
  zones: {
    id: string;
    name: string;
    description: string | null;
  }[];
  trades: {
    id: string;
    name: string;
    description: string | null;
  }[];
  contractItems: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
    tradeId: string | null;
    zoneId: string | null;
    totalAmount: number | null;
    status: string;
    notes: string | null;
  }[];
  documents: {
    id: string;
    type: string;
    title: string;
    notes: string | null;
    originalFilename: string;
  }[];
}

export interface WeeklySummaryContext {
  project: {
    id: string;
    name: string;
    addressLabel: string | null;
  };
  weekStart: string;
  weekEnd: string;
  visits: {
    id: string;
    title: string;
    visitDate: string;
    status: string;
    generalStatus: string | null;
    humanNotes: string | null;
    reviewedSummary: string | null;
  }[];
  issues: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    reviewState: string;
    zoneName: string | null;
    tradeName: string | null;
    costRisk: string | null;
    scheduleRisk: string | null;
  }[];
  decisions: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    deadline: string | null;
    reviewState: string;
    zoneName: string | null;
    tradeName: string | null;
    recommendation: string | null;
    costImpact: string | null;
    scheduleImpact: string | null;
  }[];
  zones: {
    id: string;
    name: string;
    description: string | null;
  }[];
  trades: {
    id: string;
    name: string;
    description: string | null;
  }[];
  contractItems: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
    tradeId: string | null;
    zoneId: string | null;
    totalAmount: number | null;
    status: string;
    notes: string | null;
  }[];
  documents: {
    id: string;
    type: string;
    title: string;
    notes: string | null;
    originalFilename: string;
  }[];
}

export interface DocumentIntelligenceContext {
  project: {
    id: string;
    name: string;
    addressLabel: string | null;
  };
  document: {
    id: string;
    type: string;
    title: string;
    notes: string | null;
    originalFilename: string;
    mimeType: string;
  };
  extractedText: string;
  zones: {
    id: string;
    name: string;
    description: string | null;
  }[];
  trades: {
    id: string;
    name: string;
    description: string | null;
  }[];
  contractItems: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
    tradeId: string | null;
    zoneId: string | null;
    totalAmount: number | null;
    status: string;
    notes: string | null;
  }[];
}

export interface GenerateVisitSummaryInput {
  context: VisitTextContext;
}

export interface GenerateWeeklySummaryInput {
  context: WeeklySummaryContext;
}

export interface SuggestIssuesInput {
  context: VisitTextContext;
}

export interface SuggestDecisionsInput {
  context: VisitTextContext;
}

export interface AnalyzeDocumentInput {
  context: DocumentIntelligenceContext;
}

export type GenerateVisitSummaryResult = VisitSummaryResult & {
  provider: string;
  model: string;
};

export type GenerateWeeklySummaryResult = WeeklySummaryResult & {
  provider: string;
  model: string;
};

export type SuggestIssuesProviderResult = SuggestIssuesResult & {
  provider: string;
  model: string;
};

export type SuggestDecisionsProviderResult = SuggestDecisionsResult & {
  provider: string;
  model: string;
};

export type AnalyzeDocumentProviderResult = DocumentInsightResult & {
  provider: string;
  model: string;
};

export interface AiProvider {
  readonly name: string;
  transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult>;
  generateVisitSummary(input: GenerateVisitSummaryInput): Promise<GenerateVisitSummaryResult>;
  generateWeeklySummary(input: GenerateWeeklySummaryInput): Promise<GenerateWeeklySummaryResult>;
  suggestIssues(input: SuggestIssuesInput): Promise<SuggestIssuesProviderResult>;
  suggestDecisions(input: SuggestDecisionsInput): Promise<SuggestDecisionsProviderResult>;
  analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalyzeDocumentProviderResult>;
}

function compactText(value: string | null | undefined, maxLength = 500): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function contextText(context: VisitTextContext): string {
  return [
    context.visit.generalStatus,
    context.visit.humanNotes,
    context.visit.summary,
    ...context.transcripts.map((transcript) => transcript.text),
  ]
    .map((value) => compactText(value, 1000))
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function weeklyContextText(context: WeeklySummaryContext): string {
  return [
    ...context.visits.flatMap((visit) => [
      visit.title,
      visit.generalStatus,
      visit.humanNotes,
      visit.reviewedSummary,
    ]),
    ...context.issues.flatMap((issue) => [
      issue.title,
      issue.description,
      issue.costRisk,
      issue.scheduleRisk,
    ]),
    ...context.decisions.flatMap((decision) => [
      decision.title,
      decision.description,
      decision.recommendation,
      decision.costImpact,
      decision.scheduleImpact,
    ]),
    ...context.contractItems.flatMap((item) => [
      item.code,
      item.title,
      item.description,
      item.notes,
    ]),
    ...context.documents.flatMap((document) => [
      document.type,
      document.title,
      document.notes,
      document.originalFilename,
    ]),
  ]
    .map((value) => compactText(value, 1000))
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function documentContextText(context: DocumentIntelligenceContext): string {
  return [
    context.document.type,
    context.document.title,
    context.document.notes,
    context.document.originalFilename,
    context.extractedText,
    ...context.contractItems.flatMap((item) => [
      item.code,
      item.title,
      item.description,
      item.notes,
    ]),
  ]
    .map((value) => compactText(value, 2000))
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  private readonly textModel = "mock-text-extractor";

  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
    return {
      text: [
        "[mock transcript]",
        `file=${input.filename}`,
        `mime=${input.mimeType}`,
        `bytes=${input.audio.size}`,
      ].join(" "),
      language: input.language ?? null,
      provider: this.name,
      model: "mock-transcriber",
    };
  }

  async generateVisitSummary(
    input: GenerateVisitSummaryInput,
  ): Promise<GenerateVisitSummaryResult> {
    const text = compactText(contextText(input.context), 1200);
    const summary = text
      ? `Draft summary for "${input.context.visit.title}" on ${input.context.visit.visitDate}: ${text}`
      : `Draft summary for "${input.context.visit.title}" on ${input.context.visit.visitDate}.`;

    return {
      summary,
      provider: this.name,
      model: this.textModel,
    };
  }

  async generateWeeklySummary(
    input: GenerateWeeklySummaryInput,
  ): Promise<GenerateWeeklySummaryResult> {
    const text = compactText(weeklyContextText(input.context), 3000);
    const title = `Week ${input.context.weekStart} to ${input.context.weekEnd}`;
    const summary = text
      ? `Draft weekly summary for "${input.context.project.name}" (${input.context.weekStart} to ${input.context.weekEnd}): ${text}`
      : `Draft weekly summary for "${input.context.project.name}" (${input.context.weekStart} to ${input.context.weekEnd}). No reviewed text inputs were available.`;

    return {
      title,
      summary,
      provider: this.name,
      model: this.textModel,
    };
  }

  async suggestIssues(input: SuggestIssuesInput): Promise<SuggestIssuesProviderResult> {
    const text = compactText(contextText(input.context), 600);
    if (!text) {
      return { issues: [], provider: this.name, model: this.textModel };
    }

    const zone = input.context.zones[0] ?? null;
    const trade = input.context.trades[0] ?? null;
    const contractItem = input.context.contractItems[0] ?? null;

    return {
      issues: [
        {
          title: `Review ${trade?.name ?? "renovation"} follow-up`,
          description: `AI draft based on visit text: ${text}`,
          priority: "medium",
          zoneId: zone?.id ?? null,
          tradeId: trade?.id ?? null,
          contractItemId: contractItem?.id ?? null,
          costRisk: contractItem ? "Confirm whether this affects the budget line item." : null,
          scheduleRisk: "Confirm next action with the builder.",
        },
      ],
      provider: this.name,
      model: this.textModel,
    };
  }

  async suggestDecisions(input: SuggestDecisionsInput): Promise<SuggestDecisionsProviderResult> {
    const text = compactText(contextText(input.context), 600);
    if (!text) {
      return { decisions: [], provider: this.name, model: this.textModel };
    }

    const zone = input.context.zones[0] ?? null;
    const trade = input.context.trades[0] ?? null;

    return {
      decisions: [
        {
          title: `Confirm next step for ${zone?.name ?? "the visit"}`,
          description: `AI draft based on visit text: ${text}`,
          priority: "medium",
          zoneId: zone?.id ?? null,
          tradeId: trade?.id ?? null,
          deadline: null,
          options: [
            { label: "Approve proposed next step", note: null },
            { label: "Request more information", note: null },
          ],
          recommendation: "Review the visit text with the builder before approving.",
          costImpact: null,
          scheduleImpact: "May affect sequencing if no owner decision is recorded.",
        },
      ],
      provider: this.name,
      model: this.textModel,
    };
  }

  async analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalyzeDocumentProviderResult> {
    const text = compactText(documentContextText(input.context), 3000);
    const title = `Document insight: ${input.context.document.title}`;

    return {
      title,
      summary: text
        ? `Draft document insight for "${input.context.document.title}": ${text}`
        : `Draft document insight for "${input.context.document.title}". No text content was available.`,
      keyPoints: text ? [`Review text from ${input.context.document.originalFilename}.`] : [],
      suggestedActions: ["Review this AI draft before relying on it."],
      provider: this.name,
      model: this.textModel,
    };
  }
}

export interface OpenAiProviderOptions {
  apiKey: string;
  model?: string;
  transcriptionModel?: string;
  textModel?: string;
  baseUrl?: string;
}

interface OpenAiTranscriptionResponse {
  text?: unknown;
  language?: unknown;
}

interface OpenAiChatCompletionResponse {
  choices?: {
    message?: {
      content?: unknown;
      refusal?: unknown;
    };
  }[];
}

interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

const summaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 2000 },
  },
};

const weeklySummaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 180 },
    summary: { type: "string", minLength: 1, maxLength: 5000 },
  },
};

const documentInsightJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "keyPoints", "suggestedActions"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 180 },
    summary: { type: "string", minLength: 1, maxLength: 5000 },
    keyPoints: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
    suggestedActions: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
  },
};

const nullableTextJsonSchema = { type: ["string", "null"] };

const issueJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "priority",
    "zoneId",
    "tradeId",
    "contractItemId",
    "costRisk",
    "scheduleRisk",
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 220 },
    description: nullableTextJsonSchema,
    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    zoneId: nullableTextJsonSchema,
    tradeId: nullableTextJsonSchema,
    contractItemId: nullableTextJsonSchema,
    costRisk: nullableTextJsonSchema,
    scheduleRisk: nullableTextJsonSchema,
  },
};

const issuesJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["issues"],
  properties: {
    issues: {
      type: "array",
      maxItems: 10,
      items: issueJsonSchema,
    },
  },
};

const decisionOptionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "note"],
  properties: {
    label: { type: "string", minLength: 1, maxLength: 120 },
    note: nullableTextJsonSchema,
  },
};

const decisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "priority",
    "zoneId",
    "tradeId",
    "deadline",
    "options",
    "recommendation",
    "costImpact",
    "scheduleImpact",
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 220 },
    description: nullableTextJsonSchema,
    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    zoneId: nullableTextJsonSchema,
    tradeId: nullableTextJsonSchema,
    deadline: nullableTextJsonSchema,
    options: { type: "array", maxItems: 5, items: decisionOptionJsonSchema },
    recommendation: nullableTextJsonSchema,
    costImpact: nullableTextJsonSchema,
    scheduleImpact: nullableTextJsonSchema,
  },
};

const decisionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["decisions"],
  properties: {
    decisions: {
      type: "array",
      maxItems: 10,
      items: decisionJsonSchema,
    },
  },
};

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  private readonly apiKey: string;
  private readonly transcriptionModel: string;
  private readonly textModel: string;
  private readonly baseUrl: string;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.transcriptionModel =
      options.transcriptionModel ?? options.model ?? "gpt-4o-mini-transcribe";
    this.textModel = options.textModel ?? "gpt-4o-mini";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
    const formData = new FormData();
    formData.set("model", this.transcriptionModel);
    formData.set("response_format", "json");
    if (input.language) {
      formData.set("language", input.language);
    }
    formData.set("file", input.audio, input.filename);

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI transcription failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const json = (await response.json()) as OpenAiTranscriptionResponse;
    if (typeof json.text !== "string" || json.text.trim().length === 0) {
      throw new Error("OpenAI transcription response did not include transcript text.");
    }

    return {
      text: json.text.trim(),
      language: typeof json.language === "string" ? json.language : (input.language ?? null),
      provider: this.name,
      model: this.transcriptionModel,
    };
  }

  async generateVisitSummary(
    input: GenerateVisitSummaryInput,
  ): Promise<GenerateVisitSummaryResult> {
    const json = await this.requestStructuredJson(
      "visit_summary",
      summaryJsonSchema,
      "Write a concise renovation visit summary using only the supplied text fields. Do not infer from photos, file contents, or unstated facts.",
      trimVisitTextContext(input.context),
    );

    return {
      ...(json as VisitSummaryResult),
      provider: this.name,
      model: this.textModel,
    };
  }

  async suggestIssues(input: SuggestIssuesInput): Promise<SuggestIssuesProviderResult> {
    const json = await this.requestStructuredJson(
      "issue_suggestions",
      issuesJsonSchema,
      "Suggest reviewable issue drafts from the supplied renovation visit text only. Use only ids present in the context or null. Do not create contractual conclusions.",
      trimVisitTextContext(input.context),
    );

    return {
      ...(json as SuggestIssuesResult),
      provider: this.name,
      model: this.textModel,
    };
  }

  async suggestDecisions(input: SuggestDecisionsInput): Promise<SuggestDecisionsProviderResult> {
    const json = await this.requestStructuredJson(
      "decision_suggestions",
      decisionsJsonSchema,
      "Suggest reviewable pending decision drafts from the supplied renovation visit text only. Use only ids present in the context or null. Do not approve decisions for the owner.",
      trimVisitTextContext(input.context),
    );

    return {
      ...(json as SuggestDecisionsResult),
      provider: this.name,
      model: this.textModel,
    };
  }

  async generateWeeklySummary(
    input: GenerateWeeklySummaryInput,
  ): Promise<GenerateWeeklySummaryResult> {
    const json = await this.requestStructuredJson(
      "weekly_summary",
      weeklySummaryJsonSchema,
      "Write a concise renovation weekly summary using only the supplied text fields: visits, reviewed summaries, approved/open issues, pending/approved decisions, zones/trades, budget metadata and document metadata. Do not infer from photos, OCR, document file contents, image analysis, or unstated facts. Make the output a reviewable draft.",
      trimWeeklySummaryContext(input.context),
    );

    return {
      ...(json as WeeklySummaryResult),
      provider: this.name,
      model: this.textModel,
    };
  }

  async analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalyzeDocumentProviderResult> {
    const json = await this.requestStructuredJson(
      "document_insight",
      documentInsightJsonSchema,
      "Create a reviewable renovation document insight using only the supplied text content and metadata. Do not infer from photos, OCR, images, binary files, or unstated facts. Avoid legal conclusions; suggest human review actions when needed.",
      trimDocumentIntelligenceContext(input.context),
    );

    return {
      ...(json as DocumentInsightResult),
      provider: this.name,
      model: this.textModel,
    };
  }

  private async requestStructuredJson(
    name: string,
    schema: Record<string, unknown>,
    instruction: string,
    context: unknown,
  ): Promise<unknown> {
    const responseFormat: JsonSchemaResponseFormat = {
      type: "json_schema",
      json_schema: {
        name,
        strict: true,
        schema,
      },
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.textModel,
        response_format: responseFormat,
        messages: [
          {
            role: "system",
            content:
              "You extract renovation project information into strict JSON. Every output is a draft for human review.",
          },
          {
            role: "user",
            content: `${instruction}\n\nContext JSON:\n${JSON.stringify(context)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI text extraction failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const json = (await response.json()) as OpenAiChatCompletionResponse;
    const message = json.choices?.[0]?.message;
    if (message?.refusal) {
      throw new Error(`OpenAI refused text extraction: ${String(message.refusal).slice(0, 500)}`);
    }
    if (typeof message?.content !== "string" || message.content.trim().length === 0) {
      throw new Error("OpenAI text extraction response did not include JSON content.");
    }

    return JSON.parse(message.content) as unknown;
  }
}

export function createAiProviderFromEnv(env: Record<string, string | undefined>): AiProvider {
  const apiKey = env.OPENAI_API_KEY ?? env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    return new MockAiProvider();
  }

  return new OpenAiProvider({
    apiKey,
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
    textModel: env.OPENAI_TEXT_MODEL,
    baseUrl: env.OPENAI_BASE_URL,
  });
}

function trimVisitTextContext(context: VisitTextContext): VisitTextContext {
  return {
    project: context.project,
    visit: {
      ...context.visit,
      generalStatus: compactText(context.visit.generalStatus, 1000),
      humanNotes: compactText(context.visit.humanNotes, 4000),
      summary: compactText(context.visit.summary, 2000),
    },
    transcripts: context.transcripts.slice(0, 10).map((transcript) => ({
      evidenceId: transcript.evidenceId,
      text: compactText(transcript.text, 4000) ?? "",
    })),
    zones: context.zones.slice(0, 100),
    trades: context.trades.slice(0, 100),
    contractItems: context.contractItems.slice(0, 100).map((item) => ({
      ...item,
      description: compactText(item.description, 500),
      notes: compactText(item.notes, 500),
    })),
    documents: context.documents.slice(0, 100).map((document) => ({
      ...document,
      notes: compactText(document.notes, 500),
    })),
  };
}

function trimWeeklySummaryContext(context: WeeklySummaryContext): WeeklySummaryContext {
  return {
    project: context.project,
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
    visits: context.visits.slice(0, 50).map((visit) => ({
      ...visit,
      generalStatus: compactText(visit.generalStatus, 1000),
      humanNotes: compactText(visit.humanNotes, 2000),
      reviewedSummary: compactText(visit.reviewedSummary, 2000),
    })),
    issues: context.issues.slice(0, 50).map((issue) => ({
      ...issue,
      description: compactText(issue.description, 1000),
      costRisk: compactText(issue.costRisk, 500),
      scheduleRisk: compactText(issue.scheduleRisk, 500),
    })),
    decisions: context.decisions.slice(0, 50).map((decision) => ({
      ...decision,
      description: compactText(decision.description, 1000),
      recommendation: compactText(decision.recommendation, 1000),
      costImpact: compactText(decision.costImpact, 500),
      scheduleImpact: compactText(decision.scheduleImpact, 500),
    })),
    zones: context.zones.slice(0, 100),
    trades: context.trades.slice(0, 100),
    contractItems: context.contractItems.slice(0, 100).map((item) => ({
      ...item,
      description: compactText(item.description, 500),
      notes: compactText(item.notes, 500),
    })),
    documents: context.documents.slice(0, 100).map((document) => ({
      ...document,
      notes: compactText(document.notes, 500),
    })),
  };
}

function trimDocumentIntelligenceContext(
  context: DocumentIntelligenceContext,
): DocumentIntelligenceContext {
  return {
    project: context.project,
    document: {
      ...context.document,
      notes: compactText(context.document.notes, 1000),
    },
    extractedText: compactText(context.extractedText, 20000) ?? "",
    zones: context.zones.slice(0, 100),
    trades: context.trades.slice(0, 100),
    contractItems: context.contractItems.slice(0, 100).map((item) => ({
      ...item,
      description: compactText(item.description, 500),
      notes: compactText(item.notes, 500),
    })),
  };
}
