# Vortix

Vortix is a commercial payment-orchestration control plane for merchants. The web application uses Next.js, Supabase Auth/Postgres/RLS, hosted payment checkouts, signed provider webhooks, risk controls, tenant-scoped API keys, and reconciliation infrastructure.

## Production architecture

- **Web/PWA:** Next.js 16 on the repository's connected Vercel project.
- **Identity and database:** Supabase Auth + Postgres + Row Level Security.
- **Payment providers:** Paystack, Flutterwave and Monnify adapters. A provider is used only when its live secret credentials are configured.
- **Webhooks:** signatures are verified and successful payments are independently re-verified with the provider before Vortix records settlement.
- **Render:** intended for reconciliation/background jobs from this same repository.
- **Clients:** browser extension, mobile and desktop companion source remains under `clients/`.

## Accounts

Users register at `/signup`. A successful signup automatically creates a private merchant workspace and owner membership. Merchant rows, transactions, API keys and ledger records are isolated by Supabase RLS.

## Provider credentials

Do not commit secrets. Configure these only in the production deployment environment:

```text
PAYSTACK_SECRET_KEY
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_SECRET_HASH
MONNIFY_API_KEY
MONNIFY_SECRET_KEY
MONNIFY_CONTRACT_CODE
SUPABASE_SECRET_KEY
```

Public Supabase URL/publishable-key values are safe for browser use and are already represented in `.env.example`.

## Webhooks

Configure provider dashboards with:

```text
https://<production-host>/api/webhooks/paystack
https://<production-host>/api/webhooks/flutterwave
https://<production-host>/api/webhooks/monnify
```

## Security properties

- Hosted checkout only; Vortix does not collect card PAN/CVV.
- Payment success requires verified provider status plus amount/currency match.
- Webhook deduplication is persisted.
- API keys are returned once; only SHA-256 hashes are stored.
- Merchant data is protected with tenant-aware RLS.
- High-risk transactions can be held before checkout initialization.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

A real provider secret is required before the dashboard can create a checkout. Missing provider credentials result in a configuration error, never simulated success.
