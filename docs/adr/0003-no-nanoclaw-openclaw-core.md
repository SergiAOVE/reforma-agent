# ADR 0003: No NanoClaw or OpenClaw as Core Runtime

## Status

Accepted.

## Context

The app needs a clear source of truth, stable permissions, and reviewable workflows. Agent gateways may be useful later, but they should not define the core architecture.

## Decision

Do not use NanoClaw or OpenClaw as core runtime dependencies for the MVP.

## Consequences

- The app remains a conventional, auditable web system.
- Optional agent gateways can be evaluated later.
- Supabase and the worker remain the core system boundaries.
