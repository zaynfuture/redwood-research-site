"""Shared Redwood Streamlit presentation."""

import streamlit as st


def apply_style() -> None:
    st.markdown(
        """
        <style>
        :root { --redwood: #a63d2c; --ink: #1c1c1a; --paper: #f8f6f1; }
        .stApp { background: var(--paper); }
        [data-testid="stHeader"] { background: rgba(248,246,241,.88); }
        [data-testid="stSidebar"] { border-right: 1px solid #dcd7ce; }
        .block-container { max-width: 1180px; padding-top: 2.2rem; padding-bottom: 5rem; }
        h1, h2, h3 { color: var(--ink); letter-spacing: -.035em; }
        h1 { font-size: clamp(2.8rem, 7vw, 5.8rem) !important; line-height: .98 !important; }
        h2 { font-size: clamp(1.8rem, 4vw, 3.2rem) !important; }
        .rw-brand { display:flex; align-items:center; gap:.75rem; font-weight:800; letter-spacing:.13em; margin-bottom:2rem; }
        .rw-mark { width:11px; height:31px; border-left:3px solid var(--redwood); display:inline-block; transform:skewY(-28deg); }
        .rw-kicker { color:var(--redwood); font:700 .72rem ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; }
        .rw-lead { max-width:780px; color:#5e5c56; font-size:1.18rem; line-height:1.7; margin:1rem 0 2rem; }
        .rw-panel { border:1px solid #dcd7ce; border-radius:18px; padding:1.35rem; background:#fffdf8; min-height:180px; }
        .rw-panel h3 { margin-top:.35rem; }
        .rw-number { color:var(--redwood); font:700 .72rem ui-monospace,monospace; }
        .rw-note { border-left:3px solid var(--redwood); padding:.8rem 1rem; background:#f1e8e2; color:#514943; }
        .rw-footer { margin-top:4rem; padding-top:1rem; border-top:1px solid #dcd7ce; color:#77736c; font-size:.8rem; }
        .stButton > button, .stLinkButton > a { border-radius:999px; font-weight:650; }
        .stChatMessage { border:1px solid #ded9d0; background:#fffdf8; }
        code { color:#7f2f22 !important; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def brand() -> None:
    st.markdown('<div class="rw-brand"><span class="rw-mark"></span>REDWOOD</div>', unsafe_allow_html=True)


def footer() -> None:
    st.markdown(
        '<div class="rw-footer">© 2026 Cortex Hubs · Informational research support only · No order execution</div>',
        unsafe_allow_html=True,
    )
