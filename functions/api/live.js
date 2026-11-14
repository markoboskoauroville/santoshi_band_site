import { json, readSession, getLive, newLive, viewUrl, pushUrl } from "../_lib.js";
// GET (public): is the band live? POST (admin): {action:"go"|"stop"|"status"}. GO and STOP also empty the live room's chat
// (room/worker.js, service binding ROOM) so every stream starts with a clean chat; STOP sends the viewers "end".
const room = (env, body) => env.ROOM ? env.ROOM.fetch("https://room/state", { method: "POST", body: JSON.stringify(body) }).then((r) => r.ok).catch(() => false) : Promise.resolve(false);
export async function onRequest({ request, env }) {
  if (!env.KV) return json({ live: false });
  if (request.method === "GET") {
    const l = await getLive(env);
    return json(l ? { live: true, view: viewUrl(l), since: l.since } : { live: false });
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (!(await readSession(env, request))) return json({ error: "login" }, 401);
  const { action = "" } = await request.json().catch(() => ({}));
  if (action === "stop") { await env.KV.delete("live"); return json({ live: false, room: await room(env, { live: false }) }); }
  let l = await getLive(env);
  let r = !!env.ROOM;
  if (action === "go" && !l) { l = newLive(); await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 }); r = await room(env, { live: true, sid: String(l.since) }); }
  return json(l ? { live: true, push: pushUrl(l), view: viewUrl(l), since: l.since, room: r } : { live: false, room: r });
}
