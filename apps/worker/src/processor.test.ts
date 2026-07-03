import { describe, expect, it } from "vitest";

import {
  PermanentJobError,
  safeErrorMessage,
  shouldRetryJob,
  SUPPORTED_JOB_TYPES,
} from "./processor";

const baseJob = {
  id: "11111111-1111-1111-1111-111111111111",
  project_id: "22222222-2222-2222-2222-222222222222",
  type: "transcribe_audio",
  status: "processing",
  input: {},
  output: null,
  error_message: null,
  attempt_count: 1,
  max_attempts: 3,
  locked_at: null,
  locked_by: null,
  created_by: null,
  created_at: "2026-07-03T00:00:00.000Z",
  updated_at: "2026-07-03T00:00:00.000Z",
  completed_at: null,
} as const;

describe("shouldRetryJob", () => {
  it("retries transient errors while attempts remain", () => {
    expect(shouldRetryJob(baseJob, new Error("network"))).toBe(true);
  });

  it("does not retry permanent errors", () => {
    expect(shouldRetryJob(baseJob, new PermanentJobError("bad input"))).toBe(false);
  });

  it("does not retry after max attempts", () => {
    expect(
      shouldRetryJob({ ...baseJob, attempt_count: 3, max_attempts: 3 }, new Error("network")),
    ).toBe(false);
  });
});

describe("safeErrorMessage", () => {
  it("collapses whitespace and truncates long errors", () => {
    const message = safeErrorMessage(new Error(`bad\n${"x".repeat(1200)}`));

    expect(message).not.toContain("\n");
    expect(message.length).toBe(1000);
  });
});

describe("SUPPORTED_JOB_TYPES", () => {
  it("includes Phase 5, Phase 6 and Phase 8 worker jobs only", () => {
    expect(SUPPORTED_JOB_TYPES).toEqual([
      "transcribe_audio",
      "generate_visit_summary",
      "suggest_issues",
      "suggest_decisions",
      "generate_weekly_summary",
    ]);
    expect(SUPPORTED_JOB_TYPES).not.toContain("extract_visit");
  });
});
