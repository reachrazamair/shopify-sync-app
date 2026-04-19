# AI Usage

This document describes how AI tools were used during this assessment, what was generated versus written manually, and how outputs were verified.

## Tools Used

- **Claude (claude-sonnet-4-6)** via Claude Code CLI — primary AI assistant for code generation, debugging, and architecture discussion

## What AI Generated

### Scaffolding and Boilerplate

- Initial monorepo structure (package.json files, tsconfig.json, turbo.json, pnpm-workspace.yaml)
- Prisma schema based on specified requirements
- Fastify plugin boilerplate (auth plugin, Prisma plugin, CORS setup)
- shadcn/ui component wiring and Tailwind configuration
- GitHub Actions CI workflow
- Docker Compose configuration for local development

### Core Business Logic (AI-assisted, manually verified)

- **HMAC verification** (`apps/api/src/services/hmac.ts`) — AI generated the initial implementation using `timingSafeEqual`. I verified the logic matches Shopify's documentation and confirmed the raw `Buffer` body requirement with Fastify's content type parser.
- **Temporal workflow** (`apps/api/src/temporal/workflows/orderSync.ts`) — AI drafted the 5-step workflow structure. I reviewed the retry policy, non-retryable error types, and compensation logic for correctness.
- **Activity implementations** — AI generated the structure; I reviewed each activity for correctness of the Prisma queries, error propagation, and idempotency guarantees.
- **Session cookie auth** (`apps/web/src/proxy.ts`, `apps/web/src/app/api/auth/route.ts`) — AI generated the signed HMAC cookie approach. I verified the `timingSafeEqual` usage and reviewed the Edge Runtime compatibility issue with Node.js `crypto`.

### Debugging

AI was heavily used to identify root causes of runtime errors encountered during deployment:

- Fastify v5 content type parser conflict — AI identified that `removeContentTypeParser` needed to be called before re-adding with `parseAs: 'buffer'`
- Edge Runtime vs Node.js `crypto` incompatibility in Next.js 16 `proxy.ts` — AI identified that `createHmac` is not available in Edge Runtime and rewrote the verification using the Web Crypto API (`crypto.subtle`)
- Temporal Cloud API key auth with TypeScript `exactOptionalPropertyTypes` — AI identified the conditional spread pattern needed to satisfy the type constraint
- Railway build failures (wrong dist path, Prisma generate ordering, DATABASE_URL reference syntax)
- Vercel static generation of Prisma pages — AI identified the need for `export const dynamic = 'force-dynamic'`

## What Was Written Without AI

- Environment variable values and secrets
- Shopify development store configuration
- Railway and Vercel project setup (UI-based)
- Temporal Cloud namespace configuration
- Review and approval of every generated code block before use

## Verification Process

All AI-generated code was reviewed before being used:

1. **Read before accepting** — Every generated file was read and understood before being written to disk. Code that wasn't immediately clear was asked about or tested.

2. **Tested locally first** — The full flow (webhook → Temporal → PostgreSQL → dashboard) was tested locally with ngrok and a real Shopify development store before deploying.

3. **Deployment issues caught manually** — Deployment errors (Railway build failures, Vercel 500s, missing migrations) were diagnosed by reading actual error logs, not blindly retrying. Each fix addressed a specific root cause.

4. **Security-critical paths reviewed carefully**:
   - HMAC verification: confirmed it uses constant-time comparison and raw buffer body
   - Session cookie: confirmed `HttpOnly`, `Secure`, `SameSite=Strict` flags and 24-hour expiry
   - API key auth: confirmed it's applied as a preHandler on all routes except the webhook (which uses HMAC)
   - Input validation: confirmed TypeBox schemas reject unexpected fields and Zod schema handles edge cases (guest orders with empty email)

5. **TypeScript strict mode** — The project uses `strict: true` in tsconfig. Type errors surfaced by the compiler were not silenced; they were fixed properly.

## Honest Assessment

AI significantly accelerated boilerplate generation and helped quickly identify obscure framework-specific issues (Fastify v5 parser behavior, Next.js 16 middleware filename change from `middleware.ts` to `proxy.ts`, Edge Runtime constraints). Without AI assistance these would have required more time reading changelogs and documentation.

The core architectural decisions — Temporal for durable workflow execution, idempotent upserts, HMAC webhook verification, signed cookie auth, direct Prisma in Server Components — were made by me based on the requirements, not suggested by AI. AI implemented what was specified.

The debugging process was collaborative: I provided error logs, AI proposed hypotheses, and I verified them by reading relevant source code or documentation before applying fixes.
