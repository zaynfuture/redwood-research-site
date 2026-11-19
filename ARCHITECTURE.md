# Redwood Research Site Boundary

Redwood Research Site is the presentation and delivery client for Redwood Research.

## Site responsibilities

- Page routing, HTML, CSS, accessible SVG visualization, responsive layout, and interaction state.
- Collecting bounded user input and calling same-origin Site API routes.
- Server-side forwarding to the configured Redwood Research API while keeping service credentials out
  of the browser.
- Transport controls: HTTPS origin checks, authentication headers, timeouts, response media type and
  byte limits, generic availability errors, and display-safe formatting.

## Redwood Research responsibilities

- Market-data and knowledge-source acquisition.
- Technical analysis, fundamental analysis, valuation, evidence, rights, and freshness policy.
- Financial calculations and classifications, including POC, value area, VWAP, reference-price volume
  splits, and position analysis.
- Completeness decisions, bounded public projections, and authoritative API contracts.

The Site may validate that a response matches the documented schema and reconciles structurally. It
must not reproduce a research algorithm or replace a backend result with a browser-derived result.

## Existing platform services

Customer identity, Stripe, subscription, inquiry, and D1 persistence code predates this boundary and
remains a Site delivery-platform concern until a separately specified state migration is approved.
Research routes must remain independent of those implementations except for access admission.

The executable boundary checks live in `tests/test_repository_boundary.py` and the backend feature
contract is `redwood-research/specs/052-research-site-boundary/`.
