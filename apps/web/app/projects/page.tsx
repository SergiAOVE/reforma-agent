import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { requireUser } from "../../lib/auth";

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser();

  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("role, stakeholder_type, projects!inner(id, name, address_label, status, updated_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return (
    <>
      <div className="page-title">
        <h1>Your projects</h1>
        <Link href="/projects/new" className="button-link">
          <Plus size={18} aria-hidden="true" /> New project
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="card">
          <p>You have no projects yet.</p>
          <p className="muted">
            Create your first renovation project to start tracking site visits, issues and decisions
            — or ask a project owner to add you with your email address.
          </p>
        </div>
      ) : (
        <ul className="item-list card">
          {memberships.map(({ role, stakeholder_type: stakeholderType, projects: project }) => (
            <li key={project.id}>
              <Link
                className="project-list-link"
                href={
                  stakeholderType === "site_manager"
                    ? `/projects/${project.id}/today`
                    : `/projects/${project.id}`
                }
              >
                <div>
                  <strong>{project.name}</strong>
                  {project.address_label ? (
                    <div className="muted">{project.address_label}</div>
                  ) : null}
                  <div className="muted project-function-label">
                    {stakeholderType.replaceAll("_", " ")}
                    {stakeholderType === "site_manager" ? " · Opens field view" : ""}
                  </div>
                </div>
                <div className="project-list-meta">
                  <span className={`badge role-${role}`}>{role}</span>
                  <span className="badge">{project.status}</span>
                  <ChevronRight size={19} aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
