import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "../../../lib/auth";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const upcoming = [
  { title: "Zones & trades", phase: "Phase 3" },
  { title: "Documents & budget", phase: "Phase 3" },
  { title: "Visits & evidence", phase: "Phase 4" },
  { title: "AI summaries", phase: "Phase 5+" },
];

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const { supabase, user } = await requireUser();

  // RLS: non-members simply get no row back.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, address_label, description, status, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("id, role, user_id, profiles(email, full_name)")
    .eq("project_id", project.id)
    .order("created_at");

  const myRole = members?.find((member) => member.user_id === user.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <>
      <div className="page-title">
        <h1>{project.name}</h1>
        <span className="badge">{project.status}</span>
      </div>
      {project.address_label ? <p className="muted">{project.address_label}</p> : null}
      {project.description ? <p>{project.description}</p> : null}

      <div className="card">
        <h2>Members</h2>
        <ul className="item-list">
          {(members ?? []).map((member) => (
            <li key={member.id}>
              <div>
                <strong>{member.profiles?.full_name ?? member.profiles?.email}</strong>
                {member.user_id === user.id ? <span className="muted"> (you)</span> : null}
                <div className="muted">{member.profiles?.email}</div>
              </div>
              <span className={`badge role-${member.role}`}>{member.role}</span>
            </li>
          ))}
        </ul>
        {canManage ? (
          <p>
            <Link href={`/projects/${project.id}/settings`}>Manage project & members →</Link>
          </p>
        ) : null}
      </div>

      <div className="grid two">
        {upcoming.map((item) => (
          <div className="card" key={item.title}>
            <h2>{item.title}</h2>
            <p className="muted">Coming in {item.phase}.</p>
          </div>
        ))}
      </div>
    </>
  );
}
