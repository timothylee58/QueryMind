# QueryMind

Natural language SQL agent — ask questions in plain English, get results from your PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Architecture                            │
│                                                                 │
│  User Browser                                                   │
│      │                                                          │
│      ▼                                                          │
│  Cloudflare CDN  ──►  Vercel (Next.js frontend)                │
│                              │                                  │
│                              │  POST /query                     │
│                              ▼                                  │
│                    AWS App Runner (FastAPI)                     │
│                    ┌──────────────────────┐                     │
│                    │  Rate limit (20/min) │                     │
│                    │  Cache lookup        │◄──► Upstash Redis   │
│                    │  NL → SQL (Claude)   │                     │
│                    │  Execute query       │◄──► User's Postgres │
│                    │  Cache write         │                     │
│                    └──────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- Natural language → SQL via Claude (`claude-haiku-4-5`)
- SELECT-only enforcement with 500-row cap and 10-second timeout
- Upstash Redis response cache (TTL 3600s)
- Rate limiting: 20 requests/minute per IP
- Session-scoped DB connections — connection strings never stored server-side
- Schema explorer, SQL preview with copy, paginated result table
- PWA-ready Vue 3 dashboard (`frontend/`)

## Quick Start (Local)

**Prerequisites:** Docker, pnpm ≥ 9, Python 3.11

```bash
# 1. Clone and install
git clone https://github.com/timothylee58/querymind.git
cd querymind
pnpm install

# 2. Configure backend
cp backend/.env.example backend/.env  # fill in real values

# 3. Start backend + Redis
docker compose up -d

# 4. Start Next.js frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST token |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `ENV` | — | `development` \| `production` (default: `production`) |

> **Never commit real credentials.** `backend/.env` contains placeholder values only.

### Frontend (Vercel environment variables)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL (e.g. `https://api.querymind.com`) |
| `AUTH_SECRET` | Next-Auth secret |
| `POSTGRES_URL` | Drizzle ORM connection string (query history) |

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/schema?schema_name=public` | List tables and columns |
| `POST` | `/query` | Generate and execute NL query |

### POST /query

```json
// Request
{
  "nl_query": "Show me the 10 most recent users",
  "connection_string": "postgresql://...",
  "schema_name": "public"
}

// Response
{
  "sql": "SELECT * FROM users ORDER BY created_at DESC LIMIT 10",
  "results": [...],
  "row_count": 10,
  "execution_time_ms": 42.1,
  "cached": false
}
```

## Security

- **SELECT-only**: regex + asyncpg readonly transaction block DML/DDL
- **Row cap**: LIMIT 500 injected if query has no LIMIT or exceeds 500
- **Timeout**: `statement_timeout = 10000ms` per connection
- **Rate limit**: 20 requests/minute per IP via slowapi
- **Error sanitization**: raw PostgreSQL errors never exposed to client
- **No stored credentials**: connection strings are request-scoped, never persisted

## Deployment

### Frontend → Vercel

1. Import repo in Vercel dashboard
2. Set `NEXT_PUBLIC_API_URL` to your App Runner URL
3. Push to `main` triggers auto-deploy

### Backend → AWS App Runner

1. Create ECR repository named `querymind-backend`
2. Add GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. Create App Runner service pointing to ECR repo
4. Add App Runner env vars from the backend table above
5. Push to `main` — CI builds Docker image, pushes to ECR, triggers redeploy

### Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy REST URL and token into App Runner env vars

### Cloudflare CDN (optional)

Point your domain's DNS to the Vercel deployment URL via a CNAME record, then proxy through Cloudflare for caching and DDoS protection.

## Project Structure

```
querymind/
├── app/                    # Next.js App Router pages + API routes
├── components/
│   └── chat/               # ChatWindow, MessageBubble, SqlPreview, QueryResultTable, SchemaSelector
├── lib/
│   ├── api.ts              # FastAPI client (generateQuery, getSchema)
│   └── ai/tools/           # generate-sql, execute-query, explain-sql AI tools
├── types/                  # Shared TypeScript interfaces
├── backend/                # FastAPI Python service
│   ├── app/
│   │   ├── api/routes/     # /health, /schema, /query
│   │   ├── core/           # asyncpg pool, Upstash Redis cache
│   │   └── services/       # nl_to_sql, sql_executor, schema_inspector
│   └── tests/              # pytest (6 tests)
├── frontend/               # Vue 3 + Pinia + PWA dashboard
├── docker-compose.yml      # Local dev: backend + Redis
└── .github/workflows/      # backend.yml, frontend.yml CI/CD
```

## Running Tests

```bash
# Backend
cd backend && pytest -v

# Frontend type check
pnpm tsc --noEmit

# Next.js build
pnpm build
```
