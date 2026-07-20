import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

import { auth } from "@/lib/firebase";

// ---------------------------------------------------------------------------
// Boot-time env assertion — dev builds must know exactly which backends to
// talk to. Fallback to localhost so a fresh clone works out of the box.
// ---------------------------------------------------------------------------

const readUrl = (name: string, fallback: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  if (!value || value.trim().length === 0) {
    if (import.meta.env.DEV) return fallback;
    // eslint-disable-next-line no-console
    console.warn(`[apiClient] Missing ${name}; falling back to ${fallback}`);
    return fallback;
  }
  return value.replace(/\/+$/, "");
};

const BAP_URL = readUrl("VITE_BAP_URL", "http://localhost:8001");
const BPP_URL = readUrl("VITE_BACKEND_URL", "http://localhost:3002");
const PAYMENT_URL = readUrl("VITE_PAYMENT_URL", "http://localhost:8003");

// ---------------------------------------------------------------------------
// Auth-refresh dedupe. If N in-flight requests get 401 at once, we want to
// refresh the ID token exactly once and let all of them retry with the new
// value instead of each triggering its own refresh.
// ---------------------------------------------------------------------------

let inflightRefresh: Promise<string | null> | null = null;

const refreshIdToken = async (): Promise<string | null> => {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken(true);
    } catch {
      return null;
    } finally {
      // Free the slot on the next tick so simultaneous retries still see it
      // as pending, but a genuinely fresh 401 later kicks off a new refresh.
      setTimeout(() => {
        inflightRefresh = null;
      }, 0);
    }
  })();
  return inflightRefresh;
};

// ---------------------------------------------------------------------------
// Toast throttle. A dead backend can throw the same 5xx 30 times in a second
// (e.g. one per column of a grid). Throttle by (status, url).
// ---------------------------------------------------------------------------

const recentToasts = new Map<string, number>();
const shouldToast = (key: string, windowMs = 4000): boolean => {
  const now = Date.now();
  const last = recentToasts.get(key) ?? 0;
  if (now - last < windowMs) return false;
  recentToasts.set(key, now);
  return true;
};

// ---------------------------------------------------------------------------
// Offline detector — sonner tells the operator we're reconnecting; suppressed
// while online so 5xx toasts aren't drowned out.
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    toast.error("You're offline", {
      id: "offline",
      description: "Reconnecting…",
    });
  });
  window.addEventListener("online", () => {
    toast.dismiss("offline");
    toast.success("Back online", { duration: 2000 });
  });
}

// ---------------------------------------------------------------------------
// Client builder
// ---------------------------------------------------------------------------

interface RetriableConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

const buildClient = (baseURL: string, label: string): AxiosInstance => {
  const client = axios.create({ baseURL, timeout: 20_000 });

  // ---- Request: attach Firebase Bearer token ----------------------------
  client.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ---- Response: 401 refresh, 403 redirect, 5xx toast -------------------
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      // Cancellations are not errors — bubble silently so react-query stops.
      if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
        return Promise.reject(error);
      }

      // 401 → refresh once, retry once.
      if (status === 401 && config && !config._retriedAfterRefresh) {
        const fresh = await refreshIdToken();
        if (fresh) {
          config._retriedAfterRefresh = true;
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Bearer ${fresh}`;
          return client.request(config);
        }
      }

      // 403 → not admin (anymore). Bounce to /unauthorized without spamming.
      if (status === 403 && typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path !== "/unauthorized" && path !== "/login") {
          window.location.assign("/unauthorized");
        }
      }

      // 5xx → surface to the operator once per (status+url) per 4s.
      if (status && status >= 500) {
        const key = `${status}:${config?.url ?? label}`;
        if (shouldToast(key)) {
          const detail =
            (error.response?.data as { detail?: unknown } | undefined)?.detail;
          toast.error(`${label} error (${status})`, {
            description:
              typeof detail === "string" ? detail : error.message,
          });
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const bpp = buildClient(BPP_URL, "seller");
export const bap = buildClient(BAP_URL, "buyer");
export const payments = buildClient(PAYMENT_URL, "payments");

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface ApiErrorShape {
  message: string;
  status?: number;
}

export const toApiError = (error: unknown, fallback: string): ApiErrorShape => {
  if (axios.isCancel(error)) return { message: "cancelled" };
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)
      ?.detail;
    const message =
      (typeof detail === "string" && detail) || error.message || fallback;
    return { message, status: error.response?.status };
  }
  return { message: error instanceof Error ? error.message : fallback };
};

export const request = async <T>(
  client: AxiosInstance,
  config: AxiosRequestConfig
): Promise<T> => {
  const response = await client.request<T>(config);
  return response.data;
};
