import { CreateTransactionInput, ProcessorId } from "@/lib/types";

/**
 * Decides which payment processor should handle a transaction.
 * This is the heart of a payment gateway: given the same transaction,
 * a real router would weigh live processor uptime, cost per rail,
 * currency support, and merchant preference. Here we simulate that
 * decision with clear, swappable rules.
 */
export function routeTransaction(input: CreateTransactionInput): {
  processor: ProcessorId;
  reason: string;
} {
  if (input.currency !== "NGN") {
    return {
      processor: "flutterwave_sim",
      reason: "Non-NGN currency routed to multi-currency processor",
    };
  }

  if (input.amount <= 5_000) {
    return {
      processor: "internal_wallet",
      reason: "Low-value NGN transaction settled via internal wallet to save on processor fees",
    };
  }

  return {
    processor: "paystack_sim",
    reason: "Default NGN processor for standard transaction volumes",
  };
}
