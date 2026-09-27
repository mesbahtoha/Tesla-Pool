"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT } from "@/lib/api";
import { Badge, Card, Empty, Spinner } from "@/components/ui";

export default function HistoryPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ rides: any[]; pools: any[]; events: any[] } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;
    api("/api/history", { token }).then(setData).catch(() => setData({ rides: [], pools: [], events: [] }));
  }, [token]);

  if (loading || !user) return <Spinner />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">History</h1>

      {data.rides.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">My rides ({data.rides.length})</h2>
          {data.rides.map((r: any) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{r.pickupArea} → {r.dropoffArea}</span>
                <span className="text-slate-500"> · {new Date(r.createdAt).toLocaleString()}{r.isPooled ? " · 🤝 pooled" : ""}</span>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Badge status={r.status} />
                <span className="font-bold">{fareBDT(r.finalFarePaisa ?? r.estimatedFarePaisa)}</span>
              </p>
            </Card>
          ))}
        </section>
      )}

      {data.pools.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Pools I drove ({data.pools.length})</h2>
          {data.pools.map((p: any) => (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">🛺 {p.vehicle?.name}</span>
                <span className="text-slate-500"> · {p.occupiedSeats}/{p.totalSeats} seats · {p.members?.length || 0} rider(s) · {new Date(p.createdAt).toLocaleString()}</span>
              </p>
              <Badge status={p.status} />
            </Card>
          ))}
        </section>
      )}

      {data.rides.length === 0 && data.pools.length === 0 && (
        <Empty title="Nothing here yet" hint="Completed and cancelled trips will show up with fares and receipts." />
      )}
    </div>
  );
}
