import type { CheckoutRequest, CheckoutResult } from "./types";
import { ProviderConfigurationError } from "./types";

type JsonRecord = Record<string, unknown>;

const endpoint = "https://api.flutterwave.com/v3";
const timeout = () => AbortSignal.timeout(15_000);

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : {};
}

export function flutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

function key() {
  const value = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!value) throw new ProviderConfigurationError("Flutterwave is not configured");
  return value;
}

export async function initializeFlutterwave(input: CheckoutRequest): Promise<CheckoutResult> {
  const res = await fetch(`${endpoint}/payments`, {
    method: "POST",
    signal: timeout(),
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: Number(input.amountMinor) / 100,
      currency: input.currency,
      redirect_url: input.callbackUrl,
      customer: { email: input.customerEmail, name: input.customerName || input.customerEmail },
      meta: input.metadata ?? {},
      customizations: { title: "Vortix payment" },
    }),
  });
  const body = asRecord(await res.json());
  const data = asRecord(body.data);
  if (!res.ok || body.status !== "success" || !data.link) {
    throw new Error(String(body.message ?? `Flutterwave initialization failed (${res.status})`));
  }
  return { provider: "flutterwave", providerReference: input.reference, authorizationUrl: String(data.link), raw: body };
}

export async function verifyFlutterwave(transactionId: string) {
  const res = await fetch(`${endpoint}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    signal: timeout(),
    headers: { Authorization: `Bearer ${key()}` },
  });
  const body = asRecord(await res.json());
  if (!res.ok || body.status !== "success") throw new Error(String(body.message ?? "Flutterwave verification failed"));
  return body.data;
}

export async function verifyFlutterwaveByReference(reference: string) {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);
  const params = new URLSearchParams({
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    tx_ref: reference,
  });
  const res = await fetch(`${endpoint}/transactions?${params}`, {
    signal: timeout(),
    headers: { Authorization: `Bearer ${key()}` },
  });
  const body = asRecord(await res.json());
  if (!res.ok || body.status !== "success") throw new Error(String(body.message ?? "Flutterwave reference lookup failed"));
  const rows: unknown[] = Array.isArray(body.data) ? body.data : [];
  return rows.find((row) => String(asRecord(row).tx_ref ?? "") === reference) ?? null;
}
