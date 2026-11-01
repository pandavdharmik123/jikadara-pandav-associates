/*
 * Crawls the AnyRoR LandRecordRural.aspx dropdowns:
 *   District (જીલ્લો) -> Taluka (તાલુકો) -> Village (ગામ)
 * by driving the ASP.NET AutoPostBacks (form-encoded full postbacks).
 *
 * Usage:  node scripts/aanyror-crawl.mjs
 * Output: scripts/anyror-data.json (districts, talukas, villages)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://anyror.gujarat.gov.in/LandRecordRural.aspx';
const OUT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'anyror-data.json');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
      if (res.status >= 500 && i < attempts - 1) {
        await delay(800);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await delay(800);
    }
  }
  throw lastErr;
}

// --- tiny cookie jar ---
let jar = new Map();

function setCookieFrom(response) {
  const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const raw of list) {
    const pair = raw.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// --- HTML helpers ---
function selectOptions(html, selectId) {
  const re = new RegExp(`<select[^>]*id="${selectId}"[^>]*>([\\s\\S]*?)</select>`, 'i');
  const block = html.match(re);
  if (!block) return [];
  const out = [];
  const optRe = /<option\s+([^>]*)>\s*([\s\S]*?)\s*<\/option>/gi;
  let m;
  while ((m = optRe.exec(block[1]))) {
    const attrs = m[1];
    const label = m[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
    const valueMatch = attrs.match(/value="([^"]*)"/i);
    if (!valueMatch || !label) continue;
    out.push({ value: valueMatch[1], label });
  }
  return out;
}

function hiddenFields(html) {
  const out = {};
  const re = /<input[^>]*type="hidden"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const name = (tag.match(/name="([^"]*)"/i) || [])[1];
    const value = (tag.match(/value="([^"]*)"/i) || [])[1] || '';
    if (name) out[name] = value;
    else if (tag.includes('id="__VIEWSTATE"')) {
      out['__VIEWSTATE'] = value;
    }
  }
  // VIEWSTATE occasionally spans with attributes in different order
  if (!out['__VIEWSTATE']) {
    const vs = html.match(/id="__VIEWSTATE"[^>]*value="([^"]*)"/i);
    const vs2 = html.match(/name="__VIEWSTATE"[^>]*value="([^"]*)"/i);
    if (vs || vs2) out['__VIEWSTATE'] = (vs || vs2)[1];
  }
  return out;
}

async function getPage() {
  const res = await fetchWithRetry(BASE_URL, { headers: { 'user-agent': USER_AGENT, cookie: cookieHeader() } });
  setCookieFrom(res);
  const html = await res.text();
  if (res.ok && html.includes('ddlDistrict')) return html;
  throw new Error(`Could not load portal page (${res.status})`);
}

async function postBack(formData) {
  const body = new URLSearchParams(formData);
  const res = await fetchWithRetry(BASE_URL, {
    method: 'POST',
    headers: {
      'user-agent': USER_AGENT,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie: cookieHeader(),
      referer: BASE_URL,
      origin: 'https://anyror.gujarat.gov.in',
    },
    body: body.toString(),
  });
  setCookieFrom(res);
  const html = await res.text();
  if (!res.ok || !html.includes('ddlDistrict')) {
    throw new Error(`Postback failed (${res.status})`);
  }
  return html;
}

async function main() {
  console.log('Fetching form page…');
  let html = await getPage();
  let hidden = hiddenFields(html);
  const districts = selectOptions(html, 'ContentPlaceHolder1_ddlDistrict').filter((o) => o.value !== '0');
  console.log(`Found ${districts.length} districts`);

  const data = { fetchedAt: new Date().toISOString(), source: BASE_URL, districts: [] };

  for (const district of districts) {
    const entry = { value: district.value, name: district.label, talukas: [] };

    // POST: district selected -> taluka list
    const dPayload = {
      ...hidden,
      __EVENTTARGET: 'ctl00$ContentPlaceHolder1$ddlDistrict',
      __EVENTARGUMENT: '',
      __LASTFOCUS: '',
      ContentPlaceHolder1_ToolkitScriptManager1_HiddenField: '',
      'ctl00$ContentPlaceHolder1$drpLandRecord': '0',
      'ctl00$ContentPlaceHolder1$ddlDistrict': district.value,
      'ctl00$ContentPlaceHolder1$ddlTaluka': '',
      'ctl00$ContentPlaceHolder1$ddlVillage': '',
      'ctl00$ContentPlaceHolder1$txt_captcha_1': '',
      'ctl00$ContentPlaceHolder1$btnGo': '',
      'ctl00$ContentPlaceHolder1$btnCancel': '',
    };
    html = await postBack(dPayload);
    hidden = hiddenFields(html);
    const talukas = selectOptions(html, 'ContentPlaceHolder1_ddlTaluka').filter((o) => o.value !== '0');
    console.log(`${district.label}: ${talukas.length} talukas`);

    for (const taluka of talukas) {
      const tEntry = { value: taluka.value, name: taluka.label, villages: [] };
      const tPayload = {
        ...dPayload,
        __VIEWSTATE: hidden['__VIEWSTATE'],
        __EVENTVALIDATION: hidden['__EVENTVALIDATION'],
        __VIEWSTATEGENERATOR: hidden['__VIEWSTATEGENERATOR'],
        __VIEWSTATEENCRYPTED: hidden['__VIEWSTATEENCRYPTED'] ?? '',
        'ctl00$ContentPlaceHolder1$ddlDistrict': district.value,
        'ctl00$ContentPlaceHolder1$ddlTaluka': taluka.value,
      };
      // The __EVENTTARGET moves to the taluka dropdown for the village list
      const tPayloadWithTarget = { ...tPayload, __EVENTTARGET: 'ctl00$ContentPlaceHolder1$ddlTaluka' };
      const vhtml = await postBack(tPayloadWithTarget);
      const vHidden = hiddenFields(vhtml);
      const villages = selectOptions(vhtml, 'ContentPlaceHolder1_ddlVillage').filter((o) => o.value !== '0');
      console.log(`  ${taluka.label}: ${villages.length} villages`);

      // keep latest viewstate for the next request
      hidden = vHidden;

      tEntry.villages = villages;
      entry.talukas.push(tEntry);
      await delay(400);
    }

    data.districts.push(entry);
    fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
    await delay(500);
  }

  const counts = data.districts.reduce(
    (acc, d) => ({
      talukas: acc.talukas + d.talukas.length,
      villages: acc.villages + d.talukas.reduce((a, t) => a + t.villages.length, 0),
    }),
    { talukas: 0, villages: 0 }
  );
  console.log(`Done — ${data.districts.length} districts, ${counts.talukas} talukas, ${counts.villages} villages → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('Crawl failed:', err.message);
  process.exit(1);
});
