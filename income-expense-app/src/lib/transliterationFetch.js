// The @ai4bharat/indic-transliterate package points at xlit-api.ai4bharat.org,
// which no longer resolves. The main website rewrites those requests to Google
// Input Tools (the same live service), so the ported tool screens reuse that
// exact behaviour instead of adding a new backend endpoint.
const originalFetch = window.fetch;

const TRANSLITERATION_LANGUAGES = [
  { LangCode: 'gu', Direction: 'ltr', GoogleFont: 'Noto Sans Gujarati', FallbackFont: 'sans-serif' },
  { LangCode: 'hi', Direction: 'ltr', GoogleFont: 'Noto Sans Devanagari', FallbackFont: 'sans-serif' },
  { LangCode: 'mr', Direction: 'ltr', GoogleFont: 'Noto Sans Devanagari', FallbackFont: 'sans-serif' },
  { LangCode: 'bn', Direction: 'ltr', GoogleFont: 'Noto Sans Bengali', FallbackFont: 'sans-serif' },
  { LangCode: 'ta', Direction: 'ltr', GoogleFont: 'Noto Sans Tamil', FallbackFont: 'sans-serif' },
  { LangCode: 'te', Direction: 'ltr', GoogleFont: 'Noto Sans Telugu', FallbackFont: 'sans-serif' },
  { LangCode: 'kn', Direction: 'ltr', GoogleFont: 'Noto Sans Kannada', FallbackFont: 'sans-serif' },
  { LangCode: 'ml', Direction: 'ltr', GoogleFont: 'Noto Sans Malayalam', FallbackFont: 'sans-serif' },
  { LangCode: 'pa', Direction: 'ltr', GoogleFont: 'Noto Sans Gurmukhi', FallbackFont: 'sans-serif' },
  { LangCode: 'or', Direction: 'ltr', GoogleFont: 'Noto Sans Oriya', FallbackFont: 'sans-serif' },
];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

window.fetch = async function (input) {
  const url = typeof input === 'string' ? input : input && input.url ? input.url : '';

  // Analytics/telemetry beacon from @ai4bharat/indic-transliterate. Drop it.
  if (url && url.includes('backend.shoonya.ai4bharat.org')) {
    return new Response(null, { status: 204 });
  }

  if (url && url.includes('xlit-api.ai4bharat.org')) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url, window.location.origin);
    } catch {
      return jsonResponse({ result: [] });
    }

    if (parsedUrl.pathname.replace(/\/+$/, '') === '/languages') {
      return jsonResponse(TRANSLITERATION_LANGUAGES);
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const tlIndex = pathParts.indexOf('tl');
    if (tlIndex !== -1 && pathParts.length > tlIndex + 2) {
      const lang = pathParts[tlIndex + 1];
      const word = decodeURIComponent(pathParts[tlIndex + 2]);

      if (word && word.trim()) {
        try {
          const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&ime=transliteration_en_${lang}&num=5&cp=0&cs=0&ie=utf-8&oe=utf-8&app=jsapi`;
          const googleResponse = await originalFetch(googleUrl);
          const googleData = await googleResponse.json();

          const suggestions =
            googleData && googleData[0] === 'SUCCESS' && googleData[1] && googleData[1][0]
              ? googleData[1][0][1] || []
              : [];

          return jsonResponse({ result: suggestions });
        } catch {
          // Fall through to an empty suggestion list instead of surfacing a
          // network error to the user.
        }
      }
    }

    return jsonResponse({ result: [] });
  }

  return originalFetch.apply(this, arguments);
};
