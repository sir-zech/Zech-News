// Render Express server — the PRIMARY backend.
// Always-warm process => persistent in-memory cache + no per-request timeout,
// which is exactly what makes it "more powerful" than the Vercel functions.
// Imports the same shared lib/ as the Vercel wrappers (single source of truth).

try {
  require('dotenv').config();
} catch {
  /* dotenv optional — Render injects env vars directly */
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');

const { getFeed, getNews } = require('../lib/feed');
const { extractArticle } = require('../lib/extract');
const { enrichImages } = require('../lib/images');
const { fetchHackerNews } = require('../lib/sources/hn');
const { fetchReddit } = require('../lib/sources/reddit');
const { fetchDevTo } = require('../lib/sources/devto');
const { fetchSpace } = require('../lib/sources/space');
const { caches } = require('../lib/cache');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED = process.env.ALLOWED_ORIGIN; // comma-separated; unset => allow all

app.use(compression());
app.use(
  cors({ origin: ALLOWED ? ALLOWED.split(',').map((s) => s.trim()) : true })
);
app.use(express.json({ limit: '256kb' }));

function cache(res, sMax, swr) {
  res.setHeader(
    'Cache-Control',
    `public, max-age=60, s-maxage=${sMax}, stale-while-revalidate=${swr}`
  );
}

const list = (a) => ({ totalArticles: a.length, articles: a });

app.get('/health', (req, res) =>
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    cache: { feed: caches.feed.size, extract: caches.extract.size, image: caches.image.size },
  })
);

app.get('/api/feed', async (req, res) => {
  try {
    cache(res, 120, 300);
    res.json(await getFeed(req.query));
  } catch (e) {
    res.status(500).json({ error: 'Feed failed', details: e.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const data = await getNews(req.query);
    if (!data.articles.length) return res.status(502).json({ error: 'No news sources available' });
    cache(res, 120, 300);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

app.get('/api/extract', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    cache(res, 3600, 7200);
    res.json(await extractArticle(url));
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed', details: e.message });
  }
});

app.get('/api/hn', async (req, res) => {
  try {
    cache(res, 300, 600);
    res.json(list(await fetchHackerNews(req.query)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/reddit', async (req, res) => {
  try {
    cache(res, 300, 600);
    res.json(list(await fetchReddit(req.query)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/devto', async (req, res) => {
  try {
    cache(res, 300, 600);
    res.json(list(await fetchDevTo(req.query)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/space', async (req, res) => {
  try {
    cache(res, 600, 1200);
    res.json(list(await fetchSpace(req.query)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Batch thumbnail enrichment: POST { articles:[{url,image?}] } -> filled images.
app.post('/api/enrich', async (req, res) => {
  try {
    const articles = Array.isArray(req.body && req.body.articles) ? req.body.articles : [];
    await enrichImages(articles, { limit: 24, concurrency: 8 });
    res.json({ articles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) =>
  res.json({
    service: 'zech-news-api',
    endpoints: ['/health', '/api/feed', '/api/news', '/api/extract', '/api/hn', '/api/reddit', '/api/devto', '/api/space'],
  })
);

// Keep the in-memory cache warm while the process is awake (does not by itself
// prevent Render's idle sleep — an external pinger handles that; see DEPLOY.md).
const PREWARM = ['general', 'technology', 'world', 'business'];
async function prewarm() {
  for (const c of PREWARM) {
    try {
      await getFeed({ category: c, lang: 'en', page: 1 });
    } catch {
      /* ignore */
    }
  }
}

app.listen(PORT, () => {
  console.log(`Zech News API listening on :${PORT}`);
  if (process.env.PREWARM !== '0') {
    prewarm();
    setInterval(prewarm, 9 * 60 * 1000);
  }
});
