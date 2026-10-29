# Architecture Assessment

**Date:** 2026-10-25

## Current architecture

A two-tier monolith: a React SPA, and a single Express process that also hosts WebSockets and cron, over one MySQL database. External integrations are Razorpay, S3, Google OAuth, Gemini, Finnhub/Yahoo Finance and SMTP. There are no containers, IaC or deployment config in the repo.

```
SPA (Vite) ──REST/WS──► Express (routes → controllers/crudController → Sequelize) ──► MySQL
                           ├─ WebSocketService (same process)
                           └─ CronService (same process, every instance)
```

## Strengths

- Clear backend layering in newer code (routes → controllers → services). The services for auth, verification and storage are thoughtfully written and commented.
- Token design is sound: short access TTL, hashed and rotated refresh tokens with reuse detection, CSPRNG OTPs with attempt limits.
- Private-file access goes through an ownership-checked route with presigned S3 URLs.
- The frontend already route-splits with `React.lazy`, and design-token adoption is high (about 13.5k semantic classes, no raw palette classes).

## Structural problems (evidence-based)

| # | Problem | Impact | Evidence |
|---|---|---|---|
| A1 | **Generic CRUD factory as the default API surface.** About 40 resources are exposed through `createCrudRoutes` with authentication but without ownership, protected fields or allow-lists. | Most authorization findings (SEC-5, 9, 10, 11, 28) come from this one default. | `utils/crudController.js`; route table in the security audit |
| A2 | **Client-side business logic for money.** Purchases, enrollments, tickets, payouts, ledger rows and commissions are created from the browser. | Integrity cannot be enforced; easy fraud. | `EnrollmentModal.jsx`, `TicketPurchaseModal.jsx`, `PayoutDetailsModal.jsx`, `PaymentModal.jsx`, `FundManager.jsx` |
| A3 | **Three schema sources** (`sequelize.sync()`, raw SQL migrations that don't match, ad-hoc ALTER scripts) and no migration tracking. | Environments drift; risky deploys; 63 duplicate unique indexes. | database assessment §1–3 |
| A4 | **No transactions or idempotency** on financial flows (one `sequelize.transaction()` in the codebase). | Double activation, double refund, lost vote counts. | database assessment §5 |
| A5 | **Stateful single process**: MemoryStore sessions, in-memory WS rooms, cron on every instance. | Can't scale horizontally without duplicate cron runs or split chat state. | `app.js`, `server.js`, `WebSocketService.js` |
| A6 | **Frontend state fragmentation**: Redux mirrors AuthContext; TanStack Query is installed with no provider; 1,824 `useState` and 351 `useEffect` fetch calls. Two entity modules define conflicting endpoints. | Inconsistent loading and error UX, silent bugs (ignored `orderBy` at 116 call sites). | frontend assessment §1 |
| A7 | **Very large page components** (InvestorDashboard 4,116 lines, FundManager 3,312). | Hard to test, review or change safely. | frontend assessment §3 |

## Recommended target (incremental, no rewrite)

1. **Secure-by-default CRUD**: make `createCrudController` require an explicit `access` policy per resource (`public-read`, `owner`, `staff`) and an explicit `writableFields` allow-list. Fail at boot if a router omits it. This turns A1 from a per-route audit into a compile-time-like guarantee.
2. **Server-owned money flows**: one `PaymentService` on the backend for create-order → verify → fulfil, used by subscriptions, courses, events and payouts. The frontend only opens checkout (A2, A4).
3. **One migration path**: umzug (or sequelize-cli) with a `SequelizeMeta` table, baselined from the production DDL. `sync()` allowed only in development (A3).
4. **Ops readiness**: Redis-backed sessions (redis is already a dependency), cron behind a leader lock or a separate worker, and the WS adapter on Redis when scaling (A5).
5. **Frontend data layer**: mount `QueryClientProvider`, migrate read-heavy pages to `useQuery`, merge `src/api/entities.js` into `src/lib/apiClient.js`, add a root `ErrorBoundary` (A6). Split the largest pages as they are touched (A7).

**Not recommended now:** a TypeScript migration of 145k lines, a framework change, or microservices. Better ROI: tests around the money flows and authorization, JSDoc types on the API client, and `checkJs` on new modules.
