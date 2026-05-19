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

    const articles = await Promise.all(
      stories
        .filter(s => s && s.title && s.url)
        .map(async (s) => {
          let image = '';
          try {
            const domain = new URL(s.url).hostname;
            image = `https://logo.clearbit.com/${domain}?size=400`;
          } catch {}

          return {
            title: s.title,
            description: s.text
              ? s.text.replace(/<[^>]*>/g, '').slice(0, 200)
              : `${s.title} — Score: ${s.score || 0} | ${s.descendants || 0} comments on Hacker News`,
            content: `${s.title}. Score: ${s.score || 0}. Comments: ${s.descendants || 0}.`,
            url: s.url,
            image,
            publishedAt: new Date((s.time || 0) * 1000).toISOString(),
            source: {
              name: 'Hacker News',
              url: `https://news.ycombinator.com/item?id=${s.id}`
            },
            apiSource: 'hackernews'
          };
        })
    );

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
