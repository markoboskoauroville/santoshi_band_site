# LESSONS: santoshi_band_site

- 8.11.2026: never make the workshop repo public: it holds people's emails and WhatsApp drafts. Publish only the output.

## 13.11.2026

- 13.11.2026: never put a stream or Drive address in public code (live.js); read it from the KV/config at runtime.
- 13.11.2026: a provisioning script must soft-fail when the token lacks a right (KV) and still set the secrets.
- 13.11.2026: a route rule order can shadow a 410 rule (hero images): test the old URLs after a routes change.

## 14.11.2026

- 14.11.2026: chat and presence never in KV (eventual consistency, ~1000 writes/day free): one SQLite Durable Object with hibernating
  WebSockets; the open sockets are the count, ping answered by setWebSocketAutoResponse so idle viewers do not wake it.
- 14.11.2026: a worker reached only through a service binding (workers_dev = false) can trust headers, but only if the Pages door
  builds a NEW header set (copy the WebSocket headers, then add its own); never forward the visitor's headers wholesale.
- 14.11.2026: an admin WebSocket seat by cookie also needs an Origin check (cross-site WebSocket hijacking).
- 14.11.2026: `if ! cmd | tee log` in a workflow needs `set -o pipefail`, the default shell is `bash -e` without it.
- 14.11.2026: `.sbc form{display:flex}` beats the [hidden] attribute; add `[hidden]{display:none!important}` in the component's CSS.
- 14.11.2026: wrangler dev + wrangler pages dev --service ROOM=<worker> test the whole Pages + Durable Object path offline, and an
  admin cookie can be minted locally with a throwaway SESSION_SECRET binding.
- 14.11.2026: "the button does nothing" is first a script that never ran: read the console (adb DevTools on the phone) before suspecting
  popups, origins or cookies. One stray `)` in admin/live.js killed the sign-in for everyone. Every deploy now runs `node --check` first.
- 14.11.2026: a GIS token client needs an error_callback; without it a blocked or closed popup is silent.

- 14.11.2026: a bearer device token for an app is stored only as its SHA-256 in KV (never the token), looked up by hash and compared constant-time; the public repo then holds no secret.

## 15.11.2026

- 15.11.2026: a WebRTC relay on a VM that is also a Tailscale node must offer only its public address (listeners on the Oracle interface):
  with Tailscale candidates, phones and Macs on Tailscale picked IPv6 link-local Tailscale pairs that dropped every 5–30 s.
- 15.11.2026: MediaMTX publishes a WebRTC path with only the tracks it saw within webrtcTrackGatherTimeout (2 s): a phone's H.264 can come
  later than its Opus, and the path is then audio only. 8 s fixed it.
- 15.11.2026: drive.file (rclone, the admin page) means each app sees only its own Drive files: the VM keeps its own folder tree.
- 15.11.2026: rclone's shared Google client has a tiny per-minute quota (403 "Queries per minute"): batch the files into one rclone call
  and use 64 MB chunks, or the uploads crawl at ~3 Mbit/s.
- 15.11.2026: sbctl's sound button toggles "&muted" in the iframe's src, so the relay's view URL carries another parameter first
  (/live/?p=santoshi&muted): "?muted" alone would never be removed.

## 15.11.2026 (live full view)

- 15.11.2026: `firefoxctl click` is a JS click, not a pointer event: a "tap to show" layer must listen to `click` as well as `pointerdown`, or the test (and keyboard-synthesised clicks) never reach it.
- 15.11.2026: sbchat.js can drive a player that has no sbctl bar: `SBChat(wrap)` appends its own CHAT button to the wrap (hide it with CSS) and returns `{conn, show}`, so another control row can open the panel.
- 15.11.2026: a full-view page and its own iframe use the same file: branch on `window.top !== window` before adding UI, so the banner's embedded copy is unchanged.
- 15.11.2026: Gemini worker with seven single-person portrait refs and "exactly seven people" in the prompt gave seven sleepers first time, 64 s; it lays the djembe on its side when the prompt says "leaning on it": say "sitting behind it, upright, between his knees" next time.

## 15.11.2026: the Studio gear
- live/studio.js owns the Studio HLS (hls.js 1.5.13) and the ⚙ round button; player.js only hands over when /api/live says via "studio"
  (or ?studio for tests). Another worker's uncommitted player.js change was left in the working tree: only our hunks were staged
  (hash-object + update-index), so their work was never committed under our name nor overwritten.
- Six round buttons do not fit a 390 px phone at 56 px with 12 px gaps: under 440 px they are 48 px with 8 px gaps.
- Players are tested in a headless Firefox (own profile, BiDi port 9333): a background tab in Marko's Firefox keeps the video paused.

## 15.11.2026: audio drops on the live stream, measured (Sound Link → Pixel → relay → viewer)
- Viewer leg in Firefox over the Mac's 4G SIM, audio-only WHEP probe + getStats: before, 1.5 % loss, 5.2 s concealed and 2.5 s
  time-compressed in 168 s, click arrival std 43 ms, holes up to 0.6 s in the first 15 s (the browser's buffer starts near 100 ms and
  the line delivered 11 to 85 packets a second). player.js now sets `receiver.jitterBufferTarget = 400` on both WHEP tracks
  (Firefox 160 and Chrome take it; wrapped in try). After: 0.6–0.95 % loss, 1.5–1.9 s concealed, 0.4–0.5 s compressed, one or
  three holes of 80–210 ms, all on the viewer's own line (the relay recording had none at the same seconds).
- An audio-only WHEP client (one recvonly audio transceiver) costs about 3 MB for three minutes: measure audio that way on the SIM.

## 15.11.2026: "0 watching" on /live/
- 15.11.2026: the count is the open viewer WebSockets of the Durable Object (not KV, no heartbeat; the 25 s "ping" is auto-answered).
  The server was right (two sockets → count 2, also after hibernation). The only way a page shows 0 is the BAND SEAT: /api/room gave x-sb-admin
  (not counted) to every signed-in admin socket, so Marko watching /live/ while signed in was "nobody". Now only a socket opened with
  ?band=1 (admin/live.js passes it) can take the seat; the public player never asks. Cause found by reading, not reproduced (no live stream at the time).
- Test a count with two `new WebSocket('wss://…/api/room?vid=x', {headers:{origin:…}})` in node 24 (no browser needed).

- 15.11.2026: /admin opens on LIVE (Marko: live is used more often). Tab buttons LIVE, PICTURES; p2 (LIVE) is before p1 and has class "on"; tab() in live.js is id-based so order needs no JS change. Sign out lives inside the LIVE pane.

## 15.11.2026: Hide on /live/ hides everything
- 15.11.2026: Hide used to hide only the round bar (the chat panel, "N watching" badge and studio menu stayed). It now sets `body.clean` (ui.js clean()), and one CSS rule in live/index.html hides #bar, #gm, .sbc, .sbc-badge, #st, #minihint. A tap/click on the picture (#hit), any key, or Esc removes it; the 4 s auto-hide is unchanged; the TAP FOR SOUND overlay (#ov) is untouched and `sb-sound-blocked` clears clean.
- 15.11.2026: a new overlay added later must be added to that one CSS rule, or Hide will leave it behind.
- 15.11.2026: the open chat panel (up to 380 px, fixed) covers the round bar on a phone, so Hide cannot be tapped while chat is open (close it with its ✕ first); clean() also closes the chat.
- 15.11.2026: test a local /live/ in headless Chrome with python3 http.server plus a tiny handler answering /api/live with {"live":true,"relay":{...}} and ?force; drive it over CDP (Input.dispatchMouseEvent / dispatchKeyEvent), read computed styles.
- 15.11.2026: two pushes seconds apart start two parallel deploy runs and the OLDER commit can finish last and become production (the first run served ui.js?v=2 after the new commit's run was green). Push once, or after a green run check the live cache-buster and `gh run rerun` the newest run if it is old.

## 15.11.2026: sound bar (MUTE + volume slider) on /live/
- 15.11.2026: WHEP, LL-HLS and the Studio ladder all play in the one `<video id="v">`, so ui.js sets `v.volume` / `v.muted` directly; no per-path code. The bar #vol (live/ui.js, CSS in live/index.html) sits above the round buttons, fades with them (4 s, Hide, clean) and is hidden while the studio menu #gm is open (`:has`).
- 15.11.2026: localStorage `sb.vol` (0-1) and `sb.muted` ('1' only when the viewer pressed MUTE / dragged to 0), all in try/catch. TAP FOR SOUND gives sound unless the viewer last chose MUTE; a tap on the picture unmutes a page that started muted unless the viewer chose MUTE.
- 15.11.2026: iOS Safari ignores `video.volume` (always 1): there the slider has no effect and the device buttons rule; not testable here.
- 15.11.2026: tested in headless Chrome over CDP: slider click at 30 % gave volume 0.29, MUTE toggles, state survives reload, no console errors. One push for the momentaryupdates and code commits avoids the parallel-deploy race.
