"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS_FALLBACK, FeaturedPool, PublicStats, dhakaTime, fetchStats, isRushHour } from "@/lib/api";
import { api } from "@/lib/api";
import { Card, Chip, Confetti, IconBadge, Marquee, SectionHead } from "@/components/ui";

const FEATURED_FALLBACK: FeaturedPool = {
  vehicleName: "Bullet",
  driverName: "Jashim",
  pickupZone: "Banani",
  occupiedSeats: 2,
  totalSeats: 3,
  poolStatus: "MATCHED",
  isOnline: true,
};

interface CastCard {
  e: string;
  bg: string;
  who: string;
  cred: string;
  note: string;
  liveStatus: string | null;
}

const CAST_FALLBACK: CastCard[] = [
  { e: "🛺", bg: "bg-pop-amber", who: "Jashim — driver", cred: "jashim@teslapool.com / driver123", note: "Bullet · 3 seats · online in Banani", liveStatus: "ONLINE" },
  { e: "🧍", bg: "bg-pop-mint", who: "Nusrat — passenger", cred: "nusrat@teslapool.com / passenger123", note: "Banani Rd 11 → Mohakhali · pooled with Rafiq", liveStatus: "MATCHED · POOLED" },
  { e: "🧍", bg: "bg-pop-pink", who: "Rafiq — passenger", cred: "rafiq@teslapool.com / passenger123", note: "Banani → Gulshan 1 · pooled with Nusrat", liveStatus: "MATCHED · POOLED" },
  { e: "🧍", bg: "bg-accent", who: "Shirin — passenger", cred: "shirin@teslapool.com / passenger123", note: "Banani → Farmgate · waiting · 1 seat left!", liveStatus: "REQUESTED" },
];

function LiveDot({ status }: { status: string }) {
  const s = status.toUpperCase();
  const bg = s.includes("OFFLINE") || s.includes("CANCELLED")
    ? "bg-rose-400 text-white"
    : s.includes("REQUESTED")
      ? "bg-pop-amber text-ink"
      : "bg-pop-mint text-ink";
  return (
    <span className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide ${bg}`}>
      ● {status}
    </span>
  );
}

const CRED_BY_NAME: Record<string, { e: string; bg: string; cred: string }> = {
  Jashim: { e: "🛺", bg: "bg-pop-amber", cred: "jashim@teslapool.com / driver123" },
  Nusrat: { e: "🧍", bg: "bg-pop-mint", cred: "nusrat@teslapool.com / passenger123" },
  Rafiq: { e: "🧍", bg: "bg-pop-pink", cred: "rafiq@teslapool.com / passenger123" },
  Shirin: { e: "🧍", bg: "bg-accent", cred: "shirin@teslapool.com / passenger123" },
};

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [zones, setZones] = useState<string[]>(AREAS_FALLBACK);

  // Ticking Dhaka clock.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  // Live snapshot (poll) + zone list.
  useEffect(() => {
    let alive = true;
    async function load() {
      const s = await fetchStats();
      if (alive && s) setStats(s);
      try {
        const a = await api<{ areas: { name: string }[] }>("/api/areas");
        if (alive && a.areas?.length) setZones(a.areas.map((x) => x.name));
      } catch {
        /* offline — keep fallback zones */
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const featured = stats?.featured ?? FEATURED_FALLBACK;
  const rush = isRushHour(now);
  const left = Math.max(0, featured.totalSeats - featured.occupiedSeats);

  const cast: CastCard[] =
    stats && stats.cast.some((c) => c.live)
      ? stats.cast.map((c) => {
          const known = CRED_BY_NAME[c.name] ?? { e: "🧍", bg: "bg-accent", cred: "" };
          const roleLabel = c.role === "driver" ? "driver" : "passenger";
          return {
            e: known.e,
            bg: known.bg,
            who: `${c.name} — ${roleLabel}`,
            cred: known.cred,
            note: c.route ?? "Fresh off the boat — no trips yet.",
            liveStatus: c.status,
          };
        })
      : CAST_FALLBACK;

  return (
    <div className="space-y-14 py-4">
      {/* ---------- 1 · HERO (dynamic badge) ---------- */}
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink bg-white p-6 dark:border-[#FFF7E6] dark:bg-nightcard sm:p-10">
        <Confetti />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div className="animate-pop-in">
            <p className="inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-ink bg-pop-pink px-3 py-1 text-xs font-bold uppercase tracking-widest text-ink">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
              </span>
              {featured.pickupZone} · {dhakaTime(now)} · {rush ? "Rush hour" : "Live"}
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Share a <span className="rounded-2xl bg-pop-amber px-2">seat</span>.
              <br />
              Split the <span className="text-accent dark:text-accent-dark">fare</span>.
              <br />
              Beat the traffic.
            </h1>
            <p className="mt-4 max-w-md text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">
              Nusrat needs Banani → Mohakhali. Rafiq needs Banani → Gulshan 1.
              Jashim&apos;s 3-seat Tesla <strong>Bullet</strong> fits both — the pool
              splits the fare fairly, and everyone sees only their own trip and fare.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-candy">
                🧍 Ride as passenger <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink">→</span>
              </Link>
              <Link href="/signup" className="btn-ghosty">
                🛺 Drive your Tesla
              </Link>
            </div>
            {/* Live network pulse */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border-2 border-ink bg-pop-mint px-3 py-1 dark:border-[#FFF7E6]">
                🟢 {stats ? `${stats.onlineVehicles} Tesla${stats.onlineVehicles === 1 ? "" : "s"} online` : "… Teslas online"}
              </span>
              <span className="rounded-full border-2 border-ink bg-white px-3 py-1 dark:border-[#FFF7E6] dark:bg-night">
                🎟️ {stats ? `${stats.waitingRides} waiting` : "… waiting"}
              </span>
              <span className="rounded-full border-2 border-ink bg-white px-3 py-1 dark:border-[#FFF7E6] dark:bg-night">
                🤝 {stats ? `${stats.activePools} active pools` : "… pools"}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Free demo · Cash or TeslaPay wallet · No real payments
            </p>
          </div>

          {/* ---------- 2 · LIVE TESLA CARD ---------- */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-pop-amber" aria-hidden />
            <div className="dotgrid absolute -bottom-8 -right-4 h-40 w-40 opacity-60" aria-hidden />
            <div className="relative animate-floaty rounded-t-full rounded-b-[2rem] border-2 border-ink bg-pop-mint p-8 pt-14 text-center dark:border-[#FFF7E6]">
              <p className="text-7xl">🛺</p>
              <p className="mt-2 font-display text-2xl font-extrabold">{featured.vehicleName}</p>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                {featured.driverName} · {featured.totalSeats} seats · {featured.isOnline ? "online" : "offline"}
              </p>
              <div className="mx-auto mt-4 flex max-w-[240px] items-center justify-between gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 text-xs font-bold text-ink">
                <span>💺 {featured.occupiedSeats}/{featured.totalSeats} taken</span>
                {featured.isOnline && left > 0 ? (
                  <span className="animate-pulse rounded-full bg-pop-pink px-2 py-0.5">{left} left!</span>
                ) : featured.isOnline ? (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-white">FULL</span>
                ) : (
                  <span className="rounded-full bg-slate-300 px-2 py-0.5">OFFLINE</span>
                )}
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-widest opacity-60">
                {featured.pickupZone} corridor · {stats ? "live" : "demo data"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 3 · MARQUEE ---------- */}
      <Marquee items={zones} />

      {/* ---------- FEATURES ---------- */}
      <section>
        <SectionHead
          kicker="How it works"
          title="Three taps to a shared Tesla"
          sub="No map-app wrestling. Pick zones, grab seats, and let overlapping trips pool automatically."
        />
        <div className="relative mt-8 grid gap-6 pt-6 sm:grid-cols-3">
          {[
            { e: "🎟️", h: "bg-accent", t: "Request in seconds", d: "Pickup + destination zone, seats, Cash or TeslaPay. Instant solo fare estimate, hand-checkable math.", s: "pink" },
            { e: "🤝", h: "bg-pop-pink", t: "Auto-pooling", d: "Compatible trips share one Tesla. Same pickup corridor + capacity enforced — pooled rides save 25%.", s: "amber" },
            { e: "📍", h: "bg-pop-amber", t: "Live lifecycle", d: "Waiting → matched → driver arrived → on trip → done. Full history and receipts afterwards.", s: "mint" },
          ].map((c) => (
            <Card key={c.t} pop shadow={c.s as "pink" | "amber" | "mint"}>
              <IconBadge emoji={c.e} bg={c.h} />
              <p className="font-display text-lg font-extrabold">{c.t}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- FARE MATH ---------- */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card shadow="amber">
          <IconBadge emoji="🧮" bg="bg-pop-mint" />
          <p className="font-display text-lg font-extrabold">Fare math you can check by hand</p>
          <code className="mt-2 block rounded-2xl bg-ink p-3 text-center font-display text-sm font-bold text-pop-amber dark:bg-black">
            fare = ৳60 base + ৳30/km − 25% pool discount
          </code>
          <ul className="mt-3 space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <li>🧍 Nusrat, Banani Rd 11 → Mohakhali ≈ 1.8 km → <strong>≈৳84 pooled</strong></li>
            <li>🧍 Rafiq, Banani → Gulshan 1 ≈ 5.0 km → <strong>≈৳157 pooled</strong></li>
            <li>💰 Money lives as <strong>integer paisa</strong> — floats never touch the ledger.</li>
          </ul>
        </Card>
        <Card shadow="pink">
          <IconBadge emoji="🔒" bg="bg-pop-pink" />
          <p className="font-display text-lg font-extrabold">Capacity is physics, not luck</p>
          <ul className="mt-3 space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <li>💺 Bullet has 3 seats. Occupied seats can <strong>never</strong> exceed capacity.</li>
            <li>⚡ Two riders racing for the last seat? A row-locked transaction lets exactly one win (HTTP 409 for the other).</li>
            <li>👁️ Passengers see <strong>only their own</strong> fare — drivers see the whole pool.</li>
          </ul>
          <Link href="/login" className="btn-ghosty mt-4">See it live →</Link>
        </Card>
      </section>

      {/* ---------- 4 · DEMO CAST (dynamic) ---------- */}
      <section>
        <SectionHead
          kicker="Demo cast"
          title="Meet the 8:41 AM rush"
          sub="Seeded accounts (demo passwords shown). Statuses update live from the API."
        />
        <div className="mt-8 grid gap-6 pt-2 sm:grid-cols-2">
          {cast.map((c) => (
            <Card key={c.who} pop>
              <div className="flex items-start gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink text-2xl ${c.bg} dark:border-[#FFF7E6]`}>{c.e}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-display font-extrabold">
                    {c.who}
                    {c.liveStatus && <LiveDot status={c.liveStatus} />}
                  </p>
                  {c.cred ? (
                    <code className="mt-1 block rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold dark:bg-night">{c.cred}</code>
                  ) : null}
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{c.note}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
