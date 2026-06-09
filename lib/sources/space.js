// Spaceflight News API (ported from api/space.ts).

const { fetchJson } = require('../http');
const { toIso } = require('../util');

async function fetchSpace({ limit = 6 } = {}) {
  const count = Math.min(parseInt(limit) || 6, 20);
  try {
    const data = await fetchJson(
      `https://api.spaceflightnewsapi.net/v4/articles/?limit=${count}&ordering=-published_at`,
      { timeout: 6000 }
    );
    return (data.results || []).map((a) => ({
      title: a.title,
      description: a.summary || a.title,
      content: a.summary || a.title,
      url: a.url,
      image: a.image_url || '',
      publishedAt: toIso(a.published_at),
      source: { name: a.news_site || 'Spaceflight News', url: a.url },
      apiSource: 'spaceflight',
    }));
  } catch {
    return [];
  }
}

module.exports = { fetchSpace };
