module.exports = async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY MISSING" });
    }

    const { category = 'general', q } = req.query;

    let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&max=12`;

    if (q) {
      url = `https://gnews.io/api/v4/search?q=${q}&token=${API_KEY}&lang=en&max=12`;
    } else {
      url += `&category=${category}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "GNews API failed",
        status: response.status
      });
    }

    const data = await response.json();

    return res.status(200).json(data);

  } catch (err) {
    console.error("🔥 FUNCTION ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};