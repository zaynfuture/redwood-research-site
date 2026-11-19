# Customer workspace access

The Streamlit customer app can map native Google sign-in to an assigned backend research workspace.
The research engine's tenant API must already be configured. This increment reuses existing OIDC,
keeps credentials on the Streamlit server, and requires an operator-approved customer binding.
Payment alone still does not grant access; billing synchronization is a separate migration gate.

## Configure a staged rollout

The existing default `REDWOOD_ACCESS_MODE = "legacy"` preserves the shared-token allowlist workflow.
Enable `"tenant"` explicitly after assigning workspace credentials on the engine. An unknown mode,
malformed binding or missing credential denies research without using the shared legacy token.

Add these synthetic examples to the existing Streamlit secrets configuration and replace the example
identity/credential through your approved secret-management workflow. These values are examples only:

```toml
REDWOOD_ACCESS_MODE = "tenant"
AUTH_ENABLED = true
REDWOOD_CUSTOMER_BINDINGS = '''
{"version":1,"bindings":[
  {"issuer":"https://accounts.google.com","subject":"example-provider-subject",
   "tenant_id":"customer-a","credential_setting":"REDWOOD_TENANT_TOKEN_CUSTOMER_A","enabled":true}
]}
'''
REDWOOD_TENANT_TOKEN_CUSTOMER_A = "synthetic-example-only-not-a-production-key"
```

Keep the existing native `[auth]` Google OIDC settings. Place the customer settings above `[auth]` so
TOML does not accidentally nest them in the provider table. Use the exact verified issuer/subject
pair supplied by Google through native `st.user`; an email address or a browser-submitted subject is
not an enrollment proof. Resolve customer identity through an operator-controlled onboarding process;
do not publish or log the full `st.user` object or provider tokens to discover it.

The tenant credential must match the assigned engine tenant, be 16..4096 characters, and be stored
only in server secrets. Use a cryptographically random credential in production. The binding references
a setting name with prefix `REDWOOD_TENANT_TOKEN_`, not a key entered into a browser. Multiple identities
may share a workspace only when they use the same assigned credential setting; they then share the
backend admission allowance. Duplicate identities, conflicting tenant/key mappings and invalid flags
reject the binding configuration. The configuration supports at most 256 bindings.

In tenant mode:

- `AUTH_ENABLED = false` cannot bypass identity requirements.
- `ALLOW_ALL_AUTHENTICATED_USERS` and `REDWOOD_AUTHORIZED_EMAILS` do not assign workspace access.
- The app requires native issuer, subject and a nonexpired integer `exp` claim on each access check.
- The configured API URL must be an HTTPS origin without embedded credentials, query, fragment or
  path prefix. Customer/browser input cannot choose the tenant, server credential or API origin.
- The app verifies the credential's returned tenant through authenticated account data before each
  query. Wrong/missing/malformed account data blocks research before any POST.
- Authorization is checked again after that network verification and immediately before submission.
  Access is also rechecked before accepting a returned result; already-admitted work cannot be recalled.

Apply secret/config changes through the hosting platform and restart the affected app/workers where
required. Changing a configuration file is not a global session-revocation service. Removing a binding
or setting `enabled=false` takes effect when the app reads the updated configuration. Rotate the engine
credential and restart its workers when backend access itself must be revoked.

## Customer experience

Approved users see their research chat and an allowance panel. The panel displays backend-reported
minute/day admitted queries and UTC reset times, shared by the workspace. It is a snapshot from the
last rerun; use **Refresh allowance** after a request or uncertain failure. It is not an invoice or
proof of the advertised monthly subscription entitlement.

Quota denial is distinct from service unavailability and may include a bounded wait time. A sanitized
support request reference is displayed when the API provides one. Raw upstream exception bodies and
configuration are never shown. API credentials are hidden in client representations and never stored
in browser history, browser storage or session-state keys.

The client never automatically retries a research POST. A timeout or gateway failure may occur after
admission, so its message explicitly says usage may have been consumed. Check allowance before a manual
retry. Only safe GETs retry bounded transient transport/502/503/504 failures; 429 is never auto-retried.

Chat history is tied to an opaque fingerprint of the current identity, workspace, origin, access mode
and credential digest. Identity/config changes or denied access clear it across page reruns. Sign-out
clears history before calling native logout. Delayed results are checked against both access scope
and operation generation. A browser tab that remains idle is not polled for remote revocation; native
Streamlit logout does not automatically log out other existing sessions/tabs. No central revocation or
persisted customer conversation store is implemented here.

## Verify before rollout

Run the offline site suite from this repository:

```sh
.venv/bin/python -m unittest discover -s tests -v
```

Tests use synthetic OIDC claims, mocked HTTPS responses and native Streamlit AppTest. They never log
in to Google or contact Stripe. Engine-side contract fixtures additionally connect this actual client
to temporary, isolated tenant indexes through in-process transport. No real customer data is required.

Keep legacy Cloudflare/D1 billing and member records until reconciliation is completed. Roll back to
explicit `REDWOOD_ACCESS_MODE = "legacy"` only for a controlled single-owner gateway with its existing
allowlist and matching legacy backend; a legacy token does not bypass an engine in tenant mode.

## Remaining launch work

Operator identity enrollment and tenant provisioning are manual. Durable hosted entitlement lifecycle,
payment webhooks/reconciliation, central member administration, multi-host operation, production
monitoring and customer data lifecycle remain separate work. No live configuration, deployment,
subscription record or private connection was changed by this source update.

Primary behavior references: [Streamlit user claims](https://docs.streamlit.io/develop/api-reference/user/st.user)
and [native authentication/session behavior](https://docs.streamlit.io/develop/concepts/connections/authentication).
