export const environment = {
  production: true,
  // Render is the PRIMARY backend; the app auto-falls back to the Vercel "/api/*"
  // functions if Render is cold/slow/down. (See DEPLOY.md.)
  apiBase: 'https://zech-news.onrender.com',
};
