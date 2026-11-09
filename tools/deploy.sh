#!/bin/bash
# Publishes santoshi-band.pages.dev with ONLY the site's files (the page, its pictures and audio), never the working
# notes (band/, MESSAGES/, README, TAKEOVER, tools, *.json data). Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$(mktemp -d)"
# The player's audio must be here before anything goes out (27.10.2026: a publish without audio/v3, which is not in
# git, silenced the player). Every song the page asks for needs its playlist.
V=$(grep -o 'audio/v[0-9]*/' "$ROOT/index.html" | head -1)
for n in 01 02 03 04 05 06 07 08; do
  [ -s "$ROOT/${V}$n/index.m3u8" ] || { echo "STOP: ${V}$n/index.m3u8 is missing; rebuild it (TAKEOVER: the in-the-box full mix)"; exit 1; }
done
cp "$ROOT/index.html" "$ROOT/_headers" "$OUT/"
cp -r "$ROOT/img" "$ROOT/audio" "$OUT/"
# hidden admin gallery (9.11.2026): /admin + the sheet JPGs (never PNGs); index.json rebuilt here; not in seo.py's sitemap
mkdir -p "$OUT/refs/sheets"; cp -r "$ROOT/admin" "$OUT/"
mkdir -p "$ROOT/refs/sheets"; python3 -I "$ROOT/tools/sheets_index.py" "$ROOT/refs/sheets"
cp "$ROOT/refs/sheets/"*.jpg "$ROOT/refs/sheets/index.json" "$OUT/refs/sheets/" 2>/dev/null || true
python3 -I "$ROOT/tools/seo.py" "$OUT"   # own address per page, structured data, sitemap
npx --yes wrangler@3 pages deploy "$OUT" --project-name santoshi-band --branch main --commit-dirty=true
rm -rf "$OUT"
