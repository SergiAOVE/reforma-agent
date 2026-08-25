"use server";

import { redirect } from "next/navigation";

import { siteUpdateStartSchema, type SiteUpdateStartInput } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function siteUpdateTitle(date: string): string {
  const label = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));

  return `Site update - ${label}`;
}

function destinationHash(destination: SiteUpdateStartInput["destination"]): string {
  if (destination === "files") return "files";
  if (destination === "issue") return "new-issue";
  if (destination === "decision") return "new-decision";
  return "update";
}

function todayErrorRedirect(projectId: string, message: string): never {
  const query = new URLSearchParams({ error: message });
  redirect(`/projects/${projectId}/today?${query.toString()}`);
}

export async function startOrResumeSiteUpdate(formData: FormData): Promise<void> {
  const parsed = siteUpdateStartSchema.safeParse({
    projectId: formData.get("projectId"),
    destination: formData.get("destination") || undefined,
  });

  if (!parsed.success) {
    redirect("/projects");
  }

  const { projectId, destination } = parsed.data;
  const { supabase, user } = await requireUser();
  const date = todayIsoDate();
  const { data: existingDraft, error: draftError } = await supabase
    .from("visits")
    .select("id")
    .eq("project_id", projectId)
    .eq("created_by", user.id)
    .eq("visit_date", date)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftError) {
    todayErrorRedirect(projectId, draftError.message);
  }

  let visitId = existingDraft?.id;

  if (!visitId) {
    const { data, error } = await supabase
      .from("visits")
      .insert({
        project_id: projectId,
        title: siteUpdateTitle(date),
        visit_date: date,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      todayErrorRedirect(
        projectId,
        error?.message ?? "You do not have permission to start a site update.",
      );
    }

    visitId = data.id;
  }

  redirect(`/projects/${projectId}/visits/${visitId}#${destinationHash(destination)}`);
}
