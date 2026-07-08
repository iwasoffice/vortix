export type Currency = "NGN" | "USD" | "GBP";

export type ProcessorId = "paystack_sim" | "flutterwave_sim" | "internal_wallet";

export type TransactionStatus =
  | "pending"
  | "routed"
  | "authorized"
  | "settled"
  | "failed"
  | "flagged";

export interface Transaction {
  id: string;
  amount: number;
  currency: Currency;
  merchantId: string;
  customerRef: string;
  status: TransactionStatus;
  processor: ProcessorId | null;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  history: TransactionEvent[];
}

export interface TransactionEvent {
  ts: string;
  type: string;
  detail: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  account: "merchant_payable" | "vortix_fees" | "processor_clearing";
  direction: "debit" | "credit";
  amount: number;
  currency: Currency;
  createdAt: string;
}

export interface CreateTransactionInput {
  amount: number;
  currency: Currency;
  merchantId: string;
  customerRef: string;
}
