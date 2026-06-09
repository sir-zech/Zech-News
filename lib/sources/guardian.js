// The Guardian Open Platform (optional free key). Native pagination, real images,
// and the FULL article body via show-fields=bodyText -> instant extraction.

const { fetchJson } = require('../http');
const { stripHtml, toIso } = require('../util');

const SECTION = {
  general: '',
  world: 'world',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'society',
  sports: 'sport',
  entertainment: 'culture',
  nation: 'world',
};

async function fetchGuardian({ category = 'general', q, page = 1, pageSize = 20 } = {}) {
  const key = process.env.GUARDIAN_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    'api-key': key,
    'page-size': String(pageSize),
    page: String(page),
    'show-fields': 'thumbnail,trailText,bodyText,byline',
    // For search, rank by relevance (surfaces older-but-relevant pieces too);
    // for browse, newest first.
    'order-by': q && q.trim() ? 'relevance' : 'newest',
  });
  if (q && q.trim()) params.set('q', q);
  else if (SECTION[category]) params.set('section', SECTION[category]);

  try {
    const data = await fetchJson(`https://content.guardianapis.com/search?${params}`, { timeout: 7000 });
    const results = (data.response && data.response.results) || [];
    return results.map((r) => {
      const f = r.fields || {};
      return {
        title: r.webTitle,
        description: stripHtml(f.trailText || '').slice(0, 400),
        content: f.bodyText || f.trailText || r.webTitle,
        url: r.webUrl,
        image: f.thumbnail || '',
        publishedAt: toIso(r.webPublicationDate),
        source: { name: 'The Guardian', url: r.webUrl },
        apiSource: 'guardian',
        byline: f.byline || '',
        fullBody: f.bodyText || '', // full text — extract.js returns it instantly
      };
    });
  } catch {
    return [];
  }
}

module.exports = { fetchGuardian };
