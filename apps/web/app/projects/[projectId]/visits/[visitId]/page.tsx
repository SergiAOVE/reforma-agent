import Link from "next/link";
import { notFound } from "next/navigation";

import { type VisitStatus, type VisitTextExtractionJobType } from "@reforma/core";

import { loadProjectAccess } from "../../../../../lib/project-access";
import { VISIT_EVIDENCE_BUCKET } from "../../../../../lib/storage";
import {
  DecisionInspectionPanel,
  DecisionReviewForm,
  IssueInspectionPanel,
  IssueReviewForm,
  SummaryReviewForm,
} from "../../review-ui";
import {
  deleteVisit,
  enqueueAudioTranscription,
  enqueueVisitTextExtraction,
  setVisitStatus,
  updateAudioTranscription,
} from "../actions";
import { EvidenceMetadataForm } from "./evidence-metadata-form";
import { EvidenceUploadPanel } from "./evidence-upload-panel";
import { VisitAutosaveForm } from "./visit-autosave-form";
import { VisitTabs } from "./visit-tabs";

interface VisitPageProps {
  params: Promise<{ projectId: string; visitId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EvidencePreview({
  signedUrl,
  type,
  filename,
}: {
  signedUrl: string | null;
  type: string;
  filename: string;
}) {
  if (!signedUrl) return <span className="muted">No signed link</span>;
  if (type === "photo") {
    // Signed Storage URLs are short-lived and user-scoped, so Next Image optimization is not useful here.
    return <img className="evidence-preview" src={signedUrl} alt={filename} />;
  }
  if (type === "audio") {
    return <audio controls src={signedUrl} className="media-control" />;
  }
  if (type === "video") {
    return <video controls src={signedUrl} className="media-control" />;
  }
  return (
    <a href={signedUrl} target="_blank" rel="noreferrer">
      Open file
    </a>
  );
}

function evidenceIdFromJobInput(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const value = (input as { evidenceId?: unknown }).evidenceId;
  return typeof value === "string" ? value : null;
}

const TEXT_EXTRACTION_JOBS: { type: VisitTextExtractionJobType; label: string }[] = [
  { type: "generate_visit_summary", label: "Generate summary" },
  { type: "suggest_issues", label: "Suggest issues" },
  { type: "suggest_decisions", label: "Suggest decisions" },
];

const VISIT_STATUS_ACTIONS: { status: VisitStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "archived", label: "Archived" },
];

const OPEN_ISSUE_STATUSES = ["open", "in_review", "waiting_builder", "waiting_owner"] as const;

function visitIdFromJobInput(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const value = (input as { visitId?: unknown }).visitId;
  return typeof value === "string" ? value : null;
}

function isVisitTextExtractionJobType(value: string): value is VisitTextExtractionJobType {
  return TEXT_EXTRACTION_JOBS.some((job) => job.type === value);
}

export default async function VisitPage({ params, searchParams }: VisitPageProps) {
  const { projectId, visitId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  // Visit and evidence come first: the queries below are scoped to this
  // visit's evidence ids instead of loading project-wide rows.
  const [{ data: visit }, { data: evidence }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, title, visit_date, status, general_status, summary, human_notes, primary_zone_id, primary_trade_id, published_at, updated_at, summary_source, summary_review_state",
      )
      .eq("id", visitId)
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("evidence")
      .select(
        "id, type, storage_path, original_filename, mime_type, size_bytes, zone_id, trade_id, manual_note, created_at, updated_at, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false }),
  ]);

  if (!visit) {
    notFound();
  }

  const evidenceIds = (evidence ?? []).map((item) => item.id);
  const emptyRows = Promise.resolve({ data: [] });

  const [
    { data: zones },
    { data: trades },
    { data: contractItems },
    { data: transcriptions },
    { data: transcriptionJobs },
    { data: extractionJobs },
    { data: issueDrafts },
    { data: decisionDrafts },
    { data: visitIssues },
    { data: visitDecisions },
  ] = await Promise.all([
    supabase.from("zones").select("id, name").eq("project_id", project.id).order("name"),
    supabase.from("trades").select("id, name").eq("project_id", project.id).order("name"),
    supabase
      .from("contract_items")
      .select("id, code, title")
      .eq("project_id", project.id)
      .order("title"),
    evidenceIds.length === 0
      ? emptyRows
      : supabase
          .from("audio_transcriptions")
          .select(
            "id, evidence_id, raw_transcript, edited_transcript, language, provider, model, updated_at",
          )
          .eq("project_id", project.id)
          .in("evidence_id", evidenceIds)
          .order("updated_at", { ascending: false }),
    evidenceIds.length === 0
      ? emptyRows
      : supabase
          .from("agent_jobs")
          .select("id, status, input, error_message, created_at, updated_at")
          .eq("project_id", project.id)
          .eq("type", "transcribe_audio")
          .in("input->>evidenceId", evidenceIds)
          .order("created_at", { ascending: false }),
    supabase
      .from("agent_jobs")
      .select("id, type, status, input, error_message, created_at, updated_at")
      .eq("project_id", project.id)
      .in("type", ["generate_visit_summary", "suggest_issues", "suggest_decisions"])
      .eq("input->>visitId", visitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("issues")
      .select(
        "id, visit_id, title, description, priority, status, review_state, source, zone_id, trade_id, contract_item_id, cost_risk, schedule_risk, created_at, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("visit_id", visitId)
      .eq("source", "ai")
      .in("review_state", ["ai_draft", "edited"])
      .order("created_at", { ascending: false }),
    supabase
      .from("decisions")
      .select(
        "id, visit_id, title, description, priority, status, review_state, source, zone_id, trade_id, deadline, options, recommendation, cost_impact, schedule_impact, created_at, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("visit_id", visitId)
      .eq("source", "ai")
      .in("review_state", ["ai_draft", "edited"])
      .order("created_at", { ascending: false }),
    supabase
      .from("issues")
      .select(
        "id, visit_id, title, description, priority, status, review_state, source, zone_id, trade_id, contract_item_id, cost_risk, schedule_risk, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("visit_id", visitId)
      .in("status", [...OPEN_ISSUE_STATUSES])
      .order("updated_at", { ascending: false }),
    supabase
      .from("decisions")
      .select(
        "id, visit_id, title, description, priority, status, review_state, source, zone_id, trade_id, deadline, options, recommendation, cost_impact, schedule_impact, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("visit_id", visitId)
      .eq("status", "pending")
      .order("deadline", { ascending: true, nullsFirst: false }),
  ]);

  const safeZones = zones ?? [];
  const safeTrades = trades ?? [];
  const safeContractItems = contractItems ?? [];
  const safeIssueDrafts = issueDrafts ?? [];
  const safeDecisionDrafts = decisionDrafts ?? [];
  const safeVisitIssues = visitIssues ?? [];
  const safeVisitDecisions = visitDecisions ?? [];
  const hasAiSummaryDraft =
    visit.summary_source === "ai" &&
    (visit.summary_review_state === "ai_draft" || visit.summary_review_state === "edited") &&
    Boolean(visit.summary);
  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (item) => {
      const { data } = await supabase.storage
        .from(VISIT_EVIDENCE_BUCKET)
        .createSignedUrl(item.storage_path, 600);

      return { ...item, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const transcriptionByEvidenceId = new Map(
    (transcriptions ?? []).map((transcription) => [transcription.evidence_id, transcription]),
  );
  const latestJobByEvidenceId = new Map<string, NonNullable<typeof transcriptionJobs>[number]>();
  const latestExtractionJobByType = new Map<
    VisitTextExtractionJobType,
    NonNullable<typeof extractionJobs>[number]
  >();

  for (const job of transcriptionJobs ?? []) {
    const evidenceId = evidenceIdFromJobInput(job.input);
    if (evidenceId && !latestJobByEvidenceId.has(evidenceId)) {
      latestJobByEvidenceId.set(evidenceId, job);
    }
  }
  for (const job of extractionJobs ?? []) {
    const jobVisitId = visitIdFromJobInput(job.input);
    if (
      jobVisitId === visit.id &&
      isVisitTextExtractionJobType(job.type) &&
      !latestExtractionJobByType.has(job.type)
    ) {
      latestExtractionJobByType.set(job.type, job);
    }
  }

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}/visits`}>{"<- Visits"}</Link>
      </p>
      <div className="page-title">
        <div>
          <h1>{visit.title}</h1>
          <p className="muted">{visit.visit_date}</p>
        </div>
        <div>
          <span className={`badge status-${visit.status}`}>{visit.status}</span>{" "}
          <span className={`badge role-${role}`}>{role}</span>
        </div>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can change visits and evidence.
        </p>
      ) : null}

      <VisitTabs
        details={
          <section className="card">
            <VisitAutosaveForm
              projectId={project.id}
              visit={visit}
              zones={safeZones}
              trades={safeTrades}
              canEdit={canEdit}
            />
          </section>
        }
        evidence={
          <>
            <section className="card">
              <EvidenceUploadPanel
                projectId={project.id}
                visitId={visit.id}
                zones={safeZones}
                trades={safeTrades}
                canEdit={canEdit}
              />
            </section>

            <section className="card">
              <h2>Evidence</h2>
              {evidenceWithUrls.length === 0 ? (
                <p className="muted">No evidence yet.</p>
              ) : (
                <ul className="stack-list">
                  {evidenceWithUrls.map((item) => (
                    <li key={item.id} className="stack-item">
                      {(() => {
                        const transcription = transcriptionByEvidenceId.get(item.id);
                        const transcriptionJob = latestJobByEvidenceId.get(item.id);
                        const isTranscriptionRunning =
                          transcriptionJob?.status === "pending" ||
                          transcriptionJob?.status === "processing";

                        return (
                          <>
                            <div className="split-row">
                              <div>
                                <strong>{item.original_filename}</strong>
                                <div className="muted">
                                  {item.type} | {item.mime_type} | {formatBytes(item.size_bytes)}
                                  {" | "}Last saved {formatDateTime(item.updated_at)}
                                </div>
                              </div>
                              {item.signedUrl ? (
                                <a href={item.signedUrl} target="_blank" rel="noreferrer">
                                  Open
                                </a>
                              ) : null}
                            </div>
                            <EvidencePreview
                              signedUrl={item.signedUrl}
                              type={item.type}
                              filename={item.original_filename}
                            />

                            {item.type === "audio" ? (
                              <div className="transcript-panel">
                                <div className="split-row">
                                  <strong>Transcript</strong>
                                  {transcriptionJob ? (
                                    <span className={`badge status-${transcriptionJob.status}`}>
                                      {transcriptionJob.status}
                                    </span>
                                  ) : null}
                                </div>
                                {transcription ? (
                                  <form action={updateAudioTranscription} className="compact-form">
                                    <input type="hidden" name="projectId" value={project.id} />
                                    <input type="hidden" name="visitId" value={visit.id} />
                                    <input
                                      type="hidden"
                                      name="transcriptionId"
                                      value={transcription.id}
                                    />
                                    <p className="muted">
                                      {transcription.provider ?? "unknown"} |{" "}
                                      {transcription.model ?? "unknown"}
                                      {transcription.language ? ` | ${transcription.language}` : ""}
                                    </p>
                                    <label className="field">
                                      <span>Reviewed transcript</span>
                                      <textarea
                                        name="editedTranscript"
                                        defaultValue={
                                          transcription.edited_transcript ??
                                          transcription.raw_transcript
                                        }
                                        rows={5}
                                        disabled={!canEdit}
                                      />
                                    </label>
                                    <button type="submit" disabled={!canEdit}>
                                      Save transcript
                                    </button>
                                  </form>
                                ) : (
                                  <>
                                    {transcriptionJob?.error_message ? (
                                      <p className="notice error">
                                        {transcriptionJob.error_message}
                                      </p>
                                    ) : null}
                                    {canEdit ? (
                                      <form action={enqueueAudioTranscription}>
                                        <input type="hidden" name="projectId" value={project.id} />
                                        <input type="hidden" name="visitId" value={visit.id} />
                                        <input type="hidden" name="evidenceId" value={item.id} />
                                        <button type="submit" disabled={isTranscriptionRunning}>
                                          {isTranscriptionRunning
                                            ? "Transcription queued"
                                            : "Transcribe audio"}
                                        </button>
                                      </form>
                                    ) : (
                                      <p className="muted">No transcript yet.</p>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : null}

                            <EvidenceMetadataForm
                              projectId={project.id}
                              visitId={visit.id}
                              evidence={item}
                              zones={safeZones}
                              trades={safeTrades}
                              canEdit={canEdit}
                            />
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        }
        review={
          <>
            <section className="card">
              <h2>Visit status</h2>
              {canEdit ? (
                <>
                  <div className="status-action-row" aria-label="Visit status">
                    {VISIT_STATUS_ACTIONS.map((action) => {
                      const isCurrent = visit.status === action.status;

                      return (
                        <form key={action.status} action={setVisitStatus}>
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="visitId" value={visit.id} />
                          <input type="hidden" name="status" value={action.status} />
                          <button
                            type="submit"
                            className={
                              isCurrent ? "status-action active" : "status-action secondary"
                            }
                            disabled={isCurrent}
                            aria-pressed={isCurrent}
                          >
                            {action.label}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                  <div className="danger-zone">
                    <form action={deleteVisit}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="visitId" value={visit.id} />
                      <button type="submit" className="danger">
                        Delete visit
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <p className="muted">You can view this visit but cannot change its status.</p>
              )}
            </section>

            <section className="card">
              <h2>Text extraction</h2>
              <div className="button-row">
                {TEXT_EXTRACTION_JOBS.map((definition) => {
                  const job = latestExtractionJobByType.get(definition.type);
                  const isRunning = job?.status === "pending" || job?.status === "processing";

                  return (
                    <form key={definition.type} action={enqueueVisitTextExtraction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="visitId" value={visit.id} />
                      <input type="hidden" name="jobType" value={definition.type} />
                      <button type="submit" className="secondary" disabled={!canEdit || isRunning}>
                        {isRunning ? `${definition.label} queued` : definition.label}
                      </button>
                      {job ? (
                        <span className={`badge status-${job.status}`}>{job.status}</span>
                      ) : null}
                    </form>
                  );
                })}
              </div>
              {TEXT_EXTRACTION_JOBS.map((definition) => {
                const job = latestExtractionJobByType.get(definition.type);
                return job?.error_message ? (
                  <p key={definition.type} className="notice error">
                    {definition.label}: {job.error_message}
                  </p>
                ) : null;
              })}
            </section>

            <div className="grid two">
              <section className="card" id="visit-open-issues">
                <h2>Open issues</h2>
                {safeVisitIssues.length === 0 ? (
                  <p className="muted">No open issues for this visit.</p>
                ) : (
                  <ul className="stack-list compact-stack-list">
                    {safeVisitIssues.map((issue) => (
                      <li key={issue.id} className="stack-item">
                        <IssueInspectionPanel
                          projectId={project.id}
                          issue={issue}
                          visit={visit}
                          zones={safeZones}
                          trades={safeTrades}
                          contractItems={safeContractItems}
                          canEdit={canEdit}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" id="visit-pending-decisions">
                <h2>Pending decisions</h2>
                {safeVisitDecisions.length === 0 ? (
                  <p className="muted">No pending decisions for this visit.</p>
                ) : (
                  <ul className="stack-list compact-stack-list">
                    {safeVisitDecisions.map((decision) => (
                      <li key={decision.id} className="stack-item">
                        <DecisionInspectionPanel
                          projectId={project.id}
                          decision={decision}
                          zones={safeZones}
                          trades={safeTrades}
                          canEdit={canEdit}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="card">
              <h2>AI drafts</h2>
              {!hasAiSummaryDraft &&
              safeIssueDrafts.length === 0 &&
              safeDecisionDrafts.length === 0 ? (
                <p className="muted">No AI drafts yet.</p>
              ) : null}

              {hasAiSummaryDraft ? (
                <>
                  <h3>Summary</h3>
                  <SummaryReviewForm
                    projectId={project.id}
                    visit={visit}
                    canEdit={canEdit}
                    returnTo="visit"
                  />
                </>
              ) : null}

              {safeIssueDrafts.length > 0 ? (
                <>
                  <h3>Issues</h3>
                  <ul className="stack-list">
                    {safeIssueDrafts.map((issue) => (
                      <li key={issue.id} className="stack-item">
                        <IssueReviewForm
                          projectId={project.id}
                          issue={issue}
                          zones={safeZones}
                          trades={safeTrades}
                          contractItems={safeContractItems}
                          canEdit={canEdit}
                          returnTo="visit"
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {safeDecisionDrafts.length > 0 ? (
                <>
                  <h3>Decisions</h3>
                  <ul className="stack-list">
                    {safeDecisionDrafts.map((decision) => (
                      <li key={decision.id} className="stack-item">
                        <DecisionReviewForm
                          projectId={project.id}
                          decision={decision}
                          zones={safeZones}
                          trades={safeTrades}
                          canEdit={canEdit}
                          returnTo="visit"
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          </>
        }
      />
    </>
  );
}
