// Curated free publisher RSS feeds (English). Real publisher URLs -> clean extraction.

const { fetchText } = require('../http');
const { parseFeed } = require('../rss');
const { pMap } = require('../util');

const FEEDS = {
  general: [
    { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  ],
  world: [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  ],
  technology: [
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'BBC Tech', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  ],
  business: [
    { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'NPR Business', url: 'https://feeds.npr.org/1006/rss.xml' },
  ],
  science: [
    { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
    { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml' },
  ],
  health: [
    { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml' },
    { name: 'NPR Health', url: 'https://feeds.npr.org/1128/rss.xml' },
  ],
  sports: [
    { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
    { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news' },
  ],
  entertainment: [
    { name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' },
    { name: 'NPR Culture', url: 'https://feeds.npr.org/1008/rss.xml' },
  ],
};

async function fetchRssFeeds({ category = 'general', perFeed = 8 } = {}) {
  const feeds = FEEDS[category] || FEEDS.general;
  const lists = await pMap(
    feeds,
    async (f) => {
      try {
        const xml = await fetchText(f.url, { timeout: 6000 });
        return parseFeed(xml, { sourceName: f.name, apiSource: 'rss' }).slice(0, perFeed);
      } catch {
        return [];
      }
    },
    4
  );
  return lists.flat().filter(Boolean);
}

module.exports = { fetchRssFeeds, FEEDS };
