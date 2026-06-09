export const environment = {
  production: false,
  // Empty => same-origin relative "/api/*". In dev this is proxied to the
  // local Express server (proxy.conf.json). In prod it hits Vercel functions.
  apiBase: '',
};
