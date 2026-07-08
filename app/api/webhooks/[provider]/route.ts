import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook receiver for processor callbacks (Paystack, Flutterwave, etc.).
 * In production this must:
 *  1. Verify the signature header against a shared secret per provider
 *  2. Be idempotent (processor retries the same event on failure)
 *  3. Update the transaction status based on the event type
 *
 * Left as a stub here since it depends on each real provider's payload
 * shape and signing scheme — wire this up once you're integrating a
 * live processor rather than the simulated ones.
 */
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const payload = await req.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: verify signature for params.provider before trusting payload
  // TODO: look up transaction by processor reference and update status

  return NextResponse.json({ received: true, provider: params.provider });
}
