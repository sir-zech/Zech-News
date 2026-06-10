// Vercel function — Reddit (fallback host).
const { fetchReddit } = require('../lib/sources/reddit');

module.exports = async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const { limit = '6', sub = 'news' } = req.query;
    const articles = await fetchReddit({ limit, sub });
    // Reddit often blocks datacenter IPs — degrade to an empty section, not a 502.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });
  } catch (err) {
    console.error('reddit error:', err);
    return res.status(200).json({ totalArticles: 0, articles: [] });
  }
};
