export type ProjectTimelineMilestoneKind = "visit" | "decision" | "summary";

export interface ProjectTimelineMilestone {
  date: string;
  label: string;
  kind: ProjectTimelineMilestoneKind;
}

function parseIsoDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function latestDate(values: Array<string | null | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function formatTimelineDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseIsoDate(value));
}

export function formatTimelineDateLong(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(value));
}

export function formatTimelineMonth(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(parseIsoDate(value));
}

export function timelinePosition(value: string, start: string, end: string): number {
  const startTime = parseIsoDate(start).getTime();
  const endTime = parseIsoDate(end).getTime();
  const currentTime = parseIsoDate(value).getTime();
  const range = Math.max(endTime - startTime, 1);

  return Math.min(100, Math.max(0, ((currentTime - startTime) / range) * 100));
}

export function buildProjectTimelineRange({
  projectCreatedAt,
  startDate,
  deadlineDate,
  today,
  milestones,
}: {
  projectCreatedAt?: string;
  startDate: string | null;
  deadlineDate: string | null;
  today: string;
  milestones: ProjectTimelineMilestone[];
}): { start: string; end: string } {
  const start = startDate ?? projectCreatedAt?.slice(0, 10) ?? today;
  const latest = latestDate([
    today,
    deadlineDate,
    ...milestones.map((milestone) => milestone.date),
  ]);
  const end = latest && latest > start ? latest : addDays(start, 30);

  return { start, end };
}

export function compactTimelineMilestones(
  milestones: ProjectTimelineMilestone[],
  maximum = 12,
): ProjectTimelineMilestone[] {
  const sorted = [...milestones].sort((left, right) => left.date.localeCompare(right.date));
  if (sorted.length <= maximum) return sorted;
  if (maximum < 2) return sorted.slice(0, 1);

  const step = (sorted.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, index) => sorted[Math.round(index * step)]).filter(
    (milestone): milestone is ProjectTimelineMilestone => Boolean(milestone),
  );
}

export function timelineMonthTicks(start: string, end: string, maximum = 5): string[] {
  const ticks: string[] = [];
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  while (cursor <= endDate) {
    const tick = toIsoDate(cursor);
    ticks.push(tick < start ? start : tick);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const unique = Array.from(new Set(ticks));
  if (unique.length <= maximum) return unique;
  if (maximum < 2) return unique.slice(0, 1);

  const step = (unique.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, index) => unique[Math.round(index * step)]).filter(
    (month): month is string => Boolean(month),
  );
}
