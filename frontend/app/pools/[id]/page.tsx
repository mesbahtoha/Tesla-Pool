"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT } from "@/lib/api";
import { Card, Chip, ErrorNote, IconBadge, Spinner, Stepper } from "@/components/ui";

interface PoolDetail {
  id: string;
  status: string;
  pickupZone: string;
  totalSeats: number;
  occupiedSeats: number;
  createdAt: string;
  vehicle: { name: string; capacity: number };
  driver: { name: string };
  members: {
    id: string;
    seats: number;
    farePaisa: number;
    status: string;
    passenger: { id: string; name: string };
    rideRequest: { id: string; pickupArea: string; dropoffArea: string; status: string };
  }[];
  events: { id: string; fromStatus: string; toStatus: string; note: string | null; createdAt: string }[];
}

export default function PoolPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    api<{ pool: PoolDetail }>(`/api/pools/${id}`, { token })
      .then((r) => setPool(r.pool))
      .catch((e) => setErr(e.message));
  }, [token, id]);

  if (loading || !user) return <Spinner />;
  if (err) return <ErrorNote message={err} />;
  if (!pool) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Pool · {pool.vehicle.name} 🛺</h1>
        <Chip status={pool.status} />
      </div>

      <Card shadow="amber">
        <Stepper status={pool.status} />
        <div className="mt-4 grid gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p>🛺 Driver: <span className="font-bold text-ink dark:text-white">{pool.driver.name}</span></p>
          <p>💺 Seats: <span className="font-bold text-ink dark:text-white">{pool.occupiedSeats}/{pool.totalSeats}</span></p>
          <p>📍 Pickup corridor: <span className="font-bold text-ink dark:text-white">{pool.pickupZone}</span></p>
          <p>🕒 Created: {new Date(pool.createdAt).toLocaleString()}</p>
        </div>
      </Card>

      <Card shadow="mint" pop>
        <IconBadge emoji="🧍" bg="bg-pop-mint" />
        <h2 className="font-display text-xl font-extrabold">Who&apos;s riding</h2>
        <div className="mt-3 space-y-2">
          {pool.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-slate-200 p-3 text-sm font-medium dark:border-nightline">
              <p>
                <span className="font-bold">{m.passenger.name}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {m.rideRequest.pickupArea} → {m.rideRequest.dropoffArea} · {m.seats} seat{m.seats > 1 ? "s" : ""}</span>
              </p>
              <p className="flex items-center gap-2">
                <Chip status={m.rideRequest.status} />
                <span className="rounded-full bg-pop-amber px-2 py-0.5 font-display font-extrabold">{fareBDT(m.farePaisa)}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          🔒 Privacy: passengers only see their own fare row — drivers see everyone.
        </p>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-extrabold">Trip timeline</h2>
        <ol className="mt-3 space-y-2 text-sm font-medium">
          {pool.events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleTimeString()}</span>
              <Chip status={e.toStatus} />
              {e.note && <span>{e.note}</span>}
            </li>
          ))}
          {pool.events.length === 0 && <p className="text-slate-400">No events yet.</p>}
        </ol>
      </Card>
    </div>
  );
}
