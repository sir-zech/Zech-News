// Vercel function — full-power article extraction (fallback host).
// Tight budget so it stays under the serverless timeout; Render runs the
// unbounded version. Always returns 200 so the reader UI degrades gracefully.
const { extractArticle } = require('../lib/extract');

const EMPTY = {
  title: '', description: '', image: '', content: 'Could not extract article content.',
  paragraphs: [], images: [], byline: '', wordCount: 0, extracted: false,
};

module.exports = async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const data = await extractArticle(url, { budgetMs: 8500 });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(data);
  } catch (err) {
    console.error('extract error:', err);
    return res.status(200).json(EMPTY); // never break the reader UI
  }
};
