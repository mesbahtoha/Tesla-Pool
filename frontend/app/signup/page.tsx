"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, homeFor, Role } from "@/lib/auth";
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
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-extrabold">Join the pool</h1>
        <p className="mt-1 text-sm text-slate-500">One account — ride, drive, or both.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Name">
            <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nusrat" />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Password (min 6 chars)">
            <input className={inputCls} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="I want to">
            <div className="grid grid-cols-3 gap-2">
              {(["PASSENGER", "DRIVER", "BOTH"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold ${
                    role === r ? "border-tesla-600 bg-tesla-50 text-tesla-700" : "border-slate-300 text-slate-600"
                  }`}
                >
                  {r === "PASSENGER" ? "🧍 Ride" : r === "DRIVER" ? "🛺 Drive" : "🔀 Both"}
                </button>
              ))}
            </div>
          </Field>
          <ErrorNote message={err} />
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Btn>
        </form>
        <p className="mt-3 text-center text-sm text-slate-500">
          Have an account? <Link href="/login" className="font-semibold text-tesla-700">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
