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
    // stream statistics (15.11.2026): one row per viewer connection, the viewer count at every change, one row per chat message.
    // Nothing personal: vid is a random id made by the viewer's tab, cc the country code, dev phone/desktop. No IP, no user agent.
    this.sql.exec("CREATE TABLE IF NOT EXISTS c (id INTEGER PRIMARY KEY AUTOINCREMENT, vid TEXT, t0 INTEGER, t1 INTEGER, cc TEXT, dev TEXT)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS e (ts INTEGER, n INTEGER)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS cm (ts INTEGER, who TEXT, band INTEGER)");
    // keep-alive pings are answered without waking the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }
  get(k) { const r = this.sql.exec("SELECT v FROM s WHERE k = ?", k).toArray(); return r.length ? r[0].v : null; }
  set(k, v) { this.sql.exec("INSERT INTO s (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, String(v)); }
  live() { return this.get("live") === "1" && Date.now() - Number(this.get("since") || 0) < LIVE_MAX; }
  history() {
    if (!this.live()) return [];
    return this.sql.exec("SELECT id, ts, name, text, band FROM m ORDER BY id DESC LIMIT ?", HISTORY).toArray().reverse()
      .map((r) => ({ id: r.id, ts: r.ts, name: r.name, text: r.text, band: !!r.band }));
  }
  viewers(except) { return this.ctx.getWebSockets("viewer").filter((w) => w !== except && w.readyState === 1).length; }
  all(o, except) { const s = JSON.stringify(o); for (const w of this.ctx.getWebSockets()) if (w !== except) try { w.send(s); } catch (e) {} }
  count(except) { const n = this.viewers(except); this.all({ t: "count", n }, except); if (this.sql.exec("SELECT COUNT(*) c FROM e").one().c < 20000) this.sql.exec("INSERT INTO e (ts, n) VALUES (?, ?)", Date.now(), n); }
  stats() {
    const q = (x, ...a) => this.sql.exec(x, ...a).toArray();
    const now = Date.now(), since = Number(this.get("since") || 0), stop = Number(this.get("stop") || 0);
    const live = this.live(), end = live || !stop ? now : stop;
    const ev = q("SELECT ts, n FROM e ORDER BY rowid"), cons = q("SELECT vid, t0, t1, cc, dev FROM c ORDER BY id");
    const t0 = since || (ev.length ? ev[0].ts : now), dur = Math.max(1, end - t0);
    // viewers over time
    let peak = 0, peakAt = t0, integral = 0, prevT = t0, prevN = 0;
    for (const x of ev) {
      const t = Math.min(Math.max(x.ts, t0), end); integral += prevN * (t - prevT); prevT = t; prevN = x.n;
      if (x.n > peak) { peak = x.n; peakAt = x.ts; }
    }
    integral += prevN * (end - prevT);
    const slot = dur > 6 * 3600e3 ? 600e3 : dur > 90 * 60e3 ? 300e3 : 60e3;
    const series = []; let i = 0, carry = 0;
    for (let a = t0 - (t0 % slot); a < end; a += slot) {
      let mx = carry;
      while (i < ev.length && ev[i].ts < a + slot) { if (ev[i].ts >= a) mx = Math.max(mx, ev[i].n); carry = ev[i].n; i++; }
      series.push([a, mx, carry]);
      if (series.length > 400) break;
    }
    // per viewer
    const by = {};
    for (const c of cons) {
      const d = Math.max(0, (c.t1 || end) - c.t0), v = by[c.vid] || (by[c.vid] = { watch: 0, joins: 0, cc: c.cc, dev: c.dev });
      v.watch += d; v.joins++;
    }
    const vs = Object.values(by), uniq = vs.length, w = vs.map((v) => v.watch).sort((a, b) => a - b);
    const tally = (k) => { const o = {}; for (const v of vs) o[v[k] || "?"] = (o[v[k] || "?"] || 0) + 1; return o; };
    let longest = 0; for (const c of cons) longest = Math.max(longest, (c.t1 || end) - c.t0);
    // chat
    const cm = q("SELECT ts, who, band FROM cm ORDER BY ts"), vm = cm.filter((x) => !x.band), mins = {};
    for (const x of vm) { const k = x.ts - (x.ts % 60e3); mins[k] = (mins[k] || 0) + 1; }
    let bm = 0, bmAt = 0; for (const k in mins) if (mins[k] > bm) { bm = mins[k]; bmAt = Number(k); }
    return {
      live, start: t0, end, duration: dur, peak, peakAt, average: integral / dur, unique: uniq, joins: cons.length,
      reconnects: cons.length - uniq, avgWatch: uniq ? w.reduce((a, b) => a + b, 0) / uniq : 0, medianWatch: uniq ? w[Math.floor(uniq / 2)] : 0,
      longest, stayed5: vs.filter((v) => v.watch >= 300e3).length, now: live ? this.viewers() : 0, slot, series,
      countries: tally("cc"), devices: tally("dev"),
      chat: { viewerMessages: vm.length, bandMessages: cm.length - vm.length, chatters: new Set(vm.map((x) => x.who)).size, busiestMinute: bmAt, busiestCount: bm },
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/state" && request.method === "POST") {
      const b = await request.json().catch(() => ({}));
      // every stream starts with an empty chat; since 15.11.2026 the messages stay after STOP (viewers are closed, history() sends
      // nothing while not live) so the relay's uploader can write the last minute into the Chat Doc; the next GO LIVE empties them
      const nowT = Date.now();
      if (b.live) {
        this.sql.exec("DELETE FROM m");
        this.sql.exec("DELETE FROM c"); this.sql.exec("DELETE FROM e"); this.sql.exec("DELETE FROM cm"); this.set("stop", 0);
        this.set("live", "1"); this.set("since", Date.now()); this.set("sid", clean(b.sid, 40));
        this.all({ t: "reset" });
      } else {
        this.set("stop", nowT); this.sql.exec("UPDATE c SET t1 = ? WHERE t1 IS NULL", nowT);
        this.sql.exec("INSERT INTO e (ts, n) VALUES (?, 0)", nowT);   // the statistics survive STOP until the next GO LIVE
        this.set("live", "0");
        this.all({ t: "end" });
        for (const w of this.ctx.getWebSockets("viewer")) try { w.close(1000, "end"); } catch (e) {}
      }
      return Response.json({ ok: true, live: this.live(), viewers: this.viewers() });
    }
    if (url.pathname === "/stats") return Response.json(this.stats());
    // 15.11.2026: the whole chat of the current (or last) stream, for the relay's Chat Doc (only through /api/relay with the relay key)
    if (url.pathname === "/chat") return Response.json(this.sql.exec("SELECT id, ts, name, text, band FROM m ORDER BY id").toArray().map((r) => ({ id: r.id, ts: r.ts, name: r.name, text: r.text, band: !!r.band })));
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
    let cid = 0;
    if (!band) {
      const vid = clean(request.headers.get("x-sb-vid"), 40) || "anon", cc = clean(request.headers.get("x-sb-cc"), 3) || "?", dev = clean(request.headers.get("x-sb-dev"), 10) || "?";
      cid = this.sql.exec("INSERT INTO c (vid, t0, t1, cc, dev) VALUES (?, ?, NULL, ?, ?) RETURNING id", vid, Date.now(), cc, dev).one().id;
    }
    ws.serializeAttachment({ role, r: [], cid });
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
    this.sql.exec("INSERT INTO cm (ts, who, band) VALUES (?, ?, ?)", now, name, band ? 1 : 0);
    this.all({ t: "msg", m: { id, ts: now, name, text, band } });
  }
  left(ws) { const a = ws.deserializeAttachment(); if (a && a.cid) this.sql.exec("UPDATE c SET t1 = ? WHERE id = ? AND t1 IS NULL", Date.now(), a.cid); }
  async webSocketClose(ws, code) { this.left(ws); try { ws.close(1000, "bye"); } catch (e) {} this.count(ws); }
  async webSocketError(ws) { this.left(ws); try { ws.close(1011, "error"); } catch (e) {} this.count(ws); }
}
