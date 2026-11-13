import { readSession, json, getLive, viewUrl } from "./_lib.js";
// Closed without the Google sign-in: /api/* (except the sign-in itself and the public live flag). /admin is its own sign-in page.
const OPEN = new Set(["/api/google", "/api/logout", "/api/live"]);
const BANNER = (v) => `<div id="sb-live" style="position:relative;z-index:99999;background:#14110e;color:#f1e8d8;border-bottom:2px solid #e8a33d;padding:10px 12px;font:600 16px system-ui,sans-serif;text-align:center">
<div><span style="color:#ff4d3d">&#9679;</span> The Santoshi Band is live streaming right now</div>
<div style="max-width:720px;margin:8px auto 0;aspect-ratio:16/9;position:relative"><iframe id="sb-live-f" src="${v}" allow="autoplay; fullscreen" style="width:100%;height:100%;border:0;background:#000"></iframe></div>
<button id="sb-un" style="margin:8px 0 0;padding:10px 18px;font:inherit;background:#e8a33d;color:#14110e;border:0;border-radius:6px" onclick="var f=document.getElementById('sb-live-f');f.src=f.src.replace('&muted','');this.remove()">Tap to unmute</button>
<script>setInterval(function(){fetch('/api/live').then(function(r){return r.json()}).then(function(j){if(!j.live){var e=document.getElementById('sb-live');if(e)e.remove()}}).catch(function(){})},30000)</script></div>`;
export async function onRequest(context) {
  const { request, env } = context, p = new URL(request.url).pathname;
  // 9.11.2026 (Marko: the group picture is gone for good): the old hero files answer 410 before any edge cache
  if (/^\/img\/band\/hero[^\/]*\.jpg$/.test(p)) return new Response("Gone", { status: 410, headers: { "cache-control": "no-store" } });
  if (p.startsWith("/api/") && !OPEN.has(p)) {
    const who = await readSession(env, request);
    if (!who) return json({ error: "login" }, 401);
    context.data.who = who;
    return context.next();
  }
  const res = await context.next();
  if (request.method !== "GET" || p.startsWith("/admin") || p.startsWith("/api/") || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const live = await getLive(env);
  if (!live) return res;
  const out = new Response(res.body, res); out.headers.set("cache-control", "no-store");
  return new HTMLRewriter().on("body", { element(e) { e.prepend(BANNER(viewUrl(live)), { html: true }); } }).transform(out);
}
