// Full-power, ad-free article reader.
// Strategy ladder (first success wins): provided full body -> resolve real URL ->
// Readability (bot UA) -> AMP -> Readability (browser UA) -> archive.org -> Jina Reader.
// Output keeps the ExtractedArticle shape the frontend already expects, plus extras.

const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { fetchWithTimeout } = require('./http');
const { caches } = require('./cache');
const { decodeGoogleNewsUrl } = require('./googleNewsUrl');
const { hostOf } = require('./util');

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const EMPTY = {
  title: '', description: '', image: '', content: 'Could not extract article content.',
  paragraphs: [], images: [], byline: '', wordCount: 0, extracted: false,
};

const JUNK =
  /\b(subscribe|sign up|newsletter|advertisement|sponsored|cookie|accept all cookies|read more|related (articles|stories)|follow us|terms of service|privacy policy|all rights reserved|©)\b/i;

async function extractArticle(rawUrl, { fullBody } = {}) {
  if (!rawUrl) return EMPTY;
  const cacheKey = 'ex:' + rawUrl;
  const cached = caches.extract.get(cacheKey);
  if (cached) return cached;

  // 0) Source already gave us the full body (e.g. The Guardian) -> instant.
  if (fullBody && fullBody.length > 200) {
    const res = finalize({ paragraphs: splitText(fullBody), image: '', title: '', byline: '' });
    return caches.extract.set(cacheKey, res);
  }

  // 1) Resolve the real publisher URL (decode Google News redirects).
  let url = rawUrl;
  try {
    url = await decodeGoogleNewsUrl(rawUrl);
  } catch {
    /* keep rawUrl */
  }

  // 2) Readability on the live page (crawler UA first).
  let result = await tryReadability(url, BOT_UA);

  // 2b) AMP version if the page advertised one.
  if (!enough(result) && result && result.ampUrl) {
    const amp = await tryReadability(result.ampUrl, BOT_UA);
    if (enough(amp)) result = amp;
  }
  // 2c) Retry with a real browser UA.
  if (!enough(result)) {
    const r = await tryReadability(url, BROWSER_UA);
    if (enough(r)) result = r;
  }
  // 3) archive.org snapshot (paywall / anti-bot fallback).
  if (!enough(result)) {
    const r = await tryReadability(`https://web.archive.org/web/2/${url}`, BROWSER_UA);
    if (enough(r)) result = r;
  }
  // 4) Jina Reader — clean markdown of almost any page.
  if (!enough(result)) {
    const r = await tryJina(url);
    if (enough(r)) result = r;
  }

  if (!result || !result.paragraphs || result.paragraphs.length === 0) {
    return caches.extract.set(cacheKey, EMPTY, 120000); // short TTL so we retry later
  }
  const finalRes = finalize(result);
  return caches.extract.set(cacheKey, finalRes, finalRes.extracted ? 3600000 : 120000);
}

async function tryReadability(url, ua) {
  try {
    const res = await fetchWithTimeout(url, {
      timeout: 8000,
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml',
        Referer: 'https://news.google.com/',
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    let html = await res.text();
    if (html.length > 1500000) html = html.slice(0, 1500000);

    const ampUrl = absolutize(
      url,
      (html.match(/<link[^>]+rel=["']amphtml["'][^>]+href=["']([^"']+)["']/i) || [])[1]
    );

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const ogImage = meta(doc, 'og:image') || meta(doc, 'twitter:image') || '';
    const ogTitle = meta(doc, 'og:title') || (doc.querySelector('title') || {}).textContent || '';

    const parsed = new Readability(doc, { keepClasses: false }).parse();
    if (!parsed || !parsed.content) {
      return { ampUrl, paragraphs: [], images: [], title: ogTitle, byline: '', image: ogImage };
    }

    const contentDoc = new JSDOM(parsed.content, { url }).window.document;
    const { paragraphs, images } = collect(contentDoc, url);

    return {
      title: parsed.title || ogTitle || '',
      byline: parsed.byline || '',
      image: ogImage || images[0] || '',
      paragraphs: sanitize(paragraphs),
      images,
      ampUrl,
    };
  } catch {
    return null;
  }
}

async function tryJina(url) {
  try {
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
      timeout: 9000,
      headers: { Accept: 'text/plain', 'X-Return-Format': 'text' },
    });
    if (!res.ok) return null;
    let md = await res.text();
    md = md
      .replace(/^Title:.*$/m, '')
      .replace(/^URL Source:.*$/m, '')
      .replace(/^Published Time:.*$/m, '')
      .replace(/^Markdown Content:/m, '');
    const paragraphs = sanitize(
      md
        .split(/\n{2,}/)
        .map((s) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#>*_`|-]{1,}/g, ' ').replace(/\s+/g, ' ').trim())
    );
    return { title: '', byline: '', image: '', paragraphs, images: [] };
  } catch {
    return null;
  }
}

function collect(doc, baseUrl) {
  const paragraphs = [];
  const images = [];
  doc.querySelectorAll('p, h2, h3, h4, li, blockquote, figcaption, img').forEach((n) => {
    if (n.tagName === 'IMG') {
      const src = absolutize(baseUrl, n.getAttribute('src') || n.getAttribute('data-src') || '');
      if (src && /^https?:/i.test(src)) images.push(src);
      return;
    }
    const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > 40) paragraphs.push(text);
  });
  return { paragraphs, images: [...new Set(images)] };
}

function sanitize(paragraphs) {
  const seen = new Set();
  const out = [];
  for (const p of paragraphs) {
    if (!p || p.length < 40) continue;
    if (JUNK.test(p) && p.length < 180) continue;
    const k = p.slice(0, 80).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function splitText(text) {
  return sanitize(text.split(/\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
}

function finalize(r) {
  const paragraphs = (r.paragraphs || []).slice(0, 140);
  const content = paragraphs.join('\n\n');
  return {
    title: r.title || '',
    description: paragraphs[0] ? paragraphs[0].slice(0, 300) : '',
    image: r.image || '',
    content: content || 'Could not extract article content.',
    paragraphs,
    images: (r.images || []).slice(0, 12),
    byline: r.byline || '',
    wordCount: content ? content.split(/\s+/).length : 0,
    extracted: paragraphs.length > 0,
  };
}

function enough(r) {
  return !!(r && r.paragraphs && r.paragraphs.join(' ').length > 600);
}

function meta(doc, name) {
  const el =
    doc.querySelector(`meta[property="${name}"]`) || doc.querySelector(`meta[name="${name}"]`);
  return (el && el.getAttribute('content')) || '';
}

function absolutize(base, href) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return '';
  }
}

module.exports = { extractArticle };
