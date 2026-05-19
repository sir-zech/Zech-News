module.exports = async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZechNews/1.0)',
        'Accept': 'text/html'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: "Could not fetch article" });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({ error: "Not an HTML page" });
    }

    let html = await response.text();
    if (html.length > 500000) {
      html = html.slice(0, 500000);
    }

    const ogImage = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || '';
    const ogTitle = extractMeta(html, 'og:title') || '';
    const ogDesc = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';

    let body = html;
    body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
    body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
    body = body.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    body = body.replace(/<header[\s\S]*?<\/header>/gi, '');
    body = body.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    body = body.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    body = body.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    body = body.replace(/<form[\s\S]*?<\/form>/gi, '');
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    body = body.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    body = body.replace(/<button[\s\S]*?<\/button>/gi, '');

    let articleContent = '';
    const articleMatch = body.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) {
      articleContent = articleMatch[0];
    } else {
      const mainMatch = body.match(/<main[\s\S]*?<\/main>/i);
      if (mainMatch) {
        articleContent = mainMatch[0];
      } else {
        articleContent = body;
      }
    }

    const paragraphs = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(articleContent)) !== null) {
      const text = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 40) {
        paragraphs.push(text);
      }
    }

    const fullText = paragraphs.join('\n\n');

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json({
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      content: fullText || ogDesc || 'Could not extract article content.',
      paragraphs,
      wordCount: fullText.split(/\s+/).length,
      extracted: paragraphs.length > 0
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: "Article fetch timed out" });
    }
    console.error("Extract ERROR:", err);
    return res.status(500).json({ error: "Extraction failed", details: err.message });
  }
};

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*name=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return '';
}
