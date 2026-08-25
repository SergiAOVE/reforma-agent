import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardPenLine,
  FileText,
  FolderOpen,
  HelpCircle,
  ListChecks,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { loadProjectAccess } from "../../../../lib/project-access";
import { startOrResumeSiteUpdate } from "./actions";

interface TodayPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

const OPEN_ISSUE_STATUSES = ["open", "in_review", "waiting_builder", "waiting_owner"] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatSavedTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function stakeholderLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function siteUpdateStatusLabel(value: string): string {
  if (value === "draft") return "In progress";
  if (value === "published") return "Finished";
  return "Archived";
}

function UpdateShortcut({
  projectId,
  destination,
  className,
  children,
}: {
  projectId: string;
  destination: "update" | "files" | "issue" | "decision";
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={startOrResumeSiteUpdate}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="destination" value={destination} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

export default async function TodayPage({ params, searchParams }: TodayPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, user, project, role, stakeholderType, canEdit, canManage } =
    await loadProjectAccess(projectId);
  const today = todayIsoDate();

  const [
    { data: todayUpdates },
    { data: recentUpdates },
    { data: openIssues, count: openIssueCount },
    { data: pendingDecisions, count: pendingDecisionCount },
  ] = await Promise.all([
    supabase
      .from("visits")
      .select("id, title, status, updated_at, evidence(id)")
      .eq("project_id", project.id)
      .eq("created_by", user.id)
      .eq("visit_date", today)
      .order("updated_at", { ascending: false }),
    supabase
      .from("visits")
      .select("id, title, visit_date, status, updated_at, evidence(id)")
      .eq("project_id", project.id)
      .order("visit_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("issues")
      .select("id, visit_id, title, priority, status, updated_at", { count: "exact" })
      .eq("project_id", project.id)
      .in("status", [...OPEN_ISSUE_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("decisions")
      .select("id, visit_id, title, priority, status, deadline, updated_at", { count: "exact" })
      .eq("project_id", project.id)
      .eq("status", "pending")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(4),
  ]);

  const activeDraft = (todayUpdates ?? []).find((update) => update.status === "draft");
  const finishedToday = (todayUpdates ?? []).find((update) => update.status === "published");

  return (
    <div className="operator-page">
      <Link href="/projects" className="back-link">
        All projects
      </Link>

      <header className="operator-project-header">
        <div>
          <p className="operator-date">{formatDate(today)}</p>
          <h1>{project.name}</h1>
          {project.address_label ? (
            <p className="operator-address">
              <MapPin size={16} aria-hidden="true" />
              {project.address_label}
            </p>
          ) : null}
        </div>
        <span className="badge stakeholder-badge">{stakeholderLabel(stakeholderType)}</span>
      </header>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? <p className="notice error">Your project permission is read-only.</p> : null}

      <section className="operator-primary" aria-labelledby="today-update-title">
        <div className="operator-section-heading">
          <div>
            <span className="eyebrow">Today&apos;s site update</span>
            <h2 id="today-update-title">
              {activeDraft
                ? "Continue where you left off"
                : finishedToday
                  ? "Today's update is finished"
                  : "What is happening on site?"}
            </h2>
          </div>
          {activeDraft ? <span className="badge status-draft">In progress</span> : null}
          {!activeDraft && finishedToday ? (
            <CheckCircle2 className="operator-success-icon" aria-label="Finished" />
          ) : null}
        </div>

        <p className="operator-primary-copy">
          {activeDraft
            ? `Last saved at ${formatSavedTime(activeDraft.updated_at)}. Your notes and photos are safe.`
            : finishedToday
              ? `${finishedToday.evidence.length} photo or file item(s) were included.`
              : "Add a short note and a few photos. Everything saves as you go."}
        </p>

        {canEdit ? (
          <UpdateShortcut
            projectId={project.id}
            destination="update"
            className="operator-main-action"
          >
            <ClipboardPenLine size={21} aria-hidden="true" />
            {activeDraft
              ? "Continue today's update"
              : finishedToday
                ? "Start another update"
                : "Start today's update"}
            <ChevronRight size={20} aria-hidden="true" />
          </UpdateShortcut>
        ) : null}

        {!activeDraft && finishedToday ? (
          <Link
            href={`/projects/${project.id}/visits/${finishedToday.id}#finish`}
            className="operator-text-link"
          >
            View finished update
          </Link>
        ) : null}
      </section>

      {canEdit ? (
        <section className="operator-section" aria-labelledby="quick-add-title">
          <div className="operator-section-heading">
            <h2 id="quick-add-title">Quick add</h2>
            <span className="muted">Uses today&apos;s draft</span>
          </div>
          <div className="operator-action-grid">
            <UpdateShortcut
              projectId={project.id}
              destination="files"
              className="operator-quick-action"
            >
              <Camera size={24} aria-hidden="true" />
              <span>Add photos</span>
            </UpdateShortcut>
            <UpdateShortcut
              projectId={project.id}
              destination="update"
              className="operator-quick-action"
            >
              <MessageSquareText size={24} aria-hidden="true" />
              <span>Write a note</span>
            </UpdateShortcut>
            <UpdateShortcut
              projectId={project.id}
              destination="issue"
              className="operator-quick-action attention"
            >
              <AlertTriangle size={24} aria-hidden="true" />
              <span>Report a problem</span>
            </UpdateShortcut>
            <UpdateShortcut
              projectId={project.id}
              destination="decision"
              className="operator-quick-action"
            >
              <HelpCircle size={24} aria-hidden="true" />
              <span>Request a decision</span>
            </UpdateShortcut>
          </div>
        </section>
      ) : null}

      <section className="operator-section" id="attention" aria-labelledby="attention-title">
        <div className="operator-section-heading">
          <div>
            <span className="eyebrow">Follow up</span>
            <h2 id="attention-title">Needs attention</h2>
          </div>
          <span className="operator-count">
            {(openIssueCount ?? 0) + (pendingDecisionCount ?? 0)}
          </span>
        </div>

        {(openIssues ?? []).length === 0 && (pendingDecisions ?? []).length === 0 ? (
          <p className="operator-empty">
            <CheckCircle2 size={19} aria-hidden="true" /> Nothing needs attention right now.
          </p>
        ) : (
          <div className="operator-attention-list">
            {(openIssues ?? []).map((issue) => (
              <Link
                key={issue.id}
                className="operator-attention-item"
                href={
                  issue.visit_id
                    ? `/projects/${project.id}/visits/${issue.visit_id}#issue-${issue.id}`
                    : `/projects/${project.id}#issue-${issue.id}`
                }
              >
                <span className="operator-item-icon issue">
                  <AlertTriangle size={19} aria-hidden="true" />
                </span>
                <span className="operator-item-copy">
                  <strong>{issue.title}</strong>
                  <span>{issue.priority} priority · open problem</span>
                </span>
                <ChevronRight size={19} aria-hidden="true" />
              </Link>
            ))}
            {(pendingDecisions ?? []).map((decision) => (
              <Link
                key={decision.id}
                className="operator-attention-item"
                href={
                  decision.visit_id
                    ? `/projects/${project.id}/visits/${decision.visit_id}#decision-${decision.id}`
                    : `/projects/${project.id}#decision-${decision.id}`
                }
              >
                <span className="operator-item-icon decision">
                  <HelpCircle size={19} aria-hidden="true" />
                </span>
                <span className="operator-item-copy">
                  <strong>{decision.title}</strong>
                  <span>
                    {decision.deadline ? `Due ${decision.deadline}` : "No deadline"} · decision
                  </span>
                </span>
                <ChevronRight size={19} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="operator-section" aria-labelledby="recent-updates-title">
        <div className="operator-section-heading">
          <h2 id="recent-updates-title">Recent site updates</h2>
          <Link href={`/projects/${project.id}/visits`}>View all</Link>
        </div>
        {(recentUpdates ?? []).length === 0 ? (
          <p className="muted">No site updates yet.</p>
        ) : (
          <div className="operator-update-list">
            {(recentUpdates ?? []).map((update) => (
              <Link
                key={update.id}
                className="operator-update-item"
                href={`/projects/${project.id}/visits/${update.id}`}
              >
                <FileText size={20} aria-hidden="true" />
                <span className="operator-item-copy">
                  <strong>{update.title}</strong>
                  <span>
                    {update.visit_date} · {update.evidence.length} photo or file item(s)
                  </span>
                </span>
                <span className={`badge status-${update.status}`}>
                  {siteUpdateStatusLabel(update.status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <details className="operator-more" id="more">
        <summary>
          <span>
            <MoreHorizontal size={21} aria-hidden="true" />
            More project tools
          </span>
          <ChevronRight size={19} aria-hidden="true" />
        </summary>
        <nav className="operator-tool-list" aria-label="Project tools">
          <Link href={`/projects/${project.id}/documents`}>
            <FolderOpen size={20} aria-hidden="true" /> Project files
          </Link>
          <Link href={`/projects/${project.id}/setup`}>
            <ListChecks size={20} aria-hidden="true" /> Zones and trades
          </Link>
          <Link href={`/projects/${project.id}/budget`}>
            <FileText size={20} aria-hidden="true" /> Budget items
          </Link>
          <Link href={`/projects/${project.id}`}>
            <ClipboardPenLine size={20} aria-hidden="true" /> Project overview
          </Link>
          {canManage ? (
            <Link href={`/projects/${project.id}/settings`}>
              <Settings size={20} aria-hidden="true" /> Project settings
            </Link>
          ) : null}
        </nav>
      </details>

      <p className="operator-permission-note">
        Project permission: {role}. Project function: {stakeholderLabel(stakeholderType)}.
      </p>
    </div>
  );
}
