"""Redwood Research public site and authenticated research workspace."""

from __future__ import annotations

from typing import Any

import streamlit as st

from redwood_streamlit.api import ResearchApiClient, ResearchApiError
from redwood_streamlit.settings import boolean_setting, setting
from redwood_streamlit.style import apply_style, brand, footer


st.set_page_config(
    page_title="Redwood Research",
    page_icon="🌲",
    layout="wide",
    initial_sidebar_state="expanded",
)
apply_style()


def api_client() -> ResearchApiClient:
    return ResearchApiClient(
        base_url=str(setting("REDWOOD_API_BASE_URL", "")),
        service_token=str(setting("REDWOOD_API_SERVICE_TOKEN", "")),
    )


def authenticated() -> bool:
    if not boolean_setting("AUTH_ENABLED", True):
        return True
    return bool(getattr(st.user, "is_logged_in", False))


def has_research_access() -> bool:
    if not authenticated():
        return False
    if not boolean_setting("AUTH_ENABLED", True):
        return True
    if boolean_setting("ALLOW_ALL_AUTHENTICATED_USERS", False):
        return True
    email = str(getattr(st.user, "email", "")).strip().lower()
    authorized = {
        item.strip().lower()
        for item in str(setting("REDWOOD_AUTHORIZED_EMAILS", "")).split(",")
        if item.strip()
    }
    return bool(email and email in authorized)


def auth_controls() -> None:
    if not boolean_setting("AUTH_ENABLED", True):
        st.sidebar.caption("Authentication disabled for local development")
        return
    if authenticated():
        email = getattr(st.user, "email", None) or "Authorized user"
        st.sidebar.caption(f"Signed in as {email}")
        if st.sidebar.button("Sign out", use_container_width=True):
            st.logout()
    elif st.sidebar.button("Continue with Google", type="primary", use_container_width=True):
        try:
            st.login()
        except Exception:
            st.sidebar.error("Google OIDC is not configured. Add the [auth] settings in Streamlit secrets.")


def page_home() -> None:
    brand()
    st.markdown('<div class="rw-kicker">Built for evidence-led investing</div>', unsafe_allow_html=True)
    st.title("Research, rooted in evidence.")
    st.markdown(
        '<p class="rw-lead">Redwood turns scattered filings, market data, and authorized private knowledge into conclusions you can trace, challenge, and verify.</p>',
        unsafe_allow_html=True,
    )
    left, right = st.columns([1.2, 1], gap="large")
    with left:
        st.subheader("A better research order")
        st.write("A structured 5+2 workflow examines industry, business model, management, financials, and valuation before stress-testing both sides of the investment case.")
        st.markdown("**Local-first** · **Evidence-auditable** · **Read-only by design**")
    with right:
        st.markdown('<div class="rw-panel"><span class="rw-number">RESEARCH SYSTEM</span><h3>Evidence before opinion</h3><p>Source, version, rights, and precise location stay attached to every material claim. Uncertainty remains visible.</p></div>', unsafe_allow_html=True)
    st.divider()
    st.markdown('<div class="rw-kicker">Core capabilities</div>', unsafe_allow_html=True)
    cards = [
        ("01", "Knowledge engine", "Rights-aware retrieval across approved PDFs, documents, notes, and structured research."),
        ("02", "Deterministic finance", "Reproducible valuation, risk, options, and portfolio calculations."),
        ("03", "Research coordination", "Specialist analysis under one evidence standard with explicit gaps and human review."),
    ]
    columns = st.columns(3, gap="medium")
    for column, (number, title, copy) in zip(columns, cards, strict=True):
        with column:
            st.markdown(f'<div class="rw-panel"><span class="rw-number">{number}</span><h3>{title}</h3><p>{copy}</p></div>', unsafe_allow_html=True)
    footer()


def page_membership() -> None:
    brand()
    st.markdown('<div class="rw-kicker">Membership</div>', unsafe_allow_html=True)
    st.title("Choose your research depth.")
    individual, enterprise = st.columns(2, gap="large")
    with individual:
        st.subheader("Individual · US$99/month")
        st.markdown("- 1,000 chatbot calls each month\n- Monthly selected-stock analysis\n- Monthly market outlook\n- Credit-card billing through Stripe")
        payment_link = str(setting("STRIPE_PAYMENT_LINK", ""))
        if payment_link.startswith("https://"):
            st.link_button("Activate individual plan", payment_link, type="primary", use_container_width=True)
        else:
            st.info("Stripe payment link will appear after it is configured in Streamlit secrets.")
    with enterprise:
        st.subheader("Enterprise · Custom engagement")
        st.markdown("- Equity and portfolio-system integration\n- Internal document and private-knowledge integration\n- IM, email, and workflow delivery\n- Pricing through consultation")
        st.link_button("Request consultation", "mailto:request@cortexhubs.com?subject=Redwood%20Enterprise%20Inquiry", use_container_width=True)
    st.markdown('<p class="rw-note">Research support only. Subscription access does not guarantee investment outcomes.</p>', unsafe_allow_html=True)
    footer()


def page_research() -> None:
    brand()
    st.markdown('<div class="rw-kicker">Authenticated workspace</div>', unsafe_allow_html=True)
    st.title("Ask Redwood.")
    if not authenticated():
        st.info("Sign in with Google from the sidebar to access the research workspace.")
        if st.button("Continue with Google", type="primary"):
            st.login()
        footer()
        return

    if not has_research_access():
        st.warning("Your Google account is signed in but does not yet have an active Redwood research entitlement.")
        payment_link = str(setting("STRIPE_PAYMENT_LINK", ""))
        if payment_link.startswith("https://"):
            st.link_button("Activate individual plan", payment_link, type="primary")
        st.caption("After payment, access must be activated in the entitlement list until automated billing synchronization is connected.")
        footer()
        return

    client = api_client()
    if not client.configured:
        st.error("The research API is not configured. Add its HTTPS URL and service token to Streamlit secrets.")
        footer()
        return

    if "messages" not in st.session_state:
        st.session_state.messages = []
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    question = st.chat_input("Ask about a company, valuation assumption, market context, or risk…", max_chars=8_000)
    if question:
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            with st.spinner("Reviewing authorized evidence…"):
                try:
                    result = client.query(question)
                    answer = str(result.get("answer", "No answer was returned."))
                    st.markdown(answer)
                    evidence = result.get("evidence", [])
                    if isinstance(evidence, list) and evidence:
                        with st.expander(f"Evidence ({len(evidence)})"):
                            for item in evidence:
                                render_evidence(item)
                    gaps = result.get("gaps", [])
                    if gaps:
                        with st.expander("Evidence gaps"):
                            st.json(gaps)
                    st.caption(f"Observation: {result.get('observation_id') or 'not available'} · Context: {result.get('estimated_tokens', 0)} tokens")
                except ResearchApiError as exc:
                    answer = str(exc)
                    st.error(answer)
        st.session_state.messages.append({"role": "assistant", "content": answer})
    st.caption("Informational research support only — verify material claims before making an investment decision.")
    footer()


def render_evidence(item: Any) -> None:
    if not isinstance(item, dict):
        return
    title = item.get("title", "Untitled source")
    evidence_id = item.get("canonical_evidence_id", "unknown-evidence")
    st.markdown(f"**{title}**  \n`{evidence_id}`")
    if item.get("excerpt"):
        st.write(item["excerpt"])


def page_enterprise() -> None:
    brand()
    st.markdown('<div class="rw-kicker">Enterprise / 深度定制</div>', unsafe_allow_html=True)
    st.title("让研究系统适应你的组织与边界。")
    st.markdown('<p class="rw-lead">围绕现有股票系统、内部文档和协作渠道进行深度定制，从最小可行的只读工作流开始。</p>', unsafe_allow_html=True)
    offerings = [
        ("股票与投研系统集成", "连接获准的行情、持仓、风险与既有研究系统，统一证券身份和指标口径。"),
        ("内部文档系统集成", "将研报、制度、会议记录和内部知识纳入可定位、可追溯的权限体系。"),
        ("IM 与交付集成", "向企业批准的 IM、邮件或工作流发送摘要、提示和审批任务。"),
    ]
    columns = st.columns(3, gap="medium")
    for index, (column, offering) in enumerate(zip(columns, offerings, strict=True), 1):
        with column:
            st.markdown(f'<div class="rw-panel"><span class="rw-number">0{index}</span><h3>{offering[0]}</h3><p>{offering[1]}</p></div>', unsafe_allow_html=True)
    st.subheader("具体费率详细咨询")
    st.write("费用取决于系统数量、数据范围、用户规模、安全要求和持续服务深度。")
    st.link_button("联系 Redwood", "mailto:request@cortexhubs.com?subject=Redwood%20Enterprise%20Inquiry", type="primary")
    footer()


def page_api() -> None:
    brand()
    st.markdown('<div class="rw-kicker">Developer API</div>', unsafe_allow_html=True)
    st.title("OpenAPI, without exposing the engine.")
    st.write("Redwood Research provides a versioned, Bearer-authenticated API. Swagger documents the public contract while private prompts, credentials, local paths, and hidden reasoning remain outside responses.")
    st.code("POST /v1/query\nAuthorization: Bearer <service-token>\nContent-Type: application/json\n\n{\"input\": \"What evidence bears on the current thesis?\"}", language="http")
    docs_url = str(setting("REDWOOD_API_DOCS_URL", ""))
    if docs_url.startswith("https://"):
        st.link_button("Open Swagger UI", docs_url, type="primary")
    else:
        st.info("Configure REDWOOD_API_DOCS_URL to publish the Swagger link.")
    footer()


auth_controls()
navigation = st.navigation(
    [
        st.Page(page_home, title="Research platform", icon="🌲", url_path="home", default=True),
        st.Page(page_membership, title="Membership", icon="💳", url_path="membership"),
        st.Page(page_research, title="Research workspace", icon="💬", url_path="research"),
        st.Page(page_enterprise, title="Enterprise", icon="🏢", url_path="enterprise"),
        st.Page(page_api, title="API", icon="🧩", url_path="api"),
    ]
)
navigation.run()
