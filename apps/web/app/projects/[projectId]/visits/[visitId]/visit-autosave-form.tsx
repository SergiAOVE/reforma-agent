"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { autosaveVisit, type VisitAutosaveInput } from "../actions";

interface SelectOption {
  id: string;
  name: string;
}

type VisitAutosaveFields = Omit<VisitAutosaveInput, "projectId" | "visitId" | "lastSavedAt">;

interface VisitAutosaveFormProps {
  projectId: string;
  visit: {
    id: string;
    title: string;
    visit_date: string;
    general_status: string | null;
    human_notes: string | null;
    primary_zone_id: string | null;
    primary_trade_id: string | null;
    updated_at: string;
  };
  zones: SelectOption[];
  trades: SelectOption[];
  canEdit: boolean;
}

type SaveState =
  | { status: "saved"; savedAt: string; message?: string }
  | { status: "dirty"; savedAt?: string }
  | { status: "saving"; savedAt?: string }
  | { status: "error"; error: string; savedAt?: string }
  | { status: "conflict"; savedAt?: string };

function serializeFields(fields: VisitAutosaveFields): string {
  return JSON.stringify(fields);
}

function formatSavedTime(value?: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function saveStateText(state: SaveState): string {
  const savedTime = formatSavedTime(state.savedAt);
  if (state.status === "saving") return "Saving...";
  if (state.status === "dirty")
    return savedTime ? `Unsaved changes - Last saved ${savedTime}` : "Unsaved changes";
  if (state.status === "error") return `Save failed: ${state.error}`;
  if (state.status === "conflict") return "This update changed elsewhere — reload.";
  return (
    state.message ??
    (savedTime ? `All changes saved - Last saved ${savedTime}` : "All changes saved")
  );
}

export function VisitAutosaveForm({
  projectId,
  visit,
  zones,
  trades,
  canEdit,
}: VisitAutosaveFormProps) {
  const initialFields: VisitAutosaveFields = {
    title: visit.title,
    visitDate: visit.visit_date,
    generalStatus: visit.general_status ?? "",
    humanNotes: visit.human_notes ?? "",
    primaryZoneId: visit.primary_zone_id ?? "",
    primaryTradeId: visit.primary_trade_id ?? "",
  };

  const [fields, setFields] = useState<VisitAutosaveFields>(initialFields);
  const [saveState, setSaveState] = useState<SaveState>({
    status: "saved",
    savedAt: visit.updated_at,
  });
  const latestFieldsRef = useRef(fields);
  const savedSnapshotRef = useRef(serializeFields(initialFields));
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const conflictRef = useRef(false);
  const lastSavedAtRef = useRef(visit.updated_at);

  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  const setField = (name: keyof VisitAutosaveFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  /*
   * Saves are serialized. Each save carries the concurrency token the previous
   * one returned, so two saves on the wire at once would race: the second
   * would echo the token the first is about to replace and be rejected as a
   * conflict that never happened. A save requested while one is in flight
   * queues a re-run that picks up the fresh token and the latest fields.
   */
  const saveCurrentFields = useCallback(async () => {
    if (!canEdit || conflictRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    try {
      do {
        queuedRef.current = false;

        const payload = latestFieldsRef.current;
        if (payload.title.trim().length === 0) {
          setSaveState({
            status: "error",
            error: "Add a title before saving.",
            savedAt: lastSavedAtRef.current,
          });
          return;
        }
        if (payload.visitDate.trim().length === 0) {
          setSaveState({
            status: "error",
            error: "Choose a visit date before saving.",
            savedAt: lastSavedAtRef.current,
          });
          return;
        }

        setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));

        const result = await autosaveVisit({
          projectId,
          visitId: visit.id,
          lastSavedAt: lastSavedAtRef.current,
          ...payload,
        });

        if (!result.ok) {
          if (result.conflict) {
            conflictRef.current = true;
            setSaveState({ status: "conflict", savedAt: lastSavedAtRef.current });
            return;
          }
          setSaveState((current) => ({
            status: "error",
            error: result.error,
            savedAt: current.savedAt,
          }));
          return;
        }

        const savedSnapshot = serializeFields(payload);
        savedSnapshotRef.current = savedSnapshot;
        lastSavedAtRef.current = result.savedAt;

        if (serializeFields(latestFieldsRef.current) === savedSnapshot) {
          setSaveState({
            status: "saved",
            savedAt: result.savedAt,
            message: `Saved just now - Last saved ${formatSavedTime(result.savedAt)}`,
          });
        } else {
          setSaveState({
            status: "dirty",
            savedAt: result.savedAt,
          });
        }
      } while (queuedRef.current);
    } finally {
      inFlightRef.current = false;
    }
  }, [canEdit, projectId, visit.id]);

  useEffect(() => {
    if (!canEdit) return;
    // After a conflict, stop autosaving and keep the reload notice up: every
    // further save would fail against the newer row until the page reloads.
    if (conflictRef.current) return;

    const currentSnapshot = serializeFields(fields);
    if (currentSnapshot === savedSnapshotRef.current) return;

    setSaveState((current) =>
      current.status === "saving" ? current : { status: "dirty", savedAt: current.savedAt },
    );

    const timeout = window.setTimeout(() => {
      void saveCurrentFields();
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [canEdit, fields, saveCurrentFields]);

  return (
    <form
      className="compact-form autosave-form"
      onSubmit={(event) => {
        event.preventDefault();
        void saveCurrentFields();
      }}
    >
      <div className="form-status-row">
        <strong>Site update</strong>
        <span
          className={`save-state ${
            saveState.status === "error" || saveState.status === "conflict" ? "error" : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {saveStateText(saveState)}
        </span>
      </div>

      <label className="field">
        <span>What is happening today?</span>
        <textarea
          value={fields.generalStatus}
          onChange={(event) => setField("generalStatus", event.target.value)}
          rows={3}
          maxLength={240}
          placeholder="For example: kitchen demolition finished and plumbing starts tomorrow."
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>More notes (optional)</span>
        <textarea
          value={fields.humanNotes}
          onChange={(event) => setField("humanNotes", event.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Add anything the project team should know."
          disabled={!canEdit}
        />
      </label>

      <details className="autosave-details">
        <summary>Edit date, title, location or trade</summary>
        <div className="grid two">
          <label className="field">
            <span>Title</span>
            <input
              value={fields.title}
              onChange={(event) => setField("title", event.target.value)}
              required
              maxLength={180}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={fields.visitDate}
              onChange={(event) => setField("visitDate", event.target.value)}
              required
              disabled={!canEdit}
            />
          </label>
        </div>

        <div className="grid two">
          <label className="field">
            <span>Zone (optional)</span>
            <select
              value={fields.primaryZoneId}
              onChange={(event) => setField("primaryZoneId", event.target.value)}
              disabled={!canEdit}
            >
              <option value="">General / several zones</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Trade (optional)</span>
            <select
              value={fields.primaryTradeId}
              onChange={(event) => setField("primaryTradeId", event.target.value)}
              disabled={!canEdit}
            >
              <option value="">General / several trades</option>
              {trades.map((trade) => (
                <option key={trade.id} value={trade.id}>
                  {trade.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {saveState.status === "dirty" || saveState.status === "error" ? (
        <button type="submit" disabled={!canEdit}>
          Save now
        </button>
      ) : null}
    </form>
  );
}
