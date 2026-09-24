import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystack } from "@/lib/providers/paystack";
import { verifyFlutterwave } from "@/lib/providers/flutterwave";
import { verifyMonnify } from "@/lib/providers/monnify";
import { markFailed, markSucceeded } from "@/lib/payments/settlement";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : {};
}

function safeEqual(a: string, b: string) {
  try {
    return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function valid(provider: string, raw: string, req: NextRequest) {
  if (provider === "paystack") {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers.get("x-paystack-signature");
    return Boolean(secret && signature && safeEqual(createHmac("sha512", secret).update(raw).digest("hex"), signature));
  }
  if (provider === "flutterwave") {
    const secret = process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secret) return false;
    const signature = req.headers.get("flutterwave-signature");
    if (signature && safeEqual(createHmac("sha256", secret).update(raw).digest("base64"), signature)) return true;
    const legacy = req.headers.get("verif-hash");
    return Boolean(legacy && safeEqual(secret, legacy));
  }
  if (provider === "monnify") {
    const secret = process.env.MONNIFY_SECRET_KEY;
    const signature = req.headers.get("monnify-signature");
    return Boolean(secret && signature && safeEqual(createHmac("sha512", secret).update(raw).digest("hex"), signature));
  }
  return false;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!["paystack", "flutterwave", "monnify"].includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const raw = await req.text();
  if (!valid(provider, raw, req)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  let payload: JsonRecord;
  try {
    payload = asRecord(JSON.parse(raw) as unknown);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server configuration error" }, { status: 503 });
  }

  const data = asRecord(payload.data);
  const eventData = asRecord(payload.eventData);
  const eventId = String(payload.id ?? payload.eventId ?? data.id ?? eventData.transactionReference ?? data.reference ?? eventData.paymentReference ?? crypto.randomUUID());
  const eventType = String(payload.event ?? payload.type ?? payload.eventType ?? "unknown");

  const { data: existing } = await admin.from("webhook_events").select("id,state").eq("provider", provider).eq("provider_event_id", eventId).maybeSingle();
  if (existing?.state === "processed") return NextResponse.json({ received: true, duplicate: true });

  const { data: event, error: eventError } = await admin
    .from("webhook_events")
    .upsert({ provider, provider_event_id: eventId, event_type: eventType, state: "received", payload }, { onConflict: "provider,provider_event_id" })
    .select("id")
    .single();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

  try {
    let reference = "";
    let verified: unknown;

    if (provider === "paystack") {
      reference = String(data.reference ?? "");
      if (!reference) throw new Error("Missing Paystack reference");
      verified = await verifyPaystack(reference);
    } else if (provider === "flutterwave") {
      reference = String(data.tx_ref ?? payload.tx_ref ?? "");
      const transactionId = String(data.id ?? payload.id ?? "");
      if (!reference || !transactionId) throw new Error("Missing Flutterwave transaction identifiers");
      verified = await verifyFlutterwave(transactionId);
    } else {
      reference = String(eventData.paymentReference ?? payload.paymentReference ?? "");
      if (!reference) throw new Error("Missing Monnify payment reference");
      verified = await verifyMonnify(reference);
    }

    const { data: tx, error: txError } = await admin.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
    if (txError || !tx) throw new Error("Vortix transaction not found");

    const verifiedRecord = asRecord(verified);
    let successful = false;
    let amountMinor = 0n;
    let currency = "";

    if (provider === "paystack") {
      successful = verifiedRecord.status === "success";
      amountMinor = BigInt(String(verifiedRecord.amount ?? 0));
      currency = String(verifiedRecord.currency ?? "");
    } else if (provider === "flutterwave") {
      successful = verifiedRecord.status === "successful";
      amountMinor = BigInt(Math.round(Number(verifiedRecord.amount ?? 0) * 100));
      currency = String(verifiedRecord.currency ?? "");
    } else {
      successful = verifiedRecord.paymentStatus === "PAID";
      amountMinor = BigInt(Math.round(Number(verifiedRecord.amountPaid ?? 0) * 100));
      currency = String(verifiedRecord.currencyCode ?? verifiedRecord.currency ?? "");
    }

    if (amountMinor !== BigInt(tx.amount_minor) || currency.toUpperCase() !== String(tx.currency).toUpperCase()) {
      throw new Error("Verified provider amount or currency does not match Vortix transaction");
    }

    if (successful) await markSucceeded(admin, tx, verified);
    else await markFailed(admin, tx, "PROVIDER_NOT_SUCCESSFUL", "Provider verification did not report a successful payment", verified);

    await admin.from("webhook_events").update({ state: "processed", transaction_id: tx.id, processed_at: new Date().toISOString() }).eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await admin.from("webhook_events").update({ state: "failed", error_message: message, processed_at: new Date().toISOString() }).eq("id", event.id);
    return NextResponse.json({ received: true, processing: "failed", error: message }, { status: 500 });
  }
}
