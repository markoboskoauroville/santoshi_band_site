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
  const u0 = new URL(request.url);
  // 15.11.2026: only the admin page asks for the band seat (?band=1); a signed-in admin WATCHING /live/ is a counted viewer (he saw "0 watching")
  if (u0.searchParams.get("band") === "1" && origin === u0.origin) { const who = await readSession(env, request); if (who) h.set("x-sb-admin", who.email); }
  // statistics (15.11.2026): anonymous tab id, country code, device class; never an IP or the user agent itself
  const u = new URL(request.url), vid = (u.searchParams.get("vid") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  if (vid) h.set("x-sb-vid", vid);
  const cc = request.cf && request.cf.country; if (cc) h.set("x-sb-cc", String(cc));
  const ua = request.headers.get("user-agent") || "";
  h.set("x-sb-dev", /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "phone" : "desktop");
  const live = await getLive(env);
  if (live) h.set("x-sb-sid", String(live.since));
  return env.ROOM.fetch("https://room/ws", { headers: h });
}
