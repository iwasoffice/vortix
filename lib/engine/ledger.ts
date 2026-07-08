import { v4 as uuid } from "uuid";
import { LedgerEntry, Transaction } from "@/lib/types";
import { store } from "@/lib/engine/store";

const VORTIX_FEE_RATE = 0.015; // 1.5% placeholder fee

/**
 * Posts a settled transaction to the ledger as balanced double-entries:
 * merchant is credited the net amount, Vortix fees account is credited
 * the fee, and the processor clearing account is debited the gross total.
 * Every entry set here must sum to zero across debit/credit — that
 * invariant is what makes it a real ledger rather than a log.
 */
export function postToLedger(tx: Transaction): LedgerEntry[] {
  const fee = Math.round(tx.amount * VORTIX_FEE_RATE * 100) / 100;
  const net = tx.amount - fee;
  const now = new Date().toISOString();

  const entries: LedgerEntry[] = [
    {
      id: uuid(),
      transactionId: tx.id,
      account: "processor_clearing",
      direction: "debit",
      amount: tx.amount,
      currency: tx.currency,
      createdAt: now,
    },
    {
      id: uuid(),
      transactionId: tx.id,
      account: "merchant_payable",
      direction: "credit",
      amount: net,
      currency: tx.currency,
      createdAt: now,
    },
    {
      id: uuid(),
      transactionId: tx.id,
      account: "vortix_fees",
      direction: "credit",
      amount: fee,
      currency: tx.currency,
      createdAt: now,
    },
  ];

  return store.addLedgerEntries(entries);
}
