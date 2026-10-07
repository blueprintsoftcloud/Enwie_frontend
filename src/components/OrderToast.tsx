import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBagIcon, CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { AdminNotification } from "../context/NotificationContext";

interface ToastItem extends AdminNotification {
  toastId: string;
}

interface OrderToastProps {
  notification: AdminNotification | null;
}

const ICONS: Record<string, React.ReactElement> = {
  NEW_ORDER: <ShoppingBagIcon className="h-5 w-5 text-green-600" />,
  PAYMENT_SUCCESS: <CheckCircleIcon className="h-5 w-5 text-blue-600" />,
  PAYMENT_FAILED: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
};

const COLORS: Record<string, string> = {
  NEW_ORDER: "bg-green-500",
  PAYMENT_SUCCESS: "bg-blue-500",
  PAYMENT_FAILED: "bg-red-500",
};

const TITLES: Record<string, string> = {
  NEW_ORDER: "New Order Received",
  PAYMENT_SUCCESS: "Payment Confirmed",
  PAYMENT_FAILED: "Payment Failed",
};

const DURATION_MS = 5000;

export default function OrderToast({ notification }: OrderToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!notification) return;
    const toastId = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...notification, toastId }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [notification]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.toastId !== id));

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => {
          const type = toast.type ?? "NEW_ORDER";
          const Icon = ICONS[type] ?? ICONS.NEW_ORDER;
          const barColor = COLORS[type] ?? COLORS.NEW_ORDER;
          const title = TITLES[type] ?? "Notification";

          return (
            <motion.div
              key={toast.toastId}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="pointer-events-auto w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                  {Icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {toast.message}
                  </p>
                  {toast.triggeredBy?.username && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {toast.triggeredBy.username}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.toastId)}
                  className="text-gray-300 hover:text-gray-600 shrink-0 mt-0.5 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Auto-dismiss progress bar */}
              <motion.div
                className={`h-0.5 ${barColor} origin-left`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
