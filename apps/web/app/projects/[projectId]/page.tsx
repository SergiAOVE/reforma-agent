import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "../../../lib/auth";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

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

  const [
    { count: zoneCount },
    { count: tradeCount },
    { count: documentCount },
    { count: itemCount },
  ] = await Promise.all([
    supabase
      .from("zones")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("contract_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
  ]);

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
        <Link className="card nav-card" href={`/projects/${project.id}/setup`}>
          <h2>Zones & trades</h2>
          <p className="muted">
            {zoneCount ?? 0} zones · {tradeCount ?? 0} trades
          </p>
        </Link>
        <Link className="card nav-card" href={`/projects/${project.id}/documents`}>
          <h2>Documents</h2>
          <p className="muted">{documentCount ?? 0} private documents</p>
        </Link>
        <Link className="card nav-card" href={`/projects/${project.id}/budget`}>
          <h2>Budget items</h2>
          <p className="muted">{itemCount ?? 0} contract line items</p>
        </Link>
        <div className="card">
          <h2>Visits & evidence</h2>
          <p className="muted">Coming in Phase 4.</p>
        </div>
        <div className="card">
          <h2>AI summaries</h2>
          <p className="muted">Coming in Phase 5+.</p>
        </div>
      </div>
    </>
  );
}
