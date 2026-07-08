import { NextRequest, NextResponse } from "next/server";
import { createTransaction, listTransactions } from "@/lib/engine";
import { CreateTransactionInput } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<CreateTransactionInput>;

  if (!body.amount || !body.currency || !body.merchantId || !body.customerRef) {
    return NextResponse.json(
      { error: "amount, currency, merchantId, and customerRef are required" },
      { status: 400 }
    );
  }

  const tx = await createTransaction({
    amount: body.amount,
    currency: body.currency,
    merchantId: body.merchantId,
    customerRef: body.customerRef,
  });

  return NextResponse.json(tx, { status: 201 });
}

export async function GET() {
  const txs = listTransactions(50);
  return NextResponse.json(txs);
}
