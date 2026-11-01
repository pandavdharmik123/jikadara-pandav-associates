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
    const summary = await getSummary({ userId: req.user.id });
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

router.get('/smc-viewbill-proxy', async (req, res) => {
  try {
    const tenementNo = req.query.tenementNo || req.query.tenement || '';
    const tenementData = parseTenementNumber(tenementNo);
    console.log('[SMC-Proxy] GET /smc-viewbill-proxy (Enroll) tenement:', tenementNo, tenementData);

    const upstreamRes = await fetch(SMC_ENROLL_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch SMC Property Tax Enroll page');
    }

    const cookieHeader = extractCookieHeader(upstreamRes);
    let html = await upstreamRes.text();
    html = await processSmcHtml(html, cookieHeader, tenementData);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error proxying SMC Enroll:', err);
    return res.status(500).send('Error loading Surat Municipal Corporation portal: ' + err.message);
  }
});

router.post('/smc-viewbill-proxy', express.urlencoded({ extended: true }), async (req, res) => {
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

    const upstreamRes = await fetch(SMC_ENROLL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
        Referer: SMC_ENROLL_URL,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: postParams.toString(),
      redirect: 'follow',
    });

    const contentType = upstreamRes.headers.get('content-type') || '';

    // If SMC returns a binary PDF file stream, serve it directly
    if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
      const arrayBuffer = await upstreamRes.arrayBuffer();
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', contentType);
      const disposition = upstreamRes.headers.get('content-disposition');
      if (disposition) res.setHeader('Content-Disposition', disposition);
      return res.send(Buffer.from(arrayBuffer));
    }

    const newCookies = extractCookieHeader(upstreamRes);
    const mergedCookies = mergeCookieHeaders(cookieHeader, newCookies);
    let html = await upstreamRes.text();
    html = await processSmcHtml(html, mergedCookies);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('Error submitting SMC Enroll form:', err);
    return res.status(500).send('Error processing request: ' + err.message);
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
