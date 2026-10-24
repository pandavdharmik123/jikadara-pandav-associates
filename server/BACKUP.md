# Database Backups → Google Drive

The server can dump the PostgreSQL database, optionally encrypt it, upload it to one or more Google Drive accounts, prune old archives, and keep an audit log. Everything runs from the same Node process/CLI — no extra service or paid plan.

- **CLI:** `npm run backup`
- **Admin UI:** `/app/admin/backup` (admin only)
- **Scheduler:** daily cron inside the API process (or an external scheduler)
- **Storage:** each upload counts against that Google account's 15 GB quota

---

## 1. How it works

```
pg_dump (snapshot, safe on a live DB)
   │
   ├─ custom format (-Fc -Z 9)  or  plain SQL + gzip
   ├─ optional AES-256-GCM encryption
   ├─ SHA-256 + size verification
   │
   ├─ OAuth refresh token → access token
   ├─ verify token email == configured email (abort on mismatch)
   ├─ upload (resumable) to My Drive / DB Backups / <PROJECT_NAME>
   ├─ verify size + md5 on Drive
   ├─ retention prune (permanent delete, not trash)
   └─ BackupRun row + optional email alert
```

Drive's trash still consumes quota, so old backups are deleted permanently with `files.delete`.

At the current size a dump is ~50 KB compressed. With 30 daily + 12 weekly + 12 monthly archives the folder stays in the low megabytes; 15 GB is effectively years of history.

---

## 2. One-time Google Cloud setup

1. Open <https://console.cloud.google.com> and create/select a project.
2. **APIs & Services → Library → Google Drive API → Enable.**
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in the app name/support email
   - Add your backup Google account as a test user while setting up
   - **Publish the app** (publishing status: **In production**)
     > Refresh tokens created while the app is in **Testing** expire after **7 days**. This is the most common cause of silently broken backups.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Copy the **Client ID** and **Client secret**
5. Put them in `server/.env`:
   ```env
   GOOGLE_DRIVE_CLIENT_ID="....apps.googleusercontent.com"
   GOOGLE_DRIVE_CLIENT_SECRET="GOCSPX-..."
   GOOGLE_DRIVE_REDIRECT_URI="http://localhost:5555/oauth2callback"
   ```
6. Generate the refresh token (log in as the account that owns the 15 GB Drive):
   ```bash
   cd server
   npm run backup:auth -- --account=default --email=you@gmail.com
   ```
   The script opens the consent URL, verifies the token belongs to that email, creates `DB Backups/<PROJECT_NAME>` in that Drive, and prints the values to paste into `.env`.
7. Enable and test:
   ```env
   GOOGLE_DRIVE_BACKUP_ENABLED=true
   GOOGLE_DRIVE_ACCOUNT_EMAIL="you@gmail.com"
   GOOGLE_DRIVE_REFRESH_TOKEN="1//..."
   ```
   ```bash
   npm run backup:dry-run
   npm run backup
   ```

### Multiple accounts

Each Google account needs its own refresh token (Google has no password API). The OAuth client can be shared:

```env
GOOGLE_DRIVE_ACCOUNTS=primary,office

GOOGLE_DRIVE_PRIMARY_EMAIL=you@gmail.com
GOOGLE_DRIVE_PRIMARY_REFRESH_TOKEN=1//...
GOOGLE_DRIVE_OFFICE_EMAIL=office@gmail.com
GOOGLE_DRIVE_OFFICE_REFRESH_TOKEN=1//...

# optional: default is every configured account
GOOGLE_DRIVE_BACKUP_ACCOUNTS=primary,office
```

Run `npm run backup:auth -- --account=office --email=office@gmail.com` for each account.

---

## 3. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_DRIVE_BACKUP_ENABLED` | `false` | Start the in-process scheduler. Manual/CLI runs still work when false |
| `PROJECT_NAME` | `advocate-management` | Filename prefix + Drive subfolder |
| `GOOGLE_DRIVE_CLIENT_ID` / `_SECRET` | — | Shared OAuth client |
| `GOOGLE_DRIVE_REDIRECT_URI` | `http://localhost:5555/oauth2callback` | Auth script redirect |
| `GOOGLE_DRIVE_ACCOUNT_EMAIL` | — | Single-account email (verified against token) |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | — | Single-account refresh token |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | — | Optional fixed folder (auto-created if empty) |
| `GOOGLE_DRIVE_ROOT_FOLDER_NAME` | `DB Backups` | Parent folder in My Drive |
| `DB_BACKUP_SCHEDULE` | `0 2 * * *` | Cron expression |
| `DB_BACKUP_TIMEZONE` | `Asia/Kolkata` | Cron + filename timezone |
| `DB_BACKUP_SCHEDULE_ENABLED` | `true` | Toggle scheduler |
| `DB_BACKUP_FORMAT` | `custom` | `custom` (`pg_restore`) or `plain` (SQL+gzip) |
| `PG_DUMP_PATH` / `PG_RESTORE_PATH` / `PSQL_PATH` | `pg_dump` etc. | Client binaries |
| `DB_BACKUP_TEMP_DIR` | `./backups/tmp` | Scratch space (deleted after upload) |
| `DB_BACKUP_MAX_FILE_MB` | `500` | Refuse larger archives |
| `DB_BACKUP_KEEP_DAILY` | `30` | Days of daily backups |
| `DB_BACKUP_KEEP_WEEKLY` | `12` | Weeks of weekly backups |
| `DB_BACKUP_KEEP_MONTHLY` | `12` | Months of monthly backups |
| `DB_BACKUP_MIN_FREE_MB` | `1024` | Safety margin before uploading |
| `DB_BACKUP_ENCRYPTION_KEY` | — | AES-256-GCM passphrase (32+ chars) |
| `BACKUP_ALERT_EMAIL` | `EMAIL_FROM` | Failure alerts |
| `DB_BACKUP_ALERT_ON_SUCCESS` | `false` | Also email on success |

`GOOGLE_DRIVE_<ID>_*` overrides the shared OAuth client for one account.

---

## 4. Commands

```bash
cd server

npm run backup                 # dump + upload + prune
npm run backup:dry-run         # dump + verify only, no upload
npm run backup -- --keep       # keep the temp archive for inspection
npm run backup -- --account=primary
npm run backup -- --no-retention

npm run backup:auth            # one-time refresh token
npm run backup:auth -- --account=office --email=office@gmail.com --manual

npm run backup:list            # list Drive archives
npm run backup:restore -- --latest --target=advocate_restore_test
npm run backup:restore -- --file=./backups/tmp/x.dump --target=postgresql://...
```

`npm run backup:restore` uses `--clean --if-exists`, so it replaces objects in the **target** database. It refuses to target the database in `DATABASE_URL` unless `--force` is passed.

---

## 5. Restore drill (do this monthly)

```bash
createdb advocate_restore_test
cd server
npm run backup:restore -- --latest --target=advocate_restore_test

# Verify row counts against production
psql advocate_restore_test -c "SELECT count(*) FROM \"Client\";"
psql advocate_restore_test -c "SELECT count(*) FROM \"Task\";"

dropdb advocate_restore_test
```

An unrestored backup is not a backup. If encryption is enabled, the restore needs `DB_BACKUP_ENCRYPTION_KEY` (or `--key`).

### Lost encryption key

There is no recovery. Keep the key in a password manager and a separate secure location — **never** in the same Google Drive folder as the backups.

---

## 6. Admin UI

`/app/admin/backup` shows:

- last run + status, next scheduled run
- stored archive count/size, live Drive quota
- connected accounts + folder links
- encryption/retention/schedule configuration
- paginated history with Drive links, error details, and permanent delete

Only `ADMIN` users can access the API and the page.

API:

```
GET    /api/backup/status
GET    /api/backup/runs?limit=50&offset=0
POST   /api/backup/run        { dryRun, accountIds, applyRetention }
DELETE /api/backup/runs/:id
```

---

## 7. Deployment notes

### VPS / always-on machine

`GOOGLE_DRIVE_BACKUP_ENABLED=true` starts the in-process cron. Backups run in the Node process, so the process must stay up around the scheduled time.

### Render free tier

- Native Node runtime usually has **no `pg_dump`** — the backup fails with a clear message. Options:
  - run the backup from **GitHub Actions** (Ubuntu runners include PostgreSQL client tools), or
  - use a Render Cron Job / Docker image with `postgresql-client`.
- Free web services restart and spin down; an in-process cron can miss a run.
- The disk is ephemeral, which is fine because dumps are uploaded immediately.

### GitHub Actions example

```yaml
name: database-backup
on:
  schedule:
    - cron: '30 20 * * *'   # 02:00 IST
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: server } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: sudo apt-get update && sudo apt-get install -y postgresql-client-17
      - run: npm ci
      - run: npm run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GOOGLE_DRIVE_CLIENT_ID: ${{ secrets.GOOGLE_DRIVE_CLIENT_ID }}
          GOOGLE_DRIVE_CLIENT_SECRET: ${{ secrets.GOOGLE_DRIVE_CLIENT_SECRET }}
          GOOGLE_DRIVE_ACCOUNT_EMAIL: ${{ secrets.GOOGLE_DRIVE_ACCOUNT_EMAIL }}
          GOOGLE_DRIVE_REFRESH_TOKEN: ${{ secrets.GOOGLE_DRIVE_REFRESH_TOKEN }}
          DB_BACKUP_ENCRYPTION_KEY: ${{ secrets.DB_BACKUP_ENCRYPTION_KEY }}
          BREVO_API_KEY: ${{ secrets.BREVO_API_KEY }}
          BACKUP_ALERT_EMAIL: ${{ secrets.BACKUP_ALERT_EMAIL }}
```

`pg_dump` must be the same or a **newer major version** than the server. Install `postgresql-client-17` when the DB is PG 17.

---

## 8. Retention rules

- Newest backup is always kept.
- Keep the newest archive of each of the last `DB_BACKUP_KEEP_DAILY` days.
- Keep the newest archive of each of the last `DB_BACKUP_KEEP_WEEKLY` weeks (Sunday-based).
- Keep the newest archive of each of the last `DB_BACKUP_KEEP_MONTHLY` months.
- The union is kept; everything else in the folder is permanently deleted.
- Files without a recognisable timestamp are never deleted.

Before uploading, the quota guard checks free space (`limit - usage`). If free space is below the archive size + `DB_BACKUP_MIN_FREE_MB`, it prunes first. If there is still not enough room, the run fails with a clear error instead of filling the account.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `PostgreSQL client tools not found` | Install `postgresql-client` or set `PG_DUMP_PATH` |
| `pg_dump ... older than PostgreSQL server` | Install a newer major version of the client |
| `invalid_grant` / `Token has been expired or revoked` | Refresh token expired (Testing mode = 7 days) or access revoked. Re-run `npm run backup:auth` and publish the OAuth app |
| `Google Drive account mismatch` | The token belongs to a different Google account than `*_EMAIL`. Re-auth with the correct account |
| `Insufficient permissions` / `403` | Drive API not enabled, wrong scope, or Google account hasn't consented |
| `storageQuotaExceeded` | 15 GB shared across Drive/Gmail/Photos. Empty Drive trash, lower retention, or use another account |
| `folder not found or is not accessible` | With `drive.file` scope the app can only see folders it created. Clear `GOOGLE_DRIVE_BACKUP_FOLDER_ID` and let it create one |
| Dump works, upload fails on Render | Install the PostgreSQL client or run the job in GitHub Actions |
| `pg_dump: error: connection ...` | Transaction pooler (port 6543) is not supported by `pg_dump`; use the direct/session pooler URL (port 5432) |
| Scheduler never runs | Check `GOOGLE_DRIVE_BACKUP_ENABLED`, `DB_BACKUP_SCHEDULE_ENABLED`, and the server logs |

Debug logging:

```bash
DEBUG_BACKUP=1 npm run backup
```

---

## 10. Security checklist

- [ ] OAuth consent screen is **In production** (not Testing)
- [ ] `DB_BACKUP_ENCRYPTION_KEY` is 32+ random characters, stored outside Drive
- [ ] `.env` is gitignored; credentials are set as Render/GitHub secrets in production
- [ ] Refresh token is treated as a password
- [ ] The Drive account has 2FA enabled
- [ ] A restore drill has succeeded at least once
- [ ] Retention keeps the folder well under the 15 GB quota
- [ ] Only `ADMIN` users can open `/app/admin/backup`
