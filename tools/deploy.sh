#!/bin/bash
# Publishes santoshi-band.pages.dev (the page, img/, audio/, with SEO pages) and mantrasantoshiconcerts.pages.dev
# (concerts/). Run by GitHub Actions on every push to main; needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$(mktemp -d)"
V=$(grep -o 'audio/v[0-9]*/' "$ROOT/index.html" | head -1)
for n in 01 02 03 04 05 06 07 08; do [ -s "$ROOT/${V}$n/index.m3u8" ] || { echo "STOP: ${V}$n/index.m3u8 is missing"; exit 1; }; done
cp "$ROOT/index.html" "$ROOT/_headers" "$ROOT/sbctl.js" "$OUT/"; cp -r "$ROOT/img" "$ROOT/audio" "$OUT/"
# /admin (13.11.2026): sign-in page + its scripts only; the pictures are NOT published, they live in KV behind the sign-in
cp -r "$ROOT/admin" "$OUT/"; cp "$ROOT/_routes.json" "$OUT/"
python3 -I "$ROOT/tools/seo.py" "$OUT"
(cd "$ROOT" && npx --yes wrangler@3 pages deploy "$OUT" --project-name santoshi-band --branch main --commit-dirty=true)
(cd "$ROOT/concerts" && npx --yes wrangler@3 pages deploy "$ROOT/concerts" --project-name mantrasantoshiconcerts --branch main --commit-dirty=true)
rm -rf "$OUT"
