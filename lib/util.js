// Small shared utilities: HTML/XML decoding, normalization, dedupe, concurrency.

function decodeEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function stripHtml(str = '') {
  return decodeEntities(String(str).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function hostOf(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normTitle(t = '') {
  return String(t)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toIso(d) {
  if (!d) return new Date().toISOString();
  const t = new Date(d);
  return isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
}

// Normalize any source object into the app's Article shape.
function normalizeArticle(a = {}) {
  return {
    title: stripHtml(a.title || ''),
    description: (a.description || '').toString().slice(0, 400),
    content: a.content || a.description || '',
    url: a.url || '',
    image: a.image || '',
    publishedAt: toIso(a.publishedAt),
    source: {
      name: (a.source && a.source.name) || a.sourceName || 'News',
      url: (a.source && a.source.url) || a.url || '',
    },
    apiSource: a.apiSource || 'rss',
    // optional extras (preserved when present)
    ...(a.fullBody ? { fullBody: a.fullBody } : {}),
  };
}

// Dedupe by URL, then by normalized title. Keeps the first (highest-priority) seen.
function dedupe(articles) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const a of articles) {
    if (!a || !a.title || !a.url) continue;
    const u = a.url.split('?')[0];
    const t = normTitle(a.title);
    if (seenUrl.has(u) || (t && seenTitle.has(t))) continue;
    seenUrl.add(u);
    if (t) seenTitle.add(t);
    out.push(a);
  }
  return out;
}

// Bounded-concurrency map. Order preserved; failures resolve to null.
async function pMap(items, mapper, concurrency = 6) {
  const results = new Array(items.length);
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await mapper(items[idx], idx);
      } catch {
        results[idx] = null;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, run)
  );
  return results;
}

// Settle an array of promises, dropping rejections/empties; flattens arrays.
async function settleArticles(promises) {
  const settled = await Promise.allSettled(promises);
  const out = [];
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value) {
      const v = Array.isArray(s.value) ? s.value : s.value.articles || [];
      for (const a of v) out.push(a);
    }
  }
  return out;
}

module.exports = {
  decodeEntities,
  stripHtml,
  hostOf,
  normTitle,
  toIso,
  normalizeArticle,
  dedupe,
  pMap,
  settleArticles,
};
