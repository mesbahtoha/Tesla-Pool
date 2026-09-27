"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink bg-cream/95 backdrop-blur dark:border-[#FFF7E6] dark:bg-night/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-ink bg-pop-amber text-xl transition-transform group-hover:animate-wiggle dark:border-[#FFF7E6]">
            🛺
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Dhaka Tesla <span className="text-accent dark:text-accent-dark">Pool</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white text-lg transition-transform hover:animate-wiggle dark:border-[#FFF7E6] dark:bg-nightcard"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {user ? (
            <>
              <nav className="hidden items-center gap-1 text-sm font-bold sm:flex">
                <Link
                  href={user.role === "DRIVER" ? "/driver" : "/passenger"}
                  className="rounded-full px-3 py-2 hover:bg-pop-amber dark:hover:bg-nightcard"
                >
                  Rides
                </Link>
                <Link href="/history" className="rounded-full px-3 py-2 hover:bg-pop-amber dark:hover:bg-nightcard">
                  History
                </Link>
                <span className="rounded-full border-2 border-ink bg-pop-mint px-3 py-1 text-xs dark:border-[#FFF7E6]">
                  {user.name} · {user.role.toLowerCase()}
                </span>
                <button onClick={logout} className="rounded-full px-3 py-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-nightcard">
                  Log out
                </button>
              </nav>
              <button
                onClick={() => setOpen((o) => !o)}
                aria-label="Menu"
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white font-bold sm:hidden dark:border-[#FFF7E6] dark:bg-nightcard"
              >
                {open ? "✕" : "☰"}
              </button>
            </>
          ) : (
            <nav className="flex items-center gap-2 text-sm font-bold">
              <Link href="/login" className="rounded-full px-3 py-2 hover:bg-pop-amber dark:hover:bg-nightcard">
                Log in
              </Link>
              <Link href="/signup" className="btn-candy !min-h-0 px-4 py-2">
                Sign up
              </Link>
            </nav>
          )}
        </div>
      </div>

      {user && open && (
        <nav className="flex flex-col gap-1 border-t-2 border-ink px-4 py-3 text-sm font-bold sm:hidden dark:border-[#FFF7E6]">
          <Link href={user.role === "DRIVER" ? "/driver" : "/passenger"} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-pop-amber">
            🧭 Rides
          </Link>
          <Link href="/history" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-pop-amber">
            🕒 History
          </Link>
          <button onClick={logout} className="rounded-xl px-3 py-2.5 text-left text-rose-500 hover:bg-rose-100">
            Log out ({user.name})
          </button>
        </nav>
      )}
    </header>
  );
}
