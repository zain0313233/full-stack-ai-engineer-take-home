# Finance AI — Personal Finance Assistant

> Revonix Full Stack AI Engineer Take-Home Assessment

A real, working full-stack AI application where users log in, import their financial data, and talk to an intelligent assistant in plain English about their money.

---

## Live Demo

> Run locally with the setup instructions below.

---

## Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free tier works)
- A [Tavily](https://app.tavily.com) API key (for merchant search)

### 1. Clone and install

```bash
git clone <repo-url>
cd full-stack-ai-engineer-take-home
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=          # Supabase/Neon Postgres pooler URL
DIRECT_URL=            # Supabase/Neon direct URL
GROQ_API_KEY=
TAVILY_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Also copy `.env.local` values into `.env` for Prisma CLI.

### 3. Push database schema

```bash
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features Implemented

| Feature | Status | Notes |
|---|---|---|
| Multi-user auth (sign up / sign in) | ✅ Full | Supabase Auth |
| CSV transaction import | ✅ Full | Flexible column detection, deduplication |
| Spending queries ("how much on groceries?") | ✅ Full | Pre-aggregated summaries, instant answers |
| Time-period comparison ("vs last month") | ✅ Full | Multi-month data with follow-up prompts |
| Recurring subscription detection | ✅ Full | Merchant + amount consistency across months |
| Anomaly flagging | ✅ Full | Z-score > 2.5 vs category baseline |
| Budget tracking with alerts | ✅ Full | Per-category limits, over-budget warnings |
| Receipt photo reading | ✅ Full | Groq vision model (llama-4-scout) |
| Unknown charge lookup | ✅ Full | Tavily web search tool |
| User memory ("I get paid on the 1st") | ✅ Full | Persisted to DB, injected into every prompt |
| Plain English summaries | ✅ Full | Engaging, conversational responses |
| Mock bank endpoint | ✅ Stub | `GET /api/mock-bank` returns live-dated data |
| CSV stored in cloud storage | ✅ Full | Supabase Storage bucket on every import |
| Real bank connection (Plaid) | ❌ Skipped | Time constraint — mock endpoint stands in |
| Push notifications | ❌ Skipped | Out of scope for 6-hour window |

---

## Architecture

### System Overview

```
User
 │
 ▼
Next.js 15 (App Router)
 ├── /app/dashboard/*        — Server components, data fetched at render time
 ├── /app/api/chat           — Streaming AI endpoint
 ├── /app/api/transactions/* — Import + aggregation
 └── /app/api/budgets        — Budget CRUD
 │
 ├── Supabase Auth           — Multi-user sessions, JWT middleware
 ├── Neon Postgres (Prisma)  — Transactions, summaries, budgets, memory, chat
 ├── Groq API                — LLM inference (llama-3.3-70b + llama-4-scout vision)
 └── Tavily                  — Web search for unknown merchants
```

### Key Architectural Decisions

#### 1. Pre-aggregated Spending Summaries

Every CSV import rebuilds a `spending_summaries` table keyed by `(user, year, month, category)`. Simple queries like "how much on groceries in March?" are answered with a single indexed lookup — no full table scan, no LLM tool call needed. This handles 10×–100× data growth without degradation.

#### 2. Data Context Pre-fetched Before AI Call

Rather than having the AI call a `get_data_overview` tool first (wasting a full LLM round-trip), the server fetches the user's date range and monthly totals **before** the AI call and injects them into the system prompt. The AI answers common questions in a single step.

#### 3. Cost-Aware Single Model

One model (`llama-3.3-70b-versatile`) handles all query types. The previous design used two models (classifier + main), which doubled token usage on every request. With Groq's free tier at 6,000 TPM, eliminating the classification step was critical.

#### 4. Token Budget Management

| Technique | Savings |
|---|---|
| Compact system prompt (~120 tokens) | vs ~400 before |
| Chat history trimmed to last 6 messages | vs full history |
| Compact tool outputs (numbers, no prose) | ~80 tokens/tool vs ~300 |
| `maxTokens: 450` cap on responses | prevents runaway generation |

#### 5. Tool-Calling Agent

For questions that need live data (specific date ranges, filtered searches, budget status), the AI uses Vercel AI SDK tool calls with `maxSteps: 3`. Tools: `query_transactions`, `get_spending_summary`, `get_budget_status`, `get_recurring_subscriptions`, `get_anomalies`, `search_web`, `save_user_memory`.

#### 6. User Memory

Facts the user mentions (pay date, salary, exclusions) are saved to a `user_memory` table and injected into every system prompt. This implements the "remember context" requirement without any vector database.

#### 7. Anomaly & Recurring Detection

Purely statistical, no ML model needed:
- **Recurring**: same merchant appearing with <5% amount variance across 2+ distinct months
- **Anomaly**: transaction amount > 2.5 standard deviations above category mean (minimum 3 samples)

---

## Trade-offs & Limitations

| Decision | Why |
|---|---|
| Groq free tier (6k TPM) | Fast enough for demo; production would use Dev tier (100k TPM) |
| No streaming retry on rate limit | Would add latency; user retries naturally |
| Summaries rebuilt on import (not incremental) | Simpler correctness guarantee; acceptable for CSV workflow |
| Chat history trimmed to 6 messages | Keeps token budget; longer context needs paid API |
| No real bank connection | Plaid requires business account + compliance; mock endpoint demonstrates the integration point |
| Vision model response not streamed | Groq vision endpoint latency is higher; treated as a single-step call |

---

## What Was Intentionally Skipped

- **Plaid / open banking integration** — requires business Plaid account; mock bank endpoint demonstrates the intended integration point
- **Push / email notifications** — no infrastructure for webhooks in a local demo
- **Multi-currency support** — assumes USD throughout
- **Pagination on chat history** — sidebar shows last 30 sessions
- **Admin panel** — single-product consumer app, no admin role needed

---

## Database Schema

```
users               — Supabase auth ID → internal user
transactions        — All financial events (CSV rows, receipts, mock bank)
spending_summaries  — Pre-aggregated (user, year, month, category) totals
budgets             — Per-category monthly limits
chat_sessions       — Conversation containers
chat_messages       — Individual messages with metadata
user_memory         — Key-value store for persistent user context
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 App Router | Full-stack in one repo, RSC for fast data fetching |
| Auth | Supabase Auth | Multi-user out of the box, 10-min setup |
| Database | Neon Postgres + Prisma | Type-safe queries, migrations, serverless-friendly |
| AI | Groq (llama-3.3-70b + llama-4-scout) | Fastest inference available, free tier adequate for demo |
| AI SDK | Vercel AI SDK v4 | Streaming, tool calling, `useChat` hook |
| Web Search | Tavily | Already in stack, purpose-built for AI agents |
| Storage | Supabase Storage | Raw CSV archive per user |
| UI | Tailwind + shadcn/ui + Recharts | Consistent, fast to build |

---

## Running the AI Locally

After setup, try these in the chat:

- *"How much did I spend on groceries?"* — uses pre-fetched summaries, answers instantly
- *"Show me my subscriptions"* — calls `get_recurring_subscriptions` tool
- *"What is this AMZN MKTP charge?"* — calls Tavily web search
- *"I get paid on the 1st"* — saves to memory, acknowledged in future responses
- Upload a receipt photo — vision model extracts merchant/amount/date

---

*Built in a single sitting for the Revonix Full Stack AI Engineer take-home assessment.*
