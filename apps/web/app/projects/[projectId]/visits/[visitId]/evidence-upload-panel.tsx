"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadEvidenceBatch } from "../actions";

interface SelectOption {
  id: string;
  name: string;
}

interface EvidenceUploadPanelProps {
  projectId: string;
  visitId: string;
  zones: SelectOption[];
  trades: SelectOption[];
  canEdit: boolean;
}

interface FilePreview {
  key: string;
  name: string;
  type: string;
  size: number;
  url: string | null;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "saved"; message: string; savedAt: string }
  | { status: "error"; error: string; uploadedCount: number; message?: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function inferredTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function EvidenceUploadPanel({
  projectId,
  visitId,
  zones,
  trades,
  canEdit,
}: EvidenceUploadPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  useEffect(() => {
    const nextPreviews = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPreviews(nextPreviews);

    return () => {
      for (const preview of nextPreviews) {
        if (preview.url) URL.revokeObjectURL(preview.url);
      }
    };
  }, [files]);

  return (
    <form
      ref={formRef}
      encType="multipart/form-data"
      className="compact-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!formRef.current || !canEdit) return;
        if (files.length === 0) {
          setUploadState({ status: "error", error: "Choose at least one file.", uploadedCount: 0 });
          return;
        }

        setUploadState({ status: "uploading" });
        const result = await uploadEvidenceBatch(new FormData(formRef.current));

        if (result.ok) {
          setUploadState({
            status: "saved",
            message: result.message,
            savedAt: result.savedAt,
          });
          formRef.current.reset();
          setFiles([]);
          router.refresh();
          return;
        }

        setUploadState({
          status: "error",
          error: result.error,
          uploadedCount: result.uploadedCount,
          message: result.message,
        });
        if (result.uploadedCount > 0) router.refresh();
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="visitId" value={visitId} />

      <div className="form-status-row">
        <strong>Upload evidence</strong>
        <span
          className={`save-state ${uploadState.status === "error" ? "error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {uploadState.status === "uploading"
            ? "Uploading..."
            : uploadState.status === "saved"
              ? `${uploadState.message} - ${formatSavedTime(uploadState.savedAt)}`
              : uploadState.status === "error"
                ? `${uploadState.message ? `${uploadState.message} ` : ""}${uploadState.error}`
                : "Ready"}
        </span>
      </div>

      <label className="field">
        <span>Files</span>
        <input
          name="files"
          type="file"
          accept="image/*,audio/*,video/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,text/plain,text/csv,application/pdf"
          multiple
          disabled={!canEdit || uploadState.status === "uploading"}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      {previews.length > 0 ? (
        <ul className="upload-preview-list">
          {previews.map((preview) => (
            <li key={preview.key} className="upload-preview-item">
              {preview.url ? (
                <img src={preview.url} alt={preview.name} />
              ) : (
                <span className="file-icon" aria-hidden="true">
                  File
                </span>
              )}
              <div>
                <strong>{preview.name}</strong>
                <div className="muted">
                  {inferredTypeLabel(preview.type)} - {preview.type || "unknown type"} -{" "}
                  {formatBytes(preview.size)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid two">
        <label className="field">
          <span>Zone for selected files</span>
          <select name="zoneId" disabled={!canEdit || uploadState.status === "uploading"}>
            <option value="">None</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Trade for selected files</span>
          <select name="tradeId" disabled={!canEdit || uploadState.status === "uploading"}>
            <option value="">None</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Note for selected files</span>
        <textarea
          name="manualNote"
          rows={3}
          maxLength={2000}
          disabled={!canEdit || uploadState.status === "uploading"}
        />
      </label>

      <button
        type="submit"
        disabled={!canEdit || uploadState.status === "uploading" || files.length === 0}
      >
        {uploadState.status === "uploading"
          ? "Uploading..."
          : files.length > 1
            ? `Upload ${files.length} files`
            : "Upload evidence"}
      </button>
    </form>
  );
}
