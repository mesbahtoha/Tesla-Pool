"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT, AREAS_FALLBACK } from "@/lib/api";
import { Btn, Card, Chip, Empty, ErrorNote, Field, IconBadge, SectionHead, Spinner, Stepper, inputCls } from "@/components/ui";

interface Ride {
  id: string;
  pickupArea: string;
  dropoffArea: string;
  seatsRequested: number;
  status: string;
  estimatedFarePaisa: number;
  finalFarePaisa: number | null;
  isPooled: boolean;
  paymentMethod: string;
  createdAt: string;
  pool: { id: string; vehicle: { name: string }; driver: { name: string } } | null;
}

export default function PassengerPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [areas, setAreas] = useState<string[]>(AREAS_FALLBACK);
  const [pickup, setPickup] = useState("Banani Road 11");
  const [dropoff, setDropoff] = useState("Mohakhali");
  const [seats, setSeats] = useState(1);
  const [pay, setPay] = useState("TESLAPAY");
  const [rides, setRides] = useState<Ride[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [justMatched, setJustMatched] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [r, w, a] = await Promise.all([
        api<{ rides: Ride[] }>("/api/rides/my", { token }),
        api<{ balancePaisa: number }>("/api/wallet", { token }),
        api<{ areas: { name: string }[] }>("/api/areas").catch(() => null),
      ]);
      setRides(r.rides);
      setBalance(w.balancePaisa);
      if (a) setAreas(a.areas.map((x) => x.name));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function requestRide(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setJustMatched(false);
    try {
      const r = await api<{ ride: Ride; autoMatched: boolean; matchReason: string | null }>(
        "/api/rides/request",
        { method: "POST", token, body: { pickupArea: pickup, dropoffArea: dropoff, seats, paymentMethod: pay } }
      );
      setJustMatched(r.autoMatched);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this ride? Your seat goes back to the pool.")) return;
    try {
      await api(`/api/rides/${id}/cancel`, { method: "POST", token });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function topup() {
    const v = prompt("Top up TeslaPay wallet — amount in BDT (min 10):", "500");
    if (!v) return;
    try {
      const r = await api<{ balancePaisa: number }>("/api/wallet/topup", {
        method: "POST",
        token,
        body: { amountBDT: Number(v) },
      });
      setBalance(r.balancePaisa);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (loading || !user) return <Spinner />;
  const active = rides.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status));
  const past = rides.filter((r) => ["COMPLETED", "CANCELLED"].includes(r.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Assalamu alaikum, {user.name}! 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Where to, boss? Pick zones, grab seats.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-pop-mint px-4 py-2 text-sm font-bold dark:border-[#FFF7E6]">
            💰 {balance === null ? "…" : fareBDT(balance)}
          </span>
          <Btn variant="ghost" onClick={topup}>+ Top up</Btn>
          <Btn variant="ghost" onClick={load} disabled={refreshing}>{refreshing ? "…" : "↻"}</Btn>
        </div>
      </div>

      <ErrorNote message={err} />
      {justMatched && (
        <div className="animate-pop-in rounded-2xl border-2 border-ink bg-pop-mint px-4 py-2.5 text-sm font-bold dark:border-[#FFF7E6]">
          🤝 Auto-matched into a shared Tesla — pool discount applied!
        </div>
      )}

      <Card shadow="pink" pop>
        <IconBadge emoji="🎟️" bg="bg-pop-amber" />
        <h2 className="font-display text-xl font-extrabold">Request a seat</h2>
        <form onSubmit={requestRide} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Pickup">
            <select className={inputCls} value={pickup} onChange={(e) => setPickup(e.target.value)}>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Destination">
            <select className={inputCls} value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Seats">
            <select className={inputCls} value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
              {[1, 2, 3].map((s) => <option key={s} value={s}>{s} seat{s > 1 ? "s" : ""}</option>)}
            </select>
          </Field>
          <Field label="Pay with">
            <select className={inputCls} value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="TESLAPAY">TeslaPay wallet</option>
              <option value="CASH">Cash</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Btn type="submit" disabled={busy}>
              {busy ? "Finding your Tesla…" : "Request ride →"}
            </Btn>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              Solo fare = ৳60 base + ৳30/km · Shared rides save 25% automatically.
            </p>
          </div>
        </form>
      </Card>

      <section className="space-y-4">
        <SectionHead title={`Active trips (${active.length})`} />
        {active.length === 0 && <Empty title="No active trips" hint="Request a seat above — compatible trips pool automatically." />}
        {active.map((r) => (
          <Card key={r.id} pop>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-extrabold">{r.pickupArea} → {r.dropoffArea}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {r.seatsRequested} seat{r.seatsRequested > 1 ? "s" : ""} · {r.isPooled ? "🤝 pooled (−25%)" : "solo"} · {r.paymentMethod === "TESLAPAY" ? "TeslaPay" : "Cash"}
                  {r.pool && <> · 🛺 {r.pool.vehicle.name} ({r.pool.driver.name})</>}
                </p>
              </div>
              <Chip status={r.status} />
            </div>
            <div className="mt-3"><Stepper status={r.status} /></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Your fare: <span className="rounded-full bg-pop-amber px-2 py-0.5 font-display font-extrabold">{fareBDT(r.finalFarePaisa ?? r.estimatedFarePaisa)}</span>
                {r.finalFarePaisa === null && <span className="text-slate-400"> (estimate)</span>}
              </p>
              <div className="flex gap-2">
                {r.pool && <Link href={`/pools/${r.pool.id}`} className="btn-ghosty !min-h-0 px-4 py-2">Pool details</Link>}
                {["REQUESTED", "MATCHED"].includes(r.status) && <Btn variant="danger" onClick={() => cancel(r.id)}>Cancel</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <SectionHead title="Recent history" />
          {past.slice(0, 5).map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium"><span className="font-bold">{r.pickupArea} → {r.dropoffArea}</span> <span className="text-slate-500 dark:text-slate-400">· {new Date(r.createdAt).toLocaleString()}</span></p>
              <p className="flex items-center gap-2 text-sm"><Chip status={r.status} /><span className="font-display font-extrabold">{fareBDT(r.finalFarePaisa ?? r.estimatedFarePaisa)}</span></p>
            </Card>
          ))}
          <Link href="/history" className="font-display text-sm font-bold text-accent dark:text-accent-dark">Full history →</Link>
        </section>
      )}
    </div>
  );
}
