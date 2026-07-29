# Garden custom domains

Production: **https://garden.joescript.io**  
Development: **https://garden-dev.joescript.io**

Configured in `wrangler.jsonc` as Worker custom domains. `BETTER_AUTH_URL` is set per environment in the same file.

> **Why not `dev.garden.joescript.io`?** Cloudflare’s free plan only issues SSL for **one** level of subdomain (`*.joescript.io`). Nested names like `dev.garden.*` need a paid plan. Dev uses `garden-dev.joescript.io` instead.

---

## Prerequisites

- Cloudflare account (same one used for Workers deploy)
- Access to SiteGround DNS for `joescript.io` (or registrar nameservers)
- Google Cloud OAuth client for Garden

---

## 1. Add `joescript.io` to Cloudflare

Workers custom domains need an **active Cloudflare zone** for `joescript.io`.

1. [Cloudflare dashboard](https://dash.cloudflare.com) → **Add a site** → enter `joescript.io`
2. Choose the **Free** plan
3. Cloudflare scans existing DNS — confirm records for the main website (apex / `www`) still point at SiteGround

You do **not** need to delete SiteGround hosting; only DNS routing changes.

---

## 2. DNS — pick one approach

### Option A — Move nameservers to Cloudflare (recommended)

Simplest for Workers custom domains. Wrangler creates `garden` / `garden-dev` records on deploy.

1. Cloudflare shows two nameservers (e.g. `ada.ns.cloudflare.com`)
2. **SiteGround** → Domains → `joescript.io` → Nameservers → **Custom**
3. Paste Cloudflare’s nameservers and save
4. Wait for propagation (minutes to 48h). Cloudflare shows **Active** when ready
5. In Cloudflare DNS, keep apex / `www` pointing at SiteGround (orange cloud optional for website)
6. Deploy Garden (step 4) — custom-domain records for `garden` and `garden-dev` are created automatically

### Option B — Keep nameservers on SiteGround (interim)

Custom domains work best with Cloudflare as authoritative DNS. If you must keep SiteGround NS for now:

1. Complete step 1 so the zone exists in Cloudflare (may stay **Pending** until NS move)
2. Deploy Garden (step 4)
3. In Cloudflare → Workers → `garden-dev` / `garden-prod` → **Settings → Domains & Routes**, note any DNS targets shown for pending custom domains
4. At **SiteGround DNS**, add **only** these subdomains (remove conflicting records first):
   - `garden-dev` → CNAME target Cloudflare gives you
   - `garden` → CNAME target Cloudflare gives you

Do not add a CNAME for a hostname that already exists. Cloudflare will not attach a custom domain if a conflicting record exists.

**Plan to move to Option A** when convenient — fewer moving parts and automatic certs.

---

## 3. Google OAuth

[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your Garden OAuth client.

**Authorized JavaScript origins** — add:

```
https://garden.joescript.io
https://garden-dev.joescript.io
```

**Authorized redirect URIs** — add:

```
https://garden.joescript.io/api/auth/callback/google
https://garden-dev.joescript.io/api/auth/callback/google
```

Keep existing `*.workers.dev` URIs until you’ve switched over, then remove them.

---

## 4. Cloudflare Worker secrets

`BETTER_AUTH_URL` is in `wrangler.jsonc` `vars` (not a secret). On deploy, remove any duplicate **secret** named `BETTER_AUTH_URL` from the dashboard if you added one earlier:

Workers → `garden-dev` / `garden-prod` → **Settings → Variables** — delete `BETTER_AUTH_URL` from **Secrets** if present (the var from wrangler takes precedence).

Ensure these **secrets** still exist per worker (or via GitHub `garden-dev` / `garden-production` environments):

| Secret | Notes |
|--------|--------|
| `BETTER_AUTH_SECRET` | Same value OK on both envs if you prefer |
| `TURSO_DATABASE_URL` | Dev vs prod URLs |
| `TURSO_AUTH_TOKEN` | Matching tokens |
| `GOOGLE_CLIENT_ID` | Same OAuth client is fine |
| `GOOGLE_CLIENT_SECRET` | |

---

## 5. Deploy

**Dev** (branch `dev` → CI, or locally):

```bash
cd apps/garden
pnpm deploy
```

**Production** (branch `main` → CI, or locally):

```bash
cd apps/garden
pnpm deploy:prod
```

First deploy after adding routes may take a minute while Cloudflare issues certificates.

---

## 6. Verify

| Check | URL |
|-------|-----|
| Dev app loads | https://garden-dev.joescript.io |
| Prod app loads | https://garden.joescript.io |
| Login redirects | Google sign-in returns to app |
| Photos | Upload on journal entry; image loads |

Workers **Domains & Routes** should list:

- `garden-dev` → `garden-dev.joescript.io`
- `garden-prod` → `garden.joescript.io`

---

## Troubleshooting

**Custom domain stuck / certificate pending**  
Zone not active on Cloudflare, or conflicting DNS at SiteGround. Resolve NS (Option A) or remove duplicate CNAMEs.

**Google `redirect_uri_mismatch`**  
Redirect URI must match exactly (https, no trailing slash). Allow a few minutes after saving in Google Console.

**Auth cookies / wrong host**  
`BETTER_AUTH_URL` must match the URL in the browser. Redeploy after changing `wrangler.jsonc` vars.

**Main site broken after NS move**  
In Cloudflare DNS, restore apex / `www` A or CNAME records to SiteGround’s IP from Site Tools.

**`joescript.io` works but `www.joescript.io` does not**  
Usually the two hostnames are configured differently in Cloudflare DNS. They should both be **Proxied** (orange cloud) and point at the same SiteGround origin.

1. Cloudflare → **DNS** → **Records**
2. **Apex** `@` / `joescript.io` — type **A**, content = SiteGround server IP (Site Tools → Dashboard), **Proxied**
3. **`www`** — type **CNAME**, content = `joescript.io`, **Proxied**  
   (Alternative: **A** record for `www` with the same SiteGround IP, **Proxied**)
4. Delete duplicate `www` records (old CNAME to SiteGround hostname, grey-cloud A record, etc.)
5. **SSL/TLS** → **Full (strict)** if SiteGround has a valid cert; otherwise try **Full** first
6. SiteGround / WordPress: if the site prefers `www`, set site URL to `https://www.joescript.io` in WP settings; if it prefers apex, add a Cloudflare **Redirect rule**: `www.joescript.io/*` → `https://joescript.io/$1`

Quick check: `curl -sI https://www.joescript.io | grep -i server` should show `cloudflare` (same as apex). If you see `nginx` only, `www` is bypassing Cloudflare (grey cloud or wrong target).

---

## Related files

- `apps/garden/wrangler.jsonc` — routes + `BETTER_AUTH_URL`
- `.github/workflows/deploy-garden.yml` — deploy on push to `dev` / `main`
