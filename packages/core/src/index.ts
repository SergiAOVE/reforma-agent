import { z } from "zod";

/**
 * Canonical project identifier.
 * Real domain types and enums (project_status, visit_status, etc.) will be
 * added in Phase 1 together with the Supabase data model.
 */
export const APP_NAME = "reforma-agent";

/**
 * Reusable base validator: non-empty text after trimming whitespace.
 * Seeds the Zod validation pattern the domain will follow.
 */
export const nonEmptyStringSchema = z.string().trim().min(1);

export type NonEmptyString = z.infer<typeof nonEmptyStringSchema>;
