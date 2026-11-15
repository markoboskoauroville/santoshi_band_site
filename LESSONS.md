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
