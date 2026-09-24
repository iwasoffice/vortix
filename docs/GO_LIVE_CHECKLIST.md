# Go-live checklist

- Supabase Auth account creation, email verification, login, logout, and password recovery verified.
- Supabase RLS/security advisors reviewed with no unresolved critical findings.
- `SUPABASE_SECRET_KEY` configured server-side only.
- At least one live provider credential set configured: Paystack, Flutterwave, or Monnify.
- Provider webhook URLs configured and a signed live/sandbox provider event verified end-to-end before enabling customer traffic.
- No raw card number/CVV fields or logs exist in Vortix.
- Merchant API keys created, scoped, tested, and rotation/revocation process documented.
- Rate limiting/WAF, monitoring, alerts, backups, and incident response configured.
- Reconciliation job enabled and failure alerts tested.
- Legal terms, privacy policy, merchant onboarding/KYC requirements, payment-provider agreements, and applicable PCI DSS obligations reviewed.
- Production domain, HTTPS, email sender, app-store/store-listing details, and support contacts configured.
