// Central API base URL — driven by VITE_API_URL in .env (falls back to localhost for dev).
export const domainUrl = import.meta.env.VITE_API_URL ?? "/api";

// Shown as a small hint at the bottom of the dashboard sidebars (Admindashboard.tsx,
// SuperAdminDashboard.tsx, StaffDashboard.tsx) — kept in sync with backend/package.json's
// version by hand, since the frontend's own package.json version is never bumped.
export const APP_VERSION = "2.0.0";
