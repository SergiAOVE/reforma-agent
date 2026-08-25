# Product vision

## Problem

A home renovation runs for months while the owners live abroad. A trusted person visits the site
periodically, but information gets scattered across phone photos, voice memos, messages and
personal memory. It becomes hard to answer rigorously: what has been done? which issues are open?
which decisions are blocking progress? was this in the budget?

## Solution

`reforma-agent` is a PWA that turns each site visit into a structured record:

- **Visits** with notes, status and date.
- **Evidence**: photos and audio linked to visits, zones and trades.
- **Transcription** of audio, editable by the user.
- **Reviewable AI summaries** per visit, plus weekly summaries for owners.
- **Issues** and **pending decisions**, created manually or proposed by AI as drafts.
- **Technical documents** (plans, quotes, technical specifications) in private storage.
- **Itemized budget** linkable to issues and decisions.

## Users

- **Site visitor** (editor): records visits and evidence from a phone.
- **Owners** (viewer/owner): follow progress remotely, review summaries and decide.
- **Project administrator** (owner/admin): configures zones, trades, documents and members.
- **Site manager or inspector** (editor/admin): coordinates issues, reviews progress and records
  cost or schedule risks.
- **Architect or engineer** (viewer/editor): consults technical information and can be assigned
  as responsible person or approver.
- **Contractor, foreman or worker** (viewer/editor as appropriate): receives explicit
  responsibility for issues or decisions without gaining permissions from the professional
  function itself.

## Primary experience: site manager

The first role-focused product experience is for the site manager reporting from the renovation
site. It is intentionally task-based rather than database-based:

1. Open the project on a phone and land on **Today**.
2. Start or continue the current site update.
3. Write a short note and add several photos or files at once.
4. Report a problem or request a decision when something needs follow-up.
5. Finish the update so the project team can use it as part of the site record.

Notes autosave, today's existing draft is resumed instead of duplicated, and technical fields such
as title, date, zone and trade stay optional and secondary. Owner review, project administration,
AI tools, documents and budget information remain available without competing with the field
reporting workflow. Field view remains active while the person moves through updates and project
tools in the same browser-tab session, with persistent navigation on phone and desktop. Site
managers enter this view by default; another editable project member can open it for field work or
testing without changing project permissions.

Every project screen also keeps a compact timeline in view. It shows the project start, today and
the project-level deadline without making a decision deadline look like the renovation deadline.

## Core principle

The app is the source of truth. The AI worker is a controlled processor. AI proposes reviewable
drafts; it does not make final decisions. Photos are visual evidence, not input automatically
interpreted by AI (no AI vision in the MVP).

## What the MVP is not

- It does not analyze photos with AI.
- It does not use NanoClaw, OpenClaw or Telegram as core dependencies.
- It does not send automatic communications to the builder or the owners.
- It does not approve cost changes or handle claims.
