# QueryMind

**QueryMind** is a natural language SQL agent built on Next.js and the Vercel AI SDK. Connect any Postgres database, ask questions in plain English, review the generated SQL, confirm it, and get results as interactive tables or charts — all inside a conversational interface.

---

## How it works

```
User question
     │
     ▼
generate_sql ──► SQL + explanation shown in SqlPreview
                        │
               User clicks "Run Query"
                        │
                        ▼
               execute_query ──► QueryResult (table / bar / line chart)
                        │
                        ▼
               saveQueryHistory (audit trail)
```

1. **Connect** — paste a Postgres connection string into the DB Connect modal. It is validated with `SELECT 1` and held only in React state — never persisted.
2. **Ask** — type a question in plain English. The AI calls `generate_sql`, producing SQL and a plain-English explanation.
3. **Review** — the `SqlPreview` component displays the SQL in a syntax-highlighted code block. Write operations (INSERT / UPDATE / DELETE / DROP) get a warning badge.
4. **Confirm** — click **Run Query**. The `execute_query` tool fires only when `confirmed: true`.
5. **Explore** — results appear in `QueryResult` as a scrollable data table. If the data is numeric and ≤ 100 rows, toggle to a bar or line chart.

---

## Features

- **Natural language to SQL** — powered by the Vercel AI SDK `streamText` with custom tools
- **Schema explorer** — collapsible sidebar listing every table and column in the connected database's `public` schema
- **SQL confirmation gate** — write operations are blocked until the user explicitly confirms
- **Result visualisation** — recharts bar/line chart toggle for numeric result sets
- **Query history** — every successful query is saved to the `QueryHistory` table with question, SQL, row count, and execution time
- **Session-scoped connections** — connection strings are never stored in the application database
- **Auth & rate limiting** — Auth.js authentication with per-user hourly message limits
- **Resumable streams** — Redis-backed resumable streaming for long-running queries

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) App Router |
| AI | [Vercel AI SDK](https://ai-sdk.dev) + AI Gateway |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| App database | [Neon Serverless Postgres](https://vercel.com/marketplace/neon) + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Auth.js v5](https://authjs.dev) |
| File storage | [Vercel Blob](https://vercel.com/storage/blob) |

---

## AI tools

| Tool | Description |
|------|-------------|
| `generate_sql` | Converts a natural language question + schema context into SQL and an explanation |
| `execute_query` | Runs SQL against the user's database; requires `confirmed: true` |
| `explain_sql` | Returns a plain-English breakdown of any SQL query |

---

## Project structure

```
app/
  (auth)/               Auth.js routes and config
  (chat)/
    api/chat/           Streaming chat route — SQL tools registered here
    api/chat/schema.ts  Zod schema for POST body (includes schemaContext)
  actions/
    validate-connection.ts   SELECT 1 health check for user-supplied DB
    save-query.ts            Saves query history after execution

components/
  schema-explorer.tsx   Collapsible table/column sidebar
  sql-preview.tsx       SQL code block with Run / Cancel buttons
  query-result.tsx      Data table + recharts chart toggle
  db-connect-modal.tsx  Dialog for entering a Postgres connection string

lib/
  ai/
    prompts.ts          QueryMind system prompt + schemaContext injection
    tools/
      generate-sql.ts
      execute-query.ts
      explain-sql.ts
  db/
    connection.ts       getTargetDbClient, getSchemaContext, getSchemaStructured
    schema.ts           Drizzle schema — includes QueryHistory table
    migrations/
      0001_query_history.sql
```

---

## Running locally

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Neon (or any Postgres) URL for the application database |
| `AUTH_SECRET` | Random secret for Auth.js — generate with `openssl rand -base64 32` |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (not needed on Vercel — OIDC is automatic) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for file uploads |
| `REDIS_URL` | _(optional)_ Redis URL for resumable stream support |

Install dependencies and run migrations:

```bash
pnpm install
pnpm db:migrate   # creates all tables including QueryHistory
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Connecting a database

QueryMind works with any Postgres-compatible database. Your connection string is validated at connect time with `SELECT 1` and held only in React component state for the duration of your browser session — it is never written to the application database.

```
postgresql://user:password@host:5432/database
```

After connecting, the schema explorer automatically loads all tables and columns from the `public` schema and injects them into the AI system prompt so the model always knows your schema.

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/timothylee58/QueryMind)

Set the environment variables listed above in your Vercel project settings before deploying.
