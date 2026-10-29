# Frontend, UI/UX and Accessibility Assessment

- **Date:** 2026-10-25
- **Scope:** `src/` (React 18 + Vite, JSX, Tailwind + shadcn/ui)
- **Method:** static reading, grep-based counts, ESLint, production build.
- **Not done:** the UI was **not** visually inspected in a browser. Visual claims below come from code, not screenshots.

## 1. Architecture

- **Routing.** All pages are `React.lazy` + `Suspense` (`src/pages/index.jsx`). Protected routes go through `ProtectedRoute` (client-only, as expected; the server must enforce).
  - Inconsistencies: `/AdvisorDashboard` hard-codes roles and omits `sub_admin`. The debug page `/SubscriptionTest` is routed for every user. `/Invoice`, `/PledgePool` and `/MyPortfolio` have no role gate.
  - 7 unrouted pages (~4k lines).
- **State.** Redux holds only `auth` (a mirror of AuthContext) and an unused `notifications` slice. TanStack Query is installed with **no `QueryClientProvider`**, so any `useQuery` would throw. Data fetching is ad-hoc `useState`/`useEffect` (1,824 / 351).
- **API client** (`src/lib/apiClient.js`):
  - Good single-flight token refresh.
  - The default base URL uses port 4000, but the backend listens on 5000.
  - `list/filter(orderBy)` ignores `orderBy`, which 116 call sites pass. The default `limit=100` silently truncates.
  - `src/api/entities.js` re-defines 4 entities with different endpoints (`Ticket`, `ChatRoomInvite`, `ChatRoomSchedule`, `VIPCustomization`), so behaviour depends on the import path.
  - `src/api/functions.js` has stubs that `console.log('TODO')` and return `{success:true}`, so the UI claims reminders and notifications were sent when they weren't.
- **Leftovers.** Base44 favicon and title in `index.html`, `lovable-tagger`, `supabase/config.toml`, the broken `scripts/migrate-api-imports.js`, a lone `src/utils/index.ts`.

## 2. Security (frontend view)

See `docs/security/security-audit.md`: SEC-16 browser payouts with secrets, SEC-17 client-trusted purchases and mock payment defaults, SEC-18 print-window HTML injection, SEC-29 tokens in localStorage and in WS query strings.

Also:
- 12 `window.open(url)` calls without `noopener`, and 14 unvalidated user `href`s.
- `created_by_admin` and premium gating are decided client-side.
- `react/jsx-no-target-blank` is disabled. All 35 existing `target="_blank"` links do carry `rel` anyway.

## 3. Code health

- **ESLint:** 6,237 errors and 92 warnings. Most are `react/prop-types` (4,666) and `no-unused-vars` (1,242). Meaningful ones: 74 `exhaustive-deps`, and `no-undef` for `google`/`FB` in `Login.jsx:122,166` (the Facebook SDK is never loaded, so that button can't work). The ratchet baseline is in `.eslint-baseline.json`.
- **Largest files:**

  | File | Lines |
  |---|---|
  | `InvestorDashboard.jsx` | 4,116 |
  | `FundManager.jsx` | 3,312 |
  | `AdvisorDashboard.jsx` | 1,536 |
  | `AdManagement.jsx` | 1,522 |
  | `ChatInterface.jsx` | 1,358 |

  …15 files exceed 980 lines.
- **Duplication:** 18 duplicated basenames, e.g. `UserManagement.jsx` ×3 and `PledgeModal.jsx` ×3. There are two hooks folders and two `EmptyState` components.
- **Dead code:** about 100 unimported files (~18.5k lines), including `AutomatedExecutionEngine.jsx`, a client-side trade-execution loop.
- **Toast bug:** 3 files use `react-hot-toast`, but only sonner's `<Toaster>` is mounted, so those toasts never appear. There are also 63 `alert()`/`confirm()` calls.
- **Logging:** 260 `console.log`-style calls and 783 `console.warn/error`.

## 4. UI/UX and design system

- **Tokens.** 135 HSL CSS variables in `src/index.css` and semantic Tailwind colors (`surface`, `heading`, `buy/sell/hold`, `premium`, `brand`, `chart`). Adoption is high: about 13.5k semantic classes and 0 raw palette classes.
  - Remaining hard-coding: `text-white` 844, `bg-white` 540, 198 hex literals across 32 files (`FinancialStatement.jsx` 21).
  - Razorpay `theme.color: "hsl(var(--chart-1))"` won't resolve inside Razorpay's iframe.
- **Dark mode** is configured (`darkMode:["class"]`, `.dark` palette) but never activated: no ThemeProvider, one `dark:` class in the codebase. Either wire up `next-themes` or remove the dead palette.
- **States.** Polls and ChatRooms are good (skeletons, empty, retry).
  - Dashboard swallows fetch errors into zeros and calls `User.list` just to count users.
  - Subscription, AdminPanel and SuperAdmin lack empty states and retry.
  - **There is no app-level ErrorBoundary**, so any render error white-screens the app.
- **Forms:** react-hook-form, zod and resolvers are installed but used in 0 files. The 48 forms use ad-hoc `useState` plus HTML `required`.
- **Responsive:** 52 fixed `w-[NNNpx]`, 80 `grid-cols-3+` with no breakpoint, and 61 tables but only 47 files with `overflow-x-auto`.

## 5. Accessibility (heuristic counts)

- `<img>`: 64, all with `alt`. ✅
- Icon-only buttons: 42 of 47 `size="icon"` buttons, plus about 23 more, lack `aria-label`. There are only 23 `aria-label`s in the codebase.
- 23 clickable `div`/`li`/`Card` elements with no role, `tabIndex` or key handler.
- About 223 of 564 inputs have no associated label.
- No skip link. The page title is "Base44 APP".

## 6. Performance (from the actual build)

| Chunk | Size | gzip |
|---|---|---|
| `SuperAdmin` | 1,085 kB | 222 kB |
| `index` (entry) | 488 kB | 159 kB |
| recharts core | 384 kB | 105 kB |
| `ChatRooms` | 241 kB | 72 kB |

- `pages/SuperAdmin.jsx` eagerly imports about 30 admin sections.
- Razorpay `checkout.js` loads synchronously in `<head>` on every page, and is injected again by 2 components.
- 31 independent `setInterval` pollers (5–60 s), none paused when the tab is hidden. `TypingIndicator` polls even though WebSockets exist.

## Top 10 frontend actions

1. **(High)** Move payouts server-side and stop serving gateway secrets to browsers.
2. **(High)** All purchases go through create-order → server verify → server fulfilment. Mock payments off by default. Delete the simulate paths.
3. **(High)** Escape print-window HTML. Add `safeUrl()`.
4. **(Medium)** Refresh token in an httpOnly cookie, access token in memory, WS ticket auth.
5. **(Medium)** Root `ErrorBoundary` and `QueryClientProvider`. Migrate Dashboard, Subscription and the admin pages to `useQuery` with proper states.
6. **(Medium)** API layer: honour or remove `orderBy`, merge the duplicate entity endpoints, align ports, make stubs throw.
7. **(Medium)** Delete dead code and leftovers. Switch the 3 `react-hot-toast` users to sonner.
8. **(Medium)** Accessibility: `aria-label`s, buttons instead of clickable divs, input labels. Add `eslint-plugin-jsx-a11y`.
9. **(Medium)** Performance: lazy-load SuperAdmin sections, load Razorpay on demand, `manualChunks` for recharts and framer-motion, pause-on-hidden polling or WebSockets.
10. **(Low)** Decide on dark mode. Replace `bg-white`/`text-white` and hex literals with tokens.

**On the 4,666 `react/prop-types` errors:** the project doesn't use PropTypes and isn't TypeScript, so the rule is noise. Disabling it is a team decision that should be recorded. It was **not** changed here, because the standards forbid loosening lint rules unilaterally. The ratchet already keeps these errors from growing.
