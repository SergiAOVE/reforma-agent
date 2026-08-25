import { notFound } from "next/navigation";
import { cache } from "react";

import type { ProjectRole, StakeholderType } from "@reforma/core";

import { requireUser, type AuthContext } from "./auth";

export interface ProjectAccess extends AuthContext {
  project: {
    id: string;
    name: string;
    address_label: string | null;
    description: string | null;
    status: "active" | "paused" | "completed" | "archived";
    created_at?: string;
    start_date: string | null;
    deadline_date: string | null;
  };
  role: ProjectRole;
  stakeholderType: StakeholderType;
  canEdit: boolean;
  canManage: boolean;
  isOwner: boolean;
}

export function canEditRole(role: ProjectRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canManageRole(role: ProjectRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export const loadProjectAccess = cache(async function loadProjectAccess(
  projectId: string,
): Promise<ProjectAccess> {
  const context = await requireUser();
  const { supabase, user } = context;

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, address_label, description, status, created_at, start_date, deadline_date",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role, stakeholder_type")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  return {
    ...context,
    project,
    role: membership.role,
    stakeholderType: membership.stakeholder_type,
    canEdit: canEditRole(membership.role),
    canManage: canManageRole(membership.role),
    isOwner: membership.role === "owner",
  };
});
