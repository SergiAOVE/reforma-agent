"use client";

/*
 * Reforma Field — the interactive site-diary prototype.
 *
 * A React translation of the `DCLogic` component in `Reforma Field.dc.html`.
 * The design's `sc-if` / `sc-for` template directives become conditionals and
 * `map`s, and its `renderVals()` bag of derived values is computed inline here,
 * but the state machine, the timings (800ms save, 1400ms transcribe, 2600ms
 * toast) and every inline style are carried over as authored.
 *
 * Two departures from the prototype markup, neither of which moves a pixel:
 * rows the design draws as clickable `<div onClick>` are rendered as real
 * buttons so they can be reached from the keyboard, and the sheet backdrop is a
 * labelled button that also closes on Escape.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./classical.module.css";
import {
  CameraIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileIcon,
  HelpCircleIcon,
  ImageIcon,
  MicIcon,
  PathIcon,
  PinIcon,
  PlusIcon,
  UploadIcon,
  WarningIcon,
} from "./icons";
import { IOSDevice } from "./ios-device";
import {
  ACCENT,
  ACCENT_700,
  DECISION_D,
  DOCUMENTS,
  DUE_OPTIONS,
  ISSUE_D,
  MUTED,
  NAV_ITEMS,
  BUDGET_ROWS,
  PAST_ENTRIES,
  PHASES,
  PRIORITIES,
  SCHEDULE_HEALTH,
  SEED_ATTENTION,
  SEED_NOTE,
  SEED_PHOTOS,
  TOOLS,
  TRADES,
  TRANSCRIPT,
  UPCOMING,
  ZONES,
  chip,
  entryExcerpt,
  photoCountLabel as photoCountLabelOf,
  photoLabelAt,
  voiceCountLabel as voiceCountLabelOf,
  wordCount,
  type AttentionItem,
  type DayState,
  type EntryRow,
  type Photo,
  type ScheduleHealth,
  type Screen,
  type Sheet,
} from "./prototype-data";

/** `color-mix` against the ink, the design's one-off muting device. */
const mut = (pct: number) =>
  `color-mix(in srgb,var(--color-text) ${pct}%, transparent)`;

const KICKER: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--color-accent)",
};

const TNUM: React.CSSProperties = { fontFeatureSettings: "'tnum'" };

const SECTION_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
  margin: "26px 0 4px",
};

const DAY_CELL: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-heading)",
  lineHeight: 1,
  ...TNUM,
};

const DOW_CELL: React.CSSProperties = {
  display: "block",
  fontSize: 9.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: mut(50),
};

const QUICK_ACTION: React.CSSProperties = {
  minHeight: 76,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "transparent",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontFamily: "var(--font-heading)",
  fontWeight: 600,
  fontSize: 13,
};

const BACK_BUTTON: React.CSSProperties = {
  fontSize: 14,
  marginLeft: -4,
  marginBottom: 4,
};

const STAT_LABEL: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: mut(55),
  marginTop: 4,
};

const STAT_VALUE: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 30,
  lineHeight: 1,
  ...TNUM,
};

/** The eight bars of the recording meter and their stagger. */
const WOB_DELAYS = [0, 0.12, 0.24, 0.06, 0.3, 0.18, 0.36, 0.09];

export type ReformaFieldPrototypeProps = {
  dayState: DayState;
  startScreen: Screen;
  scheduleHealth: ScheduleHealth;
  landscape: boolean;
  fieldMode: boolean;
};

export function ReformaFieldPrototype({
  dayState,
  startScreen,
  scheduleHealth,
  landscape,
  fieldMode,
}: ReformaFieldPrototypeProps) {
  const [screen, setScreen] = useState<Screen>(startScreen);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [note, setNote] = useState(dayState === "fresh" ? "" : SEED_NOTE);
  const [photos, setPhotos] = useState<Photo[]>(
    dayState === "fresh" ? [] : SEED_PHOTOS,
  );
  const [voiceNotes, setVoiceNotes] = useState(dayState === "fresh" ? 0 : 1);
  const [entryDone, setEntryDone] = useState(dayState === "finished");
  const [savedLabel, setSavedLabel] = useState(
    dayState === "fresh" ? "Nothing saved yet" : "Saved 12:41",
  );
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [zone, setZone] = useState("Kitchen");
  const [trade, setTrade] = useState("Demolition");
  const [attention, setAttention] = useState<AttentionItem[]>(SEED_ATTENTION);
  const [toast, setToast] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pPrio, setPPrio] = useState("High");
  const [dTitle, setDTitle] = useState("");
  const [dDue, setDDue] = useState("This week");

  const nextId = useRef(10);
  const scroller = useRef<HTMLDivElement | null>(null);
  const recInt = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (recInt.current) clearInterval(recInt.current);
      if (toastT.current) clearTimeout(toastT.current);
      if (saveT.current) clearTimeout(saveT.current);
      if (transT.current) clearTimeout(transT.current);
    },
    [],
  );

  const closeSheet = useCallback(() => setSheet(null), []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  const nav = useCallback((next: Screen) => {
    setScreen(next);
    setSheet(null);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const markSaving = useCallback(() => {
    if (saveT.current) clearTimeout(saveT.current);
    setSavedLabel("Saving…");
    saveT.current = setTimeout(() => setSavedLabel("Saved just now"), 800);
  }, []);

  const addPhoto = useCallback(() => {
    const id = nextId.current++;
    setPhotos((prev) => [{ id, label: photoLabelAt(prev.length) }, ...prev]);
    markSaving();
    showToast("Photograph added to today’s entry");
  }, [markSaving, showToast]);

  const toggleRec = useCallback(() => {
    if (transcribing) return;
    if (!recording) {
      setRecording(true);
      setRecSec(0);
      recInt.current = setInterval(() => setRecSec((s) => s + 1), 1000);
      return;
    }
    if (recInt.current) clearInterval(recInt.current);
    setRecording(false);
    setTranscribing(true);
    transT.current = setTimeout(() => {
      setTranscribing(false);
      setVoiceNotes((v) => v + 1);
      setNote((n) => (n ? n + " " : "") + TRANSCRIPT);
      markSaving();
      showToast("Voice note transcribed into the entry");
    }, 1400);
  }, [recording, transcribing, markSaving, showToast]);

  const resolveItem = useCallback(
    (id: number) => {
      const it = attention.find((i) => i.id === id);
      setAttention((prev) =>
        prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
      );
      if (it && !it.done) {
        showToast(
          it.type === "issue" ? "Problem marked resolved" : "Owner reminded",
        );
      }
    },
    [attention, showToast],
  );

  const openProblem = useCallback(() => setSheet("problem"), []);
  const openDecision = useCallback(() => setSheet("decision"), []);

  const submitProblem = () => {
    const id = nextId.current++;
    const title = pTitle.trim() || "Untitled problem";
    setAttention((prev) => [
      {
        id,
        type: "issue",
        title,
        meta: "Logged just now · photo attached",
        tag: pPrio,
        done: false,
      },
      ...prev,
    ]);
    setSheet(null);
    setPTitle("");
    showToast("Problem logged — the owner will see it");
  };

  const submitDecision = () => {
    const id = nextId.current++;
    const title = dTitle.trim() || "Untitled decision";
    setAttention((prev) => [
      {
        id,
        type: "decision",
        title,
        meta: "Asked just now · waiting on the owner",
        tag: dDue === "This week" ? "Due Fri 28" : dDue,
        done: false,
      },
      ...prev,
    ]);
    setSheet(null);
    setDTitle("");
    showToast("Sent — the owner has been notified");
  };

  const confirmFinish = () => {
    setEntryDone(true);
    setSheet(null);
    setScreen("today");
    setSavedLabel("Finished 17:05");
    showToast("Entry finished — shared with the project team");
  };

  /* — derived values — */

  const openCount = attention.filter((i) => !i.done).length;
  const words = wordCount(note);
  const excerpt = entryExcerpt(note);

  const sched = SCHEDULE_HEALTH[scheduleHealth];
  const schedDx = sched.x - 4;

  const photoCountLabel = photoCountLabelOf(photos.length);
  const voiceLabel = voiceCountLabelOf(voiceNotes);
  const wordLabel = `${words} words`;
  const ctaLabel = entryDone
    ? "Read today’s entry"
    : note || photos.length
      ? "Continue today’s entry"
      : "Start today’s entry";

  const decorated = attention.map((it) => ({
    ...it,
    d: it.type === "issue" ? ISSUE_D : DECISION_D,
    iconColor: it.type === "issue" ? ACCENT_700 : "#605d5d",
    tagBorder:
      it.tag === "High"
        ? ACCENT
        : "color-mix(in srgb,#201f1d 16%, transparent)",
    tagColor: it.tag === "High" ? ACCENT_700 : MUTED,
    tagBg:
      it.tag === "High"
        ? "color-mix(in srgb,#b68235 10%, transparent)"
        : "transparent",
    deco: it.done ? "line-through" : "none",
    opacity: it.done ? 0.45 : 1,
    action: it.done
      ? "Undo"
      : it.type === "issue"
        ? "Mark resolved"
        : "Remind the owner",
  }));
  const attnTop = decorated.filter((i) => !i.done).slice(0, 2);
  const attnSummary =
    `${attention.filter((i) => !i.done && i.type === "issue").length} open problem · ` +
    `${attention.filter((i) => !i.done && i.type === "decision").length} decisions waiting on the owner`;

  const lastPhoto = photos[0];
  const lastPhotoLabel = lastPhoto
    ? `Last photo — ${lastPhoto.label}`
    : "No photos yet — add one from the entry";

  const todayRow: EntryRow = {
    day: "25",
    dow: "Tue",
    title: note ? excerpt : "Today’s entry",
    meta: `${photos.length} photographs · ${voiceNotes} voice note`,
    status: entryDone ? "Finished" : "In progress",
    done: entryDone,
  };
  const recent = [todayRow, PAST_ENTRIES["22"], PAST_ENTRIES["20"]];
  const weeks = [
    { label: "Week 35 · 24–30 August", rows: [todayRow] },
    {
      label: "Week 34 · 17–23 August",
      rows: [PAST_ENTRIES["22"], PAST_ENTRIES["20"], PAST_ENTRIES["18"]],
    },
    {
      label: "Week 33 · 10–16 August",
      rows: [PAST_ENTRIES["14"], PAST_ENTRIES["12"]],
    },
  ];

  const openEntryRow = (row: EntryRow) => {
    if (row.day === "25") nav("entry");
  };

  const zoneChips = ZONES.map((name) => ({ name, ...chip(zone === name) }));
  const tradeChips = TRADES.map((name) => ({ name, ...chip(trade === name) }));
  const prioChips = PRIORITIES.map((name) => ({
    name,
    ...chip(pPrio === name),
  }));
  const dueChips = DUE_OPTIONS.map((name) => ({
    name,
    ...chip(dDue === name),
  }));

  const backToToday = (
    <button
      type="button"
      onClick={() => nav("today")}
      className={`${styles.btn} ${styles.btnGhost}`}
      style={BACK_BUTTON}
    >
      <ChevronLeftIcon size={16} /> Today
    </button>
  );

  const backToProject = (
    <button
      type="button"
      onClick={() => nav("more")}
      className={`${styles.btn} ${styles.btnGhost}`}
      style={BACK_BUTTON}
    >
      <ChevronLeftIcon size={16} /> Project
    </button>
  );

  return (
    <IOSDevice width={landscape ? 874 : 402} height={landscape ? 402 : 874}>
      <div
        style={{
          height: "100%",
          position: "relative",
          background: "var(--color-bg)",
          fontFamily: "var(--font-body)",
          color: "var(--color-text)",
          zoom: fieldMode ? 1.12 : 1,
        }}
      >
        <div
          ref={scroller}
          style={{
            height: "100%",
            overflowY: "auto",
            padding: "70px 22px 150px",
          }}
        >
          {/* ================= TODAY ================= */}
          {screen === "today" && (
            <div>
              <div style={{ ...KICKER, ...TNUM }}>Tuesday · 25 August 2026</div>
              <h1
                style={{ fontSize: 34, lineHeight: 1.08, margin: "6px 0 4px" }}
              >
                Aizkorri Renovation
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  color: mut(55),
                }}
              >
                <PinIcon size={13} />
                Aizkorri kalea 12, Donostia · week 22 of 29
              </div>

              <button
                type="button"
                onClick={() => nav("schedule")}
                className={styles.rowButton}
                style={{
                  display: "block",
                  marginTop: 14,
                  borderTop: "1px solid var(--color-divider)",
                  paddingTop: 10,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: mut(50),
                    }}
                  >
                    Deadline · 30 Nov
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      color: sched.dark,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: sched.color,
                      }}
                    />
                    {sched.label}
                  </span>
                </div>
                <svg
                  width="100%"
                  height="18"
                  viewBox="0 0 320 18"
                  preserveAspectRatio="none"
                  style={{ display: "block", marginTop: 6 }}
                  aria-hidden="true"
                >
                  <line
                    x1="0"
                    y1="9"
                    x2="320"
                    y2="9"
                    stroke="var(--color-divider)"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="9"
                    x2={sched.x}
                    y2="9"
                    stroke={sched.color}
                    strokeWidth="1.5"
                  />
                  <circle cx="2" cy="9" r="2.5" fill={sched.color} />
                  <rect
                    x={schedDx}
                    y="5"
                    width="8"
                    height="8"
                    transform={`rotate(45 ${sched.x} 9)`}
                    fill={sched.color}
                  />
                  <circle
                    cx="317"
                    cy="9"
                    r="2.5"
                    fill="none"
                    stroke={mut(40)}
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: mut(45),
                    ...TNUM,
                  }}
                >
                  <span>12 May</span>
                  <span style={{ color: sched.dark, fontWeight: 600 }}>
                    {sched.note}
                  </span>
                  <span>30 Nov</span>
                </div>
              </button>

              <hr className={styles.hr} style={{ margin: "12px 0 14px" }} />

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ ...KICKER, fontSize: 10 }}>
                  Today’s entry · № 14
                </div>
                <div style={{ fontSize: 11, color: mut(50), ...TNUM }}>
                  {savedLabel}
                </div>
              </div>

              <div
                className={styles.card}
                style={{ gap: 10, padding: "var(--space-4)" }}
              >
                {entryDone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--color-accent-700)",
                      fontSize: 13,
                    }}
                  >
                    <CheckCircleIcon size={16} />
                    Finished and shared with the project team.
                  </div>
                )}
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
                  {excerpt}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: 11.5,
                    color: mut(55),
                    ...TNUM,
                  }}
                >
                  <span>{photoCountLabel}</span>
                  <span>·</span>
                  <span>{voiceLabel}</span>
                  <span>·</span>
                  <span>{wordLabel}</span>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => nav("entry")}
                  style={{
                    minHeight: 54,
                    fontSize: 16,
                    justifyContent: "space-between",
                    paddingInline: 16,
                  }}
                >
                  {ctaLabel}
                  <ChevronRightIcon size={18} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    nav("entry");
                    addPhoto();
                  }}
                  className={styles.quickAction}
                  style={{
                    ...QUICK_ACTION,
                    border: "1px solid var(--color-divider)",
                    color: "var(--color-text)",
                  }}
                >
                  <CameraIcon size={22} strokeWidth={1.5} />
                  Photos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    nav("entry");
                    if (!recording && !transcribing) toggleRec();
                  }}
                  className={styles.quickAction}
                  style={{
                    ...QUICK_ACTION,
                    border: "1px solid var(--color-divider)",
                    color: "var(--color-text)",
                  }}
                >
                  <MicIcon size={22} strokeWidth={1.5} />
                  Voice note
                </button>
                <button
                  type="button"
                  onClick={openProblem}
                  className={styles.quickActionAccent}
                  style={{
                    ...QUICK_ACTION,
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)",
                  }}
                >
                  <WarningIcon size={22} strokeWidth={1.5} />
                  Problem
                </button>
              </div>

              <div style={SECTION_HEAD}>
                <h2 style={{ fontSize: 22, margin: 0 }}>Needs attention</h2>
                <button
                  type="button"
                  onClick={() => nav("attention")}
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ fontSize: 13 }}
                >
                  All <span style={TNUM}>{openCount}</span> →
                </button>
              </div>
              {attnTop.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => nav("attention")}
                  className={styles.rowButton}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 58,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-divider)",
                    cursor: "pointer",
                  }}
                >
                  <PathIcon
                    size={18}
                    d={it.d}
                    stroke={it.iconColor}
                    strokeWidth={1.6}
                  />
                  <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "var(--font-heading)",
                        lineHeight: 1.25,
                      }}
                    >
                      {it.title}
                    </strong>
                    <span style={{ fontSize: 11.5, color: mut(55) }}>
                      {it.meta}
                    </span>
                  </span>
                  <span
                    className={styles.tag}
                    style={{
                      border: `1px solid ${it.tagBorder}`,
                      color: it.tagColor,
                      background: it.tagBg,
                      ...TNUM,
                    }}
                  >
                    {it.tag}
                  </span>
                </button>
              ))}

              <div style={SECTION_HEAD}>
                <h2 style={{ fontSize: 22, margin: 0 }}>Recent entries</h2>
                <button
                  type="button"
                  onClick={() => nav("history")}
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ fontSize: 13 }}
                >
                  Diary →
                </button>
              </div>
              {recent.map((r, i) => (
                <div
                  key={`${r.day}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 56,
                    padding: "9px 0",
                    borderBottom: "1px solid var(--color-divider)",
                  }}
                >
                  <span style={{ textAlign: "center" }}>
                    <span style={{ ...DAY_CELL, fontSize: 20 }}>{r.day}</span>
                    <span style={DOW_CELL}>{r.dow}</span>
                  </span>
                  <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: mut(55), ...TNUM }}>
                      {r.meta}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: r.done ? MUTED : ACCENT_700,
                      fontStyle: "italic",
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ================= SCHEDULE / GANTT ================= */}
          {screen === "schedule" && (
            <div>
              {backToToday}
              <div style={{ ...KICKER, ...TNUM }}>
                12 May — 30 Nov · 29 weeks
              </div>
              <h1 style={{ fontSize: 32, margin: "6px 0 2px" }}>Schedule</h1>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  color: sched.dark,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: sched.color,
                  }}
                />
                {sched.label} · {sched.note}
              </div>

              <div
                style={{
                  position: "relative",
                  borderBlock: "1px solid var(--color-divider)",
                  padding: "10px 0 6px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "calc(92px + (100% - 92px) * 0.52)",
                    width: 1,
                    background: sched.color,
                    zIndex: 2,
                  }}
                />
                {PHASES.map((ph) => (
                  <div
                    key={ph.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "92px 1fr",
                      alignItems: "center",
                      gap: 0,
                      minHeight: 40,
                      padding: "3px 0",
                    }}
                  >
                    <span style={{ display: "grid", gap: 0, paddingRight: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: 1.25,
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                        }}
                      >
                        {ph.name}
                      </span>
                      <span style={{ fontSize: 9.5, color: mut(50), ...TNUM }}>
                        {ph.dates}
                      </span>
                    </span>
                    <span
                      style={{
                        position: "relative",
                        height: 16,
                        display: "block",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: 0,
                          right: 0,
                          height: 1,
                          background: mut(6),
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 3,
                          height: 10,
                          left: `${ph.left}%`,
                          width: `${ph.width}%`,
                          background: ph.bg,
                          border: `1px solid ${ph.bc}`,
                          borderRadius: 2,
                        }}
                      />
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr",
                    marginTop: 4,
                  }}
                >
                  <span />
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: mut(40),
                    }}
                  >
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 10,
                  color: mut(50),
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 6,
                      background: "var(--color-neutral-400)",
                      border: "1px solid var(--color-neutral-400)",
                      borderRadius: 1,
                    }}
                  />
                  Done
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 6,
                      background: "color-mix(in srgb,#b68235 18%, transparent)",
                      border: "1px solid var(--color-accent)",
                      borderRadius: 1,
                    }}
                  />
                  Underway / next
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 6,
                      background: "transparent",
                      border: "1px solid var(--color-divider)",
                      borderRadius: 1,
                    }}
                  />
                  Planned
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{ width: 1, height: 10, background: sched.color }}
                  />
                  Today
                </span>
              </div>

              <h2 style={{ fontSize: 20, margin: "22px 0 4px" }}>Coming up</h2>
              {UPCOMING.map((u) => (
                <div
                  key={`${u.day}-${u.mon}-${u.what}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 52,
                    padding: "7px 0",
                    borderBottom: "1px solid var(--color-divider)",
                  }}
                >
                  <span style={{ textAlign: "center" }}>
                    <span style={{ ...DAY_CELL, fontSize: 19 }}>{u.day}</span>
                    <span style={DOW_CELL}>{u.mon}</span>
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.35 }}>
                    {u.what}
                  </span>
                  <span
                    className={styles.tag}
                    style={{
                      border: `1px solid ${u.bc}`,
                      color: u.fg,
                      background: u.bg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.kind}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ================= ENTRY ================= */}
          {screen === "entry" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => nav("today")}
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ fontSize: 14, marginLeft: -4 }}
                >
                  <ChevronLeftIcon size={16} /> Today
                </button>
                <span style={{ fontSize: 11, color: mut(50), ...TNUM }}>
                  {savedLabel}
                </span>
              </div>
              <div style={{ ...KICKER, fontSize: 10, ...TNUM }}>
                Entry № 14 · 25 August
              </div>
              <h1 style={{ fontSize: 26, margin: "4px 0 12px" }}>
                What happened on site?
              </h1>

              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  markSaving();
                }}
                placeholder="Write, or hold the mic and just say it…"
                aria-label="Today’s site notes"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 130,
                  padding: 12,
                  fontFamily: "var(--font-body)",
                  fontSize: 15.5,
                  lineHeight: 1.6,
                  color: "var(--color-text)",
                  background: "transparent",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-md)",
                  resize: "vertical",
                  caretColor: "var(--color-accent)",
                }}
              />

              {recording && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    border: "1px solid var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                    marginTop: 10,
                  }}
                >
                  <span
                    className={styles.recordingDot}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "#a33a2e",
                    }}
                  />
                  <span
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 2.5,
                      height: 22,
                      flex: 1,
                    }}
                  >
                    {WOB_DELAYS.map((delay, i) => (
                      <span
                        key={i}
                        className={styles.wobBar}
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </span>
                  <span style={{ ...TNUM, fontSize: 13 }}>
                    0:{String(recSec).padStart(2, "0")}
                  </span>
                </div>
              )}

              {transcribing && (
                <div
                  className={styles.transcribing}
                  style={{
                    fontSize: 12.5,
                    fontStyle: "italic",
                    color: "var(--color-accent-700)",
                    marginTop: 10,
                  }}
                >
                  Transcribing your voice note…
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={toggleRec}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    background: recording
                      ? "color-mix(in srgb,#b68235 14%, transparent)"
                      : "transparent",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 15,
                    color: ACCENT_700,
                  }}
                >
                  <MicIcon size={20} strokeWidth={1.6} />
                  {recording ? "Tap to stop" : "Record a voice note"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  margin: "24px 0 8px",
                }}
              >
                <h2 style={{ fontSize: 20, margin: 0 }}>Photographs</h2>
                <span style={{ fontSize: 11.5, color: mut(55), ...TNUM }}>
                  {photoCountLabel}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={addPhoto}
                  className={styles.addPhoto}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "transparent",
                    border: "1px dashed var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    color: "var(--color-accent)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  <CameraIcon size={22} strokeWidth={1.5} />
                  Add
                </button>
                {photos.map((ph) => (
                  <figure key={ph.id} style={{ margin: 0, minWidth: 0 }}>
                    <div
                      className={styles.plate}
                      style={{
                        aspectRatio: "1",
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(160deg,var(--color-neutral-300),var(--color-neutral-400))",
                      }}
                    >
                      <ImageIcon
                        size={20}
                        strokeWidth={1.5}
                        stroke="var(--color-neutral-600)"
                      />
                    </div>
                    <figcaption
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ph.label}
                    </figcaption>
                  </figure>
                ))}
              </div>

              <h2 style={{ fontSize: 20, margin: "24px 0 8px" }}>
                Where &amp; what
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {zoneChips.map((z) => (
                  <button
                    key={z.name}
                    type="button"
                    aria-pressed={zone === z.name}
                    onClick={() => {
                      setZone(z.name);
                      markSaving();
                    }}
                    style={{
                      minHeight: 44,
                      padding: "8px 16px",
                      border: `1px solid ${z.bc}`,
                      color: z.fg,
                      background: z.bg,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 13.5,
                    }}
                  >
                    {z.name}
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {tradeChips.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={trade === t.name}
                    onClick={() => {
                      setTrade(t.name);
                      markSaving();
                    }}
                    style={{
                      minHeight: 44,
                      padding: "8px 16px",
                      border: `1px solid ${t.bc}`,
                      color: t.fg,
                      background: t.bg,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 13.5,
                      fontStyle: "italic",
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <hr className={styles.hr} style={{ margin: "24px 0 12px" }} />

              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  onClick={openProblem}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{
                    minHeight: 50,
                    justifyContent: "space-between",
                    paddingInline: 14,
                    fontSize: 14.5,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <WarningIcon size={18} strokeWidth={1.6} />
                    Report a problem
                  </span>
                  <ChevronRightIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={openDecision}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{
                    minHeight: 50,
                    justifyContent: "space-between",
                    paddingInline: 14,
                    fontSize: 14.5,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <HelpCircleIcon size={18} strokeWidth={1.6} />
                    Ask the owner to decide
                  </span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSheet("finish")}
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{
                  width: "100%",
                  minHeight: 56,
                  fontSize: 16.5,
                  marginTop: 18,
                }}
              >
                <CheckCircleIcon size={19} strokeWidth={1.6} />
                Finish the day
              </button>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: mut(45),
                  margin: "8px 0 0",
                }}
              >
                Everything autosaves — finishing just shares it.
              </p>
            </div>
          )}

          {/* ================= HISTORY / DIARY ================= */}
          {screen === "history" && (
            <div>
              <div style={KICKER}>Aizkorri Renovation</div>
              <h1 style={{ fontSize: 32, margin: "6px 0 2px" }}>Site diary</h1>
              <p
                style={{
                  fontSize: 13,
                  color: mut(55),
                  margin: "0 0 6px",
                  ...TNUM,
                }}
              >
                14 entries · 87 photographs · since 12 May
              </p>
              {weeks.map((w) => (
                <div key={w.label}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      color: mut(50),
                      margin: "22px 0 2px",
                      ...TNUM,
                    }}
                  >
                    {w.label}
                  </div>
                  {w.rows.map((r, i) => (
                    <button
                      key={`${r.day}-${i}`}
                      type="button"
                      onClick={() => openEntryRow(r)}
                      className={styles.rowButton}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px minmax(0,1fr) auto",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 60,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--color-divider)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ textAlign: "center" }}>
                        <span style={{ ...DAY_CELL, fontSize: 21 }}>
                          {r.day}
                        </span>
                        <span style={DOW_CELL}>{r.dow}</span>
                      </span>
                      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, lineHeight: 1.35 }}>
                          {r.title}
                        </span>
                        <span
                          style={{ fontSize: 11.5, color: mut(55), ...TNUM }}
                        >
                          {r.meta}
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: r.done ? MUTED : ACCENT_700,
                          fontStyle: "italic",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.status}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ marginTop: 14, fontSize: 13.5 }}
              >
                <PlusIcon size={16} /> Add an entry for another date
              </button>
            </div>
          )}

          {/* ================= ATTENTION ================= */}
          {screen === "attention" && (
            <div>
              <div style={KICKER}>Follow up</div>
              <h1 style={{ fontSize: 32, margin: "6px 0 2px" }}>
                Needs attention
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: mut(55),
                  margin: "0 0 10px",
                  ...TNUM,
                }}
              >
                {attnSummary}
              </p>
              {decorated.map((it) => (
                <div
                  key={it.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid var(--color-divider)",
                    opacity: it.opacity,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0,1fr) auto",
                      alignItems: "start",
                      gap: 12,
                    }}
                  >
                    <PathIcon
                      size={19}
                      d={it.d}
                      stroke={it.iconColor}
                      strokeWidth={1.6}
                      style={{ marginTop: 2 }}
                    />
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <strong
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: 15.5,
                          lineHeight: 1.25,
                          textDecoration: it.deco,
                        }}
                      >
                        {it.title}
                      </strong>
                      <span style={{ fontSize: 12, color: mut(55), ...TNUM }}>
                        {it.meta}
                      </span>
                    </span>
                    <span
                      className={styles.tag}
                      style={{
                        border: `1px solid ${it.tagBorder}`,
                        color: it.tagColor,
                        background: it.tagBg,
                        whiteSpace: "nowrap",
                        ...TNUM,
                      }}
                    >
                      {it.tag}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      paddingLeft: 31,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => resolveItem(it.id)}
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ minHeight: 40, fontSize: 12.5 }}
                    >
                      {it.action}
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ minHeight: 40, fontSize: 12.5 }}
                    >
                      Add a photo
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={openProblem}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ minHeight: 48, fontSize: 14 }}
                >
                  Report a new problem
                </button>
                <button
                  type="button"
                  onClick={openDecision}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ minHeight: 48, fontSize: 14 }}
                >
                  Ask the owner to decide
                </button>
              </div>
            </div>
          )}

          {/* ================= MORE ================= */}
          {screen === "more" && (
            <div>
              <div style={KICKER}>Aizkorri Renovation</div>
              <h1 style={{ fontSize: 32, margin: "6px 0 10px" }}>Project</h1>
              {TOOLS.map((tl) => (
                <button
                  key={tl.name}
                  type="button"
                  onClick={() =>
                    tl.action.type === "nav"
                      ? nav(tl.action.screen)
                      : showToast(tl.action.message)
                  }
                  className={styles.rowButton}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 14,
                    minHeight: 58,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--color-divider)",
                    cursor: "pointer",
                  }}
                >
                  <PathIcon
                    size={19}
                    d={tl.d}
                    stroke="var(--color-accent)"
                    strokeWidth={1.5}
                  />
                  <span style={{ display: "grid", gap: 1 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: 16,
                      }}
                    >
                      {tl.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: mut(55), ...TNUM }}>
                      {tl.meta}
                    </span>
                  </span>
                  <ChevronRightIcon size={16} stroke={mut(40)} />
                </button>
              ))}
              <p
                style={{
                  fontSize: 11.5,
                  color: mut(45),
                  margin: "16px 0 0",
                  textTransform: "capitalize",
                }}
              >
                Permission: editor · function: site manager
              </p>
            </div>
          )}

          {/* ================= OVERVIEW ================= */}
          {screen === "overview" && (
            <div>
              {backToProject}
              <div style={KICKER}>What the owner sees</div>
              <h1 style={{ fontSize: 32, margin: "6px 0 12px" }}>Overview</h1>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: mut(55),
                  ...TNUM,
                }}
              >
                <span>12 May</span>
                <span
                  style={{ color: "var(--color-accent-700)", fontWeight: 600 }}
                >
                  Today · week 22
                </span>
                <span>30 Nov</span>
              </div>
              <svg
                width="100%"
                height="26"
                viewBox="0 0 320 26"
                preserveAspectRatio="none"
                style={{ display: "block", margin: "4px 0 2px" }}
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="13"
                  x2="320"
                  y2="13"
                  stroke="var(--color-divider)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="13"
                  x2="202"
                  y2="13"
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                />
                <rect
                  x="198"
                  y="9"
                  width="8"
                  height="8"
                  transform="rotate(45 202 13)"
                  fill="var(--color-accent)"
                />
                <circle cx="2" cy="13" r="2.5" fill="var(--color-accent)" />
                <circle
                  cx="317"
                  cy="13"
                  r="2.5"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                />
                <rect
                  x="118"
                  y="10"
                  width="6"
                  height="6"
                  transform="rotate(45 121 13)"
                  fill="var(--color-neutral-500)"
                />
                <rect
                  x="256"
                  y="10"
                  width="6"
                  height="6"
                  transform="rotate(45 259 13)"
                  fill="var(--color-neutral-500)"
                />
              </svg>
              <div style={{ fontSize: 10, color: mut(45) }}>
                Diamonds mark milestones: first fix · decoration
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0,
                  borderBlock: "1px solid var(--color-divider)",
                  margin: "18px 0",
                }}
              >
                <div
                  style={{
                    padding: "14px 8px",
                    borderRight: "1px solid var(--color-divider)",
                  }}
                >
                  <div style={STAT_VALUE}>14</div>
                  <div style={STAT_LABEL}>Diary entries</div>
                </div>
                <div style={{ padding: "14px 8px 14px 16px" }}>
                  <div style={STAT_VALUE}>87</div>
                  <div style={STAT_LABEL}>Photographs</div>
                </div>
                <div
                  style={{
                    padding: "14px 8px",
                    borderTop: "1px solid var(--color-divider)",
                    borderRight: "1px solid var(--color-divider)",
                  }}
                >
                  <div
                    style={{ ...STAT_VALUE, color: "var(--color-accent-700)" }}
                  >
                    1
                  </div>
                  <div style={STAT_LABEL}>Open problem</div>
                </div>
                <div
                  style={{
                    padding: "14px 8px 14px 16px",
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  <div
                    style={{ ...STAT_VALUE, color: "var(--color-accent-700)" }}
                  >
                    2
                  </div>
                  <div style={STAT_LABEL}>Decisions waiting</div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>
                  Week 21 in brief
                </h2>
                <span className={`${styles.tag} ${styles.tagAccent}`}>
                  Approved
                </span>
              </div>
              <p
                style={{
                  textAlign: "justify",
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  margin: "6px 0 8px",
                }}
              >
                Demolition completed in the kitchen and both bathrooms; the skip
                was collected Friday. One problem was raised — a damp patch in
                the bathroom ceiling, plumber inspecting Monday. Two decisions
                wait on the owner: the kitchen worktop material and an extra
                socket in the hallway.
              </p>
              <p style={{ fontSize: 11, color: mut(45), margin: 0 }}>
                Drafted by AI from the week’s entries · reviewed &amp; approved
                by Maite
              </p>
            </div>
          )}

          {/* ================= BUDGET ================= */}
          {screen === "budget" && (
            <div>
              {backToProject}
              <h1 style={{ fontSize: 32, margin: "0 0 2px" }}>Budget</h1>
              <p
                style={{
                  fontSize: 13,
                  color: mut(55),
                  margin: "0 0 12px",
                  ...TNUM,
                }}
              >
                23 contract items · €61,200 contracted
              </p>
              <table className={styles.table} style={TNUM}>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>Code</th>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>€</th>
                  </tr>
                </thead>
                <tbody>
                  {BUDGET_ROWS.map((row) => (
                    <tr key={row.code}>
                      <td style={{ color: mut(55) }}>{row.code}</td>
                      <td>{row.item}</td>
                      <td style={{ textAlign: "right" }}>{row.amount}</td>
                    </tr>
                  ))}
                  <tr>
                    <td />
                    <td
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      Certified to date
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      29,170
                    </td>
                  </tr>
                </tbody>
              </table>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ marginTop: 12, fontSize: 13.5 }}
              >
                <PlusIcon size={16} /> Add a line item
              </button>
            </div>
          )}

          {/* ================= DOCUMENTS ================= */}
          {screen === "docs" && (
            <div>
              {backToProject}
              <h1 style={{ fontSize: 32, margin: "0 0 2px" }}>Documents</h1>
              <p
                style={{
                  fontSize: 13,
                  color: mut(55),
                  margin: "0 0 6px",
                  ...TNUM,
                }}
              >
                8 private documents · signed links only
              </p>
              {DOCUMENTS.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0,1fr) auto",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 56,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--color-divider)",
                  }}
                >
                  <FileIcon
                    size={18}
                    strokeWidth={1.5}
                    stroke="var(--color-accent)"
                  />
                  <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: mut(55), ...TNUM }}>
                      {d.meta}
                    </span>
                  </span>
                  <span className={`${styles.tag} ${styles.tagNeutral}`}>
                    {d.kind}
                  </span>
                </div>
              ))}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{
                  minHeight: 48,
                  width: "100%",
                  marginTop: 14,
                  fontSize: 14,
                }}
              >
                <UploadIcon size={17} strokeWidth={1.6} /> Upload a document
              </button>
            </div>
          )}
        </div>

        {/* ================= BOTTOM NAV ================= */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--color-bg)",
            borderTop: "1px solid var(--color-divider)",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            paddingBottom: 26,
            zIndex: 30,
          }}
        >
          {NAV_ITEMS.map((n) => {
            const active = n.active.includes(screen);
            const badge = n.badge && openCount ? ` ${openCount}` : "";
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => nav(n.screen)}
                aria-current={active ? "page" : undefined}
                style={{
                  minHeight: 58,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  background: "transparent",
                  border: 0,
                  borderTop: `2px solid ${active ? ACCENT : "transparent"}`,
                  cursor: "pointer",
                  color: active ? ACCENT_700 : mut(55),
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: 11.5,
                  letterSpacing: ".04em",
                }}
              >
                <PathIcon size={20} d={n.d} strokeWidth={1.6} />
                <span>
                  {n.label}
                  <span style={{ color: "var(--color-accent)", ...TNUM }}>
                    {badge}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ================= TOAST ================= */}
        {toast !== null && (
          <div
            role="status"
            aria-live="polite"
            className={styles.toast}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 104,
              transform: "translateX(-50%)",
              background: "var(--color-neutral-900)",
              color: "var(--color-neutral-100)",
              fontSize: 12.5,
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              whiteSpace: "nowrap",
              zIndex: 60,
            }}
          >
            {toast}
          </div>
        )}

        {/* ================= SHEETS ================= */}
        {sheet !== null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Close"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "color-mix(in srgb,var(--color-neutral-900) 45%, transparent)",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={
                sheet === "problem"
                  ? "Report a problem"
                  : sheet === "decision"
                    ? "Ask the owner to decide"
                    : "Finish the day"
              }
              className={styles.sheet}
              style={{
                position: "relative",
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-divider)",
                borderRadius: "14px 14px 0 0",
                padding: "20px 22px 56px",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 3,
                  borderRadius: 99,
                  background: "var(--color-neutral-400)",
                  margin: "0 auto 16px",
                }}
              />

              {sheet === "problem" && (
                <>
                  <div style={{ ...KICKER, fontSize: 10 }}>
                    Goes to the owner &amp; team
                  </div>
                  <h2 style={{ fontSize: 24, margin: "4px 0 12px" }}>
                    Report a problem
                  </h2>
                  <input
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="e.g. Damp patch in bathroom ceiling"
                    aria-label="What is the problem?"
                    className={styles.input}
                    style={{ minHeight: 48, fontSize: 15 }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {prioChips.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        aria-pressed={pPrio === p.name}
                        onClick={() => setPPrio(p.name)}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          border: `1px solid ${p.bc}`,
                          color: p.fg,
                          background: p.bg,
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: 13.5,
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0,1fr) auto",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 14,
                      padding: "10px 0",
                      borderTop: "1px solid var(--color-divider)",
                    }}
                  >
                    <div
                      className={styles.plate}
                      style={{
                        width: 44,
                        height: 44,
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(160deg,var(--color-neutral-300),var(--color-neutral-400))",
                      }}
                    >
                      <ImageIcon
                        size={16}
                        strokeWidth={1.5}
                        stroke="var(--color-neutral-600)"
                      />
                    </div>
                    <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lastPhotoLabel}
                      </span>
                      <span style={{ fontSize: 11, color: mut(55) }}>
                        Attached as evidence
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      style={{ fontSize: 12.5, minHeight: 40 }}
                    >
                      Change
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0,1fr) auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "6px 0 2px",
                      borderTop: "1px solid var(--color-divider)",
                    }}
                  >
                    <PinIcon
                      size={16}
                      strokeWidth={1.6}
                      stroke="var(--color-accent)"
                      style={{ marginInline: 14 }}
                    />
                    <span style={{ display: "grid", gap: 1 }}>
                      <span style={{ fontSize: 13 }}>Zone: {zone}</span>
                      <span style={{ fontSize: 11, color: mut(55) }}>
                        From today’s entry
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      style={{ fontSize: 12.5, minHeight: 40 }}
                    >
                      Change
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={submitProblem}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{
                      width: "100%",
                      minHeight: 54,
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    Log the problem
                  </button>
                </>
              )}

              {sheet === "decision" && (
                <>
                  <div style={{ ...KICKER, fontSize: 10 }}>
                    The owner gets a notification
                  </div>
                  <h2 style={{ fontSize: 24, margin: "4px 0 12px" }}>
                    Ask the owner to decide
                  </h2>
                  <input
                    value={dTitle}
                    onChange={(e) => setDTitle(e.target.value)}
                    placeholder="e.g. Which worktop material?"
                    aria-label="What should the owner decide?"
                    className={styles.input}
                    style={{ minHeight: 48, fontSize: 15 }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {dueChips.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        aria-pressed={dDue === p.name}
                        onClick={() => setDDue(p.name)}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          border: `1px solid ${p.bc}`,
                          color: p.fg,
                          background: p.bg,
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: 13.5,
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={submitDecision}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{
                      width: "100%",
                      minHeight: 54,
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    Send to the owner
                  </button>
                </>
              )}

              {sheet === "finish" && (
                <>
                  <div style={{ ...KICKER, fontSize: 10, ...TNUM }}>
                    Entry № 14 · 25 August
                  </div>
                  <h2 style={{ fontSize: 24, margin: "4px 0 10px" }}>
                    Finish the day?
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      fontSize: 14,
                      borderBlock: "1px solid var(--color-divider)",
                      padding: "12px 0",
                      marginBottom: 14,
                      ...TNUM,
                    }}
                  >
                    <span>{wordLabel} of notes</span>
                    <span>
                      {photoCountLabel} · {voiceLabel}
                    </span>
                    <span>Zone: Kitchen · trade: Demolition</span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: mut(60),
                      margin: "0 0 14px",
                    }}
                  >
                    The team can read it right away. You can reopen it any time.
                  </p>
                  <button
                    type="button"
                    onClick={confirmFinish}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ width: "100%", minHeight: 54, fontSize: 16 }}
                  >
                    <CheckCircleIcon size={18} strokeWidth={1.6} />
                    Finish &amp; share
                  </button>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className={`${styles.btn} ${styles.btnGhost}`}
                    style={{ width: "100%", minHeight: 44, marginTop: 6 }}
                  >
                    Keep writing
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </IOSDevice>
  );
}
