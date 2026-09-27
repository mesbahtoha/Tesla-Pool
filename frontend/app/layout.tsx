import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import Navbar from "@/components/Navbar";

const display = Outfit({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Dhaka Tesla Pool — share a seat, split the fare",
  description: "Battery-powered Tesla ride-pooling across Dhaka. Request a seat, share with neighbours, split the fare fairly.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
            <footer className="border-t-2 border-ink py-8 text-center text-xs font-medium text-slate-500 dark:border-[#FFF7E6] dark:text-slate-400">
              <p className="font-display text-sm font-bold text-ink dark:text-[#FFF7E6]">
                🛺 Dhaka Tesla Pool · share a seat, split the fare
              </p>
              <p className="mt-1">Built for Dhaka traffic · Banani → everywhere</p>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
