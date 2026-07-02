# ADR-0003 — NanoClaw, OpenClaw and Telegram outside the core

- Status: accepted
- Date: 2026-07-02

## Context

There are agentic frameworks (NanoClaw, OpenClaw) and conversational channels (Telegram) that
could serve as the system's interface or brain.

## Decision

None of them is a core dependency of the MVP:

- **Telegram**: may be added later as a capture/notification channel (Phase 10), always through
  a first-party `reforma-agent` API, never writing directly to the database.
- **NanoClaw**: may be evaluated as a conversational gateway (Phase 11) with closed tools
  (`createVisit`, `addEvidence`, `enqueueJob`, …) against the first-party API, with no broad
  access to secrets or a production shell.
- **OpenClaw**: not recommended for the core due to complexity and security surface; if
  evaluated, it will be in a sandbox with synthetic data.

## Reasons

- The app must be a **simple, traceable, secure source of truth** before being "agentic".
- Reduce security surface: no processes with broad access to private home data.
- Avoid coupling the MVP to fast-moving external projects.

## Consequences

- The MVP has no autonomous chat and no bots.
- The architecture reserves the entry point for future gateways: a first-party API with closed
  tools and explicit permissions.
