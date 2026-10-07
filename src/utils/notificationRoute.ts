// src/utils/notificationRoute.ts
// Where clicking a notification should actually go — shared by NotificationBell.tsx
// (dropdown) and NotificationManagement.tsx (full page) so both route identically.
//
// Every notification type maps to the page it's actually about, not just the generic
// notifications list:
//   - Order-related (NEW_ORDER/ORDER_UPDATE/PAYMENT_SUCCESS/PAYMENT_FAILED) → Order
//     Management, deep-linked via ?orderId= so that order's own detail drawer opens
//     automatically instead of landing on the bare list (see AdminOrderManagement.tsx's
//     own effect that reads this param).
//   - LOW_STOCK → Catalog Management. There's no productId on a LOW_STOCK notification
//     (see backend/src/models/mongoose.ts's INotification) to deep-link further.
//   - GENERAL (exclusively system-health alerts — see healthMonitor.ts, the only
//     sender of this type) → System Monitoring, which only exists under the
//     super-admin dashboard; falls back to the notifications list for admin/staff.
//   - Anything else (or an order-typed notification missing its order, e.g. deleted) →
//     the notifications list itself, same as before this existed.

interface RoutableNotification {
  type?: string;
  order?: { id?: string } | null;
}

const ORDER_TYPES = new Set(["NEW_ORDER", "ORDER_UPDATE", "PAYMENT_SUCCESS", "PAYMENT_FAILED"]);

export function getNotificationTarget(n: RoutableNotification, dashboardPath: string): string {
  if (n.order?.id && ORDER_TYPES.has(n.type ?? "")) {
    return `${dashboardPath}/order-management?orderId=${n.order.id}`;
  }
  if (n.type === "LOW_STOCK") {
    return `${dashboardPath}/manage-catalog`;
  }
  if (n.type === "GENERAL" && dashboardPath === "/super-admin-dashboard") {
    return `${dashboardPath}/monitoring`;
  }
  return `${dashboardPath}/notifications`;
}

// Customer-side equivalent — every notification a customer ever receives is about one
// of their own orders (see order.controller.ts's notifyUsers calls), so there's no
// per-type branching to do here, just the deep-link vs. plain-list fallback (see
// MyOrdersPage.tsx's own effect that reads ?orderId= to scroll/highlight the match).
export function getCustomerNotificationTarget(n: RoutableNotification): string {
  return n.order?.id ? `/myorders?orderId=${n.order.id}` : "/myorders";
}
