export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  return data as T;
}

export interface SessionUser {
  id: number;
  name: string;
  role: "student" | "company";
  email: string | null;
  subscriptionStatus: "none" | "active";
  subscriptionPlan: string | null;
}

// Wipes everything the browser keeps for this site so one account never sees another's state.
export function clearClientState() {
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage unavailable */ }
  if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}
