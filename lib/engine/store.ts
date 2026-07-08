import { Transaction, LedgerEntry } from "@/lib/types";

/**
 * In-memory store standing in for a real database.
 * Swap this module for a Prisma/Postgres (or Supabase) client later —
 * every other engine module only talks to the functions below,
 * never to the arrays directly, so the swap is contained here.
 */

const transactions: Map<string, Transaction> = new Map();
const ledger: LedgerEntry[] = [];

export const store = {
  saveTransaction(tx: Transaction) {
    transactions.set(tx.id, tx);
    return tx;
  },
  getTransaction(id: string) {
    return transactions.get(id) ?? null;
  },
  listTransactions(limit = 50) {
    return Array.from(transactions.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
  },
  addLedgerEntries(entries: LedgerEntry[]) {
    ledger.push(...entries);
    return entries;
  },
  listLedger(transactionId?: string) {
    if (transactionId) {
      return ledger.filter((e) => e.transactionId === transactionId);
    }
    return ledger;
  },
};
