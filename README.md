# Redwood

Redwood is an English-language product site for a local-first U.S. equity research platform. The
public site explains the product philosophy and research workflow without publishing private research,
credentials, operational infrastructure, proprietary prompts, scoring parameters, or customer data.

The interface supports English, Simplified Chinese, and Traditional Chinese. Language selection is
stored only in the visitor's browser and also updates the document language for accessibility.

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

## Member accounts and billing

The public product site now includes email/password registration, Google OpenID Connect sign-in, a
member dashboard, a subscription-gated research chatbot, and Stripe Checkout for credit-card billing.
The individual plan is presented as US$99 per month and includes 1,000 chatbot calls per UTC calendar
month, a monthly selected-stock analysis, and a monthly market outlook. Enterprise work remains a
consultation-led custom engagement.

Apply all migrations through `drizzle/0004_enterprise_inquiries.sql` before enabling member routes. Configure a Google web OAuth client
with `/api/auth/google/callback` as an authorized redirect URI. Configure a recurring US$99 Stripe Price,
then set `STRIPE_INDIVIDUAL_PRICE_ID`; add `/api/billing/webhook` as a Stripe webhook endpoint for
`checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
The webhook body is signature-verified before subscription state is changed.

The private research workflow can create or update the two monthly member deliverables through
`PUT /api/internal/research/monthly`, authenticated with `REDWOOD_PUBLISH_TOKEN`. Payloads use a
`YYYY-MM` period, a kind of `stock_analysis` or `market_outlook`, plain-text title/summary/body fields,
an evidence-reference array whose entries preserve an `id`, label, and optional locator, and an explicit
`publish` boolean. Published records require at least one evidence identifier. Draft records are never returned to
members. Published records are available only to active individual, enterprise, or legacy members at
`GET /api/research/monthly`.

Required hosted secrets are `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `REDWOOD_API_SERVICE_TOKEN`, and `REDWOOD_PUBLISH_TOKEN`.
`STRIPE_INDIVIDUAL_PRICE_ID` may be set as a non-secret Worker variable. Do not commit live values.

Enterprise consultation requests are submitted to `POST /api/enterprise/inquiries`, rate-limited by a
one-way hash of the source address, and stored in D1 without storing the address itself. Retrieve the
newest requests through `GET /api/internal/enterprise/inquiries` with the separate
`REDWOOD_ENTERPRISE_INBOX_TOKEN`; this endpoint is not linked from the public interface.

## Disclosure boundary

Keep public copy at the product-principle and capability level. Do not add secrets, personal file paths,
private evidence, account identifiers, portfolio holdings, provider configuration, internal endpoints,
deployment credentials, exact decision thresholds, or proprietary agent instructions to this repository
or the rendered site.

## Public API gateway

The Cloudflare-hosted gateway is served at `/openapi`. It exposes email/password login, a daily-quota
endpoint, and a text-query endpoint. Each enabled user has 100 query calls per UTC day by default.
User records, session-token hashes, and quota counters are stored in D1; passwords are stored only as
salted PBKDF2-SHA256 hashes.

The gateway does not contain the private research engine. Configure `REDWOOD_API_UPSTREAM` with its
HTTPS text-processing URL and `REDWOOD_API_SERVICE_TOKEN` with the service credential in the hosted
runtime. The private endpoint must return JSON containing the final result only. The gateway removes
common internal reasoning and prompt fields as a second boundary, never forwards the user's API token,
and does not log request text.

For local development, copy `.dev.vars.example` to `.dev.vars`. The real `.dev.vars` file is ignored by
Git. Shell-profile variables affect only local processes and are not available to the hosted Worker;
configure production secrets with `wrangler secret put`. Non-secret production bindings and variables
are declared in `wrangler.jsonc`.

This project deploys directly to the independent Cloudflare Worker `redwood-api-gateway`; it does not
use Sites hosting. Apply D1 migrations with `npm run db:migrate:remote`, then publish with
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
