export const PROJECT_DOCUMENTS_BUCKET = "project-documents";
export const VISIT_EVIDENCE_BUCKET = "visit-evidence";
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_UPLOAD_BYTES = 50 * 1024 * 1024;

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

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
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

export function createEvidenceStoragePath(
  projectId: string,
  visitId: string,
  filename: string,
): string {
  return `${projectId}/${visitId}/${crypto.randomUUID()}-${sanitizeStorageFilename(filename)}`;
}
