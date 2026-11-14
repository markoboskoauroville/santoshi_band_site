import { json, sha256hex } from "../_lib.js";
// Camera pairing, admin only (the middleware demands the sbadm cookie for everything under /api/ that is not OPEN).
// GET: paired cameras. POST {action:"pair", name}: a new device token, shown ONCE (KV keeps only its SHA-256). POST {action:"revoke", id}.
const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export async function onRequest({ request, env }) {
  if (!env.KV) return json({ error: "no storage" }, 503);
  if (request.method === "GET") {
    const l = await env.KV.list({ prefix: "camtoken:" }), cams = [];
    for (const k of l.keys) { const v = JSON.parse((await env.KV.get(k.name)) || "null"); if (v) cams.push({ id: k.name.slice(9), name: v.name, created: v.created }); }
    return json({ cameras: cams.sort((a, b) => b.created - a.created) });
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const { action = "", name = "", id = "" } = await request.json().catch(() => ({}));
  if (action === "pair") {
    const token = b64u(crypto.getRandomValues(new Uint8Array(32))), hash = await sha256hex(token);
    const nm = String(name).trim().slice(0, 40) || "Camera";
    await env.KV.put("camtoken:" + hash, JSON.stringify({ name: nm, created: Date.now(), hash }));
    return json({ token, name: nm, qr: "mantracam://pair?site=https://santoshi-band.pages.dev&token=" + token });
  }
  if (action === "revoke" && /^[0-9a-f]{64}$/.test(id)) { await env.KV.delete("camtoken:" + id); return json({ ok: true }); }
  return json({ error: "action" }, 400);
}
