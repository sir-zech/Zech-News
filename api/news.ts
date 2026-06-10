// Vercel function — thin wrapper over the shared lib/. Acts as the fallback host.
const { getNews } = require('../lib/feed');

module.exports = async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const { category = 'general', q, lang = 'en', country, max = '10' } = req.query;
    const data = await getNews({ category, q, lang, country, max });
    if (!data.articles || data.articles.length === 0) {
      return res.status(502).json({ error: 'No news sources available' });
    }
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    console.error('news error:', err);
    const details = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Server error', details });
  }
};
