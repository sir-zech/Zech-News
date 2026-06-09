// Shared fetch helpers (Node 18+ global fetch). Timeouts + sane defaults.

const DEFAULT_UA =
  'Mozilla/5.0 (compatible; ZechNews/3.0; +https://zechnews.vercel.app)';
// Many publishers serve full, ad-light text to search crawlers.
const BOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchWithTimeout(url, { timeout = 8000, ...opts } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      ...opts,
      headers: { 'User-Agent': DEFAULT_UA, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url, opts) {
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function fetchJson(url, opts) {
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = {
  fetchWithTimeout,
  fetchText,
  fetchJson,
  DEFAULT_UA,
  BOT_UA,
  BROWSER_UA,
};
