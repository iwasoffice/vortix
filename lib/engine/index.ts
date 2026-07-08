import { v4 as uuid } from "uuid";
import { CreateTransactionInput, Transaction, TransactionEvent } from "@/lib/types";
import { store } from "@/lib/engine/store";
import { scoreRisk } from "@/lib/engine/riskEngine";
import { routeTransaction } from "@/lib/engine/router";
import { postToLedger } from "@/lib/engine/ledger";

function event(type: string, detail: string): TransactionEvent {
  return { ts: new Date().toISOString(), type, detail };
}

/**
 * End-to-end pipeline for a new transaction:
 * risk score -> route -> (simulate authorization) -> settle -> post ledger.
 * A real engine would pause after "routed" and wait on an async webhook
 * from the actual processor before settling; here settlement is simulated
 * immediately so the dashboard has something to show.
 */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const now = new Date().toISOString();
  const id = uuid();

  const riskScore = scoreRisk(input);
  const history: TransactionEvent[] = [event("created", "Transaction received")];

  let tx: Transaction = {
    id,
    amount: input.amount,
    currency: input.currency,
    merchantId: input.merchantId,
    customerRef: input.customerRef,
    status: "pending",
    processor: null,
    riskScore,
    createdAt: now,
    updatedAt: now,
    history,
  };

  if (riskScore >= 70) {
    tx.status = "flagged";
    tx.history.push(event("flagged", `Risk score ${riskScore} exceeded threshold; held for review`));
    tx.updatedAt = new Date().toISOString();
    return store.saveTransaction(tx);
  }

  const { processor, reason } = routeTransaction(input);
  tx.processor = processor;
  tx.status = "routed";
  tx.history.push(event("routed", `${processor} selected — ${reason}`));

  // Simulated authorization + settlement (stand-in for async processor callback)
  tx.status = "authorized";
  tx.history.push(event("authorized", `Authorized by ${processor}`));

  tx.status = "settled";
  tx.history.push(event("settled", "Funds settled to merchant payable account"));
  tx.updatedAt = new Date().toISOString();

  store.saveTransaction(tx);
  postToLedger(tx);

  return tx;
}

export function getTransaction(id: string) {
  return store.getTransaction(id);
}

export function listTransactions(limit?: number) {
  return store.listTransactions(limit);
}

export function listLedger(transactionId?: string) {
  return store.listLedger(transactionId);
}
