import { z } from "zod";
import {
  evidenceTypeValues,
  phaseStatusValues,
  reviewStateValues,
  visitStatusValues
} from "./enums.js";

export const PhaseStatusSchema = z.enum(phaseStatusValues);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const EvidenceTypeSchema = z.enum(evidenceTypeValues);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const VisitStatusSchema = z.enum(visitStatusValues);
export type VisitStatus = z.infer<typeof VisitStatusSchema>;

export const ReviewStateSchema = z.enum(reviewStateValues);
export type ReviewState = z.infer<typeof ReviewStateSchema>;

export const PhaseSchema = z.object({
  phase: z.number().int().min(0),
  title: z.string().trim().min(1),
  status: PhaseStatusSchema
});

export type Phase = z.infer<typeof PhaseSchema>;
