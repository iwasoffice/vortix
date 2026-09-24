import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/api/merchant-auth";
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchant(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let request = auth.supabase.from("payment_transactions").select("status,amount_minor,currency,provider,risk_score").limit(5000);
  if (auth.kind === "api_key") request = request.eq("merchant_id", auth.merchantId);
  const { data, error } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data || [];
  return NextResponse.json({
    transactions: rows.length,
    succeeded: rows.filter((x) => x.status === "succeeded").length,
    review: rows.filter((x) => x.status === "requires_review").length,
    failed: rows.filter((x) => x.status === "failed").length,
  });
}
