# Redwood Research website

The public Redwood Research homepage and its volume profile explorer run on Cloudflare Workers at
`redwoodresearch.cortexhubs.com`. The Vinext app in `app/` serves this domain and the existing
D1-backed gateway. The Streamlit research workspace has its own entry point, `streamlit_app.py`.
Both frontends share the browser-local explorer in `assets/volume-profile/`.

The primary interface is English, with Chinese enterprise-service copy retained for the current target
audience.

## Public product principles

- Evidence before opinion
- A structured 5+2 company-research workflow
- Specialist research roles coordinated under one evidence standard
- Reproducible financial calculations and traceable claims
- Extensible self-managed knowledge domains with optional trusted third-party sources
- Valuation, institutional research synthesis, and 5+2 company analysis
- Scheduled and agent-triggered workflows with email and approved messaging delivery
- Privacy-safe full-view asset and IBKR holdings-risk reporting
- Visible uncertainty and human accountability
- Research-only operation with no order execution

The interface shown on the landing page is illustrative. Company names, workflow states, and status
labels are examples rather than live research output or investment recommendations.

## Contact

The header and footer private-beta calls to action open `https://www.linkedin.com/company/redwoodresearch-cortexhubs/?viewAsMember=true`
in the current tab, in all three supported languages. Visitors can use LinkedIn's messaging or
connection options to contact Zayn Zheng. The website does not send a message on their behalf.

## Streamlit Cloud deployment

1. Push this repository to GitHub and create an app in Streamlit Community Cloud.
2. Select `streamlit_app.py` as the entrypoint and Python 3.12 as the runtime.
3. Copy `.streamlit/secrets.toml.example` into the app's Secrets editor and replace every placeholder.
4. In the Google OAuth web client, register the Streamlit callback exactly as
   `https://<your-app>.streamlit.app/oauth2callback`.
5. Keep the `redwood-research` FastAPI LaunchAgent and Cloudflare Tunnel running on the local Mac. The
   current public API origin is `https://private-api.cortexhubs.com` and Swagger is available at
   `https://private-api.cortexhubs.com/docs`.

In legacy mode the Streamlit server calls `POST /v1/query` with `REDWOOD_API_SERVICE_TOKEN`.
Opt-in tenant mode instead resolves native issuer/subject identity to an assigned server credential,
verifies its backend workspace and displays admission usage. See [customer access](docs/customer-access.md)
for rollout, history isolation, retry behavior and remaining billing gates. Credentials remain in
server secrets and are never rendered in the browser. The API must use HTTPS in deployed mode.

Google OIDC is enabled with `AUTH_ENABLED = true`. Research access fails closed: add paid or test
accounts to `REDWOOD_AUTHORIZED_EMAILS`, or set `ALLOW_ALL_AUTHENTICATED_USERS = true` only when a
separate entitlement check is in place. `AUTH_ENABLED = false` is intended only for local development.

For local UI development:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run streamlit_app.py
```

## Research access

The Streamlit site uses native Google OpenID Connect sign-in, an access page, and an authenticated
research chatbot. Public access is currently private-beta or consultation-led enterprise access; the
former public individual-price offer is no longer presented or linked from the user interface.

The current Streamlit migration uses `REDWOOD_AUTHORIZED_EMAILS` as a temporary fail-closed entitlement
list. Stripe payment does not automatically grant access yet. Keep the legacy Cloudflare webhook and D1
records active until a durable hosted entitlement service has been connected and existing memberships
have been migrated.

The legacy Cloudflare workflow can create or update the two monthly member deliverables through
`PUT /api/internal/research/monthly`, authenticated with `REDWOOD_PUBLISH_TOKEN`. Payloads use a
`YYYY-MM` period, a kind of `stock_analysis` or `market_outlook`, plain-text title/summary/body fields,
an evidence-reference array whose entries preserve an `id`, label, and optional locator, and an explicit
`publish` boolean. Published records require at least one evidence identifier. Draft records are never returned to
members. Published records are available only to active individual, enterprise, or legacy members at
`GET /api/research/monthly`.

Required Streamlit secrets are documented in `.streamlit/secrets.toml.example`. Never commit a live
`secrets.toml`, Google client secret, API service token, or Stripe credential.

In the Streamlit app, enterprise consultation opens an addressed email. In the legacy runtime,
consultation requests are submitted to `POST /api/enterprise/inquiries`, rate-limited by a
one-way hash of the source address, and stored in D1 without storing the address itself. Retrieve the
newest requests through `GET /api/internal/enterprise/inquiries` with the separate
`REDWOOD_ENTERPRISE_INBOX_TOKEN`; this endpoint is not linked from the public interface.

## Disclosure boundary

Keep public copy at the product-principle and capability level. Do not add secrets, personal file paths,
private evidence, account identifiers, portfolio holdings, provider configuration, internal endpoints,
deployment credentials, exact decision thresholds, or proprietary agent instructions to this repository
or the rendered site.

## Research API

The local `redwood-research` FastAPI service is the research API. It exposes `/health`, Swagger at
`/docs`, the OpenAPI 3 schema at `/openapi.json`, and Bearer-authenticated `POST /v1/query`. The service
performs rights-aware retrieval and returns bounded final results, evidence identifiers, gaps, warnings,
and observation metadata.

Streamlit Community Cloud is not the API host. It runs the UI, while the FastAPI process stays on the
local Mac at `127.0.0.1:8788`. A Cloudflare Tunnel publishes only the approved HTTP routes through
HTTPS; no router port forwarding is required. The API cannot select tools, files, prompts, or model
settings and does not expose internal reasoning or credentials. If the Mac sleeps, shuts down, or loses
network connectivity, the research workspace remains visible but API requests will be unavailable.

## Production Cloudflare main site

The Worker serves the main site, public research explorer, existing account flows and
`/openapi` gateway. Streamlit workspace settings and the Cloudflare bindings are managed separately.

For local development, copy `.dev.vars.example` to `.dev.vars`. The real `.dev.vars` file is ignored by
Git. Shell-profile variables affect only local processes and are not available to the hosted Worker;
configure production secrets with `wrangler secret put`. Non-secret production bindings and variables
are declared in `wrangler.jsonc`.

Build with `npm run build`, verify the built Worker with `wrangler dev --local`, then deploy
the configured `redwood-api-gateway` Worker with `wrangler deploy --keep-vars`. Verify the live
homepage link and an interactive chart after each explorer change. D1 migrations apply only when
a release changes the database schema.

The public volume-profile page is English-only. Ticker discovery uses the packaged SEC issuer
directory; selecting an unloaded symbol calls `GET /api/volume-profile?symbol=...`, which forwards the
exact symbol through the authenticated private API. No browser file upload or provider credential is
used. The private service selects the delayed historical window, validates pagination/provenance, and
returns derived analysis. Public output remains unavailable until the private service has an explicit,
provider-confirmed redistribution authorization; acquisition credentials alone never enable it.

Provision a user by generating a one-time SQL statement without putting the password on the command
line, then execute it against the bound D1 database through the approved deployment workflow:

```bash
REDWOOD_NEW_USER_PASSWORD='a-long-random-password' npm run api:user -- user@example.com
```

Do not commit the generated SQL or password. Sessions expire after 24 hours. `/openapi/quota` does not
consume quota; every admitted `/openapi/query` call consumes one request even if the private service
later fails.

The website's email/password sign-in form always requires a visible, single-use Cloudflare Turnstile
token with action `login`. `/openapi/auth/login` requires the same challenge after three attempts from
one IP in a 15-minute window. Configure `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and
`TURNSTILE_EXPECTED_HOSTNAME` as hosted runtime values. The server validates the token, source IP,
action, and hostname before checking credentials.

© 2026 Cortex Hubs

## Volume profile explorer

Open **Volume profile** (筹码峰分布) from the Cloudflare homepage or the Streamlit navigation.
Both runtimes serve the same viewer at `/volume-profile`. The Worker route accepts
`?lang=en`, `?lang=zh-CN`, or `?lang=zh-TW`; Streamlit follows the workspace language.
The public page starts with illustrative data. Its file picker reads saved Redwood profile
files in the browser. Local market data and account files stay on the device.

Ticker typeahead uses the checked-in SEC `company_tickers_exchange.json` snapshot and identifies
issuers without implying that profile data exists. Selecting a directory-only ticker shows an explicit
no-data state. The public demo is synthetic. Imported profiles are accepted only after deterministic
checks of metadata, timestamp bounds, source-page hashes, pagination, price-grid continuity, share
reconciliation, POC, value area, and VWAP bounds. These checks establish file consistency, not a
provider digital signature or public redistribution rights. A licensed redistributable consolidated
trade feed is still required before the public site can offer real-time volume profiles.

After building the Cloudflare Worker, start a fresh local Wrangler preview against
`dist/server/wrangler.json`. With the preview running on port 8787, check the rendered
route and bundled public dataset in every homepage language:

```sh
REDWOOD_PROFILE_PREVIEW_URL=http://127.0.0.1:8787 node --test tests/volume-profile-worker.test.mjs
```

## Member feature access and portfolio analysis

Apply D1 migration `0005_feature_access.sql` before serving this version.
Set `REDWOOD_ADMIN_USER_IDS` to the comma-separated immutable D1 user IDs of
explicitly approved existing accounts. A trusted operator can look up an ID by
email in `users`, then verify the account identity before configuring the ID.
Accounts otherwise start with all three features disabled. At `/admin/access`,
an administrator can find an account by email and grant or revoke each feature.
An optional expiry takes effect at the end of the selected UTC day. The append-only
event store records the source and actor. Billing remains independent.

For Portfolio, set `REDWOOD_PORTFOLIO_ENCRYPTION_KEY` in the Worker secrets to
32 random bytes encoded as 64 hex characters. Preserve this key securely across
releases. Replacing it requires members to re-enter their connections.
Set a dedicated `REDWOOD_PORTFOLIO_SERVICE_TOKEN` in both the Worker and Redwood
Research backend and use the compatible backend with `POST /v1/portfolio/analysis`.
Keep request bodies out of infrastructure logs and disable body capture on the
private endpoint. The separate website service token remains required for the
market-analysis endpoints.

At `/portfolio`, each account can save its own IBKR Flex token and XML Activity
Flex Query ID. Configure the query for one brokerage account and one reporting
period, with Open Positions set to Summary and the Symbol, Asset Category,
Currency, Quantity, Position Value and Level of Detail fields included. The
first successful analysis verifies the connection. A revoked or expired feature
blocks new analyses and access to saved results. Each account retains its 20 most
recent successful runs. Disconnecting deletes the encrypted credential and
cancels any pending result. Existing analyses remain available to their owner
while authorized. Reports show the statement cutoff and rank USD stock exposures.

### Set or reset the password of an existing website account

The website has no self-service reset screen. A trusted operator with D1
access can set a password from the terminal after verifying the account's
identity. First look up the immutable account ID in the intended database.
Use the exact email and include disabled records in the lookup.

```sql
SELECT id, email, enabled, google_sub IS NOT NULL AS google_linked
FROM users
WHERE email = 'member@example.com' COLLATE NOCASE;
```

A disabled account requires separate review. If there is no result, check the
D1 binding of the target Worker and confirm the member is using the same
environment and sign-in address. Do not create a replacement administrator
account to work around a missing record.

```sh
npm run account:password -- --local member@example.com ACCOUNT_ID
```

The command prompts twice with hidden input, stores a salted password hash,
and revokes existing website and API sessions for that account. Password entry
belongs in the terminal. The command matches both email and ID against an
enabled row and has no effect on feature grants or administrator membership.
Use `--remote` instead of `--local` only for an approved production password
change, after confirming that Wrangler can access the correct D1 database.
The member can then use the website's `/signin` page and complete Turnstile.
A password change does not deploy the Worker or apply D1 migrations.

### Initialize the first administrator

Choose the target environment before entering a password. The database must be
empty and have migrations applied, including `0005_feature_access.sql`. Verify
the intended owner's identity before creating their account. Use an interactive
terminal and enter the password at the two hidden prompts.

```sh
npm run account:bootstrap-admin -- --local owner@example.com
```

This creates the first account only if the database is still empty at insert
time, then writes its generated user ID into the ignored local `.dev.vars`.
Restart the local Worker and sign in at `/signin`. Existing local administrator
settings are protected. If the database insert succeeds and the settings file
cannot be updated, the command prints the ID needed to finish configuration.

For an approved production bootstrap, use `--remote` with the exact same
command after confirming Wrangler access to the intended D1 database. It
creates the account and prints the generated ID. Set that ID as
`REDWOOD_ADMIN_USER_IDS` in the target Worker configuration to enable the role.
That configuration change must take effect on the Worker version serving the
site. The bootstrap command only writes the database account in remote mode
and does not deploy a Worker or change its settings.

### Run the built loopback preview

With local D1 migrations and the local research settings in `.dev.vars`, set
`REDWOOD_LOCAL_PREVIEW=1` in that ignored file. Then run:

```sh
npm run build
npm run preview:local
```

Open `http://localhost:8811/signin`. The preview reuses the local D1 state and
sets the local request origin explicitly so the production custom domain does
not interfere with local login. The local preview flag only applies to loopback
requests. The production configuration uses its HTTPS research upstream and
production Turnstile credentials.
