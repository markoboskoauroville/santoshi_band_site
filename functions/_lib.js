// Server half of the Santoshi Band site's /admin (13.11.2026). Google sign-in as MANTRA_MANIFEST modules/gmail-login.md
// (client "Mantra pages", public by design). Secrets, all Cloudflare Pages secrets, none in this repo:
// SESSION_SECRET, ADMIN_EMAILS (comma separated). Storage: the KV binding "KV" (live flag, private pictures).
export const json = (d, status = 200, h = {}) =>
  new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...h } });
export const GOOGLE_CLIENT_ID = "260195292447-iucr95n1oc2burmm9o598ilh43vhompd.apps.googleusercontent.com";
export const admins = (env) => String(env.ADMIN_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function hmac(env, text) {
  const k = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET || "unset"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
}
export async function googleEmail(token) {
  if (!/^[\w.\-~+/]{20,4096}=*$/.test(token || "")) return null;
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(token));
  if (!r.ok) return null;
  const t = await r.json();
  if (t.aud !== GOOGLE_CLIENT_ID && t.azp !== GOOGLE_CLIENT_ID) return null;
  if (String(t.email_verified) !== "true" || !t.email || Number(t.expires_in) <= 0) return null;
  return t.email.trim().toLowerCase();
}
export async function makeSession(env, email) {
  const body = encodeURIComponent(email) + "|" + (Date.now() + 30 * 864e5);
  return body + "|" + (await hmac(env, body));
}
export async function readSession(env, request) {
  if (!env.SESSION_SECRET) return null;
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sbadm=([^;]+)/);
  if (!m) return null;
  const p = m[1].split("|");
  if (p.length !== 3 || (await hmac(env, p[0] + "|" + p[1])) !== p[2] || Number(p[1]) < Date.now()) return null;
  const email = decodeURIComponent(p[0]);
  return admins(env).includes(email) ? { email } : null;
}
export const cookieFor = (v, maxAge) => `sbadm=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const rnd = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
// the live flag: a fresh stream id and password per GO LIVE, so a stranger never holds a working one; forgotten flags die after 12 h
export async function getLive(env) {
  try { return env.KV ? JSON.parse((await env.KV.get("live")) || "null") : null; } catch { return null; }
}
export const newLive = () => ({ id: "sb" + rnd(6), pw: rnd(6), since: Date.now() });
export const viewUrl = (l) => `https://vdo.ninja/?view=${l.id}&password=${l.pw}&cleanoutput&autoplay&muted`;
export const pushUrl = (l) => `https://vdo.ninja/?push=${l.id}&password=${l.pw}&webcam&autostart&cleanoutput`;
