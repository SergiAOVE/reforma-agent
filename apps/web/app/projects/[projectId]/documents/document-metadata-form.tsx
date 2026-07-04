"use client";

import { useState } from "react";

import { DOCUMENT_TYPES, type DocumentType } from "@reforma/core";

import { deleteDocument, saveDocumentMetadata } from "./actions";

interface DocumentMetadataFormProps {
  projectId: string;
  document: {
    id: string;
    type: DocumentType;
    title: string;
    notes: string | null;
    updated_at: string;
  };
  canEdit: boolean;
}

type SaveState =
  | { status: "saved"; savedAt: string; message?: string }
  | { status: "dirty"; savedAt: string }
  | { status: "saving"; savedAt: string }
  | { status: "error"; error: string; savedAt: string };

function formatSavedTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function saveStateText(state: SaveState): string {
  if (state.status === "saving") return "Saving...";
  if (state.status === "dirty")
    return `Unsaved changes - Last saved ${formatSavedTime(state.savedAt)}`;
  if (state.status === "error") return `Save failed: ${state.error}`;
  return state.message ?? `Last saved ${formatSavedTime(state.savedAt)}`;
}

export function DocumentMetadataForm({ projectId, document, canEdit }: DocumentMetadataFormProps) {
  const initialValues = {
    type: document.type,
    title: document.title,
    notes: document.notes ?? "",
  };
  const [type, setType] = useState<DocumentType>(document.type);
  const [title, setTitle] = useState(document.title);
  const [notes, setNotes] = useState(document.notes ?? "");
  const [savedValues, setSavedValues] = useState(initialValues);
  const [saveState, setSaveState] = useState<SaveState>({
    status: "saved",
    savedAt: document.updated_at,
  });
  const isDirty =
    type !== savedValues.type || title !== savedValues.title || notes !== savedValues.notes;
  const visibleSaveState: SaveState =
    saveState.status === "saving"
      ? saveState
      : isDirty
        ? { status: "dirty", savedAt: saveState.savedAt }
        : saveState;

  return (
    <div className="inline-edit">
      <form
        className="compact-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!canEdit || !isDirty) return;

          const values = { type, title, notes };

          setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));
          const result = await saveDocumentMetadata({
            projectId,
            documentId: document.id,
            ...values,
          });

          if (!result.ok) {
            setSaveState((current) => ({
              status: "error",
              error: result.error,
              savedAt: current.savedAt,
            }));
            return;
          }

          setSavedValues(values);
          setSaveState({
            status: "saved",
            savedAt: result.savedAt,
            message: `Saved just now - Last saved ${formatSavedTime(result.savedAt)}`,
          });
        }}
      >
        <label className="field">
          <span>Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as DocumentType)}
            disabled={!canEdit || saveState.status === "saving"}
          >
            {DOCUMENT_TYPES.map((documentType) => (
              <option key={documentType} value={documentType}>
                {documentType}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={180}
            disabled={!canEdit || saveState.status === "saving"}
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            disabled={!canEdit || saveState.status === "saving"}
          />
        </label>
        <div className="button-row">
          <button
            type="submit"
            className="metadata-save-button"
            disabled={!canEdit || saveState.status === "saving" || !isDirty}
          >
            {saveState.status === "saving" ? "Saving..." : "Save document"}
          </button>
          <span
            className={`save-state ${visibleSaveState.status === "error" ? "error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveStateText(visibleSaveState)}
          </span>
        </div>
      </form>

      {canEdit ? (
        <form action={deleteDocument}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="documentId" value={document.id} />
          <button type="submit" className="danger">
            Delete document
          </button>
        </form>
      ) : null}
    </div>
  );
}
