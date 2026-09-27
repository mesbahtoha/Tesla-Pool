const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tesla_token");
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const token = opts.token !== undefined ? opts.token : getToken();
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error || `Request failed (${res.status})`);
  return json as T;
}

// Product rule (mirrors backend Zod refine): email must contain "@" and ".com".
export function validEmail(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".com");
}

export function fareBDT(paisa: number | null | undefined): string {
  if (paisa === null || paisa === undefined) return "—";
  return `৳${(paisa / 100).toFixed(2)}`;
}

export interface CastMember {
  name: string;
  role: "driver" | "passenger" | null;
  route: string | null;
  status: string | null;
  live: boolean;
}

export interface FeaturedPool {
  vehicleName: string;
  driverName: string;
  pickupZone: string;
  occupiedSeats: number;
  totalSeats: number;
  poolStatus: string;
  isOnline: boolean;
}

export interface PublicStats {
  onlineVehicles: number;
  waitingRides: number;
  activePools: number;
  completedTrips: number;
  featured: FeaturedPool | null;
  cast: CastMember[];
}

// Public snapshot for the homepage. Never throws — returns null offline.
export async function fetchStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API}/api/stats`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}

// Dhaka local time, tickingClock-friendly ("08:41 AM").
export function dhakaTime(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now).toUpperCase();
}

// Rush windows in Dhaka local time: 8–10 AM + 5–8 PM.
export function isRushHour(now: Date): boolean {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }).format(now)
  );
  return (h >= 8 && h < 10) || (h >= 17 && h < 20);
}

export const AREAS_FALLBACK = [
  "Banani",
  "Banani Road 11",
  "Mohakhali",
  "Gulshan 1",
  "Gulshan 2",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Farmgate",
  "Bashundhara",
  "Baridhara",
  "Badda",
];
