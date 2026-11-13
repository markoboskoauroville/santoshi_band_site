import { json, readSession, getLive, newLive, viewUrl, pushUrl } from "../_lib.js";
// GET (public): is the band live? POST (admin): {action:"go"|"stop"|"status"}
export async function onRequest({ request, env }) {
  if (!env.KV) return json({ live: false });
  if (request.method === "GET") {
    const l = await getLive(env);
    return json(l ? { live: true, view: viewUrl(l), since: l.since } : { live: false });
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  if (!(await readSession(env, request))) return json({ error: "login" }, 401);
  const { action = "" } = await request.json().catch(() => ({}));
  if (action === "stop") { await env.KV.delete("live"); return json({ live: false }); }
  let l = await getLive(env);
  if (action === "go" && !l) { l = newLive(); await env.KV.put("live", JSON.stringify(l), { expirationTtl: 12 * 3600 }); }
  return json(l ? { live: true, push: pushUrl(l), view: viewUrl(l), since: l.since } : { live: false });
}
