import { ReactNode } from "react";

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    REQUESTED: "bg-amber-100 text-amber-800",
    MATCHED: "bg-sky-100 text-sky-800",
    DRIVER_ARRIVED: "bg-violet-100 text-violet-800",
    STARTED: "bg-indigo-100 text-indigo-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

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
  const styles =
    variant === "primary"
      ? "bg-tesla-600 text-white hover:bg-tesla-700"
      : variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-700"
        : "bg-slate-100 text-slate-800 hover:bg-slate-200";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-tesla-600 focus:ring-2 focus:ring-tesla-100";

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
}

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
        <Badge status="CANCELLED" />
        <span className="text-slate-500">This ride was cancelled.</span>
      </div>
    );
  }
  const idx = status === "DRIVER_ARRIVED" ? 2 : steps.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              i <= idx ? "bg-tesla-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {labels[s]}
          </span>
          {i < steps.length - 1 && <span className="text-slate-300">→</span>}
        </li>
      ))}
      {status === "DRIVER_ARRIVED" && <Badge status="DRIVER_ARRIVED" />}
    </ol>
  );
}
