import { PROJECT_ROLES, PROJECT_STATUSES, STAKEHOLDER_TYPES } from "@reforma/core";

import { loadProjectAccess } from "../../../../lib/project-access";
import { ProjectBackLink } from "../project-view-shell";
import {
  addMember,
  deleteProject,
  removeMember,
  updateMemberStakeholderType,
  updateProject,
} from "./actions";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function stakeholderTypeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export default async function ProjectSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const {
    supabase,
    user,
    project,
    role: myRole,
    canManage,
    isOwner,
  } = await loadProjectAccess(projectId);

  const { data: members } = await supabase
    .from("project_members")
    .select("id, role, stakeholder_type, user_id, profiles(email, full_name)")
    .eq("project_id", project.id)
    .order("created_at");

  return (
    <>
      <p>
        <ProjectBackLink
          projectId={project.id}
          fallbackHref={`/projects/${project.id}`}
          fallbackLabel={project.name}
        />
      </p>
      <h1>Project settings</h1>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}

      {!canManage ? (
        <p className="notice error">
          Only project owners and admins can change settings. Your role: {myRole}.
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
        <div className="grid two">
          <label className="field">
            <span>Project start</span>
            <input name="startDate" type="date" defaultValue={project.start_date ?? ""} />
          </label>
          <label className="field">
            <span>Project deadline</span>
            <input name="deadlineDate" type="date" defaultValue={project.deadline_date ?? ""} />
          </label>
        </div>
        <button type="submit" disabled={!canManage}>
          Save changes
        </button>
      </form>

      <div className="card">
        <h2>Members</h2>
        <p className="muted">
          Permission controls access. Project function records the person&apos;s real role in the
          renovation.
        </p>
        <ul className="item-list">
          {(members ?? []).map((member) => (
            <li key={member.id}>
              <div>
                <strong>{member.profiles?.full_name ?? member.profiles?.email}</strong>
                {member.user_id === user.id ? <span className="muted"> (you)</span> : null}
                <div className="muted">{member.profiles?.email}</div>
              </div>
              <div className="member-controls">
                <div className="button-row">
                  <span className={`badge role-${member.role}`}>{member.role}</span>
                  <span className="badge stakeholder-badge">
                    {stakeholderTypeLabel(member.stakeholder_type)}
                  </span>
                </div>
                {canManage ? (
                  <form action={updateMemberStakeholderType} className="member-function-form">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="membershipId" value={member.id} />
                    <label className="field">
                      <span>Project function</span>
                      <select name="stakeholderType" defaultValue={member.stakeholder_type}>
                        {STAKEHOLDER_TYPES.map((stakeholderType) => (
                          <option key={stakeholderType} value={stakeholderType}>
                            {stakeholderTypeLabel(stakeholderType)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="secondary">
                      Update function
                    </button>
                  </form>
                ) : null}
                {canManage && member.user_id !== user.id ? (
                  <form action={removeMember}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="membershipId" value={member.id} />
                    <button type="submit" className="link danger-link">
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
              <span>Permission</span>
              <select name="role" defaultValue="editor">
                {PROJECT_ROLES.filter((role) => role !== "owner" || isOwner).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Project function</span>
              <select name="stakeholderType" defaultValue="site_manager">
                {STAKEHOLDER_TYPES.map((stakeholderType) => (
                  <option key={stakeholderType} value={stakeholderType}>
                    {stakeholderTypeLabel(stakeholderType)}
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
