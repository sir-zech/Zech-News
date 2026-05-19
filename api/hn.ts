module.exports = async function handler(req, res) {
  try {
    const { limit = '6' } = req.query;
    const count = Math.min(parseInt(limit) || 6, 15);

    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!idsRes.ok) {
      return res.status(502).json({ error: "HN API unavailable" });
    }

    const ids = await idsRes.json();
    const topIds = ids.slice(0, count + 4);

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

    const validStories = stories.filter(s => s && s.title && s.url).slice(0, count);

    const articles = await Promise.all(
      validStories.map(async (s) => {
        const image = await extractOgImage(s.url);

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

async function extractOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZechNews/1.0)',
        'Accept': 'text/html',
        'Range': 'bytes=0-15000'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeout);

    if (!response.ok) return '';

    let html = await response.text();
    if (html.length > 20000) html = html.slice(0, 20000);

    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+?)["']/i,
      /<meta[^>]*content=["']([^"']+?)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+?)["']/i,
      /<meta[^>]*content=["']([^"']+?)["'][^>]*name=["']twitter:image["']/i,
      /<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+?)["']/i,
      /<meta[^>]*content=["']([^"']+?)["'][^>]*name=["']twitter:image:src["']/i,
    ];

    for (const re of patterns) {
      const match = html.match(re);
      if (match && match[1] && match[1].startsWith('http')) {
        return match[1].replace(/&amp;/g, '&');
      }
    }

    return '';
  } catch {
    return '';
  }
}
