"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Transaction } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  settled: "#31D0AA",
  routed: "#5B8CFF",
  authorized: "#5B8CFF",
  pending: "#7A8699",
  flagged: "#FF5C5C",
  failed: "#FF5C5C",
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "10000",
    currency: "NGN",
    merchantId: "merchant_demo_1",
    customerRef: "customer_001",
  });

  async function fetchTransactions() {
    const res = await fetch("/api/transactions");
    const data = await res.json();
    setTransactions(data);
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
      }),
    });
    await fetchTransactions();
    setLoading(false);
  }

  const statusCounts = transactions.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.status] = (acc[tx.status] ?? 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const volumeByProcessor = transactions.reduce<Record<string, number>>((acc, tx) => {
    const key = tx.processor ?? "unrouted";
    acc[key] = (acc[key] ?? 0) + tx.amount;
    return acc;
  }, {});

  const barData = Object.entries(volumeByProcessor).map(([processor, amount]) => ({
    processor,
    amount,
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Vortix Engine Dashboard</h1>
      <p className="text-vortix-muted mb-8">Live view of transaction routing, risk, and settlement</p>

      <form
        onSubmit={handleSubmit}
        className="bg-vortix-panel rounded-xl p-5 mb-10 grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-vortix-muted">Amount</label>
          <input
            className="bg-black/30 rounded px-2 py-1 text-white"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-vortix-muted">Currency</label>
          <select
            className="bg-black/30 rounded px-2 py-1 text-white"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-vortix-muted">Merchant ID</label>
          <input
            className="bg-black/30 rounded px-2 py-1 text-white"
            value={form.merchantId}
            onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-vortix-muted">Customer Ref</label>
          <input
            className="bg-black/30 rounded px-2 py-1 text-white"
            value={form.customerRef}
            onChange={(e) => setForm({ ...form, customerRef: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-vortix-accent rounded px-4 py-2 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Processing…" : "Simulate Transaction"}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-vortix-panel rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Volume by Processor</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="processor" stroke="#7A8699" fontSize={12} />
              <YAxis stroke="#7A8699" fontSize={12} />
              <Tooltip contentStyle={{ background: "#131826", border: "none" }} />
              <Bar dataKey="amount" fill="#5B8CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-vortix-panel rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#7A8699"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#131826", border: "none" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-vortix-panel rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-vortix-muted border-b border-white/10">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Processor</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-vortix-muted">{tx.id.slice(0, 8)}</td>
                  <td className="py-2 pr-4 text-white">
                    {tx.currency} {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-white">{tx.processor ?? "—"}</td>
                  <td className="py-2 pr-4 text-white">{tx.riskScore}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLORS[tx.status]}22`,
                        color: STATUS_COLORS[tx.status],
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-vortix-muted">
                    No transactions yet — simulate one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
