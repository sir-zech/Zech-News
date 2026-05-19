module.exports = async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY MISSING" });
    }

    const {
      category = 'general',
      q,
      lang = 'en',
      country,
      max = '10'
    } = req.query;

    let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=${lang}&max=${max}`;

    if (country) {
      url += `&country=${country}`;
    }

    if (q) {
      if (!q.trim()) {
        return res.status(400).json({ error: "Empty search query" });
      }
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${API_KEY}&lang=${lang}&max=${max}`;
      if (country) {
        url += `&country=${country}`;
      }
    } else {
      url += `&category=${category}`;
    }

    const response = await fetch(url);

    if (response.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait."
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "GNews API error",
        details: text
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from API"
      });
    }

    if (data.articles) {
      data.articles = data.articles.map(a => ({ ...a, apiSource: 'gnews' }));
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "Server crashed",
      details: err.message
    });
  }
};
