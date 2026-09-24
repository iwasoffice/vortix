import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystack } from "@/lib/providers/paystack";
import { verifyFlutterwaveByReference } from "@/lib/providers/flutterwave";
import { verifyMonnify } from "@/lib/providers/monnify";
import { markFailed, markSucceeded } from "@/lib/payments/settlement";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : {};
}

function authorized(req: NextRequest) {
  const expected = process.env.VORTIX_RECONCILIATION_TOKEN;
  const provided = req.headers.get("x-vortix-reconciliation-token");
  return Boolean(expected && provided && provided === expected);
}

function normalize(provider: string, value: unknown) {
  const verified = asRecord(value);
  if (provider === "paystack") {
    const status = String(verified.status ?? "");
    return {
      success: status === "success",
      terminal: ["success", "failed", "abandoned", "reversed"].includes(status),
      amount: BigInt(String(verified.amount ?? 0)),
      currency: String(verified.currency ?? ""),
    };
  }
  if (provider === "flutterwave") {
    const status = String(verified.status ?? "");
    return {
      success: status === "successful",
      terminal: ["successful", "failed"].includes(status),
      amount: BigInt(Math.round(Number(verified.amount ?? 0) * 100)),
      currency: String(verified.currency ?? ""),
    };
  }
  const status = String(verified.paymentStatus ?? "");
  return {
    success: status === "PAID",
    terminal: ["PAID", "FAILED", "EXPIRED", "CANCELLED", "OVERPAID", "PARTIALLY_PAID"].includes(status),
    amount: BigInt(Math.round(Number(verified.amountPaid ?? 0) * 100)),
    currency: String(verified.currencyCode ?? verified.currency ?? ""),
  };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server configuration error" }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { data, error } = await admin
    .from("payment_transactions")
    .select("*")
    .in("status", ["pending", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let succeeded = 0, failed = 0, pending = 0, errors = 0;
  for (const tx of data ?? []) {
    try {
      let verified: unknown;
      if (tx.provider === "paystack") verified = await verifyPaystack(tx.reference);
      else if (tx.provider === "flutterwave") verified = await verifyFlutterwaveByReference(tx.reference);
      else if (tx.provider === "monnify") verified = await verifyMonnify(tx.reference);
      else { pending += 1; continue; }

      if (!verified) { pending += 1; continue; }
      const normalized = normalize(tx.provider, verified);
      if (normalized.amount !== BigInt(tx.amount_minor) || normalized.currency.toUpperCase() !== String(tx.currency).toUpperCase()) {
        await markFailed(admin, tx, "RECONCILIATION_MISMATCH", "Provider amount or currency does not match Vortix", verified);
        failed += 1;
      } else if (normalized.success) {
        await markSucceeded(admin, tx, verified);
        succeeded += 1;
      } else if (normalized.terminal) {
        await markFailed(admin, tx, "PROVIDER_NOT_SUCCESSFUL", "Provider reconciliation reported a terminal unsuccessful payment", verified);
        failed += 1;
      } else {
        pending += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({ scanned: (data ?? []).length, succeeded, failed, pending, errors });
}
