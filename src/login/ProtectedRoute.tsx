import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If provided, also checks that the user's role matches one of these values (case-insensitive). */
  requiredRoles?: string[];
  /**
   * Where to redirect when the user IS authenticated but has the wrong role.
   * If not specified, automatically redirects to the user's appropriate role dashboard.
   */
  redirectTo?: string;
  /**
   * Where to redirect when the user is NOT authenticated (never logged in, or the
   * session expired before this page loaded — e.g. a direct visit/refresh with a
   * dead token, which never goes through AuthContext's logout()). Defaults to
   * "/login" for admin/staff/shared routes; customer-only routes pass "/" so an
   * expired customer session lands back on the storefront, not the admin login form.
   */
  unauthenticatedRedirectTo?: string;
}

const getRoleHome = (role?: string | null): string => {
  const normalized = role?.toUpperCase();
  if (normalized === "SUPER_ADMIN") return "/super-admin-dashboard";
  if (normalized === "ADMIN") return "/admin-dashboard";
  if (normalized === "STAFF") return "/staff-dashboard";
  return "/";
};

const ProtectedRoute = ({
  children,
  requiredRoles,
  redirectTo,
  unauthenticatedRedirectTo = "/login",
}: ProtectedRouteProps) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.isInitialLoad) return null;

  if (!user.isAuthenticated) {
    if (location.pathname === unauthenticatedRedirectTo) return null;
    return <Navigate to={unauthenticatedRedirectTo} replace />;
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    (!user.role ||
      !requiredRoles
        .map((r) => r.toUpperCase())
        .includes(user.role.toUpperCase()))
  ) {
    const target = redirectTo || getRoleHome(user.role);
    // Never redirect to the current pathname (prevents infinite loop)
    if (location.pathname === target) return null;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
