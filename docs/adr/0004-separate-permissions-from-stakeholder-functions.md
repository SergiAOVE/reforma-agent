# ADR-0004 — Separate permissions from stakeholder functions

- Status: accepted
- Date: 2026-07-28

## Context

A renovation project includes customers, site managers, architects, engineers, contractors and
site teams. The existing `owner`, `admin`, `editor` and `viewer` values describe application
permissions, but they do not describe a person's real-world responsibility.

Treating a professional function as an authorization role would couple business terminology to
RLS, make mixed responsibilities difficult to represent and risk granting access accidentally.

## Decision

- Keep `project_role` as the only project authorization role used by RLS.
- Add `stakeholder_type` to `project_members` for descriptive project functions.
- Allow owner/admin users to update only the descriptive stakeholder field directly.
- Keep membership creation in the audited `add_project_member_by_email` RPC.
- Add optional responsible and approver user references to issues and decisions.
- Enforce through composite foreign keys that assignees belong to the same project.
- Treat assignments as accountability metadata, not as additional authorization.

## Consequences

- A customer and an architect can have different project functions while sharing the same
  read-only permission.
- Changing a project function cannot increase a user's database access.
- Issues and decisions can show who coordinates the work and who confirms the outcome.
- Removing a member clears their issue and decision assignments.
- Workflow enforcement based on the assigned approver remains a possible future feature; this
  phase records responsibility without weakening or replacing existing RLS.
