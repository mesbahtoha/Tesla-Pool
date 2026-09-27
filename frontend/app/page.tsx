import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-tesla-100">
          Banani · 8:41 AM · rush hour
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
          Share a seat. Split the fare. Survive Dhaka traffic.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
          Nusrat needs Banani → Mohakhali. Rafiq needs Banani → Gulshan 1.
          Jashim&apos;s 3-seat Tesla <em>Bullet</em> fits both — the pool splits
          the fare fairly, and everyone sees their own trip, fare and status.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/signup" className="rounded-xl bg-tesla-500 px-4 py-2 text-sm font-bold text-white hover:bg-tesla-600">
            Ride as passenger
          </Link>
          <Link href="/signup" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
            Drive your Tesla
          </Link>
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">
            Log in →
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { t: "Request in seconds", d: "Pick a pickup + destination zone, seats, Cash or TeslaPay wallet. Instant solo fare estimate." },
          { t: "Auto-pooling", d: "Compatible trips share one Tesla (same pickup corridor, capacity never exceeded). Pooled rides save 25%." },
          { t: "Live lifecycle", d: "Waiting → matched → driver arrived → on trip → completed. Full history + receipts afterwards." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-slate-600">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-bold">Try the live demo cast</h2>
        <p className="mt-1 text-sm text-slate-600">
          Seeded accounts (passwords shown — demo only):
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <code className="rounded-xl bg-slate-50 p-3">🛺 jashim@teslapool.test / driver123 <span className="text-slate-500">(Bullet · online)</span></code>
          <code className="rounded-xl bg-slate-50 p-3">🧍 nusrat@teslapool.test / passenger123 <span className="text-slate-500">(pooled w/ Rafiq)</span></code>
          <code className="rounded-xl bg-slate-50 p-3">🧍 rafiq@teslapool.test / passenger123 <span className="text-slate-500">(pooled w/ Nusrat)</span></code>
          <code className="rounded-xl bg-slate-50 p-3">🧍 shirin@teslapool.test / passenger123 <span className="text-slate-500">(waiting · 1 seat left)</span></code>
        </div>
      </section>
    </div>
  );
}
