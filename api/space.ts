module.exports = async function handler(req, res) {
  try {
    const { limit = '6' } = req.query;
    const count = Math.min(parseInt(limit) || 6, 20);

    const response = await fetch(
      `https://api.spaceflightnewsapi.net/v4/articles/?limit=${count}&ordering=-published_at`
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Spaceflight News API error" });
    }

    const data = await response.json();

    const articles = (data.results || []).map(a => ({
      title: a.title,
      description: a.summary || a.title,
      content: a.summary || a.title,
      url: a.url,
      image: a.image_url || '',
      publishedAt: a.published_at || new Date().toISOString(),
      source: {
        name: a.news_site || 'Spaceflight News',
        url: a.url
      },
      apiSource: 'spaceflight'
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      totalArticles: articles.length,
      articles
    });

  } catch (err) {
    console.error("Space News API ERROR:", err);
    return res.status(500).json({ error: "Space news fetch failed", details: err.message });
  }
};
