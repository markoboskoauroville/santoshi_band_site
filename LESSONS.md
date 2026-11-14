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
