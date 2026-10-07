// src/context/StaffPermissionContext.tsx
// Fetches staff permissions from the backend when the authenticated user is STAFF.
// Provides `hasPermission(perm)` and `permissions[]` to the admin dashboard.
// For ADMIN / SUPER_ADMIN the context is a no-op (all permissions treated as true).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

// ── Permission constants (mirrors backend src/config/staffPermissions.ts) ──
export type StaffPermission =
  | "CATEGORY_VIEW"
  | "CATEGORY_ADD"
  | "CATEGORY_EDIT"
  | "CATEGORY_DELETE"
  | "PRODUCT_VIEW"
  | "PRODUCT_ADD"
  | "PRODUCT_EDIT"
  | "PRODUCT_DELETE"
  | "ORDER_VIEW"
  | "ORDER_UPDATE"
  | "COUPON_VIEW"
  | "COUPON_ADD"
  | "COUPON_EDIT"
  | "COUPON_DELETE"
  | "ANALYTICS_VIEW"
  | "BANNER_VIEW"
  | "BANNER_ADD"
  | "BANNER_EDIT"
  | "BANNER_DELETE"
  | "SETTINGS_VIEW"
  | "SETTINGS_EDIT"
  | "PAYMENT_VIEW"
  | "CUSTOMER_ACTIVITY_VIEW";

export const PERMISSION_GROUPS = [
  {
    label: "Category Management",
    permissions: [
      { key: "CATEGORY_VIEW" as StaffPermission, label: "View / List Categories" },
      { key: "CATEGORY_ADD" as StaffPermission, label: "Add Category" },
      { key: "CATEGORY_EDIT" as StaffPermission, label: "Edit Category" },
      { key: "CATEGORY_DELETE" as StaffPermission, label: "Delete Category" },
    ],
  },
  {
    label: "Product Management",
    permissions: [
      { key: "PRODUCT_VIEW" as StaffPermission, label: "View / List Products" },
      { key: "PRODUCT_ADD" as StaffPermission, label: "Add Product" },
      { key: "PRODUCT_EDIT" as StaffPermission, label: "Edit Product" },
      { key: "PRODUCT_DELETE" as StaffPermission, label: "Delete Product" },
    ],
  },
  {
    label: "Order Management",
    permissions: [
      { key: "ORDER_VIEW" as StaffPermission, label: "View Orders" },
      { key: "ORDER_UPDATE" as StaffPermission, label: "Update Order Status" },
    ],
  },
  {
    label: "Coupon Management",
    permissions: [
      { key: "COUPON_VIEW" as StaffPermission, label: "View / List Coupons" },
      { key: "COUPON_ADD" as StaffPermission, label: "Add Coupon" },
      { key: "COUPON_EDIT" as StaffPermission, label: "Edit / Toggle Coupon" },
      { key: "COUPON_DELETE" as StaffPermission, label: "Delete Coupon" },
    ],
  },
  {
    label: "Reports & Analytics",
    permissions: [
      { key: "ANALYTICS_VIEW" as StaffPermission, label: "View Reports & Analytics" },
    ],
  },
  {
    label: "Homepage Manager",
    permissions: [
      { key: "BANNER_VIEW" as StaffPermission, label: "View Banners / Homepage Config" },
      { key: "BANNER_ADD" as StaffPermission, label: "Add Banner" },
      { key: "BANNER_EDIT" as StaffPermission, label: "Edit Banner / Headers / Hero / Footer" },
      { key: "BANNER_DELETE" as StaffPermission, label: "Delete Banner" },
    ],
  },
  {
    label: "Warehouse & Shipping Settings",
    permissions: [
      { key: "SETTINGS_VIEW" as StaffPermission, label: "View Warehouse & Shipping Settings" },
      { key: "SETTINGS_EDIT" as StaffPermission, label: "Edit Warehouse & Shipping Settings" },
    ],
  },
  {
    label: "Payments",
    permissions: [
      { key: "PAYMENT_VIEW" as StaffPermission, label: "View Payment Transaction Logs" },
    ],
  },
  {
    label: "Customer Activity",
    permissions: [
      { key: "CUSTOMER_ACTIVITY_VIEW" as StaffPermission, label: "View Customer Activity Tracker" },
    ],
  },
] as const;

// ── Context types ────────────────────────────────────────────────────────────
interface StaffPermissionContextValue {
  permissions: StaffPermission[];
  username: string;
  hasPermission: (perm: StaffPermission) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StaffPermissionContext = createContext<StaffPermissionContextValue | undefined>(
  undefined,
);

export const useStaffPermissions = (): StaffPermissionContextValue => {
  const ctx = useContext(StaffPermissionContext);
  if (!ctx) throw new Error("useStaffPermissions must be used inside <StaffPermissionProvider>");
  return ctx;
};

// ── Provider ─────────────────────────────────────────────────────────────────
export const StaffPermissionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [username, setUsername] = useState("");
  // Starts true (not false) so route guards that gate on permissions (see
  // RequireStaffPermission) never see a false "loading is done, nothing granted yet"
  // state on the very first render, before the effect below has even run once.
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user.isAuthenticated || user.role !== "STAFF") {
      setPermissions([]);
      setUsername("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ permissions: StaffPermission[]; username: string }>("/staff/profile");
      setPermissions(res.data.permissions ?? []);
      setUsername(res.data.username ?? "");
    } catch {
      setPermissions([]);
      setUsername("");
    } finally {
      setLoading(false);
    }
  }, [user.isAuthenticated, user.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // For ADMIN / SUPER_ADMIN every permission check returns true
  const hasPermission = (perm: StaffPermission): boolean => {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
    return permissions.includes(perm);
  };

  return (
    <StaffPermissionContext.Provider value={{ permissions, username, hasPermission, loading, refresh }}>
      {children}
    </StaffPermissionContext.Provider>
  );
};
