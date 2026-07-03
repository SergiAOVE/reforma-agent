import Link from "next/link";

import { DOCUMENT_TYPES } from "@reforma/core";

import { loadProjectAccess } from "../../../../lib/project-access";
import { PROJECT_DOCUMENTS_BUCKET } from "../../../../lib/storage";
import { deleteDocument, updateDocument, uploadDocument } from "./actions";

interface DocumentsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({ params, searchParams }: DocumentsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const { data: documents } = await supabase
    .from("documents")
    .select(
      "id, type, title, storage_path, original_filename, mime_type, size_bytes, notes, created_at",
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
        <h2>Upload document</h2>
        <form action={uploadDocument} encType="multipart/form-data" className="compact-form">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="field">
            <span>File</span>
            <input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
              required
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select name="type" defaultValue="other" disabled={!canEdit}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Title</span>
            <input name="title" required maxLength={180} disabled={!canEdit} />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows={3} maxLength={2000} disabled={!canEdit} />
          </label>
          <button type="submit" disabled={!canEdit}>
            Upload
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Document library</h2>
        {documentsWithUrls.length === 0 ? (
          <p className="muted">No documents yet.</p>
        ) : (
          <ul className="stack-list">
            {documentsWithUrls.map((document) => (
              <li key={document.id} className="stack-item">
                <div className="split-row">
                  <div>
                    <strong>{document.title}</strong>
                    <div className="muted">
                      {document.type} · {document.original_filename} ·{" "}
                      {formatBytes(document.size_bytes)}
                    </div>
                  </div>
                  {document.signedUrl ? (
                    <a href={document.signedUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    <span className="muted">No link</span>
                  )}
                </div>

                <form action={updateDocument} className="inline-edit">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="documentId" value={document.id} />
                  <label className="field">
                    <span>Type</span>
                    <select name="type" defaultValue={document.type} disabled={!canEdit}>
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Title</span>
                    <input
                      name="title"
                      defaultValue={document.title}
                      required
                      maxLength={180}
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="field">
                    <span>Notes</span>
                    <textarea
                      name="notes"
                      defaultValue={document.notes ?? ""}
                      rows={2}
                      disabled={!canEdit}
                    />
                  </label>
                  <div className="button-row">
                    <button type="submit" disabled={!canEdit}>
                      Save
                    </button>
                    {canEdit ? (
                      <button type="submit" formAction={deleteDocument} className="danger">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
