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
configure production values as Sites/Cloudflare runtime secrets during deployment.

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
