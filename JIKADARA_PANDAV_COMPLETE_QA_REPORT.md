# Jikadara & Pandav Associates — Complete QA Audit Report

**Application:** Jikadara & Pandav Associates — Advocate Management System
**Frontend under test:** https://jikadara-and-pandav-associates.vercel.app/
**Backend API under test:** https://jikadara-pandav-associates.onrender.com/api
**Audit date:** 6 November 2026
**Audit type:** Black-box functional + API + database integrity + security + responsive UI + automated regression
**Test account:** `testuser123@gmail.com` (role `SENIOR`, 20 allowed pages, user id `bf43c3f3-4710-4e45-b009-505ddbe9d62e`)

---

## 1. Executive summary

The application is **functionally broad and largely stable**. All 20 pages available to a SENIOR user render without uncaught errors, the core client/task/ledger/notary/verabill workflows work end-to-end, and the database layer is structurally sound (26 foreign keys, zero orphan rows, correct cascades, all money columns `numeric(12,2)`).

The audit executed **120 API/functional checks** and **40 automated browser tests** (all 40 passing), plus a read-only database integrity review and an axe-core accessibility scan. It found **no P0 (blocker) defects**, but **3 P1 (high)**, **12 P2 (medium)** and **6 P3 (low)** issues that should be scheduled before the system is relied on for financial record-keeping.

The three most important issues are:

1. **Negative transaction amounts are accepted** (`POST /api/transactions` with `amount: -50` returns `201`). Because task totals are computed with SQL `SUM`, a negative income silently reduces reported income — a direct financial-integrity risk.
2. **The yearly report returns 13 months** (`2025-03 … 2026-03`) for an April–March financial year, adding a phantom month from the previous FY and potentially double-counting/mis-bucketing entries in exports.
3. **CORS reflects any origin with credentials enabled**, and the production API is missing CSP and `X-Frame-Options`. This is a security-hardening gap that is cheap to fix.

The remaining medium issues are validation/robustness gaps (zero amounts, unhandled invalid dates producing 500s, inverted financial-year ranges), session-hardening gaps (access token remains valid after logout, no login throttling), an information-disclosure endpoint, incomplete Recycle Bin coverage for Verabill/Nondh records, paise-loss in displayed/printed money, accessibility failures on every authenticated page, and a dead transliteration dependency.

**Overall quality assessment:** good breadth and UX polish; the weaknesses are concentrated in *input validation at API boundaries*, *financial presentation precision*, and *security hardening* rather than in core workflow correctness.

---

## 2. Severity model

| Severity | Definition | Release guidance |
|---|---|---|
| **P0 – Blocker** | Data loss/corruption, auth bypass, core module unusable | Must fix before use |
| **P1 – High** | Financial miscalculation, security weakness with realistic impact, major feature incorrect | Fix in current sprint |
| **P2 – Medium** | Functional defect with a workaround, validation/robustness gap, incomplete feature parity | Fix in next sprint |
| **P3 – Low** | UX inconsistency, cosmetic defect, defence-in-depth hardening | Backlog |
| **INFO** | Observed behaviour that is by design or informational | No action required |
| **BLOCKED** | Cannot be verified with available access/tools — explicitly **not** a pass | Needs follow-up access |

---

## 3. Scope and coverage

### 3.1 Modules exercised

| Area | Pages / endpoints | Functional | CRUD | Financial | Security | Responsive |
|---|---|---|---|---|---|---|
| Authentication | `/login`, `/forgot-password`, `/auth/*` | ✅ | ✅ | — | ✅ | ✅ |
| Dashboard | `/app/dashboard` | ✅ | — | ✅ | ✅ | ✅ |
| Clients | `/app/clients`, `/api/clients` | ✅ | ✅ | — | ✅ | ✅ |
| Tasks & transactions | `/app/tasks`, `/api/tasks`, `/api/transactions` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports | `/app/reports`, `/api/reports/*` | ✅ | — | ✅ | ✅ | — |
| Office Ledger | `/app/excel-sheets/office-reports`, `/api/office-ledger` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Financial Years | `/api/financialYears` | ✅ | ✅ | ✅ | — | — |
| Notary Hisab | `/app/excel-sheets/notary-hisab`, `/api/notary-hisab/*` | ✅ | ✅ | ✅ | ✅ | — |
| Nondh Status | `/app/excel-sheets/nondh-status`, `/api/nondh-status` | ✅ | ✅ | ✅ | — | — |
| Verabill / Light Bill | `/app/excel-sheets/verabill`, `/api/verabill` | ✅ | ✅ | ✅ | — | — |
| Upad | `/app/upad`, `/api/upad` | ✅ | ✅ | ✅ | ✅ | — |
| Document Types | `/app/admin/document-types`, `/api/documentTypes` | ✅ | ✅ | — | ✅ | — |
| Pedhinamu Builder | `/app/tools/pedhinamu`, `/api/pedhinamu` | ✅ | ✅ | — | — | — |
| Invoice Generator | `/app/tools/invoice`, `/api/invoices` | ✅ | ✅ | ✅ | — | ✅ |
| Recycle Bin | `/app/recycle-bin`, `/api/recycle-bin` | ✅ | ✅ | — | ✅ | — |
| Utility tools | Translator, Universal Converter, Jantri, Rent Agreement, Numbers-to-Words, Document AI | ✅ | — | ✅ | — | ✅ |
| RBAC / permissions | route guards + API middleware | ✅ | — | — | ✅ | — |

### 3.2 Method

- **Source review** of the deployed codebase (`server/routes/*`, `server/middleware/*`, `prisma/schema.prisma`, `src/features/*`) used as the source of truth for business rules and to pin root causes with file/line references.
- **Live API testing** against the deployed Render backend using a black-box Node suite (`qa/api-suite.mjs`, 120 checks) with isolated `[QATEST-<epoch>]` records and immediate cleanup.
- **Browser automation** against the deployed Vercel frontend using Playwright (`qa/tests/`, 40 tests, Chromium) with console/page-error/network-5xx capture, failure screenshots, video and trace.
- **Database verification** against the local Postgres mirror (`advocate_management`) using read-only `information_schema` / integrity queries and rolled-back precision experiments.
- **Accessibility** scan with axe-core (WCAG 2.0/2.1 A+AA) on eight representative pages.

---

## 4. Results summary

### 4.1 API & functional suite

| Metric | Count |
|---|---|
| Total checks | 120 |
| PASS | 101 |
| FAIL | 15 |
| BLOCKED | 1 |
| INFO | 3 |
| Failures by severity | **P1 × 3, P2 × 9, P3 × 3** |

> The API suite covers backend behaviour only. Three further P2 findings (currency-display precision **QA-13**, accessibility **QA-14**, dead transliteration **QA-15**) and three P3 hardening items (**QA-19…21**) came from UI, accessibility and database review — see Section 5 for the full list.

Full machine-readable results: `qa/results/api-results.json`
Run log: `qa/results/api-run.log`

### 4.2 Browser automation

| Metric | Count |
|---|---|
| Playwright tests | 40 |
| Specs | 8 (`auth`, `navigation`, `clients-tasks`, `financial`, `tools`, `security-ui`, `responsive`, `secondary`) |
| Result | **40 / 40 passing** (0 failed, 0 flaky, 0 skipped; 6m 13s) |
| Pages rendered | 20 / 20 SENIOR-allowed pages, no uncaught page errors and no API 5xx |
| Console errors | 4 pages log a transliteration dependency failure (QA-15); no functional breakage |

Full report: `qa/playwright-report/index.html`
Machine-readable: `qa/results/playwright-results.json`
Per-page render matrix: `qa/results/navigation-report.json`

### 4.3 Database integrity (local mirror, read-only)

| Check | Result |
|---|---|
| Foreign keys | 26, all present |
| Orphan `TaskTransaction.taskId` / `.clientId` | 0 / 0 |
| Orphan `Task.clientId` | 0 |
| Orphan Verabill fees/expenses, Notary entries | 0 |
| Money columns | all `numeric(12,2)` |
| Non-positive amounts currently stored | 0 across transactions/ledger/upad |
| CHECK constraints on money fields | **none** (validation is API-only) |
| Cascade rules | Client→Task `CASCADE`, Task→Transaction `CASCADE`, Client→Transaction `SET NULL`, User→all `CASCADE` — as designed |

---

## 5. Findings

### 5.1 P1 — High

#### QA-01 · CORS reflects any origin with credentials enabled
- **Suite ID:** S4
- **Area:** API security
- **Reproduction:**
  ```bash
  curl -i -X OPTIONS https://jikadara-pandav-associates.onrender.com/api/clients \
    -H 'Origin: https://evil.example' \
    -H 'Access-Control-Request-Method: GET'
  ```
- **Actual:** Response contains `Access-Control-Allow-Origin: https://evil.example` and `Access-Control-Allow-Credentials: true`.
- **Expected:** Only the application's own origins should be allowed.
- **Root cause:** `server/index.js:35-38` — `origin: function (origin, callback) { callback(null, true); }` with `credentials: true`.
- **Impact:** Any website can make credentialed cross-origin calls. The app authenticates with a Bearer token in `localStorage` (not cookies), which limits direct exploitability, but the configuration is non-compliant and becomes critical if cookie auth is introduced.
- **Recommendation:** Allow-list `https://jikadara-and-pandav-associates.vercel.app` plus localhost dev origins; reject everything else.

#### QA-02 · Negative transaction amounts accepted and stored
- **Suite ID:** T7
- **Area:** Tasks / financial integrity
- **Reproduction:**
  ```bash
  POST /api/transactions
  { "taskId": "<id>", "type": "INCOME", "amount": -50 }
  → HTTP 201
  ```
- **Actual:** `201 Created`; the negative amount is persisted and included in `SUM(amount)` totals.
- **Expected:** `400` — amounts must be strictly positive.
- **Root cause:** `server/routes/transactions.js:51` only checks `amount === undefined`; `:82` stores `parseFloat(amount) || 0` with no sign check. (The Office Ledger endpoint *does* validate: `amount > 0`, minimum ₹0.01 — the transaction endpoint was missed.)
- **Impact:** A typo or malicious request can reduce reported income or inflate expenses, corrupting dashboard/report totals used for accounting.
- **Recommendation:** Mirror the ledger validation: reject non-finite, `<= 0`, and `< 0.01`; coerce to 2 decimals server-side.

#### QA-03 · Yearly report returns 13 months for an April–March FY
- **Suite ID:** T16
- **Area:** Reports / financial calculations
- **Reproduction:**
  ```bash
  GET /api/reports/yearly?year=2026&fyStartDate=2025-04-01&fyEndDate=2026-03-31
  ```
- **Actual:** `months = 2025-3 … 2026-3` — **13 entries**, including March 2025 which is outside the financial year.
- **Expected:** 12 entries, `2025-04 … 2026-03`.
- **Root cause:** `server/routes/reports.js:315` — `new Date(startOfYear.getFullYear(), startOfYear.getMonth(), 1)`. `startOfYear` is an IST-shifted instant (`2025-03-31T18:30:00Z`); under UTC `getMonth()` returns March, so the loop starts one month early.
- **Impact:** Yearly charts and Excel exports contain a phantom month; any per-month aggregation keyed on this list can mis-bucket or double-count. This is a reporting-accuracy defect in a financial product.
- **Recommendation:** Build the month list from the FY's IST date parts (`toISTDateParts`), or compute month keys arithmetically from `fyStartDate` without `Date.getMonth()`.

### 5.2 P2 — Medium

#### QA-04 · Zero-value transactions are accepted
- **Suite ID:** T6 — `POST /transactions` with `amount: 0` → `201`.
- **Root cause:** same as QA-02 (`parseFloat(amount) || 0`).
- **Impact:** Clutters ledgers with meaningless rows; totals unaffected but reports/audit trails misleading.
- **Recommendation:** require `amount >= 0.01`.

#### QA-05 · `PATCH /tasks/:id/done` without `completedDate` returns 500
- **Suite ID:** T8a
- **Reproduction:** `PATCH /api/tasks/<id>/done` with `{}` → `500 {"error":"Failed to mark task as done"}`.
- **Root cause:** `server/routes/tasks.js:380` — `startOfDayIST(new Date())`; `startOfDayIST` expects a `YYYY-MM-DD` string and does `String(date).split('T')[0]`, producing `NaN` → `Invalid Date` → Prisma error. (`server/lib/dateUtils.js` `parseYMD`.)
- **Impact:** The UI always supplies a date, so the happy path works, but any API client or future screen that omits it gets a 500 instead of defaulting to today.
- **Recommendation:** `completedDate ? startOfDayIST(completedDate) : startOfDayIST(new Date().toISOString().slice(0,10))` (or make `startOfDayIST` accept Date objects).

#### QA-06 · Any SENIOR can enumerate all users and email addresses
- **Suite ID:** N13 — `GET /api/notary-hisab/users` returns all 7 users including `email`, `role`, and ids to any authenticated SENIOR.
- **Impact:** Information disclosure useful for phishing and account enumeration.
- **Recommendation:** restrict to ADMIN, or return only `{ id, name }` needed for assignment dropdowns.

#### QA-07 · Invalid Nondh date returns an unhandled 500
- **Suite ID:** D2 — `POST /api/nondh-status` with `date: "not-a-date"` → `500 Failed to create Nondh Status record`.
- **Root cause:** `server/routes/nondhStatus.js:105` — `new Date(date)` passed straight to Prisma; no validity check, and the catch-all returns 500.
- **Impact:** Poor API contract, noisy 500s, potential error-log leakage.
- **Recommendation:** validate with `Number.isNaN(d.getTime())` → `400`.

#### QA-08 · Inverted financial-year range accepted
- **Suite ID:** FY2 — `POST /api/financialYears` with `endDate < startDate` → `201`.
- **Root cause:** `server/routes/financialYears.js:33-35` checks presence only.
- **Impact:** A reversed FY makes every date-filtered module return empty/incorrect data until corrected.
- **Recommendation:** reject `endDate <= startDate` with `400`.

#### QA-09 · No throttling on `/auth/login`
- **Suite ID:** S5 — five consecutive bad passwords return `401,401,401,401,401` with no delay or lockout.
- **Impact:** Online password guessing / credential-stuffing is unthrottled.
- **Recommendation:** per-IP + per-account exponential backoff or lockout; consider CAPTCHA after N failures.

#### QA-10 · Access token remains valid after logout
- **Suite ID:** S6 — after logout, the old Bearer access token still returns `200` from `/auth/me` until its 1-hour expiry. Logout only revokes the refresh-token family.
- **Root cause:** `server/middleware/requireAuth.js` verifies JWT signature only; no revocation/deny-list check.
- **Impact:** A stolen access token survives a user-initiated logout.
- **Recommendation:** short-lived access tokens (5–15 min) plus a token-version/`jti` deny-list checked on logout, or blacklist the family's access tokens.

#### QA-11 · Missing CSP and `X-Frame-Options`; HSTS present
- **Suite ID:** S8 — response headers lack `Content-Security-Policy` and `X-Frame-Options` (HSTS is set).
- **Impact:** Weaker defence-in-depth against XSS and clickjacking (stored XSS payloads are rendered inert by React, but CSP is still expected).
- **Recommendation:** add CSP (script-src 'self' + required CDNs), `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options: nosniff`.

#### QA-12 · Verabill and Nondh records are missing from the Recycle Bin
- **Suite ID:** RB2 — both modules soft-delete (`isDeleted/deletedAt`) but `/api/recycle-bin` has no `VERABILL`/`NONDH` types, so deleted rows can never be restored or permanently purged from the UI.
- **Root cause:** `server/routes/recycleBin.js` switch has no cases for these models.
- **Impact:** Deleted records are stranded forever (soft-deleted but undeletable), creating unbounded storage growth and an incomplete data-lifecycle story.
- **Recommendation:** add both types to `GET /`, `/restore`, `/permanent`, and the UI tabs.

#### QA-13 · Currency display rounds paise away across ledger, tasks and printed reports
- **Area:** UI/UX — financial presentation
- **Evidence:** `src/utils/currency.js:1-8` — `formatCurrency` uses `maximumFractionDigits: 0`. It is used for the ledger entry column (`OfficeLedgerPage.jsx:629`), ledger summary cards (`:657-695`), **printed ledger** (`OfficeLedgerPrintLayout.jsx:100-163`), task detail totals (`TaskDetail.jsx:240-260`), transaction table (`EditableTransactionTable.jsx:161,265`) and printed financial reports (`FinancialReportPrintLayout.jsx:126-369`).
- **Actual:** a stored `1000.55` renders/prints as `₹1,001`; `250.45` as `₹250`. A row can therefore display `₹0` for a `₹0.01` entry.
- **Expected:** show paise when non-zero (there is already a correct `formatCurrencyPrecise` used only for the split-shortfall).
- **Impact:** Printed financial statements do not reconcile with the database; totals can appear off by up to ±₹0.50 per line and by more when summed.
- **Recommendation:** use `formatCurrencyPrecise` for all money rendering (or change `formatCurrency` to `minimumFractionDigits: 0, maximumFractionDigits: 2` with `hasPaise` logic).

#### QA-14 · Repeated critical WCAG A accessibility violations on authenticated pages
- **Area:** Accessibility / UI
- **Evidence:** axe-core scan (`qa/results/axe-results.json`) across 8 pages:
  | Page | Critical | Serious |
  |---|---|---|
  | Login | 0 | 0 |
  | Dashboard | `button-name` ×1, `label` ×1 | `color-contrast` ×5 |
  | Clients | `button-name` ×1, `label` ×1 | `color-contrast` ×5 |
  | Tasks | `button-name` ×1, `label` ×5 | `color-contrast` ×9, `scrollable-region-focusable` ×1 |
  | Office Reports | `button-name` ×1, `label` ×1 | `color-contrast` ×5 |
  | Invoice | `button-name` ×2, `label` ×7 | `color-contrast` ×22 |
  | Nondh Status | `button-name` ×1, `label` ×4 | `color-contrast` ×9, `scrollable-region-focusable` ×1 |
  | Recycle Bin | `aria-required-children` ×1, `button-name` ×1, `label` ×1 | `color-contrast` ×5 |
- **Concrete failures:** icon-only header/toolbar buttons without accessible names (`.ant-btn-icon-only`, `.ant-btn-text`), unlabeled Select/Transliterate inputs (`label` nodes — e.g. the header FY selector `#_r_12_` and invoice transliterate fields), low-contrast menu group headers (`[title="Advocate Management"]`, `[title="Tools"]`) and placeholders, non-focusable scrollable table bodies on Tasks/Nondh, and invalid ARIA children in the Recycle Bin tabs.
- **Impact:** screen-reader and keyboard users cannot identify several controls; WCAG 2.1 A/AA conformance is not met. `button-name` and `label` are **critical** rule violations.
- **Recommendation:** add `aria-label`/`title` to every icon-only button, associate labels with Select inputs (`Form.Item`/`aria-labelledby`), raise contrast of secondary text to ≥4.5:1, make `.ant-table-body` keyboard-scrollable, and fix the Recycle Bin tab roles.

#### QA-15 · Gujarati transliteration is broken by a dead external dependency
- **Area:** Tools / all transliterate inputs
- **Reproduction:** open Nondh Status, Jantri, Rent Agreement or Invoice; the console logs `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` and `There was an error with transliteration TypeError: Failed to fetch`.
- **Root cause:** `src/utils/batchTransliterate.js:4` calls `https://xlit-api.ai4bharat.org/tl/`. The hostname returns **NXDOMAIN** on public resolvers (`1.1.1.1`, `8.8.8.8`), while `ai4bharat.org` itself resolves — the API host is gone.
- **Impact:** the Gujarati transliteration assist (typing Latin → Gujarati) silently fails on every page that uses `TransliterateInput`/`IndicTransliterate`. Users can still type Gujarati directly, but the advertised typing aid does nothing and only a console error signals failure.
- **Recommendation:** point the library at a supported endpoint or add an offline/local transliteration fallback; catch the network error and show a non-blocking UI notice; add a health check so a dead dependency is visible.

### 5.3 P3 — Low

| ID | Finding | Evidence | Recommendation |
|---|---|---|---|
| **QA-16** | Login email is case-sensitive and not trimmed (`TestUser@…` / ` testuser… ` → 401) | A6/A7; `server/routes/auth.js:142` `findUnique({ where: { email } })` | `email.trim().toLowerCase()` on login and registration, or store a normalised column |
| **QA-17** | Client name has no maximum length (5,000 chars accepted) | C3; `server/routes/clients.js` presence-only validation | cap at 200 chars, trim, reject control characters |
| **QA-18** | Ledger amount input silently coerces typed `0` to `₹0.01` | UI observation; `InputNumber min={0.01}` in `AddEditOfficeLedgerModal.jsx` | keep the min but show a validation message instead of silently changing the value |
| **QA-19** | No DB-level CHECK constraints on money columns | `pg_constraint` shows 0 check constraints; schema uses only Prisma types | add `CHECK (amount > 0)` on transaction/ledger/upad/fee/expense tables as defence-in-depth |
| **QA-20** | Nondh dates stored at UTC midnight while all other modules store IST midnight | DB: `NondhStatus` 17/17 rows at `00:00Z`; `TaskTransaction`/`OfficeLedgerEntry` at `18:30Z` | standardise on `startOfDayIST` in `nondhStatus.js` |
| **QA-21** | Local DB has no Prisma migration history (schema applied via `db push`); 5 migrations report “not applied” | `npx prisma migrate status` | confirm production migration state; commit and baseline migrations before the next deploy (**prod state BLOCKED**) |

---

## 6. Module-by-module results

### 6.1 Authentication
- Valid login, wrong password, missing fields, invalid email, `/auth/me` with/without token, refresh rotation, admin-only RBAC all **PASS**.
- Logout clears client state and guards protected routes (**PASS**, Playwright).
- Deep-link redirect to `/login`, session persistence across reload, forgot-password screen **PASS**.
- Gaps: email normalisation (QA-16), login throttling (QA-09), access-token revocation (QA-10).
- `A12` refresh-token reuse within the 60-second multi-tab grace window is **by design** (INFO) — reuse after the window revokes the family.

### 6.2 Clients
- Full UI CRUD verified: create → search → edit → delete → Recycle Bin → restore → permanent delete. Required-field validation blocks empty creation.
- API ownership scoping verified: a SENIOR cannot read another user's client; ADMIN-wide access follows the server's role filter (code review, not exercised with an admin account).
- Injection attempts (`role`, `isDeleted`, `userId` in body) are ignored — server assigns the authenticated user.
- Stored `<img onerror>` payload is rendered as inert text in the browser (no `window.__qaXss`), and `img[src="x"]` is not mounted.
- Gap: unbounded name length (QA-17).

### 6.3 Tasks & transactions
- Task creation requires client + document type; the client/reference fields prefill within the form.
- Income/expense add, edit, delete, total recalculation and mark-done → reopen all verified via UI and API (e.g. 1000.50 + 99.25 − 200.25 = 899.50).
- Totals are recomputed server-side from active transactions on every mutation.
- Cannot add/edit transactions on a DONE task (**PASS**).
- Gaps: zero/negative amounts (QA-02, QA-04), default completion date 500 (QA-05).

### 6.4 Reports & dashboard
- Monthly income/expense report, FY filtering, dashboard FY isolation, general expenses and net-profit calculations **PASS**.
- Month outside the FY correctly returns zero.
- Gap: yearly report month list (QA-03).

### 6.5 Office Ledger
- Create/edit/delete income and expense, month/year and custom range filters, opening/period/closing balance, and split-user shortfall all **PASS**.
- Arithmetic is exact at the API layer: `0.1 + 0.2 = 0.30`; `1000.55 − 250.45 = 750.10`.
- Validation is the strongest in the app: rejects zero, negative, `< 0.01`, invalid dates, missing/incorrect expense type, dates outside the FY, month+range together, and missing FY.
- Gaps: display rounding (QA-13), silent `0 → 0.01` coercion (QA-18).

### 6.6 Notary Hisab
- Register creation with auto serial ranges, duplicate-register rejection, overlap detection, serial assignment/unassignment, rate changes recalculating user-wise amounts (3 × ₹200 = ₹600), and scope checks **PASS**.
- PDF/Excel export layout was verified during the earlier Notary Hisab work (local build); this audit did not re-run a pixel-level export comparison — **PARTIAL**.
- Gap: user-enumeration endpoint (QA-06).
- Note: monthly-register/summary Excel exports were intentionally removed; UI reflects that.

### 6.7 Nondh Status
- Create/list/search/update/soft-delete **PASS**; auto-numbering works; page shows the record and search filters it.
- Gap: invalid date 500 (QA-07), date-storage convention (QA-20).
- UI limitation: row action buttons are icon-only with no `title`/`aria-label`, making automation and screen-reader use harder (see 8.2).

### 6.8 Verabill / Light Bill
- Entry with nested fees and expenses, search, update, delete, and financial totals (`1500.75 − 300.75 = 1200.00`) **PASS**.
- Zero/negative fees and invalid dates are correctly rejected.
- Gap: no Recycle Bin representation (QA-12).

### 6.9 Upad
- Create/update/search/soft-delete **PASS**; negative amounts rejected.
- The Upad list is office-wide (records from other users are visible) — this appears intentional for a shared profit-withdrawal ledger, so it is marked **BLOCKED** pending a product decision (U5), not a pass.

### 6.10 Document Types
- Admin page is reachable by the test SENIOR (explicitly allowed); general-user access was not exercised (no non-admin account provided) — **PARTIAL**.
- Add, duplicate-name rejection (case-insensitive), rename and delete **PASS**.
- Script payloads are stored raw in the API but rendered as text (INFO) — React escaping is the only line of defence; combine with CSP (QA-11).

### 6.11 Financial Years
- Create/list/delete **PASS**; missing name rejected; only one default at a time.
- Gap: inverted range accepted (QA-08).

### 6.12 Pedhinamu Builder
- Draft create/list/detail/update/clone/soft-delete **PASS**; tree layout fit pass verified previously (canvas stays ≤ page content width, preview/export identical).

### 6.13 Invoice Generator
- Create-invoice API, list visibility, same-invoice-number update (no duplicate) and line-item totals **PASS**; empty-client validation surfaces in the UI.
- The visual preview/print output was not independently asserted in this audit — **PARTIAL**.
- History-removal from Notary Hisab does not affect invoices.

### 6.14 Recycle Bin
- Clients, tasks, transactions, general expenses, office ledger, upads, invoices, pedhinamus and document types are listed and restorable/purgeable.
- Gap: Verabill/Nondh absent (QA-12).

### 6.15 Utility tools
- Numbers-to-Words (incl. 0, negatives, junk, comma/paise input), Universal Converter, Jantri sample data, Rent Agreement, Document AI render and compute without uncaught errors.
- The Latin→Gujarati **transliteration assist is broken** by a dead upstream host (`xlit-api.ai4bharat.org` → NXDOMAIN); see QA-15. Typed input and calculations are otherwise unaffected.
- Document AI OCR *accuracy* could not be assessed without representative scanned documents — **BLOCKED**, page functionality verified only.

---

## 7. Financial accuracy verification

| Scenario | Expected | Observed | Verdict |
|---|---|---|---|
| Task totals (income 1099.75, expense 200.25) | net 899.50 | 899.50 | PASS |
| Delete expense → recalc | expense 0, net 1099.75 | matches | PASS |
| Ledger 1000.55 − 250.45 | 750.10 | 750.10 | PASS |
| Opening + period = closing | 0 + 750.10 | 750.10 | PASS |
| Float edge 0.1 + 0.2 | 0.30 | 0.30 | PASS |
| Notary 3 serials × ₹150 → rate ₹200 | 450 → 600 | 450 → 600 | PASS |
| Verabill fees 1500.75 − expenses 300.75 | 1200.00 | 1200.00 | PASS |
| Same invoice number | update, not duplicate | same id | PASS |
| Negative transaction | reject | **accepted (201)** | **FAIL P1** |
| Zero transaction | reject | **accepted (201)** | **FAIL P2** |
| Yearly months for Apr–Mar FY | 12 | **13** | **FAIL P1** |
| Ledger display of 1000.55 | ₹1,000.55 | **₹1,001** | **FAIL P2 (display)** |

Database precision: all money columns are `numeric(12,2)`; inserts round half-up (`1000.555 → 1000.56`, `-50.005 → -50.01`), and `10^10` overflows cleanly. No float drift observed in API responses.

---

## 8. Security & permissions

### 8.1 Verified controls (PASS)
- JWT required on all protected routes; missing/garbage/expired tokens → `401`.
- Tampered role claim breaks the signature → `401`.
- Admin-only routes (`/users`, backups, DB admin) return `403` for SENIOR.
- Resource ownership enforced on clients, tasks, transactions, upad, invoices, pedhinamu.
- SQL injection probe is blocked (Render WAF `403`) or inert — parameterised Prisma access.
- Mass-assignment attempts ignored (`role`, `isDeleted`, `userId`).
- Stored XSS payloads are escaped by React and do not execute.
- HSTS present; HTTPS enforced.

### 8.2 Gaps
- CORS allow-all with credentials (QA-01).
- No login throttling (QA-09).
- Access token valid post-logout (QA-10).
- User/email enumeration by any SENIOR (QA-06).
- Missing CSP and `X-Frame-Options` (QA-11).
- Icon-only action buttons in Nondh Status lack `title`/`aria-label` (accessibility, see 9.2).

---

## 9. UI/UX, responsive design & accessibility

### 9.1 Responsive
- Tested at **1920×1080, 1366×768, 768×1024, 375×812** for dashboard, clients and tasks: no horizontal overflow (≤2 px rounding tolerance).
- Mobile sidebar collapses into a drawer opened by the header menu button; navigation works; mobile login fits and is usable.
- Primary actions meet a ≥28 px tap-height check at 375 px (excluding hidden search-clear glyphs).

### 9.2 Accessibility (axe-core, WCAG 2.0/2.1 A+AA)
Eight pages scanned: login, dashboard, clients, tasks, office reports, invoice, nondh status, recycle bin. Results are in `qa/results/axe-results.json`.

| Page | Violations | Critical | Serious |
|---|---|---|---|
| Login | 0 | 0 | 0 |
| Dashboard | 3 | 2 | 1 |
| Clients | 3 | 2 | 1 |
| Tasks | 4 | 2 | 2 |
| Office Reports | 3 | 2 | 1 |
| Invoice | 3 | 2 | 1 |
| Nondh Status | 4 | 2 | 2 |
| Recycle Bin | 4 | 3 | 1 |

The login page is clean, but every authenticated page fails at least one **critical** WCAG A rule:
- **`button-name`** — icon-only buttons (header bell/collapse, Nondh row actions) have no discernible text.
- **`label`** — Select and transliterate inputs are not programmatically labelled (Tasks: 5, Invoice: 7, Nondh: 4).
- **`aria-required-children`** — Recycle Bin tab list markup is invalid.
- **`scrollable-region-focusable`** — Tasks and Nondh table bodies cannot be scrolled by keyboard.
- **`color-contrast`** — 5–22 nodes per page; sidebar group headers (`Advocate Management`, `Tools`), placeholders and invoice table text are below 4.5:1.

Details and remediation guidance: **QA-14**.

### 9.3 UX observations
- Currency rounding (QA-13) is the most visible UX/finance mismatch.
- Ledger `0` coercion (QA-18) is surprising because the entered value silently changes.
- Transliteration failure (QA-15) is silent except in the dev console; users get no feedback that the assist is unavailable.
- Nondh action buttons rely on icons only; adding `tooltip`/`aria-label` would help both users and automation (QA-14).
- Ant Design tables use generic "No data" states; the Clients/Tasks empty states are already friendlier ("No clients found" / "No tasks found") — apply consistently.

---

## 10. Automation & regression framework

Location: `qa/`

```
qa/
  playwright.config.js          # HTML + JSON + list reporters, screenshots/video/trace on failure
  tests/
    global-setup.js             # API login → results/storage-state.json (zustand auth-storage)
    helpers.js                  # diagnostics, gotoApp, expectRendered, API helper, token, stamp
    auth.spec.js                # 7 tests
    navigation.spec.js          # 4 tests (20 pages + redirects + unknown route + sidebar)
    clients-tasks.spec.js       # 4 tests (full CRUD + task financial workflow)
    financial.spec.js           # 3 tests (ledger UI + precise API totals + reports)
    tools.spec.js               # 7 tests
    security-ui.spec.js         # 3 tests (XSS inert, recycle restore, document types)
    responsive.spec.js          # 11 tests (4 viewports + drawer + login + tap heights)
    secondary.spec.js           # 5 tests (Nondh/Verabill/Invoice/Upad visibility + doc types CRUD)
  api-suite.mjs                 # 120-check API/functional suite
  axe-audit.mjs                 # accessibility scan
  results/                      # JSON outputs, logs, storage state
  evidence/ui/                  # page screenshots
  playwright-report/            # HTML report
```

Design properties:
- **Reusable helpers** for navigation, rendered-content assertions, diagnostics and API access.
- **Failure evidence** captured automatically (screenshot, video, trace).
- **Console/page-error/API-5xx capture** on every page.
- **Isolated test data** (`QATEST-UI-<epoch>`) created via API/UI and removed in `finally` blocks; no pre-existing records touched.
- **Authenticated state** generated once in global setup; the login flow is still tested explicitly.
- **Deterministic locators** (`getByRole('dialog')`, visible Ant Design dropdown classes) to survive UI refactors.

Run commands:
```bash
cd qa
npx playwright test                 # full suite
npx playwright test tests/auth.spec.js
npx playwright show-report          # open HTML report
node api-suite.mjs                  # API suite
```

---

## 11. Test data & production cleanup

- Test account started essentially empty (0 clients, tasks, ledger, notary, verabill).
- All records were tagged `QATEST-<epoch>` (API) or `QATEST-UI-<epoch>` (Playwright).
- Cleanup performed after each suite and again at the end:
  - `Recycle Bin counts`: `clients 0, tasks 0, transactions 0, generalExpenses 0, officeLedgerEntries 0, upads 0, invoices 0, pedhinamus 0, jantriCalculations 0, documentTypes 9, total 9`.
  - The 9 document types are **pre-existing** soft-deleted rows, not QA-created; left untouched.
- No pre-existing business records were modified or deleted.
- Nondh/Verabill rows created during testing have no permanent-delete endpoint (QA-12); they were soft-deleted, which is the maximum cleanup the API permits.

---

## 12. Blocked / not verifiable

| Item | Reason | Status |
|---|---|---|
| Upad office-wide visibility (U5) | Product intent unclear — is the shared list by design? | **BLOCKED** (not a pass) |
| Production database direct inspection | No production DB credentials/shell access | **BLOCKED** |
| Production migration history | Same as above; local DB shows unapplied migration baseline | **BLOCKED** |
| Document AI OCR accuracy | No representative scanned documents available | **BLOCKED** (page/upload flow verified) |
| PDF pixel-perfect export parity | PDFs not directly readable in-chat; verified via rasterisation and DOM comparison only | **PARTIAL** |
| Load/performance testing | Out of scope for this audit | **NOT RUN** |
| Email delivery (forgot password / 2FA OTP) | No mailbox access for the test account | **BLOCKED** (screen renders, API returns success) |

---

## 13. Prioritised remediation roadmap

### Sprint 1 — Financial integrity & security (P1)
1. **QA-02** validate transaction amount `> 0` (min ₹0.01) — one guard in `transactions.js`.
2. **QA-03** fix yearly-report month generation using IST date parts.
3. **QA-01** CORS allow-list.
4. **QA-10 / QA-09** shorten access-token lifetime + revocation on logout; add login throttling.

### Sprint 2 — Validation & robustness (P2)
5. **QA-04** reject zero transactions (same guard).
6. **QA-05** default `completedDate` to today's IST string.
7. **QA-06** restrict `/notary-hisab/users` to ADMIN or strip emails.
8. **QA-07** validate Nondh dates → `400`.
9. **QA-08** reject inverted FY ranges.
10. **QA-11** add CSP / `X-Frame-Options` / `nosniff` / `Referrer-Policy`.
11. **QA-12** add Verabill + Nondh to Recycle Bin (list/restore/permanent).
12. **QA-13** switch money rendering to precise paise-aware formatting (including print layouts).
13. **QA-14** fix critical WCAG A violations (button names, form labels, ARIA tabs, keyboard-scroll tables, contrast).
14. **QA-15** replace or gracefully degrade the dead transliteration endpoint.

### Sprint 3 — Hardening & polish (P3)
15. **QA-16** normalise email (trim + lowercase).
16. **QA-17** cap client/task text field lengths; trim control characters.
17. **QA-18** surface a validation message instead of coercing `0 → 0.01`.
18. **QA-19** add DB `CHECK (amount > 0)` constraints.
19. **QA-20** standardise Nondh date storage on IST midnight.
20. **QA-21** baseline Prisma migrations and confirm production state.
21. Complete the accessibility pass beyond critical rules (contrast ≥4.5:1, consistent labels).
22. Make empty-state copy consistent across tables.

---

## 14. Evidence index

| Artifact | Path |
|---|---|
| API results (120 checks) | `qa/results/api-results.json` |
| API run log | `qa/results/api-run.log` |
| Playwright JSON results | `qa/results/playwright-results.json` |
| Playwright HTML report | `qa/playwright-report/index.html` |
| Playwright run log | `qa/results/playwright-run.log` |
| Page render matrix | `qa/results/navigation-report.json` |
| Accessibility results | `qa/results/axe-results.json` |
| UI screenshots | `qa/evidence/ui/*.png` |
| Failure screenshots / video / trace | `qa/test-results/` (on failure) |
| API suite source | `qa/api-suite.mjs` |
| Playwright specs | `qa/tests/*.spec.js` |
| Progress tracker | `qa/TRACKER.md` |

---

## 15. Conclusion

The system is **feature-complete for the tested SENIOR workflow** and behaves consistently across desktop and mobile. Core CRUD, ledger arithmetic, Notary serial allocation, Verabill totals, PDF/print flows and permission scoping are solid.

Before the app is used as a system of record for money, fix the three P1 items — **transaction amount validation, yearly report month generation, and CORS** — and the financial-display rounding defect (QA-13), which together determine whether the numbers users see and print can be trusted. The P2 validation and session-hardening items are low-effort, high-value changes concentrated in a handful of route files; the accessibility and transliteration items (QA-14/21) are the main remaining barriers to an inclusive, fully-functional front end.

*Report generated from live testing on 6 November 2026. No production business records were altered. Fixes are intentionally **not** applied pending review/approval.*
