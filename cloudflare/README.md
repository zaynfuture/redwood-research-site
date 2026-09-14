# Domain redirects

Deployed on 2026-09-14 (Asia/Singapore) using Cloudflare Single Redirects.

`apex-redirect.json` records the request body for the zone's
`http_request_dynamic_redirect` entrypoint. It redirects HTTP and HTTPS requests
for `cortexhubs.com` and `www.cortexhubs.com` to
`https://redwoodresearch.cortexhubs.com`, preserving paths and query strings with
status 301. Other hostnames do not match the rule.

The apex has a proxied, Worker-managed AAAA record. The `www` hostname has a
proxied `A` record using the documentation address `192.0.2.1`, which allows the
redirect rule to run without sending traffic to an origin. Email records were not
changed. This rule is managed separately from the application Worker; deploying
with Wrangler does not apply it.

To update it, inspect the current zone entrypoint first and modify only the rule
with ref `cortexhubs_apex_to_redwood`. Do not replace the entire entrypoint with
this file if additional rules have since been added. To roll back, disable or
delete that rule in Cloudflare Rules > Redirect Rules.
