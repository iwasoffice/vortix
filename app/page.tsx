import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-white">Vortix</h1>
      <p className="max-w-md text-vortix-muted">
        Payment gateway infrastructure — transaction routing, risk scoring,
        and ledger, running live in this demo.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-vortix-accent px-6 py-3 font-medium text-white hover:opacity-90 transition"
      >
        Open Dashboard →
      </Link>
    </main>
  );
}
