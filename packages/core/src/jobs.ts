import { z } from "zod";

import { prioritySchema } from "./enums";
import { isoDateSchema, uuidSchema } from "./validators";

const nullableUuidSchema = z
  .union([uuidSchema, z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

const nullableShortTextSchema = z
  .string()
  .trim()
  .max(240)
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

const nullableIsoDateSchema = z
  .union([isoDateSchema, z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

const nullableTextSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .transform((value) => value ?? null);

const aiDraftTitleSchema = z.string().trim().min(1).max(220);

export const transcribeAudioJobInputSchema = z.object({
  evidenceId: uuidSchema,
  language: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .optional()
    .transform((value) => value ?? null),
});
export type TranscribeAudioJobInput = z.infer<typeof transcribeAudioJobInputSchema>;

export const transcribeAudioJobOutputSchema = z.object({
  evidenceId: uuidSchema,
  transcriptionId: uuidSchema,
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  language: z.string().trim().min(1).nullable(),
});
export type TranscribeAudioJobOutput = z.infer<typeof transcribeAudioJobOutputSchema>;

export const visitTextExtractionJobTypeSchema = z.enum([
  "generate_visit_summary",
  "suggest_issues",
  "suggest_decisions",
]);
export type VisitTextExtractionJobType = z.infer<typeof visitTextExtractionJobTypeSchema>;

export const visitTextExtractionJobInputSchema = z.object({
  visitId: uuidSchema,
});
export type VisitTextExtractionJobInput = z.infer<typeof visitTextExtractionJobInputSchema>;

export const visitSummaryResultSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
});
export type VisitSummaryResult = z.infer<typeof visitSummaryResultSchema>;

export const suggestedIssueSchema = z.object({
  title: aiDraftTitleSchema,
  description: nullableTextSchema,
  priority: prioritySchema.default("medium"),
  zoneId: nullableUuidSchema,
  tradeId: nullableUuidSchema,
  contractItemId: nullableUuidSchema,
  costRisk: nullableShortTextSchema,
  scheduleRisk: nullableShortTextSchema,
});
export type SuggestedIssue = z.infer<typeof suggestedIssueSchema>;

export const suggestIssuesResultSchema = z.object({
  issues: z.array(suggestedIssueSchema).max(10),
});
export type SuggestIssuesResult = z.infer<typeof suggestIssuesResultSchema>;

export const suggestedDecisionOptionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  note: nullableShortTextSchema,
});
export type SuggestedDecisionOption = z.infer<typeof suggestedDecisionOptionSchema>;

export const suggestedDecisionSchema = z.object({
  title: aiDraftTitleSchema,
  description: nullableTextSchema,
  priority: prioritySchema.default("medium"),
  zoneId: nullableUuidSchema,
  tradeId: nullableUuidSchema,
  deadline: nullableIsoDateSchema,
  options: z.array(suggestedDecisionOptionSchema).max(5).default([]),
  recommendation: nullableTextSchema,
  costImpact: nullableShortTextSchema,
  scheduleImpact: nullableShortTextSchema,
});
export type SuggestedDecision = z.infer<typeof suggestedDecisionSchema>;

export const suggestDecisionsResultSchema = z.object({
  decisions: z.array(suggestedDecisionSchema).max(10),
});
export type SuggestDecisionsResult = z.infer<typeof suggestDecisionsResultSchema>;

const providerOutputSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

export const visitSummaryJobOutputSchema = providerOutputSchema.extend({
  visitId: uuidSchema,
  summary: z.string().trim().min(1).max(2000),
});
export type VisitSummaryJobOutput = z.infer<typeof visitSummaryJobOutputSchema>;

export const suggestIssuesJobOutputSchema = providerOutputSchema.extend({
  visitId: uuidSchema,
  issueIds: z.array(uuidSchema),
});
export type SuggestIssuesJobOutput = z.infer<typeof suggestIssuesJobOutputSchema>;

export const suggestDecisionsJobOutputSchema = providerOutputSchema.extend({
  visitId: uuidSchema,
  decisionIds: z.array(uuidSchema),
});
export type SuggestDecisionsJobOutput = z.infer<typeof suggestDecisionsJobOutputSchema>;
