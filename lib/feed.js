// Aggregated, paginated, deduped feed across all sources.
// Endless-"related" behaviour: deeper pages rotate to adjacent categories so
// the scroll never dead-ends (mirrors Google News / Microsoft Start).

const { caches } = require('./cache');
const { dedupe, normalizeArticle, settleArticles } = require('./util');
const { enrichImages } = require('./images');
const { fetchGuardian } = require('./sources/guardian');
const { fetchNewsData } = require('./sources/newsdata');
const { fetchGNews } = require('./sources/gnews');
const { fetchGoogleRss } = require('./sources/googleRss');
const { fetchRssFeeds } = require('./sources/rssFeeds');

const PAGE_SIZE = 15;
const MAX_PAGE = 30;
const SEG = 3; // pages per category segment before rotating

const ADJACENT = {
  general: ['world', 'business', 'technology', 'science'],
  world: ['general', 'business', 'nation', 'health'],
  business: ['technology', 'world', 'science', 'general'],
  technology: ['science', 'business', 'general', 'world'],
  science: ['technology', 'health', 'world', 'general'],
  health: ['science', 'general', 'world', 'business'],
  sports: ['general', 'world', 'entertainment', 'business'],
  entertainment: ['general', 'sports', 'world', 'technology'],
  nation: ['world', 'general', 'business', 'technology'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Premium sources (real images + full body) lead the rotation so they're never
// buried by high-frequency RSS. Round-robin across sources, recency within each.
const SOURCE_PRIORITY = ['guardian', 'newsdata', 'gnews', 'spaceflight', 'rss', 'google-rss'];

function interleaveBySource(articles) {
  const groups = new Map();
  for (const a of articles) {
    const k = a.apiSource || 'other';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  }
  for (const g of groups.values()) {
    g.sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));
  }
  const keys = [...groups.keys()].sort((a, b) => {
    const ia = SOURCE_PRIORITY.indexOf(a);
    const ib = SOURCE_PRIORITY.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const k of keys) {
      const g = groups.get(k);
      if (g && g.length) {
        out.push(g.shift());
        added = true;
      }
    }
  }
  return out;
}

async function getFeed({ category = 'general', lang = 'en', country, q, page = 1 } = {}) {
  page = Math.max(1, parseInt(page) || 1);
  const key = `feed:${category}:${lang}:${country || ''}:${q || ''}:${page}`;
  const cached = caches.feed.get(key);
  if (cached) return cached;

  const isEn = (lang || 'en').startsWith('en');

  // Browse mode paginates in category "segments": every SEG pages we rotate to an
  // adjacent category AND reset the per-source page index, so each segment pulls
  // fresh RSS + Google-RSS slices + Guardian/NewsData pages. Search mode (q) just
  // paginates the same query continuously.
  let cat = category;
  let localPage = page;
  if (!q) {
    const segment = Math.floor((page - 1) / SEG);
    localPage = ((page - 1) % SEG) + 1;
    if (segment > 0) {
      const adj = ADJACENT[category] || ADJACENT.general;
      cat = adj[(segment - 1) % adj.length];
    }
  }

  const tasks = [];
  if (isEn) {
    // Guardian paginates natively.
    tasks.push(fetchGuardian({ category: cat, q, page: localPage, pageSize: 20 }));
    // Static publisher RSS has no paging — pull it on the first page of each
    // category segment (fresh category) so rotated segments still get real content.
    if (!q && localPage === 1) tasks.push(fetchRssFeeds({ category: cat, perFeed: 10 }));
  }
  tasks.push(fetchNewsData({ category: cat, q, lang, country, page: undefined }).then((r) => r.articles));
  if (localPage <= 2) tasks.push(fetchGNews({ category: cat, q, lang, country, max: 10 }));
  tasks.push(fetchGoogleRss({ category: cat, q, lang, country, page: localPage, pageSize: 20 }));

  let articles = await settleArticles(tasks);
  articles = interleaveBySource(dedupe(articles.map(normalizeArticle)));

  const sliced = articles.slice(0, PAGE_SIZE);

  // Best-effort image enrichment with a soft deadline so we never block too long
  // (matters on Vercel's 10s ceiling; Render has the time to spare).
  await Promise.race([enrichImages(sliced, { limit: 12, concurrency: 8 }), sleep(6000)]);

  const result = {
    totalArticles: sliced.length,
    articles: sliced,
    page,
    pageSize: PAGE_SIZE,
    // Stay "open" until the page cap: deeper pages rotate to adjacent categories
    // (so a thin same-category page isn't the end). The client stops on its own
    // after a few consecutive pages with no genuinely-new items.
    hasMore: page < MAX_PAGE,
  };
  caches.feed.set(key, result);
  return result;
}

// Back-compat shape for the legacy /api/news endpoint (headlines / search / local).
async function getNews({ category = 'general', q, lang = 'en', country, max = 10 } = {}) {
  const r = await getFeed({ category, lang, country, q, page: 1 });
  return { totalArticles: r.articles.length, articles: r.articles.slice(0, parseInt(max) || 10) };
}

module.exports = { getFeed, getNews, PAGE_SIZE };
