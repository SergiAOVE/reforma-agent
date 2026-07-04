import Link from "next/link";

import { loadProjectAccess } from "../../../../lib/project-access";
import { createTrade, createZone } from "./actions";
import { SetupEntityAutosaveForm } from "./setup-entity-autosave-form";

interface ProjectSetupPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function Notice({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="notice error">{error}</p>;
  if (ok) return <p className="notice ok">{ok}</p>;
  return null;
}

export default async function ProjectSetupPage({ params, searchParams }: ProjectSetupPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const [{ data: zones }, { data: trades }] = await Promise.all([
    supabase
      .from("zones")
      .select("id, name, description, sort_order, updated_at")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("trades")
      .select("id, name, description, sort_order, updated_at")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}`}>← {project.name}</Link>
      </p>
      <div className="page-title">
        <div>
          <h1>Project setup</h1>
          <p className="muted">Zones and trades used to organize visits, documents and budget.</p>
        </div>
        <span className={`badge role-${role}`}>{role}</span>
      </div>

      <Notice error={error} ok={ok} />

      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can change setup data.
        </p>
      ) : null}

      <div className="grid two">
        <section className="card">
          <h2>Zones</h2>
          <p className="muted">Rooms or areas, such as kitchen, hallway or main bathroom.</p>
          <form action={createZone} className="compact-form">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="field">
              <span>Name</span>
              <input name="name" required maxLength={120} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea name="description" rows={2} maxLength={2000} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Sort order</span>
              <input
                name="sortOrder"
                type="number"
                min="0"
                max="10000"
                defaultValue="0"
                disabled={!canEdit}
              />
            </label>
            <button type="submit" disabled={!canEdit}>
              Add zone
            </button>
          </form>

          <ul className="stack-list">
            {(zones ?? []).map((zone) => (
              <li key={zone.id} className="stack-item">
                <SetupEntityAutosaveForm
                  projectId={project.id}
                  entity="zone"
                  item={zone}
                  canEdit={canEdit}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Trades</h2>
          <p className="muted">Crafts or disciplines, such as plumbing, electrical or carpentry.</p>
          <form action={createTrade} className="compact-form">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="field">
              <span>Name</span>
              <input name="name" required maxLength={120} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea name="description" rows={2} maxLength={2000} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Sort order</span>
              <input
                name="sortOrder"
                type="number"
                min="0"
                max="10000"
                defaultValue="0"
                disabled={!canEdit}
              />
            </label>
            <button type="submit" disabled={!canEdit}>
              Add trade
            </button>
          </form>

          <ul className="stack-list">
            {(trades ?? []).map((trade) => (
              <li key={trade.id} className="stack-item">
                <SetupEntityAutosaveForm
                  projectId={project.id}
                  entity="trade"
                  item={trade}
                  canEdit={canEdit}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
