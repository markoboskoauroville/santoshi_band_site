"""Run by the deploy workflow (15.11.2026). Idempotent, soft-fails. Attaches santoshiband.org and www.santoshiband.org as custom
   domains of the Pages project santoshi-band and, when the token has DNS rights on the zone, makes their proxied CNAME records.
   Never touches other DNS records (not "live", not ples-duse.org). Prints only what it did, never a value."""
import json, os, urllib.request, urllib.error
T, A, P = os.environ["CLOUDFLARE_API_TOKEN"], os.environ["CLOUDFLARE_ACCOUNT_ID"], "santoshi-band"
def api(method, path, body=None):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4" + path, method=method,
        data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + T, "Content-Type": "application/json"})
    try: x = urllib.request.urlopen(r).read()
    except urllib.error.HTTPError as e: x = e.read()
    try: return json.loads(x)
    except Exception: return {"success": False, "errors": [{"message": "non-json"}]}
msg = lambda r: [e.get("message") for e in r.get("errors", [])]
base = "/accounts/%s/pages/projects/%s/domains" % (A, P)
have = api("GET", base)
if not have.get("success"): print("DOMAINS: cannot list (token lacks Pages rights?)", msg(have)); raise SystemExit(0)
names = {d["name"]: d for d in have["result"]}
for n in ("santoshiband.org", "www.santoshiband.org"):
    if n in names: print("DOMAINS:", n, "already attached, status", names[n].get("status")); continue
    r = api("POST", base, {"name": n}); print("DOMAINS: attach", n, "->", "ok" if r.get("success") else msg(r))
z = api("GET", "/zones?name=santoshiband.org&account.id=" + A)
if not (z.get("success") and z.get("result")): print("DNS: zone not readable by this token", msg(z)); raise SystemExit(0)
zid = z["result"][0]["id"]
for n in ("santoshiband.org", "www"):
    full = "santoshiband.org" if n == "santoshiband.org" else "www.santoshiband.org"
    ex = api("GET", "/zones/%s/dns_records?name=%s" % (zid, full))
    if ex.get("success") and ex["result"]: print("DNS:", full, "has", ex["result"][0]["type"], "-> left alone"); continue
    r = api("POST", "/zones/%s/dns_records" % zid, {"type": "CNAME", "name": n if n == "www" else "@", "content": P + ".pages.dev", "proxied": True})
    print("DNS: CNAME", full, "->", "ok" if r.get("success") else msg(r))
for n in ("santoshiband.org", "www.santoshiband.org"):
    r = api("GET", base + "/" + n); d = r.get("result") or {}
    print("DOMAINS:", n, "status", d.get("status"), (d.get("verification_data") or {}).get("status"), (d.get("validation_data") or {}).get("status"))
