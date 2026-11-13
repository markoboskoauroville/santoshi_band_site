import { json } from "../_lib.js";
// the private picture collection: index and files live in KV, never in the repository or as public URLs
export async function onRequest({ request, env }) {
  const f = new URL(request.url).searchParams.get("f");
  if (!env.KV) return json({ error: "storage" }, 503);
  if (!f) return new Response((await env.KV.get("pic:index.json")) || "[]", { headers: { "content-type": "application/json", "cache-control": "private, no-store" } });
  if (!/^[\w.\-]{1,120}\.jpg$/i.test(f)) return json({ error: "name" }, 400);
  const b = await env.KV.get("pic:" + f, "arrayBuffer");
  return b ? new Response(b, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } }) : json({ error: "none" }, 404);
}
