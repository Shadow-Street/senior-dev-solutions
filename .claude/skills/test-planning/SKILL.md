---
name: test-planning
description: Plan and write risk-based tests with this repo's harnesses (Vitest + Testing Library for src/, node:test + supertest for backend/). Use when adding tests for a fix/feature, writing a regression test, or assessing coverage.
---

1. Identify the risk: what breaks for users or security if this regresses?
2. Pick the lowest level that proves it: pure function → unit; route behaviour → supertest against `require('backend/src/app').app` with stubbed models; UI behaviour → Testing Library.
3. Backend tests must not touch MySQL/Redis/S3/network: stub with `node:test` `mock.method(...)` on models/services; set `JWT_SECRET` etc. in the test via `process.env` before requiring the app.
4. Write the failing test first when fixing a bug; confirm it fails without the fix.
5. Name tests by behaviour: `rejects unauthenticated access to GET /api/users`.
6. Run: `npm test` / `npm --prefix backend test`. Report pass/fail/skip counts exactly.
7. Never weaken an assertion to go green; record real failures as TRACKER items.
