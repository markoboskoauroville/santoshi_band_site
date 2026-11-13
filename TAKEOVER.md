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
