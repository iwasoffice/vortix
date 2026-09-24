"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Webhook } from "lucide-react";
import { AppShell } from "@/components/app-shell";

type MerchantContext = {
  membership: { role: string; merchant: { id: string; name: string } };
  providers: { configured: string[]; paystack: boolean; flutterwave: boolean; monnify: boolean };
};

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at?: string | null;
};

export default function Settings() {
  const [me, setMe] = useState<MerchantContext | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("Production server");
  const [created, setCreated] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [merchantResponse, keysResponse] = await Promise.all([
      fetch("/api/v1/me"),
      fetch("/api/v1/api-keys"),
    ]);
    if (merchantResponse.status === 401) {
      window.location.href = "/login";
      return;
    }
    const merchant = await merchantResponse.json();
    const keyData = await keysResponse.json();
    if (!merchantResponse.ok) {
      setError(merchant.error || "Unable to load merchant settings");
      return;
    }
    setError("");
    setMe(merchant);
    setKeys(Array.isArray(keyData) ? keyData : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    if (!me) return;
    setCreated("");
    setError("");
    const response = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchantId: me.membership.merchant.id, name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to create API key");
      return;
    }
    setCreated(data.key);
    await load();
  }

  async function revoke(id: string) {
    setError("");
    const response = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to revoke API key");
      return;
    }
    await load();
  }

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const providerRows: Array<[string, boolean | undefined]> = [
    ["Paystack", me?.providers.paystack],
    ["Flutterwave", me?.providers.flutterwave],
    ["Monnify", me?.providers.monnify],
  ];

  return (
    <AppShell authenticated>
      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <h1 className="text-3xl font-semibold">Merchant settings</h1>
        <p className="muted mt-2">Production credentials, provider readiness and webhook configuration.</p>
        {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="panel p-6">
            <div className="flex items-center gap-2"><KeyRound className="size-5 text-blue-400" /><h2 className="font-semibold">Vortix API keys</h2></div>
            <p className="muted mt-2 text-sm">Keys identify server integrations. The full key is shown once and only its SHA-256 hash is stored.</p>
            <div className="mt-5 flex gap-2">
              <input className="min-w-0 flex-1" value={name} onChange={(event) => setName(event.target.value)} />
              <button className="btn btn-primary" onClick={() => void createKey()}>Create</button>
            </div>
            {created && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-xs font-semibold text-emerald-500">COPY THIS KEY NOW</div>
                <div className="mt-2 flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all text-sm">{created}</code>
                  <button onClick={() => void navigator.clipboard.writeText(created)} aria-label="Copy API key"><Copy className="size-4" /></button>
                </div>
              </div>
            )}
            <div className="mt-5 grid gap-2">
              {keys.map((key) => (
                <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)" }} key={key.id}>
                  <div><div className="text-sm font-medium">{key.name}</div><div className="muted text-xs">{key.key_prefix}••••••••</div></div>
                  <div className="flex items-center gap-2">
                    <span className="muted text-xs">{key.revoked_at ? "Revoked" : "Active"}</span>
                    {!key.revoked_at && <button className="text-xs text-red-400" onClick={() => void revoke(key.id)}>Revoke</button>}
                  </div>
                </div>
              ))}
              {keys.length === 0 && <div className="muted text-sm">No API keys yet.</div>}
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex items-center gap-2"><Webhook className="size-5 text-blue-400" /><h2 className="font-semibold">Payment providers</h2></div>
            <div className="mt-5 grid gap-3">
              {providerRows.map(([provider, configured]) => (
                <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--border)" }} key={provider}>
                  <span>{provider}</span>
                  <span className={configured ? "text-emerald-500" : "text-amber-500"}>{configured ? "Configured" : "Credentials required"}</span>
                </div>
              ))}
            </div>
            <h3 className="mt-6 text-sm font-semibold">Webhook endpoints</h3>
            <div className="muted mt-2 grid gap-2 text-xs">
              <code>{base}/api/webhooks/paystack</code>
              <code>{base}/api/webhooks/flutterwave</code>
              <code>{base}/api/webhooks/monnify</code>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
