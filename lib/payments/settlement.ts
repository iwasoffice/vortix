import type { SupabaseClient } from "@supabase/supabase-js";

export async function markSucceeded(
  admin: SupabaseClient,
  tx: { id: string; amount_minor: string; currency: string },
  providerPayload: unknown,
) {
  const { error } = await admin.rpc("settle_verified_transaction", {
    p_transaction_id: tx.id,
    p_verified_amount_minor: tx.amount_minor,
    p_verified_currency: tx.currency,
    p_payload: providerPayload ?? {},
  });
  if (error) throw error;
}

export async function markFailed(
  admin: SupabaseClient,
  tx: { id: string },
  code: string,
  message: string,
  payload?: unknown,
) {
  const { error } = await admin.rpc("fail_verified_transaction", {
    p_transaction_id: tx.id,
    p_code: code,
    p_message: message,
    p_payload: payload ?? {},
  });
  if (error) throw error;
}
