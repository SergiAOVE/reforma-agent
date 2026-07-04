import Link from "next/link";

import { groupDocumentUploads, type UploadDocumentRecord } from "@reforma/core";

import { loadProjectAccess } from "../../../../lib/project-access";
import { PROJECT_DOCUMENTS_BUCKET } from "../../../../lib/storage";
import { DocumentMetadataForm } from "./document-metadata-form";
import { DocumentUploadPanel } from "./document-upload-panel";

interface DocumentsPageProps {
  params: Promise<{ projectId: string }>;
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

interface DocumentFile extends UploadDocumentRecord {
  signedUrl: string | null;
}

export default async function DocumentsPage({ params, searchParams }: DocumentsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, type, title, upload_batch_id, upload_batch_title, storage_path, original_filename, mime_type, size_bytes, notes, created_at, updated_at",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (document) => {
      const { data } = await supabase.storage
        .from(PROJECT_DOCUMENTS_BUCKET)
        .createSignedUrl(document.storage_path, 600);

      return { ...document, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const documentGroups = groupDocumentUploads<DocumentFile>(
    documentsWithUrls.map((document) => ({
      id: document.id,
      type: document.type,
      title: document.title,
      uploadBatchId: document.upload_batch_id,
      uploadBatchTitle: document.upload_batch_title,
      originalFilename: document.original_filename,
      mimeType: document.mime_type,
      sizeBytes: Number(document.size_bytes),
      notes: document.notes,
      updatedAt: document.updated_at,
      signedUrl: document.signedUrl,
    })),
  );

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}`}>← {project.name}</Link>
      </p>
      <div className="page-title">
        <div>
          <h1>Documents</h1>
          <p className="muted">Private plans, quotes, invoices, warranties and annexes.</p>
        </div>
        <span className={`badge role-${role}`}>{role}</span>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can upload or edit documents.
        </p>
      ) : null}

      <section className="card">
        <DocumentUploadPanel projectId={project.id} canEdit={canEdit} />
      </section>

      <section className="card">
        <h2>Document library</h2>
        {documentGroups.length === 0 ? (
          <p className="muted">No documents yet.</p>
        ) : (
          <ul className="stack-list">
            {documentGroups.map((documentGroup) => (
              <li key={documentGroup.uploadBatchId} className="stack-item">
                <div className="split-row">
                  <div>
                    <strong>{documentGroup.title}</strong>
                    <div className="muted">
                      {documentGroup.type} | {documentGroup.documents.length}{" "}
                      {documentGroup.documents.length === 1 ? "file" : "files"} |{" "}
                      {formatBytes(documentGroup.totalBytes)} | Last saved{" "}
                      {formatDateTime(documentGroup.updatedAt)}
                    </div>
                  </div>
                </div>

                <ul className="document-file-list">
                  {documentGroup.documents.map((file) => (
                    <li key={file.id}>
                      <div>
                        <strong>{file.originalFilename}</strong>
                        <div className="muted">
                          {file.mimeType || "unknown type"} | {formatBytes(file.sizeBytes)}
                        </div>
                      </div>
                      {file.signedUrl ? (
                        <a href={file.signedUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="muted">No link</span>
                      )}
                    </li>
                  ))}
                </ul>

                <DocumentMetadataForm
                  projectId={project.id}
                  documentGroup={documentGroup}
                  canEdit={canEdit}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
