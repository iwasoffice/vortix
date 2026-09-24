import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/api/merchant-auth";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateMerchant(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let request = auth.supabase.from("payment_transactions").select("*,transaction_events(*),ledger_entries(*)").or(`id.eq.${id},reference.eq.${id}`);
  if (auth.kind === "api_key") request = request.eq("merchant_id", auth.merchantId);
  const { data, error } = await request.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
