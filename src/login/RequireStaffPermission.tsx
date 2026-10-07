import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStaffPermissions, type StaffPermission } from "../context/StaffPermissionContext";

interface RequireStaffPermissionProps {
  children: ReactNode;
  /** Page renders if the user has ANY one of these permissions. ADMIN/SUPER_ADMIN
   * always pass — useStaffPermissions().hasPermission() is a no-op true for them. */
  anyOf: StaffPermission[];
}

/**
 * Route guard for pages nested under /staff-dashboard that require a specific
 * permission just to view — as opposed to pages that render for every staff member
 * but hide individual add/edit/delete actions per-permission (see Listcategory.tsx's
 * canAdd/canEdit/canDelete pattern). Must be rendered inside <StaffPermissionProvider>.
 *
 * A staff member who navigates directly to a page they don't have permission for
 * (the sidebar already hides the link, but a direct URL visit isn't blocked by that)
 * is sent back to the staff dashboard home instead of seeing a broken/empty page.
 */
const RequireStaffPermission = ({ children, anyOf }: RequireStaffPermissionProps) => {
  const { hasPermission, loading } = useStaffPermissions();

  // Permissions haven't loaded yet — wait rather than judging on an empty list.
  if (loading) return null;

  if (!anyOf.some((perm) => hasPermission(perm))) {
    return <Navigate to="/staff-dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequireStaffPermission;
