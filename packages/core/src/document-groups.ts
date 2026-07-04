import type { DocumentType } from "./enums";

export interface UploadDocumentRecord {
  id: string;
  type: DocumentType;
  title: string;
  uploadBatchId: string;
  uploadBatchTitle: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  updatedAt: string;
}

export interface DocumentUploadGroup<
  TDocument extends UploadDocumentRecord = UploadDocumentRecord,
> {
  uploadBatchId: string;
  title: string;
  type: DocumentType;
  notes: string | null;
  updatedAt: string;
  documents: TDocument[];
  totalBytes: number;
}

export function groupDocumentUploads<TDocument extends UploadDocumentRecord>(
  documents: TDocument[],
): DocumentUploadGroup<TDocument>[] {
  const groups = new Map<string, DocumentUploadGroup<TDocument>>();

  for (const document of documents) {
    const existing = groups.get(document.uploadBatchId);

    if (!existing) {
      groups.set(document.uploadBatchId, {
        uploadBatchId: document.uploadBatchId,
        title: document.uploadBatchTitle,
        type: document.type,
        notes: document.notes,
        updatedAt: document.updatedAt,
        documents: [document],
        totalBytes: document.sizeBytes,
      });
      continue;
    }

    existing.documents.push(document);
    existing.totalBytes += document.sizeBytes;
    if (document.updatedAt > existing.updatedAt) {
      existing.updatedAt = document.updatedAt;
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
