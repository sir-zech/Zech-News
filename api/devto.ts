module.exports = async function handler(req, res) {
  try {
    const { limit = '6', tag } = req.query;
    const count = Math.min(parseInt(limit) || 6, 20);

    let url = `https://dev.to/api/articles?per_page=${count}&top=1`;
    if (tag) {
      url = `https://dev.to/api/articles?per_page=${count}&tag=${encodeURIComponent(tag)}&top=1`;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'ZechNews/1.0' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Dev.to API error" });
    }

    const posts = await response.json();

    const articles = (posts || []).map(p => ({
      title: p.title || '',
      description: p.description || p.title || '',
      content: p.description || p.title || '',
      url: p.url || p.canonical_url || '',
      image: p.cover_image || p.social_image || '',
      publishedAt: p.published_at || new Date().toISOString(),
      source: {
        name: p.user?.name ? `${p.user.name} on Dev.to` : 'Dev.to',
        url: p.url || 'https://dev.to'
      },
      apiSource: 'devto'
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      totalArticles: articles.length,
      articles
    });

  } catch (err) {
    console.error("Dev.to API ERROR:", err);
    return res.status(500).json({ error: "Dev.to fetch failed", details: err.message });
  }
};
