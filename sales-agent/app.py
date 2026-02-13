"""
ANTONI SALES OS — Cold Outreach Automation Dashboard
=====================================================
Tech: Streamlit · browser-use Agent · ChatAnthropic · SQLite · Pandas
"""

import asyncio
import json
import re
import sqlite3
import os
from datetime import datetime

import pandas as pd
import streamlit as st
from langchain_anthropic import ChatAnthropic
from browser_use import Agent

# ──────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "leads.db")


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db() -> None:
    """Create the leads table if it doesn't exist."""
    conn = _get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            company     TEXT,
            website     TEXT,
            phone       TEXT,
            rating      INTEGER,
            email_draft TEXT,
            industry    TEXT,
            city        TEXT,
            created_at  TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def save_leads(leads: list[dict], industry: str, city: str) -> None:
    """Insert a batch of leads into SQLite."""
    conn = _get_connection()
    now = datetime.utcnow().isoformat()
    for lead in leads:
        conn.execute(
            """
            INSERT INTO leads (company, website, phone, rating, email_draft, industry, city, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lead.get("company", ""),
                lead.get("website", ""),
                lead.get("phone", ""),
                lead.get("rating", 0),
                lead.get("email_draft", ""),
                industry,
                city,
                now,
            ),
        )
    conn.commit()
    conn.close()


def load_leads() -> pd.DataFrame:
    """Return all saved leads as a DataFrame."""
    conn = _get_connection()
    df = pd.read_sql_query("SELECT * FROM leads ORDER BY created_at DESC", conn)
    conn.close()
    return df


# ──────────────────────────────────────────────
# Agent logic (async)
# ──────────────────────────────────────────────

AGENT_TASK_TEMPLATE = """
Go to Google Maps (https://www.google.com/maps).
Search for "{industry} in {city}".
Find up to {max_leads} companies.

For each company extract:
- Name (key: "company")
- Website URL if visible (key: "website")
- Phone number if visible (key: "phone")

CRITICAL ASSESSMENT — for each company:
Assess whether the company looks well-established / "rich" but has a poor or outdated digital/tech presence (e.g., no website, ugly website, no social media). Rate them from 1 to 10 where 10 means "high-revenue company with terrible tech — perfect lead".

Then draft a SHORT, punchy B2B cold email (2-3 sentences max) selling them a "Digital Transformation" service from ANTONI LAB.  Store it in the key "email_draft".

IMPORTANT: Return your final answer as ONLY a valid JSON array of objects. Example:
[
  {{
    "company": "Acme Logistics",
    "website": "https://acme.pl",
    "phone": "+48 123 456 789",
    "rating": 8,
    "email_draft": "Hi Acme team, ..."
  }}
]
Do NOT wrap the JSON in markdown code fences. Return ONLY the JSON array.
"""


def _extract_json(text: str) -> list[dict]:
    """
    Robustly extract a JSON array from the agent's output.
    Handles cases where the agent wraps JSON in markdown fences or adds extra text.
    """
    # Try direct parse first
    text = text.strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try to find a JSON array within the text
    pattern = r'\[[\s\S]*?\]'
    matches = re.findall(pattern, text)
    for match in reversed(matches):  # try the last (most likely) match first
        try:
            result = json.loads(match)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            continue

    return []


async def run_agent(api_key: str, industry: str, city: str, max_leads: int, log_placeholder) -> list[dict]:
    """
    Launch the browser-use Agent, stream status updates into the
    Streamlit placeholder, and return parsed leads.
    """
    llm = ChatAnthropic(
        model="claude-3-5-sonnet-20240620",
        api_key=api_key,
        timeout=120,
        temperature=0.0,
    )

    task = AGENT_TASK_TEMPLATE.format(
        industry=industry,
        city=city,
        max_leads=max_leads,
    )

    log_placeholder.info("🚀 Initializing Agent & launching browser …")

    agent = Agent(
        task=task,
        llm=llm,
    )

    log_placeholder.info("🔍 Agent is browsing — this can take a few minutes …")

    result = await agent.run()

    log_placeholder.info("✅ Agent finished — parsing results …")

    # The final answer is typically in result.final_result()
    raw_output = result.final_result() if hasattr(result, "final_result") else str(result)

    leads = _extract_json(raw_output)

    if not leads:
        log_placeholder.warning(
            "⚠️ Could not parse structured leads from the agent output. "
            "Raw output saved below for inspection."
        )
        # Return a single-entry list so the user can still see what came back
        leads = [{"company": "PARSE_ERROR", "website": "", "phone": "", "rating": 0, "email_draft": raw_output}]

    return leads


# ──────────────────────────────────────────────
# Streamlit UI
# ──────────────────────────────────────────────

def main():
    # ── Page config ──
    st.set_page_config(
        page_title="ANTONI SALES OS",
        page_icon="🎯",
        layout="wide",
    )

    # ── Custom CSS for dark / industrial theme ──
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;800&display=swap');

        /* Global */
        .stApp {
            background-color: #0a0a0a;
            color: #e0e0e0;
        }

        /* Title */
        .main-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 2.6rem;
            font-weight: 800;
            color: #00ff88;
            letter-spacing: 4px;
            text-transform: uppercase;
            padding: 1rem 0 0.2rem 0;
            border-bottom: 2px solid #00ff8844;
            margin-bottom: 0.5rem;
        }

        .sub-title {
            font-family: 'Inter', sans-serif;
            font-size: 1rem;
            color: #888;
            margin-bottom: 2rem;
        }

        /* Sidebar */
        section[data-testid="stSidebar"] {
            background-color: #111111;
            border-right: 1px solid #222;
        }
        section[data-testid="stSidebar"] .stMarkdown h2 {
            color: #00ff88;
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 2px;
        }

        /* Buttons */
        .stButton > button {
            background: linear-gradient(135deg, #00ff88, #00cc6a);
            color: #000;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 1.1rem;
            letter-spacing: 2px;
            text-transform: uppercase;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 2rem;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
        }
        .stButton > button:hover {
            background: linear-gradient(135deg, #00cc6a, #009e52);
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }

        /* Dataframe */
        .stDataFrame {
            border: 1px solid #222;
            border-radius: 8px;
        }

        /* Status boxes */
        .stAlert {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }

        /* Metric cards */
        [data-testid="stMetric"] {
            background: #151515;
            border: 1px solid #222;
            border-radius: 8px;
            padding: 1rem;
        }
        [data-testid="stMetricLabel"] {
            color: #888 !important;
            font-family: 'JetBrains Mono', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        [data-testid="stMetricValue"] {
            color: #00ff88 !important;
            font-family: 'JetBrains Mono', monospace;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # ── Header ──
    st.markdown('<div class="main-title">🎯 ANTONI SALES OS</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-title">Cold Outreach Automation · Lead Hunting · AI-Powered Email Drafting</div>',
        unsafe_allow_html=True,
    )

    # ── Sidebar ──
    with st.sidebar:
        st.markdown("## ⚙️ CONFIG")
        api_key = st.text_input(
            "Anthropic API Key",
            type="password",
            placeholder="sk-ant-…",
            help="Required. Get yours at console.anthropic.com",
        )
        st.divider()
        st.markdown("## 🎯 TARGET")
        industry = st.text_input("Target Industry", value="Logistics", placeholder="e.g. Logistics, Manufacturing")
        city = st.text_input("City", value="Warsaw", placeholder="e.g. Warsaw, Kraków")
        max_leads = st.slider("Max Leads to Find", min_value=1, max_value=20, value=5, step=1)

        st.divider()
        st.markdown("## 📊 DATABASE")
        if st.button("🗑️ Clear Database", use_container_width=True):
            conn = _get_connection()
            conn.execute("DELETE FROM leads;")
            conn.commit()
            conn.close()
            st.success("Database cleared.")

    # ── Main area ──
    col_btn, col_status = st.columns([1, 2])

    with col_btn:
        start = st.button("🚀 START HUNTING", use_container_width=True)

    log_area = st.empty()  # live-log placeholder

    # ── Run agent ──
    if start:
        if not api_key:
            st.error("🔑 **API Key is required.** Enter your Anthropic API key in the sidebar.")
        else:
            log_area.info("⏳ Preparing mission …")
            try:
                leads = asyncio.run(
                    run_agent(
                        api_key=api_key,
                        industry=industry,
                        city=city,
                        max_leads=max_leads,
                        log_placeholder=log_area,
                    )
                )

                # Save to DB
                save_leads(leads, industry, city)
                log_area.success(f"✅ Hunt complete — **{len(leads)}** leads captured and saved!")

            except Exception as exc:
                log_area.error(f"❌ Agent error: {exc}")

    # ── Display saved leads ──
    st.divider()
    st.markdown("### 📋 Lead Database")

    df = load_leads()
    if df.empty:
        st.info("No leads yet. Configure your target and hit **START HUNTING**.")
    else:
        # Summary metrics
        m1, m2, m3 = st.columns(3)
        m1.metric("Total Leads", len(df))
        m2.metric("Avg Rating", f"{df['rating'].mean():.1f}" if "rating" in df.columns else "–")
        m3.metric("Unique Cities", df["city"].nunique() if "city" in df.columns else "–")

        # Table
        display_cols = ["company", "website", "phone", "rating", "email_draft", "industry", "city", "created_at"]
        available_cols = [c for c in display_cols if c in df.columns]
        st.dataframe(
            df[available_cols],
            use_container_width=True,
            hide_index=True,
            column_config={
                "company": st.column_config.TextColumn("Company", width="medium"),
                "website": st.column_config.LinkColumn("Website", width="medium"),
                "phone": st.column_config.TextColumn("Phone", width="small"),
                "rating": st.column_config.ProgressColumn("Rating", min_value=0, max_value=10, format="%d"),
                "email_draft": st.column_config.TextColumn("Drafted Email", width="large"),
                "industry": st.column_config.TextColumn("Industry", width="small"),
                "city": st.column_config.TextColumn("City", width="small"),
                "created_at": st.column_config.TextColumn("Date", width="small"),
            },
        )

        # Export option
        csv = df.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="⬇️ Export CSV",
            data=csv,
            file_name=f"leads_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
        )


# ──────────────────────────────────────────────
# Entry-point
# ──────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    main()
