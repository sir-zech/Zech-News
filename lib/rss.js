// Generic RSS 2.0 + Atom parser -> article objects. Shared by googleRss & rssFeeds.

const { decodeEntities, stripHtml, toIso } = require('./util');

function pick(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function parseFeed(xml, { sourceName, apiSource = 'rss' } = {}) {
  const isAtom = /<entry[\s>]/.test(xml) && !/<item[\s>]/.test(xml);
  const blocks = isAtom
    ? xml.match(/<entry[\s\S]*?<\/entry>/g) || []
    : xml.match(/<item[\s\S]*?<\/item>/g) || [];

  const out = [];
  for (const b of blocks) {
    const title = stripHtml(pick(b, 'title'));
    if (!title) continue;

    let link = '';
    if (isAtom) {
      link =
        (b.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i) || [])[1] ||
        (b.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] ||
        '';
    } else {
      link =
        decodeEntities(pick(b, 'link')) ||
        (b.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] ||
        '';
    }
    link = link.trim();

    const pub =
      pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date');
    let descRaw =
      pick(b, 'description') || pick(b, 'summary') || pick(b, 'content') || '';
    // Google News entity-encodes the description HTML (&lt;ol&gt;…) — decode it
    // first or the cluster sniff below never matches and the markup leaks
    // through stripHtml as visible text.
    descRaw = decodeEntities(descRaw);

    // Google News "cluster" items carry an <ol> of related-source links as their
    // description — useless as a snippet. Drop it so we fall back to the title.
    const linkCount = (descRaw.match(/<a\s/gi) || []).length;
    if (
      /news\.google\.com\/rss\/articles/i.test(descRaw) ||
      (/<ol|<ul/i.test(descRaw) && linkCount > 1)
    ) {
      descRaw = '';
    }

    let image =
      (b.match(/<media:content[^>]+url=["']([^"']+)["']/i) || [])[1] ||
      (b.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) || [])[1] ||
      (b.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i) || [])[1] ||
      (descRaw.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
      '';
    image = image ? decodeEntities(image) : '';

    const srcName =
      sourceName ||
      stripHtml((b.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || '') ||
      'News';

    out.push({
      title,
      description: stripHtml(descRaw).slice(0, 400),
      content: stripHtml(descRaw),
      url: link,
      image,
      publishedAt: toIso(pub),
      source: { name: srcName, url: link },
      apiSource,
    });
  }
  return out.filter((a) => a.url);
}

module.exports = { parseFeed };
