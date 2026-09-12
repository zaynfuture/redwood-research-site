# Redwood Streamlit site

Redwood is a Streamlit web application for a local-first U.S. equity research platform. The
public site explains the product philosophy and research workflow without publishing private research,
credentials, operational infrastructure, proprietary prompts, scoring parameters, or customer data.

`streamlit_app.py` is the primary deployment entrypoint. The former Next.js and Cloudflare Worker
implementation remains in the repository during migration so account and billing records can be
reconciled before that runtime is retired.

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

The private-beta call to action opens the visitor's email application with a prepared message addressed
to `request@cortexhubs.com`. The website does not collect contact-form data or send mail on a visitor's
behalf.

## Streamlit Cloud deployment

1. Push this repository to GitHub and create an app in Streamlit Community Cloud.
2. Select `streamlit_app.py` as the entrypoint and Python 3.12 as the runtime.
3. Copy `.streamlit/secrets.toml.example` into the app's Secrets editor and replace every placeholder.
4. In the Google OAuth web client, register the Streamlit callback exactly as
   `https://<your-app>.streamlit.app/oauth2callback`.
5. Deploy the separate `redwood-research` FastAPI service from its `Dockerfile.api`, then configure its
   HTTPS origin as `REDWOOD_API_BASE_URL` and `<origin>/docs` as `REDWOOD_API_DOCS_URL`.

The Streamlit server calls `POST /v1/query` with `REDWOOD_API_SERVICE_TOKEN`. That token stays in
Streamlit secrets and is never rendered in the browser. The API must use HTTPS in deployed mode.

Google OIDC is enabled with `AUTH_ENABLED = true`. Research access fails closed: add paid or test
accounts to `REDWOOD_AUTHORIZED_EMAILS`, or set `ALLOW_ALL_AUTHENTICATED_USERS = true` only when a
separate entitlement check is in place. `AUTH_ENABLED = false` is intended only for local development.

For local UI development:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/streamlit run streamlit_app.py
```

## Member accounts and billing

The Streamlit site uses native Google OpenID Connect sign-in, a membership page, and an authenticated
research chatbot. A configured Stripe Payment Link provides credit-card checkout.
The individual plan is presented as US$99 per month and includes 1,000 chatbot calls per UTC calendar
month, a monthly selected-stock analysis, and a monthly market outlook. Enterprise work remains a
consultation-led custom engagement.

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

The separate `redwood-research` FastAPI service is the research API. It exposes `/health`, Swagger at
`/docs`, the OpenAPI 3 schema at `/openapi.json`, and Bearer-authenticated `POST /v1/query`. The service
performs rights-aware retrieval and returns bounded final results, evidence identifiers, gaps, warnings,
and observation metadata.

Streamlit Community Cloud is not the API host. It runs the UI, while the FastAPI process must run on an
HTTPS application or container host. The API cannot select tools, files, prompts, or model settings and
does not expose internal reasoning or credentials.

## Legacy Cloudflare runtime

The Next.js/Cloudflare Worker application, D1 migrations, and `/openapi` gateway remain available only
for migration and rollback. Do not delete them until Google identities, Stripe subscriptions, usage
quotas, monthly research, and enterprise inquiries have been reconciled with their replacement stores.

For local development, copy `.dev.vars.example` to `.dev.vars`. The real `.dev.vars` file is ignored by
Git. Shell-profile variables affect only local processes and are not available to the hosted Worker;
configure production secrets with `wrangler secret put`. Non-secret production bindings and variables
are declared in `wrangler.jsonc`.

The legacy runtime deploys to the independent Cloudflare Worker `redwood-api-gateway`; it does not use
Sites hosting. Apply D1 migrations with `npm run db:migrate:remote`, then publish it with
`npm run deploy`. The Worker owns the custom domain `redwoodresearch.cortexhubs.com` directly.

Provision a user by generating a one-time SQL statement without putting the password on the command
line, then execute it against the bound D1 database through the approved deployment workflow:

```bash
REDWOOD_NEW_USER_PASSWORD='a-long-random-password' npm run api:user -- user@example.com
```

Do not commit the generated SQL or password. Sessions expire after 24 hours. `/openapi/quota` does not
consume quota; every admitted `/openapi/query` call consumes one request even if the private service
later fails.

After three login attempts from the same IP in a 15-minute window, `/openapi/auth/login` requires a
single-use Cloudflare Turnstile token with action `login`. Configure `TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`, and `TURNSTILE_EXPECTED_HOSTNAME` as hosted runtime values. The server validates
the token, source IP, action, and hostname before checking credentials.

© 2026 Cortex Hubs
