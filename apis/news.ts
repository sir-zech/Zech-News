export default async function handler(req, res) {
  try {
    const { category = 'general', q } = req.query;

    const API_KEY = process.env.GNEWS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API KEY MISSING" });
    }

    let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=en&max=12`;

    if (q) {
      url = `https://gnews.io/api/v4/search?q=${q}&token=${API_KEY}&lang=en&max=12`;
    } else {
      url += `&category=${category}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}