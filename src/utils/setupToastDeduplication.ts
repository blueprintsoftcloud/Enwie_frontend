import toast, { ToastOptions, Renderable, ValueOrFunction } from "react-hot-toast";

type Message = ValueOrFunction<Renderable, any>;

let initialized = false;

/**
 * Global deduplication utility for react-hot-toast.
 * If an explicit `id` is not provided in options, this generates a deterministic ID
 * from the toast message so that subsequent or concurrent calls for the same item/message
 * update/refresh the existing toast in place instead of stacking duplicate toasts.
 */
export function setupToastDeduplication() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const getDedupeId = (type: string, message: Message, opts?: ToastOptions): string | undefined => {
    if (opts?.id) return opts.id;
    if (typeof message === "string" || typeof message === "number") {
      const clean = String(message).trim();
      if (clean) return `${type}:${clean}`;
    }
    return undefined;
  };

  const origSuccess = toast.success;
  const origError = toast.error;
  const origLoading = toast.loading;
  const origCustom = toast.custom;

  toast.success = (message: Message, opts?: ToastOptions) => {
    const id = getDedupeId("success", message, opts);
    return origSuccess(message, id ? { id, ...opts } : opts);
  };

  toast.error = (message: Message, opts?: ToastOptions) => {
    const id = getDedupeId("error", message, opts);
    return origError(message, id ? { id, ...opts } : opts);
  };

  toast.loading = (message: Message, opts?: ToastOptions) => {
    const id = getDedupeId("loading", message, opts);
    return origLoading(message, id ? { id, ...opts } : opts);
  };

  toast.custom = (message: Message, opts?: ToastOptions) => {
    const id = getDedupeId("custom", message, opts);
    return origCustom(message, id ? { id, ...opts } : opts);
  };
}

export default setupToastDeduplication;
