import { z } from "zod";

import {
  documentTypeSchema,
  evidenceTypeSchema,
  projectRoleSchema,
  projectStatusSchema,
  prioritySchema,
  visitStatusSchema,
  stakeholderTypeSchema,
} from "./enums";
import { isoDateSchema, nonEmptyStringSchema, uuidSchema } from "./validators";

/**
 * Form schemas shared by the web UI (client hints) and server actions
 * (authoritative validation). RLS remains the final enforcement layer.
 */

const optionalTrimmedText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

const shortOptionalTrimmedText = z
  .string()
  .trim()
  .max(240)
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

const nullableUuidSchema = z
  .union([uuidSchema, z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

const nullableIsoDateSchema = z
  .union([isoDateSchema, z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

const nullableDecimalSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return Number(value.trim().replace(",", "."));
  return value;
}, z.number().finite().nonnegative().nullable());

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "password must be at least 6 characters"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  fullName: nonEmptyStringSchema.max(120),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const projectFormSchema = z.object({
  name: nonEmptyStringSchema.max(120),
  addressLabel: optionalTrimmedText,
  description: optionalTrimmedText,
});
export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const projectSettingsSchema = projectFormSchema
  .extend({
    status: projectStatusSchema,
    startDate: nullableIsoDateSchema,
    deadlineDate: nullableIsoDateSchema,
  })
  .refine(
    (value) =>
      value.startDate === null ||
      value.deadlineDate === null ||
      value.startDate <= value.deadlineDate,
    {
      message: "Project deadline must be on or after the project start date.",
      path: ["deadlineDate"],
    },
  );
export type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>;

export const addMemberSchema = z.object({
  email: z.string().trim().email(),
  role: projectRoleSchema,
  stakeholderType: stakeholderTypeSchema,
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberStakeholderSchema = z.object({
  membershipId: uuidSchema,
  stakeholderType: stakeholderTypeSchema,
});
export type UpdateMemberStakeholderInput = z.infer<typeof updateMemberStakeholderSchema>;

export const zoneTradeFormSchema = z.object({
  name: nonEmptyStringSchema.max(120),
  description: optionalTrimmedText,
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});
export type ZoneTradeFormInput = z.infer<typeof zoneTradeFormSchema>;

export const documentMetadataSchema = z.object({
  type: documentTypeSchema,
  title: nonEmptyStringSchema.max(180),
  notes: optionalTrimmedText,
});
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

export const contractItemFormSchema = z.object({
  code: shortOptionalTrimmedText,
  title: nonEmptyStringSchema.max(220),
  description: optionalTrimmedText,
  tradeId: nullableUuidSchema,
  zoneId: nullableUuidSchema,
  sourceDocumentId: nullableUuidSchema,
  quantity: nullableDecimalSchema,
  unit: shortOptionalTrimmedText,
  unitPrice: nullableDecimalSchema,
  totalAmount: nullableDecimalSchema,
  includedExcluded: shortOptionalTrimmedText,
  sourcePage: shortOptionalTrimmedText,
  notes: optionalTrimmedText,
});
export type ContractItemFormInput = z.infer<typeof contractItemFormSchema>;

export const visitFormSchema = z.object({
  title: nonEmptyStringSchema.max(180),
  visitDate: isoDateSchema,
  generalStatus: shortOptionalTrimmedText,
  summary: optionalTrimmedText,
  humanNotes: optionalTrimmedText,
  primaryZoneId: nullableUuidSchema,
  primaryTradeId: nullableUuidSchema,
});
export type VisitFormInput = z.infer<typeof visitFormSchema>;

/**
 * The visit autosave boundary: the visit form minus `summary`. A visit summary
 * is review-managed content — the worker writes AI drafts and the explicit
 * summary review action approves, edits or rejects them — so autosave must not
 * carry it. Zod strips unknown keys, which also covers stale clients that
 * still post `summary`: the field is dropped here instead of turning a note
 * save into a review (see docs/en/11-field-redesign-integration.md).
 */
export const visitAutosaveFieldsSchema = visitFormSchema.omit({ summary: true });
export type VisitAutosaveFieldsInput = z.infer<typeof visitAutosaveFieldsSchema>;

/**
 * The autosave concurrency token: `visits.updated_at` exactly as the server
 * last returned it. Opaque to clients — the database compares it against the
 * current row, so it must be echoed verbatim, never reformatted.
 */
export const visitAutosaveTokenSchema = nonEmptyStringSchema.max(64);

export const SITE_UPDATE_DESTINATIONS = ["update", "files", "issue", "decision"] as const;
export const siteUpdateStartSchema = z.object({
  projectId: uuidSchema,
  destination: z.enum(SITE_UPDATE_DESTINATIONS).default("update"),
});
export type SiteUpdateStartInput = z.infer<typeof siteUpdateStartSchema>;

export const visitStatusTransitionSchema = z.object({
  status: visitStatusSchema,
});
export type VisitStatusTransitionInput = z.infer<typeof visitStatusTransitionSchema>;

export const issueStatusTransitionSchema = z.object({
  status: z.enum(["open", "closed"]),
});
export type IssueStatusTransitionInput = z.infer<typeof issueStatusTransitionSchema>;

export const evidenceMetadataSchema = z.object({
  type: evidenceTypeSchema,
  zoneId: nullableUuidSchema,
  tradeId: nullableUuidSchema,
  manualNote: optionalTrimmedText,
});
export type EvidenceMetadataInput = z.infer<typeof evidenceMetadataSchema>;

export const audioTranscriptionEditSchema = z.object({
  editedTranscript: optionalTrimmedText,
});
export type AudioTranscriptionEditInput = z.infer<typeof audioTranscriptionEditSchema>;

export const summaryReviewActionSchema = z.enum(["approve", "edit", "reject"]);
export type SummaryReviewAction = z.infer<typeof summaryReviewActionSchema>;

export const summaryReviewFormSchema = z.object({
  action: summaryReviewActionSchema,
  summary: optionalTrimmedText,
});
export type SummaryReviewFormInput = z.infer<typeof summaryReviewFormSchema>;

export const weeklySummaryRequestSchema = z
  .object({
    weekStart: isoDateSchema,
    weekEnd: isoDateSchema,
  })
  .refine((value) => value.weekStart <= value.weekEnd, {
    message: "Week start must be on or before week end.",
    path: ["weekEnd"],
  });
export type WeeklySummaryRequestInput = z.infer<typeof weeklySummaryRequestSchema>;

export const weeklySummaryReviewActionSchema = z.enum(["approve", "edit", "reject"]);
export type WeeklySummaryReviewAction = z.infer<typeof weeklySummaryReviewActionSchema>;

export const weeklySummaryReviewFormSchema = z.object({
  action: weeklySummaryReviewActionSchema,
  title: nonEmptyStringSchema.max(180),
  summary: optionalTrimmedText,
});
export type WeeklySummaryReviewFormInput = z.infer<typeof weeklySummaryReviewFormSchema>;

export const issueReviewActionSchema = z.enum(["approve", "edit", "reject", "close"]);
export type IssueReviewAction = z.infer<typeof issueReviewActionSchema>;

export const issueReviewFormSchema = z.object({
  action: issueReviewActionSchema,
  title: nonEmptyStringSchema.max(220),
  description: optionalTrimmedText,
  priority: prioritySchema,
  zoneId: nullableUuidSchema,
  tradeId: nullableUuidSchema,
  contractItemId: nullableUuidSchema,
  responsibleUserId: nullableUuidSchema,
  approverUserId: nullableUuidSchema,
  costRisk: shortOptionalTrimmedText,
  scheduleRisk: shortOptionalTrimmedText,
});
export type IssueReviewFormInput = z.infer<typeof issueReviewFormSchema>;

export const issueCreateFormSchema = issueReviewFormSchema
  .omit({ action: true })
  .extend({ visitId: nullableUuidSchema });
export type IssueCreateFormInput = z.infer<typeof issueCreateFormSchema>;

export const decisionReviewActionSchema = z.enum(["approve", "edit", "reject", "close"]);
export type DecisionReviewAction = z.infer<typeof decisionReviewActionSchema>;

export const decisionReviewFormSchema = z.object({
  action: decisionReviewActionSchema,
  title: nonEmptyStringSchema.max(220),
  description: optionalTrimmedText,
  priority: prioritySchema,
  zoneId: nullableUuidSchema,
  tradeId: nullableUuidSchema,
  responsibleUserId: nullableUuidSchema,
  approverUserId: nullableUuidSchema,
  deadline: z
    .union([isoDateSchema, z.literal("")])
    .nullish()
    .transform((value) => (value ? value : null)),
  optionsText: optionalTrimmedText,
  recommendation: optionalTrimmedText,
  costImpact: shortOptionalTrimmedText,
  scheduleImpact: shortOptionalTrimmedText,
});
export type DecisionReviewFormInput = z.infer<typeof decisionReviewFormSchema>;

export const decisionCreateFormSchema = decisionReviewFormSchema
  .omit({ action: true })
  .extend({ visitId: nullableUuidSchema });
export type DecisionCreateFormInput = z.infer<typeof decisionCreateFormSchema>;

export function evidenceTypeFromMimeType(mimeType: string): z.infer<typeof evidenceTypeSchema> {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function evidenceMimeTypeMatchesType(
  mimeType: string,
  type: z.infer<typeof evidenceTypeSchema>,
): boolean {
  return evidenceTypeFromMimeType(mimeType) === type;
}

const csvOptionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .optional()
  .transform((value) => value ?? null);

const csvDecimal = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value.length === 0) return null;
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({
        code: "custom",
        message: "expected a non-negative number",
      });
      return z.NEVER;
    }
    return parsed;
  })
  .optional()
  .transform((value) => value ?? null);

export const contractItemCsvRowSchema = z.object({
  code: csvOptionalText,
  title: nonEmptyStringSchema.max(220),
  description: csvOptionalText,
  trade: csvOptionalText,
  zone: csvOptionalText,
  quantity: csvDecimal,
  unit: csvOptionalText,
  unit_price: csvDecimal,
  total_amount: csvDecimal,
  included_excluded: csvOptionalText,
  source_page: csvOptionalText,
  notes: csvOptionalText,
});
export type ContractItemCsvRow = z.infer<typeof contractItemCsvRowSchema>;
export type ContractItemCsvImportRow = ContractItemCsvRow & { rowNumber: number };

export interface BudgetCsvImportResult {
  items: ContractItemCsvImportRow[];
  errors: string[];
}

const budgetCsvHeaders = [
  "code",
  "title",
  "description",
  "trade",
  "zone",
  "quantity",
  "unit",
  "unit_price",
  "total_amount",
  "included_excluded",
  "source_page",
  "notes",
] as const;

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export function parseBudgetCsv(input: string): BudgetCsvImportResult {
  const lines = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { items: [], errors: ["CSV is empty."] };
  }

  const headers = splitCsvLine(lines[0] ?? "").map(normalizeHeader);
  const unknownHeaders = headers.filter(
    (header) => !(budgetCsvHeaders as readonly string[]).includes(header),
  );
  const errors: string[] = [];

  if (!headers.includes("title")) {
    errors.push("Missing required header: title.");
  }

  if (unknownHeaders.length > 0) {
    errors.push(`Unknown header(s): ${unknownHeaders.join(", ")}.`);
  }

  if (errors.length > 0) {
    return { items: [], errors };
  }

  const items: ContractItemCsvImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const cells = splitCsvLine(lines[lineIndex] ?? "");
    const rawRow = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const parsed = contractItemCsvRowSchema.safeParse(rawRow);

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      errors.push(`Row ${rowNumber}: ${message}`);
      continue;
    }

    items.push({ ...parsed.data, rowNumber });
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push("CSV has headers but no line items.");
  }

  return { items, errors };
}
