// Vercel function — Spaceflight News (fallback host).
const { fetchSpace } = require('../lib/sources/space');

module.exports = async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const { limit = '6' } = req.query;
    const articles = await fetchSpace({ limit });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ totalArticles: articles.length, articles });
  } catch (err) {
    console.error('space error:', err);
    const details = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Space news fetch failed', details });
  }
};
