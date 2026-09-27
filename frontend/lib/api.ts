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
