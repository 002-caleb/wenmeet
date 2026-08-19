# Infrastructure

WenMeet's infrastructure is declarative wherever the platform allows it. The
guiding rule: **nothing the application depends on should exist only as a
dashboard click**, because that state is invisible in review, impossible to
reproduce, and the first thing lost when someone new picks the project up.

## What lives where

| Concern | Declared in | Applied by |
|---|---|---|
| Build command, publish dir, plugins | `netlify.toml` | Netlify on deploy |
| Per-context env values (non-secret) | `netlify.toml` | Netlify on deploy |
| DNS records | `infra/dns.json` | `npm run infra:dns:apply` |
| Database schema | `netlify/database/migrations/*.sql` | Netlify on deploy |
| Runtime image | `Dockerfile` | any container host |
| Secrets | **nowhere in git** | Netlify env (write-only) |

## DNS

Netlify has no native declarative DNS — `netlify.toml` covers build,
redirects and headers, but not zone records. `infra/dns.json` fills that gap
with a reviewable spec and a plan/apply workflow:

```bash
npm run infra:dns:plan     # show the diff, change nothing
npm run infra:dns:apply    # make the zone match the spec
```

Both are idempotent: the plan is computed from live state, so re-running
after a partial failure resumes cleanly rather than duplicating records.

### Safety

The tool **never deletes a record it does not declare.** Records created by
Netlify when a domain is attached to a site (type `NETLIFY`), your MX
records, and third-party verification TXT records are all reported as
*unmanaged* and left untouched. Removing DNS is destructive and easy to get
wrong, so it is deliberately not automated.

To stop managing a record, delete it from the spec **and** from the zone by
hand — the tool will then simply report it as unmanaged.

### Auth

`NETLIFY_AUTH_TOKEN` if set (for CI), otherwise the session the Netlify CLI
already stored, so nothing extra is needed locally after `netlify login`.

## Why a script rather than Terraform

For one site and a handful of records, Terraform's cost — a state file to
store and lock, an unofficial community provider, and drift management —
outweighs the benefit. The script gives the parts that actually matter here:
a spec in version control, a plan before apply, and idempotency.

That trade-off flips if this grows to multiple environments, more providers,
or anything needing dependency ordering. At that point the spec in
`infra/dns.json` maps almost directly onto `netlify_dns_record` resources.

## Domains are not hardcoded

The application derives its own origin at runtime:

- OAuth `redirect_uri` values are built from the incoming request's origin
  (`src/app/api/auth/*/authorize/route.ts`)
- Participant share links use the live origin
  (`src/components/dashboard/ShareLinkPanel.tsx`)
- The marketing page's sample link reads the current host
  (`src/components/landing/SampleShareLink.tsx`)

So the same build runs unchanged on localhost, a Netlify deploy preview,
production, or the Docker image on any host. The only hardcoded external
address is the footer link to the parent company site, which is genuinely a
different domain.

`infra/dns.json` names `conscience.fund` because it is a description of that
specific zone — that is the one place a domain *should* appear literally.
