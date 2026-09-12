"""Shared Redwood Streamlit presentation."""

import streamlit as st


def apply_style() -> None:
    st.markdown(
        """
        <style>
        :root {
            --redwood: #9f3828;
            --redwood-dark: #75291f;
            --ink: #1b1d1b;
            --muted: #62645f;
            --paper: #f7f6f2;
            --surface: #fffefa;
            --line: #d9d7cf;
        }
        html { font-size: 16px; }
        .stApp {
            color: var(--ink);
            background:
                radial-gradient(circle at 82% 4%, rgba(159,56,40,.08), transparent 24rem),
                var(--paper);
        }
        [data-testid="stHeader"] {
            background: rgba(247,246,242,.88);
            backdrop-filter: blur(12px);
        }
        [data-testid="stSidebar"] {
            border-right: 1px solid var(--line);
            background: rgba(242,240,234,.96);
        }
        [data-testid="stSidebarContent"] { padding-top: .75rem; }
        .block-container {
            width: min(100%, 1240px);
            padding: clamp(3.5rem, 6vw, 4.5rem) clamp(1rem, 4vw, 3.25rem) 5rem;
        }
        h1, h2, h3 { color: var(--ink); letter-spacing: -.035em; text-wrap: balance; }
        h1 {
            max-width: 15ch;
            font-size: clamp(2.35rem, 6vw, 4.75rem) !important;
            line-height: 1.02 !important;
            margin-bottom: .9rem !important;
        }
        h2 { font-size: clamp(1.75rem, 3.4vw, 3rem) !important; }
        h3 { font-size: clamp(1.15rem, 2vw, 1.45rem) !important; }
        p, li { font-size: 1rem; line-height: 1.65; }
        .rw-brand {
            display:block;
            width: fit-content;
            margin-bottom: .8rem;
            color:var(--ink) !important;
            font-weight:800;
            font-size:.92rem;
            line-height:1;
            letter-spacing:.14em;
        }
        .rw-kicker {
            color:var(--redwood);
            font:700 .78rem/1.4 ui-monospace,monospace;
            letter-spacing:.15em;
            text-transform:uppercase;
            margin-bottom:.35rem;
        }
        .rw-lead {
            max-width:760px;
            color:var(--muted);
            font-size:clamp(1.05rem, 2vw, 1.25rem);
            line-height:1.7;
            margin:.75rem 0 clamp(1.5rem, 4vw, 2.5rem);
        }
        .rw-panel {
            height:100%;
            min-height:190px;
            border:1px solid var(--line);
            border-radius:20px;
            padding:clamp(1.15rem, 2.4vw, 1.65rem);
            background:rgba(255,254,250,.88);
            box-shadow:0 12px 34px rgba(39,31,26,.045);
        }
        .rw-panel h3 { margin:.45rem 0 .5rem; }
        .rw-panel p { color:var(--muted); margin-bottom:0; }
        .rw-number { color:var(--redwood); font:700 .75rem ui-monospace,monospace; }
        .rw-note {
            border-left:3px solid var(--redwood);
            border-radius:0 12px 12px 0;
            padding:.9rem 1rem;
            background:#efe6e0;
            color:#514943;
        }
        .rw-footer {
            margin-top:clamp(2.5rem, 7vw, 5rem);
            padding-top:1rem;
            border-top:1px solid var(--line);
            color:#73746f;
            font-size:.82rem;
        }
        .rw-status { font-size:.88rem; font-weight:650; margin:.15rem 0 .25rem; }
        .rw-status-online { color:#237346; }
        .rw-status-offline { color:#a13a2b; }
        .stButton > button, .stLinkButton > a {
            min-height:44px;
            border-radius:999px;
            font-weight:650;
            touch-action:manipulation;
        }
        [data-testid="stChatInput"] textarea { font-size:16px !important; }
        .stChatMessage {
            border:1px solid var(--line);
            border-radius:16px;
            background:rgba(255,254,250,.92);
        }
        code { color:var(--redwood-dark) !important; }
        @media (max-width: 768px) {
            .block-container { padding:3.75rem .9rem 4rem; }
            h1 { font-size:clamp(2.15rem, 12vw, 3.35rem) !important; }
            .rw-brand { margin-bottom:.65rem; }
            .rw-panel { min-height:0; border-radius:16px; }
            [data-testid="stHorizontalBlock"] { flex-direction:column; gap:.85rem; }
            [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] {
                width:100% !important;
                flex:1 1 100% !important;
                min-width:0 !important;
            }
            [data-testid="stSidebar"] { min-width:min(88vw, 320px); }
            .stButton > button, .stLinkButton > a { width:100%; }
        }
        @media (min-width: 769px) and (max-width: 1100px) {
            .block-container { padding-left:1.6rem; padding-right:1.6rem; }
            .rw-panel { min-height:210px; }
        }
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { scroll-behavior:auto !important; transition:none !important; }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def brand() -> None:
    st.markdown("**REDWOOD**")


def footer(copy: str = "© 2026 Cortex Hubs · Research support only · No order execution") -> None:
    st.markdown(
        f'<div class="rw-footer">{copy}</div>',
        unsafe_allow_html=True,
    )
