module.exports = async function handler(req, res) {
  try {
    const { limit = '6', sub = 'news' } = req.query;
    const count = Math.min(parseInt(limit) || 6, 20);
    const subreddit = encodeURIComponent(sub);

    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${count + 4}&raw_json=1`,
      {
        headers: {
          'User-Agent': 'ZechNews/2.0 (web:zechnews:v2.0)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Reddit API unavailable' });
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    const articles = posts
      .filter(p => !p.data.stickied && !p.data.is_self && p.data.url)
      .slice(0, count)
      .map(p => ({
        title: p.data.title || '',
        description: p.data.selftext?.slice(0, 300) || p.data.title || '',
        content: p.data.selftext || p.data.title || '',
        url: p.data.url || `https://reddit.com${p.data.permalink}`,
        image: extractImage(p.data),
        publishedAt: new Date((p.data.created_utc || 0) * 1000).toISOString(),
        source: {
          name: `r/${p.data.subreddit}`,
          url: `https://reddit.com/r/${p.data.subreddit}`
        },
        apiSource: 'reddit'
      }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });

  } catch (err) {
    console.error("Reddit API ERROR:", err);
    return res.status(500).json({ error: "Reddit fetch failed", details: err.message });
  }
};

function extractImage(data) {
  if (data.preview && data.preview.images && data.preview.images[0]) {
    const src = data.preview.images[0].source;
    if (src && src.url) return src.url.replace(/&amp;/g, '&');
  }
  if (data.thumbnail && data.thumbnail.startsWith('http')) {
    return data.thumbnail;
  }
  return '';
}
