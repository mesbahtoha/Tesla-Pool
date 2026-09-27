"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, homeFor } from "@/lib/auth";
import { validEmail } from "@/lib/api";
import { Btn, Card, ErrorNote, Field, Spinner, inputCls } from "@/components/ui";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already authenticated → no business on the login form.
  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) {
      setErr("Email must contain @ and .com (e.g. nusrat@teslapool.com)");
      return;
    }
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

  if (loading || user) return <Spinner />;

  return (
    <div className="relative mx-auto max-w-md py-8">
      <div className="dotgrid-faint absolute inset-0 -z-10 rounded-[2rem]" aria-hidden />
      <Card shadow="pink" className="animate-pop-in">
        <p className="text-4xl">👋</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Welcome back!</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log in to grab seats or drive your Tesla.</p>
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <Field label="Email">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nusrat@teslapool.com" />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <ErrorNote message={err} />
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? "Logging in…" : "Log in →"}
          </Btn>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          New here? <Link href="/signup" className="font-bold text-accent dark:text-accent-dark">Hop on board</Link>
        </p>
      </Card>
    </div>
  );
}
