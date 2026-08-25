import Link from "next/link";

import { PRIORITIES } from "@reforma/core";
import type { Json } from "@reforma/db";

import {
  createDecision,
  createIssue,
  reopenIssue,
  reviewDecision,
  reviewIssue,
  reviewSummary,
  reviewWeeklySummary,
} from "./review-actions";

type ReturnTo = "project" | "visit";

interface ReferenceOption {
  id: string;
  name: string;
}

interface ContractItemOption {
  id: string;
  code: string | null;
  title: string;
}

interface VisitOption {
  id: string;
  title: string;
  visit_date: string;
}

interface ProjectMemberOption {
  user_id: string;
  role: string;
  stakeholder_type: string;
  profiles: { email: string; full_name: string | null } | null;
}

interface SummaryReviewVisit {
  id: string;
  title: string;
  visit_date: string;
  summary: string | null;
  summary_review_state: string;
}

interface WeeklySummaryReviewItem {
  id: string;
  week_start: string;
  week_end: string;
  title: string;
  summary: string;
  review_state: string;
}

interface IssueReviewItem {
  id: string;
  visit_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  review_state: string;
  zone_id: string | null;
  trade_id: string | null;
  contract_item_id?: string | null;
  responsible_user_id: string | null;
  approver_user_id: string | null;
  cost_risk: string | null;
  schedule_risk: string | null;
  zones?: { name: string } | null;
  trades?: { name: string } | null;
}

interface DecisionReviewItem {
  id: string;
  visit_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  review_state: string;
  zone_id: string | null;
  trade_id: string | null;
  responsible_user_id: string | null;
  approver_user_id: string | null;
  deadline: string | null;
  options: Json | null;
  recommendation: string | null;
  cost_impact: string | null;
  schedule_impact: string | null;
  zones?: { name: string } | null;
  trades?: { name: string } | null;
}

function optionsToText(options: Json | null | undefined): string {
  if (!Array.isArray(options)) return "";

  return options
    .map((option) => {
      if (typeof option === "string") return option;
      if (!option || typeof option !== "object" || Array.isArray(option)) return "";
      const label = "label" in option && typeof option.label === "string" ? option.label : "";
      const note = "note" in option && typeof option.note === "string" ? option.note : "";
      return note ? `${label} - ${note}` : label;
    })
    .filter(Boolean)
    .join("\n");
}

function ReturnFields({
  projectId,
  visitId,
  returnTo,
}: {
  projectId: string;
  visitId?: string | null;
  returnTo: ReturnTo;
}) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {visitId ? <input type="hidden" name="visitId" value={visitId} /> : null}
    </>
  );
}

function ReferenceSelects({
  zones,
  trades,
  defaults,
  disabled,
}: {
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  defaults: { zoneId?: string | null; tradeId?: string | null };
  disabled: boolean;
}) {
  return (
    <div className="grid two">
      <label className="field">
        <span>Zone</span>
        <select name="zoneId" defaultValue={defaults.zoneId ?? ""} disabled={disabled}>
          <option value="">None</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Trade</span>
        <select name="tradeId" defaultValue={defaults.tradeId ?? ""} disabled={disabled}>
          <option value="">None</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function VisitSelect({
  visits,
  disabled,
  defaultValue,
}: {
  visits: VisitOption[];
  disabled: boolean;
  defaultValue?: string | null;
}) {
  return (
    <label className="field">
      <span>Related visit</span>
      <select name="visitId" defaultValue={defaultValue ?? ""} disabled={disabled}>
        <option value="">No visit</option>
        {visits.map((visit) => (
          <option key={visit.id} value={visit.id}>
            {visit.visit_date} | {visit.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function stakeholderTypeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function memberLabel(member: ProjectMemberOption): string {
  const name = member.profiles?.full_name ?? member.profiles?.email ?? "Unknown member";
  return `${name} | ${stakeholderTypeLabel(member.stakeholder_type)} | ${member.role}`;
}

function assignedMemberName(
  members: ProjectMemberOption[],
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  const member = members.find((candidate) => candidate.user_id === userId);
  return member ? (member.profiles?.full_name ?? member.profiles?.email ?? null) : null;
}

function AssignmentSelects({
  members,
  defaults,
  disabled,
}: {
  members: ProjectMemberOption[];
  defaults: {
    responsibleUserId?: string | null;
    approverUserId?: string | null;
  };
  disabled: boolean;
}) {
  return (
    <div className="grid two">
      <label className="field">
        <span>Responsible person</span>
        <select
          name="responsibleUserId"
          defaultValue={defaults.responsibleUserId ?? ""}
          disabled={disabled}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {memberLabel(member)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Approver</span>
        <select
          name="approverUserId"
          defaultValue={defaults.approverUserId ?? ""}
          disabled={disabled}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {memberLabel(member)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function CreateIssueForm({
  projectId,
  visits,
  zones,
  trades,
  contractItems,
  members,
  canEdit,
  defaults,
  id,
  summaryLabel = "Add issue",
  submitLabel = "Create issue",
  returnTo = "project",
}: {
  projectId: string;
  visits: VisitOption[];
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  contractItems: ContractItemOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  defaults?: {
    title?: string;
    description?: string | null;
    priority?: string;
    visitId?: string | null;
    zoneId?: string | null;
    tradeId?: string | null;
    contractItemId?: string | null;
    responsibleUserId?: string | null;
    approverUserId?: string | null;
    costRisk?: string | null;
    scheduleRisk?: string | null;
  };
  id?: string;
  summaryLabel?: string;
  submitLabel?: string;
  returnTo?: ReturnTo;
}) {
  if (!canEdit) {
    return <p className="muted">Your role is read-only here.</p>;
  }

  return (
    <details className="compact-create-panel" id={id}>
      <summary>{summaryLabel}</summary>
      <form action={createIssue} className="inline-edit compact-create-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            required
            maxLength={220}
            placeholder="What needs attention?"
            defaultValue={defaults?.title ?? ""}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.description ?? ""}
          />
        </label>
        <div className="grid two">
          <label className="field">
            <span>Priority</span>
            <select name="priority" defaultValue={defaults?.priority ?? "medium"}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <VisitSelect visits={visits} defaultValue={defaults?.visitId} disabled={false} />
        </div>
        <ReferenceSelects
          zones={zones}
          trades={trades}
          defaults={defaults ?? {}}
          disabled={false}
        />
        <AssignmentSelects members={members} defaults={defaults ?? {}} disabled={false} />
        <label className="field">
          <span>Budget item</span>
          <select name="contractItemId" defaultValue={defaults?.contractItemId ?? ""}>
            <option value="">None</option>
            {contractItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code ? `${item.code} | ` : ""}
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid two">
          <label className="field">
            <span>Cost risk</span>
            <input name="costRisk" maxLength={240} defaultValue={defaults?.costRisk ?? ""} />
          </label>
          <label className="field">
            <span>Schedule risk</span>
            <input
              name="scheduleRisk"
              maxLength={240}
              defaultValue={defaults?.scheduleRisk ?? ""}
            />
          </label>
        </div>
        <button type="submit">{submitLabel}</button>
      </form>
    </details>
  );
}

export function CreateDecisionForm({
  projectId,
  visits,
  zones,
  trades,
  members,
  canEdit,
  defaults,
  id,
  summaryLabel = "Add decision",
  submitLabel = "Create decision",
  returnTo = "project",
}: {
  projectId: string;
  visits: VisitOption[];
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  defaults?: {
    title?: string;
    description?: string | null;
    priority?: string;
    visitId?: string | null;
    zoneId?: string | null;
    tradeId?: string | null;
    responsibleUserId?: string | null;
    approverUserId?: string | null;
    costImpact?: string | null;
    scheduleImpact?: string | null;
  };
  id?: string;
  summaryLabel?: string;
  submitLabel?: string;
  returnTo?: ReturnTo;
}) {
  if (!canEdit) {
    return <p className="muted">Your role is read-only here.</p>;
  }

  return (
    <details className="compact-create-panel" id={id}>
      <summary>{summaryLabel}</summary>
      <form action={createDecision} className="inline-edit compact-create-form">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            required
            maxLength={220}
            placeholder="What needs a decision?"
            defaultValue={defaults?.title ?? ""}
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={defaults?.description ?? ""}
          />
        </label>
        <div className="grid two">
          <label className="field">
            <span>Priority</span>
            <select name="priority" defaultValue={defaults?.priority ?? "medium"}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Deadline</span>
            <input name="deadline" type="date" />
          </label>
        </div>
        <VisitSelect visits={visits} defaultValue={defaults?.visitId} disabled={false} />
        <ReferenceSelects
          zones={zones}
          trades={trades}
          defaults={defaults ?? {}}
          disabled={false}
        />
        <AssignmentSelects members={members} defaults={defaults ?? {}} disabled={false} />
        <label className="field">
          <span>Options</span>
          <textarea name="optionsText" rows={3} maxLength={2000} />
        </label>
        <label className="field">
          <span>Recommendation</span>
          <textarea name="recommendation" rows={2} maxLength={2000} />
        </label>
        <div className="grid two">
          <label className="field">
            <span>Cost impact</span>
            <input name="costImpact" maxLength={240} defaultValue={defaults?.costImpact ?? ""} />
          </label>
          <label className="field">
            <span>Schedule impact</span>
            <input
              name="scheduleImpact"
              maxLength={240}
              defaultValue={defaults?.scheduleImpact ?? ""}
            />
          </label>
        </div>
        <button type="submit">{submitLabel}</button>
      </form>
    </details>
  );
}

export function SummaryReviewForm({
  projectId,
  visit,
  canEdit,
  returnTo,
}: {
  projectId: string;
  visit: SummaryReviewVisit;
  canEdit: boolean;
  returnTo: ReturnTo;
}) {
  return (
    <form action={reviewSummary} className="inline-edit">
      <ReturnFields projectId={projectId} visitId={visit.id} returnTo={returnTo} />
      <div className="split-row">
        <div>
          <strong>{visit.title}</strong>
          <div className="muted">
            {visit.visit_date} | {visit.summary_review_state}
          </div>
        </div>
        <span className={`badge status-${visit.summary_review_state}`}>
          {visit.summary_review_state}
        </span>
      </div>
      <label className="field">
        <span>Summary</span>
        <textarea
          name="summary"
          defaultValue={visit.summary ?? ""}
          rows={4}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <div className="button-row">
        <button type="submit" name="action" value="edit" disabled={!canEdit}>
          Save edit
        </button>
        <button type="submit" name="action" value="approve" disabled={!canEdit}>
          Approve
        </button>
        <button type="submit" name="action" value="reject" className="danger" disabled={!canEdit}>
          Reject
        </button>
      </div>
    </form>
  );
}

export function WeeklySummaryReviewForm({
  projectId,
  weeklySummary,
  canEdit,
}: {
  projectId: string;
  weeklySummary: WeeklySummaryReviewItem;
  canEdit: boolean;
}) {
  return (
    <form action={reviewWeeklySummary} className="inline-edit">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="weeklySummaryId" value={weeklySummary.id} />
      <div className="split-row">
        <div>
          <strong>{weeklySummary.title}</strong>
          <div className="muted">
            {weeklySummary.week_start} to {weeklySummary.week_end}
          </div>
        </div>
        <span className={`badge status-${weeklySummary.review_state}`}>
          {weeklySummary.review_state}
        </span>
      </div>
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          defaultValue={weeklySummary.title}
          required
          maxLength={180}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Summary</span>
        <textarea
          name="summary"
          defaultValue={weeklySummary.summary}
          rows={6}
          maxLength={5000}
          disabled={!canEdit}
        />
      </label>
      <div className="button-row">
        <button type="submit" name="action" value="edit" disabled={!canEdit}>
          Save edit
        </button>
        <button type="submit" name="action" value="approve" disabled={!canEdit}>
          Approve
        </button>
        <button type="submit" name="action" value="reject" className="danger" disabled={!canEdit}>
          Reject
        </button>
      </div>
    </form>
  );
}

export function IssueReviewForm({
  projectId,
  issue,
  zones,
  trades,
  contractItems,
  members,
  canEdit,
  returnTo,
  mode = "review",
  showHeader = true,
}: {
  projectId: string;
  issue: IssueReviewItem;
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  contractItems: ContractItemOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  returnTo: ReturnTo;
  mode?: "review" | "inspection" | "archive";
  showHeader?: boolean;
}) {
  const showAiReviewActions = mode === "review";
  const isArchived = mode === "archive";
  const fieldsDisabled = !canEdit || isArchived;

  return (
    <form action={isArchived ? reopenIssue : reviewIssue} className="inline-edit">
      <ReturnFields projectId={projectId} visitId={issue.visit_id} returnTo={returnTo} />
      <input type="hidden" name="issueId" value={issue.id} />
      {showHeader ? (
        <div className="split-row">
          <div>
            <strong>{issue.title}</strong>
            <div className="muted">
              {issue.priority} | {issue.zones?.name ?? "No zone"} |{" "}
              {issue.trades?.name ?? "No trade"}
            </div>
          </div>
          <span className={`badge status-${issue.status}`}>{issue.status}</span>
        </div>
      ) : null}
      <div className="workflow-action-bar">
        <strong>
          {showAiReviewActions ? "AI issue draft" : isArchived ? "Closed issue" : "Open issue"}
        </strong>
        <div className="workflow-action-buttons">
          {isArchived ? (
            <button type="submit" name="status" value="open" disabled={!canEdit}>
              Reopen issue
            </button>
          ) : showAiReviewActions ? (
            <>
              <button type="submit" name="action" value="approve" disabled={!canEdit}>
                Approve issue
              </button>
              <button
                type="submit"
                name="action"
                value="reject"
                className="danger"
                disabled={!canEdit}
              >
                Reject draft
              </button>
            </>
          ) : (
            <button type="submit" name="action" value="close" disabled={!canEdit}>
              Close issue
            </button>
          )}
        </div>
      </div>
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          defaultValue={issue.title}
          required
          maxLength={220}
          disabled={fieldsDisabled}
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={issue.description ?? ""}
          rows={3}
          maxLength={2000}
          disabled={fieldsDisabled}
        />
      </label>
      <div className="grid two">
        <label className="field">
          <span>Priority</span>
          <select name="priority" defaultValue={issue.priority} disabled={fieldsDisabled}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Budget item</span>
          <select
            name="contractItemId"
            defaultValue={issue.contract_item_id ?? ""}
            disabled={fieldsDisabled}
          >
            <option value="">None</option>
            {contractItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code ? `${item.code} | ` : ""}
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ReferenceSelects
        zones={zones}
        trades={trades}
        defaults={{ zoneId: issue.zone_id, tradeId: issue.trade_id }}
        disabled={fieldsDisabled}
      />
      <AssignmentSelects
        members={members}
        defaults={{
          responsibleUserId: issue.responsible_user_id,
          approverUserId: issue.approver_user_id,
        }}
        disabled={fieldsDisabled}
      />
      <div className="grid two">
        <label className="field">
          <span>Cost risk</span>
          <input name="costRisk" defaultValue={issue.cost_risk ?? ""} disabled={fieldsDisabled} />
        </label>
        <label className="field">
          <span>Schedule risk</span>
          <input
            name="scheduleRisk"
            defaultValue={issue.schedule_risk ?? ""}
            disabled={fieldsDisabled}
          />
        </label>
      </div>
      {!isArchived ? (
        <div className="button-row">
          <button
            type="submit"
            name="action"
            value="edit"
            className="secondary"
            disabled={!canEdit}
          >
            {showAiReviewActions ? "Save draft changes" : "Save changes"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function IssueInspectionPanel({
  projectId,
  issue,
  visits,
  zones,
  trades,
  contractItems,
  members,
  canEdit,
  returnTo = "visit",
}: {
  projectId: string;
  issue: IssueReviewItem;
  visits: VisitOption[];
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  contractItems: ContractItemOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  returnTo?: ReturnTo;
}) {
  const linkedVisit = visits.find((visit) => visit.id === issue.visit_id);
  const responsibleName = assignedMemberName(members, issue.responsible_user_id);
  const approverName = assignedMemberName(members, issue.approver_user_id);
  const isArchived = issue.status === "closed";

  return (
    <details
      id={`issue-${issue.id}`}
      className={`inspection-panel${isArchived ? " archived" : ""}`}
    >
      <summary>
        <div className="compact-status-row">
          <strong>{issue.title}</strong>
          <span className={`badge status-${issue.status}`}>{issue.status}</span>
        </div>
        <p className="muted">
          {issue.priority}
          {returnTo === "project" ? ` | ${linkedVisit?.title ?? "No visit"}` : ""}
          {issue.zones?.name ? ` | ${issue.zones.name}` : ""}
          {issue.trades?.name ? ` | ${issue.trades.name}` : ""}
          {responsibleName ? ` | Responsible: ${responsibleName}` : ""}
          {approverName ? ` | Approver: ${approverName}` : ""}
          {issue.cost_risk ? ` | ${issue.cost_risk}` : ""}
          {issue.schedule_risk ? ` | ${issue.schedule_risk}` : ""}
        </p>
      </summary>
      <div className="inspection-body">
        <IssueReviewForm
          projectId={projectId}
          issue={issue}
          zones={zones}
          trades={trades}
          contractItems={contractItems}
          members={members}
          canEdit={canEdit}
          returnTo={returnTo}
          mode={isArchived ? "archive" : "inspection"}
          showHeader={false}
        />
        {!isArchived ? (
          <div className="inspection-actions">
            <CreateDecisionForm
              projectId={projectId}
              visits={visits}
              zones={zones}
              trades={trades}
              members={members}
              canEdit={canEdit}
              defaults={{
                title: issue.title,
                description: issue.description,
                priority: issue.priority,
                visitId: issue.visit_id,
                zoneId: issue.zone_id,
                tradeId: issue.trade_id,
                responsibleUserId: issue.responsible_user_id,
                approverUserId: issue.approver_user_id,
                costImpact: issue.cost_risk,
                scheduleImpact: issue.schedule_risk,
              }}
              summaryLabel="Add related decision"
              submitLabel="Create decision"
              returnTo={returnTo}
            />
            <Link
              className="button-link secondary"
              href={`/projects/${projectId}/budget#add-budget-item`}
            >
              Add budget item
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function DecisionReviewForm({
  projectId,
  decision,
  zones,
  trades,
  members,
  canEdit,
  returnTo,
  mode = "review",
  showHeader = true,
}: {
  projectId: string;
  decision: DecisionReviewItem;
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  returnTo: ReturnTo;
  mode?: "review" | "inspection";
  showHeader?: boolean;
}) {
  const showAiReviewActions = mode === "review";

  return (
    <form action={reviewDecision} className="inline-edit">
      <ReturnFields projectId={projectId} visitId={decision.visit_id} returnTo={returnTo} />
      <input type="hidden" name="decisionId" value={decision.id} />
      {showHeader ? (
        <div className="split-row">
          <div>
            <strong>{decision.title}</strong>
            <div className="muted">
              {decision.priority} | {decision.zones?.name ?? "No zone"} |{" "}
              {decision.trades?.name ?? "No trade"}
              {decision.deadline ? ` | ${decision.deadline}` : ""}
            </div>
          </div>
          <span className={`badge status-${decision.status}`}>{decision.status}</span>
        </div>
      ) : null}
      <div className="workflow-action-bar">
        <strong>{showAiReviewActions ? "AI decision draft" : "Pending decision"}</strong>
        <div className="workflow-action-buttons">
          <button type="submit" name="action" value="approve" disabled={!canEdit}>
            Approve decision
          </button>
          {showAiReviewActions ? (
            <button
              type="submit"
              name="action"
              value="reject"
              className="danger"
              disabled={!canEdit}
            >
              Reject draft
            </button>
          ) : (
            <button
              type="submit"
              name="action"
              value="close"
              className="secondary"
              disabled={!canEdit}
            >
              Close decision
            </button>
          )}
        </div>
      </div>
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          defaultValue={decision.title}
          required
          maxLength={220}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={decision.description ?? ""}
          rows={3}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <div className="grid two">
        <label className="field">
          <span>Priority</span>
          <select name="priority" defaultValue={decision.priority} disabled={!canEdit}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Deadline</span>
          <input
            name="deadline"
            type="date"
            defaultValue={decision.deadline ?? ""}
            disabled={!canEdit}
          />
        </label>
      </div>
      <ReferenceSelects
        zones={zones}
        trades={trades}
        defaults={{ zoneId: decision.zone_id, tradeId: decision.trade_id }}
        disabled={!canEdit}
      />
      <AssignmentSelects
        members={members}
        defaults={{
          responsibleUserId: decision.responsible_user_id,
          approverUserId: decision.approver_user_id,
        }}
        disabled={!canEdit}
      />
      <label className="field">
        <span>Options</span>
        <textarea
          name="optionsText"
          defaultValue={optionsToText(decision.options)}
          rows={3}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Recommendation</span>
        <textarea
          name="recommendation"
          defaultValue={decision.recommendation ?? ""}
          rows={2}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <div className="grid two">
        <label className="field">
          <span>Cost impact</span>
          <input name="costImpact" defaultValue={decision.cost_impact ?? ""} disabled={!canEdit} />
        </label>
        <label className="field">
          <span>Schedule impact</span>
          <input
            name="scheduleImpact"
            defaultValue={decision.schedule_impact ?? ""}
            disabled={!canEdit}
          />
        </label>
      </div>
      <div className="button-row">
        <button type="submit" name="action" value="edit" className="secondary" disabled={!canEdit}>
          {showAiReviewActions ? "Save draft changes" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function DecisionInspectionPanel({
  projectId,
  decision,
  zones,
  trades,
  members,
  canEdit,
  returnTo = "visit",
}: {
  projectId: string;
  decision: DecisionReviewItem;
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  members: ProjectMemberOption[];
  canEdit: boolean;
  returnTo?: ReturnTo;
}) {
  const responsibleName = assignedMemberName(members, decision.responsible_user_id);
  const approverName = assignedMemberName(members, decision.approver_user_id);

  return (
    <details id={`decision-${decision.id}`} className="inspection-panel">
      <summary>
        <div className="compact-status-row">
          <strong>{decision.title}</strong>
          <span className={`badge status-${decision.status}`}>{decision.status}</span>
        </div>
        <p className="muted">
          {decision.priority}
          {decision.deadline ? ` | Due ${decision.deadline}` : ""}
          {decision.zones?.name ? ` | ${decision.zones.name}` : ""}
          {decision.trades?.name ? ` | ${decision.trades.name}` : ""}
          {responsibleName ? ` | Responsible: ${responsibleName}` : ""}
          {approverName ? ` | Approver: ${approverName}` : ""}
          {decision.cost_impact ? ` | ${decision.cost_impact}` : ""}
          {decision.schedule_impact ? ` | ${decision.schedule_impact}` : ""}
        </p>
      </summary>
      <div className="inspection-body">
        <DecisionReviewForm
          projectId={projectId}
          decision={decision}
          zones={zones}
          trades={trades}
          members={members}
          canEdit={canEdit}
          returnTo={returnTo}
          mode="inspection"
          showHeader={false}
        />
        <div className="inspection-actions">
          <Link
            className="button-link secondary"
            href={`/projects/${projectId}/budget#add-budget-item`}
          >
            Add budget item
          </Link>
        </div>
      </div>
    </details>
  );
}
