// Reddit hot posts (JSON with RSS fallback). Ported from api/reddit.ts.

const { fetchWithTimeout, fetchText, DEFAULT_UA } = require('../http');
const { decodeEntities, toIso } = require('../util');

function extractImage(data) {
  if (data.preview && data.preview.images && data.preview.images[0]) {
    const src = data.preview.images[0].source;
    if (src && src.url) return src.url.replace(/&amp;/g, '&');
  }
  if (data.thumbnail && data.thumbnail.startsWith('http')) return data.thumbnail;
  return '';
}

async function fetchRedditJson(subreddit, count) {
  try {
    const res = await fetchWithTimeout(
      `https://old.reddit.com/r/${subreddit}/hot.json?limit=${count + 4}&raw_json=1`,
      { timeout: 6000, headers: { 'User-Agent': DEFAULT_UA, Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const posts = (data && data.data && data.data.children) || [];
    return posts
      .filter((p) => !p.data.stickied && !p.data.is_self && p.data.url)
      .slice(0, count)
      .map((p) => ({
        title: p.data.title || '',
        description: (p.data.selftext || p.data.title || '').slice(0, 300),
        content: p.data.selftext || p.data.title || '',
        url: p.data.url || `https://reddit.com${p.data.permalink}`,
        image: extractImage(p.data),
        publishedAt: toIso((p.data.created_utc || 0) * 1000),
        source: { name: `r/${p.data.subreddit}`, url: `https://reddit.com/r/${p.data.subreddit}` },
        apiSource: 'reddit',
      }));
  } catch {
    return null;
  }
}

async function fetchRedditRss(subreddit, count) {
  try {
    const xml = await fetchText(`https://www.reddit.com/r/${subreddit}/hot/.rss`, { timeout: 6000 });
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    return entries
      .slice(0, count)
      .map((entry) => {
        const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
        const link = (entry.match(/<link href="([^"]*)"/) || [])[1] || '';
        const updated = (entry.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
        const content = (entry.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/) || [])[1] || '';
        const externalUrl =
          (content.match(/href="(https?:\/\/(?!(?:www\.)?reddit\.com)[^"]+)"/) || [])[1] || link;
        const image = (content.match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
        return {
          title: decodeEntities(title),
          description: decodeEntities(title),
          content: '',
          url: externalUrl || link,
          image: image ? decodeEntities(image) : '',
          publishedAt: toIso(updated),
          source: { name: `r/${subreddit}`, url: `https://reddit.com/r/${subreddit}` },
          apiSource: 'reddit',
        };
      })
      .filter((a) => a.url && !a.url.includes('reddit.com/r/'));
  } catch {
    return null;
  }
}

async function fetchReddit({ limit = 6, sub = 'news' } = {}) {
  const count = Math.min(parseInt(limit) || 6, 20);
  const subreddit = encodeURIComponent(sub);
  const articles = (await fetchRedditJson(subreddit, count)) || (await fetchRedditRss(subreddit, count));
  return articles || [];
}

module.exports = { fetchReddit };
