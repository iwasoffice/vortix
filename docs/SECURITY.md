# Security

Vortix is designed so card PAN and CVV data never enter the application. Checkout initialization returns provider-hosted payment pages from Paystack, Flutterwave, or Monnify.

Production controls implemented in this repository include Supabase Auth, merchant-scoped Row Level Security, hashed and revocable Vortix API keys, request idempotency, signed provider webhooks, provider-side payment re-verification, amount/currency matching before settlement, and double-entry ledger records.

Secrets such as `SUPABASE_SECRET_KEY`, payment-provider secret keys, Flutterwave secret hash, Monnify secret key, and reconciliation tokens must exist only in deployment environment variables. Never commit them or expose them through `NEXT_PUBLIC_` variables.

Before accepting live transactions, configure HTTPS, provider webhooks, MFA for administrative accounts where available, edge rate limiting/WAF, alerting, secret rotation, backups, incident response, and the applicable PCI DSS/payment-provider compliance programme.
