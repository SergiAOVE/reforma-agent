import Link from "next/link";

import { loadProjectAccess } from "../../../../lib/project-access";
import { createVisit } from "./actions";

interface VisitsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{status}</span>;
}

export default async function VisitsPage({ params, searchParams }: VisitsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const [{ data: visits }, { data: zones }, { data: trades }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, title, visit_date, status, general_status, updated_at, zones:primary_zone_id(name), trades:primary_trade_id(name), evidence(id)",
      )
      .eq("project_id", project.id)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("zones").select("id, name").eq("project_id", project.id).order("name"),
    supabase.from("trades").select("id, name").eq("project_id", project.id).order("name"),
  ]);

  const safeZones = zones ?? [];
  const safeTrades = trades ?? [];

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}`}>
          {"<-"} {project.name}
        </Link>
      </p>
      <div className="page-title">
        <div>
          <h1>Visits</h1>
          <p className="muted">Create site visits and attach evidence files.</p>
        </div>
        <span className={`badge role-${role}`}>{role}</span>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can create visits.
        </p>
      ) : null}

      <section className="card">
        <h2>New visit</h2>
        <form action={createVisit} className="compact-form">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="grid two">
            <label className="field">
              <span>Title</span>
              <input name="title" required maxLength={180} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                name="visitDate"
                type="date"
                defaultValue={todayIsoDate()}
                required
                disabled={!canEdit}
              />
            </label>
          </div>
          <div className="grid two">
            <label className="field">
              <span>Primary zone (optional)</span>
              <select name="primaryZoneId" disabled={!canEdit}>
                <option value="">None</option>
                {safeZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Primary trade (optional)</span>
              <select name="primaryTradeId" disabled={!canEdit}>
                <option value="">None</option>
                {safeTrades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">
            Leave both as None for general visits — measuring, demolition or anything spanning
            several areas and trades.
          </p>
          <label className="field">
            <span>General status</span>
            <input name="generalStatus" maxLength={240} disabled={!canEdit} />
          </label>
          <label className="field">
            <span>Human notes</span>
            <textarea name="humanNotes" rows={3} maxLength={2000} disabled={!canEdit} />
          </label>
          <input type="hidden" name="summary" value="" />
          <button type="submit" disabled={!canEdit}>
            Create visit
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Visit log</h2>
        {(visits ?? []).length === 0 ? (
          <p className="muted">No visits yet.</p>
        ) : (
          <ul className="item-list">
            {(visits ?? []).map((visit) => (
              <li key={visit.id}>
                <div>
                  <Link href={`/projects/${project.id}/visits/${visit.id}`}>
                    <strong>{visit.title}</strong>
                  </Link>
                  <div className="muted">
                    {visit.visit_date} | {visit.zones?.name ?? "No zone"} |{" "}
                    {visit.trades?.name ?? "No trade"} | {visit.evidence?.length ?? 0} evidence
                    item(s)
                  </div>
                  {visit.general_status ? (
                    <div className="muted">{visit.general_status}</div>
                  ) : null}
                </div>
                <StatusBadge status={visit.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
