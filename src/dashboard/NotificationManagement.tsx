import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { getNotificationTarget } from "../utils/notificationRoute";

interface Notification {
  id: string;
  _id?: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  triggeredBy?: { id: string; username: string; email: string } | null;
  order?: { id: string; finalAmount: number; orderStatus: string } | null;
}

type FilterType = "all" | "unread" | "read";

const typeLabel: Record<string, string> = {
  ORDER_PLACED: "Order Placed",
  ORDER_CONFIRMED: "Order Confirmed",
  ORDER_SHIPPED: "Order Shipped",
  ORDER_DELIVERED: "Order Delivered",
  ORDER_CANCELLED: "Order Cancelled",
  PAYMENT_RECEIVED: "Payment Received",
};

const typeBadge: Record<string, string> = {
  ORDER_PLACED: "bg-blue-100 text-blue-700",
  ORDER_CONFIRMED: "bg-purple-100 text-purple-700",
  ORDER_SHIPPED: "bg-yellow-100 text-yellow-700",
  ORDER_DELIVERED: "bg-green-100 text-green-700",
  ORDER_CANCELLED: "bg-red-100 text-red-700",
  PAYMENT_RECEIVED: "bg-emerald-100 text-emerald-700",
};

export default function NotificationManagement() {
  const navigate = useNavigate();
  // This page's own route is always `${dashboardPath}/notifications` (see
  // AppRoutes.tsx) — deriving dashboardPath from the current URL instead of the
  // user's role means it works identically for admin/super-admin/staff with no
  // per-role branching to keep in sync.
  const { pathname } = useLocation();
  const dashboardPath = pathname.replace(/\/notifications\/?$/, "");

  // Use shared context so that actions here immediately update the bell badge count
  const {
    notifications: allNotifications,
    markAsRead: ctxMarkAsRead,
    markAllRead: ctxMarkAllRead,
    deleteNotification: ctxDeleteNotification,
    clearAllNotifications: ctxClearAllNotifications,
  } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("all");
  const [clearing, setClearing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  useBodyScrollLock(showConfirmModal);

  // Cast context notifications to local Notification type (shapes are compatible)
  const notifications = allNotifications as unknown as Notification[];

  const markRead = async (id: string) => {
    try {
      await ctxMarkAsRead(id);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await ctxMarkAllRead();
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleRowClick = (n: Notification) => {
    const id = n.id ?? n._id ?? "";
    if (!n.isRead && id) markRead(id);
    navigate(getNotificationTarget(n, dashboardPath));
  };

  const deleteOne = async (id: string) => {
    try {
      await ctxDeleteNotification(id);
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleConfirmClearAll = async () => {
    setShowConfirmModal(false);
    setClearing(true);
    try {
      await ctxClearAllNotifications();
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    } finally {
      setClearing(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="px-8 py-8 w-full bg-slate-50/50 min-h-screen">
      {/* Premium Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div>
          
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                {unreadCount} Actions Pending Review
              </span>
            ) : (
              <span className="text-gray-400 ">All caught up</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition shadow-sm"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={clearing || notifications.length === 0}
            className="text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 transition disabled:opacity-40 shadow-sm"
          >
            {clearing ? "Clearing…" : "Clear all"}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
          {(["all", "unread", "read"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
                filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {filter === "unread" ? "No unread notifications" : "No notifications"}
          </div>
        ) : (
          filtered.map((n) => {
            const id = n.id ?? n._id ?? "";
            return (
              <div
                key={id}
                onClick={() => handleRowClick(n)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer hover:shadow-sm hover:border-indigo-200 ${
                  n.isRead ? "bg-white border-gray-100" : "bg-blue-50 border-blue-100"
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full ${n.isRead ? "bg-gray-200" : "bg-blue-500"}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        typeBadge[n.type] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {typeLabel[n.type] ?? n.type}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                  </div>

                  <p className="text-sm text-gray-800">{n.message}</p>

                  {n.triggeredBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      By {n.triggeredBy.username} ({n.triggeredBy.email})
                    </p>
                  )}

                  {n.order && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Order #{n.order.id.slice(-8).toUpperCase()} ·{" "}
                      <span className="font-medium">₹{n.order.finalAmount}</span> ·{" "}
                      {n.order.orderStatus}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(id);
                      }}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOne(id);
                    }}
                    title="Delete"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-fadeIn">
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 text-red-600 rounded-full mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <h2 className="text-xl font-black text-gray-950 tracking-tight mb-2">
              Clear All Notifications
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete all admin notifications? This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition active:scale-[0.98] duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition active:scale-[0.98] duration-150 flex items-center justify-center gap-2"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
