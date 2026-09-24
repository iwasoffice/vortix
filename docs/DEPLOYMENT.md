# Deployment

The GitHub repository is the deployment source. The owner's existing Vercel project can continue auto-deploying `main`; no Vercel account access is required by this repository.

Supabase public URL/publishable-key configuration can be supplied via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server-side production features require `SUPABASE_SECRET_KEY` plus at least one provider credential set.

Render can deploy the same repository for background reconciliation. Never share environment variables with unrelated Render services.
