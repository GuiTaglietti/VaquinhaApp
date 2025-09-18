import axios from "axios";
import { toast } from "react-hot-toast";

/* ----------------- Helpers de token/JWT ----------------- */
const ACCESS_KEYS = (
  (import.meta.env.VITE_AUTH_TOKEN_KEYS as string) ||
  "access,accessToken,access_token,jwt,token"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const REFRESH_KEYS = (
  (import.meta.env.VITE_AUTH_REFRESH_KEYS as string) ||
  "refresh,refreshToken,refresh_token"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function getFromStores(keys: string[]): string | null {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const raw = store.getItem(key);
      if (raw) return raw;
    }
  }
  return null;
}

function setAccessEverywhere(token: string) {
  // salva em chaves comuns pra manter compat com outras partes (ExplorePage, etc.)
  localStorage.setItem("access_token", token);
  localStorage.setItem("access", token);
}

function extractBearer(raw: string): string {
  const t = raw.trim();
  if (/^Bearer\s+/i.test(t)) return t.replace(/^Bearer\s+/i, "").trim();
  try {
    const obj = JSON.parse(t);
    if (typeof obj?.access === "string") return obj.access;
    if (typeof obj?.access_token === "string") return obj.access_token;
    if (typeof obj?.token === "string") return obj.token;
  } catch {
    /* not JSON */
  }
  return t;
}

function parseJwtPayload(token: string): any | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(payload)));
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const p = parseJwtPayload(token);
  if (!p || typeof p.exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return p.exp > now + 30; // margem de 30s
}

function clearAllTokens() {
  for (const store of [localStorage, sessionStorage]) {
    for (const k of [...ACCESS_KEYS, ...REFRESH_KEYS, "access_token"]) {
      store.removeItem(k);
    }
  }
}

function isPublicRoute(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/explore") ||
    path.startsWith("/p/") ||
    path.startsWith("/a/") ||
    path.startsWith("/auth/")
  );
}

function redirectToLogin(reason = "expired") {
  const returnTo = encodeURIComponent(
    window.location.pathname + window.location.search + window.location.hash
  );
  clearAllTokens();
  window.location.replace(`/auth/login?reason=${reason}&returnTo=${returnTo}`);
}

/* ----------------- Axios instance ----------------- */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5055/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ----------------- Refresh (single-flight) ----------------- */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;

  refreshPromise = (async () => {
    const stored = getFromStores(REFRESH_KEYS);
    if (!stored) return null;

    const refresh = extractBearer(stored);
    try {
      const resp = await axios.post(
        `${
          import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api`
            : "http://localhost:5055/api"
        }/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refresh}` } }
      );
      const next =
        resp.data?.access ||
        resp.data?.access_token ||
        resp.data?.token ||
        null;

      if (next) setAccessEverywhere(next);
      return next;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ----------------- Interceptors ----------------- */
// Request: anexa Authorization; se access estiver vencido, tenta refresh/derruba.
api.interceptors.request.use(
  async (config) => {
    const raw = getFromStores(ACCESS_KEYS);
    let access = raw ? extractBearer(raw) : null;

    if (!access || !isTokenValid(access)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        if (!isPublicRoute(window.location.pathname)) {
          redirectToLogin("expired");
          throw new axios.Cancel("JWT expired");
        }
        // Sem access válido em rota pública: segue sem Authorization
        return config;
      }
      access = refreshed;
    }

    config.headers = config.headers || {};
    if (!config.headers["Authorization"]) {
      (config.headers as any).Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: para 401 em rotas protegidas, tenta refresh uma vez; se falhar, login.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status;
    const hadAuth = Boolean(original.headers?.Authorization);
    const publicRoute = isPublicRoute(window.location.pathname);

    if (status === 401 && hadAuth && !original._retry) {
      original._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        (original.headers as any).Authorization = `Bearer ${refreshed}`;
        return api(original);
      }
      if (!publicRoute) {
        redirectToLogin("unauthorized");
        return; // interrompe a cadeia
      }
    }

    // Toaster: não spammar 401 em públicas
    if (status !== 401 || !publicRoute) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Erro inesperado. Tente novamente.";
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;
