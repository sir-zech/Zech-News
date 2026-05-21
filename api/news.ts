const GOOGLE_NEWS_CATEGORIES = {
  general: 'WORLD',
  business: 'BUSINESS',
  technology: 'TECHNOLOGY',
  science: 'SCIENCE',
  health: 'HEALTH',
  sports: 'SPORTS',
  entertainment: 'ENTERTAINMENT',
  world: 'WORLD',
  nation: 'NATION'
};

const LANG_TO_CEID = {
  en: { hl: 'en', gl: 'US', ceid: 'US:en' },
  hi: { hl: 'hi', gl: 'IN', ceid: 'IN:hi' },
  ta: { hl: 'ta', gl: 'IN', ceid: 'IN:ta' },
  te: { hl: 'te', gl: 'IN', ceid: 'IN:te' },
  ml: { hl: 'ml', gl: 'IN', ceid: 'IN:ml' },
  es: { hl: 'es', gl: 'ES', ceid: 'ES:es' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  pt: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
  ja: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  zh: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
  ar: { hl: 'ar', gl: 'EG', ceid: 'EG:ar' },
  it: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
  ru: { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
  ko: { hl: 'ko', gl: 'KR', ceid: 'KR:ko' }
};

const COUNTRY_TO_GL = {
  in: 'IN', us: 'US', gb: 'GB', ca: 'CA', au: 'AU',
  de: 'DE', fr: 'FR', jp: 'JP', br: 'BR', mx: 'MX',
  es: 'ES', it: 'IT', ru: 'RU', kr: 'KR', eg: 'EG'
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

    const count = parseInt(max) || 10;
    let data = null;

    if (API_KEY) {
      let url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&lang=${lang}&max=${max}`;
      if (country) url += `&country=${country}`;

      if (q && q.trim()) {
        url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${API_KEY}&lang=${lang}&max=${max}`;
        if (country) url += `&country=${country}`;
      } else {
        url += `&category=${category}`;
      }

      data = await fetchGNews(url);

      if (data === 'rate_limit') {
        console.log("GNews rate limited, falling back to Google News RSS");
        data = null;
      }
    }

    if (!data) {
      data = await fetchGoogleNewsRSS(category, lang, country, count, q);
    }

    if (!data || !data.articles || data.articles.length === 0) {
      return res.status(502).json({ error: "No news sources available" });
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
    if (!response.ok) {
      console.log(`GNews returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data.articles) {
      data.articles = data.articles.map(a => ({ ...a, apiSource: 'gnews' }));
    }
    return data;
  } catch (err) {
    console.log("GNews fetch error:", err.message);
    return null;
  }
}

async function fetchGoogleNewsRSS(category, lang, country, count, query) {
  try {
    const locale = LANG_TO_CEID[lang] || LANG_TO_CEID.en;
    let gl = locale.gl;
    if (country && COUNTRY_TO_GL[country.toLowerCase()]) {
      gl = COUNTRY_TO_GL[country.toLowerCase()];
    }

    let rssUrl;
    if (query && query.trim()) {
      rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
    } else {
      const topic = GOOGLE_NEWS_CATEGORIES[category] || 'WORLD';
      if (category === 'general') {
        rssUrl = `https://news.google.com/rss?hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
      } else {
        rssUrl = `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${locale.hl}&gl=${gl}&ceid=${gl}:${locale.hl}`;
      }
    }

    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZechNews/2.0)' }
    });

    if (!response.ok) {
      console.log(`Google News RSS returned ${response.status}`);
      return null;
    }

    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const articles = items.slice(0, count).map(item => {
      const title = decodeXml((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
      const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
      const source = decodeXml((item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'Google News');
      const sourceUrl = (item.match(/<source[^>]*url="([^"]*)"/) || [])[1] || '';
      const description = decodeXml((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || title);

      return {
        title,
        description: description.replace(/<[^>]+>/g, '').slice(0, 300),
        content: title,
        url: link,
        image: '',
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: { name: source, url: sourceUrl || link },
        apiSource: 'google-rss'
      };
    });

    return { totalArticles: articles.length, articles };
  } catch (err) {
    console.log("Google News RSS error:", err.message);
    return null;
  }
}

function decodeXml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}
