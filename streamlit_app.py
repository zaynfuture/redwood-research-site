"""Redwood Research public site and authenticated research workspace."""

from __future__ import annotations

from typing import Any

import streamlit as st

from redwood_streamlit.api import ResearchApiClient, ResearchApiError
from redwood_streamlit.i18n import SUPPORTED_LANGUAGES, translate
from redwood_streamlit.settings import boolean_setting, setting
from redwood_streamlit.style import apply_style, footer


st.set_page_config(
    page_title="Redwood Research",
    page_icon="🌲",
    layout="wide",
    initial_sidebar_state="auto",
)
apply_style()


def current_language() -> str:
    return str(st.session_state.get("language", "zh"))


def t(key: str, **values: object) -> str:
    return translate(current_language(), key, **values)


def masthead() -> None:
    """Keep brand and language control visible on every route and viewport."""
    st.radio(
        t("language.label"),
        options=list(SUPPORTED_LANGUAGES),
        format_func=SUPPORTED_LANGUAGES.get,
        horizontal=True,
        key="language",
    )


def api_client() -> ResearchApiClient:
    return ResearchApiClient(
        base_url=str(setting("REDWOOD_API_BASE_URL", "")),
        service_token=str(setting("REDWOOD_API_SERVICE_TOKEN", "")),
    )


@st.cache_data(ttl=30, show_spinner=False)
def api_health(base_url: str) -> tuple[bool, str]:
    """Bounded public health check; never caches or transmits the service token."""
    if not base_url.startswith("https://"):
        return False, "unconfigured"
    try:
        payload = ResearchApiClient(base_url=base_url, service_token="").health()
    except ResearchApiError:
        return False, "offline"
    return payload.get("status") == "ok", "online"


def connection_controls() -> bool:
    base_url = str(setting("REDWOOD_API_BASE_URL", ""))
    online, state = api_health(base_url)
    label = t(f"connection.{state}")
    css_class = "rw-status-online" if online else "rw-status-offline"
    st.sidebar.markdown(
        f'<div class="rw-status {css_class}">● {label}</div>',
        unsafe_allow_html=True,
    )
    st.sidebar.caption(t("connection.caption"))
    if not online and st.sidebar.button(t("connection.retry"), use_container_width=True):
        api_health.clear()
        st.rerun()
    return online


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
        st.sidebar.caption(t("auth.disabled"))
        return
    if authenticated():
        email = getattr(st.user, "email", None) or "Authorized user"
        st.sidebar.caption(t("auth.signed_in", email=email))
        if st.sidebar.button(t("auth.sign_out"), use_container_width=True):
            st.logout()
    elif st.sidebar.button(t("auth.continue_google"), type="primary", use_container_width=True):
        try:
            st.login()
        except Exception:
            st.sidebar.error(t("auth.not_configured"))


def page_home() -> None:
    masthead()
    st.markdown(f'<div class="rw-kicker">{t("home.kicker")}</div>', unsafe_allow_html=True)
    st.title(t("home.title"))
    st.markdown(
        f'<p class="rw-lead">{t("home.lead")}</p>',
        unsafe_allow_html=True,
    )
    left, right = st.columns([1.2, 1], gap="large")
    with left:
        st.subheader(t("home.order_title"))
        st.write(t("home.order_copy"))
        st.markdown(f"**{t('home.traits')}**")
    with right:
        st.markdown(
            f'<div class="rw-panel"><span class="rw-number">{t("home.system")}</span>'
            f'<h3>{t("home.evidence_title")}</h3><p>{t("home.evidence_copy")}</p></div>',
            unsafe_allow_html=True,
        )
    st.divider()
    st.markdown(f'<div class="rw-kicker">{t("home.capabilities")}</div>', unsafe_allow_html=True)
    cards = [
        ("01", t("home.card1.title"), t("home.card1.copy")),
        ("02", t("home.card2.title"), t("home.card2.copy")),
        ("03", t("home.card3.title"), t("home.card3.copy")),
    ]
    columns = st.columns(3, gap="medium")
    for column, (number, title, copy) in zip(columns, cards, strict=True):
        with column:
            st.markdown(f'<div class="rw-panel"><span class="rw-number">{number}</span><h3>{title}</h3><p>{copy}</p></div>', unsafe_allow_html=True)
    footer(t("footer"))


def page_membership() -> None:
    masthead()
    st.markdown(f'<div class="rw-kicker">{t("membership.kicker")}</div>', unsafe_allow_html=True)
    st.title(t("membership.title"))
    individual, enterprise = st.columns(2, gap="large")
    with individual:
        st.subheader(t("membership.individual"))
        st.markdown("\n".join(f"- {t(f'membership.item{i}')}" for i in range(1, 5)))
        payment_link = str(setting("STRIPE_PAYMENT_LINK", ""))
        if payment_link.startswith("https://"):
            st.link_button(t("membership.activate"), payment_link, type="primary", use_container_width=True)
        else:
            st.info(t("membership.payment_pending"))
    with enterprise:
        st.subheader(t("membership.enterprise"))
        st.markdown("\n".join(f"- {t(f'membership.enterprise{i}')}" for i in range(1, 5)))
        st.link_button(t("membership.consult"), "mailto:request@cortexhubs.com?subject=Redwood%20Enterprise%20Inquiry", use_container_width=True)
    st.markdown(f'<p class="rw-note">{t("membership.note")}</p>', unsafe_allow_html=True)
    footer(t("footer"))


def page_research() -> None:
    masthead()
    st.markdown(f'<div class="rw-kicker">{t("research.kicker")}</div>', unsafe_allow_html=True)
    st.title(t("research.title"))
    if not authenticated():
        st.info(t("research.signin"))
        if st.button(t("auth.continue_google"), type="primary"):
            try:
                st.login()
            except Exception:
                st.error(t("auth.not_configured"))
        footer(t("footer"))
        return

    if not has_research_access():
        st.warning(t("research.no_access"))
        payment_link = str(setting("STRIPE_PAYMENT_LINK", ""))
        if payment_link.startswith("https://"):
            st.link_button(t("membership.activate"), payment_link, type="primary")
        st.caption(t("research.after_payment"))
        footer(t("footer"))
        return

    client = api_client()
    if not client.configured:
        st.error(t("research.api_missing"))
        footer(t("footer"))
        return

    online, _ = api_health(client.base_url)
    if not online:
        st.error(t("research.offline_help"))
        if st.button(t("connection.retry"), type="primary"):
            api_health.clear()
            st.rerun()
        footer(t("footer"))
        return

    if "messages" not in st.session_state:
        st.session_state.messages = []
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    question = st.chat_input(t("research.input"), max_chars=8_000)
    if question:
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            with st.spinner(t("research.reviewing")):
                try:
                    result = client.query(question)
                    answer = str(result.get("answer", t("research.no_answer")))
                    st.markdown(answer)
                    evidence = result.get("evidence", [])
                    if isinstance(evidence, list) and evidence:
                        with st.expander(t("research.evidence", count=len(evidence))):
                            for item in evidence:
                                render_evidence(item)
                    gaps = result.get("gaps", [])
                    if gaps:
                        with st.expander(t("research.gaps")):
                            st.json(gaps)
                    st.caption(
                        t(
                            "research.observation",
                            observation=result.get("observation_id") or "—",
                            tokens=result.get("estimated_tokens", 0),
                        )
                    )
                except ResearchApiError as exc:
                    answer = t("research.offline_help") if "temporar" in str(exc).lower() else str(exc)
                    st.error(answer)
        st.session_state.messages.append({"role": "assistant", "content": answer})
    st.caption(t("research.verify"))
    footer(t("footer"))


def render_evidence(item: Any) -> None:
    if not isinstance(item, dict):
        return
    title = item.get("title", t("research.unknown_source"))
    evidence_id = item.get("canonical_evidence_id", t("research.unknown_evidence"))
    st.markdown(f"**{title}**  \n`{evidence_id}`")
    if item.get("excerpt"):
        st.write(item["excerpt"])


def page_enterprise() -> None:
    masthead()
    st.markdown(f'<div class="rw-kicker">{t("enterprise.kicker")}</div>', unsafe_allow_html=True)
    st.title(t("enterprise.title"))
    st.markdown(f'<p class="rw-lead">{t("enterprise.lead")}</p>', unsafe_allow_html=True)
    offerings = [
        (t("enterprise.card1.title"), t("enterprise.card1.copy")),
        (t("enterprise.card2.title"), t("enterprise.card2.copy")),
        (t("enterprise.card3.title"), t("enterprise.card3.copy")),
    ]
    columns = st.columns(3, gap="medium")
    for index, (column, offering) in enumerate(zip(columns, offerings, strict=True), 1):
        with column:
            st.markdown(f'<div class="rw-panel"><span class="rw-number">0{index}</span><h3>{offering[0]}</h3><p>{offering[1]}</p></div>', unsafe_allow_html=True)
    st.subheader(t("enterprise.pricing"))
    st.write(t("enterprise.pricing_copy"))
    st.link_button(t("enterprise.contact"), "mailto:request@cortexhubs.com?subject=Redwood%20Enterprise%20Inquiry", type="primary")
    footer(t("footer"))


def page_api() -> None:
    masthead()
    st.markdown(f'<div class="rw-kicker">{t("api.kicker")}</div>', unsafe_allow_html=True)
    st.title(t("api.title"))
    st.write(t("api.copy"))
    st.code("POST /v1/query\nAuthorization: Bearer <service-token>\nContent-Type: application/json\n\n{\"input\": \"What evidence bears on the current thesis?\"}", language="http")
    docs_url = str(setting("REDWOOD_API_DOCS_URL", ""))
    if docs_url.startswith("https://"):
        st.link_button(t("api.swagger"), docs_url, type="primary")
    else:
        st.info(t("api.docs_missing"))
    footer(t("footer"))


connection_controls()
st.sidebar.divider()
auth_controls()
navigation = st.navigation(
    [
        st.Page(page_home, title=t("nav.home"), icon="🌲", url_path="home", default=True),
        st.Page(page_membership, title=t("nav.membership"), icon="💳", url_path="membership"),
        st.Page(page_research, title=t("nav.research"), icon="💬", url_path="research"),
        st.Page(page_enterprise, title=t("nav.enterprise"), icon="🏢", url_path="enterprise"),
        st.Page(page_api, title="API", icon="🧩", url_path="api"),
    ]
)
navigation.run()
