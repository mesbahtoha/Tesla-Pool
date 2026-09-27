import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Dhaka Tesla Pool — share a seat, split the fare",
  description: "Battery-powered Tesla ride-pooling across Dhaka. Request a seat, share with neighbours, split the fare fairly.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            Dhaka Tesla Pool · share a seat, split the fare · Built for Dhaka traffic
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
