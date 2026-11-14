// The live room (14.11.2026, Marko: "show how many people are watching ... a side panel with chat ... enter his name").
// ONE Durable Object (SQLite-backed, works on the free plan) holds every live viewer's WebSocket: the open viewer sockets ARE the
// watching count, the chat of the current stream lives in its SQLite table and is cleared at GO LIVE and at STOP.
// Why not KV: KV is eventually consistent (a message would reach others up to a minute late) and the free plan allows ~1000 writes a
// day, a single concert chat would use that up. The Worker has no public address (wrangler.toml); only the Pages Functions call it
// through the service binding, and they alone set x-sb-admin (signed-in admin) and x-sb-sid (the stream is live).
import { DurableObject } from "cloudflare:workers";

const MAX_TEXT = 300, MAX_NAME = 30, KEEP = 1000, HISTORY = 200, BURST = 5, WINDOW = 10000, GAP = 700, LIVE_MAX = 12 * 3600e3;
const clean = (s, max) => String(s == null ? "" : s)
  .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, " ")
  .replace(/\s+/g, " ").trim().slice(0, max);
const BAND_NAME = /santoshi\s*band|^admin$|moderator/i;   // visitors cannot pose as the band

export default {
  async fetch(request, env) {
    const room = env.ROOM.get(env.ROOM.idFromName("santoshi"));
    return room.fetch(request);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS m (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, name TEXT, text TEXT, band INTEGER)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS s (k TEXT PRIMARY KEY, v TEXT)");
    // keep-alive pings are answered without waking the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }
  get(k) { const r = this.sql.exec("SELECT v FROM s WHERE k = ?", k).toArray(); return r.length ? r[0].v : null; }
  set(k, v) { this.sql.exec("INSERT INTO s (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, String(v)); }
  live() { return this.get("live") === "1" && Date.now() - Number(this.get("since") || 0) < LIVE_MAX; }
  history() {
    return this.sql.exec("SELECT id, ts, name, text, band FROM m ORDER BY id DESC LIMIT ?", HISTORY).toArray().reverse()
      .map((r) => ({ id: r.id, ts: r.ts, name: r.name, text: r.text, band: !!r.band }));
  }
  viewers(except) { return this.ctx.getWebSockets("viewer").filter((w) => w !== except && w.readyState === 1).length; }
  all(o, except) { const s = JSON.stringify(o); for (const w of this.ctx.getWebSockets()) if (w !== except) try { w.send(s); } catch (e) {} }
  count(except) { this.all({ t: "count", n: this.viewers(except) }, except); }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/state" && request.method === "POST") {
      const b = await request.json().catch(() => ({}));
      this.sql.exec("DELETE FROM m");                       // every stream starts and ends with an empty chat
      if (b.live) {
        this.set("live", "1"); this.set("since", Date.now()); this.set("sid", clean(b.sid, 40));
        this.all({ t: "reset" });
      } else {
        this.set("live", "0");
        this.all({ t: "end" });
        for (const w of this.ctx.getWebSockets("viewer")) try { w.close(1000, "end"); } catch (e) {}
      }
      return Response.json({ ok: true, live: this.live(), viewers: this.viewers() });
    }
    if (url.pathname === "/count") return Response.json({ live: this.live(), viewers: this.viewers() });
    if (url.pathname !== "/ws" || (request.headers.get("upgrade") || "").toLowerCase() !== "websocket")
      return new Response("websocket only", { status: 426 });
    // a stream that was already running before the room existed adopts the live flag on the first connection
    const sid = clean(request.headers.get("x-sb-sid"), 40);
    if (sid && this.get("live") === null) { this.set("live", "1"); this.set("since", Date.now()); this.set("sid", sid); }
    const band = !!request.headers.get("x-sb-admin");
    const role = band ? "band" : "viewer";
    const pair = new WebSocketPair(), ws = pair[1];
    this.ctx.acceptWebSocket(ws, [role]);
    ws.serializeAttachment({ role, r: [] });
    ws.send(JSON.stringify({ t: "hist", live: this.live(), band, msgs: this.history() }));
    this.count();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws, data) {
    let j; try { j = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data)); } catch (e) { return; }
    if (!j || j.t !== "msg") return;
    const a = ws.deserializeAttachment() || { role: "viewer", r: [] };
    const err = (e) => ws.send(JSON.stringify({ t: "err", e }));
    const band = a.role === "band";
    const name = clean(j.name, MAX_NAME), text = clean(j.text, MAX_TEXT);
    if (!name) return err("name");
    if (!text) return;
    if (!band && BAND_NAME.test(name)) return err("name-taken");
    if (!band && !this.live()) return err("not-live");
    const now = Date.now(), r = (a.r || []).filter((t) => now - t < WINDOW);
    if (!band && (r.length >= BURST || (r.length && now - r[r.length - 1] < GAP))) return err("slow");
    r.push(now); a.r = r; ws.serializeAttachment(a);
    const id = this.sql.exec("INSERT INTO m (ts, name, text, band) VALUES (?, ?, ?, ?) RETURNING id", now, name, text, band ? 1 : 0).one().id;
    if (id % 50 === 0) this.sql.exec("DELETE FROM m WHERE id <= ?", id - KEEP);
    this.all({ t: "msg", m: { id, ts: now, name, text, band } });
  }
  async webSocketClose(ws, code) { try { ws.close(1000, "bye"); } catch (e) {} this.count(ws); }
  async webSocketError(ws) { try { ws.close(1011, "error"); } catch (e) {} this.count(ws); }
}
