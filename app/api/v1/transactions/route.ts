import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMerchant } from "@/lib/api/merchant-auth";
import { assessRisk } from "@/lib/risk";
import { initializeCheckout, selectProvider } from "@/lib/providers";
import type { ProviderName } from "@/lib/providers/types";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  merchantId: z.string().uuid().optional(),
  customerReference: z.string().min(1).max(160),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(160).optional(),
  amountMinor: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  provider: z.enum(["paystack", "flutterwave", "monnify"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function canOperate(auth: Extract<Awaited<ReturnType<typeof authenticateMerchant>>, {ok:true}>, merchantId: string) {
  if (auth.kind === "api_key") return auth.merchantId === merchantId;
  const { data } = await auth.supabase.from("merchant_members").select("role").eq("merchant_id", merchantId).eq("user_id", auth.user.id).maybeSingle();
  return Boolean(data && ["owner", "admin", "developer"].includes(data.role));
}

export async function GET(req: NextRequest) {
  const auth = await authenticateMerchant(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let request = auth.supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(100);
  if (auth.kind === "api_key") request = request.eq("merchant_id", auth.merchantId);
  const { data, error } = await request;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMerchant(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  const d = parsed.data;
  const merchantId = auth.kind === "api_key" ? auth.merchantId : d.merchantId;
  if (!merchantId) return NextResponse.json({ error: "merchantId is required for authenticated dashboard requests" }, { status: 400 });
  if (!(await canOperate(auth, merchantId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let admin;
  try { admin = auth.kind === "api_key" ? auth.supabase : createAdminClient(); }
  catch { return NextResponse.json({ error: "Server payment operations are not configured" }, { status: 503 }); }

  const amountMinor = BigInt(d.amountMinor);
  const idempotencyKey = req.headers.get("idempotency-key")?.trim() || randomUUID();
  const { data: existing } = await admin.from("payment_transactions").select("*").eq("merchant_id", merchantId).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json(existing);

  const risk = assessRisk(amountMinor, d.currency, d.metadata || {});
  const threshold = Number(process.env.RISK_REVIEW_THRESHOLD || 70);
  const reference = `vtx_${Date.now().toString(36)}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const requiresReview = risk.score >= threshold;
  const { data: tx, error: insertError } = await admin.from("payment_transactions").insert({
    merchant_id: merchantId, created_by: auth.user?.id ?? null, reference, idempotency_key: idempotencyKey,
    customer_reference: d.customerReference, customer_email: d.customerEmail, amount_minor: amountMinor.toString(), currency: d.currency,
    status: requiresReview ? "requires_review" : "initiated", risk_score: risk.score, risk_level: risk.level, risk_reasons: risk.reasons, metadata: d.metadata || {},
  }).select("*").single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  await admin.from("transaction_events").insert({ transaction_id: tx.id, type: "created", detail: "Payment request received" });

  if (requiresReview) {
    await admin.from("transaction_events").insert({ transaction_id: tx.id, type: "requires_review", detail: `Risk score ${risk.score} requires manual review`, payload: risk.reasons });
    return NextResponse.json({ ...tx, checkout: null, message: "Payment held for manual risk review" }, { status: 202 });
  }

  try {
    const provider = selectProvider(d.currency, d.provider as ProviderName | undefined);
    const callbackUrl = new URL(`/payments/${reference}`, req.nextUrl.origin).toString();
    const checkout = await initializeCheckout(provider, { reference, amountMinor, currency: d.currency, customerEmail: d.customerEmail, customerName: d.customerName, callbackUrl, metadata: { ...(d.metadata || {}), vortix_transaction_id: tx.id, merchant_id: merchantId } });
    const { data: updated, error: updateError } = await admin.from("payment_transactions").update({ status: "pending", provider: checkout.provider, provider_reference: checkout.providerReference, authorization_url: checkout.authorizationUrl, route_reason: `${checkout.provider} selected from configured live providers`, updated_at: new Date().toISOString() }).eq("id", tx.id).eq("merchant_id", merchantId).select("*").single();
    if (updateError) throw updateError;
    await admin.from("transaction_events").insert({ transaction_id: tx.id, type: "checkout_initialized", detail: `Hosted checkout initialized with ${checkout.provider}` });
    return NextResponse.json({ ...updated, checkout: { authorizationUrl: checkout.authorizationUrl, provider: checkout.provider } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment initialization failed";
    await admin.from("payment_transactions").update({ status: "failed", failure_code: "PROVIDER_INITIALIZATION_FAILED", failure_message: message, updated_at: new Date().toISOString() }).eq("id", tx.id).eq("merchant_id", merchantId);
    await admin.from("transaction_events").insert({ transaction_id: tx.id, type: "failed", detail: message });
    return NextResponse.json({ error: message, transactionId: tx.id }, { status: 503 });
  }
}
