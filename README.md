# Shopify Order Sync Dashboard

A full-stack application that receives Shopify orders via webhooks, processes them through a Temporal Cloud workflow pipeline, persists to PostgreSQL, and displays real-time sync status on a password-protected Next.js dashboard.

## Live URLs

- **Dashboard**: https://kentorio-test-task.vercel.app
- **API**: https://kentorio-test-task-api.up.railway.app

**Dashboard password**: provided separately via email

## Architecture

```
Shopify → POST /webhooks/shopify/orders (Fastify)
               │
               ▼
         Temporal Cloud ──────────────────────────────────────┐
               │                                              │
         ┌─────▼──────┐                                      │
         │ validateOrder│  (zod schema, non-retryable on fail) │
         └─────┬──────┘                                      │
         ┌─────▼──────┐                                      │
         │ enrichOrder │  (Shopify Admin API, retryable)      │
         └─────┬──────┘                                      │
         ┌─────▼──────┐                                      │
         │transformOrder│ (Shopify → internal schema)         │
         └─────┬──────┘                                      │
         ┌─────▼──────┐                                      │
         │  storeOrder │  (Prisma upsert, idempotent)        │
         └─────┬──────┘                                      │
         ┌─────▼──────┐                                      │
         │updateSyncLog│  (audit trail per activity)         │
         └─────┬──────┘                                      │
               │                                             │
               ▼                                             │
         PostgreSQL ◄────────────────────────────────────────┘
               │
               ▼
         Next.js Dashboard (Vercel)
```

**Monorepo structure** (pnpm workspaces + Turborepo):

```
├── apps/
│   ├── api/          # Fastify API + Temporal worker (Railway)
│   └── web/          # Next.js 16 App Router dashboard (Vercel)
├── packages/
│   ├── db/           # Prisma schema + generated client
│   └── types/        # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|---|---|
| API server | Fastify v5, TypeBox validation |
| Workflow engine | Temporal Cloud (API key auth) |
| Database | PostgreSQL 16 (Railway) |
| ORM | Prisma 6 |
| Dashboard | Next.js 16 App Router, shadcn/ui, Tailwind CSS |
| Charts | Recharts |
| Deployment | Railway (API + worker), Vercel (web) |
| CI | GitHub Actions |

## Key Design Decisions

**Temporal for order processing** — Shopify webhooks can arrive out of order or be retried. Using a Temporal workflow gives durable execution with automatic retries per activity, clear audit trails via SyncLog entries, and non-retryable `ValidationError` for malformed payloads.

**Idempotent webhook handling** — The webhook route checks `shopifyOrderId` uniqueness before starting a workflow. The `storeOrder` activity uses `prisma.order.upsert`, so any workflow retry is safe without double-writing.

**HMAC verification** — Every webhook request is verified against Shopify's `X-Shopify-Hmac-Sha256` header using `timingSafeEqual` to prevent timing attacks. Fastify's content type parser is configured to preserve the raw `Buffer` body for accurate HMAC computation.

**Runtime store connection** — Shopify credentials are configured via the dashboard UI (not environment variables) and stored AES-256-GCM encrypted in PostgreSQL. This allows connect/disconnect without redeploying. The webhook secret falls back to `SHOPIFY_WEBHOOK_SECRET` env var for backwards compatibility.

**Direct Prisma in Server Components** — Dashboard pages use Prisma directly instead of an HTTP hop to the API. This eliminates latency for server-rendered pages and reduces surface area. Pages are marked `force-dynamic` to prevent static generation.

**Signed cookie auth** — Single-password dashboard uses a signed HMAC-SHA256 cookie (`timestamp.hmac`) instead of NextAuth. The session expires after 24 hours. The `proxy.ts` middleware (Next.js 16) uses the Web Crypto API for Edge Runtime compatibility.

**TypeBox over Zod for Fastify** — TypeBox schemas compile to native JSON Schema, which Fastify uses directly for request validation and serialization. No adapter layer needed.

## Connecting a Shopify Store

The dashboard includes a live connection indicator in the nav bar. When no store is connected, all dashboard content is hidden and a "Not connected" state is shown.

**To connect:**

1. Log in to the dashboard
2. Click the pulsing amber dot in the top nav — "Not connected"
3. Copy the **Webhook delivery URL** shown in the dropdown
4. In your Shopify admin → Settings → Notifications → Webhooks, create a webhook:
   - Event: `Order creation`
   - URL: paste the copied webhook delivery URL
   - Format: JSON
5. Copy the **signing secret** Shopify shows after creating the webhook
6. Back in the dashboard dropdown, fill in:
   - **Store Domain** — `my-store.myshopify.com` (no `https://`)
   - **Admin API Token** — from Shopify Partners → Apps → your custom app → API credentials
   - **Webhook Secret** — the signing secret from step 5
7. Click **Connect Store**

Once connected, the dot turns green and all dashboard content appears. New orders placed in the store will be processed automatically through the Temporal workflow.

**To disconnect:** click the green dot → click **Disconnect**.

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker (for local PostgreSQL)

### 1. Clone and install

```bash
git clone <repo-url>
cd shopify-order-sync
pnpm install
```

### 2. Start local database

```bash
docker-compose up -d postgres
```

### 3. Configure environment

**`apps/api/.env`:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopify_sync"
SHOPIFY_API_VERSION="2024-01"

# Store encryption key (32 bytes as 64 hex chars)
STORE_ENCRYPTION_KEY="<output of: openssl rand -hex 32>"
# Public URL of this API (used to register Shopify webhooks)
# For local dev use ngrok: ngrok http 3001
API_PUBLIC_URL="http://localhost:3001"

# Temporal Cloud
TEMPORAL_ADDRESS="your-namespace.tmprl.cloud:7233"
TEMPORAL_NAMESPACE="your-namespace.accountid"
TEMPORAL_TASK_QUEUE="shopify-order-sync"
TEMPORAL_API_KEY="your-temporal-api-key"
TEMPORAL_TLS_DISABLED="false"

# Local Temporal (alternative)
# TEMPORAL_ADDRESS="localhost:7233"
# TEMPORAL_TLS_DISABLED="true"

API_KEY="your-secret-api-key"
PORT="3001"
NODE_ENV="development"
```

**`apps/web/.env.local`:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopify_sync"
DASHBOARD_PASSWORD="your-secure-password"
SESSION_SECRET="<output of: openssl rand -hex 16>"
NEXT_PUBLIC_API_URL="http://localhost:3001"
INTERNAL_API_URL="http://localhost:3001"
API_KEY="your-secret-api-key"
```

### 4. Run database migrations

```bash
pnpm --filter @repo/db exec prisma migrate deploy
```

### 5. Start development servers

```bash
# Terminal 1 — API server
pnpm --filter @repo/api dev

# Terminal 2 — Temporal worker
pnpm --filter @repo/api dev:worker

# Terminal 3 — Next.js dashboard
pnpm --filter web dev
```

### 6. Expose the API for Shopify webhooks (local testing)

```bash
ngrok http 3001
```

Set `API_PUBLIC_URL` in `apps/api/.env` to the ngrok HTTPS URL, then restart the API. The webhook delivery URL shown in the dashboard connect form will update automatically.

## Manual Webhook Testing

Use this to send a test order without a real Shopify store:

```bash
BODY='{"id":1234567890,"order_number":"#1001","email":"test@example.com","total_price":"99.99","currency":"USD","financial_status":"paid","line_items":[{"id":111,"title":"T-Shirt","variant_title":"M","sku":"TS-M","quantity":1,"price":"99.99"}],"customer":{"first_name":"Test","last_name":"User","email":"test@example.com"}}'
SECRET="your-webhook-signing-secret"
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -X POST http://localhost:3001/webhooks/shopify/orders \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Api-Key: your-api-key" \
  -d "$BODY"
```

The `SECRET` must match the webhook secret you entered when connecting the store (or `SHOPIFY_WEBHOOK_SECRET` env var as fallback).

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

1. **Type-check** — `pnpm turbo type-check`
2. **Lint** — `pnpm turbo lint`
3. **Build** — builds `@repo/types`, `@repo/api`, and `web`

Railway and Vercel deploy automatically on push to `main` from their GitHub integrations.

## Database Schema

Five tables: `orders`, `line_items`, `sync_logs`, `products`, `shopify_connections`

- `orders` — core order record with Shopify order ID, customer info, status, and raw payload
- `line_items` — individual products in each order (cascade delete)
- `sync_logs` — audit trail: one row per activity per workflow run
- `products` — product cache populated during enrichment from Shopify Admin API
- `shopify_connections` — encrypted store credentials (token + webhook secret), one row (single-tenant)

## Project Structure

```
apps/api/src/
├── config/
│   ├── env.ts                    # Zod-validated environment variables
│   └── temporal.ts               # Temporal client (API key auth)
├── plugins/
│   ├── auth.ts                   # x-api-key preHandler
│   └── prisma.ts                 # Prisma Fastify plugin
├── routes/
│   ├── webhooks/shopify.ts       # HMAC verify → idempotency → Temporal start
│   └── api/
│       ├── orders.ts             # GET /api/orders, GET /api/orders/:id
│       ├── stats.ts              # GET /api/stats
│       └── store.ts              # GET/POST /api/store, DELETE /api/store/disconnect
├── services/
│   ├── hmac.ts                   # timingSafeEqual HMAC verification
│   ├── shopify.ts                # Shopify Admin API client (param-driven config)
│   ├── encryption.ts             # AES-256-GCM encrypt/decrypt
│   └── storeConnection.ts        # DB read/write for ShopifyConnection
└── temporal/
    ├── workflows/orderSync.ts    # 5-step workflow with error handling
    └── activities/               # validateOrder, enrichOrder, transformOrder, storeOrder, updateSyncLog

apps/web/src/
├── app/
│   ├── page.tsx                  # Dashboard — gated on store connection
│   ├── orders/page.tsx           # Orders table — gated on store connection
│   ├── orders/[id]/page.tsx      # Order detail + processing timeline
│   ├── login/page.tsx            # Login with ?from= redirect support
│   └── api/
│       ├── auth/route.ts         # POST/DELETE session cookie
│       └── store/                # Proxy routes → Fastify store API
├── components/
│   ├── StoreStatusIndicator.tsx  # Pulsing dot + connect/disconnect dropdown
│   ├── NotConnectedState.tsx     # Empty state shown when no store connected
│   ├── nav.tsx                   # Nav with connection status prop
│   ├── dashboard/                # StatsCards, VolumeChart, RecentOrders
│   └── orders/                   # OrdersTable, OrderFilters, ProcessingTimeline
└── proxy.ts                      # Auth middleware (Next.js 16 Edge Runtime)
```
