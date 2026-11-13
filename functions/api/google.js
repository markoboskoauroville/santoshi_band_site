import { googleEmail, makeSession, cookieFor, json, admins } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  const { access_token = "" } = await request.json().catch(() => ({}));
  const email = await googleEmail(access_token);
  if (!email) return json({ error: "google" }, 401);
  if (!admins(env).includes(email)) return json({ error: "not allowed" }, 403);
  return json({ ok: true, email }, 200, { "set-cookie": cookieFor(await makeSession(env, email), 30 * 86400) });
}
