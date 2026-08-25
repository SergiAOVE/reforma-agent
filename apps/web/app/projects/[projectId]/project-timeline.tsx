import {
  buildProjectTimelineRange,
  compactTimelineMilestones,
  formatTimelineDate,
  formatTimelineDateLong,
  formatTimelineMonth,
  timelineMonthTicks,
  timelinePosition,
  todayIsoDate,
  type ProjectTimelineMilestone,
} from "../../../lib/project-timeline";

export function ProjectTimeline({
  projectCreatedAt,
  startDate,
  deadlineDate,
  milestones,
}: {
  projectCreatedAt?: string;
  startDate: string | null;
  deadlineDate: string | null;
  milestones: ProjectTimelineMilestone[];
}) {
  const today = todayIsoDate();
  const { start, end } = buildProjectTimelineRange({
    projectCreatedAt,
    startDate,
    deadlineDate,
    today,
    milestones,
  });
  const todayPosition = timelinePosition(today, start, end);
  const deadlinePosition = deadlineDate ? timelinePosition(deadlineDate, start, end) : null;
  const visibleMilestones = compactTimelineMilestones(milestones);
  const months = timelineMonthTicks(start, end);
  const todayEdge = todayPosition < 8 ? " edge-start" : todayPosition > 92 ? " edge-end" : "";
  const startLabel = startDate ? "Start" : "Created";
  const deadlineText = deadlineDate
    ? `Deadline ${formatTimelineDateLong(deadlineDate)}`
    : "No project deadline has been set";

  return (
    <section className="project-timeline" aria-label="Project timeline">
      <div className="project-timeline-labels">
        <span>
          <span className="timeline-label">{startLabel}</span>
          <time dateTime={start}>{formatTimelineDate(start)}</time>
        </span>
        <span className="project-timeline-deadline-label">
          <span className="timeline-label">Deadline</span>
          {deadlineDate ? (
            <time dateTime={deadlineDate}>{formatTimelineDate(deadlineDate)}</time>
          ) : (
            <span className="muted">Not set</span>
          )}
        </span>
      </div>

      <div
        className="project-timeline-track"
        role="img"
        aria-label={`Timeline from ${formatTimelineDateLong(start)}. ${deadlineText}. Today is ${formatTimelineDateLong(today)}.`}
      >
        <div className="project-timeline-line" />
        <div className="project-timeline-progress" style={{ width: `${todayPosition}%` }} />
        <span className="project-timeline-end start" aria-hidden="true" />
        {deadlinePosition === null ? (
          <span className="project-timeline-end no-deadline" aria-hidden="true" />
        ) : (
          <span
            className="project-timeline-deadline"
            style={{ left: `${deadlinePosition}%` }}
            title={deadlineText}
            aria-hidden="true"
          />
        )}
        <span
          className={`project-timeline-today${todayEdge}`}
          style={{ left: `${todayPosition}%` }}
          aria-hidden="true"
        >
          <span className="project-timeline-today-label">Today</span>
        </span>
        {visibleMilestones.map((milestone, index) => (
          <span
            key={`${milestone.kind}-${milestone.date}-${milestone.label}-${index}`}
            className={`project-timeline-milestone ${milestone.kind}`}
            style={{ left: `${timelinePosition(milestone.date, start, end)}%` }}
            title={`${milestone.label} - ${formatTimelineDateLong(milestone.date)}`}
            aria-hidden="true"
          />
        ))}
        <div className="project-timeline-months" aria-hidden="true">
          {months.map((month) => (
            <span
              key={month}
              style={{ left: `${timelinePosition(month, start, end)}%` }}
              className="project-timeline-month"
            >
              {formatTimelineMonth(month)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
