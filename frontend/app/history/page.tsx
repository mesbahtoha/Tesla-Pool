"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, fareBDT } from "@/lib/api";
import { Card, Chip, Empty, SectionHead, Spinner } from "@/components/ui";

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
    <div className="space-y-8">
      <SectionHead kicker="Receipts" title="History 🕒" sub="Every trip, every fare, every pool — explainable on demand." />

      {data.rides.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-extrabold">My rides ({data.rides.length})</h2>
          {data.rides.map((r: any) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                <span className="font-bold">{r.pickupArea} → {r.dropoffArea}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {new Date(r.createdAt).toLocaleString()}{r.isPooled ? " · 🤝 pooled" : ""}</span>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Chip status={r.status} />
                <span className="font-display font-extrabold">{fareBDT(r.finalFarePaisa ?? r.estimatedFarePaisa)}</span>
              </p>
            </Card>
          ))}
        </section>
      )}

      {data.pools.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-extrabold">Pools I drove ({data.pools.length})</h2>
          {data.pools.map((p: any) => (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                <span className="font-bold">🛺 {p.vehicle?.name}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {p.occupiedSeats}/{p.totalSeats} seats · {p.members?.length || 0} rider(s) · {new Date(p.createdAt).toLocaleString()}</span>
              </p>
              <Chip status={p.status} />
            </Card>
          ))}
        </section>
      )}

      {data.rides.length === 0 && data.pools.length === 0 && (
        <Empty title="Nothing here yet" hint="Completed and cancelled trips will show up with fares and receipts." emoji="📭" />
      )}
    </div>
  );
}
