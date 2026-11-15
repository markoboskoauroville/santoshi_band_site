// /hls/<path>/<file>: the relay's HLS (MediaMTX on chromium-vm, :8888) through Cloudflare's cache, so Frankfurt sends each piece ONCE per
// Cloudflare location, not once per viewer (Marko, 15.11.2026: "Let's switch everything to HLS right now."). Statistics stay counts only:
// nothing about the viewer (no IP, no user agent, no cookie) is stored or sent to the relay.
// - Segments and init files (.mp4/.m4s/.ts): cached 60 s (their names are unique per stream, so a cached copy is never wrong).
// - Playlists (.m3u8): cached 1 s and served as PLAIN HLS: the LL-HLS lines (parts, preload hints, blocking reload) are taken out, because
//   LL-HLS makes every viewer ask about 20 times a second (two playlists + two 0.2 s parts) and every ask is one Function request.
//   Plain HLS is ~2 asks a second per viewer and ~6-8 s behind the stage. A request with _HLS_msn/_HLS_part (a blocking LL-HLS reload)
//   is passed through uncached.
// - MediaMTX gives every reader a session (?session=… in the playlist, cookieCheck redirect). This Function holds ONE session of its own
//   (kept in the isolate, renewed on 401/403/302) and removes every ?session= from what it sends, so all viewers share the same cache entries.
let sess = {};   // stream path -> MediaMTX session id (per isolate)
const PATH = /^([a-z0-9_-]{1,32})\/([A-Za-z0-9_.-]{1,96})$/;
const TYPES = { m3u8: "application/vnd.apple.mpegurl", mp4: "video/mp4", m4s: "video/iso.segment", ts: "video/mp2t" };

async function newSession(base, stream) {
  // the cookieCheck=1 answer is the multivariant playlist with ?session=<id> on every URI
  const r = await fetch(`${base}/${stream}/index.m3u8?cookieCheck=1`, { redirect: "manual" });
  if (r.status !== 200) return null;
  const m = (await r.text()).match(/[?&]session=([0-9a-f-]{8,64})/);
  return m ? (sess[stream] = m[1]) : null;
}
async function upstream(base, stream, file, extra) {
  if (file === "index.m3u8") {   // the multivariant playlist always starts a session (cookieCheck): read it that way, keep its session
    const r = await fetch(`${base}/${stream}/index.m3u8?cookieCheck=1`, { redirect: "manual" });
    if (r.status !== 200) return r;
    const t = await r.text(), m = t.match(/[?&]session=([0-9a-f-]{8,64})/); if (m) sess[stream] = m[1];
    return new Response(t, { status: 200 });
  }
  for (let i = 0; i < 2; i++) {
    const s = sess[stream] || (await newSession(base, stream));
    if (!s) return new Response("not live", { status: 404 });
    const q = new URLSearchParams(extra); q.set("session", s);
    const r = await fetch(`${base}/${stream}/${file}?${q}`, { redirect: "manual" });
    if (r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400)) { delete sess[stream]; continue; }
    return r;
  }
  return new Response("relay refused", { status: 502 });
}
function plain(text) {
  const l = text.replace(/[?&]session=[0-9a-f-]+/g, "").split("\n")
    .filter((x) => !/^#EXT-X-(PART|PART-INF|PRELOAD-HINT|SERVER-CONTROL|RENDITION-REPORT|SKIP)\b/.test(x));
  // the parts of the segment still being made were the tail: a date line left after the last whole segment goes too
  while (l.length && (l[l.length - 1].trim() === "" || /^#EXT-X-PROGRAM-DATE-TIME|^#EXTINF/.test(l[l.length - 1]))) l.pop();
  return l.join("\n") + "\n";
}
const flying = new Map();   // one upstream fetch per file per isolate, when several viewers miss the same new segment at once

export async function onRequestGet({ request, env, waitUntil }) {
  const host = String(env.RELAY_HOST || "").replace(/\/+$/, "");
  if (!host) return new Response("no relay", { status: 503 });
  const url = new URL(request.url), m = url.pathname.replace(/^\/hls\//, "").match(PATH);
  if (!m) return new Response("not found", { status: 404 });
  const [, stream, file] = m, ext = (file.split(".").pop() || "").toLowerCase();
  if (!TYPES[ext]) return new Response("not found", { status: 404 });
  const base = host + ":8888", list = ext === "m3u8";
  const ll = {}; for (const k of ["_HLS_msn", "_HLS_part", "_HLS_skip"]) if (url.searchParams.has(k)) ll[k] = url.searchParams.get(k);
  const blocking = Object.keys(ll).length > 0;
  const ttl = file === "index.m3u8" ? 10 : list ? 1 : 60;   // the multivariant list hardly changes, and each read of it opens a relay session
  const key = new Request(`${url.origin}/hls/${stream}/${file}`);   // no query: one entry for every viewer
  const cache = caches.default;
  if (!blocking) {
    const hit = await cache.match(key);
    if (hit) { const h = new Response(hit.body, hit); h.headers.set("x-sb-cache", "HIT"); return h; }
  }
  const id = blocking ? null : key.url;
  let job = id && flying.get(id);
  if (!job) {
    job = upstream(base, stream, file, ll).then(async (r) => ({ status: r.status, body: r.ok ? (list ? plain(await r.text()) : await r.arrayBuffer()) : null }));
    if (id) { flying.set(id, job); job.finally(() => flying.delete(id)).catch(() => {}); }
  }
  const got = await job;
  const ok = got.status === 200;
  const headers = { "content-type": TYPES[ext], "access-control-allow-origin": "*", "cache-control": ok ? `public, max-age=${ttl}` : "no-store", "x-sb-cache": blocking ? "PASS" : "MISS" };
  if (!ok) return new Response(got.status === 404 ? "not live" : "relay error", { status: got.status === 404 ? 404 : 502, headers });
  const out = new Response(got.body, { status: 200, headers });
  if (!blocking) waitUntil(cache.put(key, out.clone()));
  return out;
}
