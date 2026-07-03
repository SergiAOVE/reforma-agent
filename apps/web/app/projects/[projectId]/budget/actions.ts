"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { contractItemFormSchema, parseBudgetCsv, uuidSchema } from "@reforma/core";

import { requireUser } from "../../../../lib/auth";

function budgetRedirect(projectId: string, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  redirect(`/projects/${projectId}/budget?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

function requireContractItemId(formData: FormData, projectId: string): string {
  const parsed = uuidSchema.safeParse(formData.get("contractItemId"));
  if (!parsed.success) {
    budgetRedirect(projectId, { error: "Invalid budget line item." });
  }
  return parsed.data;
}

function readContractItemForm(formData: FormData) {
  return contractItemFormSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description"),
    tradeId: formData.get("tradeId"),
    zoneId: formData.get("zoneId"),
    sourceDocumentId: formData.get("sourceDocumentId"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    unitPrice: formData.get("unitPrice"),
    totalAmount: formData.get("totalAmount"),
    includedExcluded: formData.get("includedExcluded"),
    sourcePage: formData.get("sourcePage"),
    notes: formData.get("notes"),
  });
}

function toContractItemInsert(
  projectId: string,
  data: ReturnType<typeof contractItemFormSchema.parse>,
) {
  return {
    project_id: projectId,
    source_document_id: data.sourceDocumentId,
    code: data.code,
    title: data.title,
    description: data.description,
    trade_id: data.tradeId,
    zone_id: data.zoneId,
    quantity: data.quantity,
    unit: data.unit,
    unit_price: data.unitPrice,
    total_amount: data.totalAmount,
    included_excluded: data.includedExcluded,
    source_page: data.sourcePage,
    notes: data.notes,
  };
}

export async function createContractItem(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();
  const parsed = readContractItemForm(formData);

  if (!parsed.success) {
    budgetRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const { data, error } = await supabase
    .from("contract_items")
    .insert(toContractItemInsert(projectId, parsed.data))
    .select("id");

  if (error) {
    budgetRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    budgetRedirect(projectId, { error: "You do not have permission to add budget items." });
  }

  revalidatePath(`/projects/${projectId}/budget`);
  budgetRedirect(projectId, { ok: "Budget item created." });
}

export async function updateContractItem(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const contractItemId = requireContractItemId(formData, projectId);
  const { supabase } = await requireUser();
  const parsed = readContractItemForm(formData);

  if (!parsed.success) {
    budgetRedirect(projectId, { error: parsed.error.issues[0]?.message ?? "Invalid input." });
  }

  const { data, error } = await supabase
    .from("contract_items")
    .update(toContractItemInsert(projectId, parsed.data))
    .eq("id", contractItemId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    budgetRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    budgetRedirect(projectId, { error: "You do not have permission to update this budget item." });
  }

  revalidatePath(`/projects/${projectId}/budget`);
  budgetRedirect(projectId, { ok: "Budget item updated." });
}

export async function deleteContractItem(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const contractItemId = requireContractItemId(formData, projectId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("contract_items")
    .delete()
    .eq("id", contractItemId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    budgetRedirect(projectId, { error: error.message });
  }
  if (!data || data.length === 0) {
    budgetRedirect(projectId, { error: "You do not have permission to delete this budget item." });
  }

  revalidatePath(`/projects/${projectId}/budget`);
  budgetRedirect(projectId, { ok: "Budget item deleted." });
}

function getCsvFile(formData: FormData, projectId: string): File {
  const value = formData.get("csv");
  if (!(value instanceof File) || value.size === 0) {
    budgetRedirect(projectId, { error: "Choose a CSV file to import." });
  }
  if (value.size > 512 * 1024) {
    budgetRedirect(projectId, { error: "CSV imports must be 512 KB or smaller." });
  }
  return value;
}

function summarizeImportErrors(errors: string[]): string {
  const visible = errors.slice(0, 5);
  const suffix = errors.length > visible.length ? ` (${errors.length - visible.length} more)` : "";
  return `CSV import failed: ${visible.join(" | ")}${suffix}`;
}

export async function importContractItemsCsv(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const { supabase } = await requireUser();
  const file = getCsvFile(formData, projectId);
  const sourceDocumentId = contractItemFormSchema.shape.sourceDocumentId.parse(
    formData.get("sourceDocumentId"),
  );
  const parsed = parseBudgetCsv(await file.text());
  const errors = [...parsed.errors];

  const [{ data: zones }, { data: trades }] = await Promise.all([
    supabase.from("zones").select("id, name").eq("project_id", projectId),
    supabase.from("trades").select("id, name").eq("project_id", projectId),
  ]);

  const zoneIdsByName = new Map((zones ?? []).map((zone) => [zone.name.toLowerCase(), zone.id]));
  const tradeIdsByName = new Map(
    (trades ?? []).map((trade) => [trade.name.toLowerCase(), trade.id]),
  );

  const rows = parsed.items.map((item) => {
    const zoneId = item.zone ? zoneIdsByName.get(item.zone.toLowerCase()) : null;
    const tradeId = item.trade ? tradeIdsByName.get(item.trade.toLowerCase()) : null;

    if (item.zone && !zoneId) {
      errors.push(`Row ${item.rowNumber}: unknown zone "${item.zone}".`);
    }
    if (item.trade && !tradeId) {
      errors.push(`Row ${item.rowNumber}: unknown trade "${item.trade}".`);
    }

    return {
      project_id: projectId,
      source_document_id: sourceDocumentId,
      code: item.code,
      title: item.title,
      description: item.description,
      trade_id: tradeId ?? null,
      zone_id: zoneId ?? null,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      included_excluded: item.included_excluded,
      source_page: item.source_page,
      notes: item.notes,
    };
  });

  if (errors.length > 0) {
    budgetRedirect(projectId, { error: summarizeImportErrors(errors) });
  }
  if (rows.length === 0) {
    budgetRedirect(projectId, { error: "CSV has no importable line items." });
  }

  const { data, error } = await supabase.from("contract_items").insert(rows).select("id");

  if (error) {
    budgetRedirect(projectId, { error: error.message });
  }
  if (!data || data.length !== rows.length) {
    budgetRedirect(projectId, { error: "You do not have permission to import budget items." });
  }

  revalidatePath(`/projects/${projectId}/budget`);
  budgetRedirect(projectId, { ok: `Imported ${rows.length} budget item(s).` });
}
