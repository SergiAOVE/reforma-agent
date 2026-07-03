import { z } from "zod";
import {
  decisionStatusValues,
  documentTypeValues,
  evidenceTypeValues,
  issueStatusValues,
  jobStatusValues,
  jobTypeValues,
  phaseStatusValues,
  priorityValues,
  projectRoleValues,
  projectStatusValues,
  reviewStateValues,
  visitStatusValues
} from "./enums.js";

const UuidSchema = z.string().uuid();
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const TimestampStringSchema = z.string().datetime({ offset: true });
const NullableTextSchema = z.string().trim().min(1).nullable();
const NonNegativeNumberSchema = z.number().nonnegative().nullable();
const JsonObjectSchema = z.record(z.string(), z.unknown());

export const PhaseStatusSchema = z.enum(phaseStatusValues);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const ProjectRoleSchema = z.enum(projectRoleValues);
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;

export const ProjectStatusSchema = z.enum(projectStatusValues);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const VisitStatusSchema = z.enum(visitStatusValues);
export type VisitStatus = z.infer<typeof VisitStatusSchema>;

export const EvidenceTypeSchema = z.enum(evidenceTypeValues);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const DocumentTypeSchema = z.enum(documentTypeValues);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const IssueStatusSchema = z.enum(issueStatusValues);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const DecisionStatusSchema = z.enum(decisionStatusValues);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const PrioritySchema = z.enum(priorityValues);
export type Priority = z.infer<typeof PrioritySchema>;

export const JobTypeSchema = z.enum(jobTypeValues);
export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum(jobStatusValues);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const ReviewStateSchema = z.enum(reviewStateValues);
export type ReviewState = z.infer<typeof ReviewStateSchema>;

export const PhaseSchema = z.object({
  phase: z.number().int().min(0),
  title: z.string().trim().min(1),
  status: PhaseStatusSchema
});

export type Phase = z.infer<typeof PhaseSchema>;

export const ProfileSchema = z.object({
  id: UuidSchema,
  email: z.string().email().nullable(),
  fullName: NullableTextSchema,
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Profile = z.infer<typeof ProfileSchema>;

export const ProjectSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1),
  addressLabel: NullableTextSchema,
  description: NullableTextSchema,
  status: ProjectStatusSchema,
  createdBy: UuidSchema,
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectMemberSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  userId: UuidSchema,
  role: ProjectRoleSchema,
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

export const ZoneSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  name: z.string().trim().min(1),
  description: NullableTextSchema,
  sortOrder: z.number().int(),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Zone = z.infer<typeof ZoneSchema>;

export const TradeSchema = ZoneSchema;
export type Trade = z.infer<typeof TradeSchema>;

export const DocumentSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  type: DocumentTypeSchema,
  title: z.string().trim().min(1),
  storagePath: z.string().trim().min(1),
  originalFilename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  notes: NullableTextSchema,
  uploadedBy: UuidSchema,
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Document = z.infer<typeof DocumentSchema>;

export const ContractItemSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  sourceDocumentId: UuidSchema.nullable(),
  code: NullableTextSchema,
  title: z.string().trim().min(1),
  description: NullableTextSchema,
  tradeId: UuidSchema.nullable(),
  zoneId: UuidSchema.nullable(),
  quantity: NonNegativeNumberSchema,
  unit: NullableTextSchema,
  unitPrice: NonNegativeNumberSchema,
  totalAmount: NonNegativeNumberSchema,
  includedExcluded: NullableTextSchema,
  sourcePage: NullableTextSchema,
  notes: NullableTextSchema,
  status: z.string().trim().min(1),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type ContractItem = z.infer<typeof ContractItemSchema>;

export const VisitSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  title: z.string().trim().min(1),
  visitDate: DateStringSchema,
  status: VisitStatusSchema,
  generalStatus: NullableTextSchema,
  summary: NullableTextSchema,
  humanNotes: NullableTextSchema,
  primaryZoneId: UuidSchema.nullable(),
  primaryTradeId: UuidSchema.nullable(),
  createdBy: UuidSchema,
  publishedAt: TimestampStringSchema.nullable(),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Visit = z.infer<typeof VisitSchema>;

export const EvidenceSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  visitId: UuidSchema.nullable(),
  type: EvidenceTypeSchema,
  storagePath: z.string().trim().min(1),
  originalFilename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  zoneId: UuidSchema.nullable(),
  tradeId: UuidSchema.nullable(),
  manualNote: NullableTextSchema,
  uploadedBy: UuidSchema,
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const AgentJobSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  type: JobTypeSchema,
  status: JobStatusSchema,
  input: JsonObjectSchema,
  output: JsonObjectSchema.nullable(),
  errorMessage: NullableTextSchema,
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lockedAt: TimestampStringSchema.nullable(),
  lockedBy: NullableTextSchema,
  createdBy: UuidSchema.nullable(),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema,
  completedAt: TimestampStringSchema.nullable()
});

export type AgentJob = z.infer<typeof AgentJobSchema>;

export const AudioTranscriptionSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  evidenceId: UuidSchema,
  rawTranscript: z.string().trim().min(1),
  editedTranscript: NullableTextSchema,
  language: NullableTextSchema,
  provider: NullableTextSchema,
  model: NullableTextSchema,
  createdByJobId: UuidSchema.nullable(),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export type AudioTranscription = z.infer<typeof AudioTranscriptionSchema>;

const WorkItemBaseSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  visitId: UuidSchema.nullable(),
  title: z.string().trim().min(1),
  description: NullableTextSchema,
  zoneId: UuidSchema.nullable(),
  tradeId: UuidSchema.nullable(),
  priority: PrioritySchema,
  reviewState: ReviewStateSchema,
  source: z.string().trim().min(1),
  createdBy: UuidSchema.nullable(),
  createdByJobId: UuidSchema.nullable(),
  createdAt: TimestampStringSchema,
  updatedAt: TimestampStringSchema
});

export const IssueSchema = WorkItemBaseSchema.extend({
  status: IssueStatusSchema,
  contractItemId: UuidSchema.nullable(),
  costRisk: NullableTextSchema,
  scheduleRisk: NullableTextSchema
});

export type Issue = z.infer<typeof IssueSchema>;

export const DecisionSchema = WorkItemBaseSchema.extend({
  options: JsonObjectSchema.nullable(),
  recommendation: NullableTextSchema,
  status: DecisionStatusSchema,
  deadline: DateStringSchema.nullable(),
  costImpact: NullableTextSchema,
  scheduleImpact: NullableTextSchema
});

export type Decision = z.infer<typeof DecisionSchema>;

export const AuditLogSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema.nullable(),
  actorUserId: UuidSchema.nullable(),
  action: z.string().trim().min(1),
  entityType: z.string().trim().min(1),
  entityId: UuidSchema.nullable(),
  metadata: JsonObjectSchema.nullable(),
  createdAt: TimestampStringSchema
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
