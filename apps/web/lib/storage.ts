export const PROJECT_DOCUMENTS_BUCKET = "project-documents";
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function sanitizeStorageFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "document";
  const normalized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return normalized.length > 0 ? normalized : "document";
}

export function createDocumentStoragePath(projectId: string, filename: string): string {
  return `${projectId}/${crypto.randomUUID()}-${sanitizeStorageFilename(filename)}`;
}
