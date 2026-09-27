"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-tesla-600 text-lg text-white">🛺</span>
          <span className="font-bold tracking-tight">Dhaka Tesla Pool</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {user ? (
            <>
              <Link
                href={user.role === "DRIVER" ? "/driver" : "/passenger"}
                className="rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                Rides
              </Link>
              <Link
                href="/history"
                className="rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                History
              </Link>
              <span className="hidden rounded-lg bg-slate-100 px-2 py-1.5 text-slate-600 sm:inline">
                {user.name} · {user.role.toLowerCase()}
              </span>
              <button
                onClick={logout}
                className="rounded-lg px-2 py-1.5 font-medium text-rose-600 hover:bg-rose-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-tesla-600 px-3 py-1.5 font-semibold text-white hover:bg-tesla-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
