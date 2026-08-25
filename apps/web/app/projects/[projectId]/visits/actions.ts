"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  audioTranscriptionEditSchema,
  type EvidenceMetadataInput,
  evidenceMetadataSchema,
  evidenceMimeTypeMatchesType,
  evidenceTypeFromMimeType,
  transcribeAudioJobInputSchema,
  uuidSchema,
  type VisitFormInput,
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
  hash?: string,
): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/visits/${visitId}?${query.toString()}${hash ? `#${hash}` : ""}`);
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
  validateEvidenceFile(value, projectId, visitId);
  return value;
}

function readEvidenceFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateEvidenceFile(value: File, projectId: string, visitId: string): void {
  const error = evidenceFileValidationError(value);
  if (error) {
    visitRedirect(projectId, visitId, { error });
  }
}

function evidenceFileValidationError(value: File): string | null {
  if (value.size > MAX_EVIDENCE_UPLOAD_BYTES) {
    return "Evidence files must be 50 MB or smaller.";
  }
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(value.type)) {
    return `Unsupported file type: ${value.type || "unknown"}.`;
  }
  return null;
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

export interface VisitAutosaveInput {
  projectId: string;
  visitId: string;
  title: string;
  visitDate: string;
  generalStatus: string;
  humanNotes: string;
  summary: string;
  primaryZoneId: string;
  primaryTradeId: string;
}

export type SaveActionResult =
  | { ok: true; savedAt: string; message: string }
  | { ok: false; error: string; savedAt?: string; message?: string };

export type UploadEvidenceBatchResult =
  | { ok: true; savedAt: string; uploadedCount: number; message: string }
  | { ok: false; error: string; uploadedCount: number; savedAt?: string; message?: string };

function firstValidationMessage(parsed: {
  success: false;
  error: { issues: { message: string }[] };
}) {
  return parsed.error.issues[0]?.message ?? "Invalid input.";
}

async function persistVisitUpdate(
  projectId: string,
  visitId: string,
  values: VisitFormInput,
): Promise<SaveActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existingVisit, error: existingVisitError } = await supabase
    .from("visits")
    .select("summary, summary_source, summary_review_state, summary_created_by_job_id")
    .eq("id", visitId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingVisitError) {
    return { ok: false, error: existingVisitError.message };
  }
  if (!existingVisit) {
    return { ok: false, error: "Visit not found." };
  }

  const summaryChanged = values.summary !== existingVisit.summary;
  let summaryReviewChanges: Record<string, string | null> = {};
  let newSummaryReviewState: string | null = null;

  if (summaryChanged && existingVisit.summary_source === "ai") {
    newSummaryReviewState = values.summary ? "edited" : "rejected";
    summaryReviewChanges = {
      summary_source: "ai",
      summary_review_state: newSummaryReviewState,
      summary_created_by_job_id: values.summary ? existingVisit.summary_created_by_job_id : null,
      summary_reviewed_by: user.id,
      summary_reviewed_at: new Date().toISOString(),
    };
  } else if (summaryChanged) {
    summaryReviewChanges = {
      summary_source: "human",
      summary_review_state: "human_created",
      summary_created_by_job_id: null,
      summary_reviewed_by: null,
      summary_reviewed_at: null,
    };
  }

  const { data, error } = await supabase
    .from("visits")
    .update({
      title: values.title,
      visit_date: values.visitDate,
      general_status: values.generalStatus,
      summary: values.summary,
      human_notes: values.humanNotes,
      primary_zone_id: values.primaryZoneId,
      primary_trade_id: values.primaryTradeId,
      ...summaryReviewChanges,
    })
    .eq("id", visitId)
    .eq("project_id", projectId)
    .select("id, updated_at");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You do not have permission to update this visit." };
  }

  if (summaryChanged && existingVisit.summary_source === "ai") {
    const { error: auditError } = await supabase.from("audit_log").insert({
      project_id: projectId,
      actor_user_id: user.id,
      action: values.summary ? "summary.edited" : "summary.rejected",
      entity_type: "visit",
      entity_id: visitId,
      metadata: {
        previousReviewState: existingVisit.summary_review_state,
        newReviewState: newSummaryReviewState,
      },
    });

    if (auditError) {
      return { ok: false, error: auditError.message };
    }
  }

  revalidatePath(`/projects/${projectId}/visits`);
  revalidatePath(`/projects/${projectId}`);

  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: "Visit saved.",
  };
}

async function persistEvidenceUpload({
  projectId,
  visitId,
  file,
  metadata,
  uploadedBy,
}: {
  projectId: string;
  visitId: string;
  file: File;
  metadata: EvidenceMetadataInput;
  uploadedBy: string;
}): Promise<SaveActionResult> {
  const { supabase } = await requireUser();

  if (!evidenceMimeTypeMatchesType(file.type, metadata.type)) {
    return {
      ok: false,
      error: `The uploaded file type (${file.type}) does not match ${metadata.type}.`,
    };
  }

  const storagePath = createEvidenceStoragePath(projectId, visitId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(VISIT_EVIDENCE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("evidence")
    .insert({
      project_id: projectId,
      visit_id: visitId,
      type: metadata.type,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      zone_id: metadata.zoneId,
      trade_id: metadata.tradeId,
      manual_note: metadata.manualNote,
      uploaded_by: uploadedBy,
    })
    .select("id, updated_at");

  if (error) {
    await supabase.storage.from(VISIT_EVIDENCE_BUCKET).remove([storagePath]);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    await supabase.storage.from(VISIT_EVIDENCE_BUCKET).remove([storagePath]);
    return { ok: false, error: "You do not have permission to upload evidence." };
  }

  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: "Evidence uploaded.",
  };
}

async function persistEvidenceMetadataUpdate(
  projectId: string,
  visitId: string,
  evidenceId: string,
  values: EvidenceMetadataInput,
): Promise<SaveActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("evidence")
    .update({
      type: values.type,
      zone_id: values.zoneId,
      trade_id: values.tradeId,
      manual_note: values.manualNote,
    })
    .eq("id", evidenceId)
    .eq("project_id", projectId)
    .eq("visit_id", visitId)
    .select("id, updated_at");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You do not have permission to update this evidence." };
  }

  revalidatePath(`/projects/${projectId}/visits`);

  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: "Evidence saved.",
  };
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
  const parsed = readVisitForm(formData);

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: firstValidationMessage(parsed),
    });
  }

  const result = await persistVisitUpdate(projectId, visitId, parsed.data);
  if (!result.ok) {
    visitRedirect(projectId, visitId, { error: result.error });
  }

  visitRedirect(projectId, visitId, { ok: result.message });
}

export async function autosaveVisit(input: VisitAutosaveInput): Promise<SaveActionResult> {
  const projectId = uuidSchema.safeParse(input.projectId);
  if (!projectId.success) {
    return { ok: false, error: "Invalid project." };
  }
  const visitId = uuidSchema.safeParse(input.visitId);
  if (!visitId.success) {
    return { ok: false, error: "Invalid visit." };
  }

  const parsed = visitFormSchema.safeParse({
    title: input.title,
    visitDate: input.visitDate,
    generalStatus: input.generalStatus,
    summary: input.summary,
    humanNotes: input.humanNotes,
    primaryZoneId: input.primaryZoneId,
    primaryTradeId: input.primaryTradeId,
  });

  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed) };
  }

  return persistVisitUpdate(projectId.data, visitId.data, parsed.data);
}

export async function setVisitStatus(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const { supabase, user } = await requireUser();
  const parsed = visitStatusTransitionSchema.safeParse({ status: formData.get("status") });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, { error: "Invalid site update status." }, "finish");
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
    visitRedirect(projectId, visitId, { error: error.message }, "finish");
  }
  if (!data || data.length === 0) {
    visitRedirect(
      projectId,
      visitId,
      { error: "You do not have permission to change this site update." },
      "finish",
    );
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
    visitRedirect(projectId, visitId, { error: auditError.message }, "finish");
  }

  revalidatePath(`/projects/${projectId}/visits`);
  const message =
    parsed.data.status === "published"
      ? "Site update finished."
      : parsed.data.status === "draft"
        ? "Site update returned to draft."
        : "Site update archived.";
  visitRedirect(projectId, visitId, { ok: message }, "finish");
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
  const { user } = await requireUser();

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
      error: firstValidationMessage(parsed),
    });
  }

  const result = await persistEvidenceUpload({
    projectId,
    visitId,
    file,
    metadata: parsed.data,
    uploadedBy: user.id,
  });
  if (!result.ok) {
    visitRedirect(projectId, visitId, { error: result.error });
  }

  revalidatePath(`/projects/${projectId}/visits`);
  visitRedirect(projectId, visitId, { ok: result.message });
}

export async function uploadEvidenceBatch(formData: FormData): Promise<UploadEvidenceBatchResult> {
  const projectId = uuidSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) {
    return { ok: false, error: "Invalid project.", uploadedCount: 0 };
  }
  const visitId = uuidSchema.safeParse(formData.get("visitId"));
  if (!visitId.success) {
    return { ok: false, error: "Invalid visit.", uploadedCount: 0 };
  }

  const { user } = await requireUser();
  if (!(await assertVisitBelongsToProject(projectId.data, visitId.data))) {
    return { ok: false, error: "Visit not found.", uploadedCount: 0 };
  }

  const files = readEvidenceFiles(formData);
  if (files.length === 0) {
    return { ok: false, error: "Choose at least one evidence file.", uploadedCount: 0 };
  }

  let uploadedCount = 0;
  let lastSavedAt: string | undefined;
  const errors: string[] = [];

  for (const file of files) {
    const fileError = evidenceFileValidationError(file);
    if (fileError) {
      errors.push(`${file.name}: ${fileError}`);
      continue;
    }

    const parsed = evidenceMetadataSchema.safeParse({
      type: evidenceTypeFromMimeType(file.type),
      zoneId: formData.get("zoneId"),
      tradeId: formData.get("tradeId"),
      manualNote: formData.get("manualNote"),
    });

    if (!parsed.success) {
      errors.push(`${file.name}: ${firstValidationMessage(parsed)}`);
      continue;
    }

    const result = await persistEvidenceUpload({
      projectId: projectId.data,
      visitId: visitId.data,
      file,
      metadata: parsed.data,
      uploadedBy: user.id,
    });

    if (result.ok) {
      uploadedCount += 1;
      lastSavedAt = result.savedAt;
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  if (uploadedCount > 0) {
    revalidatePath(`/projects/${projectId.data}/visits`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: errors.slice(0, 3).join(" "),
      uploadedCount,
      savedAt: lastSavedAt,
      message:
        uploadedCount > 0
          ? `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded.`
          : undefined,
    };
  }

  return {
    ok: true,
    uploadedCount,
    savedAt: lastSavedAt ?? new Date().toISOString(),
    message: `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded.`,
  };
}

export async function updateEvidence(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const visitId = requireVisitId(formData, projectId);
  const evidenceId = requireEvidenceId(formData, projectId, visitId);
  const parsed = evidenceMetadataSchema.safeParse({
    type: formData.get("type"),
    zoneId: formData.get("zoneId"),
    tradeId: formData.get("tradeId"),
    manualNote: formData.get("manualNote"),
  });

  if (!parsed.success) {
    visitRedirect(projectId, visitId, {
      error: firstValidationMessage(parsed),
    });
  }

  const result = await persistEvidenceMetadataUpdate(projectId, visitId, evidenceId, parsed.data);
  if (!result.ok) {
    visitRedirect(projectId, visitId, { error: result.error });
  }

  visitRedirect(projectId, visitId, { ok: result.message });
}

export interface EvidenceMetadataSaveInput {
  projectId: string;
  visitId: string;
  evidenceId: string;
  type: string;
  zoneId: string;
  tradeId: string;
  manualNote: string;
}

export async function saveEvidenceMetadata(
  input: EvidenceMetadataSaveInput,
): Promise<SaveActionResult> {
  const projectId = uuidSchema.safeParse(input.projectId);
  if (!projectId.success) {
    return { ok: false, error: "Invalid project." };
  }
  const visitId = uuidSchema.safeParse(input.visitId);
  if (!visitId.success) {
    return { ok: false, error: "Invalid visit." };
  }
  const evidenceId = uuidSchema.safeParse(input.evidenceId);
  if (!evidenceId.success) {
    return { ok: false, error: "Invalid evidence item." };
  }

  const parsed = evidenceMetadataSchema.safeParse({
    type: input.type,
    zoneId: input.zoneId,
    tradeId: input.tradeId,
    manualNote: input.manualNote,
  });

  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed) };
  }

  return persistEvidenceMetadataUpdate(projectId.data, visitId.data, evidenceId.data, parsed.data);
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
