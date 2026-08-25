import { ChevronRight, ClipboardPenLine, Plus } from "lucide-react";
import Link from "next/link";

import { loadProjectAccess } from "../../../../lib/project-access";
import { ProjectBackLink } from "../project-view-shell";
import { createVisit } from "./actions";

interface VisitsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "draft" ? "In progress" : status === "published" ? "Finished" : status;
  return <span className={`badge status-${status}`}>{label}</span>;
}

export default async function VisitsPage({ params, searchParams }: VisitsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, title, visit_date, status, general_status, updated_at, zones:primary_zone_id(name), trades:primary_trade_id(name), evidence(id)",
    )
    .eq("project_id", project.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <>
      <p>
        <ProjectBackLink
          projectId={project.id}
          fallbackHref={`/projects/${project.id}`}
          fallbackLabel={project.name}
        />
      </p>
      <div className="page-title">
        <div>
          <h1>Site updates</h1>
          <p className="muted">A simple history of what happened on site.</p>
        </div>
        <Link href={`/projects/${project.id}/today`} className="button-link">
          <ClipboardPenLine size={18} aria-hidden="true" /> Today
        </Link>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your project permission is read-only. Owners, admins and editors can add site updates.
        </p>
      ) : null}

      {canEdit ? (
        <details className="manual-update-panel">
          <summary>
            <span>
              <Plus size={18} aria-hidden="true" /> Add an update for another date
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
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
            <input type="hidden" name="primaryZoneId" value="" />
            <input type="hidden" name="primaryTradeId" value="" />
            <input type="hidden" name="generalStatus" value="" />
            <input type="hidden" name="humanNotes" value="" />
            <input type="hidden" name="summary" value="" />
            <button type="submit" disabled={!canEdit}>
              Create site update
            </button>
          </form>
        </details>
      ) : null}

      <section className="card update-log">
        <div className="operator-section-heading">
          <h2>Update history</h2>
          <span className={`badge role-${role}`}>{role}</span>
        </div>
        {(visits ?? []).length === 0 ? (
          <p className="muted">No site updates yet.</p>
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
                    {visit.trades?.name ?? "No trade"} | {visit.evidence?.length ?? 0} photo or file
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
