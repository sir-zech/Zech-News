const REDDIT_MAP = {
  general: 'news',
  world: 'worldnews',
  technology: 'technology',
  business: 'business',
  sports: 'sports',
  science: 'science',
  health: 'health'
};

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

    // Try GNews first if key exists
    if (API_KEY) {
      try {
        const gnewsResult = await fetchGNews(API_KEY, { category, q, lang, country, max });
        if (gnewsResult) {
          res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
          return res.status(200).json(gnewsResult);
        }
      } catch (err) {
        console.log("GNews failed, falling back:", err.status || err.message);
        if (err.status === 429) {
          // Rate limited — fall through to Reddit
        } else if (err.status && err.status < 500) {
          return res.status(err.status).json({ error: err.message });
        }
        // 5xx or network errors — fall through
      }
    }

    // Fallback: Reddit (free, no key)
    try {
      const redditResult = await fetchReddit(category, q, parseInt(max) || 10);
      if (redditResult.articles.length > 0) {
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(redditResult);
      }
    } catch (err) {
      console.log("Reddit fallback failed:", err.message);
    }

    return res.status(503).json({ error: "All news sources unavailable" });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "Server crashed", details: err.message });
  }
};

async function fetchGNews(apiKey, { category, q, lang, country, max }) {
  let url = `https://gnews.io/api/v4/top-headlines?token=${apiKey}&lang=${lang}&max=${max}`;

  if (country) url += `&country=${country}`;

  if (q && q.trim()) {
    url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${apiKey}&lang=${lang}&max=${max}`;
    if (country) url += `&country=${country}`;
  } else {
    url += `&category=${category}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    const err = new Error("GNews error");
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (data.articles) {
    data.articles = data.articles.map(a => ({ ...a, apiSource: 'gnews' }));
  }

  return data;
}

async function fetchReddit(category, query, limit) {
  const subreddit = REDDIT_MAP[category] || 'news';
  let url;

  if (query && query.trim()) {
    url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&limit=${limit + 5}&sort=relevance&t=week`;
  } else {
    url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit + 5}`;
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ZechNews/1.0 (news aggregator)' }
  });

  if (!response.ok) throw new Error("Reddit error");

  const data = await response.json();
  const posts = (data?.data?.children || [])
    .map(c => c.data)
    .filter(p => !p.stickied && p.title)
    .slice(0, limit);

  const articles = posts.map(p => {
    let image = '';
    if (p.preview?.images?.[0]?.source?.url) {
      image = p.preview.images[0].source.url.replace(/&amp;/g, '&');
    } else if (p.thumbnail && p.thumbnail.startsWith('http')) {
      image = p.thumbnail;
    }

    const title = decodeHtml(p.title);
    return {
      title,
      description: p.selftext ? decodeHtml(p.selftext.slice(0, 200)) : title,
      content: `${title}. Upvotes: ${p.ups || 0}. Comments: ${p.num_comments || 0}.`,
      url: p.is_self ? `https://reddit.com${p.permalink}` : (p.url || `https://reddit.com${p.permalink}`),
      image,
      publishedAt: new Date((p.created_utc || 0) * 1000).toISOString(),
      source: { name: `r/${subreddit}`, url: `https://reddit.com${p.permalink}` },
      apiSource: 'reddit'
    };
  });

  return { totalArticles: articles.length, articles };
}

function decodeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'");
}
