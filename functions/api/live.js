import { json, readSession, readCamera, getLive, newLive, viewUrl, pushUrl } from "../_lib.js";
// GET (public): is the band live? POST {action:"go"|"stop"|"status"}: the admin cookie (sbadm) OR "Authorization: Bearer <camera token>"
// (paired at /admin, functions/api/cam.js). GO and STOP also empty the live room's chat (room/worker.js, service binding ROOM).
// The KV value "live" carries source "browser"|"camera" (and name for a camera). One publisher per id: while a camera is live
// the admin page gets no push address (a second publisher on the same id would fight).
const room = (env, body) => env.ROOM ? env.ROOM.fetch("https://room/state", { method: "POST", body: JSON.stringify(body) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false);
export async function onRequest({ request, env }) {
  if (!env.KV) return json({ live: false });
  if (request.method === "GET") {
    const l = await getLive(env);
    return json(l ? { live: true, view: viewUrl(l), since: l.since } : { live: false });
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const cam = request.headers.get("authorization") ? await readCamera(env, request) : null;
  if (!cam && !(await readSession(env, request))) return json({ error: "login" }, 401);
  const { action = "" } = await request.json().catch(() => ({}));
  if (action === "stop") { await env.KV.delete("live"); return json({ live: false, room: await room(env, { live: false }) }); }
  let l = await getLive(env);
  let r = !!env.ROOM;
  if (action === "go" && !l) { l = newLive(cam ? "camera" : "browser", cam && cam.name); await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 }); r = await room(env, { live: true, sid: String(l.since) }); }
  if (!l) return json({ live: false, room: r });
  const source = l.source || "browser", out = { live: true, source, view: viewUrl(l), since: l.since, room: r };
  if (source === "camera") out.name = l.name || "camera";
  // the push address goes to the camera (bearer) and to the browser that owns a browser live; never to the admin page while a camera publishes
  if (cam || source === "browser") { out.push = pushUrl(l); out.id = l.id; out.password = l.pw; }
  return json(out);
}
