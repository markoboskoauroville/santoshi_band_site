#!/bin/bash
# Publishes santoshi.markobosko.org (the page, img/, audio/, with SEO pages) and santoshi-concerts.markobosko.org
# (concerts/). Run by GitHub Actions on every push to main; needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$(mktemp -d)"
# SITE_DOWN (16.11.2026, Marko: "we are taking the website down"): only the gray page down/ is published, with no
# Functions and no 404.html, so every address answers with it. The concerts site is not touched. Delete SITE_DOWN to restore.
if [ -f "$ROOT/SITE_DOWN" ]; then
  (cd "$ROOT/down" && npx --yes wrangler@3 pages deploy "$ROOT/down" --project-name santoshi-band --branch main --commit-dirty=true)
  (cd "$ROOT/concerts" && npx --yes wrangler@3 pages deploy "$ROOT/concerts" --project-name mantrasantoshiconcerts --branch main --commit-dirty=true)
  rm -rf "$OUT"; exit 0
fi
V=$(grep -o 'audio/v[0-9]*/' "$ROOT/index.html" | head -1)
for n in 01 02 03 04 05 06 07 08; do [ -s "$ROOT/${V}$n/index.m3u8" ] || { echo "STOP: ${V}$n/index.m3u8 is missing"; exit 1; }; done
cp "$ROOT/index.html" "$ROOT/_headers" "$ROOT/sbctl.js" "$ROOT/sbchat.js" "$OUT/"; cp -r "$ROOT/img" "$ROOT/audio" "$OUT/"
# /admin (13.11.2026): sign-in page + its scripts only; the pictures are NOT published, they live in KV behind the sign-in
cp -r "$ROOT/admin" "$OUT/"; cp "$ROOT/_routes.json" "$OUT/"
# /live (15.11.2026): the own player of the Santoshi relay (WHEP + LL-HLS), shown in the live banner's iframe
cp -r "$ROOT/live" "$OUT/"
python3 -I "$ROOT/tools/seo.py" "$OUT"
(cd "$ROOT" && npx --yes wrangler@3 pages deploy "$OUT" --project-name santoshi-band --branch main --commit-dirty=true)
(cd "$ROOT/concerts" && npx --yes wrangler@3 pages deploy "$ROOT/concerts" --project-name mantrasantoshiconcerts --branch main --commit-dirty=true)
rm -rf "$OUT"
