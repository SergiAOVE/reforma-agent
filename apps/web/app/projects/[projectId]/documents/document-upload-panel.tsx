"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DOCUMENT_TYPES } from "@reforma/core";

import { uploadDocumentBatch } from "./actions";

interface DocumentUploadPanelProps {
  projectId: string;
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

export function DocumentUploadPanel({ projectId, canEdit }: DocumentUploadPanelProps) {
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
          setUploadState({
            status: "error",
            error: "Choose at least one document file.",
            uploadedCount: 0,
          });
          return;
        }

        setUploadState({ status: "uploading" });
        const result = await uploadDocumentBatch(new FormData(formRef.current));

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

      <div className="form-status-row">
        <strong>Upload documents</strong>
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
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
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
                  {preview.type || "unknown type"} - {formatBytes(preview.size)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="field">
        <span>Title for this upload</span>
        <input
          name="title"
          required
          maxLength={180}
          placeholder={
            files.length > 1 ? "Example: Kitchen quote package" : "Example: Kitchen quote"
          }
          disabled={!canEdit || uploadState.status === "uploading"}
        />
      </label>

      <label className="field">
        <span>Type for selected files</span>
        <select
          name="type"
          defaultValue="other"
          disabled={!canEdit || uploadState.status === "uploading"}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Notes for selected files</span>
        <textarea
          name="notes"
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
            ? `Upload ${files.length} documents`
            : "Upload document"}
      </button>
    </form>
  );
}
