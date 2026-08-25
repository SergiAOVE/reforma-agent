"use client";

/*
 * The Reforma Field case study — the page that frames the prototype.
 *
 * Layout, copy and type scale come straight from the outer artboard of
 * `Reforma Field.dc.html`.
 *
 * Two things the artboard leaves to its host, resolved here:
 *
 * 1. The design declares five props — day state, start screen, schedule health,
 *    landscape and field mode — that Claude Design exposes in a sidebar, and
 *    the "Try it" copy invites the reader to use them. A published page has no
 *    such sidebar, so the same five are rendered as controls below the copy,
 *    grouped under the section names the design gives them.
 * 2. `dayState` and `startScreen` seed the prototype's constructor, so the
 *    design tool remounts on a change. The `key` below reproduces that. The
 *    other three are read on every render and so update live, untouched.
 */

import { useState } from "react";

import styles from "./classical.module.css";
import { ReformaFieldPrototype } from "./prototype";
import {
  chip,
  type DayState,
  type ScheduleHealth,
  type Screen,
} from "./prototype-data";

const DAY_STATES: { value: DayState; label: string }[] = [
  { value: "fresh", label: "Fresh" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
];

const START_SCREENS: { value: Screen; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "entry", label: "Entry" },
  { value: "schedule", label: "Schedule" },
  { value: "history", label: "Diary" },
  { value: "attention", label: "Attention" },
  { value: "more", label: "More" },
  { value: "overview", label: "Overview" },
  { value: "budget", label: "Budget" },
  { value: "docs", label: "Documents" },
];

const HEALTHS: { value: ScheduleHealth; label: string }[] = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "delayed", label: "Delayed" },
];

const KICKER: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--color-accent)",
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "color-mix(in srgb,var(--color-text) 50%, transparent)",
  marginBottom: 6,
};

const CONTROL_BASE: React.CSSProperties = {
  minHeight: 34,
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  lineHeight: 1.2,
};

function ControlChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const c = chip(active);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        ...CONTROL_BASE,
        border: `1px solid ${c.bc}`,
        color: c.fg,
        background: c.bg,
      }}
    >
      {label}
    </button>
  );
}

function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={FIELD_LABEL}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <ControlChip
            key={o.value}
            label={o.label}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function ReformaFieldCaseStudy() {
  const [dayState, setDayState] = useState<DayState>("in_progress");
  const [startScreen, setStartScreen] = useState<Screen>("today");
  const [scheduleHealth, setScheduleHealth] =
    useState<ScheduleHealth>("at_risk");
  const [landscape, setLandscape] = useState(false);
  const [fieldMode, setFieldMode] = useState(false);

  return (
    <div
      className={styles.classical}
      style={{ minHeight: "100vh", padding: "52px 24px 80px" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 48,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div style={{ flex: "1 1 340px", maxWidth: 460, minWidth: 300 }}>
            <div style={{ ...KICKER, marginBottom: 10 }}>
              Reforma · field redesign · interactive prototype
            </div>
            <h1 style={{ fontSize: 40, margin: "0 0 14px" }}>The site diary</h1>
            <p
              style={{
                textAlign: "justify",
                fontSize: 14,
                lineHeight: 1.7,
                margin: "0 0 12px",
              }}
            >
              The daily update is reframed as a <em>diary entry</em>: one page a
              day, always open, never “started”. Notes, photographs and voice
              notes fall into it with one tap; problems and owner decisions are
              two-field sheets, not forms. Everything autosaves — the only
              ceremony left is <em>Finish the day</em>.
            </p>

            <hr className={styles.hr} style={{ margin: "14px 0" }} />

            <p
              style={{
                textAlign: "justify",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "0 0 12px",
                color: "color-mix(in srgb,var(--color-text) 75%, transparent)",
              }}
            >
              <strong>What changed from the current UI</strong> (see the
              recreation): capture actions moved onto the home screen; voice
              notes are first-class and transcribe into the entry; photos land
              in a strip, not a file picker; attention is sorted by deadline
              with one-tap resolve; the owner overview, budget and documents
              live under <em>More</em>.
            </p>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                margin: 0,
                color: "color-mix(in srgb,var(--color-text) 65%, transparent)",
              }}
            >
              <strong>Try it:</strong> tap the mic and stop it · add photos ·
              report a problem · finish the day · browse Diary, Attention and
              More. Tweaks: day state, start screen, site mode (bigger UI).
            </p>

            <hr className={styles.hr} style={{ margin: "20px 0 14px" }} />

            <div style={{ ...KICKER, marginBottom: 12 }}>Prototype state</div>
            <ChipGroup
              label="Day state"
              value={dayState}
              options={DAY_STATES}
              onChange={setDayState}
            />
            <ChipGroup
              label="Start screen"
              value={startScreen}
              options={START_SCREENS}
              onChange={setStartScreen}
            />
            <ChipGroup
              label="Schedule health"
              value={scheduleHealth}
              options={HEALTHS}
              onChange={setScheduleHealth}
            />

            <div style={{ ...KICKER, margin: "18px 0 12px" }}>Ergonomics</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <ControlChip
                label="Landscape"
                active={landscape}
                onClick={() => setLandscape((v) => !v)}
              />
              <ControlChip
                label="Site mode (bigger UI)"
                active={fieldMode}
                onClick={() => setFieldMode((v) => !v)}
              />
            </div>
          </div>

          {/*
            The artboard sizes this column `flex:none` around a fixed 402×874
            frame (874 wide in landscape), which overflows a phone viewport.
            Letting the column scroll instead keeps the page from breaking
            horizontally; at desktop widths nothing about it changes.
          */}
          <div style={{ flex: "none", maxWidth: "100%", overflowX: "auto" }}>
            <ReformaFieldPrototype
              key={`${dayState}-${startScreen}`}
              dayState={dayState}
              startScreen={startScreen}
              scheduleHealth={scheduleHealth}
              landscape={landscape}
              fieldMode={fieldMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
