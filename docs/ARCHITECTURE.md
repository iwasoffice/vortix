# Vortix architecture

A merchant user authenticates with Supabase Auth. Supabase creates a merchant workspace and owner membership. Next.js route handlers operate with the user's verified session, so RLS limits all reads and writes to workspaces the user belongs to.

When a checkout is initialized, Vortix validates the request, checks idempotency, computes explainable risk, and selects only from providers with live server credentials. It then initializes a hosted checkout with Paystack, Flutterwave or Monnify. Vortix never receives raw card data.

Provider webhooks are signature-verified. Before success is recorded, Vortix calls the provider verification endpoint and verifies status, amount and currency against the original transaction. Ledger rows are written only after those checks pass.
