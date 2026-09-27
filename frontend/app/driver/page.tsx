"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT, AREAS_FALLBACK } from "@/lib/api";
import { Btn, Card, Chip, Empty, ErrorNote, Field, IconBadge, SectionHead, Spinner, Stepper, inputCls } from "@/components/ui";

interface WaitRide {
  id: string;
  pickupArea: string;
  dropoffArea: string;
  seatsRequested: number;
  status: string;
  estimatedFarePaisa: number;
  createdAt: string;
  passenger: { name: string };
}

interface Pool {
  id: string;
  status: string;
  pickupZone: string;
  totalSeats: number;
  occupiedSeats: number;
  createdAt: string;
  vehicle: { name: string };
  members: { id: string; seats: number; farePaisa: number; passenger: { name: string }; rideRequest: { pickupArea: string; dropoffArea: string } }[];
}

interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  isOnline: boolean;
  currentZone: string;
}

const NEXT: Record<string, string[]> = {
  MATCHED: ["DRIVER_ARRIVED", "STARTED"],
  DRIVER_ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
  REQUESTED: [],
};

const NEXT_LABEL: Record<string, string> = {
  DRIVER_ARRIVED: "📍 I've arrived",
  STARTED: "▶ Start trip",
  COMPLETED: "✔ Complete trip",
};

export default function DriverPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [waiting, setWaiting] = useState<WaitRide[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [vname, setVname] = useState("Bullet");
  const [vcap, setVcap] = useState(3);
  const [vzone, setVzone] = useState("Banani");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [v, w, p] = await Promise.all([
        api<{ vehicle: Vehicle | null }>("/api/driver/vehicle", { token }),
        api<{ rides: WaitRide[] }>("/api/driver/requests", { token }),
        api<{ pools: Pool[] }>("/api/driver/pools", { token }),
      ]);
      setVehicle(v.vehicle);
      setWaiting(w.rides);
      setPools(p.pools);
      if (v.vehicle) {
        setVname(v.vehicle.name);
        setVcap(v.vehicle.capacity);
        setVzone(v.vehicle.currentZone);
      }
    } catch (e: any) {
      setErr(e.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveVehicle(online: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ vehicle: Vehicle }>("/api/driver/vehicle", {
        method: "POST",
        token,
        body: { name: vname.trim() || "Bullet", capacity: vcap, currentZone: vzone, isOnline: online },
      });
      setVehicle(r.vehicle);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleOnline() {
    if (!vehicle) return;
    try {
      const r = await api<{ vehicle: Vehicle }>("/api/driver/status", {
        method: "PATCH",
        token,
        body: { isOnline: !vehicle.isOnline },
      });
      setVehicle(r.vehicle);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function togglePick(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function accept() {
    if (!vehicle || picked.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/driver/pools", {
        method: "POST",
        token,
        body: { vehicleId: vehicle.id, rideRequestIds: picked },
      });
      setPicked([]);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function advance(poolId: string, to: string) {
    try {
      await api(`/api/pools/${poolId}/status`, { method: "PATCH", token, body: { to } });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (loading || !user) return <Spinner />;
  const livePools = pools.filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Salaam, {user.name}! 🛺</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fill those seats, split those fares.</p>
        </div>
        {vehicle && (
          <button
            onClick={toggleOnline}
            className={`rounded-full border-2 border-ink px-4 py-2 text-sm font-bold dark:border-[#FFF7E6] ${vehicle.isOnline ? "bg-pop-mint" : "bg-white dark:bg-nightcard"}`}
          >
            {vehicle.isOnline ? "🟢 Online — tap to go offline" : "⚪ Offline — tap to go online"}
          </button>
        )}
      </div>

      <ErrorNote message={err} />

      <Card shadow="amber" pop>
        <IconBadge emoji="🛺" bg="bg-pop-amber" />
        <h2 className="font-display text-xl font-extrabold">My Tesla</h2>
        {!vehicle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Register your Tesla to start accepting rides.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Tesla name">
            <input className={inputCls} value={vname} onChange={(e) => setVname(e.target.value)} placeholder="Bullet" />
          </Field>
          <Field label="Seats (capacity)">
            <select className={inputCls} value={vcap} onChange={(e) => setVcap(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Base zone">
            <select className={inputCls} value={vzone} onChange={(e) => setVzone(e.target.value)}>
              {AREAS_FALLBACK.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={() => saveVehicle(true)} disabled={busy}>{vehicle ? "Save + go online" : "Register + go online →"}</Btn>
          {vehicle && <Btn variant="ghost" onClick={() => saveVehicle(vehicle.isOnline)} disabled={busy}>Save only</Btn>}
        </div>
        {vehicle && (
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            {vehicle.name} · {vehicle.capacity} seats · based in {vehicle.currentZone} · {vehicle.isOnline ? "🟢 online" : "⚪ offline"}
          </p>
        )}
      </Card>

      {vehicle && vehicle.isOnline && (
        <Card shadow="mint" pop>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold">Waiting requests ({waiting.length})</h2>
            {picked.length > 0 && (
              <Btn onClick={accept} disabled={busy}>
                Accept {picked.length} → new pool 🛺
              </Btn>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Tick compatible trips (same pickup corridor) to pool them — capacity {vehicle.capacity} enforced by the API.
          </p>
          <div className="mt-4 space-y-2">
            {waiting.length === 0 && <Empty title="No waiting requests" hint="New passenger requests appear here — hit refresh." emoji="📭" />}
            {waiting.map((r) => (
              <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-medium transition-all ${picked.includes(r.id) ? "border-ink bg-pop-amber/40 dark:border-[#FFF7E6]" : "border-slate-200 dark:border-nightline"}`}>
                <input type="checkbox" checked={picked.includes(r.id)} onChange={() => togglePick(r.id)} className="h-5 w-5 accent-[#8B5CF6]" />
                <span className="flex-1">
                  <span className="font-bold">{r.pickupArea} → {r.dropoffArea}</span>
                  <span className="text-slate-500 dark:text-slate-400"> · {r.passenger.name} · {r.seatsRequested} seat{r.seatsRequested > 1 ? "s" : ""} · {fareBDT(r.estimatedFarePaisa)}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHead title={`My pools (${livePools.length} live)`} />
          <Btn variant="ghost" onClick={load}>↻ Refresh</Btn>
        </div>
        {pools.length === 0 && <Empty title="No pools yet" hint="Accept waiting requests to fill your Tesla." />}
        {pools.map((p) => (
          <Card key={p.id} pop>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-extrabold">🛺 {p.vehicle.name} · {p.occupiedSeats}/{p.totalSeats} seats · {p.pickupZone}</p>
                <div className="mt-2 space-y-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {p.members.map((m) => (
                    <p key={m.id} className="rounded-xl bg-slate-100 px-2 py-1 dark:bg-night">🧍 {m.passenger.name} — {m.rideRequest.pickupArea} → {m.rideRequest.dropoffArea} ({m.seats} seat{m.seats > 1 ? "s" : ""}, {fareBDT(m.farePaisa)})</p>
                  ))}
                </div>
              </div>
              <Chip status={p.status} />
            </div>
            <div className="mt-3"><Stepper status={p.status} /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(NEXT[p.status] || []).map((to) => (
                <Btn key={to} variant={to === "COMPLETED" ? "primary" : "ghost"} onClick={() => advance(p.id, to)}>
                  {NEXT_LABEL[to]}
                </Btn>
              ))}
              {["REQUESTED", "MATCHED", "DRIVER_ARRIVED"].includes(p.status) && (
                <Btn variant="danger" onClick={() => advance(p.id, "CANCELLED")}>Cancel pool</Btn>
              )}
              <Link href={`/pools/${p.id}`} className="btn-ghosty !min-h-0 px-4 py-2">Details</Link>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
