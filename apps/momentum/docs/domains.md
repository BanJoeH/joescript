# Momentum domains & auth

## Domains

| Env | Worker | Domain |
|-----|--------|--------|
| Dev | `momentum-dev` | `https://momentum-dev.joescript.io` |
| Prod | `momentum-prod` | `https://momentum.joescript.io` |

Custom domains are declared in `wrangler.jsonc`. Create matching Turso databases `momentum-dev` / `momentum-prod`.

## Google OAuth

Add authorized redirect URIs for the Better Auth Google provider:

- `http://localhost:5173/api/auth/callback/google`
- `https://momentum-dev.joescript.io/api/auth/callback/google`
- `https://momentum.joescript.io/api/auth/callback/google`

## Secrets

Copy `.dev.vars.example` → `.dev.vars` and fill Turso + Better Auth + Google credentials.
Set the same secrets on the Workers (and GitHub Actions environments for deploy).

Photos / R2 are intentionally not used in the MVP.
