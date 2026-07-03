import Link from "next/link";
import { notFound } from "next/navigation";

import { EVIDENCE_TYPES } from "@reforma/core";

import { loadProjectAccess } from "../../../../../lib/project-access";
import { VISIT_EVIDENCE_BUCKET } from "../../../../../lib/storage";
import {
  deleteEvidence,
  deleteVisit,
  setVisitStatus,
  updateEvidence,
  updateVisit,
  uploadEvidence,
} from "../actions";

interface VisitPageProps {
  params: Promise<{ projectId: string; visitId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReferenceSelects({
  zones,
  trades,
  defaults,
  disabled,
}: {
  zones: { id: string; name: string }[];
  trades: { id: string; name: string }[];
  defaults?: { zoneId?: string | null; tradeId?: string | null };
  disabled?: boolean;
}) {
  return (
    <div className="grid two">
      <label className="field">
        <span>Zone</span>
        <select name="zoneId" defaultValue={defaults?.zoneId ?? ""} disabled={disabled}>
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
        <select name="tradeId" defaultValue={defaults?.tradeId ?? ""} disabled={disabled}>
          <option value="">None</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EvidencePreview({
  signedUrl,
  type,
  filename,
}: {
  signedUrl: string | null;
  type: string;
  filename: string;
}) {
  if (!signedUrl) return <span className="muted">No signed link</span>;
  if (type === "photo") {
    // Signed Storage URLs are short-lived and user-scoped, so Next Image optimization is not useful here.
    return <img className="evidence-preview" src={signedUrl} alt={filename} />;
  }
  if (type === "audio") {
    return <audio controls src={signedUrl} className="media-control" />;
  }
  if (type === "video") {
    return <video controls src={signedUrl} className="media-control" />;
  }
  return (
    <a href={signedUrl} target="_blank" rel="noreferrer">
      Open file
    </a>
  );
}

export default async function VisitPage({ params, searchParams }: VisitPageProps) {
  const { projectId, visitId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const [{ data: visit }, { data: zones }, { data: trades }, { data: evidence }] =
    await Promise.all([
      supabase
        .from("visits")
        .select(
          "id, title, visit_date, status, general_status, summary, human_notes, primary_zone_id, primary_trade_id, published_at",
        )
        .eq("id", visitId)
        .eq("project_id", project.id)
        .maybeSingle(),
      supabase.from("zones").select("id, name").eq("project_id", project.id).order("name"),
      supabase.from("trades").select("id, name").eq("project_id", project.id).order("name"),
      supabase
        .from("evidence")
        .select(
          "id, type, storage_path, original_filename, mime_type, size_bytes, zone_id, trade_id, manual_note, created_at, zones(name), trades(name)",
        )
        .eq("project_id", project.id)
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false }),
    ]);

  if (!visit) {
    notFound();
  }

  const safeZones = zones ?? [];
  const safeTrades = trades ?? [];
  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (item) => {
      const { data } = await supabase.storage
        .from(VISIT_EVIDENCE_BUCKET)
        .createSignedUrl(item.storage_path, 600);

      return { ...item, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}/visits`}>{"<- Visits"}</Link>
      </p>
      <div className="page-title">
        <div>
          <h1>{visit.title}</h1>
          <p className="muted">{visit.visit_date}</p>
        </div>
        <div>
          <span className={`badge status-${visit.status}`}>{visit.status}</span>{" "}
          <span className={`badge role-${role}`}>{role}</span>
        </div>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can change visits and evidence.
        </p>
      ) : null}

      <section className="card">
        <h2>Visit details</h2>
        <form action={updateVisit} className="compact-form">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="visitId" value={visit.id} />
          <div className="grid two">
            <label className="field">
              <span>Title</span>
              <input
                name="title"
                defaultValue={visit.title}
                required
                maxLength={180}
                disabled={!canEdit}
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                name="visitDate"
                type="date"
                defaultValue={visit.visit_date}
                required
                disabled={!canEdit}
              />
            </label>
          </div>
          <div className="grid two">
            <label className="field">
              <span>Primary zone</span>
              <select
                name="primaryZoneId"
                defaultValue={visit.primary_zone_id ?? ""}
                disabled={!canEdit}
              >
                <option value="">None</option>
                {safeZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Primary trade</span>
              <select
                name="primaryTradeId"
                defaultValue={visit.primary_trade_id ?? ""}
                disabled={!canEdit}
              >
                <option value="">None</option>
                {safeTrades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>General status</span>
            <input
              name="generalStatus"
              defaultValue={visit.general_status ?? ""}
              maxLength={240}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Human notes</span>
            <textarea
              name="humanNotes"
              defaultValue={visit.human_notes ?? ""}
              rows={4}
              maxLength={2000}
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Summary</span>
            <textarea
              name="summary"
              defaultValue={visit.summary ?? ""}
              rows={3}
              maxLength={2000}
              disabled={!canEdit}
            />
          </label>
          <button type="submit" disabled={!canEdit}>
            Save visit
          </button>
        </form>

        {canEdit ? (
          <div className="button-row">
            <form action={setVisitStatus}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="visitId" value={visit.id} />
              <input type="hidden" name="status" value="published" />
              <button type="submit">Publish</button>
            </form>
            <form action={setVisitStatus}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="visitId" value={visit.id} />
              <input type="hidden" name="status" value="archived" />
              <button type="submit" className="secondary">
                Archive
              </button>
            </form>
            <form action={setVisitStatus}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="visitId" value={visit.id} />
              <input type="hidden" name="status" value="draft" />
              <button type="submit" className="secondary">
                Mark draft
              </button>
            </form>
            <form action={deleteVisit}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="visitId" value={visit.id} />
              <button type="submit" className="danger">
                Delete visit
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>Upload evidence</h2>
        <form action={uploadEvidence} encType="multipart/form-data" className="compact-form">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="visitId" value={visit.id} />
          <label className="field">
            <span>File</span>
            <input
              name="file"
              type="file"
              accept="image/*,audio/*,video/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,text/plain,text/csv,application/pdf"
              required
              disabled={!canEdit}
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select name="type" defaultValue="photo" disabled={!canEdit}>
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <ReferenceSelects zones={safeZones} trades={safeTrades} disabled={!canEdit} />
          <label className="field">
            <span>Note</span>
            <textarea name="manualNote" rows={3} maxLength={2000} disabled={!canEdit} />
          </label>
          <button type="submit" disabled={!canEdit}>
            Upload evidence
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Evidence</h2>
        {evidenceWithUrls.length === 0 ? (
          <p className="muted">No evidence yet.</p>
        ) : (
          <ul className="stack-list">
            {evidenceWithUrls.map((item) => (
              <li key={item.id} className="stack-item">
                <div className="split-row">
                  <div>
                    <strong>{item.original_filename}</strong>
                    <div className="muted">
                      {item.type} | {item.mime_type} | {formatBytes(item.size_bytes)} |{" "}
                      {item.zones?.name ?? "No zone"} | {item.trades?.name ?? "No trade"}
                    </div>
                  </div>
                  {item.signedUrl ? (
                    <a href={item.signedUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
                </div>
                <EvidencePreview
                  signedUrl={item.signedUrl}
                  type={item.type}
                  filename={item.original_filename}
                />
                <form action={updateEvidence} className="inline-edit">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="visitId" value={visit.id} />
                  <input type="hidden" name="evidenceId" value={item.id} />
                  <input type="hidden" name="type" value={item.type} />
                  <ReferenceSelects
                    zones={safeZones}
                    trades={safeTrades}
                    defaults={{ zoneId: item.zone_id, tradeId: item.trade_id }}
                    disabled={!canEdit}
                  />
                  <label className="field">
                    <span>Note</span>
                    <textarea
                      name="manualNote"
                      defaultValue={item.manual_note ?? ""}
                      rows={2}
                      disabled={!canEdit}
                    />
                  </label>
                  <div className="button-row">
                    <button type="submit" disabled={!canEdit}>
                      Save evidence
                    </button>
                    {canEdit ? (
                      <button type="submit" formAction={deleteEvidence} className="danger">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
