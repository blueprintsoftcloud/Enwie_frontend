import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import api, { refreshAccessToken } from "../utils/api";
import socket from "../utils/socket";

// ── Types ──────────────────────────────────────────────────────────────────────
interface AuthUser {
  role: string | null;
  isAuthenticated: boolean;
  isInitialLoad: boolean;
}

interface AuthContextValue {
  user: AuthUser;
  setUser: React.Dispatch<React.SetStateAction<AuthUser>>;
  checkAuthStatus: () => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedLoggedIn = typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true";
  const cachedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

  const [user, setUser] = useState<AuthUser>({
    role: cachedRole,
    isAuthenticated: cachedLoggedIn,
    isInitialLoad: true,
  });

  const checkAuthStatus = async (isInitial: boolean = false) => {
    try {
      const res = await api.get<{ isLoggedIn: boolean; role?: string }>(
        "/auth/status",
        {
          withCredentials: true,
        },
      );

      if (res.data.isLoggedIn) {
        localStorage.setItem("isLoggedIn", "true");
        if (res.data.role) {
          localStorage.setItem("userRole", res.data.role);
        }
        setUser({
          role: res.data.role ?? localStorage.getItem("userRole") ?? null,
          isAuthenticated: true,
          isInitialLoad: isInitial ? true : false,
        });
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        setUser({ role: null, isAuthenticated: false, isInitialLoad: isInitial ? true : false });
      }
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      // Only treat as logged-out on a confirmed auth failure (401/403 after attempted refresh).
      // Network errors (no response) or 5xx server errors are transient — preserve the current
      // session state so a brief backend hiccup doesn't kick the user to the login page.
      if (status === 401 || status === 403) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");
        setUser({ role: null, isAuthenticated: false, isInitialLoad: isInitial ? true : false });
      } else {
        // Transient error (slow network): keep existing cached auth state, just clear isInitialLoad
        setUser((prev) => ({ ...prev, isInitialLoad: isInitial ? true : false }));
      }
    }
  };

  useEffect(() => {
    // On every page load: proactively refresh the access token before checking
    // auth status. This mirrors the tab-visibility flow and ensures the session
    // is always renewed on reload even if the access token has already expired.
    // Skip the refresh call on the login page — there is no valid session there
    // and the call would always fail, producing a noisy network error.
    const isLoginPage = window.location.pathname === "/login";
    const init = async () => {
      const startTime = Date.now();

      let refreshedRole: string | null = null;
      let refreshSucceeded = false;

      if (!isLoginPage && localStorage.getItem("isLoggedIn") === "true") {
        try {
          // eslint-disable-next-line no-console
          console.debug("[AuthContext] initial /auth/refresh (page load)");
          const res = await refreshAccessToken();
          if (res.data.isLoggedIn) {
            refreshedRole = res.data.role ?? localStorage.getItem("userRole") ?? null;
            refreshSucceeded = true;
          }
        } catch {
          // No valid session yet (e.g. fresh visit or fully expired) — fall through.
        }
      }

      if (refreshSucceeded) {
        // Trust the refresh response directly — avoids a /auth/status call that
        // could race with cookie propagation on mobile browsers.
        localStorage.setItem("isLoggedIn", "true");
        if (refreshedRole) {
          localStorage.setItem("userRole", refreshedRole);
        }
        setUser({
          role: refreshedRole ?? localStorage.getItem("userRole") ?? null,
          isAuthenticated: true,
          isInitialLoad: true,  // Will be set to false after the min-duration below
        });
      } else {
        // No refresh was attempted or it failed — fall back to checking status.
        await checkAuthStatus(true);
      }

      // Enforce a minimum 800ms loader playtime to guarantee the PropagateLoader
      // animates fully and gracefully, preventing "flickering" or "stuck" frames.
      const elapsed = Date.now() - startTime;
      const minDuration = 800;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      // Finish loading state to mount the app
      setUser((prev) => ({ ...prev, isInitialLoad: false }));
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async (redirectTo?: string) => {
    // Admins and staff go to /login; customers go to the landing page.
    // If role is null (e.g. force-logout during OTP verification before full auth)
    // we fall back to "/login" so the admin/staff user is never silently dumped at "/".
    const isCustomer = user.role === "CUSTOMER";
    const destination = redirectTo ?? (isCustomer ? "/" : "/login");

    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {
      // Ignore — cookies are cleared server-side even on error
    }

    if (socket.connected) socket.disconnect();

    // Preserve public site branding, templates, themes, SEO, and tracking caches across logouts
    const preservedKeys = [
      "crm_navbar_cache",
      "crm_branding_cache",
      "crm_seo_cache",
      "crm_theme_cache",
      "crm_hero_cache",
      "CACHED_TRACKING_CONFIG",
      "storra_theme_tokens",
    ];
    const preservedData: Record<string, string> = {};
    preservedKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val !== null) preservedData[key] = val;
    });

    // Clear all client-side storage
    localStorage.clear();
    sessionStorage.clear();

    // Restore preserved store layout & template configs immediately
    Object.entries(preservedData).forEach(([key, val]) => {
      localStorage.setItem(key, val);
    });

    setUser({ role: null, isAuthenticated: false, isInitialLoad: false });
    window.location.href = destination;
  };

  // Re-check auth when the tab becomes visible again (user returns from idle / screen wake).
  // We proactively call /auth/refresh first so the access cookie is renewed before any other
  // API request fires. This prevents a burst of simultaneous 401s on wake-up.
  //
  // CRITICAL (mobile tab-switch fix): After a successful /auth/refresh the server
  // invalidates the previous refresh token and issues a new cookie pair. If we
  // immediately call /auth/status, mobile browsers sometimes still attach the OLD
  // jwt cookie (cookie propagation delay) → 401 → the interceptor retries with
  // the OLD refresh cookie → 403 (token mismatch in DB) → force-logout.
  //
  // Solution: the refresh endpoint now returns { isLoggedIn, role } — we set React
  // auth state directly from that response, skipping the redundant /auth/status
  // call entirely. This eliminates the race condition.
  //
  // NOTE: userRef is used here (instead of `user`) because this effect has an empty
  // dependency array — without the ref, `user` would always read the initial stale value.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;

      // If the user is not authenticated (e.g. on the login page waiting for OTP)
      // there is no valid session to refresh. Skip the refresh call entirely —
      // a /auth/refresh attempt here would always fail and show a spurious network
      // request in the browser devtools.
      if (!userRef.current.isAuthenticated) {
        // Still check status in case the user logged in from another tab.
        await checkAuthStatus();
        return;
      }

      try {
        // Attempt a silent refresh. If it succeeds the new access cookie is ready.
        // eslint-disable-next-line no-console
        console.debug(
          "[AuthContext] visibilitychange /auth/refresh (tab became visible)",
        );
        const res = await refreshAccessToken();

        // Trust the refresh response directly — do NOT call /auth/status after
        // this. The new cookies may not have propagated yet on mobile browsers,
        // and a /auth/status call with stale cookies triggers a destructive
        // refresh-token-mismatch cascade → force-logout.
        if (res.data.isLoggedIn) {
          localStorage.setItem("isLoggedIn", "true");
          if (res.data.role) {
            localStorage.setItem("userRole", res.data.role);
          }
          setUser({
            role: res.data.role ?? localStorage.getItem("userRole") ?? null,
            isAuthenticated: true,
            isInitialLoad: false,
          });
        } else {
          // Unexpected: refresh succeeded but isLoggedIn is false.
          // Fall through to a safe status check.
          await checkAuthStatus();
        }
      } catch (err: unknown) {
        // Refresh failed. Only call checkAuthStatus for transient errors (5xx,
        // network issues). For definitive auth rejections (401/403), the api
        // interceptor will have already dispatched auth:force-logout — calling
        // checkAuthStatus here would fire a second /auth/status → another stale
        // cookie 401 → another interceptor refresh with the now-invalidated
        // token → another force-logout event. Avoid the cascade.
        const status = (err as any)?.response?.status;
        if (status !== 401 && status !== 403) {
          await checkAuthStatus();
        }
        // For 401/403: do nothing here — the interceptor already handled it.
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactive silent token refresh — keeps the session alive during long admin work sessions.
  // Runs every 14 minutes so the 16-minute access token (see tokens.ts) never expires while
  // the user is active.
  useEffect(() => {
    if (!user.isAuthenticated) return;
    const id = setInterval(
      async () => {
        try {
          // eslint-disable-next-line no-console
          console.debug("[AuthContext] proactive /auth/refresh (interval)");
          await refreshAccessToken();
        } catch {
          // If the proactive refresh fails the reactive interceptor will handle the next 401.
          // Don't log the user out here — it may be a transient network issue.
        }
      },
      14 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [user.isAuthenticated]);

  // Ref that always holds the latest user state — used by effects with empty
  // dependency arrays (like visibility change) to avoid stale closures.
  const userRef = useRef(user);
  userRef.current = user;

  // When both access + refresh tokens are expired the api interceptor fires this
  // event. We listen here (outside React render) so we can cleanly log out.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    const handler = () => logoutRef.current();
    window.addEventListener("auth:force-logout", handler);
    return () => window.removeEventListener("auth:force-logout", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, checkAuthStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
