# ADR-0002 — No AI image analysis in the MVP

- Status: accepted
- Date: 2026-07-02

## Context

Site visits generate many photos. It would be tempting to use AI vision to describe progress,
detect defects or compare against plans.

## Decision

In the MVP, **photos are visual evidence, not AI input**:

- Photos are never sent to vision models.
- No automatic image descriptions are generated.
- The user adds manual notes to each photo and links it to a visit, zone, trade, issue or
  decision.

The MVP's AI works on text only: audio transcriptions, written notes, and textual documents or
budget line items.

## Reasons

- **Reliability**: vision errors on a construction site (materials, defects, measurements) are
  hard to detect and can mislead owners who are not present.
- **Privacy and cost**: not sending private photos of a home to external APIs reduces exposure
  surface and per-visit cost.
- **Scope**: the immediate value is in structuring text (transcriptions, summaries, issues), not
  in interpreting images.

## Consequences

- The data model stores no AI photo descriptions in the MVP.
- Advanced document/visual analysis remains an optional future phase (Phase 12), which will
  require its own ADR if pursued.
