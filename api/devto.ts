// Vercel function — Dev.to (fallback host).
const { fetchDevTo } = require('../lib/sources/devto');

module.exports = async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const { limit = '6', tag } = req.query;
    const articles = await fetchDevTo({ limit, tag });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });
  } catch (err) {
    console.error('devto error:', err);
    const details = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Dev.to fetch failed', details });
  }
};
