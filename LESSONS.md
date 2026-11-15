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

## 15.11.2026: ONE sound drawer replaces the bottom sound bar (live/ui.js, live/index.html, ui.js?v=6)
- 15.11.2026: Marko wanted one control, not a bar plus a button: the speaker is the FIRST round button (wrapper `.sw` in #bar), tapping it slides drawer #sd UP with a vertical VOLUME fader, a vertical ZOOM fader (1x to 3x, `video{transform:scale(var(--z))}`, centred, reset in the mini window) and MUTE at the base. Closes on a second tap on the speaker, a tap outside, the 4 s auto-hide, Hide, or a tap on the picture.
- 15.11.2026: faders are div role=slider on pointer events with setPointerCapture (44 px wide, 110 to 180 px tall by viewport height, arrow keys work), not `<input type=range>` rotated: vertical range inputs differ per browser. localStorage sb.vol / sb.muted / sb.zoom, all in try/catch. iOS (video.volume ignored, read back after setting 0.5) gets no volume fader; MUTE and zoom stay.
- 15.11.2026: the LOW DELAY pill belongs to player.js (#lowd, top right), written by another worker the same hour; my first sound bar had a LOW DELAY button of the same worker inside it, which went when the bar went. Two workers on live/ui.js: the other's uncommitted hunks disappeared from the working tree between two of my edits (they were committed under player.js only). Always `git status`/`git diff HEAD` right before editing a shared file, and re-run the edit script against the new HEAD.
- 15.11.2026: a local test with the new HLS-default player.js cannot unmute (no real media: play() fails, sb-sound-blocked re-shows TAP FOR SOUND); the test replaces `sbPlayer.setMuted` with a plain `v.muted=` to exercise the drawer.

## 15.11.2026: HLS for everyone, and why Cloudflare cannot simply cache MediaMTX
- 15.11.2026: an open page only runs the code it loaded. To move open viewers to a new player without waiting for a reload, use what the
  OLD code already does on its poll: the old player reloads to `j.view` when `j.via` is not relay/studio, so /api/live answers via "switch"
  only to old pages (no `?c=` marker, Referer /live/). Guard against loops (a Referer still carrying &switch is never moved again).
- 15.11.2026: a Pages Function CAN fetch https://relay.ples-duse.org:8888 (grey-cloud host, non-standard port): the port is not the problem.
- 15.11.2026: MediaMTX HLS answers 302 cookieCheck, then gives every reader a session (?session=… on each URI, cookie hlsSession), and a
  session is BOUND TO THE CLIENT IP: the same session id from another address answers 401 (tested: VM localhost with the Mac's session → 401).
  Cloudflare Worker subrequests leave from changing addresses, so playlists work but segments 401. Do not "fix" it with trustedProxies +
  X-Forwarded-For: any Cloudflare Worker could then claim 127.0.0.1, and 127.0.0.1 has the API permission without a password.
- 15.11.2026: the clean doors: (a) a Cloudflare Tunnel (cloudflared on the VM, outbound only, no Oracle port), ingress limited by path to
  ^/santoshi/[A-Za-z0-9_.-]+\.(m3u8|mp4)$ → https://localhost:8888, every request from one address; needs Marko's Cloudflare authorization
  (cloudflared login, or a token with Tunnel + DNS edit). (b) a small reverse proxy on the VM on 2083/2087/2096, same path limit, needs an
  Oracle ingress rule (Marko's approval). Then point RELAY_HLS for the Function at it.
- 15.11.2026: LL-HLS through a Function is about 20 requests a second per viewer (2 playlists + 2 parts every 0.2 s); plain HLS with 2 s
  segments is about 2. Every request, HIT or not, is a Function invocation (free plan: 100 000 a day ≈ 14 viewer-hours of plain HLS).
  Serve plain HLS from the cache; LL stays possible straight from the relay.
- 15.11.2026: a test headless Chrome with autoplay allowed played the concert out of Marko's speakers: always --mute-audio, kill it and
  the local server at the end of the test, check with pgrep. Port 8765 is Queen's, not free for test servers.
- 15.11.2026: two workers in one working tree: keep your UI in your own file (the LOW DELAY pill went into player.js, not ui.js), stage only
  your hunks, `git pull --rebase` before every commit and push.

## 15.11.2026: the site has TWO viewers and they now share ONE module
- 15.11.2026: the home page's live banner (functions/_middleware.js) had its own controls (sbctl.js outside an iframe, a second SBChat socket, an OVERLAY switch), so none of the /live/ work (HLS default, speaker drawer, zoom, LOW DELAY, 5 s fade) reached the page Marko watches. Now the banner iframe loads `/live/?p=santoshi&ui`: the SAME live/player.js + live/ui.js; `&ui` switches on the full controls inside a frame (plus FULL SCREEN, no exit door). sbctl.js remains only for the admin SENDER and a VDO.Ninja source.
- 15.11.2026: any change to the player or its controls goes into live/ only and is checked on EVERY importing page (home, /live/, admin camera view) before deploy. See TAKEOVER "One player module".
- 15.11.2026: no hide/overlay button anywhere; controls come on tap, click, mouse move or key, go 5 s after the last one (ui.js showBar; sbctl.js wake()). A frame does not see the parent's mouse, so the drawer also closes on the frame's window blur.
- 15.11.2026: a caption burned into the picture (cloud mixer) cannot be moved by the page: while the controls show, the picture shrinks by a bottom strip (`#stage.ctl video`), so the caption sits above the buttons; the status line is hidden then.
- 15.11.2026: small frames (home page on a phone: 366x206) cannot hold a vertical drawer above the buttons: under 360 px of height the drawer fills the frame (faders left, MUTE and DONE right). Test a banner locally by evaluating the BANNER template from the middleware into index.html.

## 15.11.2026 (evening): HLS only, two drawers, chat beside the picture, tap toggles (live/ module, ui.js?v=9, player.js?v=7)
- 15.11.2026: viewers get HLS ONLY: no LOW DELAY pill, no `?low`, no sb.low, no WHEP in live/player.js. hls.js: startLevel 99 then `currentLevel = top` on MANIFEST_PARSED (locked), capLevelToPlayerSize false, maxBufferLength 30 (max 60), liveSyncDurationCount 4, liveMaxLatencyDurationCount 10, lowLatencyMode false; 3 `bufferStalledError` within 60 s release the lock to automatic. A failure only reloads HLS (retry 3, 5, 8, 10 s). Server-side relay/whep fields in functions/api/live.js stay (the camera sender).
- 15.11.2026: the relay HLS carries OPUS audio (48 kHz stereo) with H.264 Constrained Baseline 1280x720 (ffprobe), one rendition. Safari's native HLS does not play Opus reliably; hls.js on iOS 17.1+ uses ManagedMediaSource and may; untested on a real iPhone. Fix for the master: AAC audio from the relay/mixer (VM change, not done here).
- 15.11.2026: the picture never resizes: the 88 px "controls strip" invention is gone; controls overlay the picture. Chrome's own PiP hover button was the "detach": the video has `disablePictureInPicture` and ui.js lifts it only inside the PiP button's handler.
- 15.11.2026: two drawers: speaker (VOLUME, MUTE) and "Zoom and move" (ZOOM 1-3x, PAN X, PAN Y, RESET). Pan is a fraction (-1..1) of the room the zoom leaves, so the picture can never leave the frame and survives resizes; disabled at 1x; drag-to-pan on the picture (pointer events; a drag does not toggle the controls). sb.zoom, sb.panx, sb.pany. A frame under 360 px tall gets a drawer that fills it (DONE closes); inside it the round row is covered, so click DONE before another button.
- 15.11.2026: CHAT beside or below the picture: ui.js sets body.cw (page >= 900 px wide: panel docked right 360 px) or body.cn (panel below, 320 px) while the panel is open (MutationObserver on its `hidden`). In the home page's frame the iframe cannot grow itself: ui.js posts {sbChat:'wide'|'narrow'|'closed'} to the banner script (functions/_middleware.js) which sets the wrapper to 1080 px wide (video stays 720x405) or adds 320 px of height. Full screen is the whole document so the chat can sit beside; upright full screen closes the chat.
- 15.11.2026: a tap on the picture TOGGLES the controls: only `click` on #hit (no pointerdown/touchstart handlers, they would show first and hide on the click); mouse moves are ignored for 1.2 s after a hide-by-tap; keys show.
- 15.11.2026: test traps: `[aria-label=Volume]` also matches the drawer group, use `.ft[aria-label=Volume]`; in zsh loop over "a b c" with `${=a}`; measure the video with offsetWidth/offsetHeight (getBoundingClientRect includes the zoom transform).

## 15.11.2026 (domain)

- 15.11.2026: a Pages custom domain on the same Cloudflare account can be attached entirely from the deploy workflow (token already there): POST .../pages/projects/<p>/domains, then proxied CNAMEs on the zone; the local API file had no working token, so use the GitHub secret through a soft-failing workflow step.
- 15.11.2026: www -> apex as a Host check in the Pages middleware needs no zone rule or extra token right; Response.redirect(url, 301) keeps path and query.
- 15.11.2026: a fresh domain shows status "initializing/pending" for minutes while the certificate is issued; curl gives 000 until DNS and TLS are ready.
- 15.11.2026: the admin Google sign-in needs the new origin added to the OAuth client; the room door's Origin check already uses the request's own origin, so it follows the domain.
