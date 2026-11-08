"""Search engine work for santoshi-band.pages.dev, run by tools/deploy.sh on the folder it publishes.
   python3 -I tools/seo.py <out dir>
- every page of the site gets its own address (/songs/ …): a copy of index.html with its own title, description,
  canonical link and the page it opens on (window.SANTOSHI_PAGE); the in-page menu keeps working as before;
- structured data (schema.org JSON-LD): the band and its members, the live album and its tracks, the coming concerts;
- robots.txt, sitemap.xml, and the IndexNow key so Bing (and Yandex, Seznam …) can be told at once."""
import json, os, re, sys, html
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = sys.argv[1]; SITE = "https://santoshi-band.pages.dev"
INDEXNOW_KEY = "5a7d1c9e3b8f4e2a9c6d0b1f7e4a2c8d"
J = lambda f: json.load(open(os.path.join(ROOT, f)))
e = html.escape

PAGES = {  # path: (route, title, description)
 "": ("coming", "Santoshi Band",
      "Santoshi Kirtan Band from Zagreb sings kirtan and bhajans: where to sing with us next, and every concert so far. Listen to our live concerts and sing along."),
 "player/": ("player", "Santoshi Band",
      "Listen to the whole Navaratri concert of Santoshi Kirtan Band, 17 October 2026, Czech National House, Zagreb: eight bhajans, 1 h 41 min."),
 "video/": ("video", "Santoshi Band",
      "Watch Santoshi Kirtan Band: the Navaratri concert in Zagreb, 17 October 2026, and every video of the band, by theme."),
 "coming-up/": ("coming", "Santoshi Band",
      "Where to hear Santoshi Kirtan Band next: kirtan and bhajan nights in Zagreb, entry free, donations welcome. Come, sit, sing along."),
 "songs/": ("songs", "Santoshi Band",
      "Kirtan explained and every mantra we sing: the words in Sanskrit, what they mean in English and Croatian, and a recording of each."),
 "band/": ("band", "Santoshi Band",
      "Seven musicians from Zagreb: voices, guitars, bass, mridangam, harmonium, djembe and tambourine. Meet Santoshi Kirtan Band."),
 "equipment/": ("equipment", "Santoshi Band",
      "How a kirtan band records every concert: one rolling rack with the mixer, the camera tablet, microphones and cables, and the full list."),
 "photos/": ("photos", "Santoshi Band",
      "Photographs from Santoshi Kirtan Band's concerts in Zagreb."),
 "donate/": ("donate", "Santoshi Band",
      "Help Santoshi Kirtan Band keep singing and recording: how to give."),
}

band = J("band.json"); ev = J("events.json")["events"]
MONTHS = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
def iso(ev_en):
    m = re.search(r"(\d{1,2}) (\w+) (\d{4}) · (\d{1,2}:\d{2})(?:–(\d{1,2}:\d{2}))?", ev_en)
    if not m: return None, None
    d = f"{m.group(3)}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"
    return f"{d}T{m.group(4)}:00+01:00", (f"{d}T{m.group(5)}:00+01:00" if m.group(5) else None)
group = {"@type": "MusicGroup", "@id": SITE + "/#band", "name": "Santoshi Kirtan Band", "url": SITE + "/",
         "genre": ["Kirtan", "Bhajan", "Devotional music", "World music"], "foundingLocation": {"@type": "Place", "name": "Zagreb, Croatia"},
         "sameAs": ["https://www.instagram.com/santoshi_kirtan_band/"], "image": SITE + "/img/og.jpg",
         "member": [{"@type": "Person", "name": p["name"], "roleName": p["role"]["en"]} for p in band["players"]]}
tracks = re.search(r"const TRACKS = \[(.*?)\];", open(os.path.join(ROOT, "index.html")).read(), re.S).group(1)
tl = [(int(a), b, float(c)) for a, b, c in re.findall(r'\["(\d+)", "([^"]+)", ([\d.]+)\]', tracks)]
album = {"@type": "MusicAlbum", "name": "Live at the Navaratri Celebration", "byArtist": {"@id": SITE + "/#band"},
         "albumProductionType": "LiveAlbum", "datePublished": "2026-10-24", "url": SITE + "/player/", "image": SITE + "/img/poster.jpg",
         "numTracks": len(tl), "track": [{"@type": "MusicRecording", "position": n, "name": t,
         "duration": f"PT{int(s // 60)}M{int(s % 60)}S"} for n, t, s in tl]}
events = []
for v in ev:
    start, end = iso(v["date"]["en"])
    if not start: continue
    place = v["place"]; name, _, addr = place.partition(" · ")
    o = {"@type": "MusicEvent", "name": v["title"]["en"] + " · Santoshi Kirtan Band", "startDate": start,
         "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
         "location": {"@type": "Place", "name": name, "address": {"@type": "PostalAddress", "streetAddress": addr.replace(", Zagreb", ""),
                      "addressLocality": "Zagreb", "addressCountry": "HR"}},
         "performer": {"@id": SITE + "/#band"}, "url": SITE + "/coming-up/",
         "description": v.get("about", {}).get("en", ""), "image": SITE + "/" + v["poster"] if v.get("poster") else SITE + "/img/og.jpg"}
    if end: o["endDate"] = end
    o["organizer"] = ({"@type": "Organization", "name": "Embassy of India, Zagreb"} if "Embassy" in v["title"]["en"]
                      else {"@id": SITE + "/#band"})
    if "free" in (v.get("entry", {}).get("en", "") or "").lower():
        o["isAccessibleForFree"] = True
        o["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "EUR", "availability": "https://schema.org/InStock", "url": SITE + "/coming-up/"}
    events.append(o)
ld = {"@context": "https://schema.org", "@graph": [{"@type": "WebSite", "name": "Santoshi Kirtan Band", "url": SITE + "/", "inLanguage": ["hr", "en"]},
      group, album, *events]}
LD = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"

base = open(os.path.join(OUT, "index.html")).read()
def page(path, route, title, desc):
    s = base
    s = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(title)}">', s, count=1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">', s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{SITE}/{path}">', s, count=1)
    s = s.replace('<meta property="og:type" content="music.album">', '<meta property="og:type" content="website">' if route != "player" else '<meta property="og:type" content="music.album">')
    head = (f'<link rel="canonical" href="{SITE}/{path}">\n<meta property="og:site_name" content="Santoshi Kirtan Band">\n'
            f'<meta property="og:locale" content="hr_HR"><meta property="og:locale:alternate" content="en_US">\n'
            f'<meta name="robots" content="index, follow, max-image-preview:large">\n{LD}\n'
            f'<script>window.SANTOSHI_PAGE = "{route}";</script>\n')
    if path: head = '<base href="/">\n' + head
    s = s.replace("</head>", head + "</head>", 1)
    os.makedirs(os.path.join(OUT, path), exist_ok=True)
    open(os.path.join(OUT, path, "index.html"), "w").write(s)
for path, (route, title, desc) in PAGES.items():
    page(path, route, title, desc)

open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
from datetime import date
urls = "".join(f"  <url><loc>{SITE}/{p}</loc><lastmod>{date.today()}</lastmod><changefreq>{'weekly' if r in ('home','coming') else 'monthly'}</changefreq><priority>{'1.0' if not p else '0.8'}</priority></url>\n" for p, (r, *_) in PAGES.items())
open(os.path.join(OUT, "sitemap.xml"), "w").write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
open(os.path.join(OUT, INDEXNOW_KEY + ".txt"), "w").write(INDEXNOW_KEY)
print("seo:", len(PAGES), "pages,", len(events), "events,", len(tl), "tracks")
