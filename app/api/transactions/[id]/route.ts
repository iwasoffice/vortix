import { NextRequest, NextResponse } from "next/server";
import { getTransaction, listLedger } from "@/lib/engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const tx = getTransaction(params.id);
  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  const ledgerEntries = listLedger(params.id);
  return NextResponse.json({ transaction: tx, ledger: ledgerEntries });
}
