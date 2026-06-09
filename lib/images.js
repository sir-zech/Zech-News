// Thumbnail handling: free CDN proxy (wsrv.nl), favicon fallback, og:image scraping.

const { fetchWithTimeout } = require('./http');
const { caches } = require('./cache');
const { hostOf, pMap } = require('./util');

// Route every thumbnail through the free wsrv.nl CDN: global cache, resize,
// WebP conversion, and fixes http/hotlink/mixed-content issues.
function proxyImage(url, w = 400) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('https://wsrv.nl/')) return url;
  const clean = url.replace(/^http:\/\//i, 'https://').replace(/&amp;/g, '&');
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=${w}&output=webp&q=72&we&il`;
}

function faviconFor(url, size = 64) {
  const host = hostOf(url);
  if (!host) return '';
  return `https://www.google.com/s2/favicons?domain=${host}&sz=${size}`;
}

const OG_PATTERNS = [
  /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+?)["']/i,
  /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+?)["']/i,
  /<meta[^>]*content=["']([^"']+?)["'][^>]*property=["']og:image["']/i,
  /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+?)["']/i,
  /<meta[^>]*content=["']([^"']+?)["'][^>]*name=["']twitter:image["']/i,
  /<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+?)["']/i,
];

// Fetch just the first ~20KB of a page and read its social image. Cached 24h.
async function extractOgImage(url) {
  if (!url) return '';
  const cached = caches.image.get(url);
  if (cached !== null) return cached;
  try {
    const res = await fetchWithTimeout(url, {
      timeout: 4500,
      headers: { Accept: 'text/html', Range: 'bytes=0-20000' },
    });
    if (!res.ok) return caches.image.set(url, '');
    let html = await res.text();
    if (html.length > 25000) html = html.slice(0, 25000);
    for (const re of OG_PATTERNS) {
      const m = html.match(re);
      if (m && m[1] && /^https?:\/\//i.test(m[1])) {
        return caches.image.set(url, m[1].replace(/&amp;/g, '&'));
      }
    }
    return caches.image.set(url, '');
  } catch {
    return caches.image.set(url, '');
  }
}

// For feed items missing an image, scrape og:image (bounded, capped, cached).
async function enrichImages(articles, { concurrency = 6, limit = 14 } = {}) {
  const need = articles.filter((a) => a && !a.image).slice(0, limit);
  await pMap(
    need,
    async (a) => {
      a.image = await extractOgImage(a.url);
    },
    concurrency
  );
  return articles;
}

module.exports = { proxyImage, faviconFor, extractOgImage, enrichImages };
