// Vercel function — full-power article extraction (fallback host).
const { extractArticle } = require('../lib/extract');

module.exports = async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const data = await extractArticle(url);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(data);
  } catch (err) {
    console.error('extract error:', err);
    return res.status(500).json({ error: 'Extraction failed', details: err.message });
  }
};
