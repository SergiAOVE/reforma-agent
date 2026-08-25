/*
 * Static content and derived-value tables for the Reforma Field prototype.
 *
 * Lifted verbatim from the design's `renderVals()` so the screens stay data-
 * driven the way the prototype is. The literal hexes here are intentional: the
 * design computes inline `fill`/`stroke`/`background` values in JavaScript,
 * where `var(--color-accent)` is not available, and hard-codes the same colors
 * the Classical tokens carry.
 */

export type Screen =
  | "today"
  | "entry"
  | "schedule"
  | "history"
  | "attention"
  | "more"
  | "overview"
  | "budget"
  | "docs";

export type Sheet = "problem" | "decision" | "finish";

export type DayState = "fresh" | "in_progress" | "finished";

export type ScheduleHealth = "on_track" | "at_risk" | "delayed";

export type AttentionType = "issue" | "decision";

export type AttentionItem = {
  id: number;
  type: AttentionType;
  title: string;
  meta: string;
  tag: string;
  done: boolean;
};

export type Photo = {
  id: number;
  label: string;
};

export type EntryRow = {
  day: string;
  dow: string;
  title: string;
  meta: string;
  status: string;
  done: boolean;
};

/* — palette echoed from the Classical tokens for JS-computed styles — */
export const ACCENT = "#b68235";
export const ACCENT_700 = "#7d5411";
export const MUTED = "color-mix(in srgb,#201f1d 55%, transparent)";
export const DIVIDER = "color-mix(in srgb,#201f1d 16%, transparent)";

/* — Lucide glyphs used as multi-subpath `d` strings — */
export const ISSUE_D =
  "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z M12 9v4 M12 17h.01";
export const DECISION_D =
  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01";

/* Chip fills — the shared active/inactive treatment behind zones, trades,
   priorities and due dates. */
export function chip(active: boolean) {
  return active
    ? {
        bc: ACCENT,
        fg: ACCENT_700,
        bg: "color-mix(in srgb,#b68235 12%, transparent)",
      }
    : {
        bc: "color-mix(in srgb,#201f1d 16%, transparent)",
        fg: "#201f1d",
        bg: "transparent",
      };
}

export const SCHEDULE_HEALTH: Record<
  ScheduleHealth,
  { color: string; dark: string; label: string; note: string; x: number }
> = {
  on_track: {
    color: "#5b7a4a",
    dark: "#3f5a35",
    label: "On schedule",
    note: "Today · 3 days ahead of plan",
    x: 166,
  },
  at_risk: {
    color: "#b68235",
    dark: "#7d5411",
    label: "Running close",
    note: "Today · only 2 days of slack",
    x: 170,
  },
  delayed: {
    color: "#a33a2e",
    dark: "#7c2b21",
    label: "Behind schedule",
    note: "Today · 8 days behind plan",
    x: 178,
  },
};

const BAR = {
  done: { bg: "#bab6b6", bc: "#bab6b6" },
  active: { bg: "color-mix(in srgb,#b68235 18%, transparent)", bc: ACCENT },
  planned: { bg: "transparent", bc: DIVIDER },
};

export const PHASES = (
  [
    {
      name: "Demolition",
      dates: "12 May – 22 Aug",
      left: 0,
      width: 50,
      st: "done",
    },
    {
      name: "Plumbing 1st fix",
      dates: "26 Aug – 12 Sep",
      left: 52,
      width: 9,
      st: "active",
    },
    {
      name: "Electrics 1st fix",
      dates: "1 – 19 Sep",
      left: 55,
      width: 10,
      st: "active",
    },
    {
      name: "Carpentry",
      dates: "15 Sep – 10 Oct",
      left: 62,
      width: 13,
      st: "planned",
    },
    {
      name: "Kitchen fit-out",
      dates: "6 – 31 Oct",
      left: 72,
      width: 13,
      st: "planned",
    },
    {
      name: "Bathrooms",
      dates: "13 Oct – 7 Nov",
      left: 75,
      width: 13,
      st: "planned",
    },
    {
      name: "Decoration",
      dates: "3 – 28 Nov",
      left: 85,
      width: 14,
      st: "planned",
    },
  ] as const
).map((p) => ({ ...p, ...BAR[p.st] }));

const UPCOMING_KIND = {
  Delivery: { bc: DIVIDER, fg: MUTED, bg: "transparent" },
  Trade: { bc: DIVIDER, fg: MUTED, bg: "transparent" },
  Decision: {
    bc: ACCENT,
    fg: ACCENT_700,
    bg: "color-mix(in srgb,#b68235 10%, transparent)",
  },
  Milestone: { bc: ACCENT, fg: ACCENT_700, bg: "transparent" },
};

export const UPCOMING = (
  [
    {
      day: "26",
      mon: "Aug",
      what: "Plumber starts first fix (kitchen risers)",
      kind: "Trade",
    },
    {
      day: "27",
      mon: "Aug",
      what: "Boiler flue parts delivery, 8–10h",
      kind: "Delivery",
    },
    {
      day: "28",
      mon: "Aug",
      what: "Worktop decision due from the owner",
      kind: "Decision",
    },
    {
      day: "1",
      mon: "Sep",
      what: "Electrician starts first fix",
      kind: "Trade",
    },
    {
      day: "4",
      mon: "Sep",
      what: "Sanitaryware delivery — needs storage cleared",
      kind: "Delivery",
    },
    {
      day: "19",
      mon: "Sep",
      what: "Milestone — first fix complete",
      kind: "Milestone",
    },
  ] as const
).map((u) => ({ ...u, ...UPCOMING_KIND[u.kind] }));

export type ToolAction =
  { type: "nav"; screen: Screen } | { type: "toast"; message: string };

export const TOOLS: {
  name: string;
  meta: string;
  d: string;
  action: ToolAction;
}[] = [
  {
    name: "Schedule",
    meta: "Gantt · milestones · deliveries",
    d: "M3 3v18h18 M7 8h6 M10 12h7 M13 16h5",
    action: { type: "nav", screen: "schedule" },
  },
  {
    name: "Owner overview",
    meta: "Timeline · weekly summary · counts",
    d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    action: { type: "nav", screen: "overview" },
  },
  {
    name: "Budget",
    meta: "23 items · €61,200 contracted",
    d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M8 13h8 M8 17h5",
    action: { type: "nav", screen: "budget" },
  },
  {
    name: "Documents",
    meta: "8 private files · signed links",
    d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
    action: { type: "nav", screen: "docs" },
  },
  {
    name: "Zones & trades",
    meta: "6 zones · 5 trades",
    d: "m3 17 2 2 4-4 M3 7l2 2 4-4 M13 6h8 M13 12h8 M13 18h8",
    action: {
      type: "toast",
      message: "Zones & trades — not in this prototype",
    },
  },
  {
    name: "Settings & members",
    meta: "4 members · you are editor",
    d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
    action: { type: "toast", message: "Settings — not in this prototype" },
  },
];

export const DOCUMENTS = [
  {
    name: "Structural report — Aizkorri 12.pdf",
    meta: "Uploaded 14 May · 2.1 MB",
    kind: "Report",
  },
  {
    name: "Kitchen plan v3.dwg",
    meta: "Uploaded 2 Jun · 4.8 MB",
    kind: "Plan",
  },
  {
    name: "Electrical layout.pdf",
    meta: "Uploaded 2 Jun · 1.2 MB",
    kind: "Plan",
  },
  {
    name: "Building permit.pdf",
    meta: "Uploaded 12 May · 640 KB",
    kind: "Permit",
  },
  {
    name: "Contract — Elorza construcciones.pdf",
    meta: "Uploaded 12 May · 890 KB",
    kind: "Contract",
  },
];

export const NAV_ITEMS: {
  label: string;
  d: string;
  screen: Screen;
  active: Screen[];
  badge?: boolean;
}[] = [
  {
    label: "Today",
    d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    screen: "today",
    active: ["today", "entry", "schedule"],
  },
  {
    label: "Diary",
    d: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    screen: "history",
    active: ["history"],
  },
  {
    label: "Attention",
    d: ISSUE_D,
    screen: "attention",
    active: ["attention"],
    badge: true,
  },
  {
    label: "More",
    d: "M5 12h.01 M12 12h.01 M19 12h.01",
    screen: "more",
    active: ["more", "overview", "budget", "docs"],
  },
];

/* — seed state — */

export const SEED_NOTE =
  "Kitchen demolition finished and plumbing starts tomorrow. Old pipework worse than expected — see photos.";

export const SEED_PHOTOS: Photo[] = [
  { id: 1, label: "Kitchen — north wall" },
  { id: 2, label: "Kitchen — floor" },
  { id: 3, label: "Riser cupboard" },
  { id: 4, label: "Skip collected" },
];

export const SEED_ATTENTION: AttentionItem[] = [
  {
    id: 1,
    type: "issue",
    title: "Damp patch in bathroom ceiling",
    meta: "Reported 20 Aug · plumber inspecting Monday",
    tag: "High",
    done: false,
  },
  {
    id: 2,
    type: "decision",
    title: "Choose kitchen worktop material",
    meta: "Asked 22 Aug · waiting on the owner",
    tag: "Due Fri 28",
    done: false,
  },
  {
    id: 3,
    type: "decision",
    title: "Approve extra socket in hallway",
    meta: "Asked 24 Aug · waiting on the owner",
    tag: "No deadline",
    done: false,
  },
];

/* Labels cycled through as photographs are added. `as const` makes this a
   tuple, so index 0 is a known element and the fallback below stays definite
   under `noUncheckedIndexedAccess`. */
export const PHOTO_LABELS = [
  "Kitchen — plumbing rough-in",
  "Hallway — conduit run",
  "Bathroom — ceiling patch",
  "Materials delivery",
] as const;

/** The label a newly added photograph takes, cycling through the list. */
export function photoLabelAt(index: number): string {
  return PHOTO_LABELS[index % PHOTO_LABELS.length] ?? PHOTO_LABELS[0];
}

/** The Today excerpt, truncated the way the design truncates it. */
export function entryExcerpt(note: string): string {
  if (!note) return "Nothing recorded yet — write, speak or shoot.";
  return note.length > 110 ? note.slice(0, 110).trimEnd() + "…" : note;
}

/** Word count as the design counts it — whitespace-separated, empty is zero. */
export function wordCount(note: string): number {
  return note.trim() ? note.trim().split(/\s+/).length : 0;
}

export function photoCountLabel(count: number): string {
  return `${count} ${count === 1 ? "photograph" : "photographs"}`;
}

export function voiceCountLabel(count: number): string {
  return `${count} ${count === 1 ? "voice note" : "voice notes"}`;
}

export const TRANSCRIPT =
  "Electrician confirmed for Thursday morning; boiler flue parts arrive Wednesday.";

export const ZONES = ["Kitchen", "Bathroom 1", "Bathroom 2", "Hallway"];
export const TRADES = ["Demolition", "Plumbing", "Electrics", "Carpentry"];
export const PRIORITIES = ["Low", "Medium", "High"];
export const DUE_OPTIONS = ["This week", "Next week", "No rush"];

/* Past diary entries. Today's row is prepended at render time from live state.
   `satisfies` rather than a `Record<string, EntryRow>` annotation: the latter is
   a string index signature, which `noUncheckedIndexedAccess` widens to
   `EntryRow | undefined` at every lookup. This keeps the keys literal — and
   still catches a typo at the call site. */
export const PAST_ENTRIES = {
  "22": {
    day: "22",
    dow: "Sat",
    title: "Strip-out continues, skip ordered for Monday.",
    meta: "11 photographs",
    status: "Finished",
    done: true,
  },
  "20": {
    day: "20",
    dow: "Thu",
    title: "Old suite removed, damp patch found in ceiling.",
    meta: "4 photographs · 1 problem",
    status: "Finished",
    done: true,
  },
  "18": {
    day: "18",
    dow: "Tue",
    title: "Materials delivered and protected. Site set up.",
    meta: "9 photographs",
    status: "Finished",
    done: true,
  },
  "14": {
    day: "14",
    dow: "Fri",
    title: "Kitchen units removed, floor lifted.",
    meta: "8 photographs · 2 voice notes",
    status: "Finished",
    done: true,
  },
  "12": {
    day: "12",
    dow: "Wed",
    title: "Protection down, first skip delivered.",
    meta: "6 photographs",
    status: "Finished",
    done: true,
  },
} satisfies Record<string, EntryRow>;

/* The Budget screen's contract items. Typed rather than inline tuples so
   destructuring stays definite under `noUncheckedIndexedAccess`. */
export const BUDGET_ROWS: { code: string; item: string; amount: string }[] = [
  { code: "01.02", item: "Demolition & strip-out", amount: "4,800" },
  { code: "02.01", item: "Plumbing — first fix", amount: "3,650" },
  { code: "02.02", item: "Electrics — first fix", amount: "2,980" },
  { code: "03.01", item: "Kitchen fit-out", amount: "12,400" },
  { code: "03.04", item: "Bathroom 1 — sanitaryware", amount: "5,340" },
];
