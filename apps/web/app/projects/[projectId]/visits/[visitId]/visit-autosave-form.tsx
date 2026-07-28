"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { autosaveVisit, type VisitAutosaveInput } from "../actions";

interface SelectOption {
  id: string;
  name: string;
}

type VisitAutosaveFields = Omit<VisitAutosaveInput, "projectId" | "visitId">;

interface VisitAutosaveFormProps {
  projectId: string;
  visit: {
    id: string;
    title: string;
    visit_date: string;
    general_status: string | null;
    human_notes: string | null;
    summary: string | null;
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
  | { status: "error"; error: string; savedAt?: string };

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
    summary: visit.summary ?? "",
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
  const requestIdRef = useRef(0);
  const lastSavedAtRef = useRef(visit.updated_at);

  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  const setField = (name: keyof VisitAutosaveFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const saveCurrentFields = useCallback(async () => {
    if (!canEdit) return;

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

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));

    const result = await autosaveVisit({
      projectId,
      visitId: visit.id,
      ...payload,
    });

    if (requestId !== requestIdRef.current) return;

    if (!result.ok) {
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
  }, [canEdit, projectId, visit.id]);

  useEffect(() => {
    if (!canEdit) return;

    const currentSnapshot = serializeFields(fields);
    if (currentSnapshot === savedSnapshotRef.current) return;

    setSaveState((current) =>
      current.status === "saving" ? current : { status: "dirty", savedAt: current.savedAt },
    );

    const timeout = window.setTimeout(() => {
      void saveCurrentFields();
    }, 1200);

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
        <strong>Visit details</strong>
        <span
          className={`save-state ${saveState.status === "error" ? "error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {saveStateText(saveState)}
        </span>
      </div>

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
          <span>Primary zone (optional)</span>
          <select
            value={fields.primaryZoneId}
            onChange={(event) => setField("primaryZoneId", event.target.value)}
            disabled={!canEdit}
          >
            <option value="">None</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Primary trade (optional)</span>
          <select
            value={fields.primaryTradeId}
            onChange={(event) => setField("primaryTradeId", event.target.value)}
            disabled={!canEdit}
          >
            <option value="">None</option>
            {trades.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Leave both as None for general visits — measuring, demolition or anything spanning several
        areas and trades.
      </p>

      <label className="field">
        <span>General status</span>
        <input
          value={fields.generalStatus}
          onChange={(event) => setField("generalStatus", event.target.value)}
          maxLength={240}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Human notes</span>
        <textarea
          value={fields.humanNotes}
          onChange={(event) => setField("humanNotes", event.target.value)}
          rows={5}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Summary</span>
        <textarea
          value={fields.summary}
          onChange={(event) => setField("summary", event.target.value)}
          rows={4}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>

      <button
        type="submit"
        className="secondary"
        disabled={!canEdit || saveState.status === "saving"}
      >
        {saveState.status === "saving" ? "Saving..." : "Save now"}
      </button>
    </form>
  );
}
