---
name: pr-prep
description: Prepare a clean branch, Conventional Commit and pull request for this repo (diff hygiene, secret check, checks run, PR template). Use when the user asks to commit, open a PR, or prepare changes for review. Only commit/push with explicit user approval.
disable-model-invocation: true
---

1. `git status` / `git diff` — confirm only intended files. Exclude `dist/`, `node_modules/`, `uploads/`, `.env*`, `*.sql` dumps, logs.
2. Secret check on the staged diff: `git diff --staged | grep -nEi '(password|secret|api[_-]?key|token|BEGIN .*PRIVATE KEY|AKIA|rzp_live_)'` — investigate every hit.
3. Branch from `main`: `feat|fix|security|chore|docs/<scope>-<desc>`.
4. Run build, lint ratchet, tests; paste results into the PR.
5. Commit with Conventional Commits, small and focused. Ask the user before committing and again before pushing.
6. PR body follows `.github/pull_request_template.md`; link TRACKER IDs.
