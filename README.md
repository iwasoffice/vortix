# Vortix Engine

Payment gateway infrastructure engine — transaction routing, risk scoring, and ledger — with a live dashboard for demoing the flow end to end.

## What this is

A working simulation of the core decision-making layer inside a payment gateway:

1. **Risk scoring** (`lib/engine/riskEngine.ts`) — scores each transaction 0–100 using rule-based heuristics (amount, currency, customer/merchant patterns). Anything ≥70 is flagged for manual review instead of auto-processing.
2. **Routing** (`lib/engine/router.ts`) — decides which processor handles a transaction based on currency and amount. Currently routes between simulated Paystack/Flutterwave/internal wallet rails; built so a real provider integration slots in without touching the rest of the pipeline.
3. **Ledger** (`lib/engine/ledger.ts`) — posts settled transactions as balanced double-entry records (processor clearing → merchant payable + Vortix fees), the way a real financial ledger has to reconcile.
4. **Dashboard** (`app/dashboard`) — live view of transaction volume by processor, status breakdown, and a feed of recent transactions, backed by the same API the engine exposes.

## Architecture notes

- `lib/engine/store.ts` is an in-memory store standing in for a database. Every other module talks to it through functions, not the arrays directly — so swapping in Postgres/Prisma later is contained to this one file.
- `app/api/webhooks/[provider]/route.ts` is a stub for real processor callbacks (signature verification, idempotency) — left unimplemented until a live processor is wired in.
- Fee rate, risk thresholds, and routing rules are intentionally simple and centralized so they're easy to point to and explain, and easy to replace with real business logic.

## Running locally

```bash
npm install
npm run dev
```

Visit `/dashboard` and use the form to simulate transactions through the engine.

## Deploying

Deploys cleanly to Vercel with zero config — it's a standard Next.js App Router project.

## Roadmap

- [ ] Swap in-memory store for Postgres (Prisma)
- [ ] Real processor integration (Paystack/Flutterwave) behind the existing router interface
- [ ] Webhook signature verification per provider
- [ ] Auth on the transactions API
