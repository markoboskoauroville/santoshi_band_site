import { readSession, json, getLive, viewUrl } from "./_lib.js";
// Closed without the Google sign-in: /api/* (except the sign-in itself and the public live flag). /admin is its own sign-in page.
const OPEN = new Set(["/api/google", "/api/logout", "/api/live", "/api/room", "/api/relay"]);   // /api/relay checks the cookie or the relay key itself
// 15.11.2026 (Marko: "nothing is applied in this view"): the home page's player is the SAME page as /live/ in an iframe (&ui: the one module live/ui.js with
// the sound drawer, chat, small window, full screen, LOW DELAY, "watching"). sbctl.js/sbchat.js outside the frame are only for a VDO.Ninja source.
const BANNER = (v) => { const own = v.startsWith("/live/"), src = own ? v.replace("&muted", "") + "&ui" : v; return `<div id="sb-live" style="position:relative;z-index:99999;background:#14110e;color:#f1e8d8;border-bottom:2px solid #e8a33d;padding:10px 12px;font:600 16px system-ui,sans-serif;text-align:center">
<div><span style="color:#ff4d3d">&#9679;</span> The Santoshi Band is live streaming right now</div>
<div id="sb-live-w" style="max-width:720px;margin:8px auto 0;aspect-ratio:16/9;position:relative"><iframe id="sb-live-f" src="${src}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;background:#000;border-radius:10px"></iframe></div>
${own ? `<script>(function(){var w=document.getElementById('sb-live-w'),m='closed';function fit(){if(m==='closed'){w.style.maxWidth='720px';w.style.aspectRatio='16/9';w.style.height='';return}w.style.aspectRatio='auto';if(m==='wide'){w.style.maxWidth='1080px';w.style.height=Math.round((w.clientWidth-360)*9/16)+'px'}else{w.style.maxWidth='720px';w.style.height=Math.round(w.clientWidth*9/16+320)+'px'}}addEventListener('message',function(e){if(e.origin!==location.origin||!e.data||!e.data.sbChat)return;m=e.data.sbChat;fit()});addEventListener('resize',fit)})();</script>` : `<script src="/sbctl.js?v=3"></script><script src="/sbchat.js?v=3"></script><script>(function(){var w=document.getElementById('sb-live-w');function go(){if(window.SBCtl)SBCtl('view',w,{frame:document.getElementById('sb-live-f')});if(window.SBChat)SBChat(w)}if(window.SBCtl)go();else document.addEventListener('DOMContentLoaded',go)})();</script>`}
<script>setInterval(function(){fetch('/api/live').then(function(r){return r.json()}).then(function(j){if(!j.live){var e=document.getElementById('sb-live');if(e)e.remove()}}).catch(function(){})},30000)</script></div>`; };
export async function onRequest(context) {
  const { request, env } = context, p = new URL(request.url).pathname;
  // 15.11.2026: www.santoshiband.org -> the apex, 301 with path and query (pages.dev is NOT redirected, Marko decides that)
  const u = new URL(request.url);
  if (u.hostname === "www.santoshiband.org") { u.hostname = "santoshiband.org"; return Response.redirect(u.toString(), 301); }
  // 9.11.2026 (Marko: the group picture is gone for good): the old hero files answer 410 before any edge cache
  if (/^\/img\/band\/hero[^\/]*\.jpg$/.test(p)) return new Response("Gone", { status: 410, headers: { "cache-control": "no-store" } });
  if (p.startsWith("/api/") && !OPEN.has(p)) {
    const who = await readSession(env, request);
    if (!who) return json({ error: "login" }, 401);
    context.data.who = who;
    return context.next();
  }
  const res = await context.next();
  if (request.method !== "GET" || p.startsWith("/admin") || p.startsWith("/api/") || p.startsWith("/live/") || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const live = await getLive(env);
  if (!live) return res;
  const out = new Response(res.body, res); out.headers.set("cache-control", "no-store");
  return new HTMLRewriter().on("body", { element(e) { e.prepend(BANNER(viewUrl(live)), { html: true }); } }).transform(out);
}
