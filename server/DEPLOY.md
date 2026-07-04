# Deploying the API to Render

## 1. Create a PostgreSQL database

Use one of:

| Provider | Connection string to use |
|----------|-------------------------|
| **Neon** | **Pooled** URL (`…-pooler.neon.tech…`) — not the direct URL |
| **Supabase** | **Session pooler** (`*.pooler.supabase.com:5432`) — not direct `db.*.supabase.co` |
| **Render Postgres** | **Internal Database URL** (same region as the web service) |

The `ENETUNREACH` IPv6 error usually means the direct DB hostname is unreachable from Render. Switch to the **pooled / internal** URL from your provider.

## 2. Configure Render web service

**Root directory:** `server`

**Build command:**
```bash
npm install && npm run build
```

**Start command:**
```bash
npm run start
```

**Environment variables:**

| Key | Required | Example |
|-----|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Yes | A long random string |
| `NODE_ENV` | Recommended | `production` |

Do **not** rely on a `.env` file in the repo — set variables in **Render → Environment**.

## 3. Push schema & seed (first deploy)

The build runs `prisma db push` to create tables. After the first successful deploy, seed the admin user once from your machine:

```bash
cd server
DATABASE_URL="your-production-url" npm run db:seed
```

Default admin: `admin@jikadara.com` / `admin123` — change the password after first login.

## 4. Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expected when healthy:
```json
{"status":"ok","database":"connected","timestamp":"..."}
```

If database is unreachable:
```json
{"status":"degraded","database":"disconnected","timestamp":"..."}
```

Check Render logs for a line like `📦 Database: postgresql://user:****@host/...` to confirm the URL is being read.
