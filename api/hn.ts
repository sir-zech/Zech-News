// Vercel function — Hacker News (fallback host).
const { fetchHackerNews } = require('../lib/sources/hn');

module.exports = async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const { limit = '6' } = req.query;
    const articles = await fetchHackerNews({ limit });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });
  } catch (err) {
    console.error('hn error:', err);
    const details = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'HN fetch failed', details });
  }
};
