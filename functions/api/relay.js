import { json, readSession, getLive, relayOn, relayUrls, safeEq } from "../_lib.js";
// The Santoshi relay (15.11.2026; MediaMTX on chromium-vm, santoshi-relay in the repo vm-chromium).
// GET with the admin cookie: the relay's state for /admin > LIVE (publisher on or off, codecs, bytes in, how many watch by WebRTC and
//   by HLS), read from MediaMTX's API with the publish key (Pages secret RELAY_KEY, never sent to the browser).
// GET with "Authorization: Bearer <RELAY_KEY>" (the VM's recording uploader): the stream's chat and statistics for the two Google Docs
//   it writes next to the recording on Drive.
const api = async (env, path) => {
  const r = await fetch(relayUrls(env).api + path, { headers: { authorization: "Basic " + btoa("santoshi:" + env.RELAY_KEY) }, cf: { cacheTtl: 0 } });
  if (!r.ok) throw new Error("relay " + r.status);
  return r.json();
};
export async function onRequest({ request, env }) {
  if (request.method !== "GET") return json({ error: "method" }, 405);
  if (!relayOn(env)) return json({ relay: false, error: "relay not set up" }, 503);
  const m = (request.headers.get("authorization") || "").match(/^Bearer (\S{16,200})$/);
  if (m) {
    if (!safeEq(m[1], env.RELAY_KEY)) return json({ error: "login" }, 401);
    const l = await getLive(env);
    const [stats, chat] = env.ROOM ? await Promise.all([
      env.ROOM.fetch("https://room/stats").then((r) => r.json()).catch(() => null),
      env.ROOM.fetch("https://room/chat").then((r) => r.json()).catch(() => []),
    ]) : [null, []];
    return json({ live: !!l, since: l ? l.since : null, via: l ? l.via || "vdo" : null, stats, chat });
  }
  if (!(await readSession(env, request))) return json({ error: "login" }, 401);
  const out = { relay: true, host: String(env.RELAY_HOST).replace(/^https:\/\//, "") };
  try {
    const p = await api(env, "/paths/get/santoshi").catch((e) => (String(e.message).includes("404") ? null : Promise.reject(e)));
    out.up = true;
    out.publishing = !!(p && p.ready);
    if (p) { out.tracks = p.tracks || []; out.bytesIn = p.bytesReceived || p.inboundBytes || 0; out.readySince = p.readyTime || null; out.source = p.source ? p.source.type : null; out.readers = (p.readers || []).length; }
    const [w, h] = await Promise.all([api(env, "/webrtcsessions/list?itemsPerPage=500").catch(() => null), api(env, "/hlsmuxers/list").catch(() => null)]);
    if (w) { const it = w.items || []; out.webrtcReaders = it.filter((s) => s.state === "read" && s.path === "santoshi").length; out.webrtcPublishers = it.filter((s) => s.state === "publish").length; out.bytesOut = it.reduce((a, s) => a + (s.bytesSent || s.outboundBytes || 0), 0); }
    if (h) { const mx = (h.items || []).find((x) => x.path === "santoshi"); out.hls = mx ? { lastRequest: mx.lastRequest, bytesSent: mx.bytesSent || mx.outboundBytes || 0 } : null; }
  } catch (e) { out.up = false; out.error = String(e.message || e); }
  return json(out);
}
