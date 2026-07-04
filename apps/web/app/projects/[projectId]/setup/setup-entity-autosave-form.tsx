"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { deleteTrade, deleteZone, saveTrade, saveZone } from "./actions";

type SetupEntityKind = "zone" | "trade";

interface SetupEntityAutosaveFormProps {
  projectId: string;
  entity: SetupEntityKind;
  item: {
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
    updated_at: string;
  };
  canEdit: boolean;
}

interface SetupEntityFields {
  name: string;
  description: string;
  sortOrder: string;
}

type SaveState =
  | { status: "saved"; savedAt?: string; message?: string }
  | { status: "dirty"; savedAt?: string }
  | { status: "saving"; savedAt?: string }
  | { status: "error"; error: string; savedAt?: string };

function serializeFields(fields: SetupEntityFields): string {
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

function entityLabel(entity: SetupEntityKind): string {
  return entity === "zone" ? "Zone" : "Trade";
}

export function SetupEntityAutosaveForm({
  projectId,
  entity,
  item,
  canEdit,
}: SetupEntityAutosaveFormProps) {
  const initialFields: SetupEntityFields = {
    name: item.name,
    description: item.description ?? "",
    sortOrder: String(item.sort_order),
  };
  const [fields, setFields] = useState<SetupEntityFields>(initialFields);
  const [saveState, setSaveState] = useState<SaveState>({
    status: "saved",
    savedAt: item.updated_at,
  });
  const [expanded, setExpanded] = useState(false);
  const latestFieldsRef = useRef(fields);
  const savedSnapshotRef = useRef(serializeFields(initialFields));
  const requestIdRef = useRef(0);
  const lastSavedAtRef = useRef(item.updated_at);
  const panelId = useId();
  const label = entityLabel(entity);
  const saveAction = entity === "zone" ? saveZone : saveTrade;
  const deleteAction = entity === "zone" ? deleteZone : deleteTrade;
  const entityIdFieldName = entity === "zone" ? "zoneId" : "tradeId";
  const isDirty = serializeFields(fields) !== savedSnapshotRef.current;
  const displayName = fields.name.trim() || `Untitled ${entity}`;
  const descriptionPreview = fields.description.trim();

  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  const setField = (name: keyof SetupEntityFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const saveCurrentFields = useCallback(async () => {
    if (!canEdit) return;

    const payload = latestFieldsRef.current;
    if (payload.name.trim().length === 0) {
      setSaveState({
        status: "error",
        error: `Add a ${entity} name before saving.`,
        savedAt: lastSavedAtRef.current,
      });
      return;
    }
    if (payload.sortOrder.trim().length === 0) {
      setSaveState({
        status: "error",
        error: "Add a sort order before saving.",
        savedAt: lastSavedAtRef.current,
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));

    const result = await saveAction({
      projectId,
      entityId: item.id,
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
  }, [canEdit, entity, item.id, projectId, saveAction]);

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
    <div className="setup-entity">
      <button
        type="button"
        className="setup-entity-summary"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="setup-entity-main">
          <strong>{displayName}</strong>
          <span className="muted">
            {label} | Order {fields.sortOrder || "none"}
            {descriptionPreview ? ` | ${descriptionPreview}` : ""}
          </span>
        </span>
        <span className={`save-state ${saveState.status === "error" ? "error" : ""}`}>
          {saveStateText(saveState)}
        </span>
        <span className="setup-entity-toggle">{expanded ? "Collapse" : "Edit"}</span>
      </button>

      <div id={panelId} className="setup-entity-panel" hidden={!expanded}>
        <form
          className="compact-form autosave-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCurrentFields();
          }}
        >
          <label className="field">
            <span>Name</span>
            <input
              value={fields.name}
              onChange={(event) => setField("name", event.target.value)}
              required
              maxLength={120}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              value={fields.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={2}
              maxLength={2000}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Sort order</span>
            <input
              value={fields.sortOrder}
              onChange={(event) => setField("sortOrder", event.target.value)}
              type="number"
              min="0"
              max="10000"
              disabled={!canEdit}
            />
          </label>
          <div className="button-row">
            <button
              type="submit"
              className="secondary"
              disabled={!canEdit || saveState.status === "saving" || !isDirty}
            >
              Save now
            </button>
          </div>
        </form>

        <div className="setup-entity-actions">
          <span
            className={`save-state ${saveState.status === "error" ? "error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveStateText(saveState)}
          </span>
          {canEdit ? (
            <form action={deleteAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name={entityIdFieldName} value={item.id} />
              <button type="submit" className="danger" aria-label={`Delete ${item.name}`}>
                Delete {entity}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
