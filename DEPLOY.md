# Zech News — Deploy & Operations

This app has **two backends that share one codebase** (`lib/`):

| Host | Role | Why |
|------|------|-----|
| **Render** (`server/`) | Primary | Always-warm process → persistent cache + no request timeout |
| **Vercel** (`api/*`) | Fallback | Zero-config functions; the app auto-falls back here if Render is cold/slow/down |

The frontend calls Render first (`environment.prod.apiBase`) and silently retries against the Vercel `/api/*` route on any error/timeout. If you leave `apiBase` empty, the app simply runs **Vercel-only** — everything still works, just without Render's persistent cache.

---

## 1. Get free API keys (optional but recommended)

All keys are optional — every source degrades gracefully if missing — but they add real thumbnails, full pagination, and full article bodies.

- **The Guardian** (free, unlimited, real images + full body): https://open-platform.theguardian.com/access/ → `GUARDIAN_KEY`
- **NewsData.io** (free 200/day, paginated): https://newsdata.io/register → `NEWSDATA_KEY`
- **GNews** (optional, small free tier): https://gnews.io/ → `GNEWS_API_KEY`

## 2. Local development

```bash
npm install                 # installs frontend + backend runtime deps
cp .env.example .env        # add your keys
node server/index.js        # backend on http://localhost:3000
# in a second terminal:
npm start                   # ng serve on http://localhost:4200 (proxies /api -> :3000)
```

Quick backend smoke test:

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/api/feed?category=technology&page=1"
curl "http://localhost:3000/api/feed?category=technology&page=2"   # different items
curl "http://localhost:3000/api/extract?url=https://www.theguardian.com/<some-article>"
```

## 3. Deploy the Render backend

1. Push this repo to GitHub.
2. Render → **New + → Blueprint**, select the repo (it reads `render.yaml`).
   - Or **New + → Web Service** manually: Root Dir = repo root, Build = `npm install`, Start = `node server/index.js`, Health check path = `/health`, Plan = Free.
3. In the service **Environment**, set `GUARDIAN_KEY`, `NEWSDATA_KEY`, `GNEWS_API_KEY`, and `ALLOWED_ORIGIN` (your Vercel origin, e.g. `https://zechnews.vercel.app`).
4. Copy the service URL, e.g. `https://zech-news-api.onrender.com`.

## 4. Point the frontend at Render

Edit `src/environments/environment.prod.ts`:

```ts
apiBase: 'https://zech-news-api.onrender.com',
```

Commit + redeploy the frontend on Vercel. Also add the same `GUARDIAN_KEY` / `NEWSDATA_KEY` / `GNEWS_API_KEY` env vars in the **Vercel** project settings so the fallback `api/*` functions have them too.

## 5. Keep Render warm (beat the 15-min idle sleep)

Render's free tier sleeps after ~15 min with no inbound traffic (cold start ≈ 50s). The server's internal timer refreshes its cache but **cannot** prevent sleep — an *external* pinger is required:

- **UptimeRobot** (free): add an HTTP(s) monitor → URL `https://<your-service>.onrender.com/health`, interval **5 minutes**.
- Or **cron-job.org** (free): schedule a GET to the same URL every 5–10 min.

The app also fires a warm-up ping to `/health` on load, which wakes the dyno for that visitor while other content loads from the Vercel fallback.

## 6. Notes & limits

- **Paywalls** (NYT/WSJ etc.): extraction is best-effort (Readability → AMP → archive.org → Jina Reader). Hard paywalls degrade to summary + "Open original".
- **Render 512MB RAM**: caches are size-capped; no headless browser is used.
- **Rate limits**: all upstream calls are cached; missing keys never hard-fail.
- Optional: set `PREWARM=0` on Render to disable startup cache warming.
