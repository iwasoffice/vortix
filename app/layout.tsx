import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vortix Engine",
  description: "Payment gateway infrastructure — routing, risk, and ledger engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
