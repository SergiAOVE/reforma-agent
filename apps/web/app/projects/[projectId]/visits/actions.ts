"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  audioTranscriptionEditSchema,
  evidenceMetadataSchema,
  evidenceMimeTypeMatchesType,
  transcribeAudioJobInputSchema,
  uuidSchema,
  visitFormSchema,
  visitTextExtractionJobInputSchema,
  visitTextExtractionJobTypeSchema,
  visitStatusTransitionSchema,
} from "@reforma/core";

import { requireUser } from "../../../../lib/auth";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  createEvidenceStoragePath,
  MAX_EVIDENCE_UPLOAD_BYTES,
  VISIT_EVIDENCE_BUCKET,
} from "../../../../lib/storage";

function visitsRedirect(projectId: string, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/visits?${query.toString()}`);
}

function visitRedirect(
  projectId: string,
  visitId: string,
  params: { error?: string; ok?: string },
): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/visits/${visitId}?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

function requireVisitId(formData: FormData, projectId: string): string {
  const parsed = uuidSchema.safeParse(formData.get("visitId"));
  if (!parsed.success) {
    visitsRedirect(projectId, { error: "Invalid visit." });
  }
  return parsed.data;
}

function requireEvidenceId(formData: FormData, projectId: string, visitId: string): string {
  const parsed = uuidSchema.safeParse(formData.get("evidenceId"));
  if (!parsed.success) {
    visitRedirect(projectId, visitId, { error: "Invalid evidence item." });
  }
  return parsed.data;
}

function requireTranscriptionId(formData: FormData, projectId: string, visitId: string): string {
  const parsed = uuidSchema.safeParse(formData.get("transcriptionId"));
  if (!parsed.success) {
    visitRedirect(projectId, visitId, { error: "Invalid transcription." });
  }
  return parsed.data;
}

function readVisitForm(formData: FormData) {
  return visitFormSchema.safeParse({
    title: formData.get("title"),
    visitDate: formData.get("visitDate"),
    generalStatus: formData.get("generalStatus"),
    summary: formData.get("summary"),
    humanNotes: formData.get("humanNotes"),
    primaryZoneId: formData.get("primaryZoneId"),
    primaryTradeId: formData.get("primaryTradeId"),
  });
}

function readEvidenceFile(formData: FormData, projectId: string, visitId: string): File {
  const value = formData.get("file");
  if (!(value instanceof File) || value.size === 0) {
    visitRedirect(projectId, visitId, { error: "Choose an evidence file to upload." });
  }
  if (value.size > MAX_EVIDENCE_UPLOAD_BYTES) {
    visitRedirect(projectId, visitId, { error: "Evidence files must be 50 MB or smaller." });
  }
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(value.type)) {
    visitRedirect(projectId, visitId, {
      error: `Unsupported file type: ${value.type || "unknown"}.`,
    });
  }
  return value;
}

async function assertVisitBelongsToProject(projectId: string, visitId: string): Promise<boolean> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("visits")
    .select("id")
    .eq("id", visitId)
    .eq("project_id", projectId)
    .maybeSingle();

  return Boolean(data);
}

export async function createVisit(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase, user } = await requireUser();
  const parsed = readVisitForm(formData);

  if (!parsed.success) {
    visitsRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const { data, error } = await supabase
    .from("visits")
    .insert({
      project_id: projectId,
      title: parsed.data.title,
      visit_date: parsed.data.visitDate,
      general_status: parsed.data.generalStatus,
      summary: parsed.data.summary,
      human_notes: parsed.data.humanNotes,
      primary_zone_id: parsed.data.primaryZoneId,
      primary_trade_id: parsed.data.primaryTradeId,
      created_by: user.id,
    })
    .select("id");

  if (error) {
    visitsRedirect(projectId, { error: error.message });
  }
  const visit = data?.[0];
  if (!visit) {
    visitsRedirect(projectId, { error: "You do not have permission to create visits." });
  }

  redirect(`/projects/${projectId}/visits/${visit.id}`);
}

export async function updateVisit(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const { supabase, user } = await requireUser();
  const parsed = readVisitForm(formData);

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }

  const { data: existingVisit, error: existingVisitError } = await supabase
    .from("visits")
    .select("summary, summary_source, summary_review_state, summary_created_by_job_id")
    .eq("id", visitId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingVisitError) {
    visitRedirect(projectId, visitId, { error: existingVisitError.message });
  }
  if (!existingVisit) {
    visitRedirect(projectId, visitId, { error: "Visit not found." });
  }

  const summaryChanged = parsed.data.summary !== existingVisit.summary;
  const summaryReviewChanges =
    summaryChanged && existingVisit.summary_source === "ai"
      ? {
          summary_source: "ai",
          summary_review_state: parsed.data.summary ? "edited" : "rejected",
          summary_created_by_job_id: parsed.data.summary
            ? existingVisit.summary_created_by_job_id
            : null,
          summary_reviewed_by: user.id,
          summary_reviewed_at: new Date().toISOString(),
        }
      : summaryChanged
        ? {
            summary_source: "human",
            summary_review_state: "human_created",
            summary_created_by_job_id: null,
            summary_reviewed_by: null,
            summary_reviewed_at: null,
          }
        : {};

  const { data, error } = await supabase
    .from("visits")
    .update({
      title: parsed.data.title,
      visit_date: parsed.data.visitDate,
      general_status: parsed.data.generalStatus,
      summary: parsed.data.summary,
      human_notes: parsed.data.humanNotes,
      primary_zone_id: parsed.data.primaryZoneId,
      primary_trade_id: parsed.data.primaryTradeId,
      ...summaryReviewChanges,
    })
    .eq("id", visitId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to update this visit.",
    });
  }

  if (summaryChanged && existingVisit.summary_source === "ai") {
    const { error: auditError } = await supabase.from("audit_log").insert({
      project_id: projectId,
      actor_user_id: user.id,
      action: parsed.data.summary ? "summary.edited" : "summary.rejected",
      entity_type: "visit",
      entity_id: visitId,
      metadata: {
        previousReviewState: existingVisit.summary_review_state,
        newReviewState: summaryReviewChanges.summary_review_state,
      },
    });

    if (auditError) {
      visitRedirect(projectId, visitId, { error: auditError.message });
    }
  }

  revalidatePath(`/projects/${projectId}/visits`);
  revalidatePath(`/projects/${projectId}`);
  visitRedirect(projectId, visitId, { ok: "Visit updated." });
}

export async function setVisitStatus(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const { supabase, user } = await requireUser();
  const parsed = visitStatusTransitionSchema.safeParse({ status: formData.get("status") });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, { error: "Invalid visit status." });
  }

  const changes =
    parsed.data.status === "published"
      ? { status: parsed.data.status, published_at: new Date().toISOString() }
      : parsed.data.status === "draft"
        ? { status: parsed.data.status, published_at: null }
        : { status: parsed.data.status };

  const { data, error } = await supabase
    .from("visits")
    .update(changes)
    .eq("id", visitId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to change this visit.",
    });
  }

  const auditAction =
    parsed.data.status === "published"
      ? "visit.published"
      : parsed.data.status === "draft"
        ? "visit.unpublished"
        : "visit.archived";
  const { error: auditError } = await supabase.from("audit_log").insert({
    project_id: projectId,
    actor_user_id: user.id,
    action: auditAction,
    entity_type: "visit",
    entity_id: visitId,
    metadata: { status: parsed.data.status },
  });

  if (auditError) {
    visitRedirect(projectId, visitId, { error: auditError.message });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: `Visit marked ${parsed.data.status}.` });
}

export async function deleteVisit(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const { supabase } = await requireUser();

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .eq("visit_id", visitId);

  const paths = (evidence ?? []).map((item) => item.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(VISIT_EVIDENCE_BUCKET)
      .remove(paths);

    if (storageError) {
      visitRedirect(projectId, visitId, { error: storageError.message });
    }
  }

  const evidenceIds = (evidence ?? []).map((item) => item.id);
  if (evidenceIds.length > 0) {
    const { error: evidenceError } = await supabase.from("evidence").delete().in("id", evidenceIds);

    if (evidenceError) {
      visitRedirect(projectId, visitId, { error: evidenceError.message });
    }
  }

  const { data, error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to delete this visit.",
    });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitsRedirect(projectId, { ok: "Visit deleted." });
}

export async function uploadEvidence(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const { supabase, user } = await requireUser();

  if (!(await assertVisitBelongsToProject(projectId, visitId))) {
    visitsRedirect(projectId, { error: "Visit not found." });
  }

  const file = readEvidenceFile(formData, projectId, visitId);
  const parsed = evidenceMetadataSchema.safeParse({
    type: formData.get("type"),
    zoneId: formData.get("zoneId"),
    tradeId: formData.get("tradeId"),
    manualNote: formData.get("manualNote"),
  });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }
  if (!evidenceMimeTypeMatchesType(file.type, parsed.data.type)) {
    visitRedirect(projectId, visitId, {
      error: `The uploaded file type (${file.type}) does not match ${parsed.data.type}.`,
    });
  }

  const storagePath = createEvidenceStoragePath(projectId, visitId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(VISIT_EVIDENCE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    visitRedirect(projectId, visitId, { error: uploadError.message });
  }

  const { data, error } = await supabase
    .from("evidence")
    .insert({
      project_id: projectId,
      visit_id: visitId,
      type: parsed.data.type,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      zone_id: parsed.data.zoneId,
      trade_id: parsed.data.tradeId,
      manual_note: parsed.data.manualNote,
      uploaded_by: user.id,
    })
    .select("id");

  if (error) {
    await supabase.storage.from(VISIT_EVIDENCE_BUCKET).remove([storagePath]);
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    await supabase.storage.from(VISIT_EVIDENCE_BUCKET).remove([storagePath]);
    visitRedirect(projectId, visitId, { error: "You do not have permission to upload evidence." });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Evidence uploaded." });
}

export async function updateEvidence(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const evidenceId = requireEvidenceId(formData, projectId, visitId);
  const { supabase } = await requireUser();
  const parsed = evidenceMetadataSchema.safeParse({
    type: formData.get("type"),
    zoneId: formData.get("zoneId"),
    tradeId: formData.get("tradeId"),
    manualNote: formData.get("manualNote"),
  });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }

  const { data, error } = await supabase
    .from("evidence")
    .update({
      type: parsed.data.type,
      zone_id: parsed.data.zoneId,
      trade_id: parsed.data.tradeId,
      manual_note: parsed.data.manualNote,
    })
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .eq("visit_id", visitId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to update this evidence.",
    });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Evidence updated." });
}

export async function deleteEvidence(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const evidenceId = requireEvidenceId(formData, projectId, visitId);
  const { supabase } = await requireUser();

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, storage_path")
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .eq("visit_id", visitId)
    .maybeSingle();

  if (!evidence) {
    visitRedirect(projectId, visitId, { error: "Evidence not found." });
  }

  // Delete the DB row first: if the row deletion fails nothing is lost, and
  // if the later storage removal fails we only leave an orphaned blob behind
  // (harmless) instead of a row pointing at a deleted file.
  const { data, error } = await supabase
    .from("evidence")
    .delete()
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .eq("visit_id", visitId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to delete this evidence.",
    });
  }

  const { error: storageError } = await supabase.storage
    .from(VISIT_EVIDENCE_BUCKET)
    .remove([evidence.storage_path]);

  if (storageError) {
    // The evidence row is already gone; an orphaned blob is acceptable.
    console.error("evidence blob cleanup failed:", evidence.storage_path, storageError.message);
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Evidence deleted." });
}

export async function enqueueAudioTranscription(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const evidenceId = requireEvidenceId(formData, projectId, visitId);
  const { supabase, user } = await requireUser();

  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("id, type, mime_type")
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .eq("visit_id", visitId)
    .maybeSingle();

  if (evidenceError) {
    visitRedirect(projectId, visitId, { error: evidenceError.message });
  }
  if (!evidence || evidence.type !== "audio" || !evidence.mime_type.startsWith("audio/")) {
    visitRedirect(projectId, visitId, { error: "Only audio evidence can be transcribed." });
  }

  const { data: existingTranscription } = await supabase
    .from("audio_transcriptions")
    .select("id")
    .eq("evidence_id", evidenceId)
    .maybeSingle();

  if (existingTranscription) {
    visitRedirect(projectId, visitId, { ok: "This audio already has a transcript." });
  }

  const { data: existingJobs, error: existingJobsError } = await supabase
    .from("agent_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "transcribe_audio")
    .in("status", ["pending", "processing"])
    .contains("input", { evidenceId })
    .limit(1);

  if (existingJobsError) {
    visitRedirect(projectId, visitId, { error: existingJobsError.message });
  }
  if ((existingJobs ?? []).length > 0) {
    visitRedirect(projectId, visitId, { ok: "A transcription job is already queued." });
  }

  const input = transcribeAudioJobInputSchema.parse({ evidenceId });
  const { data, error } = await supabase
    .from("agent_jobs")
    .insert({
      project_id: projectId,
      type: "transcribe_audio",
      input,
      created_by: user.id,
    })
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to enqueue transcription jobs.",
    });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Transcription job queued." });
}

export async function enqueueVisitTextExtraction(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const parsedJobType = visitTextExtractionJobTypeSchema.safeParse(formData.get("jobType"));
  const { supabase, user } = await requireUser();

  if (!parsedJobType.success) {
    visitRedirect(projectId, visitId, { error: "Invalid text extraction job." });
  }
  if (!(await assertVisitBelongsToProject(projectId, visitId))) {
    visitsRedirect(projectId, { error: "Visit not found." });
  }

  const input = visitTextExtractionJobInputSchema.parse({ visitId });
  const { data: existingJobs, error: existingJobsError } = await supabase
    .from("agent_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", parsedJobType.data)
    .in("status", ["pending", "processing"])
    .contains("input", input)
    .limit(1);

  if (existingJobsError) {
    visitRedirect(projectId, visitId, { error: existingJobsError.message });
  }
  if ((existingJobs ?? []).length > 0) {
    visitRedirect(projectId, visitId, { ok: "A text extraction job is already queued." });
  }

  const { data, error } = await supabase
    .from("agent_jobs")
    .insert({
      project_id: projectId,
      type: parsedJobType.data,
      input,
      created_by: user.id,
    })
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to enqueue text extraction jobs.",
    });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Text extraction job queued." });
}

export async function updateAudioTranscription(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const transcriptionId = requireTranscriptionId(formData, projectId, visitId);
  const { supabase } = await requireUser();
  const parsed = audioTranscriptionEditSchema.safeParse({
    editedTranscript: formData.get("editedTranscript"),
  });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: parsed.error.issues[0]?.message ?? "Invalid transcript.",
    });
  }

  const { data, error } = await supabase
    .from("audio_transcriptions")
    .update({ edited_transcript: parsed.data.editedTranscript })
    .eq("id", transcriptionId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    visitRedirect(projectId, visitId, { error: error.message });
  }
  if (!data || data.length === 0) {
    visitRedirect(projectId, visitId, {
      error: "You do not have permission to update this transcript.",
    });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: "Transcript updated." });
}
