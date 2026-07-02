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

## Core principle

The app is the source of truth. The AI worker is a controlled processor. AI proposes reviewable
drafts; it does not make final decisions. Photos are visual evidence, not input automatically
interpreted by AI (no AI vision in the MVP).

## What the MVP is not

- It does not analyze photos with AI.
- It does not use NanoClaw, OpenClaw or Telegram as core dependencies.
- It does not send automatic communications to the builder or the owners.
- It does not approve cost changes or handle claims.
