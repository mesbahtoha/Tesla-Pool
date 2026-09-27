"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, homeFor } from "@/lib/auth";
import { Btn, Card, ErrorNote, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const u = await login(email.trim(), password);
      router.push(homeFor(u.role));
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to request seats or drive your Tesla.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Email">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nusrat@teslapool.test" />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <ErrorNote message={err} />
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? "Logging in…" : "Log in"}
          </Btn>
        </form>
        <p className="mt-3 text-center text-sm text-slate-500">
          No account? <Link href="/signup" className="font-semibold text-tesla-700">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
