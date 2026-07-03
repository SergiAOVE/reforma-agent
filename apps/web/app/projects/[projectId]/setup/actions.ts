"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { uuidSchema, zoneTradeFormSchema } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";

type SetupEntity = "zone" | "trade";

function setupRedirect(projectId: string, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/setup?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

function requireEntityId(formData: FormData, projectId: string, label: string): string {
  const parsed = uuidSchema.safeParse(formData.get(`${label}Id`));
  if (!parsed.success) {
    setupRedirect(projectId, { error: `Invalid ${label}.` });
  }
  return parsed.data;
}

function friendlyMutationError(entity: SetupEntity, message: string): string {
  if (message.includes("duplicate key")) {
    return `A ${entity} with that name already exists in this project.`;
  }
  return message;
}

async function createSetupEntity(formData: FormData, entity: SetupEntity): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();
  const parsed = zoneTradeFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    setupRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const table = entity === "zone" ? "zones" : "trades";
  const { data, error } = await supabase
    .from(table)
    .insert({
      project_id: projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      sort_order: parsed.data.sortOrder,
    })
    .select("id");

  if (error) {
    setupRedirect(projectId, { error: friendlyMutationError(entity, error.message) });
  }
  if (!data || data.length === 0) {
    setupRedirect(projectId, { error: `You do not have permission to create ${entity}s.` });
  }

  revalidatePath(`/projects/${projectId}/setup`);
  setupRedirect(projectId, { ok: `${entity === "zone" ? "Zone" : "Trade"} created.` });
}

async function updateSetupEntity(formData: FormData, entity: SetupEntity): Promise<void> {
  const projectId = requireProjectId(formData);
  const entityId = requireEntityId(formData, projectId, entity);
  const { supabase } = await requireUser();
  const parsed = zoneTradeFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    setupRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const table = entity === "zone" ? "zones" : "trades";
  const { data, error } = await supabase
    .from(table)
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", entityId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    setupRedirect(projectId, { error: friendlyMutationError(entity, error.message) });
  }
  if (!data || data.length === 0) {
    setupRedirect(projectId, { error: `You do not have permission to update this ${entity}.` });
  }

  revalidatePath(`/projects/${projectId}/setup`);
  setupRedirect(projectId, { ok: `${entity === "zone" ? "Zone" : "Trade"} updated.` });
}

async function deleteSetupEntity(formData: FormData, entity: SetupEntity): Promise<void> {
  const projectId = requireProjectId(formData);
  const entityId = requireEntityId(formData, projectId, entity);
  const { supabase } = await requireUser();
  const table = entity === "zone" ? "zones" : "trades";

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", entityId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    setupRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    setupRedirect(projectId, { error: `You do not have permission to delete this ${entity}.` });
  }

  revalidatePath(`/projects/${projectId}/setup`);
  setupRedirect(projectId, { ok: `${entity === "zone" ? "Zone" : "Trade"} deleted.` });
}

export async function createZone(formData: FormData): Promise<void> {
  await createSetupEntity(formData, "zone");
}

export async function updateZone(formData: FormData): Promise<void> {
  await updateSetupEntity(formData, "zone");
}

export async function deleteZone(formData: FormData): Promise<void> {
  await deleteSetupEntity(formData, "zone");
}

export async function createTrade(formData: FormData): Promise<void> {
  await createSetupEntity(formData, "trade");
}

export async function updateTrade(formData: FormData): Promise<void> {
  await updateSetupEntity(formData, "trade");
}

export async function deleteTrade(formData: FormData): Promise<void> {
  await deleteSetupEntity(formData, "trade");
}
