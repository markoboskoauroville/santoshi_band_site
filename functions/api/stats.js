import { json } from "../_lib.js";
// Stream statistics (15.11.2026): admin only (the middleware requires the sign-in cookie for every /api/ path not in OPEN).
// The numbers come from the live room (room/worker.js, service binding ROOM); the admin page writes them into a Google Doc.
export async function onRequest({ env }) {
  if (!env.ROOM) return json({ error: "room not set up" }, 503);
  const r = await env.ROOM.fetch("https://room/stats");
  return json(await r.json());
}
