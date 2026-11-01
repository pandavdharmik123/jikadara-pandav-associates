import { Router } from 'express';
import crypto from 'crypto';

/**
 * AnyRoR proxy (https://anyror.gujarat.gov.in)
 *
 * AnyRoR sends `X-Frame-Options: deny`, so browsers refuse to render
 * https://anyror.gujarat.gov.in/LandRecordRural.aspx inside an <iframe>.
 * This route fetches the portal server-side and re-serves it under
 * /api/anyror/*, so the Nondh Status drawer can display it.
 *
 *  - Per-browser cookie jars keep each user's ASP.NET session separate.
 *  - Root-relative URLs in the HTML (form posts, .axd scripts, css, images)
 *    are rewritten to stay inside /api/anyror so navigation keeps working.
 */
const router = Router();

// Overridable for tests; production always uses the real portal.
const UPSTREAM_ORIGIN = process.env.ANYROR_UPSTREAM_URL || 'https://anyror.gujarat.gov.in';
const ANYROR_ORIGINAL_URL = 'https://anyror.gujarat.gov.in/LandRecordRural.aspx';
const PROXY_PREFIX = '/api/anyror';
const JAR_COOKIE = 'ANYROR_JAR';
const JAR_TTL_MS = 30 * 60 * 1000; // ASP.NET session default is ~20 min

// jarId -> { cookies: Map<string, string>, lastUsed: number }
const JARS = new Map();
let lastSweepAt = 0;

function sweepJars() {
  const now = Date.now();
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;
  for (const [id, jar] of JARS) {
    if (now - jar.lastUsed > JAR_TTL_MS) JARS.delete(id);
  }
}

function readReqCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

function obtainJar(req) {
  const existingId = readReqCookie(req, JAR_COOKIE);
  if (existingId && JARS.has(existingId)) {
    const jar = JARS.get(existingId);
    jar.lastUsed = Date.now();
    return { jar };
  }
  const id = crypto.randomUUID();
  const jar = { cookies: new Map(), lastUsed: Date.now() };
  JARS.set(id, jar);
  return { jar, freshSetCookie: `${JAR_COOKIE}=${id}; Path=${PROXY_PREFIX}; SameSite=Lax; Max-Age=86400` };
}

function storeUpstreamSetCookies(jar, upstream) {
  const list =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : (upstream.headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
  for (const raw of list) {
    if (!raw) continue;
    const pair = raw.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    // Cleared cookies arrive as `name=;` — delete them from the jar.
    if (!value) jar.cookies.delete(name);
    else jar.cookies.set(name, value);
  }
}

function rewriteHtml(html) {
  return html
    // Fully-qualified portal URLs -> proxy prefix
    .replace(/https?:\/\/anyror\.gujarat\.gov\.in/gi, PROXY_PREFIX)
    // Root-relative URL attributes (src/href/action) -> proxy prefix
    .replace(
      /(src|href|action)=(["'])\/(?!\/|api\/anyror\/)([^"']*)\2/gi,
      (match, attr, quote, path) => `${attr}=${quote}${PROXY_PREFIX}/${path}${quote}`
    )
    // Absolute .aspx / .axd / .ashx paths inside inline JS strings
    .replace(
      /(['"\s(])\/(?!\/|api\/anyror\/)((?:[\w./-]+\/)?[\w-]+\.(?:aspx|axd|ashx)(?:[?#][^"'\s)]*)?)/g,
      (match, prefix, path) => `${prefix}${PROXY_PREFIX}/${path}`
    );
}

/**
 * Upstream fetch with timeout + retry. The AnyRoR portal intermittently
 * resets TLS connections and even returns HTTP 500s on individual requests
 * (WAF rate-limits / flaky links); without retries the page HTML from a lucky
 * request loads while its CSS/JS asset requests fail — the portal then renders
 * inside the iframe with no styling.
 */
async function fetchWithRetry(url, options, { attempts = 4, timeoutMs = 12_000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      // Treat upstream 5xx as transient and retry within the same budget.
      if (response.status >= 500 && attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// The global express.json() in index.js only consumes application/json bodies,
// so urlencoded ASP.NET postbacks arrive untouched at this point and are
// forwarded to the portal as-is.
router.use(
  (req, _res, next) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) {
        req.removeAllListeners('data');
        next(new Error('Request body too large for AnyRoR proxy'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      req.body = Buffer.concat(chunks);
      next();
    });
    req.on('error', next);
  },
  (err, _req, res, next) => {
    // eslint-disable-next-line no-unused-vars
    if (err) {
      res.status(413).json({ error: 'Request body too large for AnyRoR proxy' });
      return;
    }
    next(err);
  }
);

async function proxyHandler(req, res) {
  sweepJars();
  const { jar, freshSetCookie } = obtainJar(req);
  const jarCookies = Array.from(jar.cookies.entries()).map(([k, v]) => `${k}=${v}`);

  let method = req.method.toUpperCase();
  let body = method === 'GET' || method === 'HEAD' ? undefined : req.body;
  let target = `${UPSTREAM_ORIGIN}${req.url || '/'}`;
  let upstream = null;

  try {
    // Follow redirects server-side (ASP.NET post-redirects must stay in the
    // proxy path, and Set-Cookie on redirect hops has to be captured).
    for (let hop = 0; hop < 6 && target; hop += 1) {
      const headers = {
        accept: req.headers.accept || '*/*',
        'accept-language': req.headers['accept-language'] || 'en-IN,en;q=0.9,gu;q=0.8',
        'user-agent':
          req.headers['user-agent'] ||
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      };
      if (jarCookies.length) headers.cookie = jarCookies.join('; ');
      if (body !== undefined) {
        headers['content-type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
      }

      upstream = await fetchWithRetry(target, { method, headers, body, redirect: 'manual' });
      storeUpstreamSetCookies(jar, upstream);

      const location = upstream.headers.get('location');
      if ([301, 302, 303, 307, 308].includes(upstream.status) && location) {
        const next = new URL(location, target).href;
        if (hop > 0 && method !== 'GET' && method !== 'HEAD' && ![307, 308].includes(upstream.status)) {
          method = 'GET';
          body = undefined;
        }
        target = next;
        continue;
      }
      target = null;
    }

    if (!upstream) throw new Error('No response from AnyRoR');

    if (upstream.status >= 400) {
      // Pass the upstream status/body through as-is (rewriting HTML) so error
      // pages and missing assets behave like a normal site instead of failing
      // the whole stylesheet/JS chain.
      if (upstream.status >= 500) {
        console.warn(`AnyRoR proxy: upstream returned HTTP ${upstream.status} for ${req.url}`);
      }
    }
    if (upstream.status >= 300 && upstream.status < 400) {
      // Unresolvable redirect chain — hand the rewritten location to the browser.
      const location = upstream.headers.get('location') || '';
      let finalLocation = location.startsWith('/')
        ? `${PROXY_PREFIX}${location}`
        : location.replace(UPSTREAM_ORIGIN, PROXY_PREFIX);
      if (freshSetCookie) res.setHeader('set-cookie', freshSetCookie);
      res.redirect(String(upstream.status), finalLocation || PROXY_PREFIX);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const output =
      contentType.includes('text/html')
        ? Buffer.from(rewriteHtml(buffer.toString('utf8')), 'utf8')
        : buffer;

    // Portal assets (css/js/axd/images/fonts) are immutable per versioned URL,
    // so cache them at the browser. This keeps repeat drawer opens snappy even
    // when the upstream portal is slow or briefly unreachable.
    const isHtml = contentType.includes('text/html');
    const cacheControl =
      isHtml || contentType.includes('json') || upstream.status >= 400
        ? 'no-store'
        : 'public, max-age=86400';

    if (freshSetCookie) res.setHeader('set-cookie', freshSetCookie);
    res
      .status(upstream.status)
      .set('content-type', contentType)
      .set('cache-control', cacheControl)
      .send(output);
  } catch (err) {
    console.error('AnyRoR proxy error:', err);
    // If the caller expects HTML (a page or asset in the iframe), return a
    // friendly error page instead of raw JSON.
    if (String(req.headers.accept || '').includes('text/html')) {
      res
        .status(502)
        .set('content-type', 'text/html; charset=utf-8')
        .set('cache-control', 'no-store')
        .send(`<!doctype html>
<html><head><meta charset="utf-8" /><title>AnyRoR temporarily unavailable</title></head>
<body style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
  <div style="max-width:420px;padding:24px;">
    <div style="font-size:40px;">🏛️</div>
    <h1 style="font-size:20px;margin:12px 0 8px;">AnyRoR portal is temporarily unavailable</h1>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
      The Gujarat land records portal did not respond. It may be momentarily
      rate-limiting or offline. Please click Reload in the drawer header in a
      few seconds, or open the official site directly.
    </p>
    <a href="${ANYROR_ORIGINAL_URL}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600;text-decoration:none;">
      Open official portal in a new tab →
    </a>
  </div>
</body></html>`);
      return;
    }
    res.status(502).json({ error: 'Could not reach the AnyRoR portal. Please try again.' });
  }
}

router.get(/.*/, proxyHandler);
router.post(/.*/, proxyHandler);

export default router;
