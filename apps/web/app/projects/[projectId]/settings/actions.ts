"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addMemberSchema, projectSettingsSchema, uuidSchema } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";

function settingsRedirect(projectId: string, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/settings?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

export async function updateProject(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();

  const parsed = projectSettingsSchema.safeParse({
    name: formData.get("name"),
    addressLabel: formData.get("addressLabel"),
    description: formData.get("description"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    settingsRedirect(projectId, {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    });
  }

  // RLS allows updates for owner/admin only; others match 0 rows.
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      address_label: parsed.data.addressLabel,
      description: parsed.data.description,
      status: parsed.data.status,
    })
    .eq("id", projectId)
    .select("id");

  if (error) {
    settingsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    settingsRedirect(projectId, { error: "You do not have permission to update this project." });
  }

  revalidatePath(`/projects/${projectId}`);
  settingsRedirect(projectId, { ok: "Project updated." });
}

export async function addMember(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    settingsRedirect(projectId, {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    });
  }

  // Permission checks (owner/admin, owner-only for owner role) run inside
  // the SQL function — see the Phase 2 migration.
  const { error } = await supabase.rpc("add_project_member_by_email", {
    p_project_id: projectId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) {
    settingsRedirect(projectId, { error: error.message });
  }

  revalidatePath(`/projects/${projectId}`);
  settingsRedirect(projectId, { ok: `Added ${parsed.data.email} as ${parsed.data.role}.` });
}

export async function removeMember(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const membershipParsed = uuidSchema.safeParse(formData.get("membershipId"));
  if (!membershipParsed.success) {
    settingsRedirect(projectId, { error: "Invalid member." });
  }

  const { supabase, user } = await requireUser();

  // RLS: owner/admin may remove members; owner rows only by an owner.
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", membershipParsed.data)
    .eq("project_id", projectId)
    .select("id, user_id, role");

  if (error) {
    settingsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    settingsRedirect(projectId, { error: "You do not have permission to remove this member." });
  }

  const removed = data[0];
  const { error: auditError } = await supabase.from("audit_log").insert({
    project_id: projectId,
    actor_user_id: user.id,
    action: "member.removed",
    entity_type: "project_member",
    entity_id: membershipParsed.data,
    metadata: { removed_user_id: removed?.user_id, role: removed?.role },
  });

  if (auditError) {
    settingsRedirect(projectId, { error: auditError.message });
  }

  revalidatePath(`/projects/${projectId}`);
  settingsRedirect(projectId, { ok: "Member removed." });
}

export async function deleteProject(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();

  // RLS: owner only; everyone else matches 0 rows.
  const { data, error } = await supabase.from("projects").delete().eq("id", projectId).select("id");

  if (error) {
    settingsRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    settingsRedirect(projectId, { error: "Only the project owner can delete a project." });
  }

  redirect("/projects");
}
