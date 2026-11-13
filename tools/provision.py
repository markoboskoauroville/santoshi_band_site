"""Run by the deploy workflow before the deploy (13.11.2026). Idempotent. With the Cloudflare token it
   1. finds or makes the KV namespace "santoshi-band" (live flag + the private pictures),
   2. binds it as KV on the Pages project and sets the secrets SESSION_SECRET and ADMIN_EMAILS (from GitHub secrets),
   3. once: moves the private reference sheets (from the directory given as argv[1]) into KV, if KV has none.
   Prints only what it did, never a value."""
import base64, json, os, sys, urllib.request, urllib.error
T, A, P = os.environ["CLOUDFLARE_API_TOKEN"], os.environ["CLOUDFLARE_ACCOUNT_ID"], "santoshi-band"
def api(method, path, body=None, raw=False):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/" + A + path, method=method,
        data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + T, "Content-Type": "application/json"})
    try: x = urllib.request.urlopen(r).read()
    except urllib.error.HTTPError as e: x = e.read()
    try: return json.loads(x)
    except Exception: return {"success": False, "errors": [{"message": "non-json"}]}
def need(r, what):
    if not r.get("success"):
        print("PROVISION FAILED:", what, [e.get("message") for e in r.get("errors", [])]); sys.exit(1)
    return r.get("result")
env = {k: {"type": "secret_text", "value": os.environ[k]} for k in ("SESSION_SECRET", "ADMIN_EMAILS") if os.environ.get(k)}
if len(env) < 2: print("PROVISION FAILED: GitHub secrets SESSION_SECRET and ADMIN_EMAILS must both be set"); sys.exit(1)
cfg = {"env_vars": env}
r = api("GET", "/storage/kv/namespaces?per_page=100"); nid = None
if r.get("success"):
    ns = next((n for n in r["result"] if n["title"] == P), None)
    if not ns: ns = need(api("POST", "/storage/kv/namespaces", {"title": P}), "create KV"); print("KV namespace made")
    nid = ns["id"]; cfg["kv_namespaces"] = {"KV": {"namespace_id": nid}}
else:
    print("WARNING: the Cloudflare token cannot use Workers KV (%s): live flag and pictures stay off until the token gets 'Workers KV Storage: Edit'" % [e.get("message") for e in r.get("errors", [])])
rr = api("PATCH", "/pages/projects/" + P, {"deployment_configs": {"production": cfg, "preview": cfg}})
print("secrets set" if rr.get("success") else "WARNING: could not set Pages secrets: %s" % [e.get("message") for e in rr.get("errors", [])], "; KV bound" if nid else "")
if not nid: sys.exit(0)
d = sys.argv[1] if len(sys.argv) > 1 else ""
if d and os.path.isdir(d):
    r = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/%s/storage/kv/namespaces/%s/values/pic:index.json" % (A, nid), headers={"Authorization": "Bearer " + T})
    try: urllib.request.urlopen(r); print("pictures already in KV"); sys.exit(0)
    except urllib.error.HTTPError: pass
    items = []
    for f in sorted(os.listdir(d)):
        if f.lower().endswith(".jpg") or f == "index.json":
            items.append({"key": "pic:" + f, "value": base64.b64encode(open(os.path.join(d, f), "rb").read()).decode(), "base64": True})
    need(api("PUT", "/storage/kv/namespaces/%s/bulk" % nid, items), "write pictures")
    print("pictures moved into KV:", len(items), "files")
