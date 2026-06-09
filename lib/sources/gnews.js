// GNews API (optional key). Free tier is tiny — page 1 only, used as a quality source.

const { fetchJson } = require('../http');
const { toIso } = require('../util');

async function fetchGNews({ category = 'general', q, lang = 'en', country, max = 10 } = {}) {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];

  let url;
  if (q && q.trim()) {
    url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${key}&lang=${lang}&max=${max}`;
  } else {
    url = `https://gnews.io/api/v4/top-headlines?token=${key}&lang=${lang}&max=${max}&category=${category}`;
  }
  if (country) url += `&country=${country}`;

  try {
    const data = await fetchJson(url, { timeout: 7000 });
    return (data.articles || []).map((a) => ({
      title: a.title,
      description: a.description || '',
      content: a.content || a.description || '',
      url: a.url,
      image: a.image || '',
      publishedAt: toIso(a.publishedAt),
      source: { name: (a.source && a.source.name) || 'GNews', url: (a.source && a.source.url) || a.url },
      apiSource: 'gnews',
    }));
  } catch {
    return []; // includes 429 rate-limit — degrade silently
  }
}

module.exports = { fetchGNews };
