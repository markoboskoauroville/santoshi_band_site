import { json, readSession, readCamera, getLive, newLive, viewUrl, pushUrl, relayOn, relayUrls } from "../_lib.js";
// GET (public): is the band live? POST {action:"go"|"stop"|"status", via?:"relay"|"vdo"}: the admin cookie (sbadm) OR
// "Authorization: Bearer <camera token>" (paired at /admin, functions/api/cam.js). GO and STOP also empty the live room's chat
// (room/worker.js, service binding ROOM). The KV value "live" carries source "browser"|"camera" (and name for a camera) and,
// since 15.11.2026, via "relay" when the camera sends ONE stream to the Santoshi relay (MediaMTX on chromium-vm, Frankfurt) and the
// viewers watch it there (WHEP, LL-HLS fallback) instead of one VDO.Ninja peer connection per viewer from the phone.
// Since 15.11.2026 also via "studio": the Mac (studio.py, paired like a camera) sends ONE master to chromium-vm, the VM builds the
// quality ladder (HLS 1080/720/480/360, audio Q:160/80/40 S/M) and /live/ plays it with the gear (live/studio.js).
// One publisher per id: while a camera is live the admin page gets no push address (a second publisher on the same id would fight).
// a paired camera's private relay path: stable per camera (its token hash), not secret (10 hex of a sha256 say nothing about the token)
const camPath = (cam) => "cam-" + String(cam.hash || "").slice(0, 10);
const room = (env, body) => env.ROOM ? env.ROOM.fetch("https://room/state", { method: "POST", body: JSON.stringify(body) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false);
const count = (env) => env.ROOM ? env.ROOM.fetch("https://room/count").then((r) => r.json()).then((j) => j.viewers).catch(() => null) : Promise.resolve(null);
export async function onRequest({ request, env }) {
  if (!env.KV) return json({ live: false });
  if (request.method === "GET") {
    const l = await getLive(env);
    // the relay's two public reading doors (no key needed to watch), also while not live: /live/?force plays them for tests
    const rel = relayOn(env) ? (({ whep, hls }) => ({ whep, hls }))(relayUrls(env)) : undefined;
    const studio = relayOn(env) ? { hls: relayUrls(env).studio } : undefined;
    // not live: the informational relay block names the Cloudflare door (tunnel) for HLS; whep stays the relay's own (15.11.2026)
    if (!l) return json({ live: false, relay: rel && { ...rel, hls: relayUrls(env).hlsCdn }, studio });
    const out = { live: true, view: viewUrl(l), since: l.since, relay: rel, studio };
    // 15.11.2026: viewers read HLS through Cloudflare's cache: live.santoshiband.org (Cloudflare Tunnel → santoshi-hls-proxy → MediaMTX
    // on chromium-vm, vm-chromium santoshi-relay/hls-tunnel); hlsDirect = the relay's own door, the player's fallback after two failures
    if (l.via === "relay" && rel) { out.via = "relay"; out.whep = rel.whep; out.hls = relayUrls(env).hlsCdn; out.hlsDirect = rel.hls; }
    if (l.via === "studio" && studio) out.via = "studio";
    // 15.11.2026, the switch to HLS (Marko: "Let's switch everything to HLS right now."): the new /live/ player asks with ?c=hls. An open
    // page of the OLD player (player.js?v=4, WebRTC first) asks without it, from the page /live/; it reloads to any view whose via is not
    // relay/studio, so it gets via "switch" and the view /live/?p=santoshi&switch (the new page then keeps the sound when the browser lets
    // it). Nothing else reads GET /api/live from /live/ (the banner script and /live/closed/ only read "live"). Harmless once no old page is open.
    if (out.via === "relay" && !new URL(request.url).searchParams.has("c")) {
      let ref = null; try { ref = new URL(request.headers.get("referer") || ""); } catch (e) {}
      // a page that already came through the switch (&switch still in its address = an old copy from a cache) is never moved twice: no reload loop
      if (ref && ref.pathname === "/live/" && !/[?&]switch/.test(ref.search)) { out.via = "switch"; out.view = "/live/?p=santoshi&switch"; }
    }
    return json(out);
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const cam = request.headers.get("authorization") ? await readCamera(env, request) : null;
  if (!cam && !(await readSession(env, request))) return json({ error: "login" }, 401);
  const { action = "", via: wish = "" } = await request.json().catch(() => ({}));
  if (action === "stop") { await env.KV.delete("live"); return json({ live: false, room: await room(env, { live: false }) }); }
  // the camera chooses: SANTOSHI RELAY (via "relay", when the relay is set up) or VDO NINJA (via "vdo"); a browser is always VDO.Ninja
  const via = cam && relayOn(env) && (wish === "relay" || wish === "studio") ? wish : undefined;
  let l = await getLive(env);
  let r = !!env.ROOM;
  if (action === "go" && !l) {
    l = newLive(cam ? "camera" : "browser", cam && cam.name); if (via) l.via = via;
    await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 }); r = await room(env, { live: true, sid: String(l.since) });
  }
  // 14.11.2026 23:45 (Marko: the viewers got the phone's browser camera, not the Sony): a paired camera that goes live while a BROWSER
  // live is on takes it over, same id (viewers stay connected); the admin page sees source "camera" on its next status poll and stops its own
  // getUserMedia publisher. "usecam" does the same from the admin page (cookie) for a camera already publishing on the id.
  if (l && (l.source || "browser") !== "camera" && ((action === "go" && cam) || (action === "usecam" && !cam))) {
    l = { ...l, source: "camera", name: cam ? cam.name : (l.name || "camera"), took: Date.now() };
    if (via) l.via = via; else delete l.via;
    await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 });
  } else if (l && action === "go" && cam && (l.via || undefined) !== via) {
    // the camera switched between SANTOSHI RELAY and VDO NINJA while live: same stream, the viewers' pages follow on their next check
    l = via ? { ...l, via } : (({ via: _, ...rest }) => rest)(l);
    await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 });
  }
  if (!l) return json({ live: false, room: r });
  const source = l.source || "browser", out = { live: true, source, view: viewUrl(l), since: l.since, room: r };
  if (source === "camera") out.name = l.name || "camera";
  if (l.via === "relay" || l.via === "studio") out.via = l.via;
  // the push address goes to the camera (bearer) and to the browser that owns a browser live; never to the admin page while a camera publishes
  if (cam || source === "browser") { out.push = pushUrl(l); out.id = l.id; out.password = l.pw; }
  // the relay's publish door and key: only to a paired camera, only server side here (Pages secret RELAY_KEY)
  // 15.11.2026 "mixer only" (Marko: "Yes, mixer only"): a camera NEVER gets the santoshi door. Its WHIP goes to its own private relay path
  // cam-<first 10 hex of its token hash> (MediaMTX lets the camera user publish only on cam-*); the CLOUD MIXER on the VM
  // (cloud_mixer/live_program.py --auto) reads it, fades to it and is the only publisher on "santoshi", which the viewers watch (H.264 + AAC).
  // KV relay:campath (the morning's hand-set path) is no longer read.
  if (cam && l.via === "relay") {
    out.whip = relayUrls(env).whip.replace(/\/santoshi\/whip$/, "/" + camPath(cam) + "/whip");
    out.whipUser = "santoshi"; out.whipKey = env.RELAY_KEY;
  }
  if (action === "status") out.viewers = await count(env);
  return json(out);
}
