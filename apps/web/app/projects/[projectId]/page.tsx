import Link from "next/link";

import { loadProjectAccess } from "../../../lib/project-access";
import { enqueueWeeklySummary } from "./review-actions";
import {
  DecisionReviewForm,
  IssueReviewForm,
  SummaryReviewForm,
  WeeklySummaryReviewForm,
} from "./review-ui";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

const OPEN_ISSUE_STATUSES = ["open", "in_review", "waiting_builder", "waiting_owner"] as const;
const REVIEW_STATES = ["ai_draft", "edited"] as const;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultWeeklySummaryRange(): { weekStart: string; weekEnd: string } {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  return { weekStart: toIsoDate(start), weekEnd: toIsoDate(end) };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, user, project, role, canEdit, canManage } = await loadProjectAccess(projectId);
  const defaultRange = defaultWeeklySummaryRange();

  const [
    { data: members },
    { count: zoneCount },
    { count: tradeCount },
    { count: documentCount },
    { count: itemCount },
    { count: visitCount },
    { count: evidenceCount },
    { data: visits },
    { data: openIssues },
    { data: pendingDecisions },
    { data: summaryDrafts },
    { data: weeklySummaryDrafts },
    { data: issueDrafts },
    { data: decisionDrafts },
    { data: weeklySummaries },
    { data: weeklySummaryJobs },
    { data: auditEntries },
    { data: zones },
    { data: trades },
    { data: contractItems },
  ] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, role, user_id, profiles(email, full_name)")
      .eq("project_id", project.id)
      .order("created_at"),
    supabase
      .from("zones")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("contract_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("visits")
      .select("id, title, visit_date, status, summary_review_state")
      .eq("project_id", project.id)
      .order("visit_date", { ascending: false })
      .limit(5),
    supabase
      .from("issues")
      .select("id, title, priority, status, updated_at, visits(id, title)")
      .eq("project_id", project.id)
      .in("status", [...OPEN_ISSUE_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("decisions")
      .select("id, title, priority, status, deadline, updated_at, visits(id, title)")
      .eq("project_id", project.id)
      .eq("status", "pending")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("visits")
      .select("id, title, visit_date, summary, summary_review_state")
      .eq("project_id", project.id)
      .eq("summary_source", "ai")
      .in("summary_review_state", [...REVIEW_STATES])
      .not("summary", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("weekly_summaries")
      .select("id, week_start, week_end, title, summary, review_state")
      .eq("project_id", project.id)
      .eq("source", "ai")
      .in("review_state", [...REVIEW_STATES])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("issues")
      .select(
        "id, visit_id, title, description, priority, status, review_state, zone_id, trade_id, contract_item_id, cost_risk, schedule_risk, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("source", "ai")
      .in("review_state", [...REVIEW_STATES])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("decisions")
      .select(
        "id, visit_id, title, description, priority, status, review_state, zone_id, trade_id, deadline, options, recommendation, cost_impact, schedule_impact, zones(name), trades(name)",
      )
      .eq("project_id", project.id)
      .eq("source", "ai")
      .in("review_state", [...REVIEW_STATES])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("weekly_summaries")
      .select("id, week_start, week_end, title, summary, review_state, reviewed_at, updated_at")
      .eq("project_id", project.id)
      .order("week_start", { ascending: false })
      .limit(6),
    supabase
      .from("agent_jobs")
      .select("id, status, input, error_message, created_at, completed_at")
      .eq("project_id", project.id)
      .eq("type", "generate_weekly_summary")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("audit_log")
      .select(
        "id, action, entity_type, entity_id, created_at, profiles:actor_user_id(email, full_name)",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("zones").select("id, name").eq("project_id", project.id).order("name"),
    supabase.from("trades").select("id, name").eq("project_id", project.id).order("name"),
    supabase
      .from("contract_items")
      .select("id, code, title")
      .eq("project_id", project.id)
      .order("title"),
  ]);

  const safeMembers = members ?? [];
  const safeVisits = visits ?? [];
  const safeOpenIssues = openIssues ?? [];
  const safePendingDecisions = pendingDecisions ?? [];
  const safeSummaryDrafts = summaryDrafts ?? [];
  const safeWeeklySummaryDrafts = weeklySummaryDrafts ?? [];
  const safeIssueDrafts = issueDrafts ?? [];
  const safeDecisionDrafts = decisionDrafts ?? [];
  const safeWeeklySummaries = weeklySummaries ?? [];
  const safeWeeklySummaryJobs = weeklySummaryJobs ?? [];
  const safeAuditEntries = auditEntries ?? [];
  const safeZones = zones ?? [];
  const safeTrades = trades ?? [];
  const safeContractItems = contractItems ?? [];
  const aiDraftCount =
    safeSummaryDrafts.length +
    safeWeeklySummaryDrafts.length +
    safeIssueDrafts.length +
    safeDecisionDrafts.length;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{project.name}</h1>
          {project.address_label ? <p className="muted">{project.address_label}</p> : null}
        </div>
        <div>
          <span className="badge">{project.status}</span>{" "}
          <span className={`badge role-${role}`}>{role}</span>
        </div>
      </div>
      {project.description ? <p>{project.description}</p> : null}
      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}

      <div className="grid three">
        <div className="card">
          <h2>Visits</h2>
          <p className="muted">{visitCount ?? 0} total</p>
        </div>
        <div className="card">
          <h2>Open issues</h2>
          <p className="muted">{safeOpenIssues.length} active</p>
        </div>
        <div className="card">
          <h2>AI drafts</h2>
          <p className="muted">{aiDraftCount} awaiting review</p>
        </div>
      </div>

      <section className="card">
        <h2>Project data</h2>
        <div className="grid two">
          <Link className="nav-card" href={`/projects/${project.id}/setup`}>
            <strong>Zones & trades</strong>
            <p className="muted">
              {zoneCount ?? 0} zones | {tradeCount ?? 0} trades
            </p>
          </Link>
          <Link className="nav-card" href={`/projects/${project.id}/documents`}>
            <strong>Documents</strong>
            <p className="muted">{documentCount ?? 0} private documents</p>
          </Link>
          <Link className="nav-card" href={`/projects/${project.id}/budget`}>
            <strong>Budget items</strong>
            <p className="muted">{itemCount ?? 0} contract line items</p>
          </Link>
          <Link className="nav-card" href={`/projects/${project.id}/visits`}>
            <strong>Visits & evidence</strong>
            <p className="muted">
              {visitCount ?? 0} visits | {evidenceCount ?? 0} evidence files
            </p>
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Recent visits</h2>
        {safeVisits.length === 0 ? (
          <p className="muted">No visits yet.</p>
        ) : (
          <ul className="item-list">
            {safeVisits.map((visit) => (
              <li key={visit.id}>
                <div>
                  <Link href={`/projects/${project.id}/visits/${visit.id}`}>
                    <strong>{visit.title}</strong>
                  </Link>
                  <div className="muted">
                    {visit.visit_date} | summary {visit.summary_review_state}
                  </div>
                </div>
                <span className={`badge status-${visit.status}`}>{visit.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="split-row">
          <div>
            <h2>Weekly summaries</h2>
            <p className="muted">Generated asynchronously from reviewed project text.</p>
          </div>
        </div>
        {canEdit ? (
          <form action={enqueueWeeklySummary} className="inline-edit">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="grid two">
              <label className="field">
                <span>Week start</span>
                <input name="weekStart" type="date" defaultValue={defaultRange.weekStart} />
              </label>
              <label className="field">
                <span>Week end</span>
                <input name="weekEnd" type="date" defaultValue={defaultRange.weekEnd} />
              </label>
            </div>
            <button type="submit">Generate weekly summary</button>
          </form>
        ) : null}

        {safeWeeklySummaryJobs.length > 0 ? (
          <>
            <h3>Recent jobs</h3>
            <ul className="stack-list">
              {safeWeeklySummaryJobs.map((job) => (
                <li key={job.id} className="stack-item">
                  <div className="split-row">
                    <strong>{job.status}</strong>
                    <span className={`badge status-${job.status}`}>{job.status}</span>
                  </div>
                  <p className="muted">
                    {new Date(job.created_at).toLocaleString()}
                    {job.error_message ? ` | ${job.error_message}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {safeWeeklySummaries.length === 0 ? (
          <p className="muted">No weekly summaries yet.</p>
        ) : (
          <>
            <h3>Recent summaries</h3>
            <ul className="stack-list">
              {safeWeeklySummaries.map((weeklySummary) => (
                <li key={weeklySummary.id} className="stack-item">
                  <div className="split-row">
                    <strong>{weeklySummary.title}</strong>
                    <span className={`badge status-${weeklySummary.review_state}`}>
                      {weeklySummary.review_state}
                    </span>
                  </div>
                  <p className="muted">
                    {weeklySummary.week_start} to {weeklySummary.week_end}
                  </p>
                  <p>{weeklySummary.summary}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="grid two">
        <section className="card">
          <h2>Open issues</h2>
          {safeOpenIssues.length === 0 ? (
            <p className="muted">No open issues.</p>
          ) : (
            <ul className="stack-list">
              {safeOpenIssues.map((issue) => (
                <li key={issue.id} className="stack-item">
                  <div className="split-row">
                    <strong>{issue.title}</strong>
                    <span className={`badge status-${issue.status}`}>{issue.status}</span>
                  </div>
                  <p className="muted">
                    {issue.priority} | {issue.visits?.title ?? "No visit"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Pending decisions</h2>
          {safePendingDecisions.length === 0 ? (
            <p className="muted">No pending decisions.</p>
          ) : (
            <ul className="stack-list">
              {safePendingDecisions.map((decision) => (
                <li key={decision.id} className="stack-item">
                  <div className="split-row">
                    <strong>{decision.title}</strong>
                    <span className={`badge status-${decision.status}`}>{decision.status}</span>
                  </div>
                  <p className="muted">
                    {decision.priority} | {decision.visits?.title ?? "No visit"}
                    {decision.deadline ? ` | ${decision.deadline}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2>AI review queue</h2>
        {aiDraftCount === 0 ? <p className="muted">No AI drafts awaiting review.</p> : null}

        {safeSummaryDrafts.length > 0 ? (
          <>
            <h3>Summaries</h3>
            <ul className="stack-list">
              {safeSummaryDrafts.map((visit) => (
                <li key={visit.id} className="stack-item">
                  <SummaryReviewForm
                    projectId={project.id}
                    visit={visit}
                    canEdit={canEdit}
                    returnTo="project"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {safeWeeklySummaryDrafts.length > 0 ? (
          <>
            <h3>Weekly summaries</h3>
            <ul className="stack-list">
              {safeWeeklySummaryDrafts.map((weeklySummary) => (
                <li key={weeklySummary.id} className="stack-item">
                  <WeeklySummaryReviewForm
                    projectId={project.id}
                    weeklySummary={weeklySummary}
                    canEdit={canEdit}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {safeIssueDrafts.length > 0 ? (
          <>
            <h3>Issues</h3>
            <ul className="stack-list">
              {safeIssueDrafts.map((issue) => (
                <li key={issue.id} className="stack-item">
                  <IssueReviewForm
                    projectId={project.id}
                    issue={issue}
                    zones={safeZones}
                    trades={safeTrades}
                    contractItems={safeContractItems}
                    canEdit={canEdit}
                    returnTo="project"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {safeDecisionDrafts.length > 0 ? (
          <>
            <h3>Decisions</h3>
            <ul className="stack-list">
              {safeDecisionDrafts.map((decision) => (
                <li key={decision.id} className="stack-item">
                  <DecisionReviewForm
                    projectId={project.id}
                    decision={decision}
                    zones={safeZones}
                    trades={safeTrades}
                    canEdit={canEdit}
                    returnTo="project"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <div className="grid two">
        <section className="card">
          <h2>Members</h2>
          <ul className="item-list">
            {safeMembers.map((member) => (
              <li key={member.id}>
                <div>
                  <strong>{member.profiles?.full_name ?? member.profiles?.email}</strong>
                  {member.user_id === user.id ? <span className="muted"> (you)</span> : null}
                  <div className="muted">{member.profiles?.email}</div>
                </div>
                <span className={`badge role-${member.role}`}>{member.role}</span>
              </li>
            ))}
          </ul>
          {canManage ? (
            <p>
              <Link href={`/projects/${project.id}/settings`}>Manage project & members -&gt;</Link>
            </p>
          ) : null}
        </section>

        <section className="card">
          <h2>Audit log</h2>
          {safeAuditEntries.length === 0 ? (
            <p className="muted">No audit entries yet.</p>
          ) : (
            <ul className="stack-list">
              {safeAuditEntries.map((entry) => (
                <li key={entry.id} className="stack-item">
                  <strong>{entry.action}</strong>
                  <div className="muted">
                    {new Date(entry.created_at).toLocaleString()} |{" "}
                    {entry.profiles?.full_name ?? entry.profiles?.email ?? "Unknown user"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
