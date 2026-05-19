module.exports = async function handler(req, res) {
  try {
    const { limit = '6' } = req.query;
    const count = Math.min(parseInt(limit) || 6, 15);

    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!idsRes.ok) {
      return res.status(502).json({ error: "HN API unavailable" });
    }

    const ids = await idsRes.json();
    const topIds = ids.slice(0, count);

    const stories = await Promise.all(
      topIds.map(async (id) => {
        try {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return await r.json();
        } catch {
          return null;
        }
      })
    );

    const articles = stories
      .filter(s => s && s.title && s.url)
      .map(s => ({
        title: s.title,
        description: s.title,
        content: `${s.title}. Score: ${s.score || 0}. Comments: ${s.descendants || 0}.`,
        url: s.url,
        image: '',
        publishedAt: new Date((s.time || 0) * 1000).toISOString(),
        source: { name: 'Hacker News', url: 'https://news.ycombinator.com' },
        apiSource: 'hackernews'
      }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      totalArticles: articles.length,
      articles
    });

  } catch (err) {
    console.error("HN API ERROR:", err);
    return res.status(500).json({ error: "HN fetch failed", details: err.message });
  }
};
