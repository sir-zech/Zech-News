// Vercel function — Reddit (fallback host).
const { fetchReddit } = require('../lib/sources/reddit');

module.exports = async function handler(req, res) {
  try {
    const { limit = '6', sub = 'news' } = req.query;
    const articles = await fetchReddit({ limit, sub });
    if (!articles.length) return res.status(502).json({ error: 'Reddit API unavailable' });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });
  } catch (err) {
    console.error('reddit error:', err);
    return res.status(500).json({ error: 'Reddit fetch failed', details: err.message });
  }
};
