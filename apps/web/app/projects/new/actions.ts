"use server";

import { redirect } from "next/navigation";

import { projectFormSchema } from "@reforma/core";

import { requireUser } from "../../../lib/auth";

export async function createProject(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();

  const parsed = projectFormSchema.safeParse({
    name: formData.get("name"),
    addressLabel: formData.get("addressLabel"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect(
      `/projects/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  // Atomic: project + owner membership in one transaction (see the Phase 2
  // migration). Runs as the signed-in user under RLS.
  const { data: projectId, error } = await supabase.rpc("create_project_with_owner", {
    p_name: parsed.data.name,
    p_address_label: parsed.data.addressLabel ?? undefined,
    p_description: parsed.data.description ?? undefined,
  });

  if (error) {
    redirect(`/projects/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/projects/${projectId}`);
}
