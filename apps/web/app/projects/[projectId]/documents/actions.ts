"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  type DocumentMetadataInput,
  documentMetadataSchema,
  type DocumentType,
  documentTypeSchema,
  uuidSchema,
} from "@reforma/core";

import { requireUser } from "../../../../lib/auth";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  createDocumentStoragePath,
  MAX_DOCUMENT_UPLOAD_BYTES,
  PROJECT_DOCUMENTS_BUCKET,
} from "../../../../lib/storage";

function documentsRedirect(projectId: string, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/documents?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

function requireDocumentId(formData: FormData, projectId: string): string {
  const parsed = uuidSchema.safeParse(formData.get("documentId"));
  if (!parsed.success) {
    documentsRedirect(projectId, { error: "Invalid document." });
  }
  return parsed.data;
}

function readDocumentFile(formData: FormData, projectId: string): File {
  const value = formData.get("file");
  if (!(value instanceof File) || value.size === 0) {
    documentsRedirect(projectId, { error: "Choose a document file to upload." });
  }
  const error = documentFileValidationError(value);
  if (error) {
    documentsRedirect(projectId, { error });
  }
  return value;
}

function readDocumentFiles(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function documentFileValidationError(file: File): string | null {
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return "Document files must be 10 MB or smaller.";
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return `Unsupported file type: ${file.type || "unknown"}.`;
  }
  return null;
}

function documentTitleFromFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? "Document";
  const withoutExtension = basename.replace(/\.[^.]+$/, "");
  const title = withoutExtension.replace(/[_-]+/g, " ").trim();
  return title.length > 0 ? title.slice(0, 180) : "Document";
}

function firstValidationMessage(parsed: {
  success: false;
  error: { issues: { message: string }[] };
}) {
  return parsed.error.issues[0]?.message ?? "Invalid input.";
}

export type SaveDocumentResult =
  | { ok: true; savedAt: string; message: string }
  | { ok: false; error: string; savedAt?: string; message?: string };

export type UploadDocumentBatchResult =
  | { ok: true; savedAt: string; uploadedCount: number; message: string }
  | { ok: false; error: string; uploadedCount: number; savedAt?: string; message?: string };

async function persistDocumentUpload({
  projectId,
  file,
  metadata,
  uploadedBy,
}: {
  projectId: string;
  file: File;
  metadata: DocumentMetadataInput;
  uploadedBy: string;
}): Promise<SaveDocumentResult> {
  const { supabase } = await requireUser();
  const storagePath = createDocumentStoragePath(projectId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      type: metadata.type,
      title: metadata.title,
      notes: metadata.notes,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
    })
    .select("id, updated_at");

  if (error) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: "You do not have permission to upload documents." };
  }

  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: "Document uploaded.",
  };
}

async function persistDocumentMetadataUpdate(
  projectId: string,
  documentId: string,
  values: DocumentMetadataInput,
): Promise<SaveDocumentResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("documents")
    .update({ type: values.type, title: values.title, notes: values.notes })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .select("id, updated_at");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You do not have permission to update this document." };
  }

  revalidatePath(`/projects/${projectId}/documents`);

  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: "Document saved.",
  };
}

export async function uploadDocument(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { user } = await requireUser();
  const file = readDocumentFile(formData, projectId);

  const parsed = documentMetadataSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    documentsRedirect(projectId, { error: firstValidationMessage(parsed) });
  }

  const result = await persistDocumentUpload({
    projectId,
    file,
    metadata: parsed.data,
    uploadedBy: user.id,
  });
  if (!result.ok) {
    documentsRedirect(projectId, { error: result.error });
  }

  revalidatePath(`/projects/${projectId}/documents`);
  documentsRedirect(projectId, { ok: result.message });
}

export async function uploadDocumentBatch(formData: FormData): Promise<UploadDocumentBatchResult> {
  const projectId = uuidSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) {
    return { ok: false, error: "Invalid project.", uploadedCount: 0 };
  }

  const { user } = await requireUser();
  const files = readDocumentFiles(formData);
  if (files.length === 0) {
    return { ok: false, error: "Choose at least one document file.", uploadedCount: 0 };
  }

  const type = documentTypeSchema.safeParse(formData.get("type"));
  if (!type.success) {
    return { ok: false, error: "Choose a valid document type.", uploadedCount: 0 };
  }

  const commonNotes = formData.get("notes");
  let uploadedCount = 0;
  let lastSavedAt: string | undefined;
  const errors: string[] = [];

  for (const file of files) {
    const fileError = documentFileValidationError(file);
    if (fileError) {
      errors.push(`${file.name}: ${fileError}`);
      continue;
    }

    const parsed = documentMetadataSchema.safeParse({
      type: type.data,
      title: documentTitleFromFilename(file.name),
      notes: commonNotes,
    });

    if (!parsed.success) {
      errors.push(`${file.name}: ${firstValidationMessage(parsed)}`);
      continue;
    }

    const result = await persistDocumentUpload({
      projectId: projectId.data,
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
    revalidatePath(`/projects/${projectId.data}/documents`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: errors.slice(0, 3).join(" "),
      uploadedCount,
      savedAt: lastSavedAt,
      message:
        uploadedCount > 0
          ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded.`
          : undefined,
    };
  }

  return {
    ok: true,
    uploadedCount,
    savedAt: lastSavedAt ?? new Date().toISOString(),
    message: `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded.`,
  };
}

export async function updateDocument(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const documentId = requireDocumentId(formData, projectId);
  const parsed = documentMetadataSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    documentsRedirect(projectId, { error: firstValidationMessage(parsed) });
  }

  const result = await persistDocumentMetadataUpdate(projectId, documentId, parsed.data);
  if (!result.ok) {
    documentsRedirect(projectId, { error: result.error });
  }

  documentsRedirect(projectId, { ok: result.message });
}

export interface DocumentMetadataSaveInput {
  projectId: string;
  documentId: string;
  type: DocumentType;
  title: string;
  notes: string;
}

export async function saveDocumentMetadata(
  input: DocumentMetadataSaveInput,
): Promise<SaveDocumentResult> {
  const projectId = uuidSchema.safeParse(input.projectId);
  if (!projectId.success) {
    return { ok: false, error: "Invalid project." };
  }
  const documentId = uuidSchema.safeParse(input.documentId);
  if (!documentId.success) {
    return { ok: false, error: "Invalid document." };
  }

  const parsed = documentMetadataSchema.safeParse({
    type: input.type,
    title: input.title,
    notes: input.notes,
  });

  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed) };
  }

  return persistDocumentMetadataUpdate(projectId.data, documentId.data, parsed.data);
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const documentId = requireDocumentId(formData, projectId);
  const { supabase } = await requireUser();

  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!document) {
    documentsRedirect(projectId, { error: "Document not found." });
  }

  const { error: storageError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    documentsRedirect(projectId, { error: storageError.message });
  }

  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    documentsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    documentsRedirect(projectId, { error: "You do not have permission to delete this document." });
  }

  revalidatePath(`/projects/${projectId}/documents`);
  documentsRedirect(projectId, { ok: "Document deleted." });
}
