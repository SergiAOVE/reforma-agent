import { describe, expect, it } from "vitest";

import { groupDocumentUploads, type UploadDocumentRecord } from "./document-groups";

function documentRecord(
  overrides: Partial<UploadDocumentRecord> & Pick<UploadDocumentRecord, "id" | "uploadBatchId">,
): UploadDocumentRecord {
  return {
    id: overrides.id,
    type: overrides.type ?? "quote",
    title: overrides.title ?? "File title",
    uploadBatchId: overrides.uploadBatchId,
    uploadBatchTitle: overrides.uploadBatchTitle ?? "Kitchen quote package",
    originalFilename: overrides.originalFilename ?? "quote.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    sizeBytes: overrides.sizeBytes ?? 100,
    notes: overrides.notes ?? "",
    updatedAt: overrides.updatedAt ?? "2026-07-04T10:00:00.000Z",
  };
}

describe("groupDocumentUploads", () => {
  it("groups several files from one upload into one user-facing group", () => {
    const groups = groupDocumentUploads([
      documentRecord({
        id: "file-1",
        uploadBatchId: "batch-1",
        originalFilename: "quote-a.pdf",
        sizeBytes: 100,
      }),
      documentRecord({
        id: "file-2",
        uploadBatchId: "batch-1",
        originalFilename: "quote-b.pdf",
        sizeBytes: 250,
        updatedAt: "2026-07-04T11:00:00.000Z",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      uploadBatchId: "batch-1",
      title: "Kitchen quote package",
      totalBytes: 350,
      updatedAt: "2026-07-04T11:00:00.000Z",
    });
    expect(groups[0]?.documents.map((document) => document.originalFilename)).toEqual([
      "quote-a.pdf",
      "quote-b.pdf",
    ]);
  });

  it("sorts upload groups by their latest saved time", () => {
    const groups = groupDocumentUploads([
      documentRecord({
        id: "old-file",
        uploadBatchId: "old-batch",
        uploadBatchTitle: "Old documents",
        updatedAt: "2026-07-04T09:00:00.000Z",
      }),
      documentRecord({
        id: "new-file",
        uploadBatchId: "new-batch",
        uploadBatchTitle: "New documents",
        updatedAt: "2026-07-04T12:00:00.000Z",
      }),
    ]);

    expect(groups.map((group) => group.title)).toEqual(["New documents", "Old documents"]);
  });
});
