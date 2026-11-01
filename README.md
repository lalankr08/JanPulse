# Jan-Pulse — Civic Intelligence and Verification Engine

[![Live Application](https://img.shields.io/badge/Live-janpulse.lalankr.in-0071E3?style=for-the-badge&logo=vercel)](https://janpulse.lalankr.in)
[![Backend Status](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render)](https://janpulse.onrender.com/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Jan-Pulse** is an open-source civic intelligence engine empowering Indian citizens to verify viral WhatsApp forwards, discover public scheme eligibility from official criteria, and decode complex government gazettes in plain language. Every verdict cites authoritative public sources fetched at runtime with exact timestamps, strictly adhering to an automated *"Cannot verify"* policy rather than guessing or hallucinating.

---

## 1. System Architecture

```mermaid
flowchart TB
  subgraph Client ["Citizen Interface (Next.js 15)"]
    UI["Web Portal (Apple HIG & Tailwind)"]
    WSS["Browser SpeechSynthesis (0-Token Local TTS)"]
    WSR["Browser SpeechRecognition (0-Token Local STT)"]
    OG["Dynamic 1200x630 OpenGraph Preview Cards"]
  end

  subgraph Cloud ["Civic Cloud Infrastructure"]
    AUTH["Supabase Auth (Anonymous & Citizen JWT)"]
    API["FastAPI Production Backend (Render)"]
    BW["Auto-Warmer Health Ping Engine"]
    CACHE["Hot In-Memory Share & Verdict Cache"]
  end

  subgraph FastPaths ["Zero-Token & Low-Token Fast-Paths"]
    VC["14-Day Exact & Semantic Cache (0 Tokens, 20ms)"]
    PIB_KB["PIB Fact-Check Debunks Registry (0 Tokens, 50ms)"]
    SCHEMES_KB["Native Civic Schemes KB (~350 Tokens, 800ms)"]
  end

  subgraph Engine ["Typed State Graph Verification Engine"]
    ROUTER["Model Router & Schema Engine"]
    GROQ["Groq LPU: llama-3.1-8b-instant (Fast Reasoning)"]
    GEMINI["Google Gemini: gemini-3.8-flash & 768d Embeddings"]
    WHISPER["Groq Whisper (whisper-large-v3 Audio Fallback)"]
    TOOLS["Civic Tool Registry (Fallback Web Search)"]
  end

  subgraph OfficialSources ["Verified Public Data Ingestion"]
    PIB["PIB Press Releases (pib.gov.in)"]
    NEWS["Google News RSS Verified Feeds"]
    MS["myScheme Official Registry (myscheme.gov.in)"]
    EG["The Gazette of India (egazette.gov.in PDF RAG)"]
    DG["Open Government Data (data.gov.in)"]
  end

  subgraph Storage ["Supabase PostgreSQL"]
    DB[("pgvector, pg_trgm & tsvector (RLS Secured)")]
  end

  UI -->|"SSE Stream / Multipart"| API
  UI -->|"Session Tokens"| AUTH
  UI --> WSS
  UI --> WSR
  API -->|"Zero-Latency Warmer"| BW
  API --> CACHE
  API --> FastPaths
  FastPaths <--> DB
  API --> Engine
  ROUTER --> GROQ
  ROUTER --> GEMINI
  TOOLS --> PIB
  TOOLS --> NEWS
  TOOLS --> MS
  TOOLS --> EG
  TOOLS --> DG
  Engine <--> DB
```

---

## 2. Multi-Tier Verification Pipeline

Jan-Pulse uses an intelligent multi-tier pipeline designed to minimize latency and token consumption while maximizing verification rigor:

```mermaid
flowchart TD
  Q["1. Citizen Input (Text / OCR / Voice)"] --> INGEST["2. Ingest & Prompt Injection Screen"]
  INGEST --> C1{"3. Exact Verdict Cache Match?"}
  
  C1 -- "Yes (Viral Duplicate)" --> R_CACHE["⚡ Return from Cache (0 Tokens, ~20ms)"]
  C1 -- "No" --> C2{"4. PIB Fact-Check Registry Match?"}
  
  C2 -- "Yes (Known Hoax/Scam)" --> R_PIB["⚡ Return Verified PIB Debunk (0 Tokens, ~50ms)"]
  C2 -- "No" --> C3{"5. Native Civic Schemes KB Match?"}
  
  C3 -- "Yes (Top Scheme Query)" --> R_SCHEME["⚡ Evaluate Clean Scheme Criteria
(Single Unified Prompt, ~350 Tokens, ~800ms)"]
  C3 -- "No (Novel / Breaking Event)" --> LIVE_RAG["6. Live Multi-Source Retrieval
(Google News RSS / PIB / myScheme live API)"]
  
  LIVE_RAG --> JUDGE["7. Grounded Evidence Evaluation & Span Check"]
  JUDGE --> SAVE_CACHE["8. Cache Standard Verdict in Supabase"]
  
  R_CACHE --> VERDICT["9. Stream Live SSE Verdict & Save Public Share Card"]
  R_PIB --> VERDICT
  R_SCHEME --> VERDICT
  SAVE_CACHE --> VERDICT
```

---

## 3. Core Features & Capabilities

| Feature | Description | Authoritative Sources |
|---|---|---|
| **F1. Forward Checker** | Validates viral claims (text, screenshot OCR, voice note) and assigns grounded labels: `supported`, `contradicted`, `partly_supported`, or `cannot_verify`. | Press Information Bureau (`pib.gov.in`), Google News RSS wires, Ministry Gazettes. |
| **F2. Zero-Token PIB Debunk Engine** | Matches recurring viral hoaxes (e.g. fake laptop schemes, ₹500 note ban rumors, power disconnection SMS scams) in <50ms with 0 LLM tokens. | Pre-seeded `pib_debunks_kb` in Supabase with trigram matching. |
| **F3. Native Civic Schemes Knowledge Base** | Pre-ingested registry of major welfare programs (PM-Kisan, Ayushman Bharat, PM Surya Ghar, Mudra, PMAY, Ujjwala, SSY, etc.) cutting evaluation tokens by >90%. | Pre-seeded `civic_schemes_kb` in Supabase with hybrid vector & FTS search. |
| **F4. Scheme Eligibility Wizard** | Matches citizen circumstances (age, occupation, state, income) against official criteria with required document checklists. | myScheme official REST registry (`myscheme.gov.in`). |
| **F5. Gazette Explainer** | Decodes central circulars, acts, and statutory PDF orders into plain language: who is affected, deadlines, penalties, and next steps. | The Gazette of India (`egazette.gov.in`) parsed via RAG chunking. |
| **F6. Zero-Token Speech (TTS/STT)** | Uses browser-native Web Speech APIs for instant client-side readouts and live voice note transcription with 0 server token consumption. | Client Web Speech API (English & Hindi) + Groq Whisper fallback. |
| **F7. Permanent Public Share Cards** | Generates cryptographically sealed, immutable verification links (`/share/[id]`) that resolve instantly via in-memory caching and persistent PostgreSQL storage. | Dedicated `public_share_cards` table + 1,000-entry in-memory hot cache. |
| **F8. Dynamic Social Preview Cards** | Real-time 1200×630 server-rendered OpenGraph banners that automatically unfurl on WhatsApp, Twitter/X, Telegram, and LinkedIn with official verdict chips. | Next.js `ImageResponse` with dynamic layout. |
| **F9. Background Engine Warmer** | Pings the backend `/health` endpoint silently upon page load with a corner status pill, eliminating cold-start latency before the user submits a query. | Real-time health check & session-aware caching. |
| **F10. Provenance & Evidence Trail** | Full disclosure of all tool calls, source URLs, HTTP status codes, and execution latencies in milliseconds. | Tracked via `trace_events` in Supabase. |

---

## 4. Latency & Token Efficiency Matrix

| Pipeline Path | Typical Queries | LLM Calls | Token Usage | End-to-End Latency |
| :--- | :--- | :--- | :--- | :--- |
| **1. Exact Cache** | Viral WhatsApp forwards queried within past 14 days | **0** | **0 tokens** | **~15 – 25 ms** |
| **2. PIB Registry** | Known scams, fake cash lotteries, banned note memes | **0** | **0 tokens** | **~40 – 60 ms** |
| **3. Schemes KB** | PM-Kisan installment rules, Ayushman 70+ eligibility, solar subsidies | **1 (Unified)** | **~350 tokens** | **~750 – 900 ms** |
| **4. Live Retrieval** | Breaking news, uncached novel incidents, state orders | **1 (Unified)** | **~850 tokens** | **~2.0 – 2.8 s** |

---

## 5. Models & Routing Strategy

- **Groq `llama-3.1-8b-instant`**: Ultra-fast 8B parameter model (~150ms latency) handling unified verification, single-prompt multilingual extraction, and structured evidence evaluation with low token overhead.
- **Google Gemini `models/gemini-3.8-flash`**: High-context document processing, multimodal OCR for scanned circulars, and comprehensive fallback.
- **Google Gemini `models/gemini-embedding-001`**: 768-dimensional dense vector embeddings stored in Supabase `pgvector`.
- **Groq `whisper-large-v3`**: High-accuracy speech-to-text fallback when browser `SpeechRecognition` is not supported.

---

## 6. Repository Structure

```
JanPulse/
├── frontend/               # Next.js 15 App Router Web Client
│   ├── src/
│   │   ├── app/            # Pages: /, /explain, /schemes, /about, /account, /share/[id]
│   │   │   ├── opengraph-image.tsx       # Root 1200x630 social banner
│   │   │   └── share/[id]/
│   │   │       ├── page.tsx              # Server-rendered metadata for crawlers
│   │   │       ├── opengraph-image.tsx   # Dynamic verdict banner for WhatsApp/X
│   │   │       └── ShareCardClient.tsx   # Interactive client component with offline fallback
│   │   ├── components/     # Apple HIG UI components, AudioPlayer, BackendWarmer
│   │   └── lib/            # api.ts, supabase.ts, historyStore.ts
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                # FastAPI Production Backend Service
│   ├── app/
│   │   ├── graph/          # Typed state graph, pipeline & fast-path engine
│   │   ├── llm/            # ModelRouter, schemas, guardrails, and prompts
│   │   ├── rag/            # Embedder, chunker, gazette RAG, and verifier
│   │   ├── tools/          # PIB, myScheme, e-Gazette, Google News RSS, data.gov.in
│   │   ├── voice/          # Whisper STT & Orpheus TTS fallbacks
│   │   ├── config.py       # Pydantic environment configuration
│   │   ├── db.py           # Resilient PostgreSQL connection pool & KB search
│   │   └── main.py         # REST endpoints & SSE streaming routes
│   ├── migrations/         # PostgreSQL DDL migrations
│   │   ├── 001_initial_schema.sql        # Initial relational schema & pgvector
│   │   └── 002_civic_knowledge_base.sql  # Schemes KB, PIB Registry, & Verdict Cache
│   ├── scripts/            # Management & seeding scripts
│   │   └── seed_civic_kb.py              # Ingests top welfare programs & debunks
│   ├── Dockerfile          # Multi-worker production container
│   └── requirements.txt
│
├── start_backend.bat       # 1-Click Windows backend launcher
├── start_frontend.bat      # 1-Click Windows frontend launcher
└── README.md
```

---

## 7. Local Setup & Quickstart

### Prerequisites
- Python 3.11+ / 3.12 / 3.14
- Node.js 18+ / 20+ / 24+
- Supabase Project with `vector` and `pg_trgm` extensions enabled

### 1. Environment Configuration

Create a `.env` file in the root directory (or in `backend/.env` and `frontend/.env.local`):

```env
# Backend Environment (.env or backend/.env)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_URI=postgresql://postgres.<project>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
GROQ_API=gsk_...
GEMINI_API=AQ...

# Frontend Environment (frontend/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 2. Apply Database Migrations & Seed Knowledge Base

Run the automated migration and seeding script:

```bash
cd backend
python scripts/seed_civic_kb.py
```

This automatically:
1. Applies `001_initial_schema.sql` and `002_civic_knowledge_base.sql`.
2. Creates indexes on vectors, full-text tsvectors, and trigrams.
3. Ingests top Indian welfare schemes and historical PIB fact-check records into Supabase.

### 3. Launch Services

#### Option A: 1-Click Windows Launchers
- Double-click **`start_backend.bat`** (launches FastAPI at `http://localhost:8000`).
- Double-click **`start_frontend.bat`** (launches Next.js at `http://localhost:3000`).

#### Option B: Terminal
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Cloud Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com) ([`https://janpulse.lalankr.in`](https://janpulse.lalankr.in)).
- **Backend**: Containerized via `backend/Dockerfile` on [Render](https://render.com) ([`https://janpulse.onrender.com`](https://janpulse.onrender.com)).
- **Database**: Cloud [Supabase](https://supabase.com) PostgreSQL with `pgvector` & `pg_trgm` indexing.

---

## 9. Limitations & Ethical Notice

- **Advisory Guidance**: Jan-Pulse provides algorithmic guidance based on public government documentation. Verdicts and scheme calculations are automated assistance and do not substitute official administrative determinations.
- **Strict Verification Boundary**: The system programmatically verifies cited spans against retrieved sources before displaying verdicts. If an authoritative record cannot be matched, it marks the claim as `cannot_verify`.
- **Privacy By Design**: Jan-Pulse never collects Aadhaar numbers, phone numbers, or private user credentials. Guest mode functions entirely without storing personal identifiers.
