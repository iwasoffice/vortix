import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/api/merchant-auth";
import { availableProviders } from "@/lib/providers";

export async function GET(req: NextRequest) {
  const auth = await authenticateMerchant(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const providers = {
    configured: availableProviders(),
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    flutterwave: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    monnify: Boolean(process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY && process.env.MONNIFY_CONTRACT_CODE),
  };
  if (auth.kind === "api_key") {
    const { data: merchant, error } = await auth.supabase.from("merchants").select("id,name,slug,status,settlement_currency").eq("id", auth.merchantId).maybeSingle();
    if (error || !merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    return NextResponse.json({ user: null, membership: { role: "api_key", merchant }, providers });
  }
  const { data: membership, error } = await auth.supabase
    .from("merchant_members")
    .select("role,merchant:merchants(id,name,slug,status,settlement_currency)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: { id: auth.user.id, email: auth.user.email }, membership, providers });
}
