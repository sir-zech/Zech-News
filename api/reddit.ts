module.exports = async function handler(req, res) {
  try {
    const { category = 'general', limit = '8' } = req.query;
    const count = Math.min(parseInt(limit) || 8, 20);

    const subredditMap = {
      general: 'news',
      world: 'worldnews',
      technology: 'technology',
      business: 'business',
      sports: 'sports',
      science: 'science',
      health: 'health',
      entertainment: 'entertainment'
    };

    const subreddit = subredditMap[category] || 'news';

    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${count + 5}`,
      {
        headers: {
          'User-Agent': 'ZechNews/1.0 (news aggregator)'
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Reddit API error" });
    }

    const data = await response.json();
    const posts = (data?.data?.children || [])
      .map(c => c.data)
      .filter(p => !p.stickied && !p.is_self && p.url && p.title)
      .slice(0, count);

    const articles = posts.map(p => {
      let image = '';
      if (p.thumbnail && p.thumbnail.startsWith('http')) {
        image = p.thumbnail;
      }
      if (p.preview?.images?.[0]?.source?.url) {
        image = p.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      return {
        title: decodeHtml(p.title),
        description: p.selftext
          ? decodeHtml(p.selftext.slice(0, 200))
          : decodeHtml(p.title),
        content: `${decodeHtml(p.title)}. Upvotes: ${p.ups || 0}. Comments: ${p.num_comments || 0}.`,
        url: p.url,
        image,
        publishedAt: new Date((p.created_utc || 0) * 1000).toISOString(),
        source: {
          name: `r/${subreddit}`,
          url: `https://reddit.com${p.permalink}`
        },
        apiSource: 'reddit'
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      totalArticles: articles.length,
      articles
    });

  } catch (err) {
    console.error("Reddit API ERROR:", err);
    return res.status(500).json({ error: "Reddit fetch failed", details: err.message });
  }
};

function decodeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}
