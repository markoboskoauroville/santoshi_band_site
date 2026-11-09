// 9.11.2026 (Marko: remove the group picture completely): the old group-picture files were cached at Cloudflare's edge for
// a week (s-maxage 604800) and could not be purged on pages.dev, so this tiny worker (routed ONLY for these paths by
// _routes.json) answers 410 Gone before the edge cache. Everything else is served as before.
export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (/^\/img\/band\/hero[^\/]*\.jpg$/.test(p)) return new Response('Gone', { status: 410, headers: { 'cache-control': 'no-store' } });
    return env.ASSETS.fetch(request);
  }
};
