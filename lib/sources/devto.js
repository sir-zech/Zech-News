// Dev.to top articles (ported from api/devto.ts).

const { fetchJson } = require('../http');
const { toIso } = require('../util');

async function fetchDevTo({ limit = 6, tag } = {}) {
  const count = Math.min(parseInt(limit) || 6, 20);
  let url = `https://dev.to/api/articles?per_page=${count}&top=1`;
  if (tag) url = `https://dev.to/api/articles?per_page=${count}&tag=${encodeURIComponent(tag)}&top=1`;

  try {
    const posts = await fetchJson(url, { timeout: 6000, headers: { 'User-Agent': 'ZechNews/3.0' } });
    return (posts || []).map((p) => ({
      title: p.title || '',
      description: p.description || p.title || '',
      content: p.description || p.title || '',
      url: p.url || p.canonical_url || '',
      image: p.cover_image || p.social_image || '',
      publishedAt: toIso(p.published_at),
      source: { name: p.user && p.user.name ? `${p.user.name} on Dev.to` : 'Dev.to', url: p.url || 'https://dev.to' },
      apiSource: 'devto',
    }));
  } catch {
    return [];
  }
}

module.exports = { fetchDevTo };
