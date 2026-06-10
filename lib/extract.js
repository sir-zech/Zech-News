// Full-power, ad-free article reader.
//
// The extraction IS the ad-blocker: we pull only the article's text + images and
// render those, so ads / popups / trackers never reach the reader.
//
// Engines tried (first good result wins), all within an overall time budget so the
// function never exceeds a serverless timeout:
//   provided full body -> @extractus/article-extractor -> Mozilla Readability
//   -> AMP version -> browser-UA retry -> archive.org -> Jina Reader.
// It ALWAYS resolves to a result object (never throws), so the reader UI degrades
// gracefully (summary + "Open original") instead of erroring.

const { JSDOM, VirtualConsole } = require('jsdom');
const { Readability } = require('@mozilla/readability');

// jsdom can't parse much of the modern CSS news sites ship and logs
// "Could not parse CSS stylesheet" for every <style> it chokes on. We only
// extract text + images, so styles are irrelevant — drop that noise but
// keep forwarding genuine jsdom errors.
const quietConsole = new VirtualConsole();
quietConsole.on('jsdomError', (err) => {
  if (!/Could not parse CSS stylesheet/i.test((err && err.message) || '')) {
    console.error(err);
  }
});

function parseDom(html, url) {
  return new JSDOM(html, { url, virtualConsole: quietConsole }).window.document;
}
const { fetchWithTimeout } = require('./http');
const { caches } = require('./cache');
const { decodeGoogleNewsUrl, isGoogleNewsUrl } = require('./googleNewsUrl');
const { cleanWithLLM, llmEnabled, llmMode } = require('./llm');
const { proxyImage } = require('./images');

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// @extractus/article-extractor is ESM-only — load it lazily via dynamic import so
// our CommonJS lib can use it, and treat it as fully optional (guarded).
let _axPromise;
function loadArticleExtractor() {
  if (_axPromise === undefined) {
    _axPromise = import('@extractus/article-extractor').catch(() => null);
  }
  return _axPromise;
}

const EMPTY = {
  title: '', description: '', image: '', content: 'Could not extract article content.',
  html: '', paragraphs: [], images: [], byline: '', wordCount: 0, extracted: false,
};

const JUNK =
  /\b(subscribe|sign up|newsletter|advertisement|sponsored|cookie|accept all cookies|read more|related (articles|stories)|follow us|terms of service|privacy policy|all rights reserved|©)\b/i;

// Live-blog "key events" rail entries: markup like <li><time>3h ago</time>
// <a>Headline</a></li> whose textContent glues into "3h agoHeadline".
// Units are kept case-sensitive and "ago" must be followed by whitespace,
// end-of-line, an uppercase letter, digit, or quote — so real prose such as
// "20m agonising wait" never matches.
const LIVE_STAMP_RE =
  /^\d{1,3} ?(?:s|secs?|m|mins?|h|hrs?|d|days?) ?ago(?=$|\s|[A-Z0-9"'‘“])/;

// Remove rail entries from the content DOM before collecting paragraphs /
// serializing rich HTML. Class-name blocklists can't keep up with every site;
// matching what a rail entry *looks like* (a short node starting with a
// relative timestamp) works everywhere. The length cap keeps a big wrapper
// whose text merely starts with a rail entry from taking the article with it.
// Returns the headline carried by each stamp (keyed like sanitize() keys) so
// bare duplicates of rail headlines elsewhere in the page can be dropped too.
function stripLiveBlogRails(doc) {
  const railKeys = new Set();
  const SCRUB_SEL = 'li, p, h2, h3, h4, blockquote, div, a';
  try {
    doc.querySelectorAll(SCRUB_SEL).forEach((n) => {
      const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length >= 300) return;
      const m = LIVE_STAMP_RE.exec(text);
      if (!m) return;
      const headline = text.slice(m[0].length).trim();
      if (headline.length >= 12) railKeys.add(headline.slice(0, 80).toLowerCase());
      n.remove();
    });
    // Second pass: rails often repeat each headline in a sibling node without
    // the stamp — remove those bare duplicates from the rich HTML as well.
    if (railKeys.size) {
      doc.querySelectorAll(SCRUB_SEL).forEach((n) => {
        const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length < 300 && railKeys.has(text.slice(0, 80).toLowerCase())) n.remove();
      });
    }
  } catch {
    /* best-effort scrub */
  }
  return railKeys;
}

async function extractArticle(rawUrl, { fullBody, budgetMs = 9000 } = {}) {
  if (!rawUrl) return EMPTY;
  const cacheKey = 'ex:' + rawUrl;
  const cached = caches.extract.get(cacheKey);
  if (cached) return cached;

  const deadline = Date.now() + budgetMs;
  const left = () => deadline - Date.now();

  // 0) Source already provided the full body (e.g. The Guardian) -> instant.
  if (fullBody && fullBody.length > 200) {
    const res = finalize({ paragraphs: splitText(fullBody) });
    return caches.extract.set(cacheKey, res);
  }

  // 1) Resolve the real publisher URL (decode Google News redirects).
  let url = rawUrl;
  try {
    if (left() > 3000) url = await decodeGoogleNewsUrl(rawUrl);
  } catch {
    /* keep rawUrl */
  }

  const stillGoogle = isGoogleNewsUrl(url);
  let best = null;

  // Steps 2-4: direct fetch + parse. Skipped when the URL is still a Google News
  // redirect (scraping it returns the related-links cluster, not an article) —
  // Jina (step 5) can follow its JS redirect to the real publisher instead.
  if (!stillGoogle) {
  // 2) Fetch the page once, run both parsers on the same HTML (efficient).
  const page = await fetchHtml(url, BOT_UA, Math.min(8000, left() - 1500));
  if (page && page.html) {
    const ax = await tryArticleExtractor(page.html, url);
    if (enough(ax)) best = ax;
    if (!enough(best)) {
      const rd = readabilityFromHtml(page.html, url);
      if (enough(rd)) best = rd;
      else best = pickBigger(best, rd);
    }
    // 2b) AMP version (ad-light, often full text).
    if (!enough(best) && left() > 3500) {
      const amp = ampUrlFrom(page.html, url);
      if (amp) {
        const ap = await fetchHtml(amp, BOT_UA, Math.min(7000, left() - 1500));
        if (ap && ap.html) {
          const r = (await tryArticleExtractor(ap.html, amp)) || readabilityFromHtml(ap.html, amp);
          if (enough(r)) best = r;
          else best = pickBigger(best, r);
        }
      }
    }
  }

  // 3) Retry with a real browser UA.
  if (!enough(best) && left() > 4000) {
    const p2 = await fetchHtml(url, BROWSER_UA, Math.min(7000, left() - 1500));
    if (p2 && p2.html) {
      const r = (await tryArticleExtractor(p2.html, url)) || readabilityFromHtml(p2.html, url);
      if (enough(r)) best = r;
      else best = pickBigger(best, r);
    }
  }

  // 4) archive.org snapshot (paywall / anti-bot fallback).
  if (!enough(best) && left() > 5000) {
    const pa = await fetchHtml('https://web.archive.org/web/2/' + url, BROWSER_UA, Math.min(8000, left() - 1500));
    if (pa && pa.html) {
      const r = (await tryArticleExtractor(pa.html, url)) || readabilityFromHtml(pa.html, url);
      if (enough(r)) best = r;
      else best = pickBigger(best, r);
    }
  }
  } // end if (!stillGoogle)

  // 5) Jina Reader — clean markdown of almost any page. For an unresolved Google
  // News URL it follows the page's JS redirect to the real publisher.
  if (!enough(best) && left() > 4000) {
    const j = await tryJina(url, Math.min(9000, left() - 800));
    if (enough(j)) best = j;
    else best = pickBigger(best, j);
  }

  // Reject Google News "link soup" (a cluster of related-source links, not an
  // article) so it's never shown as the body.
  if (best && best.paragraphs && best.paragraphs.some((p) => /news\.google\.com/i.test(p))) {
    best = null;
  }
  if (stillGoogle && best && looksLikeLinkSoup(best.paragraphs)) {
    best = null;
  }

  if (!best || !best.paragraphs || best.paragraphs.length === 0) {
    return caches.extract.set(cacheKey, EMPTY, 120000); // short TTL -> retry later
  }

  // Optional LLM cleanup (DeepSeek/OpenAI-compatible). Only when enabled, time
  // remains (Render budget), and either configured 'always' or the extraction
  // looks weak ('rescue'). Good/fast extractions stay untouched.
  if (llmEnabled() && left() > 23000) {
    const weak = !enough(best) || best.paragraphs.length < 6;
    if (llmMode() === 'always' || weak) {
      const cleaned = await cleanWithLLM(best.paragraphs, { title: best.title });
      if (cleaned) best = { ...best, paragraphs: cleaned };
    }
  }

  const res = finalize(best);
  return caches.extract.set(cacheKey, res, res.extracted ? 3600000 : 120000);
}

async function fetchHtml(url, ua, timeout) {
  if (!url || timeout < 1200) return null;
  try {
    const res = await fetchWithTimeout(url, {
      timeout,
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
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

// Purpose-built article extractor (handles many sites well). Optional/guarded.
async function tryArticleExtractor(html, url) {
  try {
    const mod = await loadArticleExtractor();
    if (!mod || typeof mod.extractFromHtml !== 'function') return null;
    const art = await mod.extractFromHtml(html, url);
    if (!art || !art.content) return null;
    const doc = parseDom(art.content, url);
    const railKeys = stripLiveBlogRails(doc);
    const { paragraphs, images } = collect(doc, url);
    const richHtml = cleanHtml(doc, url); // mutates doc; run after collect
    return {
      title: art.title || '',
      byline: art.author || '',
      image: art.image || images[0] || '',
      paragraphs: sanitize(paragraphs, railKeys),
      images,
      html: richHtml,
    };
  } catch {
    return null;
  }
}

function readabilityFromHtml(html, url) {
  try {
    const doc = parseDom(html, url);
    const ogImage = meta(doc, 'og:image') || meta(doc, 'twitter:image') || '';
    const ogTitle = meta(doc, 'og:title') || (doc.querySelector('title') || {}).textContent || '';
    const parsed = new Readability(doc, { keepClasses: false }).parse();
    if (!parsed || !parsed.content) {
      return { paragraphs: [], images: [], title: ogTitle, byline: '', image: ogImage };
    }
    const cdoc = parseDom(parsed.content, url);
    const railKeys = stripLiveBlogRails(cdoc);
    const { paragraphs, images } = collect(cdoc, url);
    const richHtml = cleanHtml(cdoc, url); // mutates cdoc; run after collect
    return {
      title: parsed.title || ogTitle || '',
      byline: parsed.byline || '',
      image: ogImage || images[0] || '',
      paragraphs: sanitize(paragraphs, railKeys),
      images,
      html: richHtml,
    };
  } catch {
    return null;
  }
}

async function tryJina(url, timeout) {
  if (timeout < 1500) return null;
  try {
    // Free hosted headless render -> clean markdown (our "Crawl4AI as a service").
    // Optional JINA_API_KEY (free at jina.ai) raises rate limits / reliability.
    const headers = { Accept: 'text/plain', 'X-Return-Format': 'text' };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const res = await fetchWithTimeout('https://r.jina.ai/' + url, { timeout, headers });
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

function ampUrlFrom(html, baseUrl) {
  return absolutize(
    baseUrl,
    (html.match(/<link[^>]+rel=["']amphtml["'][^>]+href=["']([^"']+)["']/i) || [])[1]
  );
}

function pickBigger(a, b) {
  const la = a && a.paragraphs ? a.paragraphs.length : 0;
  const lb = b && b.paragraphs ? b.paragraphs.length : 0;
  return lb > la ? b : a;
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

function sanitize(paragraphs, railKeys = new Set()) {
  // Rail entries that arrive as plain text (e.g. the Jina path has no DOM to
  // scrub): collect the headline carried by each "3h agoHeadline" stamp first,
  // so both the stamped line and its bare duplicate elsewhere are dropped.
  for (const p of paragraphs) {
    const m = LIVE_STAMP_RE.exec(p || '');
    if (m) {
      const headline = p.slice(m[0].length).trim();
      if (headline.length >= 12) railKeys.add(headline.slice(0, 80).toLowerCase());
    }
  }
  const seen = new Set();
  const out = [];
  for (const p of paragraphs) {
    if (!p || p.length < 40) continue;
    const k = p.slice(0, 80).toLowerCase();
    if (LIVE_STAMP_RE.test(p) || railKeys.has(k)) continue;
    if (JUNK.test(p) && p.length < 180) continue;
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
  const paragraphs = (r.paragraphs || []).slice(0, 160);
  const content = paragraphs.join('\n\n');
  const html =
    r.html && r.html.length > 80
      ? r.html
      : paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  return {
    title: r.title || '',
    description: paragraphs[0] ? paragraphs[0].slice(0, 300) : '',
    image: r.image || '',
    content: content || 'Could not extract article content.',
    html,
    paragraphs,
    images: (r.images || []).slice(0, 12),
    byline: r.byline || '',
    wordCount: content ? content.split(/\s+/).length : 0,
    extracted: paragraphs.length > 0,
  };
}

function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Produce clean, ad-free article HTML from a Readability/extractus content DOM:
// keep article structure + inline (proxied) images; strip scripts, ads, promos,
// share/newsletter/related widgets, and all classes/ids/styles.
const HTML_DROP_TAGS = [
  'script', 'style', 'iframe', 'form', 'noscript', 'svg', 'button',
  'ins', 'aside', 'nav', 'video', 'audio', 'object', 'embed', 'input',
];
const HTML_JUNK_RE =
  /\b(ad|ads|advert|advertisement|sponsor|sponsored|promo|promotion|newsletter|subscribe|signup|share|social|related|recirc|recommend|outbrain|taboola|comment|disqus|paywall|cookie|consent|popup|modal|banner)\b/;

function cleanHtml(doc, baseUrl) {
  try {
    HTML_DROP_TAGS.forEach((tag) =>
      doc.querySelectorAll(tag).forEach((n) => n.remove())
    );

    // Remove ad/promo/share/newsletter/related containers by class or id.
    doc.querySelectorAll('[class],[id]').forEach((n) => {
      const sig = (
        (n.getAttribute('class') || '') + ' ' + (n.getAttribute('id') || '')
      ).toLowerCase();
      if (HTML_JUNK_RE.test(sig)) n.remove();
    });

    // Images: absolutize -> proxy -> lazy; drop the rest of their attributes.
    doc.querySelectorAll('img').forEach((img) => {
      let src =
        img.getAttribute('src') ||
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src') ||
        '';
      src = absolutize(baseUrl, src);
      if (!src || !/^https?:/i.test(src)) {
        img.remove();
        return;
      }
      const alt = img.getAttribute('alt') || '';
      for (const a of [...img.attributes]) img.removeAttribute(a.name);
      img.setAttribute('src', proxyImage(src, 800));
      img.setAttribute('loading', 'lazy');
      img.setAttribute('alt', alt);
    });

    // Links: absolutize + open in a new tab.
    doc.querySelectorAll('a').forEach((a) => {
      const href = absolutize(baseUrl, a.getAttribute('href') || '');
      for (const at of [...a.attributes]) a.removeAttribute(at.name);
      if (href && /^https?:/i.test(href)) {
        a.setAttribute('href', href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener nofollow');
      }
    });

    // Strip presentational attributes from everything else.
    doc.querySelectorAll('*').forEach((n) => {
      if (n.tagName === 'IMG' || n.tagName === 'A') return;
      n.removeAttribute('class');
      n.removeAttribute('id');
      n.removeAttribute('style');
      n.removeAttribute('onclick');
    });

    let html = (doc.body ? doc.body.innerHTML : '') || '';
    html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/[ \t]{2,}/g, ' ').trim();
    if (html.length > 200000) html = html.slice(0, 200000);
    return html;
  } catch {
    return '';
  }
}

function enough(r) {
  return !!(r && r.paragraphs && r.paragraphs.join(' ').length > 600);
}

// A Google News cluster page is a short list of headline-length lines (links to
// related sources), not flowing article prose.
function looksLikeLinkSoup(paras) {
  if (!paras || !paras.length) return false;
  const joined = paras.join(' ');
  const avg = joined.length / paras.length;
  return paras.length <= 10 && avg < 110 && joined.length < 900;
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
