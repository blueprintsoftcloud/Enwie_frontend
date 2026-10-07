import React, { useEffect } from "react";
import toast, { useToasterStore, resolveValue } from "react-hot-toast";

const MAX_VISIBLE_TOASTS = 3;

/**
 * ToastDeduplicator component:
 * 1. Watches the global react-hot-toast store via `useToasterStore()`.
 * 2. Immediately dismisses any duplicate toasts sharing the same resolved message,
 *    preventing multiple identical toasts from stacking.
 * 3. Caps maximum visible toasts to 3 so the screen is never cluttered with toasts.
 */
export const ToastDeduplicator: React.FC = () => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    // Only inspect active, non-dismissed toasts
    const activeToasts = toasts.filter((t) => t.visible && !t.dismissed);
    const seenKeys = new Set<string>();
    let visibleCount = 0;

    activeToasts.forEach((t) => {
      // Resolve toast message content
      const resolved = typeof t.message === "function" ? resolveValue(t.message, t) : t.message;
      const contentStr =
        typeof resolved === "string"
          ? resolved.trim()
          : typeof resolved === "number"
            ? String(resolved)
            : t.id;

      const dedupeKey = contentStr ? `${t.type || "blank"}:${contentStr}` : t.id;

      if (dedupeKey && seenKeys.has(dedupeKey)) {
        // Dismiss duplicate toast immediately
        toast.dismiss(t.id);
      } else {
        if (dedupeKey) seenKeys.add(dedupeKey);
        visibleCount++;
        // Limit maximum concurrent toasts
        if (visibleCount > MAX_VISIBLE_TOASTS) {
          toast.dismiss(t.id);
        }
      }
    });
  }, [toasts]);

  return null;
};

export default ToastDeduplicator;
