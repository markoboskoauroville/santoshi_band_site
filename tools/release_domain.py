"""Run by the deploy workflow (17.11.2026, Marko: "please make my domain santoshiband.org free. I don't need it anymore ...
   Somebody else can take it over."). Idempotent, soft-fails, prints only names, types and statuses, never a value.
   It undoes what tools/domains.py did on 15.11.2026:
   1. removes santoshiband.org and www.santoshiband.org from the custom domains of the Pages project santoshi-band;
   2. deletes every DNS record of the zone santoshiband.org (apex, www, and live = the santoshi-hls tunnel of chromium-vm);
      the ZONE itself stays: a Cloudflare Registrar domain cannot live without its zone on Cloudflare;
   3. turns the Registrar's auto-renew OFF, so the domain simply runs out and anyone can register it after that;
      prints the expiry date. Cloudflare Registrar has no refund and no early release of a registration."""
import json, os, urllib.request, urllib.error
T, A, P, D = os.environ["CLOUDFLARE_API_TOKEN"], os.environ["CLOUDFLARE_ACCOUNT_ID"], "santoshi-band", "santoshiband.org"
def api(method, path, body=None):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4" + path, method=method,
        data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + T, "Content-Type": "application/json"})
    try: x = urllib.request.urlopen(r).read()
    except urllib.error.HTTPError as e: x = e.read()
    try: return json.loads(x)
    except Exception: return {"success": False, "errors": [{"message": "non-json"}]}
msg = lambda r: [str(e.get("code")) + " " + str(e.get("message")) for e in r.get("errors", [])]
# 1. Pages custom domains
base = "/accounts/%s/pages/projects/%s/domains" % (A, P)
have = api("GET", base)
if have.get("success"):
    names = [d["name"] for d in have["result"]]
    print("PAGES: custom domains now", names or "none")
    for n in names:
        if n == D or n.endswith("." + D):
            r = api("DELETE", base + "/" + n); print("PAGES: remove", n, "->", "ok" if r.get("success") else msg(r))
else: print("PAGES: cannot list", msg(have))
# 2. DNS records of the zone (the zone stays)
z = api("GET", "/zones?name=%s&account.id=%s" % (D, A))
if z.get("success") and z.get("result"):
    zid = z["result"][0]["id"]; print("ZONE:", D, "status", z["result"][0].get("status"), "(kept: the Registrar needs it)")
    recs = api("GET", "/zones/%s/dns_records?per_page=100" % zid)
    if recs.get("success"):
        if not recs["result"]: print("DNS: no records left")
        for rec in recs["result"]:
            r = api("DELETE", "/zones/%s/dns_records/%s" % (zid, rec["id"]))
            print("DNS: delete", rec["type"], rec["name"], "->", "ok" if r.get("success") else msg(r))
    else: print("DNS: cannot list", msg(recs))
else: print("ZONE: not readable by this token", msg(z))
# 3. Registrar: auto-renew off, expiry
reg = "/accounts/%s/registrar/domains/%s" % (A, D)
g = api("GET", reg)
if g.get("success") and g.get("result"):
    d = g["result"]; print("REGISTRAR: expires", d.get("expires_at"), "auto_renew", d.get("auto_renew"), "locked", d.get("locked"))
    if d.get("auto_renew"):
        u = api("PUT", reg, {"auto_renew": False}); print("REGISTRAR: auto_renew off ->", "ok" if u.get("success") else msg(u))
        g = api("GET", reg); d = g.get("result") or {}; print("REGISTRAR: now auto_renew", d.get("auto_renew"), "expires", d.get("expires_at"))
else: print("REGISTRAR: cannot read (token lacks Registrar rights?)", msg(g))
