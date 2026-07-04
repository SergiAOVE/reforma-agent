"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { deleteContractItem, saveContractItem } from "./actions";

interface ReferenceOption {
  id: string;
  name: string;
}

interface DocumentOption {
  id: string;
  title: string;
}

interface BudgetItemAutosaveFormProps {
  projectId: string;
  item: {
    id: string;
    source_document_id: string | null;
    code: string | null;
    title: string;
    description: string | null;
    trade_id: string | null;
    zone_id: string | null;
    quantity: number | null;
    unit: string | null;
    unit_price: number | null;
    total_amount: number | null;
    included_excluded: string | null;
    source_page: string | null;
    notes: string | null;
    updated_at: string;
  };
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  documents: DocumentOption[];
  canEdit: boolean;
}

interface BudgetItemFields {
  code: string;
  title: string;
  description: string;
  tradeId: string;
  zoneId: string;
  sourceDocumentId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalAmount: string;
  includedExcluded: string;
  sourcePage: string;
  notes: string;
}

type SaveState =
  | { status: "saved"; savedAt?: string; message?: string }
  | { status: "dirty"; savedAt?: string }
  | { status: "saving"; savedAt?: string }
  | { status: "error"; error: string; savedAt?: string };

function serializeFields(fields: BudgetItemFields): string {
  return JSON.stringify(fields);
}

function numberField(value: number | null): string {
  return value === null ? "" : String(value);
}

function money(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function numberFromInput(value: string): number | null {
  if (value.trim().length === 0) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

function referenceName(options: ReferenceOption[], id: string, fallback: string): string {
  if (!id) return fallback;
  return options.find((option) => option.id === id)?.name ?? fallback;
}

function documentTitle(options: DocumentOption[], id: string): string {
  if (!id) return "No source document";
  return options.find((option) => option.id === id)?.title ?? "No source document";
}

export function BudgetItemAutosaveForm({
  projectId,
  item,
  zones,
  trades,
  documents,
  canEdit,
}: BudgetItemAutosaveFormProps) {
  const initialFields: BudgetItemFields = {
    code: item.code ?? "",
    title: item.title,
    description: item.description ?? "",
    tradeId: item.trade_id ?? "",
    zoneId: item.zone_id ?? "",
    sourceDocumentId: item.source_document_id ?? "",
    quantity: numberField(item.quantity),
    unit: item.unit ?? "",
    unitPrice: numberField(item.unit_price),
    totalAmount: numberField(item.total_amount),
    includedExcluded: item.included_excluded ?? "",
    sourcePage: item.source_page ?? "",
    notes: item.notes ?? "",
  };
  const [fields, setFields] = useState<BudgetItemFields>(initialFields);
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
  const isDirty = serializeFields(fields) !== savedSnapshotRef.current;
  const displayTitle = fields.title.trim() || "Untitled budget item";
  const displayCode = fields.code.trim();
  const displayTotal = money(numberFromInput(fields.totalAmount));
  const displayTrade = referenceName(trades, fields.tradeId, "No trade");
  const displayZone = referenceName(zones, fields.zoneId, "No zone");
  const displayDocument = documentTitle(documents, fields.sourceDocumentId);

  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  const setField = (name: keyof BudgetItemFields, value: string) => {
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

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));

    const result = await saveContractItem({
      projectId,
      contractItemId: item.id,
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
  }, [canEdit, item.id, projectId]);

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
    <div className="budget-item">
      <button
        type="button"
        className="budget-item-summary"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="budget-item-main">
          <strong>
            {displayCode ? `${displayCode} | ` : ""}
            {displayTitle}
          </strong>
          <span className="muted">
            {displayTrade} | {displayZone} | {displayDocument}
          </span>
        </span>
        <span className={`save-state ${saveState.status === "error" ? "error" : ""}`}>
          {saveStateText(saveState)}
        </span>
        <span className="badge">{displayTotal}</span>
        <span className="budget-item-toggle">
          {expanded ? "Collapse" : canEdit ? "Edit" : "View"}
        </span>
      </button>

      <div id={panelId} className="budget-item-panel" hidden={!expanded}>
        <form
          className="compact-form autosave-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCurrentFields();
          }}
        >
          <div className="grid two">
            <label className="field">
              <span>Code</span>
              <input
                value={fields.code}
                onChange={(event) => setField("code", event.target.value)}
                maxLength={240}
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Title</span>
              <input
                value={fields.title}
                onChange={(event) => setField("title", event.target.value)}
                required
                maxLength={220}
                disabled={!canEdit}
              />
            </label>
          </div>
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
          <div className="grid three">
            <label className="field">
              <span>Zone</span>
              <select
                value={fields.zoneId}
                onChange={(event) => setField("zoneId", event.target.value)}
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
              <span>Trade</span>
              <select
                value={fields.tradeId}
                onChange={(event) => setField("tradeId", event.target.value)}
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
            <label className="field">
              <span>Source document</span>
              <select
                value={fields.sourceDocumentId}
                onChange={(event) => setField("sourceDocumentId", event.target.value)}
                disabled={!canEdit}
              >
                <option value="">None</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid three">
            <label className="field">
              <span>Quantity</span>
              <input
                value={fields.quantity}
                onChange={(event) => setField("quantity", event.target.value)}
                type="number"
                step="0.01"
                min="0"
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Unit</span>
              <input
                value={fields.unit}
                onChange={(event) => setField("unit", event.target.value)}
                maxLength={240}
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Unit price</span>
              <input
                value={fields.unitPrice}
                onChange={(event) => setField("unitPrice", event.target.value)}
                type="number"
                step="0.01"
                min="0"
                disabled={!canEdit}
              />
            </label>
          </div>
          <div className="grid three">
            <label className="field">
              <span>Total amount</span>
              <input
                value={fields.totalAmount}
                onChange={(event) => setField("totalAmount", event.target.value)}
                type="number"
                step="0.01"
                min="0"
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Included/excluded</span>
              <input
                value={fields.includedExcluded}
                onChange={(event) => setField("includedExcluded", event.target.value)}
                maxLength={240}
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Source page</span>
              <input
                value={fields.sourcePage}
                onChange={(event) => setField("sourcePage", event.target.value)}
                maxLength={240}
                disabled={!canEdit}
              />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              value={fields.notes}
              onChange={(event) => setField("notes", event.target.value)}
              rows={2}
              maxLength={2000}
              disabled={!canEdit}
            />
          </label>
          <div className="button-row">
            <button
              type="submit"
              className="secondary"
              disabled={!canEdit || saveState.status === "saving" || !isDirty}
            >
              {saveState.status === "saving" ? "Saving..." : "Save now"}
            </button>
          </div>
        </form>

        <div className="budget-item-actions">
          <span
            className={`save-state ${saveState.status === "error" ? "error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveStateText(saveState)}
          </span>
          {canEdit ? (
            <form action={deleteContractItem}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contractItemId" value={item.id} />
              <button type="submit" className="danger" aria-label={`Delete ${item.title}`}>
                Delete item
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
