module.exports = async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY MISSING" });
    }

    const { category = 'general', q } = req.query;

    let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&max=12`;

    if (q) {
      if (!q.trim()) {
        return res.status(400).json({ error: "Empty search query" });
      }
      url = `https://gnews.io/api/v4/search?q=${q}&token=${API_KEY}&lang=en&max=12`;
    } else {
      url += `&category=${category}`;
    }

    const response = await fetch(url);

    // ✅ HANDLE RATE LIMIT
    if (response.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait."
      });
    }

    // ✅ HANDLE NON-OK RESPONSE
    if (!response.ok) {
      const text = await response.text(); // 👈 IMPORTANT
      return res.status(response.status).json({
        error: "GNews API error",
        details: text
      });
    }

    // ✅ SAFE JSON PARSE
    let data;
    try {
      data = await response.json();
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON from API"
      });
    }

    // ✅ CACHE (reduces API calls massively)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    return res.status(200).json(data);

  } catch (err) {
    console.error("🔥 FINAL ERROR:", err);

    return res.status(500).json({
      error: "Server crashed",
      details: err.message
    });
  }
};