import { PRIORITIES } from "@reforma/core";
import type { Json } from "@reforma/db";

import { reviewDecision, reviewIssue, reviewSummary, reviewWeeklySummary } from "./review-actions";

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
  canEdit,
  returnTo,
}: {
  projectId: string;
  issue: IssueReviewItem;
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  contractItems: ContractItemOption[];
  canEdit: boolean;
  returnTo: ReturnTo;
}) {
  return (
    <form action={reviewIssue} className="inline-edit">
      <ReturnFields projectId={projectId} visitId={issue.visit_id} returnTo={returnTo} />
      <input type="hidden" name="issueId" value={issue.id} />
      <div className="split-row">
        <div>
          <strong>{issue.title}</strong>
          <div className="muted">
            {issue.priority} | {issue.zones?.name ?? "No zone"} | {issue.trades?.name ?? "No trade"}
          </div>
        </div>
        <span className={`badge status-${issue.status}`}>{issue.status}</span>
      </div>
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          defaultValue={issue.title}
          required
          maxLength={220}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={issue.description ?? ""}
          rows={3}
          maxLength={2000}
          disabled={!canEdit}
        />
      </label>
      <div className="grid two">
        <label className="field">
          <span>Priority</span>
          <select name="priority" defaultValue={issue.priority} disabled={!canEdit}>
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
            disabled={!canEdit}
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
        disabled={!canEdit}
      />
      <div className="grid two">
        <label className="field">
          <span>Cost risk</span>
          <input name="costRisk" defaultValue={issue.cost_risk ?? ""} disabled={!canEdit} />
        </label>
        <label className="field">
          <span>Schedule risk</span>
          <input name="scheduleRisk" defaultValue={issue.schedule_risk ?? ""} disabled={!canEdit} />
        </label>
      </div>
      <div className="button-row">
        <button type="submit" name="action" value="edit" disabled={!canEdit}>
          Save edit
        </button>
        <button type="submit" name="action" value="approve" disabled={!canEdit}>
          Approve
        </button>
        <button type="submit" name="action" value="close" className="secondary" disabled={!canEdit}>
          Close
        </button>
        <button type="submit" name="action" value="reject" className="danger" disabled={!canEdit}>
          Reject
        </button>
      </div>
    </form>
  );
}

export function DecisionReviewForm({
  projectId,
  decision,
  zones,
  trades,
  canEdit,
  returnTo,
}: {
  projectId: string;
  decision: DecisionReviewItem;
  zones: ReferenceOption[];
  trades: ReferenceOption[];
  canEdit: boolean;
  returnTo: ReturnTo;
}) {
  return (
    <form action={reviewDecision} className="inline-edit">
      <ReturnFields projectId={projectId} visitId={decision.visit_id} returnTo={returnTo} />
      <input type="hidden" name="decisionId" value={decision.id} />
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
        <button type="submit" name="action" value="edit" disabled={!canEdit}>
          Save edit
        </button>
        <button type="submit" name="action" value="approve" disabled={!canEdit}>
          Approve
        </button>
        <button type="submit" name="action" value="close" className="secondary" disabled={!canEdit}>
          Close
        </button>
        <button type="submit" name="action" value="reject" className="danger" disabled={!canEdit}>
          Reject
        </button>
      </div>
    </form>
  );
}
