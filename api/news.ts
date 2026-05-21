module.exports = async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY;
    const {
      category = 'general',
      q,
      lang = 'en',
      country,
      max = '10'
    } = req.query;

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY MISSING" });
    }

    let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=${lang}&max=${max}`;

    if (country) url += `&country=${country}`;

    if (q && q.trim()) {
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${API_KEY}&lang=${lang}&max=${max}`;
      if (country) url += `&country=${country}`;
    } else {
      url += `&category=${category}`;
    }

    let data = await fetchGNews(url);

    if (data === 'rate_limit') {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait." });
    }

    if (!data && (country || lang !== 'en')) {
      const fallbackUrl = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&max=${max}&category=${category}`;
      data = await fetchGNews(fallbackUrl);
    }

    if (!data) {
      return res.status(502).json({ error: "GNews API unavailable" });
    }

    if (data.articles) {
      data.articles = data.articles.map(a => ({ ...a, apiSource: 'gnews' }));
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "Server crashed", details: err.message });
  }
};

async function fetchGNews(url) {
  try {
    const response = await fetch(url);
    if (response.status === 429) return 'rate_limit';
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
