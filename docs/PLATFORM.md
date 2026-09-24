# Vortix client platform

The Next.js application is the primary commercial web application and API surface. The PWA uses the same deployment URL.

## Authentication

- Web/PWA: Supabase Auth session cookies.
- Native mobile: Supabase Auth bearer access tokens. New users can create accounts directly in the mobile client; the database trigger creates their merchant workspace.
- Browser extension and desktop: merchant-scoped Vortix API keys sent in `x-vortix-key`. Keys are generated in Merchant settings, stored only as SHA-256 hashes server-side, and can be revoked.
- Backend integrations: merchant-scoped Vortix API keys.

There is no public/demo write mode. API-key authentication requires `SUPABASE_SECRET_KEY` on the server because hashed API keys are resolved through the private server client.

All transaction creation uses hosted checkout URLs from configured live providers. Raw card numbers and CVV values must never pass through Vortix.
