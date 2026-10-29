---
name: tracker
description: Read or update the built-in engineering tracker (docs/engineering/TRACKER.md) — add items, change status, record evidence, print a progress summary. Use whenever work on a tracked item starts or finishes, when a new finding/task appears, or when the user asks "what's the status", "what's next", or "/tracker".
argument-hint: "[summary | next | add <title> | start <ID> | done <ID> | block <ID> <reason>]"
allowed-tools: Read, Edit, Bash(node scripts/tracker.mjs*)
---

The tracker is `docs/engineering/TRACKER.md`. Its items table is the source of truth for planned, in-progress, blocked and completed engineering work. `scripts/tracker.mjs` parses it.

## Commands
- `node scripts/tracker.mjs summary` — counts by status/priority and a progress bar.
- `node scripts/tracker.mjs next` — open items ordered by priority (P0 first), unblocked first.
- `node scripts/tracker.mjs list [status]` — filter by `todo|doing|blocked|done`.
- `node scripts/tracker.mjs check` — validates the table (unique IDs, valid status/priority, done items have evidence). Run after every edit.

## Updating (edit the markdown table directly with Edit)
Row format: `| ID | P | Status | Area | Title | Owner | Evidence / notes |`
- IDs: `SEC-n`, `DB-n`, `FE-n`, `BE-n`, `QA-n`, `OPS-n`, `DOC-n`, `AI-n`. Never reuse an ID.
- Priority: `P0` (critical, do now) · `P1` (high) · `P2` (medium) · `P3` (low).
- Status: `todo` · `doing` · `blocked` · `done`.
- `done` requires evidence: a command + actual result, a file reference, or a commit hash. "Should work" is not evidence.
- `blocked` requires the blocker and who can unblock it (e.g. "needs user: rotate Razorpay keys").
- Append a line to the **Changelog** section: `- YYYY-MM-DD ID status — note`.

$ARGUMENTS
