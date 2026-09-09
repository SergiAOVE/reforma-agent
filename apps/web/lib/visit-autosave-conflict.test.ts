import { describe, expect, it } from "vitest";

import { classifyGuardedVisitWrite } from "./visit-autosave-conflict";

const T1 = "2026-08-26T09:00:00.000000+00:00";
const T2 = "2026-08-26T09:05:00.000000+00:00";

describe("classifyGuardedVisitWrite", () => {
  it("reports the new updated_at when the guarded update matched", () => {
    expect(classifyGuardedVisitWrite({ updated_at: T2 }, null, T1)).toEqual({
      kind: "saved",
      savedAt: T2,
    });
  });

  it("classifies a visible row with a newer updated_at as a conflict", () => {
    expect(classifyGuardedVisitWrite(null, { updated_at: T2 }, T1)).toEqual({
      kind: "conflict",
    });
  });

  it("classifies an invisible row as denied, not a conflict", () => {
    expect(classifyGuardedVisitWrite(null, null, T1)).toEqual({ kind: "denied" });
  });

  it("classifies a visible but unchanged row as denied", () => {
    // The guarded update matched the timestamp filter yet wrote nothing, so
    // RLS blocked it rather than staleness — for example a member who can
    // still read the visit but lost write permission mid-session. Keeping
    // this out of "conflict" reserves the reload notice for real divergence.
    expect(classifyGuardedVisitWrite(null, { updated_at: T1 }, T1)).toEqual({
      kind: "denied",
    });
  });
});
