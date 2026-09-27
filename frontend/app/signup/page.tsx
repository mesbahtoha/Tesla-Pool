"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, homeFor, Role } from "@/lib/auth";
import { validEmail } from "@/lib/api";
import { Btn, Card, ErrorNote, Field, inputCls } from "@/components/ui";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PASSENGER");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) {
      setErr("Email must contain @ and .com (e.g. nusrat@teslapool.com)");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const u = await signup(name.trim(), email.trim(), password, role);
      router.push(homeFor(u.role));
    } catch (e: any) {
      setErr(e.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-md py-8">
      <div className="dotgrid-faint absolute inset-0 -z-10 rounded-[2rem]" aria-hidden />
      <Card shadow="mint" className="animate-pop-in">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Join the pool!</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">One account — ride, drive, or both.</p>
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <Field label="Name">
            <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nusrat" />
          </Field>
          <Field label="Email (needs @ and .com)">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@teslapool.com" />
          </Field>
          <Field label="Password (min 6 chars)">
            <input className={inputCls} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="I want to">
            <div className="grid grid-cols-3 gap-2">
              {([
                { r: "PASSENGER" as Role, e: "🧍 Ride" },
                { r: "DRIVER" as Role, e: "🛺 Drive" },
                { r: "BOTH" as Role, e: "🔀 Both" },
              ]).map(({ r, e }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-2xl border-2 px-2 py-2.5 text-xs font-bold transition-all ${
                    role === r
                      ? "border-ink bg-pop-amber text-ink dark:border-[#FFF7E6]"
                      : "border-slate-300 text-slate-500 dark:border-nightline dark:text-slate-400"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <ErrorNote message={err} />
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account →"}
          </Btn>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Have an account? <Link href="/login" className="font-bold text-accent dark:text-accent-dark">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
