"""
ANTONI SALES OS // AUTO-PILOT
═══════════════════════════════════════════════════════
Cold Outreach Automation Dashboard
Phase 1: Google Search + Trafilatura (Low-Cost Scanner)
Phase 2: Claude 3.5 Sonnet (AI Brain)
Phase 3: Gmail SMTP (Email Sender)
"""

import json
import re
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import pandas as pd

import streamlit as st
import anthropic
from duckduckgo_search import DDGS
import trafilatura

# ══════════════════════════════════════════════════════
# CONFIGURATION & CONSTANTS
# ══════════════════════════════════════════════════════

CLAUDE_MODEL = "claude-4-6-opus-20260205"

ANALYSIS_PROMPT = """You are an elite B2B sales strategist for ANTONI LAB.
Your goal is to identify high-value targets based on specific criteria.

TARGET CRITERIA:
- Location: {location}
- Target Audience: {target_group}
- Budget Level: {ticket_size}

ADDITIONAL CONTEXT / ASSETS:
The following context/links must be naturally integrated into the outreach (e.g., "I wanted to share..."):
{context_links}

Analyze the website text below.
1. Does this company match the Target Criteria?
2. Identify specific operational inefficiencies or outdated digital presence.

If they are a MATCH, write a high-converting Cold Email to the decision-maker.
The email must:
- Be 3-4 sentences max.
- Reference a specific observation from their site (show you did your homework).
- Propose a concrete value-add related to their specific situation.
- Tone: Professional, direct, "Founder-to-Founder". No marketing fluff.

Return JSON:
{{
  "is_fit": true/false,
  "company_name": "Name",
  "weakness": "Specific weakness identified",
  "email_subject": "Subject",
  "email_body": "Body",
  "fit_score": 1-10
}}

--- WEBSITE TEXT ---
{website_text}
"""

# ══════════════════════════════════════════════════════
# PHASE 1: THE SCANNER (Low-Cost)
# ══════════════════════════════════════════════════════

def scan_leads(query: str, max_leads: int, progress_bar, status_text, region="wt-wt") -> list[dict]:
    """
    Use duckduckgo-search to find URLs, then trafilatura to extract text.
    Returns a list of dicts: [{url, text}, ...]
    """
    leads = []
    urls_found = []

    status_text.markdown(f"🔍 **PHASE 1** — Scanning Network ({region})...")

    try:
        ddgs = DDGS()
        # Use a region setting if specific to Poland later, but generally 'wt-wt' is fine or 'pl-pl'
        # Defaulting to no region or safe search for broad results
        results = ddgs.text(query, region=region, max_results=max_leads * 2)
        
        for r in results:
            urls_found.append(r['href'])
            if len(urls_found) >= max_leads * 2:
                break
                
    except Exception as e:
        status_text.error(f"⚠️ Search error: {e}")
        return leads

    if not urls_found:
        status_text.warning("⚠️ No URLs found. Try a simpler query (e.g. 'Software House Warsaw').")
        return leads

    status_text.markdown(
        f"📡 Found **{len(urls_found)}** URLs — extracting text..."
    )

    processed = 0
    for i, url in enumerate(urls_found):
        if len(leads) >= max_leads:
            break

        progress_bar.progress(
            (i + 1) / len(urls_found),
            text=f"Scanning {i + 1}/{len(urls_found)}: {url[:60]}..."
        )

        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                continue

            text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            if not text or len(text.strip()) < 100:
                continue

            # Truncate to ~3000 chars to save tokens
            truncated_text = text[:3000]

            leads.append({
                "url": url,
                "text": truncated_text,
            })
            processed += 1

        except Exception:
            continue

    progress_bar.progress(1.0, text="✅ Scan complete!")
    status_text.markdown(
        f"✅ **Scan complete** — Extracted text from **{len(leads)}** / {len(urls_found)} URLs"
    )
    return leads


# ══════════════════════════════════════════════════════
# PHASE 2: THE BRAIN (Claude 3.5 Sonnet)
# ══════════════════════════════════════════════════════

def generate_email(api_key: str, website_text: str) -> dict | None:
    """
    Send extracted website text to Claude and get back a structured
    cold email analysis.
    """
    client = anthropic.Anthropic(api_key=api_key)

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": ANALYSIS_PROMPT.format(
                        website_text=website_text,
                        location=st.session_state.get("target_location", "Global"),
                        target_group=st.session_state.get("target_group", "General Business"),
                        ticket_size=st.session_state.get("target_ticket", "Any"),
                        context_links=st.session_state.get("context_links", "")
                    ),
                }
            ],
        )

        raw = message.content[0].text.strip()

        # Robust JSON extraction
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Try to find JSON object in the response
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                return json.loads(match.group())
            return None

    except Exception as e:
        st.error(f"Claude API error: {e}")
        return None


def analyze_leads(api_key: str, raw_leads: list[dict], progress_bar, status_text) -> list[dict]:
    """
    Run Phase 2 on each raw lead: send text to Claude, get email drafts back.
    """
    analyzed = []
    status_text.markdown("🧠 **PHASE 2** — Claude is analyzing targets and drafting emails...")

    for i, lead in enumerate(raw_leads):
        progress_bar.progress(
            (i + 1) / len(raw_leads),
            text=f"Analyzing lead {i + 1}/{len(raw_leads)}..."
        )

        result = generate_email(api_key, lead["text"])

        if result and result.get("is_fit"):
            analyzed.append({
                "company": result.get("company_name", "Unknown"),
                "url": lead["url"],
                "weakness": result.get("weakness", "—"),
                "fit_score": result.get("fit_score", 0),
                "email_subject": result.get("email_subject", ""),
                "email_body": result.get("email_body", ""),
            })

    progress_bar.progress(1.0, text="✅ Analysis complete!")
    status_text.markdown(
        f"🧠 **Analysis complete** — **{len(analyzed)}** qualified leads out of {len(raw_leads)}"
    )
    return analyzed


# ══════════════════════════════════════════════════════
# PHASE 3: THE SENDER (SMTP)
# ══════════════════════════════════════════════════════

def send_email(
    sender_email: str,
    app_password: str,
    to_email: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send a single email via Gmail SMTP with TLS.
    """
    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject

    # Build a styled HTML version
    html_body = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; color: #222; line-height: 1.6;">
        <p>{body.replace(chr(10), '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 11px; color: #999;">
            Sent via ANTONI SALES OS // AUTO-PILOT
        </p>
    </body>
    </html>
    """

    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(sender_email, app_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        return True
    except Exception as e:
        st.error(f"SMTP Error: {e}")
        return False


# ══════════════════════════════════════════════════════
# STREAMLIT UI
# ══════════════════════════════════════════════════════

def inject_custom_css():
    """Premium dark industrial theme."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── Global ── */
        .stApp {
            background-color: #ffffff;
            color: #1a1a1a;
        }
        
        /* Dark Mode Override */
        @media (prefers-color-scheme: dark) {
            .stApp {
                background-color: #0d0d0d; /* Slightly softer black */
                color: #e5e5e5;
            }
        }

        /* ── Typography & Layout ── */
        h1, h2, h3, p, div, button, input {
            font-family: 'Inter', sans-serif !important;
        }
        
        .stMarkdown h1 {
            font-weight: 600 !important;
            letter-spacing: -0.03em !important;
            font-size: 2rem !important;
        }
        
        .mono-font {
            font-family: 'JetBrains Mono', monospace !important;
        }

        /* ── Inputs (Clean, Minimalist) ── */
        .stTextInput input, .stNumberInput input, .stSelectbox div {
            border-radius: 8px !important;
            border: 1px solid #e0e0e0 !important;
            padding: 10px 12px !important;
            box-shadow: none !important;
            transition: all 0.2s ease;
        }
        .stTextInput input:focus, .stSelectbox div:focus-within {
            border-color: #000 !important; /* Minimal focus ring */
        }
        @media (prefers-color-scheme: dark) {
            .stTextInput input, .stNumberInput input, .stSelectbox div {
                background-color: #1a1a1a !important;
                border-color: #333 !important;
                color: #fff !important;
            }
            .stTextInput input:focus, .stSelectbox div:focus-within {
                border-color: #fff !important;
            }
        }

        /* ── Expander (Clean/Flat) ── */
        .streamlit-expanderHeader {
            background-color: transparent !important;
            font-weight: 600 !important;
            letter-spacing: -0.01em !important;
            border: none !important;
        }
        .streamlit-expanderContent {
            border: none !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
        }

        /* ── Buttons (Pill-shaped, Modern) ── */
        .stButton > button {
            border-radius: 9999px !important; /* Full pill shape */
            font-weight: 500 !important;
            border: none !important;
            padding: 0.6rem 2rem !important;
            transition: transform 0.1s ease, opacity 0.2s ease !important;
        }
        .stButton > button:active {
            transform: scale(0.98);
        }

        /* Primary Action (Black/White) */
        .scan-btn .stButton > button {
            background-color: #000 !important;
            color: #fff !important;
        }
        @media (prefers-color-scheme: dark) {
            .scan-btn .stButton > button {
                background-color: #fff !important;
                color: #000 !important;
            }
        }

        /* Secondary Action (Subtle Blue) */
        .send-btn .stButton > button {
            background-color: #007AFF !important;
            color: white !important;
        }

        /* ── Progress Indicators (Thin, Minimal) ── */
        .stProgress > div > div > div > div {
            background-color: #333 !important; 
            height: 4px !important;
        }
        @media (prefers-color-scheme: dark) {
            .stProgress > div > div > div > div {
                 background-color: #ccc !important;
            }
        }

        /* ── Metric Cards (Clean Boxes) ── */
        [data-testid="stMetric"] {
            background-color: #f5f5f5;
            border-radius: 12px;
            padding: 1rem;
            border: none; 
        }
        @media (prefers-color-scheme: dark) {
            [data-testid="stMetric"] {
                background-color: #1a1a1a;
            }
        }
        [data-testid="stMetricLabel"] {
            font-size: 0.75rem !important;
            opacity: 0.7;
        }
        [data-testid="stMetricValue"] {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
        }

        /* ── Footer ── */
        .os-footer {
            opacity: 0.4;
            font-size: 0.7rem;
            text-align: center;
            margin-top: 4rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def main():
    # ── Page config (Centered Layout) ──
    st.set_page_config(
        page_title="ANTONI SALES OS",
        page_icon="⚡",
        layout="centered", # Keeping it focused like a chat app
    )

    inject_custom_css()

    # ── Header ──
    st.markdown("<h1 style='text-align: center; margin-bottom: 2rem;'>Antoni Sales OS</h1>", unsafe_allow_html=True)

    # ── Mission Control (Expander) ──
    with st.expander("Mission Control (Settings & Credentials)", expanded=False):
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("##### 🔐 Credentials")
            api_key = st.text_input(
                "Anthropic API Key",
                value=os.getenv("ANTHROPIC_API_KEY", ""),
                type="password",
                help="Loaded from .env"
            )
            sender_email = st.text_input(
                "Sender Gmail",
                value=os.getenv("GMAIL_SENDER_EMAIL", ""),
                help="For SMTP sending"
            )
            
        with col2:
            st.markdown("##### ✉️ Configuration")
            app_password = st.text_input(
                "App Password",
                value=os.getenv("GMAIL_APP_PASSWORD", ""),
                type="password",
            )
            test_recipient = st.text_input(
                "Test Recipient",
                value=os.getenv("TEST_RECIPIENT", ""),
                placeholder="test@example.com"
            )

    # ── Main Input Area (Gemini-style) ──
    st.markdown("### Search Parameters")
    
    target_query = st.text_input(
        "Search Query",
        value="Logistics Warsaw",
        placeholder="What should we maximize today?",
        label_visibility="collapsed"
    )

    # Context / Attachments (New Feature)
    context_links = st.text_area(
        "Context / Attachments / Links",
        placeholder="Paste links (e.g., http://anto-lab.framer.website/) or context you want referenced in the email...",
        height=100
    )
    st.caption("AI will use this context to personalize the outreach.")

    # Targeting Row
    c1, c2, c3 = st.columns(3)
    with c1:
        st.session_state.target_location = st.text_input("Location", placeholder="e.g. Warsaw")
    with c2:
        st.session_state.target_group = st.text_input("Target", placeholder="e.g. CEO")
    with c3:
        st.session_state.target_ticket = st.selectbox("Budget", ["Any", "Low", "Mid", "High"])
    
    # Advanced Options (Hidden by default to keep clean)
    with st.expander("Advanced Scan Settings"):
        max_leads = st.slider("Max Leads", 1, 20, 5)
        search_region = st.selectbox("Search Region", ["pl-pl", "wt-wt", "us-en", "de-de"], index=0)
        
        # Cost Estimation (Approximate for Claude 3 Opus)
        # Price: ~$15 / 1M input, ~$75 / 1M output
        est_cost = ((4000 * 15) + (500 * 75)) / 1_000_000 * max_leads
        st.caption(f"💰 Est. Cost: ${est_cost:.4f} USD")

    st.markdown("---")

    # ── Action Button (Centered) ──
    col_center = st.columns([1, 2, 1])
    with col_center[1]:
        st.markdown('<div class="scan-btn">', unsafe_allow_html=True)
        scan_clicked = st.button("🚀 EXECUTE SCAN", use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)


    # ── Session State Init ──
    if "leads_df" not in st.session_state:
        st.session_state.leads_df = pd.DataFrame()
    if "scan_complete" not in st.session_state:
        st.session_state.scan_complete = False

    # ── Execution Logic ──
    if scan_clicked:
        if not api_key:
            st.error("Missing API Key. Check Mission Control.")
        else:
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            # Phase 1
            raw_leads = scan_leads(target_query, max_leads, progress_bar, status_text, region=search_region)
            
            if raw_leads:
                # Phase 2
                progress_bar_2 = st.progress(0, text="Analyzing...")
                # Pass context_links to session state for prompt access if needed, 
                # OR pass it directly. app.py's generate_email reads from session_state in previous impl.
                # Let's save it to session_state to be safe since generate_email might expect it
                st.session_state.context_links = context_links
                
                analyzed_leads = analyze_leads(api_key, raw_leads, progress_bar_2, status_text)
                
                if analyzed_leads:
                    st.session_state.leads_df = pd.DataFrame(analyzed_leads)
                    st.session_state.scan_complete = True
                    st.rerun()

    # ── Results View ──
    if st.session_state.scan_complete and not st.session_state.leads_df.empty:
        df = st.session_state.leads_df
        
        st.markdown("### Results")
        
        # Metrics
        m1, m2, m3 = st.columns(3)
        m1.metric("Leads Found", len(df))
        m2.metric("Qualified", len(df[df["fit_score"] >= 7]) if "fit_score" in df.columns else 0)
        m3.metric("Emails Sent", st.session_state.get("emails_sent", 0))

        # Main Data Table
        st.dataframe(
            df,
            use_container_width=True,
            column_config={
                "url": st.column_config.LinkColumn("Link"),
                "fit_score": st.column_config.ProgressColumn("Fit", min_value=0, max_value=10, format="%d"),
            }
        )

        # Actions
        c1, c2 = st.columns(2)
        with c1:
            csv = df.to_csv(index=False).encode("utf-8")
            st.download_button("⬇️ Download CSV", csv, "leads.csv", "text/csv", use_container_width=True)
        
        with c2:
            if sender_email and app_password:
                st.markdown('<div class="send-btn">', unsafe_allow_html=True)
                if st.button("📧 Auto-Send Emails", use_container_width=True):
                    # Sending Logic
                    sent = 0
                    prog = st.progress(0)
                    for i, row in df.iterrows():
                        if row.get("email_subject") and row.get("email_body"):
                            if send_email(sender_email, app_password, test_recipient, f"[TEST] {row['email_subject']}", row['email_body']):
                                sent += 1
                                st.session_state.emails_sent = st.session_state.get("emails_sent", 0) + 1
                        prog.progress((i+1)/len(df))
                    st.success(f"Sent {sent} emails.")
                st.markdown("</div>", unsafe_allow_html=True)

    # ── Footer ──
    st.markdown(
        '<div class="os-footer mono-font">'
        "ANTONI LAB · SALES OS v3.0 · GEMINI VIBE"
        "</div>",
        unsafe_allow_html=True,
    )


# ══════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    main()
