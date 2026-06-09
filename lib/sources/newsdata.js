// NewsData.io (optional free key). Native pagination via nextPage token, images.

const { fetchJson } = require('../http');
const { stripHtml, toIso } = require('../util');

const CAT = {
  general: 'top',
  world: 'world',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'entertainment',
  nation: 'politics',
};

// Returns { articles, nextPage }. nextPage is an opaque token for the next call.
async function fetchNewsData({ category = 'general', q, lang = 'en', country, page } = {}) {
  const key = process.env.NEWSDATA_KEY;
  if (!key) return { articles: [], nextPage: null };

  const params = new URLSearchParams({ apikey: key, language: lang });
  if (q && q.trim()) params.set('q', q);
  else params.set('category', CAT[category] || 'top');
  if (country) params.set('country', country.toLowerCase());
  if (page) params.set('page', page);

  try {
    const data = await fetchJson(`https://newsdata.io/api/1/news?${params}`, { timeout: 7000 });
    const results = data.results || [];
    const articles = results
      .filter((r) => r && r.title && r.link)
      .map((r) => ({
        title: r.title,
        description: stripHtml(r.description || '').slice(0, 400),
        content: r.content || r.description || r.title,
        url: r.link,
        image: r.image_url || '',
        publishedAt: toIso(r.pubDate),
        source: { name: r.source_id || 'NewsData', url: r.source_url || r.link },
        apiSource: 'newsdata',
      }));
    return { articles, nextPage: data.nextPage || null };
  } catch {
    return { articles: [], nextPage: null };
  }
}

module.exports = { fetchNewsData };
