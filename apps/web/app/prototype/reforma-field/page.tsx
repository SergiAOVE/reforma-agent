import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";

import { ReformaFieldCaseStudy } from "../../../components/reforma-field/case-study";

/*
 * Reforma Field — design prototype.
 *
 * This route is a DESIGN REFERENCE, not product code. It is a faithful
 * implementation of the `Reforma Field.dc.html` handoff from Claude Design, so
 * later phases have something concrete and clickable to build against. It is
 * deliberately self-contained: it imports nothing from `packages/*`, touches no
 * Supabase table, reads no auth state, and nothing in the product links to it.
 *
 * It is NOT an implementation of Phases 3-8. `PLAN.md` remains the source of
 * truth for what is actually built; per AGENTS.md ("do not implement
 * future-phase features early") the screens here are mockups over hard-coded
 * fixtures. Expect to dissolve this route into real product screens phase by
 * phase, then delete it.
 *
 * Classical pairs Cormorant Garamond headings over Lora body text. The design
 * system's own stylesheet pulls both from the Google Fonts CDN with an
 * `@import`; `next/font` self-hosts them instead, so the page makes no
 * third-party request and the faces load without layout shift.
 *
 * The weights are pinned to 400 and 600 — the two the design's `@import` asks
 * for, and the only two the system uses. Left unpinned, `next/font` would serve
 * the variable axis, whose 600 instance carries slightly different metrics from
 * the static cut and visibly shifts the justified columns off the design.
 *
 * Italics are loaded even though the design's `@import` omits them: it sets
 * `font-style: italic` in a dozen places — trade chips, entry statuses, the
 * transcribing notice — and would otherwise get synthetic oblique.
 */
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant-garamond",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Reforma Field — design prototype",
  description:
    "Design reference for the field app: the daily update reframed as a diary entry, with one-tap capture for notes, photographs and voice notes.",
  robots: { index: false, follow: false },
};

export default function ReformaFieldPrototypePage() {
  return (
    <div className={`${cormorantGaramond.variable} ${lora.variable}`}>
      <ReformaFieldCaseStudy />
    </div>
  );
}
