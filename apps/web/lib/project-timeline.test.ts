import { describe, expect, it } from "vitest";

import {
  buildProjectTimelineRange,
  compactTimelineMilestones,
  timelineMonthTicks,
  timelinePosition,
} from "./project-timeline";

describe("project timeline", () => {
  it("uses the project deadline instead of a decision deadline", () => {
    expect(
      buildProjectTimelineRange({
        projectCreatedAt: "2026-06-01T09:00:00.000Z",
        startDate: "2026-06-01",
        deadlineDate: "2026-09-30",
        today: "2026-08-25",
        milestones: [
          { date: "2026-07-15", label: "Countertop choice", kind: "decision" },
          { date: "2026-08-02", label: "Site visit", kind: "visit" },
        ],
      }),
    ).toEqual({ start: "2026-06-01", end: "2026-09-30" });
  });

  it("keeps a usable visual range when a deadline is not set", () => {
    expect(
      buildProjectTimelineRange({
        projectCreatedAt: "2026-06-01T09:00:00.000Z",
        startDate: null,
        deadlineDate: null,
        today: "2026-06-01",
        milestones: [],
      }),
    ).toEqual({ start: "2026-06-01", end: "2026-07-01" });
  });

  it("clamps marker positions to the rendered range", () => {
    expect(timelinePosition("2026-05-01", "2026-06-01", "2026-09-01")).toBe(0);
    expect(timelinePosition("2026-10-01", "2026-06-01", "2026-09-01")).toBe(100);
  });

  it("limits dense milestone and month labels without losing the ends", () => {
    const milestones = Array.from({ length: 20 }, (_, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      label: `Milestone ${index + 1}`,
      kind: "visit" as const,
    }));

    const compact = compactTimelineMilestones(milestones, 5);
    expect(compact).toHaveLength(5);
    expect(compact[0]?.date).toBe("2026-06-01");
    expect(compact.at(-1)?.date).toBe("2026-06-20");

    const months = timelineMonthTicks("2026-01-15", "2026-12-20", 4);
    expect(months).toHaveLength(4);
    expect(months[0]).toBe("2026-01-15");
    expect(months.at(-1)).toBe("2026-12-01");
  });
});
