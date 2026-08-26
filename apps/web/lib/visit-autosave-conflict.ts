/**
 * Classification for the visit autosave's optimistic-concurrency write.
 *
 * The autosave UPDATE filters on the last `updated_at` the client saw, so a
 * stale tab cannot silently revert fields that changed elsewhere. When the
 * guarded update matches no row, a follow-up read of the current row tells the
 * two remaining cases apart:
 *
 * - the row is visible with a different `updated_at` — it moved on since the
 *   client loaded it: a real conflict, and the client must reload;
 * - the row is invisible, or visible with the same `updated_at` (the update
 *   was filtered by RLS, not by the timestamp — for example a member who can
 *   still read the visit but lost write permission mid-session): a permission
 *   problem, not a conflict.
 */

export type GuardedVisitWriteOutcome =
  { kind: "saved"; savedAt: string } | { kind: "conflict" } | { kind: "denied" };

export function classifyGuardedVisitWrite(
  updatedRow: { updated_at: string } | null,
  currentRow: { updated_at: string } | null,
  lastSavedAt: string,
): GuardedVisitWriteOutcome {
  if (updatedRow) {
    return { kind: "saved", savedAt: updatedRow.updated_at };
  }
  if (currentRow && currentRow.updated_at !== lastSavedAt) {
    return { kind: "conflict" };
  }
  return { kind: "denied" };
}
