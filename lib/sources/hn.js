// Hacker News top stories + og:image enrichment (ported from api/hn.ts).

const { fetchJson } = require('../http');
const { extractOgImage } = require('../images');
const { pMap, toIso } = require('../util');

async function fetchHackerNews({ limit = 6 } = {}) {
  const count = Math.min(parseInt(limit) || 6, 20);
  try {
    const ids = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json', {
      timeout: 6000,
    });
    const topIds = ids.slice(0, count + 6);
    const stories = await pMap(
      topIds,
      (id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 }),
      8
    );
    const valid = stories.filter((s) => s && s.title && s.url).slice(0, count);

    return await pMap(
      valid,
      async (s) => ({
        title: s.title,
        description: s.text
          ? s.text.replace(/<[^>]*>/g, '').slice(0, 200)
          : `Score ${s.score || 0} · ${s.descendants || 0} comments on Hacker News`,
        content: `${s.title}. Score: ${s.score || 0}. Comments: ${s.descendants || 0}.`,
        url: s.url,
        image: await extractOgImage(s.url),
        publishedAt: toIso((s.time || 0) * 1000),
        source: { name: 'Hacker News', url: `https://news.ycombinator.com/item?id=${s.id}` },
        apiSource: 'hackernews',
      }),
      6
    );
  } catch {
    return [];
  }
}

module.exports = { fetchHackerNews };
