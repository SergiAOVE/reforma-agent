"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  decisionReviewFormSchema,
  issueReviewFormSchema,
  summaryReviewFormSchema,
  uuidSchema,
} from "@reforma/core";
import type { Database, Json } from "@reforma/db";

import { requireUser } from "../../../lib/auth";

type IssueUpdate = Database["public"]["Tables"]["issues"]["Update"];
type DecisionUpdate = Database["public"]["Tables"]["decisions"]["Update"];
type VisitUpdate = Database["public"]["Tables"]["visits"]["Update"];

type ReturnTarget =
  { kind: "project"; projectId: string } | { kind: "visit"; projectId: string; visitId: string };

function reviewRedirect(target: ReturnTarget, params: { error?: string; ok?: string }): never {
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);

  const path =
    target.kind === "visit"
      ? `/projects/${target.projectId}/visits/${target.visitId}`
      : `/projects/${target.projectId}`;

  redirect(`${path}?${query.toString()}`);
}

function requireProjectId(formData: FormData): string {
  const parsed = uuidSchema.safeParse(formData.get("projectId"));
  if (!parsed.success) {
    redirect("/projects");
  }
  return parsed.data;
}

function requireUuid(formData: FormData, name: string, target: ReturnTarget): string {
  const parsed = uuidSchema.safeParse(formData.get(name));
  if (!parsed.success) {
    reviewRedirect(target, { error: "Invalid review target." });
  }
  return parsed.data;
}

function readReturnTarget(formData: FormData, projectId: string): ReturnTarget {
  const visitId = uuidSchema.safeParse(formData.get("visitId"));
  if (formData.get("returnTo") === "visit" && visitId.success) {
    return { kind: "visit", projectId, visitId: visitId.data };
  }

  return { kind: "project", projectId };
}

function optionsFromText(value: string | null): Json {
  if (!value) return null;

  const options = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ label, note: null }));

  return options.length > 0 ? options : null;
}

function pastTense(action: "approve" | "edit" | "reject" | "close"): string {
  if (action === "approve") return "approved";
  if (action === "edit") return "edited";
  if (action === "reject") return "rejected";
  return "closed";
}

async function writeAuditLog(input: {
  projectId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Json;
}): Promise<string | null> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("audit_log").insert({
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? null,
  });

  return error?.message ?? null;
}

export async function reviewSummary(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const target = readReturnTarget(formData, projectId);
  const visitId = requireUuid(formData, "visitId", target);
  const { supabase, user } = await requireUser();
  const parsed = summaryReviewFormSchema.safeParse({
    action: formData.get("action"),
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    reviewRedirect(target, { error: parsed.error.issues[0]?.message ?? "Invalid summary." });
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, summary, summary_source, summary_review_state")
    .eq("id", visitId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (visitError) {
    reviewRedirect(target, { error: visitError.message });
  }
  if (!visit) {
    reviewRedirect(target, { error: "Visit not found." });
  }
  if (visit.summary_source !== "ai") {
    reviewRedirect(target, { error: "Only AI summaries can be reviewed here." });
  }

  const now = new Date().toISOString();
  const changes: VisitUpdate = {
    summary_reviewed_at: now,
    summary_reviewed_by: user.id,
  };
  const action = parsed.data.action;

  if (action === "approve") {
    if (!visit.summary) {
      reviewRedirect(target, { error: "A blank summary cannot be approved." });
    }
    changes.summary_review_state = "approved";
  } else if (action === "edit") {
    if (!parsed.data.summary) {
      reviewRedirect(target, { error: "Summary text is required." });
    }
    changes.summary = parsed.data.summary;
    changes.summary_review_state = "edited";
  } else {
    changes.summary_review_state = "rejected";
  }

  const { data, error } = await supabase
    .from("visits")
    .update(changes)
    .eq("id", visitId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    reviewRedirect(target, { error: error.message });
  }
  if (!data || data.length === 0) {
    reviewRedirect(target, { error: "You do not have permission to review this summary." });
  }

  const auditError = await writeAuditLog({
    projectId,
    actorUserId: user.id,
    action: `summary.${pastTense(action)}`,
    entityType: "visit",
    entityId: visitId,
    metadata: {
      previousReviewState: visit.summary_review_state,
      newReviewState: changes.summary_review_state ?? null,
    },
  });

  if (auditError) {
    reviewRedirect(target, { error: auditError });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/visits/${visitId}`);
  reviewRedirect(target, { ok: "Summary review saved." });
}

export async function reviewIssue(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const target = readReturnTarget(formData, projectId);
  const issueId = requireUuid(formData, "issueId", target);
  const { supabase, user } = await requireUser();
  const parsed = issueReviewFormSchema.safeParse({
    action: formData.get("action"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    zoneId: formData.get("zoneId"),
    tradeId: formData.get("tradeId"),
    contractItemId: formData.get("contractItemId"),
    costRisk: formData.get("costRisk"),
    scheduleRisk: formData.get("scheduleRisk"),
  });

  if (!parsed.success) {
    reviewRedirect(target, { error: parsed.error.issues[0]?.message ?? "Invalid issue." });
  }

  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("id, visit_id, source, review_state, status")
    .eq("id", issueId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (issueError) {
    reviewRedirect(target, { error: issueError.message });
  }
  if (!issue) {
    reviewRedirect(target, { error: "Issue not found." });
  }

  const action = parsed.data.action;
  const changes: IssueUpdate = {};

  if (action === "reject") {
    if (issue.source !== "ai") {
      reviewRedirect(target, { error: "Only AI issue drafts can be rejected." });
    }
    changes.status = "rejected";
    changes.review_state = "rejected";
  } else if (action === "close") {
    changes.status = "closed";
    if (issue.source === "ai" && issue.review_state === "ai_draft") {
      changes.review_state = "approved";
    }
  } else {
    changes.title = parsed.data.title;
    changes.description = parsed.data.description;
    changes.priority = parsed.data.priority;
    changes.zone_id = parsed.data.zoneId;
    changes.trade_id = parsed.data.tradeId;
    changes.contract_item_id = parsed.data.contractItemId;
    changes.cost_risk = parsed.data.costRisk;
    changes.schedule_risk = parsed.data.scheduleRisk;
    changes.status = "open";
    changes.review_state = action === "approve" ? "approved" : "edited";
  }

  const { data, error } = await supabase
    .from("issues")
    .update(changes)
    .eq("id", issueId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    reviewRedirect(target, { error: error.message });
  }
  if (!data || data.length === 0) {
    reviewRedirect(target, { error: "You do not have permission to review this issue." });
  }

  const auditError = await writeAuditLog({
    projectId,
    actorUserId: user.id,
    action: `issue.${pastTense(action)}`,
    entityType: "issue",
    entityId: issueId,
    metadata: {
      previousStatus: issue.status,
      previousReviewState: issue.review_state,
      newStatus: changes.status ?? null,
      newReviewState: changes.review_state ?? null,
    },
  });

  if (auditError) {
    reviewRedirect(target, { error: auditError });
  }

  revalidatePath(`/projects/${projectId}`);
  if (issue.visit_id) revalidatePath(`/projects/${projectId}/visits/${issue.visit_id}`);
  reviewRedirect(target, { ok: "Issue review saved." });
}

export async function reviewDecision(formData: FormData): Promise<void> {
  const projectId = requireProjectId(formData);
  const target = readReturnTarget(formData, projectId);
  const decisionId = requireUuid(formData, "decisionId", target);
  const { supabase, user } = await requireUser();
  const parsed = decisionReviewFormSchema.safeParse({
    action: formData.get("action"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    zoneId: formData.get("zoneId"),
    tradeId: formData.get("tradeId"),
    deadline: formData.get("deadline"),
    optionsText: formData.get("optionsText"),
    recommendation: formData.get("recommendation"),
    costImpact: formData.get("costImpact"),
    scheduleImpact: formData.get("scheduleImpact"),
  });

  if (!parsed.success) {
    reviewRedirect(target, { error: parsed.error.issues[0]?.message ?? "Invalid decision." });
  }

  const { data: decision, error: decisionError } = await supabase
    .from("decisions")
    .select("id, visit_id, source, review_state, status")
    .eq("id", decisionId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (decisionError) {
    reviewRedirect(target, { error: decisionError.message });
  }
  if (!decision) {
    reviewRedirect(target, { error: "Decision not found." });
  }

  const action = parsed.data.action;
  const changes: DecisionUpdate = {};

  if (action === "reject") {
    if (decision.source !== "ai") {
      reviewRedirect(target, { error: "Only AI decision drafts can be rejected." });
    }
    changes.status = "rejected";
    changes.review_state = "rejected";
  } else if (action === "close") {
    changes.status = "closed";
    if (decision.source === "ai" && decision.review_state === "ai_draft") {
      changes.review_state = "approved";
    }
  } else {
    changes.title = parsed.data.title;
    changes.description = parsed.data.description;
    changes.priority = parsed.data.priority;
    changes.zone_id = parsed.data.zoneId;
    changes.trade_id = parsed.data.tradeId;
    changes.deadline = parsed.data.deadline;
    changes.options = optionsFromText(parsed.data.optionsText);
    changes.recommendation = parsed.data.recommendation;
    changes.cost_impact = parsed.data.costImpact;
    changes.schedule_impact = parsed.data.scheduleImpact;
    changes.status = action === "approve" ? "approved" : "pending";
    changes.review_state = action === "approve" ? "approved" : "edited";
  }

  const { data, error } = await supabase
    .from("decisions")
    .update(changes)
    .eq("id", decisionId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    reviewRedirect(target, { error: error.message });
  }
  if (!data || data.length === 0) {
    reviewRedirect(target, { error: "You do not have permission to review this decision." });
  }

  const auditError = await writeAuditLog({
    projectId,
    actorUserId: user.id,
    action: `decision.${pastTense(action)}`,
    entityType: "decision",
    entityId: decisionId,
    metadata: {
      previousStatus: decision.status,
      previousReviewState: decision.review_state,
      newStatus: changes.status ?? null,
      newReviewState: changes.review_state ?? null,
    },
  });

  if (auditError) {
    reviewRedirect(target, { error: auditError });
  }

  revalidatePath(`/projects/${projectId}`);
  if (decision.visit_id) revalidatePath(`/projects/${projectId}/visits/${decision.visit_id}`);
  reviewRedirect(target, { ok: "Decision review saved." });
}
