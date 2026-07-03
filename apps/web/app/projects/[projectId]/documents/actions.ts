"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { documentMetadataSchema, uuidSchema } from "@reforma/core";

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
  if (value.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    documentsRedirect(projectId, { error: "Document files must be 10 MB or smaller." });
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(value.type)) {
    documentsRedirect(projectId, { error: `Unsupported file type: ${value.type || "unknown"}.` });
  }
  return value;
}

export async function uploadDocument(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase, user } = await requireUser();
  const file = readDocumentFile(formData, projectId);

  const parsed = documentMetadataSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    documentsRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const storagePath = createDocumentStoragePath(projectId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    documentsRedirect(projectId, { error: uploadError.message });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      type: parsed.data.type,
      title: parsed.data.title,
      notes: parsed.data.notes,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id");

  if (error) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    documentsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    await supabase.storage.from(PROJECT_DOCUMENTS_BUCKET).remove([storagePath]);
    documentsRedirect(projectId, { error: "You do not have permission to upload documents." });
  }

  revalidatePath(`/projects/${projectId}/documents`);
  documentsRedirect(projectId, { ok: "Document uploaded." });
}

export async function updateDocument(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const documentId = requireDocumentId(formData, projectId);
  const { supabase } = await requireUser();
  const parsed = documentMetadataSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    documentsRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const { data, error } = await supabase
    .from("documents")
    .update({ type: parsed.data.type, title: parsed.data.title, notes: parsed.data.notes })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    documentsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    documentsRedirect(projectId, { error: "You do not have permission to update this document." });
  }

  revalidatePath(`/projects/${projectId}/documents`);
  documentsRedirect(projectId, { ok: "Document updated." });
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
