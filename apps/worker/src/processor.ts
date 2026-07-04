import type {
  AiProvider,
  DocumentIntelligenceContext,
  VisitTextContext,
  WeeklySummaryContext,
} from "@reforma/ai";
import {
  analyzeDocumentJobInputSchema,
  analyzeDocumentJobOutputSchema,
  documentInsightResultSchema,
  isSupportedDocumentIntelligenceMimeType,
  suggestDecisionsJobOutputSchema,
  suggestDecisionsResultSchema,
  suggestIssuesJobOutputSchema,
  suggestIssuesResultSchema,
  type SuggestedDecision,
  type SuggestedIssue,
  transcribeAudioJobInputSchema,
  transcribeAudioJobOutputSchema,
  type VisitTextExtractionJobInput,
  type WeeklySummaryJobInput,
  weeklySummaryJobInputSchema,
  weeklySummaryJobOutputSchema,
  weeklySummaryResultSchema,
  visitSummaryJobOutputSchema,
  visitSummaryResultSchema,
  visitTextExtractionJobInputSchema,
} from "@reforma/core";
import type { Database, Json, SupabaseClient, Tables } from "@reforma/db";

import { log } from "./logger";

const PROJECT_DOCUMENTS_BUCKET = "project-documents";
const VISIT_EVIDENCE_BUCKET = "visit-evidence";
const DOCUMENT_INTELLIGENCE_TEXT_LIMIT = 20_000;
export const SUPPORTED_JOB_TYPES = [
  "transcribe_audio",
  "generate_visit_summary",
  "suggest_issues",
  "suggest_decisions",
  "generate_weekly_summary",
  "analyze_document",
] as const;

const OPEN_ISSUE_STATUSES = new Set(["open", "in_review", "waiting_builder", "waiting_owner"]);
const REVIEWED_SUMMARY_STATES = new Set(["approved", "edited", "human_created"]);
const REVIEWED_AI_STATES = new Set(["approved", "edited", "human_created"]);
const WEEKLY_DECISION_STATUSES = new Set(["pending", "approved"]);

type WorkerSupabaseClient = SupabaseClient<Database>;
type AgentJob = Tables<"agent_jobs">;
type IssueInsert = Database["public"]["Tables"]["issues"]["Insert"];
type DecisionInsert = Database["public"]["Tables"]["decisions"]["Insert"];
type WeeklySummaryInsert = Database["public"]["Tables"]["weekly_summaries"]["Insert"];
type DocumentInsightInsert = Database["public"]["Tables"]["document_insights"]["Insert"];
type EvidenceRow = Pick<
  Tables<"evidence">,
  "id" | "project_id" | "type" | "storage_path" | "original_filename" | "mime_type"
>;
type DocumentIntelligenceDocumentRow = Pick<
  Tables<"documents">,
  | "id"
  | "project_id"
  | "type"
  | "title"
  | "notes"
  | "storage_path"
  | "original_filename"
  | "mime_type"
>;
type AudioTranscriptionRow = Pick<
  Tables<"audio_transcriptions">,
  "id" | "project_id" | "evidence_id" | "raw_transcript" | "language" | "provider" | "model"
>;
type TextTranscriptionRow = Pick<
  Tables<"audio_transcriptions">,
  "evidence_id" | "raw_transcript" | "edited_transcript"
>;
type VisitRow = Pick<
  Tables<"visits">,
  "id" | "project_id" | "title" | "visit_date" | "general_status" | "human_notes" | "summary"
>;
type WeeklyVisitRow = Pick<
  Tables<"visits">,
  | "id"
  | "project_id"
  | "title"
  | "visit_date"
  | "status"
  | "general_status"
  | "human_notes"
  | "summary"
  | "summary_source"
  | "summary_review_state"
>;
type ProjectRow = Pick<Tables<"projects">, "id" | "name" | "address_label">;
type ZoneRow = Pick<Tables<"zones">, "id" | "name" | "description">;
type TradeRow = Pick<Tables<"trades">, "id" | "name" | "description">;
type ContractItemRow = Pick<
  Tables<"contract_items">,
  | "id"
  | "code"
  | "title"
  | "description"
  | "trade_id"
  | "zone_id"
  | "total_amount"
  | "status"
  | "notes"
>;
type DocumentRow = Pick<
  Tables<"documents">,
  "id" | "type" | "title" | "notes" | "original_filename"
>;
type JoinedName = { name: string } | null;
type WeeklyIssueRow = Pick<
  Tables<"issues">,
  | "id"
  | "title"
  | "description"
  | "priority"
  | "status"
  | "review_state"
  | "cost_risk"
  | "schedule_risk"
> & {
  zones?: JoinedName;
  trades?: JoinedName;
};
type WeeklyDecisionRow = Pick<
  Tables<"decisions">,
  | "id"
  | "title"
  | "description"
  | "priority"
  | "status"
  | "deadline"
  | "review_state"
  | "recommendation"
  | "cost_impact"
  | "schedule_impact"
> & {
  zones?: JoinedName;
  trades?: JoinedName;
};

export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 1000);
}

export function shouldRetryJob(job: AgentJob, error: unknown): boolean {
  if (error instanceof PermanentJobError) return false;
  return job.attempt_count < job.max_attempts;
}

export async function claimNextJob(
  supabase: WorkerSupabaseClient,
  workerId: string,
  staleAfterSeconds: number,
): Promise<AgentJob | null> {
  const { data, error } = await supabase.rpc("claim_agent_job", {
    p_worker_id: workerId,
    p_allowed_types: [...SUPPORTED_JOB_TYPES],
    p_stale_after_seconds: staleAfterSeconds,
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function processJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  workerId: string,
  job: AgentJob,
): Promise<void> {
  try {
    const output = await processSupportedJob(supabase, provider, job);
    await completeJob(supabase, job, output);
    log("job completed", {
      jobId: job.id,
      projectId: job.project_id,
      workerId,
      status: "completed",
      attempt: job.attempt_count,
    });
  } catch (error) {
    await failJob(supabase, job, error);
    log("job failed", {
      jobId: job.id,
      projectId: job.project_id,
      workerId,
      status: shouldRetryJob(job, error) ? "pending" : "failed",
      attempt: job.attempt_count,
      error: safeErrorMessage(error),
    });
  }
}

async function processSupportedJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  switch (job.type) {
    case "transcribe_audio":
      return processTranscribeAudioJob(supabase, provider, job);
    case "generate_visit_summary":
      return processGenerateVisitSummaryJob(supabase, provider, job);
    case "suggest_issues":
      return processSuggestIssuesJob(supabase, provider, job);
    case "suggest_decisions":
      return processSuggestDecisionsJob(supabase, provider, job);
    case "generate_weekly_summary":
      return processGenerateWeeklySummaryJob(supabase, provider, job);
    case "analyze_document":
      return processAnalyzeDocumentJob(supabase, provider, job);
    default:
      throw new PermanentJobError(`Unsupported job type: ${job.type}.`);
  }
}

async function processTranscribeAudioJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const input = transcribeAudioJobInputSchema.safeParse(job.input);
  if (!input.success) {
    throw new PermanentJobError(input.error.issues[0]?.message ?? "Invalid transcribe job input.");
  }

  const evidence = await loadAudioEvidence(supabase, job.project_id, input.data.evidenceId);
  const existing = await loadExistingTranscription(supabase, evidence.id);

  if (existing) {
    return transcribeAudioJobOutputSchema.parse({
      evidenceId: existing.evidence_id,
      transcriptionId: existing.id,
      provider: existing.provider ?? "unknown",
      model: existing.model ?? "unknown",
      language: existing.language,
    }) as Json;
  }

  const { data: audio, error: downloadError } = await supabase.storage
    .from(VISIT_EVIDENCE_BUCKET)
    .download(evidence.storage_path);

  if (downloadError) {
    throw downloadError;
  }
  if (!audio) {
    throw new Error("Storage download returned no audio data.");
  }

  const result = await provider.transcribeAudio({
    audio,
    filename: evidence.original_filename,
    mimeType: evidence.mime_type,
    language: input.data.language,
  });

  const transcription = await insertTranscription(supabase, job, evidence, result);

  return transcribeAudioJobOutputSchema.parse({
    evidenceId: evidence.id,
    transcriptionId: transcription.id,
    provider: transcription.provider ?? result.provider,
    model: transcription.model ?? result.model,
    language: transcription.language,
  }) as Json;
}

async function processGenerateVisitSummaryJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const { context, input } = await loadVisitTextContext(supabase, job);
  const result = await provider.generateVisitSummary({ context });
  const parsed = visitSummaryResultSchema.safeParse(result);

  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid visit summary AI output.",
    );
  }

  const { error } = await supabase
    .from("visits")
    .update({
      summary: parsed.data.summary,
      summary_source: "ai",
      summary_review_state: "ai_draft",
      summary_created_by_job_id: job.id,
      summary_reviewed_at: null,
      summary_reviewed_by: null,
    })
    .eq("id", input.visitId)
    .eq("project_id", job.project_id);

  if (error) {
    throw error;
  }

  return visitSummaryJobOutputSchema.parse({
    visitId: input.visitId,
    summary: parsed.data.summary,
    provider: result.provider,
    model: result.model,
  }) as Json;
}

async function processSuggestIssuesJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const { context, input } = await loadVisitTextContext(supabase, job);
  const result = await provider.suggestIssues({ context });
  const parsed = suggestIssuesResultSchema.safeParse(result);

  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid issue suggestion AI output.",
    );
  }

  for (const issue of parsed.data.issues) {
    assertIssueReferences(context, issue);
  }

  await deleteExistingJobIssues(supabase, job);

  const rows: IssueInsert[] = parsed.data.issues.map((issue) => ({
    project_id: job.project_id,
    visit_id: input.visitId,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    status: "ai_draft",
    review_state: "ai_draft",
    source: "ai",
    created_by_job_id: job.id,
    zone_id: issue.zoneId,
    trade_id: issue.tradeId,
    contract_item_id: issue.contractItemId,
    cost_risk: issue.costRisk,
    schedule_risk: issue.scheduleRisk,
  }));

  const issueIds = rows.length > 0 ? await insertIssueDrafts(supabase, rows) : [];

  return suggestIssuesJobOutputSchema.parse({
    visitId: input.visitId,
    issueIds,
    provider: result.provider,
    model: result.model,
  }) as Json;
}

async function processSuggestDecisionsJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const { context, input } = await loadVisitTextContext(supabase, job);
  const result = await provider.suggestDecisions({ context });
  const parsed = suggestDecisionsResultSchema.safeParse(result);

  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid decision suggestion AI output.",
    );
  }

  for (const decision of parsed.data.decisions) {
    assertDecisionReferences(context, decision);
  }

  await deleteExistingJobDecisions(supabase, job);

  const rows: DecisionInsert[] = parsed.data.decisions.map((decision) => ({
    project_id: job.project_id,
    visit_id: input.visitId,
    title: decision.title,
    description: decision.description,
    priority: decision.priority,
    status: "ai_draft",
    review_state: "ai_draft",
    source: "ai",
    created_by_job_id: job.id,
    zone_id: decision.zoneId,
    trade_id: decision.tradeId,
    deadline: decision.deadline,
    options: decision.options as Json,
    recommendation: decision.recommendation,
    cost_impact: decision.costImpact,
    schedule_impact: decision.scheduleImpact,
  }));

  const decisionIds = rows.length > 0 ? await insertDecisionDrafts(supabase, rows) : [];

  return suggestDecisionsJobOutputSchema.parse({
    visitId: input.visitId,
    decisionIds,
    provider: result.provider,
    model: result.model,
  }) as Json;
}

async function processGenerateWeeklySummaryJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const { context, input } = await loadWeeklySummaryContext(supabase, job);
  const result = await provider.generateWeeklySummary({ context });
  const parsed = weeklySummaryResultSchema.safeParse(result);

  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid weekly summary AI output.",
    );
  }

  await deleteExistingJobWeeklySummary(supabase, job);
  const weeklySummaryId = await insertWeeklySummaryDraft(supabase, {
    project_id: job.project_id,
    week_start: input.weekStart,
    week_end: input.weekEnd,
    title: parsed.data.title,
    summary: parsed.data.summary,
    review_state: "ai_draft",
    source: "ai",
    created_by: job.created_by,
    created_by_job_id: job.id,
  });

  return weeklySummaryJobOutputSchema.parse({
    weeklySummaryId,
    projectId: job.project_id,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    provider: result.provider,
    model: result.model,
  }) as Json;
}

async function processAnalyzeDocumentJob(
  supabase: WorkerSupabaseClient,
  provider: AiProvider,
  job: AgentJob,
): Promise<Json> {
  const { context, input } = await loadDocumentIntelligenceContext(supabase, job);
  const result = await provider.analyzeDocument({ context });
  const parsed = documentInsightResultSchema.safeParse(result);

  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid document insight AI output.",
    );
  }

  await deleteExistingJobDocumentInsight(supabase, job);
  const documentInsightId = await insertDocumentInsightDraft(supabase, {
    project_id: job.project_id,
    document_id: input.documentId,
    title: parsed.data.title,
    summary: parsed.data.summary,
    key_points: parsed.data.keyPoints as Json,
    suggested_actions: parsed.data.suggestedActions as Json,
    review_state: "ai_draft",
    source: "ai",
    created_by: job.created_by,
    created_by_job_id: job.id,
  });

  return analyzeDocumentJobOutputSchema.parse({
    documentInsightId,
    documentId: input.documentId,
    projectId: job.project_id,
    provider: result.provider,
    model: result.model,
  }) as Json;
}

async function loadAudioEvidence(
  supabase: WorkerSupabaseClient,
  projectId: string,
  evidenceId: string,
): Promise<EvidenceRow> {
  const { data, error } = await supabase
    .from("evidence")
    .select("id, project_id, type, storage_path, original_filename, mime_type")
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new PermanentJobError("Evidence not found for this project.");
  }
  if (data.type !== "audio" || !data.mime_type.startsWith("audio/")) {
    throw new PermanentJobError("Transcription jobs only accept audio evidence.");
  }

  return data;
}

async function loadExistingTranscription(
  supabase: WorkerSupabaseClient,
  evidenceId: string,
): Promise<AudioTranscriptionRow | null> {
  const { data, error } = await supabase
    .from("audio_transcriptions")
    .select("id, project_id, evidence_id, raw_transcript, language, provider, model")
    .eq("evidence_id", evidenceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function insertTranscription(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
  evidence: EvidenceRow,
  result: {
    text: string;
    language: string | null;
    provider: string;
    model: string;
  },
): Promise<AudioTranscriptionRow> {
  const { data, error } = await supabase
    .from("audio_transcriptions")
    .insert({
      project_id: job.project_id,
      evidence_id: evidence.id,
      raw_transcript: result.text,
      edited_transcript: result.text,
      language: result.language,
      provider: result.provider,
      model: result.model,
      created_by_job_id: job.id,
    })
    .select("id, project_id, evidence_id, raw_transcript, language, provider, model")
    .single();

  if (!error && data) {
    return data;
  }

  if (error?.code === "23505") {
    const existing = await loadExistingTranscription(supabase, evidence.id);
    if (existing) return existing;
  }

  throw error ?? new Error("Transcription insert failed.");
}

async function loadVisitTextContext(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<{ input: VisitTextExtractionJobInput; context: VisitTextContext }> {
  const parsed = visitTextExtractionJobInputSchema.safeParse(job.input);
  if (!parsed.success) {
    throw new PermanentJobError(parsed.error.issues[0]?.message ?? "Invalid visit job input.");
  }

  const input = parsed.data;
  const { data: visitData, error: visitError } = await supabase
    .from("visits")
    .select("id, project_id, title, visit_date, general_status, human_notes, summary")
    .eq("id", input.visitId)
    .eq("project_id", job.project_id)
    .maybeSingle();

  if (visitError) {
    throw visitError;
  }
  if (!visitData) {
    throw new PermanentJobError("Visit not found for this project.");
  }

  const visit = visitData as VisitRow;
  const [
    projectResult,
    zonesResult,
    tradesResult,
    contractItemsResult,
    documentsResult,
    audioEvidenceResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address_label")
      .eq("id", job.project_id)
      .maybeSingle(),
    supabase
      .from("zones")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("trades")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("contract_items")
      .select("id, code, title, description, trade_id, zone_id, total_amount, status, notes")
      .eq("project_id", job.project_id)
      .order("created_at")
      .limit(100),
    supabase
      .from("documents")
      .select("id, type, title, notes, original_filename")
      .eq("project_id", job.project_id)
      .order("created_at")
      .limit(100),
    supabase
      .from("evidence")
      .select("id")
      .eq("project_id", job.project_id)
      .eq("visit_id", visit.id)
      .eq("type", "audio"),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (zonesResult.error) throw zonesResult.error;
  if (tradesResult.error) throw tradesResult.error;
  if (contractItemsResult.error) throw contractItemsResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (audioEvidenceResult.error) throw audioEvidenceResult.error;
  if (!projectResult.data) {
    throw new PermanentJobError("Project not found for text extraction job.");
  }

  const audioEvidenceIds = (audioEvidenceResult.data ?? []).map((item) => item.id);
  const transcripts = await loadVisitTranscripts(supabase, job.project_id, audioEvidenceIds);
  const project = projectResult.data as ProjectRow;
  const zones = (zonesResult.data ?? []) as ZoneRow[];
  const trades = (tradesResult.data ?? []) as TradeRow[];
  const contractItems = (contractItemsResult.data ?? []) as ContractItemRow[];
  const documents = (documentsResult.data ?? []) as DocumentRow[];

  return {
    input,
    context: {
      project: {
        id: project.id,
        name: project.name,
        addressLabel: project.address_label,
      },
      visit: {
        id: visit.id,
        title: visit.title,
        visitDate: visit.visit_date,
        generalStatus: visit.general_status,
        humanNotes: visit.human_notes,
        summary: visit.summary,
      },
      transcripts,
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
      })),
      trades: trades.map((trade) => ({
        id: trade.id,
        name: trade.name,
        description: trade.description,
      })),
      contractItems: contractItems.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description,
        tradeId: item.trade_id,
        zoneId: item.zone_id,
        totalAmount: item.total_amount,
        status: item.status,
        notes: item.notes,
      })),
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        notes: document.notes,
        originalFilename: document.original_filename,
      })),
    },
  };
}

async function loadVisitTranscripts(
  supabase: WorkerSupabaseClient,
  projectId: string,
  evidenceIds: string[],
): Promise<VisitTextContext["transcripts"]> {
  if (evidenceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("audio_transcriptions")
    .select("evidence_id, raw_transcript, edited_transcript")
    .eq("project_id", projectId)
    .in("evidence_id", evidenceIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as TextTranscriptionRow[])
    .map((transcription) => ({
      evidenceId: transcription.evidence_id,
      text: (transcription.edited_transcript ?? transcription.raw_transcript).trim(),
    }))
    .filter((transcription) => transcription.text.length > 0);
}

async function loadWeeklySummaryContext(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<{ input: WeeklySummaryJobInput; context: WeeklySummaryContext }> {
  const parsed = weeklySummaryJobInputSchema.safeParse(job.input);
  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid weekly summary job input.",
    );
  }

  const input = parsed.data;
  const [
    projectResult,
    visitsResult,
    zonesResult,
    tradesResult,
    contractItemsResult,
    documentsResult,
    issuesResult,
    decisionsResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address_label")
      .eq("id", job.project_id)
      .maybeSingle(),
    supabase
      .from("visits")
      .select(
        "id, project_id, title, visit_date, status, general_status, human_notes, summary, summary_source, summary_review_state",
      )
      .eq("project_id", job.project_id)
      .gte("visit_date", input.weekStart)
      .lte("visit_date", input.weekEnd)
      .order("visit_date")
      .limit(50),
    supabase
      .from("zones")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("trades")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("contract_items")
      .select("id, code, title, description, trade_id, zone_id, total_amount, status, notes")
      .eq("project_id", job.project_id)
      .order("created_at")
      .limit(100),
    supabase
      .from("documents")
      .select("id, type, title, notes, original_filename")
      .eq("project_id", job.project_id)
      .order("created_at")
      .limit(100),
    supabase
      .from("issues")
      .select(
        "id, title, description, priority, status, review_state, cost_risk, schedule_risk, zones(name), trades(name)",
      )
      .eq("project_id", job.project_id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("decisions")
      .select(
        "id, title, description, priority, status, deadline, review_state, recommendation, cost_impact, schedule_impact, zones(name), trades(name)",
      )
      .eq("project_id", job.project_id)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (visitsResult.error) throw visitsResult.error;
  if (zonesResult.error) throw zonesResult.error;
  if (tradesResult.error) throw tradesResult.error;
  if (contractItemsResult.error) throw contractItemsResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (issuesResult.error) throw issuesResult.error;
  if (decisionsResult.error) throw decisionsResult.error;
  if (!projectResult.data) {
    throw new PermanentJobError("Project not found for weekly summary job.");
  }

  const project = projectResult.data as ProjectRow;
  const visits = (visitsResult.data ?? []) as WeeklyVisitRow[];
  const zones = (zonesResult.data ?? []) as ZoneRow[];
  const trades = (tradesResult.data ?? []) as TradeRow[];
  const contractItems = (contractItemsResult.data ?? []) as ContractItemRow[];
  const documents = (documentsResult.data ?? []) as DocumentRow[];
  const issues = ((issuesResult.data ?? []) as WeeklyIssueRow[]).filter(
    (issue) => OPEN_ISSUE_STATUSES.has(issue.status) && REVIEWED_AI_STATES.has(issue.review_state),
  );
  const decisions = ((decisionsResult.data ?? []) as WeeklyDecisionRow[]).filter(
    (decision) =>
      WEEKLY_DECISION_STATUSES.has(decision.status) &&
      REVIEWED_AI_STATES.has(decision.review_state),
  );

  return {
    input,
    context: {
      project: {
        id: project.id,
        name: project.name,
        addressLabel: project.address_label,
      },
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      visits: visits.map((visit) => ({
        id: visit.id,
        title: visit.title,
        visitDate: visit.visit_date,
        status: visit.status,
        generalStatus: visit.general_status,
        humanNotes: visit.human_notes,
        reviewedSummary:
          visit.summary && REVIEWED_SUMMARY_STATES.has(visit.summary_review_state)
            ? visit.summary
            : null,
      })),
      issues: issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        reviewState: issue.review_state,
        zoneName: issue.zones?.name ?? null,
        tradeName: issue.trades?.name ?? null,
        costRisk: issue.cost_risk,
        scheduleRisk: issue.schedule_risk,
      })),
      decisions: decisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        description: decision.description,
        priority: decision.priority,
        status: decision.status,
        deadline: decision.deadline,
        reviewState: decision.review_state,
        zoneName: decision.zones?.name ?? null,
        tradeName: decision.trades?.name ?? null,
        recommendation: decision.recommendation,
        costImpact: decision.cost_impact,
        scheduleImpact: decision.schedule_impact,
      })),
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
      })),
      trades: trades.map((trade) => ({
        id: trade.id,
        name: trade.name,
        description: trade.description,
      })),
      contractItems: contractItems.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description,
        tradeId: item.trade_id,
        zoneId: item.zone_id,
        totalAmount: item.total_amount,
        status: item.status,
        notes: item.notes,
      })),
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        notes: document.notes,
        originalFilename: document.original_filename,
      })),
    },
  };
}

async function loadDocumentIntelligenceContext(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<{ input: { documentId: string }; context: DocumentIntelligenceContext }> {
  const parsed = analyzeDocumentJobInputSchema.safeParse(job.input);
  if (!parsed.success) {
    throw new PermanentJobError(
      parsed.error.issues[0]?.message ?? "Invalid document intelligence job input.",
    );
  }

  const input = parsed.data;
  const { data: documentData, error: documentError } = await supabase
    .from("documents")
    .select("id, project_id, type, title, notes, storage_path, original_filename, mime_type")
    .eq("id", input.documentId)
    .eq("project_id", job.project_id)
    .maybeSingle();

  if (documentError) {
    throw documentError;
  }
  if (!documentData) {
    throw new PermanentJobError("Document not found for this project.");
  }

  const document = documentData as DocumentIntelligenceDocumentRow;
  assertDocumentIntelligenceSupported(document.mime_type);

  const { data: documentBlob, error: downloadError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .download(document.storage_path);

  if (downloadError) {
    throw downloadError;
  }
  if (!documentBlob) {
    throw new Error("Storage download returned no document data.");
  }

  const extractedText = normalizeExtractedDocumentText(await documentBlob.text());
  if (extractedText.length === 0) {
    throw new PermanentJobError("Document intelligence requires non-empty text content.");
  }

  const [projectResult, zonesResult, tradesResult, contractItemsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address_label")
      .eq("id", job.project_id)
      .maybeSingle(),
    supabase
      .from("zones")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("trades")
      .select("id, name, description")
      .eq("project_id", job.project_id)
      .order("sort_order"),
    supabase
      .from("contract_items")
      .select("id, code, title, description, trade_id, zone_id, total_amount, status, notes")
      .eq("project_id", job.project_id)
      .order("created_at")
      .limit(100),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (zonesResult.error) throw zonesResult.error;
  if (tradesResult.error) throw tradesResult.error;
  if (contractItemsResult.error) throw contractItemsResult.error;
  if (!projectResult.data) {
    throw new PermanentJobError("Project not found for document intelligence job.");
  }

  const project = projectResult.data as ProjectRow;
  const zones = (zonesResult.data ?? []) as ZoneRow[];
  const trades = (tradesResult.data ?? []) as TradeRow[];
  const contractItems = (contractItemsResult.data ?? []) as ContractItemRow[];

  return {
    input,
    context: {
      project: {
        id: project.id,
        name: project.name,
        addressLabel: project.address_label,
      },
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        notes: document.notes,
        originalFilename: document.original_filename,
        mimeType: document.mime_type,
      },
      extractedText,
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
      })),
      trades: trades.map((trade) => ({
        id: trade.id,
        name: trade.name,
        description: trade.description,
      })),
      contractItems: contractItems.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description,
        tradeId: item.trade_id,
        zoneId: item.zone_id,
        totalAmount: item.total_amount,
        status: item.status,
        notes: item.notes,
      })),
    },
  };
}

function assertDocumentIntelligenceSupported(mimeType: string): void {
  if (mimeType.startsWith("image/")) {
    throw new PermanentJobError("Document intelligence does not analyze images or photos.");
  }

  if (!isSupportedDocumentIntelligenceMimeType(mimeType)) {
    throw new PermanentJobError(
      "Phase 12 document intelligence only accepts text-like documents. PDF, Office and binary files require a later parser/OCR phase.",
    );
  }
}

function normalizeExtractedDocumentText(text: string): string {
  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized.length > DOCUMENT_INTELLIGENCE_TEXT_LIMIT
    ? normalized.slice(0, DOCUMENT_INTELLIGENCE_TEXT_LIMIT)
    : normalized;
}

function assertIssueReferences(context: VisitTextContext, issue: SuggestedIssue): void {
  const zoneIds = new Set(context.zones.map((zone) => zone.id));
  const tradeIds = new Set(context.trades.map((trade) => trade.id));
  const contractItemIds = new Set(context.contractItems.map((item) => item.id));

  assertKnownReference(issue.zoneId, zoneIds, "zone");
  assertKnownReference(issue.tradeId, tradeIds, "trade");
  assertKnownReference(issue.contractItemId, contractItemIds, "contract item");
}

function assertDecisionReferences(context: VisitTextContext, decision: SuggestedDecision): void {
  const zoneIds = new Set(context.zones.map((zone) => zone.id));
  const tradeIds = new Set(context.trades.map((trade) => trade.id));

  assertKnownReference(decision.zoneId, zoneIds, "zone");
  assertKnownReference(decision.tradeId, tradeIds, "trade");
}

function assertKnownReference(value: string | null, allowedIds: Set<string>, label: string): void {
  if (value && !allowedIds.has(value)) {
    throw new PermanentJobError(`AI output referenced an unknown ${label}: ${value}.`);
  }
}

async function deleteExistingJobIssues(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<void> {
  const { error } = await supabase
    .from("issues")
    .delete()
    .eq("project_id", job.project_id)
    .eq("created_by_job_id", job.id);

  if (error) {
    throw error;
  }
}

async function deleteExistingJobDecisions(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<void> {
  const { error } = await supabase
    .from("decisions")
    .delete()
    .eq("project_id", job.project_id)
    .eq("created_by_job_id", job.id);

  if (error) {
    throw error;
  }
}

async function deleteExistingJobWeeklySummary(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_summaries")
    .delete()
    .eq("project_id", job.project_id)
    .eq("created_by_job_id", job.id);

  if (error) {
    throw error;
  }
}

async function deleteExistingJobDocumentInsight(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
): Promise<void> {
  const { error } = await supabase
    .from("document_insights")
    .delete()
    .eq("project_id", job.project_id)
    .eq("created_by_job_id", job.id);

  if (error) {
    throw error;
  }
}

async function insertIssueDrafts(
  supabase: WorkerSupabaseClient,
  rows: IssueInsert[],
): Promise<string[]> {
  const { data, error } = await supabase.from("issues").insert(rows).select("id");

  if (error) {
    throw error;
  }

  return (data ?? []).map((issue) => issue.id);
}

async function insertDecisionDrafts(
  supabase: WorkerSupabaseClient,
  rows: DecisionInsert[],
): Promise<string[]> {
  const { data, error } = await supabase.from("decisions").insert(rows).select("id");

  if (error) {
    throw error;
  }

  return (data ?? []).map((decision) => decision.id);
}

async function insertWeeklySummaryDraft(
  supabase: WorkerSupabaseClient,
  row: WeeklySummaryInsert,
): Promise<string> {
  const { data, error } = await supabase.from("weekly_summaries").insert(row).select("id").single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function insertDocumentInsightDraft(
  supabase: WorkerSupabaseClient,
  row: DocumentInsightInsert,
): Promise<string> {
  const { data, error } = await supabase
    .from("document_insights")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function completeJob(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
  output: Json,
): Promise<void> {
  const { error } = await supabase
    .from("agent_jobs")
    .update({
      status: "completed",
      output,
      error_message: null,
      locked_at: null,
      locked_by: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (error) {
    throw error;
  }
}

async function failJob(
  supabase: WorkerSupabaseClient,
  job: AgentJob,
  error: unknown,
): Promise<void> {
  const retry = shouldRetryJob(job, error);
  const { error: updateError } = await supabase
    .from("agent_jobs")
    .update({
      status: retry ? "pending" : "failed",
      error_message: safeErrorMessage(error),
      locked_at: null,
      locked_by: null,
      completed_at: retry ? null : new Date().toISOString(),
    })
    .eq("id", job.id);

  if (updateError) {
    throw updateError;
  }
}
