# Income & Expense — Jikadara & Pandav Associates

A standalone, mobile-first (Khatabook-inspired) income & expense app that runs **on top of the
existing backend, database, transaction ledger, users, and authentication** of the main
`jikadara-and-pandav-associates` website.

It ships in two forms from **one React codebase**:

- a **PWA** for browsers (installable to the home screen), and
- **native Android and iOS apps** wrapped with Capacitor, using the exact same UI.

Nothing about the existing app's structure was changed. This folder is the only new top-level
directory.

---

## 1. How it shares data with the existing website

The existing website already has a standalone office income/expense ledger, surfaced under
**Excel Sheets → Office Reports**:

| Layer | What is reused |
| --- | --- |
| Table | `OfficeLedgerEntry` (Prisma model, PostgreSQL) |
| API | `/api/office-ledger` (list + summary, get, create, update, delete) |
| Service | `server/services/officeLedger.js` (totals, soft delete, FY scoping) |
| Validation | `server/lib/officeLedgerValidation.js` (FY date range, amount, expense type) |
| Users | `User` table — no duplicate accounts |
| Auth | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/2fa/*` |
| Financial years | `FinancialYear` table / `/api/financialYears` |

Because both apps read and write the same rows through the same endpoints, synchronization is
automatic:

- an entry added here appears in **Office Reports** on the website (and vice versa);
- editing here updates the same row the website reads;
- deleting here soft-deletes the same row (`isDeleted`, `deletedAt`) and it disappears from both;
- the dashboard totals are derived from the same records.

**No new table, no duplicate transaction storage, no schema migration.** Entries are scoped to
the logged-in user, exactly as the existing Office Reports API scopes them.

### Why `OfficeLedgerEntry` and not `TaskTransaction`

`TaskTransaction` rows are tied to a task and are surfaced through task client reports. The
standalone income/expense ledger that users already treat as their "office book" is
`OfficeLedgerEntry`. Using it gives genuine two-way sync for this app's exact feature set
(income, expense, particulars, category, date, summary) without mixing task-level financials.

---

## 2. Technologies

Chosen to match the existing project instead of introducing a new stack:

- React 19 + JavaScript (JSX)
- Vite 8
- Ant Design 6
- React Router 7 (`HashRouter`, so static hosting needs no rewrites)
- TanStack Query 5 (server state, cache invalidation, refetch)
- Zustand 5 (persisted auth + financial-year preference)
- Axios (single-flight token refresh)
- Day.js (IST-safe date handling)
- Lucide React (icons)
- Manual PWA: `manifest.webmanifest` + lightweight service worker (no extra plugin)
- Capacitor 8 for the native Android/iOS shells (same Vite build, no UI rewrite)

---

## 3. Folder structure

```text
income-expense-app/
├── index.html
├── package.json
├── vite.config.js                 # dev 5180, preview 4180 (strict)
├── capacitor.config.json          # native app id, name, splash/status bar
├── .env.example                   # VITE_API_BASE_URL
├── README.md
├── android/                       # generated Capacitor Android project
├── ios/                           # generated Capacitor iOS project (SPM)
├── assets/                        # icon/splash sources for @capacitor/assets
├── public/
│   ├── logo-icon.png              # existing brand logo (optimised)
│   ├── manifest.webmanifest
│   ├── sw.js                      # online-first app-shell cache only
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── apple-touch-icon.png
├── screenshots/                   # mobile + desktop captures
└── src/
    ├── main.jsx
    ├── App.jsx                    # providers + hash routes
    ├── components/
    │   ├── AccessRestricted.jsx
    │   ├── AppShell.jsx           # header, FY selector, bottom nav
    │   ├── DateFilterChips.jsx
    │   ├── EmptyState.jsx
    │   ├── LedgerGate.jsx         # Office Reports permission gate
    │   ├── ProtectedRoute.jsx
    │   ├── SummaryCard.jsx
    │   ├── ToolGate.jsx           # per-tool page-permission gate
    │   ├── TransactionForm.jsx
    │   └── TransactionItem.jsx
    ├── features/
    │   ├── Auth/LoginPage.jsx     # password + 2FA (TOTP / backup code)
    │   ├── Home/HomePage.jsx      # dashboard, filters, recent entries
    │   ├── Profile/ProfilePage.jsx
    │   ├── Tools/                 # mobile Tools hub, catalog, page frame
    │   ├── Translator/            # ported from the main website
    │   ├── AITranslator/
    │   ├── UniversalConverter/
    │   ├── JantriCalculator/
    │   ├── RentAgreementCalculator/
    │   ├── InvoiceGenerator/
    │   ├── NumberToWordsConverter/
    │   ├── DocumentAI/
    │   ├── PedhinamuBuilder/
    │   ├── FormBuilder/
    │   └── Transactions/
    │       ├── AddTransactionPage.jsx
    │       ├── EditTransactionPage.jsx
    │       └── TransactionsPage.jsx
    ├── hooks/
    │   ├── useFinancialYears.js
    │   ├── useInstallPrompt.js
    │   ├── useInvoices.js         # shared Invoice Generator hook
    │   ├── useLedger.js
    │   └── useTasks.js            # shared task list for invoice links
    ├── lib/
    │   ├── api.js                 # Axios + refresh + session-expiry redirect
    │   ├── authClient.js
    │   ├── authSession.js
    │   ├── browserPolyfills.js    # Math.sumPrecise for PDF.js in older WebViews
    │   ├── config.js
    │   ├── currency.js
    │   ├── date.js
    │   ├── errors.js
    │   ├── ledger.js
    │   ├── permissions.js         # ledger + per-tool page permissions
    │   ├── tokenUtils.js
    │   └── transliterationFetch.js # AI4Bharat → Google Input Tools rewrite
    ├── services/
    │   ├── api.js                 # the same mobile Axios instance
    │   └── formBuilder.js         # existing Form Builder API calls
    ├── styles/
    │   ├── global.css             # ledger design system
    │   └── tools.css              # Tools hub + shared desktop tool styling
    ├── utils/                     # transliteration, fonts, exports shared with website
    └── store/
        ├── authStore.js
        └── preferencesStore.js
```

---

## 4. Features

### Dashboard (Home)

- Net balance hero card with income and expense split.
- Cards: **Today's Income**, **Today's Expenses**, **Monthly Income**, **Monthly Expenses**.
  Total income / total expenses / net are shown for the selected period.
- Date filters: **This FY, Today, Yesterday, This Week, This Month, Previous Month, Custom**
  (custom range is clamped to the selected financial year).
- Quick **Add income** / **Add expense** actions.
- Five most recent transactions for the selected period, with edit shortcuts.
- Pull-to-refresh style manual refresh button; React Query refetches on focus.

### Transactions

- Newest-first list with `+ ₹` (green) income and `- ₹` (red) expense amounts.
- Debounced description search (server-side `contains`, case-insensitive).
- Type filter: All / Income / Expense.
- Same date presets as the dashboard.
- Client-side paging: 20 rows per page with **Load more**.
- Period summary strip: income, expense, net.
- Empty, loading (skeleton), and error states with retry.

### Add / Edit / Delete

- Two prominent type choices (Income / Expense), then a compact single-screen form:
  amount, date, particulars, expense category (expenses only).
- Amount validation (greater than zero, max `9,999,999,999.99`, two decimals).
- Particulars validation (required, trimmed, max 500 chars).
- Date picker constrained to the selected financial year.
- Submit buttons disable and show a loading spinner while saving (no duplicate submits).
- Edit loads the original record and updates it in place (no duplicate rows).
- Delete asks for confirmation showing particulars, date, type, and amount, then soft-deletes
  through the existing API (Recycle Bin semantics).
- Success/error messages never expose stack traces.

### Profile

- Logged-in user name, role, email, mobile, member-since.
- Financial-year selector (same FY rows as the main website).
- Company name, app version, data source note.
- PWA install / Add-to-Home-Screen guidance.
- Logout (revokes the refresh-token family and clears local state).

### Tools

The complete website **Tools** menu is available inside the app, without duplicating calculations or
adding new backend tables. The existing page-permission keys from the website's Admin → Users page
control each entry:

| Menu entry | Website page key / route |
| --- | --- |
| Eng to Guj | `/app/tools/translator` |
| AI Translate | `/app/tools/ai-translator` |
| Universal Converter | `/app/tools/universal` |
| Makan/Milkat Jantri | `/app/tools/jantri` |
| Rent Agreement | `/app/tools/rent_agreement` |
| Invoice Generator | `/app/tools/invoice` |
| Numbers to Words | `/app/tools/number_to_words` |
| Document AI & OCR | `/app/tools/document-ai` |
| Pedhinamu Builder | `/app/tools/pedhinamu` |
| PAN Card – New | `/app/tools/form-builder` (form key `pan-new-application`) |
| PAN Card – Correction | `/app/tools/form-builder` (form key `pan-correction`) |
| Marriage Registration | `/app/tools/form-builder` (form key `marriage-registration`) |
| Property Tax – Name Transfer | `/app/tools/form-builder` (form key `property-tax-name-transfer`) |

- The hub searches and groups the 13 entries, and only shows tools the signed-in user may open.
- Each route is protected by `ToolGate`; opening a tool without permission shows which permission
  is missing. The backend still enforces authentication/ownership on every API call.
- Users who only have tool permissions can use **Tools** without Office Reports access; the ledger
  screens show the existing Office Reports gate.
- The tool screens are the website's own React components, so calculations, PDF generation, OCR,
  saved drafts, invoice/task links, and transliteration behave exactly as on the website.
- Android/iOS API calls use `CapacitorHttp`; transliteration calls are rewritten from the dead
  AI4Bharat host to Google Input Tools (same behaviour as the website).

### Mobile-first UI

- 390px-first layout, max-width 760px shell, bottom nav:
  **Home · Transactions · Add (raised) · Tools · Profile**.
- Light theme, rounded cards, Indian Rupee formatting (`₹1,25,000`), lucide icons,
  touch-friendly controls, safe-area padding, reduced-motion-friendly transitions.
- Responsive at tablet/desktop widths (4-column summary grid, 2-column type chooser).

---

## 5. Authentication & authorization

- Uses the existing `POST /api/auth/login`. If the account has 2FA enabled, the app shows the
  second step and calls `POST /api/auth/2fa/verify-login`; backup codes are accepted by the
  same endpoint.
- Access + refresh tokens are stored in `localStorage` under `jp-ie-auth-v1` (same persistence
  model as the existing app).
- Axios attaches the access token; on expiry it performs a **single-flight refresh**
  (`POST /api/auth/refresh`) so concurrent requests do not consume the refresh token twice.
- On refresh failure or `401`, the session is cleared and the user is redirected to the login
  screen.
- Logout calls `POST /api/auth/logout` (fire-and-forget) so the token family is revoked
  server-side.
- Protected routes redirect unauthenticated users to `#/login`.
- **Access gates:** the ledger UI mirrors the existing page permission for
  `/app/office-expenses` (Office Reports), and each tool mirrors its website page key. `ADMIN` is
  always allowed. Users without a permission see an "access required" screen; the backend still
  enforces auth and ownership on every request — frontend gates are only a UX layer.
- Tool permissions use the same `hasPageAccess` logic as the website, including legacy users with
  no explicit `allowedPages` list.

> The existing Office Reports API is per-user; it does not accept a different `userId`.
> Therefore this app does not add cross-user selection, matching the current website behavior.

---

## 6. Environment variables

Only one variable is required:

```bash
# income-expense-app/.env
VITE_API_BASE_URL=http://localhost:3002/api
```

Use the deployed backend URL (including `/api`) in production. Do not hardcode secrets — the
frontend only needs this public base URL. `.env` is gitignored; `.env.example` is committed.

The existing backend CORS allow-list was extended (in `server/index.js`) with:

```text
http://localhost:5180      http://127.0.0.1:5180
http://localhost:4180      http://127.0.0.1:4180
https://localhost          http://localhost          capacitor://localhost
```

The last line allows the Capacitor Android (`https://localhost`) and iOS (`capacitor://localhost`)
WebView origins. Add your production frontend origin there before deploying.

---

## 7. Commands

```bash
cd income-expense-app

npm install          # install dependencies
npm run dev          # development server → http://localhost:5180
npm run build        # production build → dist/
npm run preview      # preview production build → http://localhost:4180

# Native (Capacitor) — same UI, Android + iOS
npm run mobile:build # vite build + copy web assets into both native projects
npm run mobile:sync  # vite build + cap sync (copy + native plugin update)
npm run android:open # build + open the Android project in Android Studio
npm run ios:open     # build + open the iOS project in Xcode
```

The existing website keeps its original commands (`npm run dev`, `server: npm run dev`).

---

## 8. Native Android & iOS apps

Both native apps load the **same built UI** from `dist/`. There is no separate React Native or
duplicated frontend: `npm run mobile:sync` copies `dist/` into `android/` and `ios/`.

### 8.1 App identity

| Setting | Value |
| --- | --- |
| App ID (both platforms) | `com.jikadaraandpandav.accounts` |
| Display name | `J&P Accounts` |
| Android min / target SDK | 24 / 36 |
| iOS deployment target | 15.0 |
| iOS dependency manager | Swift Package Manager (no CocoaPods) |
| Orientation | Portrait (iPhone) |

Native-specific behavior in the UI:

- status bar styled to match the white app header; splash screen hidden after first paint;
- Android hardware/gesture back steps through app history, then exits from Home/Login;
- queries invalidate when the app resumes, so entries changed on the website appear immediately;
- the PWA "Add to Home Screen" button is hidden inside the native shells;
- service worker registration is disabled inside the native shells (assets are local);
- native HTTP (`CapacitorHttp`) is enabled, so API calls use the platform HTTP stack and are
  not blocked by browser CORS rules.

### 8.2 API URL per run target

`VITE_API_BASE_URL` is baked in at build time. Use the right host for where the app runs:

| Run target | `VITE_API_BASE_URL` |
| --- | --- |
| Web / PWA (local) | `http://localhost:3002/api` |
| iOS Simulator | `http://localhost:3002/api` |
| Android Emulator | `http://10.0.2.2:3002/api` |
| Physical phone (same Wi-Fi) | `http://<your-computer-LAN-IP>:3002/api` |
| Production | `https://<your-domain>/api` |

```bash
# example: build for the Android emulator
VITE_API_BASE_URL=http://10.0.2.2:3002/api npm run mobile:sync
```

Debug builds may use plain HTTP:

- Android: `android/app/src/debug/AndroidManifest.xml` enables `usesCleartextTraffic` for debug
  builds only.
- iOS: `ios/App/App/Info.plist` allows `NSAllowsLocalNetworking`.

**Release builds must use an HTTPS API URL.** Do not enable cleartext traffic in production.

The native apps use `CapacitorHttp` (enabled in `capacitor.config.json`), so their API requests
run through the Android/iOS native HTTP stack instead of the WebView, which is **not subject to
browser CORS**. That means the mobile app can use an existing API deployment without adding the
WebView origins to its CORS allow-list.

The browser/PWA build still uses normal browser CORS, so those origins must be allowed by the
backend (`server/index.js` already includes the local and native origins for local runs).

### 8.3 Build and run

**Android**

1. Install JDK 21+ (Capacitor 8 compiles with Java 21) and Android SDK Platform 36.
2. `npm run mobile:sync`
3. `npm run android:open` (or open `android/` in Android Studio).
4. Pick an emulator/device and press **Run**.

Command-line debug build:

```bash
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk

npm run mobile:sync
cd android
./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

The debug APK is signed with the standard Android debug key, so it can be installed
directly (`adb install -r app-debug.apk`) but cannot be published to Play.

**iOS**

1. Install Xcode 16+ (full Xcode, not only Command Line Tools) and accept the license.
2. `npm run mobile:sync`
3. `npm run ios:open` (or open `ios/App/App.xcodeproj`).
4. Select a simulator/device, set your Team under **Signing & Capabilities**, then **Run**.

Capacitor 8 uses Swift Package Manager, so CocoaPods is not required.

### 8.4 Icons and splash

Source images live in `assets/` (`icon-only.png`, `icon-foreground.png`,
`icon-background.png`, `splash.png`). Regenerate all native sizes with:

```bash
npx capacitor-assets generate --android --ios
```

### 8.5 Signing and publishing

- **Android:** create a keystore, configure a release signing config, then build
  `./gradlew bundleRelease` and upload the `.aab` to Google Play Console.
- **iOS:** an Apple Developer Program membership is required; sign with your team in Xcode,
  archive, and upload to App Store Connect / TestFlight.
- Keystores, provisioning profiles, and signing passwords must stay out of version control.

---

## 9. Backend / database changes

- **Database:** none. No new tables, columns, migrations, or seed changes.
- **Backend:** one change — four new origins added to the CORS allow-list in
  `server/index.js`. All ledger/auth endpoints are the existing ones.

APIs used by this app:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Existing credentials |
| `POST` | `/api/auth/2fa/verify-login` | Existing 2FA step |
| `POST` | `/api/auth/refresh` | Rotate access/refresh tokens |
| `POST` | `/api/auth/logout` | Revoke session family |
| `GET` | `/api/financialYears` | Financial-year list |
| `GET` | `/api/office-ledger` | List + summary (FY, date range, type, search) |
| `GET` | `/api/office-ledger/:id` | Load one entry for edit |
| `POST` | `/api/office-ledger` | Create income/expense |
| `PUT` | `/api/office-ledger/:id` | Update the same record |
| `DELETE` | `/api/office-ledger/:id` | Soft delete |
| `POST` | `/api/translate` | Existing AI translator |
| `POST` | `/api/document/read` | Existing Document AI OCR |
| `GET/POST/PUT/DELETE` | `/api/jantri` | Existing saved Jantri calculations |
| `GET/POST/PUT/DELETE` | `/api/invoices` | Existing invoices |
| `GET` | `/api/tasks` | Existing tasks for invoice links |
| `GET/POST/PUT/DELETE` | `/api/pedhinamu` | Existing Pedhinamu drafts |
| `GET/POST/PUT/DELETE` | `/api/form-builder/records` | Existing PAN/marriage/property-tax forms |

The tool routes reuse the exact endpoints and payloads used by the main website. No tool-specific
backend module, table, or migration was added.

All requests include `fyStartDate` / `fyEndDate`; the backend rejects dates outside the FY and
invalid entry types, so the UI mirrors those rules for immediate feedback.

---

## 10. Testing performed

Local backend on `http://localhost:3002/api`, local PostgreSQL, isolated test users, and
sample entries. Real users' records were not modified.

### Native (Capacitor)

- `npx cap doctor` reports both platforms healthy and all Capacitor 8 packages aligned.
- `npm run mobile:sync` builds the UI and copies it into the Android and iOS projects.
- Native app identity, portrait lock, status bar/splash/keyboard, and icons/splash were
  generated for both platforms.
- **Android debug APK built successfully** with JDK 21 + Android SDK 36:
  `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed, installable).
- **Verified on an Android 16 emulator against the production API** in `.env`: the app launches,
  the native HTTP layer reaches `*.onrender.com/api`, and a deliberately wrong password returns
  the server's “Invalid email or password” instead of a network error. This confirms the native
  CORS workaround (`CapacitorHttp`) works end-to-end.
- **iOS not compiled:** this machine has no full Xcode, so IPA generation and on-device runs
  must happen in Xcode on a Mac with Xcode 16+.

### API integration — 27/27 passed

Login, financial years, empty state, create income, create expense, list + summary totals,
update, simulated website edit, re-read after website edit, delete, disappearance after delete,
summary after delete, Today / This Month / Previous Month filters, search, type filter,
zero amount rejection, blank particulars rejection, date outside FY rejection, invalid type
rejection, unauthenticated request rejection, invalid login rejection.

### Tools UI (Chromium, 430×932 phone viewport)

- All 13 catalog entries render from the Tools hub; the hub reports the correct accessible count.
- Every tool route was opened and produced its expected screen (translator, AI translator,
  universal converter, Jantri, rent agreement, invoice, number-to-words, Document AI, Pedhinamu,
  and all four Form Builder forms).
- Permission audit with a tools-only account: hub showed only the granted tool, the granted route
  opened, a non-granted tool showed its "access required" screen, and the ledger showed the Office
  Reports gate.
- Admin audit: ledger/financial years, form-builder redirect, and all tool forms opened.
- Phone-width layout audit: no page-level horizontal overflow on any tool; Pedhinamu and Form
  Builder stack their editor/preview panes and the Pedhinamu control dock wraps.
- Only Ant Design 6 deprecation warnings were logged (existing shared components); no runtime
  exceptions.

### Browser UI (Playwright, Chromium) — 28/28 passed

- Login screen, invalid login error, valid login, dashboard totals.
- Header layout (company name does not overlap the FY selector).
- Date filter chip activation and filtered summary.
- Transaction list, `+`/`-` amount styling, search, type filter.
- UI create income → persisted in the shared table; UI edit → same row updated (no duplicate);
  simulated website edit → new app shows the new amount after refetch.
- UI delete → confirmation identifies the record → soft-deleted via API.
- Zero-amount validation.
- Profile fields, role, version, FY selector.
- Session persistence across reload, logout, unauthenticated redirect.
- Permission-restricted user screen.
- Desktop navigation at 1366×900.

### PWA (production preview)

- Service worker registers, scope `/`, cache `jp-income-expense-v1` created.
- Manifest valid: standalone display, 3 icons (192, 512, maskable), theme color.
- API responses are never cached — only the static app shell is.

---

## 11. Screenshots

All files are in `screenshots/`:

| File | Screen |
| --- | --- |
| `01-login-mobile.png` | Login |
| `02-login-error-mobile.png` | Invalid login |
| `03-home-mobile.png` | Dashboard (full) |
| `03b-home-nav-mobile.png` | Dashboard with bottom nav |
| `04-home-filter-mobile.png` | This Month filter |
| `05-transactions-mobile.png` | Transaction history |
| `06-add-income-mobile.png` | Add income form |
| `07-delete-confirm-mobile.png` | Delete confirmation |
| `08-validation-mobile.png` | Zero-amount validation |
| `09-profile-mobile.png` | Profile |
| `10-no-access-mobile.png` | Permission-restricted screen |
| `11-home-desktop.png` | Dashboard, desktop |
| `12-transactions-desktop.png` | Transactions, desktop |
| `13-native-android-login.png` | Native Android app (emulator), login |

---

## 12. Known limitations

1. **Per-user ledger only.** The shared API scopes entries to the logged-in user; there is no
   cross-user selector. This matches the existing Office Reports page.
2. **Net balance** is `Total Income − Total Expenses` as requested. It intentionally does not
   use the office ledger's opening-balance `closingBalance`.
3. **No realtime push.** Sync relies on React Query refetching (navigation/focus/manual refresh,
   native app resume, and cache invalidation after mutations). The backend has no ledger
   WebSocket.
4. **PWA service worker runs only in production builds.** `npm run dev` will not offer install;
   use `npm run build && npm run preview` or a deployment. Real Android installation must be
   verified on a device over HTTPS. The service worker is intentionally disabled inside the
   native apps.
5. **Deployment origin.** Add the production frontend origin to `server/index.js` CORS and set
   `VITE_API_BASE_URL` at build time. If hosted under a sub-path, adjust `start_url`/`scope` in
   the manifest and the router base.
6. **Bundle size.** Ant Design keeps the production JS around 1 MB (327 kB gzip); acceptable
   for this internal tool, and it matches the existing app's dependency choice.
7. **Native compilation toolchain.** Android needs JDK **21** (Capacitor 8 source level) and
   Android SDK 36; iOS needs full Xcode 16+ and an Apple Developer account for device/store
   distribution. The Android debug APK was built locally; the iOS project is generated and
   synced but was not compiled here.
8. **Native apps need a reachable API.** The current debug APK is built against the production API
   configured in `.env` and uses `CapacitorHttp`, so it works on any internet connection (no
   need to be on the same Wi-Fi as the development machine). Rebuild after changing
   `VITE_API_BASE_URL` (`npm run mobile:sync`).
9. **Tools are the website's desktop components.** They are wrapped in a mobile frame and made
   responsive, but very wide workspaces (Pedhinamu canvas, form previews) remain best viewed in
   landscape or by collapsing the editor pane. PDF export/printing uses the same browser/native
   print pipeline as the website.
10. **Document AI and heavy exports load on demand.** Tool bundles (PDF.js, html2pdf, JSZip) are
    lazy-loaded so the ledger's first paint stays fast; the first open of a tool may take a moment
    on a slow connection.
