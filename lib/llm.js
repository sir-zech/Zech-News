// OPTIONAL LLM text cleaner — OpenAI-compatible (DeepSeek, OpenRouter, Groq, …).
// OFF unless LLM_API_KEY is set. Used only to tidy already-scraped article text
// (remove nav/ads/boilerplate/dupes) — never to crawl. Keeps "free if possible":
// DeepSeek is cheap-but-paid; point LLM_BASE_URL/LLM_MODEL at a free provider to
// stay free (e.g. OpenRouter free models, Groq free tier).
//
// Env:
//   LLM_API_KEY   required to enable
//   LLM_BASE_URL  default https://api.deepseek.com
//   LLM_MODEL     default deepseek-chat
//   LLM_CLEAN     'rescue' (default) cleans only weak extractions | 'always' | 'off'

const { fetchWithTimeout } = require('./http');

function llmEnabled() {
  return !!process.env.LLM_API_KEY && (process.env.LLM_CLEAN || 'rescue') !== 'off';
}

function llmMode() {
  return process.env.LLM_CLEAN || 'rescue';
}

async function cleanWithLLM(paragraphs, { title } = {}) {
  if (!llmEnabled() || !paragraphs || paragraphs.length === 0) return null;
  const base = (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'deepseek-chat';
  const text = paragraphs.join('\n\n').slice(0, 12000);

  try {
    const res = await fetchWithTimeout(`${base}/v1/chat/completions`, {
      timeout: 22000,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You clean scraped news article text. Remove ads, navigation, cookie/subscribe prompts, related-link lists, bylines repeated as boilerplate, and duplicate lines. Preserve the full article body verbatim otherwise. Do NOT summarize, translate, or add commentary. Return ONLY the cleaned body as plain-text paragraphs separated by blank lines.',
          },
          { role: 'user', content: `Title: ${title || ''}\n\n${text}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = data && data.choices && data.choices[0] && data.choices[0].message
      ? (data.choices[0].message.content || '').trim()
      : '';
    if (!out) return null;
    const cleaned = out.split(/\n{2,}/).map((s) => s.trim()).filter((p) => p.length > 40);
    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}

module.exports = { cleanWithLLM, llmEnabled, llmMode };
