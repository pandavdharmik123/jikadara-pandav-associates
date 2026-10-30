# Sliding-session authentication

Short-lived access tokens + rotating refresh tokens, with a client-side
`75% of token lifetime` refresh check that only refreshes while the browser is
being actively used.

## Behaviour

```
login ──► access token (1 hour) + refresh token (30 days, hashed in DB)
                 │
                 ├─ 0% ───────────── 75% (45m) ──────── 100% (60m)
                 │                    │
                 │                    ├─ recent input / visible tab
                 │                    │    └─► POST /auth/refresh
                 │                    │        └─► new access + rotated refresh token
                 │                    │
                 │                    └─ no input / hidden tab (idle timeout exceeded)
                 │                         └─► revoke refresh token + log out
                 │
                 └─ after a refresh the 75% clock starts again (sliding session)
```

If the access token has already expired when a request is made (laptop sleep,
throttled background tab), the axios request interceptor refreshes it first. If
the server still answers `401`, the response interceptor refreshes and retries
the request once.

## Server

New endpoints (public, the refresh token is the credential):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/refresh` | Validate + rotate a refresh token, return a new access token and refresh token |
| `POST /api/auth/logout` | Revoke the refresh-token family; safe to call without a valid access token |

Login, 2FA (`/2fa/verify-login`, `/2fa/verify-email-otp`) now return all of:

```json
{
  "token": "<access JWT>",
  "refreshToken": "<opaque random token>",
  "refreshTokenExpiresAt": "…",
  "accessTokenTtl": "1h"
}
```

Implementation: `server/lib/tokens.js`, `server/routes/auth.js`,
`server/prisma/schema.prisma` (`RefreshToken` model).

- Access tokens are JWTs signed with `JWT_SECRET` and carry `typ: "access"` and
  the login family id in `sid`.
- Refresh tokens are 384-bit random values. Only their SHA-256 hash is stored.
- Every refresh rotates the token. If a token that was already rotated is
  presented **after** the grace window, the whole login family is revoked
  (reuse/theft detection).
- The grace window (`REFRESH_ROTATION_GRACE_SECONDS`, default 60s) lets a second
  browser tab finish with the previous token while the first tab rotates it.
- Temporary 2FA-pending tokens are explicitly rejected by `requireAuth`, so a
  password-only login cannot use the temporary token as a session token.
- Expired/old revoked rows are cleaned up at most once per hour.

### Configuration (`server/.env`)

```bash
ACCESS_TOKEN_TTL="1h"              # 1 hour access token lifetime
REFRESH_TOKEN_TTL_DAYS=30          # absolute refresh-token lifetime
REFRESH_ROTATION_GRACE_SECONDS=60  # multi-tab grace period
```

## Client

- `src/utils/activityTracker.js` counts pointer, keyboard, touch, wheel, and
  scroll input plus the tab becoming visible.
- `src/components/AuthSessionWatcher.jsx` schedules a check at 75% of the
  access token's `exp - iat` lifetime:
  - visible tab + input within `VITE_SESSION_IDLE_MS` → refresh
  - no recent input, or tab hidden across the 75% mark → logout + revoke
  - hard expiry is always a safety-net logout
- `src/services/authSession.js` makes refreshes single-flight so concurrent
  requests/timers rotate the token only once.
- `src/services/api.js` refreshes before sending an expired token and retries a
  `401` once.
- `src/store/authStore.js` persists `{ user, token, refreshToken }` and revokes
  the refresh-token family when logging out.
- `AuthSessionWatcher` listens for `storage` events so logging in/out or
  refreshing in one tab is reflected in every tab.

### Idle threshold

```bash
# .env (Vite reads VITE_* variables)
VITE_SESSION_IDLE_MS=120000
```

Default is **2 minutes**, chosen so the idle path is easy to test with 2–3
minute access tokens. For production, raise it to the organisation's inactivity
policy (for example `900000` for 15 minutes).

## Testing quickly

Run the API with a 12-second access token and the client with an 8-second idle
window:

```bash
# server
ACCESS_TOKEN_TTL=12s npm run dev

# client
VITE_SESSION_IDLE_MS=8000 npm run dev -- --port 5199
```

1. **Active:** log in and keep moving the mouse/typing. After ~9s the token in
   `localStorage` (`auth-storage`) changes and the session stays alive.
2. **Idle:** log in and do not touch the page. After ~9s you are redirected to
   `/login` with “You were signed out due to inactivity.” and the refresh token
   is revoked server-side.
3. **401 fallback:** corrupt the stored access token's signature and use the
   app; the next API call refreshes and retries successfully.

Restore the normal timings afterwards (`ACCESS_TOKEN_TTL=1h`,
`VITE_SESSION_IDLE_MS` unset or production value).

## Security notes / trade-offs

- Refresh tokens are stored in the same persisted Zustand store as the access
  token (localStorage). This matches the existing app architecture and works
  across the Vercel/Render split. The strongest deployment option is an
  `httpOnly; Secure; SameSite` cookie, which requires cookie parsing, CSRF
  protection, and matching CORS/cookie domains.
- Logout revokes the refresh family immediately. The already-issued access JWT
  remains valid until its (1-hour) expiry; that is the normal trade-off of
  stateless access tokens. If instant access-token revocation is required, add
  a per-request session check or a denylist.
- Changing a password does not yet revoke refresh tokens. If that is required,
  call a `revokeAllForUser(userId)` helper from the password-reset routes.
