"use client";

import { useState } from "react";

import { deleteEvidence, saveEvidenceMetadata } from "../actions";

interface SelectOption {
  id: string;
  name: string;
}

interface EvidenceMetadataFormProps {
  projectId: string;
  visitId: string;
  evidence: {
    id: string;
    type: string;
    zone_id: string | null;
    trade_id: string | null;
    manual_note: string | null;
    updated_at: string;
  };
  zones: SelectOption[];
  trades: SelectOption[];
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

export function EvidenceMetadataForm({
  projectId,
  visitId,
  evidence,
  zones,
  trades,
  canEdit,
}: EvidenceMetadataFormProps) {
  const [zoneId, setZoneId] = useState(evidence.zone_id ?? "");
  const [tradeId, setTradeId] = useState(evidence.trade_id ?? "");
  const [manualNote, setManualNote] = useState(evidence.manual_note ?? "");
  const [saveState, setSaveState] = useState<SaveState>({
    status: "saved",
    savedAt: evidence.updated_at,
  });

  return (
    <div className="inline-edit">
      <form
        className="compact-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!canEdit) return;

          setSaveState((current) => ({ status: "saving", savedAt: current.savedAt }));
          const result = await saveEvidenceMetadata({
            projectId,
            visitId,
            evidenceId: evidence.id,
            type: evidence.type,
            zoneId,
            tradeId,
            manualNote,
          });

          if (!result.ok) {
            setSaveState((current) => ({
              status: "error",
              error: result.error,
              savedAt: current.savedAt,
            }));
            return;
          }

          setSaveState({
            status: "saved",
            savedAt: result.savedAt,
            message: `Saved just now - Last saved ${formatSavedTime(result.savedAt)}`,
          });
        }}
      >
        <div className="grid two">
          <label className="field">
            <span>Zone</span>
            <select
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setSaveState((current) =>
                  current.status === "saving"
                    ? current
                    : { status: "dirty", savedAt: current.savedAt },
                );
              }}
              disabled={!canEdit || saveState.status === "saving"}
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
              value={tradeId}
              onChange={(event) => {
                setTradeId(event.target.value);
                setSaveState((current) =>
                  current.status === "saving"
                    ? current
                    : { status: "dirty", savedAt: current.savedAt },
                );
              }}
              disabled={!canEdit || saveState.status === "saving"}
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

        <label className="field">
          <span>Note</span>
          <textarea
            value={manualNote}
            onChange={(event) => {
              setManualNote(event.target.value);
              setSaveState((current) =>
                current.status === "saving"
                  ? current
                  : { status: "dirty", savedAt: current.savedAt },
              );
            }}
            rows={2}
            disabled={!canEdit || saveState.status === "saving"}
          />
        </label>

        <div className="button-row">
          <button type="submit" disabled={!canEdit || saveState.status === "saving"}>
            {saveState.status === "saving" ? "Saving..." : "Save evidence"}
          </button>
          <span
            className={`save-state ${saveState.status === "error" ? "error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveStateText(saveState)}
          </span>
        </div>
      </form>

      {canEdit ? (
        <form action={deleteEvidence}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="visitId" value={visitId} />
          <input type="hidden" name="evidenceId" value={evidence.id} />
          <button type="submit" className="danger">
            Delete evidence
          </button>
        </form>
      ) : null}
    </div>
  );
}
