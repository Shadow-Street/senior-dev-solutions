# Engineering Tracker

The built-in work tracker for this repository. It is the single source of truth for planned, in-progress, blocked and completed engineering work.

- **View:** `npm run tracker` (summary) · `node scripts/tracker.mjs next` · `node scripts/tracker.mjs list blocked` · `node scripts/tracker.mjs list --area SEC`
- **Validate after editing:** `node scripts/tracker.mjs check`
- **Rules:** see the `tracker` skill (`.claude/skills/tracker/SKILL.md`). `done` needs evidence (command + result, file, or commit). `blocked` needs the blocker and who can unblock it.
- **Priority:** P0 critical · P1 high · P2 medium · P3 low. **Status:** todo · doing · blocked · done.
- A short summary prints automatically at the start of each Claude Code session (SessionStart hook in `.claude/settings.json`).

## Items

<!-- tracker:items:start -->
| ID | P | Status | Area | Title | Owner | Evidence / notes |
|---|---|---|---|---|---|---|
| SEC-1 | P0 | blocked | SEC | Untrack and purge committed DB dump from git history | repo owner | needs user: `git rm --cached` was refused by the permission policy; purge needs a force-push. See remediation-plan Phase 0.2 |
| SEC-2 | P0 | blocked | SEC | Rotate admin, DB, gateway and API credentials exposed in dump and seed scripts | repo owner | needs user: credentials removed from code (seed_admin.cjs, seed_superadmin.js → SEED_* env), rotation is owner-only |
| SEC-3 | P0 | done | SEC | Block self-promotion to super_admin via PUT /api/users/:id and /api/admin/users/:id | backend-api-engineer | access-control.test.js (10 tests incl. app_role/role games, legacy role-only super admin, admin email takeover); utils/roles.js |
| SEC-4 | P0 | done | SEC | Make /api/exports admin-only, no secret columns, CSV formula escaping | backend-api-engineer | access-control.test.js (4 tests) |
| SEC-5 | P0 | done | SEC | Staff-only CRUD /bulk endpoints and fix route ordering | backend-api-engineer | access-control.test.js (3 tests) |
| SEC-6 | P0 | todo | SEC | Activate subscriptions only from verified payments; protect Subscription CRUD fields | backend-api-engineer | remediation-plan Phase 2.1; check frontend upgrade flow first |
| SEC-7 | P0 | todo | SEC | Refunds only against caller's server-recorded payments; scope /funds/transactions | backend-api-engineer | depends on BE-1 (server-side investor/fund flows) |
| SEC-8 | P0 | done | SEC | Webhook: 503 without secret, raw-body HMAC (fail closed), hex byte compare, log unhandled rejections | backend-api-engineer | webhook.test.js (5 tests incl. malformed/non-ASCII signatures, case-insensitive path) |
| SEC-13 | P0 | done | SEC | Admin-only feature and localization writes (were unauthenticated) | backend-api-engineer | access-control.test.js (3 tests) |
| SEC-14 | P0 | done | SEC | Password-reset link never derived from Origin/Host | backend-api-engineer | auth-hardening.test.js (2 tests) |
| SEC-16 | P0 | todo | SEC | Move payouts server-side; never send gateway secrets to browsers | frontend-ui-engineer | PayoutDetailsModal.jsx; needs backend payout endpoint |
| SEC-17 | P0 | todo | SEC | Server-verified purchases for courses and events; mock payments off by default | frontend-ui-engineer | EnrollmentModal, TicketPurchaseModal, UniversalPaymentModal, PaymentService.jsx |
| SEC-19 | P0 | todo | DB | Transactions and idempotency for payment verify, webhooks, refunds, activation | database-engineer | database-assessment §5; unique razorpay_payment_id |
| SEC-9 | P1 | todo | SEC | Protect money/status/approval fields on revenue, payout, refund, referral, commission, review | backend-api-engineer | security-audit SEC-9 |
| SEC-10 | P1 | doing | SEC | Admin role checks on remaining admin routers (route table) | backend-api-engineer | platform settings PUT done (test); entity-config, approvals, financial, expense, income, announcements, ads, vendors, PM, events, meetings open |
| SEC-11 | P1 | todo | SEC | Chat/WS authorization: membership, paywall, server-stamped user_id, no email broadcast, maxPayload | backend-api-engineer | security-audit SEC-11 |
| SEC-12 | P1 | todo | SEC | Admin-only user directory; User defaultScope excludes password | backend-api-engineer | security-audit SEC-12 |
| SEC-15 | P1 | todo | SEC | Authenticate and owner-scope pledge routes | backend-api-engineer | security-audit SEC-15 |
| SEC-18 | P1 | todo | SEC | Escape print-window HTML; add safeUrl() helper | frontend-ui-engineer | ExportManager.jsx, FinancialStatement.jsx |
| SEC-20 | P1 | todo | SEC | Dependency vulnerabilities: npm audit fix batch, then nodemailer major | devops-quality-engineer | FE 1C/18H, BE 2C/15H (2026-10-25) |
| SEC-21 | P1 | todo | SEC | Reject banned/suspended users in login, authenticate and WS | backend-api-engineer | security-audit M-1 |
| SEC-22 | P1 | done | SEC | Generic login error + dummy bcrypt compare (no account enumeration by text or timing) | backend-api-engineer | auth-hardening.test.js |
| SEC-23 | P1 | done | SEC | Ignore client-supplied role at register/Google signup | backend-api-engineer | auth-hardening.test.js |
| SEC-24 | P1 | todo | SEC | Payment verify: ownership check, unique payment id, constant-time compare | backend-api-engineer | part of Phase 2 |
| SEC-26 | P2 | todo | SEC | Global rate limit, ~1MB JSON cap, AI quotas, OTP resend throttle | backend-api-engineer | check upload paths before lowering body limit |
| SEC-25 | P2 | todo | SEC | Public-settings allow-list instead of regex redaction | backend-api-engineer | platform.routes.js |
| SEC-27 | P2 | doing | SEC | Generic error responses everywhere | backend-api-engineer | central JSON error handler done (test); ~21 handlers still return error.message |
| SEC-28 | P2 | todo | SEC | Object-level checks: commissions, audit logs, poll votes, room-scoped GETs | backend-api-engineer | security-audit M-8 |
| SEC-29 | P2 | todo | SEC | Refresh token in httpOnly cookie, access token in memory, WS ticket auth | frontend-ui-engineer | |
| SEC-30 | P2 | done | SEC | Fail fast without SESSION_SECRET in production | backend-api-engineer | backend/src/app.js |
| SEC-31 | P0 | done | SEC | Pledge read endpoints unauthenticated: GET /api/pledges/pledges, /sessions, /executions (any user's executions via ?user_id=, uncapped limit); updateSession + createExecutionRecord write req.body unchecked (no role/ownership) | backend-api-engineer | Worktree branch claude/stoic-bardeen-88bbd6 (uncommitted): authenticate on all pledge GETs; non-staff confined to own pledges/executions/access-requests; limit<=200, offset>=0, string-only filters; updateSession + createExecutionRecord staff-only with field whitelists; createPledge/updatePledge/createSession/createAccessRequest whitelisted, owner edits only while pending (409). backend/test/pledge-access.test.js 21 tests; `npm --prefix backend test` 81/81 pass; lint ratchet OK 6237/6237. security-auditor + code-reviewer reviewed 2026-10-29. Advisor session ownership waits on BE-8; demat/session validation → SEC-33 |
| SEC-32 | P1 | doing | SEC | Meeting API: no https/host validation on meeting_url; CRUD + PUT /:id/end lack creator/moderator/admin check; GET /room/:roomId/active unauthenticated | backend-api-engineer | Worktree branch claude/stoic-bardeen-88bbd6 (uncommitted): meeting_url https + host allowlist (meet.google.com, zoom.us, *.zoom.us, teams.microsoft.com, teams.live.com), no ports/userinfo; update/delete/end need host, room owner, room moderator or staff; host_id server-stamped, chat_room_id immutable, recording_url staff-only; reads follow room visibility; /room/:id/active needs login. backend/test/meeting-access.test.js 23 tests, 81/81 pass. Not done: moderator/membership rows are forgeable via chat participant CRUD and /join — depends on SEC-11. UI follow-up FE-18 |
| SEC-33 | P1 | todo | SEC | Pledge integrity: demat_account_id not checked against caller (no demat model); createPledge does not validate session exists/active, symbol/side vs session, qty>0, approved access; staff can set pledge paid without a verified payment | backend-api-engineer | found by security-auditor review of SEC-31 2026-10-29; pairs with SEC-6/SEC-17 |
| SEC-34 | P2 | todo | SEC | Public GET /api/polls/active returns full rows for premium polls (options, description, created_by, image_url); /chatrooms/public returns whole ChatRoom rows | backend-api-engineer | found by security-auditor review of FE-19 2026-10-30 (pre-existing); drop/strip premium rows for non-premium callers, whitelist public fields; relates SEC-11/SEC-28 |
| DB-1 | P0 | doing | DB | Production guard on all DB-writing scripts | database-engineer | reset-schema, seed_admin, seed_superadmin guarded (script-guard.test.js); fix_*, update_plan_pricing, test_* open |
| DB-2 | P1 | todo | DB | Drop 62 duplicate unique indexes on users/stocks/feature_configs (+promo_codes) | database-engineer | needs approved migration + backup + window |
| DB-3 | P1 | todo | DB | Adopt umzug migrations with meta table; baseline from prod DDL; sync() dev-only | database-engineer | database-assessment §2 |
| DB-4 | P1 | todo | DB | Fix FundTransaction.transaction_type ENUM (refund) | database-engineer | breaks refunds after money moved |
| DB-5 | P1 | todo | DB | Unique keys: poll_votes, chat participants, enrollments, transaction ids, invoice_number | database-engineer | database-assessment §3 |
| DB-6 | P2 | todo | DB | Indexes on hot columns (messages, subscriptions, transactions, user_id/status) | database-engineer | database-assessment §4 |
| DB-7 | P2 | todo | DB | Pool, timezone, TLS, slow-query logging; cap all limit params | database-engineer | |
| DB-8 | P3 | todo | DB | Token/code pruning schedule, log retention, encrypt payout details | database-engineer | |
| BE-1 | P0 | todo | BE | Server-side purchase/payment service used by subscriptions, courses, events, funds | principal-architect | architecture-assessment target #2 |
| BE-2 | P1 | todo | BE | Secure-by-default CRUD factory (required access policy + writableFields) | principal-architect | architecture-assessment target #1 |
| BE-3 | P2 | todo | BE | Delete dead services/config (PasswordResetService, PaymentService, SocialAuthService, config/database.js) | backend-api-engineer | |
| BE-4 | P3 | todo | BE | Redis sessions; cron leader lock or worker | backend-api-engineer | TD-18 |
| BE-5 | P1 | todo | BE | Route async handler errors to the central error handler (wrapper or express-async-errors) | backend-api-engineer | review L7: rejections now logged but requests can hang |
| BE-6 | P2 | todo | BE | Per-model export column allow-list instead of secret-column deny-list | backend-api-engineer | review L2 |
| BE-7 | P2 | todo | BE | Decide sub_admin privileges; standardise all checks on effectiveRole() | principal-architect | utils/roles.js; isStaff still includes sub_admin for per-record CRUD |
| FE-1 | P1 | todo | FE | Root ErrorBoundary and QueryClientProvider | frontend-ui-engineer | frontend-assessment §4 |
| FE-2 | P1 | todo | FE | API client: honour/remove orderBy, merge duplicate entities, align ports, stubs throw | frontend-ui-engineer | TD-11, TD-12 |
| FE-3 | P2 | todo | FE | Split SuperAdmin chunk (1.08 MB), load Razorpay on demand, manualChunks | frontend-ui-engineer | build output |
| FE-4 | P2 | todo | FE | Remove dead files, unrouted pages, Base44/Lovable/Supabase leftovers | frontend-ui-engineer | TD-8, TD-23 |
| FE-5 | P2 | todo | FE | Switch react-hot-toast users to sonner (toasts not rendering) | frontend-ui-engineer | VoteModal, Advisors, Finfluencers |
| FE-6 | P2 | todo | FE | Loading/empty/error states on Dashboard, Subscription, admin pages | frontend-ui-engineer | |
| FE-7 | P2 | todo | FE | Accessibility pass + eslint-plugin-jsx-a11y | frontend-ui-engineer | frontend-assessment §5 |
| FE-8 | P3 | todo | FE | Decide dark mode; replace bg-white/text-white/hex with tokens | frontend-ui-engineer | |
| FE-9 | P3 | todo | FE | Team decision on react/prop-types rule (4,666 noise errors) | principal-architect | needs team decision; not changed unilaterally |
| FE-10 | P1 | done | FE | Client brief 2026-10-29: brand green #56E11B (hover #63E52E) app-wide; logo, favicon, hero/auth/sponsored/polls images | frontend-ui-engineer | index.css/tailwind tokens; renderBrandLogo (common/BrandLogo.jsx); `npm run build` ✓, verified in browser (login, dashboard, polls) |
| FE-11 | P1 | done | FE | Profile/portal logout → /login; User.logout awaits token revoke+clear | frontend-ui-engineer | ProfileLogout.test.jsx + userLogout.test.js (fails on old code); browser: Profile→Logout lands /login, tokens cleared |
| FE-12 | P1 | done | FE | Advisor: register /AdvisorPledgeManagement; ?section= drives AdvisorDashboard tabs; subscribers via /my-subscribers; pledge session/execution filter bugs | frontend-ui-engineer | index.jsx route + PORTAL_PAGES; browser: both routes resolve (free user → /unauthorized). Signed-in advisor walk-through pending advisor login (FE-15) |
| FE-13 | P2 | done | FE | Portfolio cards = Chat Room width; Event Organizer "Soon" (no dropdown); chat Start Meeting beside Create Poll, banner removed | frontend-ui-engineer | browser: card width 358px = ChatRooms 358px; meeting dialog opens from header |
| FE-14 | P3 | done | FE | Dead links: footer Sitemap/Accessibility removed, /MyStocks → /MyPortfolio | frontend-ui-engineer | route-target scan vs src/pages/index.jsx |
| FE-15 | P1 | blocked | FE | Click-through test of every AdvisorDashboard / Pledge section as a signed-in advisor | frontend-ui-engineer | needs user: local advisor test login |
| FE-16 | P3 | todo | FE | Remaining unrouted link targets: /BecomeOrganizer, /OrganizerDashboard, /FinfluencerDashboard, /ReferralDashboard, /EducatorProfile, /CourseDetail | principal-architect | features coming soon; decide route vs remove |
| FE-17 | P2 | blocked | FE | Indian stock market news API (replace Finnhub general/US news) | principal-architect | needs client: choose provider, approve plan/pricing, supply API key |
| FE-18 | P2 | todo | FE | MeetingControls: show server 400/404 errors (currently console-only), mirror backend host allowlist in safeMeetingUrl, hide Edit/End for non-host non-moderators, End via PUT /meetings/:id/end | frontend-ui-engineer | follows SEC-32 backend tightening; allowlist needs product sign-off (Jitsi/Webex/zoom.com rejected today) |
| FE-19 | P1 | done | FE | Public Home page (/home, /landing) rebuilt to match protocall.in/home: header, hero, stats, features, market insights, community, reviews, how it works, membership, about, CTA, footer; new logo app-wide | frontend-ui-engineer | src/components/home/*, Landing.jsx, `home-*` tokens + Plus Jakarta Sans; section heights equal reference at 1440/768/375 except live-data sections; no horizontal scroll; build ✓, lint ratchet 6227/6237, `npm test` 23/23 |
| FE-20 | P1 | done | FE | Signed-out visitors bounced from every public page to /login (SubscriptionProvider's anonymous User.me() 401 treated as session expiry) | frontend-ui-engineer | apiClient interceptor: no stored token → no refresh/redirect; anonymous401.test.js (fails on old code); browser: /home and /terms stay put signed out |
| FE-21 | P3 | todo | FE | Self-host Plus Jakarta Sans (Google Fonts sends visitor IP/referrer to Google); remove or fix unused useApi.js useCurrentUser().logout (no server revoke, leaves refreshToken) | frontend-ui-engineer | security-auditor review of FE-19/FE-20 2026-10-30; font package needs dependency approval |
| BE-8 | P1 | blocked | BE | Pledge sessions not owned by advisor: no created_by_advisor_id column, listSessions ignores filter → every advisor sees all sessions | database-engineer | needs user approval for migration (add column + backfill) and backend scoping; migration design (created_by_advisor_id → advisors.id, backfill from legacy advisor_id) in SEC-31 hand-over; verify real pledge_sessions / pledge_execution_records.user_id types first (models say INT, users.id is UUID) |
| BE-9 | P1 | todo | BE | Advisor payouts send requested_amount but model column is amount; commission tracking scoped to user_id not advisor | backend-api-engineer | overlaps SEC-16 (payouts server-side); found by advisor audit 2026-10-29 |
| QA-1 | P0 | done | QA | Backend test harness (node:test + supertest, no DB) | test-engineer | npm --prefix backend test → 37/37 pass; 29/37 fail on original HEAD |
| QA-2 | P0 | done | QA | Frontend test harness (Vitest + Testing Library) | test-engineer | npm test → 8/8 pass (ProtectedRoute 5, tracker 3) |
| QA-3 | P1 | todo | QA | Authorization regression tests for every router in the route table | test-engineer | grows with SEC-9..SEC-28 |
| QA-4 | P2 | todo | QA | Playwright E2E for login + checkout once a seeded test DB exists | test-engineer | blocked in practice on a test environment |
| QA-5 | P2 | todo | QA | Raise frontend coverage on api client, auth context, payment components | test-engineer | currently ~0% lines |
| OPS-1 | P0 | done | OPS | CI workflow: build, lint ratchet, tests+coverage, audit, gitleaks | devops-quality-engineer | .github/workflows/ci.yml (YAML valid; commands run locally; workflow not yet run on GitHub) |
| OPS-2 | P1 | done | OPS | ESLint per-file ratchet with baseline | devops-quality-engineer | scripts/lint-ratchet.mjs; probe file → exit 1; baseline 6237 |
| OPS-3 | P1 | blocked | OPS | Activate SonarQube (project key, org, SONAR_TOKEN, SONAR_ENABLED var) | repo owner | needs user: choose Cloud/Server and create project; config ready in sonar-project.properties |
| OPS-4 | P1 | todo | OPS | Make npm audit blocking in CI after SEC-20 | devops-quality-engineer | |
| OPS-5 | P3 | todo | OPS | Evaluate Semgrep SAST after Sonar is live | devops-quality-engineer | |
| OPS-6 | P2 | todo | OPS | Dockerfile + compose for API, MySQL and SPA (dev/test env) | devops-quality-engineer | enables QA-4 |
| DOC-1 | P1 | done | DOC | Discovery, architecture, debt, risk, DB, frontend, tooling docs | principal-architect | docs/engineering/*.md |
| DOC-2 | P1 | done | DOC | Threat model, security audit, remediation plan | security-auditor | docs/security/*.md |
| DOC-3 | P2 | todo | DOC | Rewrite README setup (stale backend_protocall path, env vars, test commands) | principal-architect | |
| AI-1 | P0 | done | AI | Project CLAUDE.md, standards, settings guards | principal-architect | CLAUDE.md, docs/engineering/engineering-standards.md, .claude/settings.json |
| AI-2 | P0 | done | AI | 8 project subagents | principal-architect | .claude/agents/*.md |
| AI-3 | P0 | done | AI | 11 project skills incl. tracker | principal-architect | .claude/skills/*/SKILL.md |
| AI-4 | P1 | done | AI | Built-in tracker (TRACKER.md, scripts/tracker.mjs, skill, SessionStart hook) | principal-architect | node scripts/tracker.mjs check |
<!-- tracker:items:end -->

## Changelog

- 2026-10-30 — FE-19 done (public Home page rebuilt from protocall.in/home, new logo + favicon, hero image GreenBull downloaded with approval). FE-20 done (public pages no longer redirect signed-out visitors to /login). security-auditor + code-reviewer: approve, no blockers; follow-ups SEC-34, FE-21. Contact Support FAQ links now open an on-page FAQ (old landing #faq anchor removed).
- 2026-10-29 — SEC-31 done (pledge auth/scoping/whitelists, 21 tests); SEC-32 doing (meeting URL allowlist + host/moderator/staff checks, 23 tests; moderator path depends on SEC-11). `npm --prefix backend test` 81/81. SEC-33, FE-18 opened. Code in worktree branch claude/stoic-bardeen-88bbd6, uncommitted.
- 2026-10-29 — Client brief: FE-10..14 done (green #56E11B, brand assets, logout→/login, advisor routes/tabs, portfolio width, organizer Soon, chat meeting button, dead links). FE-15 blocked (advisor login), FE-17 blocked (news API approval), BE-8 blocked (migration approval), BE-9/FE-16 opened. Security review: second User.logout (api/entities) fixed + tested; meeting links https-only on the client; SEC-31 (P0) and SEC-32 opened for the backend.
- 2026-10-25 — Independent review (changes requested) addressed: webhook byte compare, effective-role super-admin guards incl. AdminController, admin email takeover, login timing, CSV negatives, bulk admin-only, stronger tests. BE-5/6/7 added.
- 2026-10-25 — Tracker created from the Phase A–D audit; SEC-3/4/5/8/13/14/22/23/30, QA-1/2, OPS-1/2, DOC-1/2, AI-1..4 done; SEC-1/2, OPS-3 blocked on owner.
