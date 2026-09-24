import { createHash } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

type MerchantAuth =
  | { ok: true; kind: "session"; supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]; user: User; merchantId: null }
  | { ok: true; kind: "bearer"; supabase: SupabaseClient; user: User; merchantId: null }
  | { ok: true; kind: "api_key"; supabase: ReturnType<typeof createAdminClient>; user: null; merchantId: string }
  | { ok: false; status: 401 | 503; error: string };

export async function authenticateMerchant(req: NextRequest): Promise<MerchantAuth> {
  const authorization = req.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (!token) return { ok: false, status: 401, error: "Invalid bearer token" };
    const client = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return { ok: false, status: 401, error: "Invalid or expired bearer token" };
    return { ok: true, kind: "bearer", supabase: client, user: data.user, merchantId: null };
  }

  const rawKey = req.headers.get("x-vortix-key")?.trim();
  if (rawKey) {
    if (!rawKey.startsWith("vtx_live_") || rawKey.length < 32) {
      return { ok: false, status: 401, error: "Invalid API key" };
    }
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return { ok: false, status: 503, error: "Server API-key authentication is not configured" };
    }
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const { data, error } = await admin
      .from("api_keys")
      .select("id,merchant_id")
      .eq("key_hash", hash)
      .is("revoked_at", null)
      .maybeSingle();
    if (error || !data) return { ok: false, status: 401, error: "Invalid or revoked API key" };
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true, kind: "api_key", supabase: admin, user: null, merchantId: data.merchant_id };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, kind: "session", supabase, user, merchantId: null };
}
