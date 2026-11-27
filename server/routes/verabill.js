import express, { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  VerabillValidationError,
  parseEntryPayload,
  parseListFilters,
  parseImportPayload,
} from '../lib/verabillValidation.js';
import {
  createEntry,
  deleteEntry,
  getEntry,
  getSummary,
  importEntries,
  listEntries,
  updateEntry,
} from '../services/verabill.js';

const router = Router();

function handleError(res, err, fallbackMessage) {
  if (err instanceof VerabillValidationError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json({ error: fallbackMessage });
}

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const fyStartDate = req.query.fyStartDate ? String(req.query.fyStartDate).trim().slice(0, 10) : '';
    const fyEndDate = req.query.fyEndDate ? String(req.query.fyEndDate).trim().slice(0, 10) : '';
    const summary = await getSummary({ userId: req.user.id, fyStartDate, fyEndDate });
    res.json({ summary });
  } catch (err) {
    handleError(res, err, 'Failed to fetch verabill summary');
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = parseListFilters(req.query);
    const result = await listEntries({ userId: req.user.id, ...filters });
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch verabill entries');
  }
});

const SMC_ENROLL_URL = 'https://www.suratmunicipal.gov.in/OnlineServices/PropertyTax/Enroll';
const smcSessionMap = new Map();

function extractCookieHeader(response) {
  if (!response) return '';
  const setCookies = response.headers?.getSetCookie ? response.headers.getSetCookie() : [];
  if (setCookies && setCookies.length > 0) {
    const pairs = setCookies.map((c) => c.split(';')[0].trim()).filter(Boolean);
    return Array.from(new Set(pairs)).join('; ');
  }
  const raw = response.headers?.get ? response.headers.get('set-cookie') : '';
  if (!raw) return '';
  return raw
    .split(',')
    .map((s) => s.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function mergeCookieHeaders(oldCookieHeader = '', newCookieHeader = '') {
  const map = new Map();
  if (oldCookieHeader) {
    oldCookieHeader.split(';').forEach((p) => {
      const [k, ...v] = p.trim().split('=');
      if (k) map.set(k, v.join('='));
    });
  }
  if (newCookieHeader) {
    newCookieHeader.split(';').forEach((p) => {
      const [k, ...v] = p.trim().split('=');
      if (k) map.set(k, v.join('='));
    });
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function parseTenementNumber(tenementStr) {
  if (!tenementStr || typeof tenementStr !== 'string') return null;
  const raw = tenementStr.trim();
  if (!raw) return null;

  // 1. Try hyphen or space or slash split: e.g. "016-D-01-0001-0-000" or "19-F-07-9371-0-001"
  const splitParts = raw.split(/[-/\s]+/).filter(Boolean);
  if (splitParts.length === 6) {
    return {
      ward: splitParts[0].trim(),
      subWard: splitParts[1].toUpperCase().trim(),
      location: splitParts[2].trim(),
      owner: splitParts[3].trim(),
      subOwner: splitParts[4].trim(),
      occupier: splitParts[5].trim(),
    };
  }

  // 2. If 5 parts (e.g. "016D-01-0001-0-000")
  if (splitParts.length === 5) {
    const matchWardSub = splitParts[0].match(/^(\d{1,3})([A-Za-z])$/);
    if (matchWardSub) {
      return {
        ward: matchWardSub[1].padStart(3, '0').slice(-3),
        subWard: matchWardSub[2].toUpperCase(),
        location: splitParts[1].padStart(2, '0').slice(-2),
        owner: splitParts[2].padStart(4, '0').slice(-4),
        subOwner: splitParts[3].slice(0, 1),
        occupier: splitParts[4].padStart(3, '0').slice(-3),
      };
    }
  }

  // 3. Contiguous alphanumeric string, e.g. "016D0100010000"
  const clean = raw.replace(/[^A-Za-z0-9]/g, '');
  if (clean.length >= 13) {
    const match = clean.match(/^(\d{1,3})([A-Za-z])(\d{2})(\d{4})(\d{1})(\d{1,3})$/);
    if (match) {
      return {
        ward: match[1].padStart(3, '0').slice(-3),
        subWard: match[2].toUpperCase(),
        location: match[3],
        owner: match[4],
        subOwner: match[5],
        occupier: match[6].padStart(3, '0').slice(-3),
      };
    }
  }

  return {
    raw,
    ward: splitParts[0] || '',
    subWard: splitParts[1] || '',
    location: splitParts[2] || '',
    owner: splitParts[3] || '',
    subOwner: splitParts[4] || '',
    occupier: splitParts[5] || '',
  };
}

async function processSmcHtml(html, cookieHeader, tenementData = null) {
  // Inline the Captcha GIF as Base64 to bypass cross-site cookie restrictions
  const tokenMatch = html.match(/src="[^"]*DefaultCaptcha\/Generate\?t=([a-f0-9]+)"/i);
  if (tokenMatch && tokenMatch[1]) {
    const captchaToken = tokenMatch[1];
    if (cookieHeader) {
      smcSessionMap.set(captchaToken, {
        cookie: cookieHeader,
        timestamp: Date.now(),
      });
      // Purge sessions older than 30 minutes
      const expireTime = Date.now() - 30 * 60 * 1000;
      for (const [key, val] of smcSessionMap.entries()) {
        if (val.timestamp < expireTime) smcSessionMap.delete(key);
      }
    }

    try {
      const captchaRes = await fetch(
        `https://www.suratmunicipal.gov.in/OnlineServices/DefaultCaptcha/Generate?t=${captchaToken}`,
        {
          headers: {
            Cookie: cookieHeader || '',
            Referer: SMC_ENROLL_URL,
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );
      if (captchaRes.ok) {
        const buf = await captchaRes.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        html = html.replace(tokenMatch[0], `src="data:image/gif;base64,${base64}"`);
      }
    } catch (captchaErr) {
      console.error('Failed to pre-fetch captcha image:', captchaErr);
    }
  }

  // Inject hidden session input inside form so state survives server restarts
  if (cookieHeader) {
    const encodedCookie = Buffer.from(cookieHeader).toString('base64');
    const hiddenSessionInput = `<input type="hidden" name="__smc_session" id="__smc_session" value="${encodedCookie}" />`;
    if (html.includes('id="__smc_session"')) {
      html = html.replace(/<input type="hidden" name="__smc_session"[^>]*>/i, hiddenSessionInput);
    } else {
      html = html.replace(/(<form[^>]*>)/i, `$1\n    ${hiddenSessionInput}`);
    }
  }

  // Inject script and styles to suppress Alertify error popups and keep navigation in iframe
  const headInjection = `
    <base href="https://www.suratmunicipal.gov.in/OnlineServices/">
    <style id="smc-suppress-alerts">
      .alertify-notifier,
      .alertify-notifier *,
      .ajs-message,
      .ajs-error,
      .ajs-top,
      .ajs-right,
      #alertify,
      #alertify-logs,
      .alertify-log,
      .alertify-log-error {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
    <script>
      (function() {
        var proxyUrl = window.location.protocol + '//' + window.location.host + '/api/verabill/smc-viewbill-proxy';
        var apiProxyBase = window.location.protocol + '//' + window.location.host + '/api/verabill/smc-api-proxy';
        var tenement = ${JSON.stringify(tenementData || null)};

        // Auto-fill tenement number fields
        function fillTenementFields() {
          if (!tenement) return;
          var wardEl = document.getElementById('txtWard');
          var subWardEl = document.getElementById('drpSubWard');
          var locEl = document.getElementById('txtLoaction');
          var ownerEl = document.getElementById('txtOwner');
          var subOwnerEl = document.getElementById('txtSubOwner');
          var occEl = document.getElementById('txtOccupier');

          if (wardEl && tenement.ward) wardEl.value = tenement.ward;
          if (subWardEl && tenement.subWard) {
            subWardEl.value = tenement.subWard;
            try { $(subWardEl).trigger('change'); } catch(e){}
          }
          if (locEl && tenement.location) locEl.value = tenement.location;
          if (ownerEl && tenement.owner) ownerEl.value = tenement.owner;
          if (subOwnerEl && tenement.subOwner) subOwnerEl.value = tenement.subOwner;
          if (occEl && tenement.occupier) occEl.value = tenement.occupier;

          var captchaInput = document.getElementById('CaptchaInputText');
          if (captchaInput) {
            setTimeout(function() {
              try { captchaInput.focus(); } catch(e){}
            }, 150);
          }
        }

        window.addEventListener('message', function(event) {
          if (!event.data) return;
          if (event.data.type === 'FILL_TENEMENT') {
            tenement = event.data.tenement;
            fillTenementFields();
          } else if (event.data.type === 'PRINT_SMC_PAGE') {
            try {
              window.focus();
              window.print();
            } catch(e) {
              console.error('Print trigger failed inside iframe:', e);
            }
          }
        });

        // 1. Intercept XMLHttpRequest to prevent CORS errors on background calls
        try {
          var origOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            try {
              if (typeof url === 'string') {
                if (url.indexOf('suratmunicipal.gov.in') !== -1 || url.indexOf('/OnlineServices') === 0) {
                  url = apiProxyBase + '?url=' + encodeURIComponent(url);
                }
              }
            } catch(e) {}
            return origOpen.apply(this, arguments);
          };
        } catch(e) {}

        // 2. Intercept fetch
        try {
          var origFetch = window.fetch;
          window.fetch = function(url, init) {
            try {
              if (typeof url === 'string' && (url.indexOf('suratmunicipal.gov.in') !== -1 || url.indexOf('/OnlineServices') === 0)) {
                url = apiProxyBase + '?url=' + encodeURIComponent(url);
              }
            } catch(e) {}
            return origFetch.apply(this, arguments);
          };
        } catch(e) {}

        // 3. Actively remove any error notification DOM nodes instantly
        function purgeErrorElements() {
          var errorEls = document.querySelectorAll('.alertify-notifier, .ajs-message, .ajs-error, #alertify, #alertify-logs, .alertify-log');
          for (var i = 0; i < errorEls.length; i++) {
            errorEls[i].remove();
          }
        }

        try {
          var observer = new MutationObserver(function(mutations) {
            purgeErrorElements();
          });
          if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
          }
        } catch(e) {}

        // 4. Neutralize Alertify and SignalR
        function patchErrorHandlers() {
          purgeErrorElements();

          if (window.alertify) {
            if (alertify.error) alertify.error = function() {};
            if (alertify.notify) {
              var origNotify = alertify.notify;
              alertify.notify = function(msg, type) {
                if (type === 'error' || (typeof msg === 'string' && msg.toLowerCase().indexOf('error') !== -1)) return;
                return origNotify.apply(this, arguments);
              };
            }
          }

          if (window.$ && $.connection && $.connection.hub) {
            $.connection.hub.start = function() {
              return {
                done: function(fn) { if (fn) try { fn(); } catch(e){} return this; },
                fail: function() { return this; }
              };
            };
          }
        }

        function setupProxyHandlers() {
          patchErrorHandlers();
          fillTenementFields();
          setTimeout(fillTenementFields, 300);
          setTimeout(fillTenementFields, 800);

          var form = document.getElementById('PTaxEnroll-form') || document.getElementById('PTaxViewBill-form') || document.querySelector('form');
          if (form) {
            form.removeAttribute('target');
            form.target = '_self';
            form.action = proxyUrl;
            form.method = 'POST';

            // Ensure btnService=Search is present
            if (!form.querySelector('input[name="btnService"]')) {
              var btnServiceInput = document.createElement('input');
              btnServiceInput.type = 'hidden';
              btnServiceInput.name = 'btnService';
              btnServiceInput.value = 'Search';
              form.appendChild(btnServiceInput);
            }

            form.onsubmit = function() {
              form.action = proxyUrl;
              form.target = '_self';
              var submitBtn = document.getElementById('btnSubmit') || document.getElementById('btnSearch') || form.querySelector('button[type="submit"]');
              if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="fa fa-spinner fa-spin pad-r5"></span>Loading...';
              }
              return true;
            };
          }

          var refreshLink = document.querySelector('.captcha-refresh-link');
          if (refreshLink) {
            refreshLink.onclick = function(e) {
              e.preventDefault();
              window.location.href = proxyUrl;
            };
          }

          var btnClear = document.getElementById('btnClear');
          if (btnClear) {
            btnClear.onclick = function(e) {
              e.preventDefault();
              window.location.href = proxyUrl;
            };
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', setupProxyHandlers);
        } else {
          setupProxyHandlers();
        }
        setInterval(patchErrorHandlers, 200);
      })();
    </script>
  `;

  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + headInjection);
  } else {
    html = headInjection + html;
  }

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setProxyFrameHeaders(res) {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://jikadara-and-pandav-associates.vercel.app https://*.vercel.app http://localhost:* http://127.0.0.1:* capacitor://localhost https://localhost"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
}

function renderFallbackHtml(tenementNo = '', tenementData = null, errorMsg = '') {
  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMC Property Tax Portal</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
      text-align: center;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 30px 22px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: #eff6ff;
      color: #2563eb;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    p {
      font-size: 13.5px;
      line-height: 1.5;
      color: #64748b;
      margin: 0 0 18px 0;
    }
    .tenement-box {
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 18px;
    }
    .tenement-label {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .tenement-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: 1px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 18px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;
    }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      margin-top: 10px;
      font-size: 13px;
      padding: 10px 16px;
    }
    .btn-secondary:hover { background: #e2e8f0; }
    .copy-toast {
      font-size: 12px;
      font-weight: 600;
      color: #16a34a;
      margin-top: 6px;
      display: none;
    }
    .error-detail {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 14px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M8 14h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 18h.01"></path>
        <path d="M16 18h.01"></path>
      </svg>
    </div>
    <h2>સુરત મહાનગરપાલિકા (SMC) પોર્ટલ</h2>
    <p>
      સરકારી SMC સર્વર અથવા નેટવર્ક પ્રતિબંધના કારણે પેજ સીધા ફ્રેમમાં લોડ થઈ શક્યું નથી. આપ નીચે આપેલ બટન પર ક્લિક કરીને સત્તાવાર પોર્ટલ સીધું ખોલી શકો છો:
    </p>

    ${tenementNo ? `
      <div class="tenement-box">
        <div class="tenement-label">ટેનામેન્ટ નંબર (Tenement No)</div>
        <div class="tenement-val" id="tNo">${escapeHtml(tenementNo)}</div>
      </div>
    ` : ''}

    <a href="${SMC_ENROLL_URL}" target="_blank" rel="noopener noreferrer" class="btn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
      સત્તાવાર SMC પોર્ટલ ખોલો (Open SMC Portal)
    </a>

    ${tenementNo ? `
      <button type="button" class="btn btn-secondary" onclick="copyTenement()">
        📋 ટેનામેન્ટ નંબર કોપી કરો (Copy Number)
      </button>
      <div id="copyNotice" class="copy-toast">✓ નંબર સફળતાપૂર્વક કોપી થયો!</div>
    ` : ''}

    <button type="button" class="btn btn-secondary" onclick="window.location.reload()" style="margin-top: 8px;">
      🔄 ફરી પ્રયાસ કરો (Try Again)
    </button>

    ${errorMsg ? `<div class="error-detail">તકનીકી નોંધ: ${escapeHtml(errorMsg)}</div>` : ''}
  </div>

  <script>
    function copyTenement() {
      var text = ${JSON.stringify(tenementNo)};
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showToast);
      } else {
        var input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast();
      }
    }
    function showToast() {
      var el = document.getElementById('copyNotice');
      if (el) {
        el.style.display = 'block';
        setTimeout(function() { el.style.display = 'none'; }, 2500);
      }
    }
  </script>
</body>
</html>`;
}

router.get('/smc-viewbill-proxy', async (req, res) => {
  const tenementNo = req.query.tenementNo || req.query.tenement || '';
  const tenementData = parseTenementNumber(tenementNo);
  setProxyFrameHeaders(res);

  try {
    console.log('[SMC-Proxy] GET /smc-viewbill-proxy (Enroll) tenement:', tenementNo, tenementData);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let upstreamRes;
    try {
      upstreamRes = await fetch(SMC_ENROLL_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,gu;q=0.8',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstreamRes.ok) {
      console.warn(`[SMC-Proxy] Upstream responded with status ${upstreamRes.status}`);
      return res.status(200).send(renderFallbackHtml(tenementNo, tenementData, `SMC portal returned status ${upstreamRes.status}`));
    }

    const cookieHeader = extractCookieHeader(upstreamRes);
    let html = await upstreamRes.text();
    html = await processSmcHtml(html, cookieHeader, tenementData);

    setProxyFrameHeaders(res);
    return res.send(html);
  } catch (err) {
    console.error('Error proxying SMC Enroll:', err?.message || err);
    setProxyFrameHeaders(res);
    return res.status(200).send(renderFallbackHtml(tenementNo, tenementData, err?.message || 'Connection timeout'));
  }
});

router.post('/smc-viewbill-proxy', express.urlencoded({ extended: true }), async (req, res) => {
  setProxyFrameHeaders(res);
  const tenementNo = [
    req.body?.txtWard,
    req.body?.drpSubWard,
    req.body?.txtLoaction,
    req.body?.txtOwner,
    req.body?.txtSubOwner,
    req.body?.txtOccupier,
  ].filter(Boolean).join('-');

  try {
    const captchaToken = req.body?.CaptchaDeText;
    let cookieHeader = '';

    // 1. Check hidden input embedded in form
    if (req.body?.__smc_session) {
      try {
        cookieHeader = Buffer.from(req.body.__smc_session, 'base64').toString('utf-8');
      } catch (e) {
        console.warn('Failed to decode __smc_session from form body:', e);
      }
    }

    // 2. Fallback to in-memory session map
    if (!cookieHeader && captchaToken) {
      const sessionData = smcSessionMap.get(captchaToken);
      cookieHeader = sessionData?.cookie || '';
    }

    console.log('[SMC-Proxy] POST /smc-viewbill-proxy (Enroll) with token:', captchaToken, 'hasCookie:', Boolean(cookieHeader));

    if (!cookieHeader) {
      console.warn('[SMC-Proxy] No valid session cookie found; session likely expired. Reloading clean page.');
      return res.redirect('/api/verabill/smc-viewbill-proxy');
    }

    const postParams = new URLSearchParams(req.body);
    // Don't forward our custom hidden parameter to SMC
    postParams.delete('__smc_session');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let upstreamRes;
    try {
      upstreamRes = await fetch(SMC_ENROLL_URL, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieHeader,
          Referer: SMC_ENROLL_URL,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: postParams.toString(),
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timeout);
    }

    setProxyFrameHeaders(res);

    if (!upstreamRes.ok) {
      console.warn(`[SMC-Proxy] POST upstream returned status ${upstreamRes.status}`);
      return res.status(200).send(renderFallbackHtml(tenementNo, null, `SMC portal returned status ${upstreamRes.status}`));
    }

    const contentType = upstreamRes.headers.get('content-type') || '';

    // If SMC returns a binary PDF file stream, serve it directly
    if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      const disposition = upstreamRes.headers.get('content-disposition');
      if (disposition) res.setHeader('Content-Disposition', disposition);
      return res.send(Buffer.from(arrayBuffer));
    }

    const newCookies = extractCookieHeader(upstreamRes);
    const mergedCookies = mergeCookieHeaders(cookieHeader, newCookies);
    let html = await upstreamRes.text();
    html = await processSmcHtml(html, mergedCookies);

    return res.send(html);
  } catch (err) {
    console.error('Error submitting SMC Enroll form:', err);
    setProxyFrameHeaders(res);
    return res.status(200).send(renderFallbackHtml(tenementNo, null, err?.message || 'Error processing request'));
  }
});

router.all('/smc-api-proxy', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const rawTarget = req.query.url;
    if (!rawTarget) return res.status(400).send('Missing url param');

    const targetUrl = rawTarget.startsWith('http')
      ? rawTarget
      : 'https://www.suratmunicipal.gov.in' + (rawTarget.startsWith('/') ? '' : '/') + rawTarget;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: SMC_ENROLL_URL,
    };
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = new URLSearchParams(req.body).toString();
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const ct = upstreamRes.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    const buf = await upstreamRes.arrayBuffer();
    return res.status(upstreamRes.status).send(Buffer.from(buf));
  } catch (err) {
    console.warn('[smc-api-proxy] Handled upstream error:', err.message);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send('{}');
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await getEntry({ userId: req.user.id, id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch verabill entry');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = parseEntryPayload(req.body || {});
    const entry = await createEntry({ userId: req.user.id, data });
    res.status(201).json({ entry });
  } catch (err) {
    handleError(res, err, 'Failed to create verabill entry');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = parseEntryPayload(req.body || {}, { partial: true });
    const entry = await updateEntry({ userId: req.user.id, id: req.params.id, data });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    return handleError(res, err, 'Failed to update verabill entry');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteEntry({ userId: req.user.id, id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ success: true, message: 'Entry moved to Recycle Bin' });
  } catch (err) {
    return handleError(res, err, 'Failed to delete verabill entry');
  }
});

router.post('/import', requireAuth, async (req, res) => {
  try {
    const records = parseImportPayload(req.body || {});
    const result = await importEntries({ userId: req.user.id, records });
    res.json({ result });
  } catch (err) {
    handleError(res, err, 'Failed to import verabill records');
  }
});

export default router;
