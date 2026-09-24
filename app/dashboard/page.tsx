"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  ExternalLink,
  Flag,
  RefreshCw,
  Route,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

type Transaction = {
  id: string;
  reference: string;
  amount_minor: string;
  currency: string;
  status: string;
  provider: string | null;
  risk_score: number;
  customer_reference: string;
  customer_email: string;
  authorization_url: string | null;
  created_at: string;
};

type MerchantContext = {
  user: { id: string; email: string };
  membership: {
    role: string;
    merchant: { id: string; name: string; slug: string; status: string; settlement_currency: string };
  };
  providers: { configured: string[]; paystack: boolean; flutterwave: boolean; monnify: boolean };
};

type MetricCard = { label: string; value: ReactNode; Icon: LucideIcon };

function money(value: string, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) / 100);
}

export default function Dashboard() {
  const [me, setMe] = useState<MerchantContext | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    amount: "25000",
    currency: "NGN",
    customerEmail: "",
    customerReference: "",
    customerName: "",
    provider: "",
  });

  const load = useCallback(async () => {
    const [merchantResponse, transactionsResponse] = await Promise.all([
      fetch("/api/v1/me"),
      fetch("/api/v1/transactions"),
    ]);
    if (merchantResponse.status === 401) {
      window.location.href = "/login";
      return;
    }
    const merchant = await merchantResponse.json();
    const transactions = await transactionsResponse.json();
    if (!merchantResponse.ok || !transactionsResponse.ok) {
      setError(merchant.error || transactions.error || "Unable to load dashboard");
      return;
    }
    setError("");
    setMe(merchant);
    setItems(Array.isArray(transactions) ? transactions : []);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/v1/me"), fetch("/api/v1/transactions")]).then(async ([merchantResponse, transactionsResponse]) => {
      if (!active) return;
      if (merchantResponse.status === 401) {
        window.location.href = "/login";
        return;
      }
      const merchant = await merchantResponse.json();
      const transactions = await transactionsResponse.json();
      if (!active) return;
      if (!merchantResponse.ok || !transactionsResponse.ok) {
        setError(merchant.error || transactions.error || "Unable to load dashboard");
        return;
      }
      setError("");
      setMe(merchant);
      setItems(Array.isArray(transactions) ? transactions : []);
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!me) return;
    setBusy(true);
    setError("");
    try {
      const amountMinor = Math.round(Number(form.amount) * 100);
      const response = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          merchantId: me.membership.merchant.id,
          customerReference: form.customerReference || `customer_${Date.now()}`,
          customerEmail: form.customerEmail,
          customerName: form.customerName,
          amountMinor: String(amountMinor),
          currency: form.currency,
          provider: form.provider || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to initialize payment");
        await load();
        return;
      }
      await load();
      if (data.checkout?.authorizationUrl) {
        window.open(data.checkout.authorizationUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }

  const metrics = useMemo(
    () => ({
      total: items.length,
      review: items.filter((item) => item.status === "requires_review").length,
      succeeded: items.filter((item) => item.status === "succeeded").length,
      volume: items
        .filter((item) => item.status === "succeeded" && item.currency === "NGN")
        .reduce((sum, item) => sum + Number(item.amount_minor), 0),
    }),
    [items],
  );

  const cards: MetricCard[] = [
    { label: "Transactions", value: metrics.total, Icon: Activity },
    { label: "Successful", value: metrics.succeeded, Icon: ShieldCheck },
    { label: "Review queue", value: metrics.review, Icon: Flag },
    { label: "Successful NGN volume", value: money(String(metrics.volume), "NGN"), Icon: ArrowUpRight },
  ];

  return (
    <AppShell authenticated>
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="muted text-sm">{me?.membership.merchant.name || "Merchant workspace"}</p>
            <h1 className="mt-1 text-3xl font-semibold">Payments operations</h1>
          </div>
          <button className="btn btn-secondary" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}
        {me && me.providers.configured.length === 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-500">
            No live payment provider credential is configured on the deployment yet. Vortix will not create a fake successful payment; checkout initialization remains unavailable until at least one provider secret is added.
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, Icon }) => (
            <div className="panel p-5" key={label}>
              <div className="flex items-center justify-between">
                <span className="muted text-sm">{label}</span>
                <Icon className="size-4 text-blue-400" />
              </div>
              <div className="mt-4 text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={submit} className="panel p-6">
            <div className="flex items-center gap-2">
              <Route className="size-5 text-blue-400" />
              <h2 className="font-semibold">Initialize live checkout</h2>
            </div>
            <p className="muted mt-2 text-sm">Vortix creates a hosted checkout with a configured provider; card details never pass through this application.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm"><span className="muted">Amount</span><input type="number" min="1" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
              <label className="grid gap-2 text-sm"><span className="muted">Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>NGN</option><option>USD</option><option>GBP</option><option>EUR</option></select></label>
              <label className="grid gap-2 text-sm sm:col-span-2"><span className="muted">Customer email</span><input type="email" required value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} /></label>
              <label className="grid gap-2 text-sm"><span className="muted">Customer name</span><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
              <label className="grid gap-2 text-sm"><span className="muted">Order / customer reference</span><input required value={form.customerReference} onChange={(e) => setForm({ ...form, customerReference: e.target.value })} /></label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="muted">Preferred provider</span>
                <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                  <option value="">Automatic routing</option>
                  {me?.providers.paystack && <option value="paystack">Paystack</option>}
                  {me?.providers.flutterwave && <option value="flutterwave">Flutterwave</option>}
                  {me?.providers.monnify && <option value="monnify">Monnify</option>}
                </select>
              </label>
            </div>
            <button disabled={busy || !me || me.providers.configured.length === 0} className="btn btn-primary mt-5 w-full">
              {busy ? "Initializing…" : "Create checkout"}
            </button>
          </form>

          <section className="panel overflow-hidden">
            <div className="border-b p-6" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-semibold">Recent transactions</h2>
              <p className="muted mt-1 text-sm">Final success is recorded only after signed webhook and provider verification.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="muted text-left"><tr><th className="p-4">Reference</th><th>Amount</th><th>Risk</th><th>Provider</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="p-4"><div className="font-medium">{item.reference}</div><div className="muted text-xs">{item.customer_email}</div></td>
                      <td>{money(item.amount_minor, item.currency)}</td>
                      <td>{item.risk_score}</td>
                      <td>{item.provider || "—"}</td>
                      <td><span className={`badge status-${item.status.toUpperCase()}`}>{item.status.replaceAll("_", " ")}</span></td>
                      <td>{item.authorization_url && item.status !== "succeeded" ? <a href={item.authorization_url} target="_blank" rel="noreferrer" title="Open checkout"><ExternalLink className="size-4" /></a> : null}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={6} className="muted p-8 text-center">No payments yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
