import { json, readSession, getLive } from "../_lib.js";
// The live room's door (14.11.2026): wss://santoshi-band.pages.dev/api/room. Public (viewers: chat + watching count); a signed-in admin
// joins as the band (not counted). The room itself is the Durable Object in room/worker.js, reached only through the service
// binding ROOM; the x-sb-* headers it trusts are set here and nowhere else.
export async function onRequest({ request, env }) {
  if (!env.ROOM) return json({ error: "room not set up" }, 503);
  if ((request.headers.get("upgrade") || "").toLowerCase() !== "websocket") return json({ error: "websocket only" }, 426);
  const h = new Headers();
  for (const [k, v] of request.headers) if (/^(upgrade|connection|sec-websocket-)/i.test(k)) h.set(k, v);
  const origin = request.headers.get("origin");
  // the band seat needs the sign-in cookie AND this site as the page that opened the socket (no cross-site socket with his cookie)
  if (origin === new URL(request.url).origin) { const who = await readSession(env, request); if (who) h.set("x-sb-admin", who.email); }
  const live = await getLive(env);
  if (live) h.set("x-sb-sid", String(live.since));
  return env.ROOM.fetch("https://room/ws", { headers: h });
}
