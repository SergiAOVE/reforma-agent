import { z } from "zod";

/**
 * Basic reusable validators shared across web, worker and packages.
 * Entity row schemas will be added in the phases that consume them.
 */

/** Non-empty text after trimming whitespace. */
export const nonEmptyStringSchema = z.string().trim().min(1);
export type NonEmptyString = z.infer<typeof nonEmptyStringSchema>;

/** UUID (matches Postgres uuid columns). */
export const uuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof uuidSchema>;

/** ISO date (YYYY-MM-DD), used for visit_date and decision deadlines. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
export type IsoDate = z.infer<typeof isoDateSchema>;

/** Non-negative amount for budget quantities and prices. */
export const nonNegativeNumberSchema = z.number().finite().nonnegative();
