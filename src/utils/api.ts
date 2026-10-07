import axios from "axios";
import { domainUrl } from "./constant";
import { getCsrfToken } from "./csrf";

const api = axios.create({
  baseURL: domainUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Echo the double-submit CSRF cookie back as a header on every request — the backend
// only checks it for authenticated, state-changing requests, but attaching it
// unconditionally is harmless and one less thing to get wrong per call site.
api.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) config.headers["X-CSRF-Token"] = token;
  return config;
});

// ── Shared refresh coordinator ─────────────────────────────────────────────────
// A single in-flight /auth/refresh call is shared by every caller in THIS tab: the
// 401 interceptor below, AuthContext's proactive triggers (initial page load,
// tab-visibility, periodic interval), and the post-login refresh in useLoginFlow.ts.
// That alone isn't enough, though — confirmed live via a real incident (three
// "Refresh token reuse detected" server-side revocations in 24h, two of them 12ms
// apart): a SEPARATE tab of the same admin session has its own JS module state, so
// its refresh call races this tab's regardless of the per-tab guard below. The
// backend's rotation logic (auth.controller.ts's refreshTokens) treats whichever
// request arrives second as a replayed/stolen token — since the first already
// rotated it — and revokes the entire session family, logging every tab out well
// before the refresh token's real 7-day expiry.
//
// navigator.locks (Web Locks API) is a same-origin, cross-TAB mutex built for
// exactly this — every tab's refresh attempt serializes through the same named
// lock, so only one network call is ever in flight across the whole browser at a
// time. Cookies are shared across tabs, so a tab that acquires the lock second
// simply sees the already-rotated cookie and rotates again cleanly — no reuse
// false-positive. Falls back to the per-tab-only guard on browsers without it
// (Safari <15.4 etc.) rather than breaking outright.
let refreshPromise: ReturnType<typeof api.post> | null = null;
let lastRefreshTime = 0;

const doRefresh = () =>
  api
    .post("/auth/refresh")
    .then((res) => {
      lastRefreshTime = Date.now();
      if (res.data?.role) {
        localStorage.setItem("userRole", res.data.role);
      }
      return res;
    })
    .finally(() => {
      refreshPromise = null;
    });

export const refreshAccessToken = () => {
  // If a refresh succeeded in the last 2.5s, cookies are already fresh in the browser.
  // Resolve immediately so queued/trailing 401s retry against the new session cookie.
  if (Date.now() - lastRefreshTime < 2500) {
    return Promise.resolve({ data: { isLoggedIn: true, role: localStorage.getItem("userRole") } } as any);
  }

  if (refreshPromise) return refreshPromise;

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    refreshPromise = navigator.locks.request("storra-auth-refresh", () => doRefresh());
  } else {
    refreshPromise = doRefresh();
  }
  return refreshPromise;
};

// Automatic token-refresh interceptor.
// On a 401, silently call /auth/refresh then retry the original request once.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh retry for auth endpoints that are intentionally unauthenticated
    // (login, OTP verify, forgot-password, etc.). A 401 from those means the
    // credentials/OTP are wrong — not an expired session — so we must NOT trigger
    // a refresh cycle (which would fire auth:force-logout and redirect to "/").
    const AUTH_NO_RETRY_URLS = [
      "/auth/refresh",
      "/auth/login",
      "/auth/login/verify",
      "/auth/mobile/login",
      "/auth/mobile/register",
      "/auth/forgot-password",
      "/auth/verify-reset-otp",
      "/auth/reset-password",
      "/auth/resend-otp",
    ];
    const skipRefresh = AUTH_NO_RETRY_URLS.some((u) =>
      originalRequest.url?.includes(u),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !skipRefresh
    ) {
      originalRequest._retry = true;

      try {
        // Debug log to trace why/when refresh is triggered
        // (helps diagnose unexpected periodic refresh calls)
        // eslint-disable-next-line no-console
        console.debug("[api] attempting /auth/refresh due to 401 interceptor", {
          url: originalRequest.url,
          method: originalRequest.method,
        });
        // Shared with AuthContext's proactive refresh triggers — see refreshAccessToken above.
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError: unknown) {
        // Only force-logout on a real auth rejection from the server (401/403).
        // Network errors (no response) are transient — don't log the user out.
        const status = (refreshError as any)?.response?.status;
        if (status === 401 || status === 403) {
          // eslint-disable-next-line no-console
          console.debug("[api] refresh failed with status, dispatching auth:force-logout", {
            status,
            url: originalRequest.url,
            method: originalRequest.method,
            message: (refreshError as any)?.response?.data?.message,
          });
          window.dispatchEvent(new CustomEvent("auth:force-logout"));
        }
        return Promise.reject(refreshError);
      }
    }

    // 429 Too Many Requests — wait then retry once
    if (error.response?.status === 429 && !originalRequest._retry429) {
      originalRequest._retry429 = true;
      const retryAfterMs =
        parseInt(error.response.headers["retry-after"] ?? "2", 10) * 1000 ||
        2000;
      await new Promise((res) => setTimeout(res, retryAfterMs));
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);

// ── Feature-gate 403 interceptor ───────────────────────────────────────────
// When the server returns 403 with a `feature` key, it means the tenant's plan
// does not include that feature. Dispatch a custom event so the app can redirect
// the user to the billing/upgrade page without coupling this module to React Router.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.feature) {
      window.dispatchEvent(
        new CustomEvent("billing:feature-gate", {
          detail: {
            feature: error.response.data.feature as string,
            message: error.response.data.message as string,
          },
        }),
      );
    }
    return Promise.reject(error);
  },
);

export default api;
