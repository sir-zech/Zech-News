module.exports = async function handler(req, res) {
  try {
    const { limit = '6', sub = 'news' } = req.query;
    const count = Math.min(parseInt(limit) || 6, 20);
    const subreddit = encodeURIComponent(sub);

    let articles = await fetchRedditJson(subreddit, count);

    if (!articles) {
      articles = await fetchRedditRss(subreddit, count);
    }

    if (!articles) {
      return res.status(502).json({ error: 'Reddit API unavailable' });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ totalArticles: articles.length, articles });

  } catch (err) {
    console.error("Reddit API ERROR:", err);
    return res.status(500).json({ error: "Reddit fetch failed", details: err.message });
  }
};

async function fetchRedditJson(subreddit, count) {
  try {
    const response = await fetch(
      `https://old.reddit.com/r/${subreddit}/hot.json?limit=${count + 4}&raw_json=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZechNews/2.0; +https://zechnews.vercel.app)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const posts = data?.data?.children || [];

    return posts
      .filter(p => !p.data.stickied && !p.data.is_self && p.data.url)
      .slice(0, count)
      .map(p => ({
        title: p.data.title || '',
        description: p.data.selftext?.slice(0, 300) || p.data.title || '',
        content: p.data.selftext || p.data.title || '',
        url: p.data.url || `https://reddit.com${p.data.permalink}`,
        image: extractImage(p.data),
        publishedAt: new Date((p.data.created_utc || 0) * 1000).toISOString(),
        source: {
          name: `r/${p.data.subreddit}`,
          url: `https://reddit.com/r/${p.data.subreddit}`
        },
        apiSource: 'reddit'
      }));
  } catch {
    return null;
  }
}

async function fetchRedditRss(subreddit, count) {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot/.rss`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZechNews/2.0; +https://zechnews.vercel.app)'
        }
      }
    );

    if (!response.ok) return null;

    const xml = await response.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    return entries.slice(0, count).map(entry => {
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const link = (entry.match(/<link href="([^"]*)"/) || [])[1] || '';
      const updated = (entry.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
      const content = (entry.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/) || [])[1] || '';

      const externalUrl = (content.match(/href="(https?:\/\/(?!(?:www\.)?reddit\.com)[^"]+)"/) || [])[1] || link;
      const image = (content.match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';

      return {
        title: decodeXml(title),
        description: decodeXml(title),
        content: '',
        url: externalUrl || link,
        image: image ? decodeXml(image) : '',
        publishedAt: updated ? new Date(updated).toISOString() : new Date().toISOString(),
        source: { name: `r/${subreddit}`, url: `https://reddit.com/r/${subreddit}` },
        apiSource: 'reddit'
      };
    }).filter(a => a.url && !a.url.includes('reddit.com/r/'));
  } catch {
    return null;
  }
}

function decodeXml(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function extractImage(data) {
  if (data.preview && data.preview.images && data.preview.images[0]) {
    const src = data.preview.images[0].source;
    if (src && src.url) return src.url.replace(/&amp;/g, '&');
  }
  if (data.thumbnail && data.thumbnail.startsWith('http')) {
    return data.thumbnail;
  }
  return '';
}
