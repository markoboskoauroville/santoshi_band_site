# santoshi_band_site

The published files of the Santoshi Kirtan Band's websites, and nothing else:
- https://santoshi-band.pages.dev (index.html, img/, audio/v2, with SEO pages made at deploy by tools/seo.py)
- https://mantrasantoshiconcerts.pages.dev (concerts/)

Every push to main deploys both through GitHub Actions (public repository, so the build minutes are free).
The workshop (events.json → page builder, drafts, band notes, QC) is the private repository santoshi_band; its
`tools/publish_site.sh` copies the built page here and pushes. Edit there, not here.
