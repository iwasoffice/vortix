import { CreateTransactionInput } from "@/lib/types";

/**
 * Simple rule-based risk scorer, standing in for a real fraud model.
 * Returns a score 0-100. >= 70 gets flagged for manual review instead
 * of being auto-routed.
 *
 * Real version would pull in: device fingerprint, velocity checks
 * (txns per customer per hour), IP/geo mismatch, BIN lookups, etc.
 */
export function scoreRisk(input: CreateTransactionInput): number {
  let score = 5; // baseline

  // Large amounts carry more risk
  if (input.amount > 500_000) score += 40;
  else if (input.amount > 100_000) score += 15;

  // Cross-currency transactions score slightly higher (placeholder heuristic)
  if (input.currency !== "NGN") score += 10;

  // Deterministic pseudo-randomness so demo data varies but stays reproducible
  const hash = hashString(input.customerRef + input.merchantId);
  score += hash % 20;

  return Math.min(score, 100);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
