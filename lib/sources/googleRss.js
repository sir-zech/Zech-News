// Google News RSS — breadth filler. Supports paging by slicing the (~100 item) feed.

const { fetchText } = require('../http');
const { parseFeed } = require('../rss');

const GOOGLE_NEWS_CATEGORIES = {
  general: 'WORLD',
  business: 'BUSINESS',
  technology: 'TECHNOLOGY',
  science: 'SCIENCE',
  health: 'HEALTH',
  sports: 'SPORTS',
  entertainment: 'ENTERTAINMENT',
  world: 'WORLD',
  nation: 'NATION',
};

const LANG_TO_CEID = {
  en: { hl: 'en', gl: 'US', ceid: 'US:en' },
  hi: { hl: 'hi', gl: 'IN', ceid: 'IN:hi' },
  ta: { hl: 'ta', gl: 'IN', ceid: 'IN:ta' },
  te: { hl: 'te', gl: 'IN', ceid: 'IN:te' },
  ml: { hl: 'ml', gl: 'IN', ceid: 'IN:ml' },
  es: { hl: 'es', gl: 'ES', ceid: 'ES:es' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  pt: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
  ja: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  zh: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
  ar: { hl: 'ar', gl: 'EG', ceid: 'EG:ar' },
  it: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
  ru: { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
  ko: { hl: 'ko', gl: 'KR', ceid: 'KR:ko' },
};

const COUNTRY_TO_GL = {
  in: 'IN', us: 'US', gb: 'GB', ca: 'CA', au: 'AU',
  de: 'DE', fr: 'FR', jp: 'JP', br: 'BR', mx: 'MX',
  es: 'ES', it: 'IT', ru: 'RU', kr: 'KR', eg: 'EG',
};

async function fetchGoogleRss({ category = 'general', lang = 'en', country, q, page = 1, pageSize = 20 } = {}) {
  const locale = LANG_TO_CEID[lang] || LANG_TO_CEID.en;
  let gl = locale.gl;
  if (country && COUNTRY_TO_GL[country.toLowerCase()]) {
    gl = COUNTRY_TO_GL[country.toLowerCase()];
  }

  let rssUrl;
  if (q && q.trim()) {
    rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
  } else if (category === 'general') {
    rssUrl = `https://news.google.com/rss?hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
  } else {
    const topic = GOOGLE_NEWS_CATEGORIES[category] || 'WORLD';
    rssUrl = `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
  }

  try {
    const xml = await fetchText(rssUrl, { timeout: 7000 });
    const all = parseFeed(xml, { apiSource: 'google-rss' });
    const start = Math.max(0, (page - 1) * pageSize);
    return all.slice(start, start + pageSize);
  } catch {
    return [];
  }
}

module.exports = { fetchGoogleRss, LANG_TO_CEID, COUNTRY_TO_GL };
