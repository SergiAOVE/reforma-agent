-- Migration: create domain enums
-- Phase 1 of reforma-agent.
-- These enums are mirrored in TypeScript in packages/core/src/enums.ts.
-- Keep both sides in sync: any change here requires a change there and a new migration.

-- Role of a user inside a project. RLS policies are based on membership + role.
create type public.project_role as enum ('owner', 'admin', 'editor', 'viewer');

-- Lifecycle of a renovation project.
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');

-- Lifecycle of a site visit. Visits are edited as drafts and then published.
create type public.visit_status as enum ('draft', 'published', 'archived');

-- Kind of evidence attached to a visit. Photos are evidence only (no AI vision in MVP).
create type public.evidence_type as enum ('photo', 'audio', 'video', 'document');

-- Kind of technical document stored for a project.
create type public.document_type as enum (
  'plan',
  'quote',
  'technical_memory',
  'annex',
  'invoice',
  'warranty',
  'change_order',
  'other'
);

-- Issue lifecycle. 'ai_draft' marks AI-proposed issues pending human review.
create type public.issue_status as enum (
  'ai_draft',
  'open',
  'in_review',
  'waiting_builder',
  'waiting_owner',
  'resolved',
  'closed',
  'rejected'
);

-- Pending decision lifecycle. 'ai_draft' marks AI-proposed decisions pending human review.
create type public.decision_status as enum (
  'ai_draft',
  'pending',
  'approved',
  'rejected',
  'superseded',
  'closed'
);

-- Priority shared by issues and decisions.
create type public.priority as enum ('low', 'medium', 'high', 'critical');

-- Async job types processed by the worker (never inside web requests).
create type public.job_type as enum (
  'transcribe_audio',
  'extract_visit',
  'generate_visit_summary',
  'suggest_issues',
  'suggest_decisions',
  'generate_weekly_summary'
);

-- Async job lifecycle.
create type public.job_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
