# TAKEOVER: santoshi_band_site (8.11.2026)

Made because GitHub stopped private-repo builds (failed payment / spending limit) and Marko said: "To continue for free, you
need to make a repository public." The private santoshi_band holds band members' emails and message drafts, so instead
of making it public, only the published files moved here. Secrets: CLOUDFLARE_ACCOUNT_ID (set by Claude) and
CLOUDFLARE_API_TOKEN (pasted by Marko). Flow: edit in santoshi_band → tools/build_pages.py → tools/publish_site.sh → push here
→ Actions deploys. Check after each deploy: /coming-up/ shows the newest report, images answer image/jpeg.

## 13.11.2026: /admin with login, PICTURES and LIVE
- Cloudflare Pages Functions (functions/): Google sign-in (client "Mantra pages", modules/gmail-login.md), signed cookie sbadm; only the
  addresses in the secret ADMIN_EMAILS get in (GitHub secret, pushed to Pages by tools/provision.py; none in this repo).
- PICTURES: the reference sheets are no longer published; they live in the KV namespace "santoshi-band" (keys pic:*) and are served only
  by /api/pics behind the login. The private source stays in the repo santoshi_band (refs/sheets). The first deploy moved them from git
  history into KV. They are STILL in this public repo's history until history is rewritten (needs Marko's OK).
- LIVE: GO LIVE makes a fresh VDO.Ninja stream id + password (KV key live, 12 h expiry), opens the camera, sends as VDO.Ninja push in
  an iframe, and records the same camera in 5 s pieces to Drive "Santoshi Band live / YYYY-MM-DD HH-MM" (as MPA's rec.js). The
  middleware injects the banner + viewer at the top of every public HTML page while the flag exists (HTMLRewriter), GET /api/live is public.
- Needs once: origin https://santoshi-band.pages.dev in the Google client's Authorised JavaScript origins (Cloud project mantra-login-513105).

## State at close, 13.11.2026

13.11.2026: admin with Google login, private PICTURES in KV, LIVE tab with VDO.Ninja, live banner, Drive recording; overlay controls on the live viewer and sender (double-tap full screen, landscape lock, Esc). live.js carries no address in public code; provision soft-fails when the token has no KV rights; /img/band/hero* reaches the 410 rule again. Another agent is changing the LIVE UI: this note is docs only. The Chrome window sending the live stream (VDO.Ninja) must stay open.

## 14.11.2026: live chat, watching count, chat as a Google Doc

Request word for word in momentaryupdates.md (14.11.2026).
- **The room**: room/worker.js, worker `santoshi-live-room`, ONE Durable Object (SQLite-backed, free plan) named "santoshi". Every open
  viewer page holds one WebSocket to it: the open viewer sockets are the watching count; the same socket carries the chat. Messages of the
  current stream in its SQLite table (last 200 sent to a newcomer, 1000 kept), emptied at GO LIVE and STOP; STOP also sends "end" and
  closes the viewers. Limits in the room: name 1-30, text 300, 5 messages per 10 s and 0.7 s apart per connection, visitors cannot be
  named "Santoshi Band"/"admin"/"moderator", chat only while live. Why not KV: eventually consistent and ~1000 writes/day on the free plan.
- **No public address**: workers_dev and preview URLs off; Pages reaches it only through the service binding ROOM (tools/provision.py
  binds it after the workflow step "Deploy the live room" succeeds, `npx wrangler@4 deploy` in room/). The token has the Workers rights
  (run 43625803479: "Uploaded santoshi-live-room", "room bound as ROOM").
- **The door**: functions/api/room.js (public in the middleware's OPEN list) forwards only the WebSocket headers and sets the two headers
  the room trusts: x-sb-admin (signed-in admin AND Origin = this site; the band seat, not counted) and x-sb-sid (the KV live flag).
  functions/api/live.js tells the room at GO LIVE / STOP (POST /state).
- **Viewer UI**: sbchat.js (published by tools/deploy.sh), loaded by the banner after sbctl.js: badge "N watching" top left of the
  picture, CHAT button in the overlay bar (red dot for new messages), side panel (full width up to 380 px, inside the picture while in
  real full screen), name first (localStorage sb.chatname, try/catch), then list + input; ✕ / Esc close; reconnects 1 s → 15 s;
  https://santoshi-band.pages.dev/#chat opens the panel at once. All user text by textContent.
- **Admin**: LIVE tab shows CHAT · N watching under the sender and the badge on the sender picture; write as "Santoshi Band" or "Marko"
  (remembered). The Google Doc: admin/live.js saveDoc() — at GO LIVE a multipart upload (text/html → application/vnd.google-apps.document)
  named "Santoshi live chat YYYY-MM-DD HH-MM" into the recording folder, then files.update (uploadType=media, text/html) every 45 s when
  something new came in, and once more at STOP before the room is emptied. Uses the same drive.file token as the recording. A page
  reloaded in the middle of a stream rejoins the chat but makes no Doc (it no longer knows the folder).
- **Tests 14.11.2026**: locally (wrangler dev + pages dev) the full path GO LIVE → admin seat → 2 viewers → chat both ways → forged
  headers refused → STOP "end"; on production the count 1→2→1, forged x-sb-admin ignored, chat refused while not live, ping/pong.
  Not testable without Marko: the camera stream with real viewers and the Google Doc in his Drive.

## State at close, 14.11.2026

Chat and watching count deployed (run 43625803479, green). Waiting for Marko: one real GO LIVE on the phone with a second device
watching, to check the badge, the chat both ways and the Doc "Santoshi live chat …" in Drive next to the pieces.

## 14.11.2026: "Sign in with Google" did nothing (fixed)

- **Cause**: commit 232e85f (chat Doc) left a stray `)` in admin/live.js saveDoc() (`…next try in 45 s')});`). The whole script was a
  SyntaxError (Chrome DevTools on the Pixel: "Unexpected token ')'" live.js line 105), so the button never got its click handler, on
  every browser, phone and desktop. Not the popup, not the origin, not the cookie: the origin is accepted and the cookie works.
- **Fix**: the `)` removed (live.js?v=4, then v=5); the workflow now runs `node --check` on every script before deploying (a syntax error
  stops the deploy); the sign-in has an error_callback, so a blocked/closed Google window and "Opening Google…" show under the button.
- **Proof on the Pixel 7, 14.11.2026**: Chrome: tap → account chooser → the auroville.community account → PICTURES/LIVE with the
  sheets (/api/google 200, /api/pics 200). Brave and Firefox: tap → Google's own chooser opens (the popup works) → Google asks for the
  account password, because those browsers are not signed in to Google. Marko types it once in each; then the same tap signs in.
- If a phone browser ever loses the popup's answer, the robust way is a full-page redirect, which needs a redirect URI added to the
  client "Mantra pages" (Google Cloud console, Marko) and a /api/google callback; not built, because the popup works.

## 14.11.2026: camera pairing API (Mantra Manual Camera starts GO LIVE without a browser)

- **Pair**: /admin > LIVE > PAIR CAMERA (admin cookie). POST /api/cam {action:"pair",name} makes a 32-byte base64url device token, KV keeps
  only its SHA-256 as `camtoken:<hex>` → {name, created, hash}; the token is shown once as text + QR (qrcodejs 1.0.0 from cdnjs) carrying
  `mantracam://pair?site=https://santoshi-band.pages.dev&token=<token>`. GET /api/cam lists, POST {action:"revoke",id} removes (REVOKE button).
- **Use**: POST /api/live with `Authorization: Bearer <token>` (or the sbadm cookie as before), body {action:"go"|"stop"|"status"}.
  Response when live: {live:true, source:"camera"|"browser", view, since, room, id, password, push, name?(camera)}; not live: {live:false, room}.
  `id`+`password` are the VDO.Ninja `?push=<id>&password=<pw>` values. No/bad auth: 401 {error:"login"}. GET /api/live stays public and unchanged.
- KV `live` now has `source` and (camera) `name`. While a camera is live the admin gets no push address (no second publisher): the page
  says "LIVE from camera <name>", its own iframe does not start. Banner and viewer are identical for both sources.
- Token compare: lookup by hash plus a constant-time compare (safeEq in _lib.js). No new secret.
