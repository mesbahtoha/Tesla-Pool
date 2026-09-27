"use client";

import { ReactNode } from "react";

/* ---------- Status chip (chunky, never color-only: always has a text label) ---------- */
const CHIP_BG: Record<string, string> = {
  REQUESTED: "bg-pop-amber text-ink",
  MATCHED: "bg-sky-300 text-ink",
  DRIVER_ARRIVED: "bg-accent text-white",
  STARTED: "bg-pop-mint text-ink",
  COMPLETED: "bg-pop-mint text-ink",
  CANCELLED: "bg-rose-400 text-white",
  ACTIVE: "bg-pop-mint text-ink",
};

export function Chip({ status }: { status: string }) {
  return (
    <span className={`chip ${CHIP_BG[status] || "bg-slate-200 text-ink"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ---------- Sticker card ---------- */
export function Card({
  children,
  className = "",
  pop = false,
  shadow = "",
}: {
  children: ReactNode;
  className?: string;
  pop?: boolean;
  shadow?: "pink" | "mint" | "amber" | "";
}) {
  const sh = shadow === "pink" ? "card-shadow-pink" : shadow === "mint" ? "card-shadow-mint" : shadow === "amber" ? "card-shadow-amber" : "";
  return <div className={`card-sticker ${pop ? "lift" : ""} ${sh} ${className}`}>{children}</div>;
}

/* ---------- Buttons ---------- */
export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const cls = variant === "primary" ? "btn-candy" : variant === "danger" ? "btn-danger" : "btn-ghosty";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${cls} ${className}`}>
      {children}
    </button>
  );
}

/* ---------- Form bits ---------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-chunky">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "input-chunky";

/* ---------- States ---------- */
export function Empty({ title, hint, emoji = "🛺" }: { title: string; hint?: string; emoji?: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-nightline dark:bg-nightcard/60">
      <p className="text-3xl">{emoji}</p>
      <p className="mt-2 font-display font-bold">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-accent border-t-transparent" />
      Loading…
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-pop-in rounded-2xl border-2 border-ink bg-rose-100 px-4 py-2.5 text-sm font-semibold text-rose-800 dark:border-[#FFF7E6] dark:bg-rose-950 dark:text-rose-200">
      ⚠️ {message}
    </div>
  );
}

/* ---------- Lifecycle stepper ---------- */
export function Stepper({ status }: { status: string }) {
  const steps = ["REQUESTED", "MATCHED", "STARTED", "COMPLETED"];
  const labels: Record<string, string> = {
    REQUESTED: "Waiting",
    MATCHED: "Matched",
    DRIVER_ARRIVED: "Driver here",
    STARTED: "On trip",
    COMPLETED: "Done",
    CANCELLED: "Cancelled",
  };
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Chip status="CANCELLED" />
        <span className="text-slate-500 dark:text-slate-400">This ride was cancelled.</span>
      </div>
    );
  }
  const idx = status === "DRIVER_ARRIVED" ? 2 : steps.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            className={`rounded-full border-2 px-2.5 py-0.5 ${
              i <= idx
                ? "border-ink bg-ink text-white dark:border-[#FFF7E6] dark:bg-[#FFF7E6] dark:text-ink"
                : "border-slate-300 bg-transparent text-slate-400 dark:border-nightline"
            }`}
          >
            {i <= idx ? "● " : "○ "}{labels[s]}
          </span>
          {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
        </li>
      ))}
      {status === "DRIVER_ARRIVED" && <Chip status="DRIVER_ARRIVED" />}
    </ol>
  );
}

/* ---------- Section heading with squiggle underline ---------- */
export function SectionHead({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div>
      {kicker && (
        <p className="inline-block rounded-full border-2 border-ink bg-pop-amber px-3 py-0.5 text-xs font-bold uppercase tracking-widest dark:border-[#FFF7E6]">
          {kicker}
        </p>
      )}
      <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      <svg viewBox="0 0 220 12" className="mt-1 h-3 w-40 text-pop-pink" fill="none" aria-hidden>
        <path d="M2 8 Q 12 2, 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 122 8 T 142 8 T 162 8 T 182 8 T 202 8 T 222 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {sub && <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

/* ---------- Floating geometric confetti ---------- */
export function Confetti({ density = "md" }: { density?: "sm" | "md" }) {
  const shapes = [
    "left-[4%] top-[8%] h-10 w-10 rounded-full bg-pop-pink",
    "right-[6%] top-[12%] h-8 w-8 rotate-12 bg-pop-amber",
    "left-[10%] bottom-[10%] h-0 w-0 border-x-[14px] border-b-[24px] border-x-transparent border-b-pop-mint",
    "right-[10%] bottom-[16%] h-12 w-6 rounded-full bg-accent",
  ];
  const list = density === "sm" ? shapes.slice(0, 2) : shapes;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {list.map((c, i) => (
        <span key={i} className={`absolute animate-floaty ${c}`} style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </div>
  );
}

/* ---------- Marquee strip: seamless right-to-left loop ----------
   Two identical halves; the track shifts exactly -50%, so the seam is
   invisible. Each half is repeated enough to overflow any viewport. */
export function Marquee({ items }: { items: string[] }) {
  const half = [...items, ...items, ...items];
  const Half = ({ hidden }: { hidden?: boolean }) => (
    <div className="flex shrink-0 items-center gap-6 pr-6 sm:gap-8 sm:pr-8" aria-hidden={hidden}>
      {half.map((t, i) => (
        <span key={i} className="flex items-center gap-6 sm:gap-8">
          <span>{t}</span>
          <span className="text-pop-amber">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="-mx-4 overflow-hidden border-y-2 border-ink bg-ink py-2.5 text-cream sm:-mx-6 sm:rounded-full sm:border-2 sm:py-3 dark:border-[#FFF7E6] dark:bg-[#FFF7E6] dark:text-ink">
      <div className="marquee-track font-display text-xs font-bold uppercase tracking-widest sm:text-sm">
        <Half />
        <Half hidden />
      </div>
    </div>
  );
}

/* ---------- Floating icon badge (half-in/half-out card icon) ---------- */
export function IconBadge({ emoji, bg = "bg-pop-amber" }: { emoji: string; bg?: string }) {
  return (
    <div className={`-mt-10 mb-2 grid h-14 w-14 place-items-center rounded-full border-2 border-ink text-2xl ${bg} transition-transform hover:animate-wiggle dark:border-[#FFF7E6]`}>
      {emoji}
    </div>
  );
}
