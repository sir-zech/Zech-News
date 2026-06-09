// Vercel function — paginated aggregated feed (fallback host).
const { getFeed } = require('../lib/feed');

module.exports = async function handler(req, res) {
  try {
    const { category = 'general', q, lang = 'en', country, page = '1' } = req.query;
    const data = await getFeed({ category, q, lang, country, page });
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    console.error('feed error:', err);
    return res.status(500).json({ error: 'Feed failed', details: err.message });
  }
};
