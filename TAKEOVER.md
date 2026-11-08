# TAKEOVER: santoshi_band_site (8.11.2026)

Made because GitHub stopped private-repo builds (failed payment / spending limit) and Marko said: "To continue for free, you
need to make a repository public." The private santoshi_band holds band members' emails and message drafts, so instead
of making it public, only the published files moved here. Secrets: CLOUDFLARE_ACCOUNT_ID (set by Claude) and
CLOUDFLARE_API_TOKEN (pasted by Marko). Flow: edit in santoshi_band → tools/build_pages.py → tools/publish_site.sh → push here
→ Actions deploys. Check after each deploy: /coming-up/ shows the newest report, images answer image/jpeg.
