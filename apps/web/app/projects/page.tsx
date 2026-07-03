import Link from "next/link";

import { requireUser } from "../../lib/auth";

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser();

  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("role, projects!inner(id, name, address_label, status, updated_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return (
    <>
      <div className="page-title">
        <h1>Your projects</h1>
        <Link href="/projects/new">
          <button type="button">New project</button>
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
          {memberships.map(({ role, projects: project }) => (
            <li key={project.id}>
              <div>
                <Link href={`/projects/${project.id}`}>
                  <strong>{project.name}</strong>
                </Link>
                {project.address_label ? (
                  <div className="muted">{project.address_label}</div>
                ) : null}
              </div>
              <div>
                <span className={`badge role-${role}`}>{role}</span>{" "}
                <span className="badge">{project.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
