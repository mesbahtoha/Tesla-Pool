"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT } from "@/lib/api";
import { Badge, Card, ErrorNote, Spinner, Stepper } from "@/components/ui";

interface PoolDetail {
  id: string;
  status: string;
  pickupZone: string;
  totalSeats: number;
  occupiedSeats: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Pool · {pool.vehicle.name}</h1>
        <Badge status={pool.status} />
      </div>

      <Card>
        <Stepper status={pool.status} />
        <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
          <p>🛺 Driver: <span className="font-semibold text-slate-900">{pool.driver.name}</span></p>
          <p>💺 Seats: <span className="font-semibold text-slate-900">{pool.occupiedSeats}/{pool.totalSeats}</span></p>
          <p>📍 Pickup corridor: <span className="font-semibold text-slate-900">{pool.pickupZone}</span></p>
          <p>🕒 Created: {new Date(pool.createdAt).toLocaleString()}</p>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Who&apos;s riding</h2>
        <div className="mt-2 space-y-2">
          {pool.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
              <p>
                <span className="font-semibold">{m.passenger.name}</span>
                <span className="text-slate-500"> · {m.rideRequest.pickupArea} → {m.rideRequest.dropoffArea} · {m.seats} seat{m.seats > 1 ? "s" : ""}</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge status={m.rideRequest.status} />
                <span className="font-extrabold">{fareBDT(m.farePaisa)}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Privacy: passengers only see their own fare row — drivers see everyone.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">Trip timeline</h2>
        <ol className="mt-2 space-y-1.5 text-sm">
          {pool.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-2 text-slate-600">
              <span className="text-slate-400">{new Date(e.createdAt).toLocaleTimeString()}</span>
              <span><Badge status={e.toStatus} /></span>
              {e.note && <span>{e.note}</span>}
            </li>
          ))}
          {pool.events.length === 0 && <p className="text-slate-400">No events yet.</p>}
        </ol>
      </Card>
    </div>
  );
}
