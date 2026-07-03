import Link from "next/link";
import { notFound } from "next/navigation";

import { PROJECT_ROLES, PROJECT_STATUSES } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";
import { addMember, deleteProject, removeMember, updateProject } from "./actions";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function ProjectSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, address_label, description, status")
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
  const isOwner = myRole === "owner";

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}`}>← {project.name}</Link>
      </p>
      <h1>Project settings</h1>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}

      {!canManage ? (
        <p className="notice error">
          Only project owners and admins can change settings. Your role: {myRole ?? "unknown"}.
        </p>
      ) : null}

      <form action={updateProject} className="card">
        <h2>Details</h2>
        <input type="hidden" name="projectId" value={project.id} />
        <label className="field">
          <span>Project name</span>
          <input name="name" defaultValue={project.name} required maxLength={120} />
        </label>
        <label className="field">
          <span>Address label (a nickname, not the full address)</span>
          <input name="addressLabel" defaultValue={project.address_label ?? ""} maxLength={120} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            defaultValue={project.description ?? ""}
            rows={3}
            maxLength={2000}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={project.status}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!canManage}>
          Save changes
        </button>
      </form>

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
              <div>
                <span className={`badge role-${member.role}`}>{member.role}</span>{" "}
                {canManage && member.user_id !== user.id ? (
                  <form action={removeMember} style={{ display: "inline" }}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="membershipId" value={member.id} />
                    <button type="submit" className="link">
                      Remove
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {canManage ? (
          <form action={addMember}>
            <h3>Add member</h3>
            <p className="muted">
              The person must already have an account (invite them to sign up first).
            </p>
            <input type="hidden" name="projectId" value={project.id} />
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue="editor">
                {PROJECT_ROLES.filter((role) => role !== "owner" || isOwner).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Add member</button>
          </form>
        ) : null}
      </div>

      {isOwner ? (
        <div className="card">
          <h2>Danger zone</h2>
          <p className="muted">
            Deleting a project permanently removes all of its data (visits, evidence metadata,
            issues, decisions). This cannot be undone.
          </p>
          <form action={deleteProject}>
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className="danger">
              Delete project
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
