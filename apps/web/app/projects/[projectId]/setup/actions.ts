"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { uuidSchema, zoneTradeFormSchema } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";

type SetupEntity = "zone" | "trade";

export type SaveSetupEntityResult =
  { ok: true; savedAt: string; message: string } | { ok: false; error: string; savedAt?: string };

export interface SaveSetupEntityInput {
  projectId: string;
  entityId: string;
  name: string;
  description: string;
  sortOrder: string;
}

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

function firstValidationMessage(parsed: {
  success: false;
  error: { issues: { message: string }[] };
}) {
  return parsed.error.issues[0]?.message ?? "Invalid input.";
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
    setupRedirect(projectId, { error: firstValidationMessage(parsed) });
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
  const parsed = zoneTradeFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    setupRedirect(projectId, { error: firstValidationMessage(parsed) });
  }

  const result = await persistSetupEntityUpdate(projectId, entityId, entity, {
    name: parsed.data.name,
    description: parsed.data.description,
    sortOrder: parsed.data.sortOrder,
  });

  if (!result.ok) {
    setupRedirect(projectId, { error: result.error });
  }

  setupRedirect(projectId, { ok: result.message });
}

async function persistSetupEntityUpdate(
  projectId: string,
  entityId: string,
  entity: SetupEntity,
  values: {
    name: string;
    description: string | null;
    sortOrder: number;
  },
): Promise<SaveSetupEntityResult> {
  const table = entity === "zone" ? "zones" : "trades";
  const label = entity === "zone" ? "Zone" : "Trade";
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(table)
    .update({
      name: values.name,
      description: values.description,
      sort_order: values.sortOrder,
    })
    .eq("id", entityId)
    .eq("project_id", projectId)
    .select("id, updated_at");

  if (error) {
    return { ok: false, error: friendlyMutationError(entity, error.message) };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: `You do not have permission to update this ${entity}.` };
  }

  revalidatePath(`/projects/${projectId}/setup`);
  return {
    ok: true,
    savedAt: data[0]?.updated_at ?? new Date().toISOString(),
    message: `${label} saved.`,
  };
}

async function saveSetupEntity(
  input: SaveSetupEntityInput,
  entity: SetupEntity,
): Promise<SaveSetupEntityResult> {
  const projectId = uuidSchema.safeParse(input.projectId);
  if (!projectId.success) {
    return { ok: false, error: "Invalid project." };
  }
  const entityId = uuidSchema.safeParse(input.entityId);
  if (!entityId.success) {
    return { ok: false, error: `Invalid ${entity}.` };
  }

  const parsed = zoneTradeFormSchema.safeParse({
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
  });

  if (!parsed.success) {
    return { ok: false, error: firstValidationMessage(parsed) };
  }

  return persistSetupEntityUpdate(projectId.data, entityId.data, entity, {
    name: parsed.data.name,
    description: parsed.data.description,
    sortOrder: parsed.data.sortOrder,
  });
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

export async function saveZone(input: SaveSetupEntityInput): Promise<SaveSetupEntityResult> {
  return saveSetupEntity(input, "zone");
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

export async function saveTrade(input: SaveSetupEntityInput): Promise<SaveSetupEntityResult> {
  return saveSetupEntity(input, "trade");
}

export async function deleteTrade(formData: FormData): Promise<void> {
  await deleteSetupEntity(formData, "trade");
}
