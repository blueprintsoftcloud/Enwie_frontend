// src/components/NotificationBell.tsx
// Shared bell-icon dropdown used in Admin, Super-Admin and Staff dashboards.
// Clicking a notification marks it read and navigates to the notifications page.

import { useRef, useEffect, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { Trash2, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import { getNotificationTarget } from "../utils/notificationRoute";

interface Props {
  /** Base dashboard path, e.g. "/admin-dashboard" */
  dashboardPath: string;
}

const formatTime = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationBell({ dashboardPath }: Props) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const recent = notifications;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: (typeof notifications)[number]) => {
    const id = n.id ?? n._id;
    if (!n.isRead && id) markAsRead(id);
    setOpen(false);
    navigate(getNotificationTarget(n, dashboardPath));
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllRead();
      toast.success("All notifications marked as read", { id: "bell-mark-all-read" });
    } catch {
      toast.error("Failed to mark all as read", { id: "bell-mark-all-read-error" });
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setClearing(true);
    try {
      await clearAllNotifications();
      toast.success("All notifications cleared", { id: "bell-clear-all" });
    } catch {
      toast.error("Failed to clear notifications", { id: "bell-clear-all-error" });
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      toast.success("Notification removed", { id: "bell-del-one" });
    } catch {
      toast.error("Failed to delete notification", { id: "bell-del-one-error" });
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center leading-none px-0.5 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-84 sm:w-96 bg-white shadow-2xl rounded-2xl border border-gray-100 z-[1100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-semibold border border-red-100">
                  {unreadCount} new
                </span>
              )}
            </div>

            {recent.length > 0 && (
              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {recent.length === 0 ? (
              <div className="text-center py-10 px-4">
                <BellIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-0.5">We'll notify you when updates arrive</p>
              </div>
            ) : (
              recent.map((n) => {
                const id = n.id ?? n._id;
                return (
                  <div
                    key={id}
                    onClick={() => handleClick(n)}
                    className={`group relative w-full text-left px-4 py-3 transition-colors flex items-start gap-2.5 cursor-pointer ${
                      !n.isRead ? "bg-blue-50/40 hover:bg-blue-50/80" : "hover:bg-gray-50"
                    }`}
                  >
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className={`flex-1 pr-4 ${n.isRead ? "pl-4" : ""}`}>
                      <p
                        className={`text-xs leading-snug line-clamp-2 ${
                          !n.isRead ? "font-semibold text-gray-900" : "text-gray-600 font-medium"
                        }`}
                      >
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>

                    {/* Individual delete on hover */}
                    {id && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOne(e, id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white shadow-xs shrink-0"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              className="w-full text-center text-xs text-slate-700 hover:text-slate-900 font-bold py-1 transition-colors"
              onClick={() => {
                setOpen(false);
                navigate(`${dashboardPath}/notifications`);
              }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
