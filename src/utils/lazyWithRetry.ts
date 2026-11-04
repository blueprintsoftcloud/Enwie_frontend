import { ComponentType, lazy, LazyExoticComponent } from "react";

/**
 * Wraps React.lazy() with automatic retry logic and fallback auto-reload
 * for handling transient network drops (e.g. net::ERR_NETWORK_CHANGED),
 * dev server re-bundles, and chunk mismatches after new builds.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  maxRetries = 2,
  baseDelayMs = 600
): LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      let attempts = 0;

      const attempt = () => {
        factory()
          .then(resolve)
          .catch((error: any) => {
            attempts++;
            const errorMessage = String(error?.message || error || "");
            const isModuleLoadError =
              errorMessage.includes("Failed to fetch dynamically imported module") ||
              errorMessage.includes("Loading chunk") ||
              errorMessage.includes("Importing a module script failed") ||
              errorMessage.includes("net::ERR_NETWORK_CHANGED") ||
              error?.name === "ChunkLoadError";

            if (attempts <= maxRetries && isModuleLoadError) {
              console.warn(
                `[lazyWithRetry] Module load failed (${errorMessage}). Retrying in ${
                  baseDelayMs * attempts
                }ms (attempt ${attempts}/${maxRetries})...`
              );
              setTimeout(attempt, baseDelayMs * attempts);
            } else if (isModuleLoadError) {
              // Retries exhausted. Trigger throttled full page reload to fetch fresh chunks.
              const reloadKey = "chunk_load_failed_reload_time";
              const lastReload = sessionStorage.getItem(reloadKey);
              const now = Date.now();
              // Prevent reload loop: only auto-reload if last reload was > 10s ago
              if (!lastReload || now - Number(lastReload) > 10000) {
                sessionStorage.setItem(reloadKey, String(now));
                console.warn(
                  "[lazyWithRetry] Retries exhausted. Reloading page to fetch updated modules..."
                );
                window.location.reload();
                return;
              }
              reject(error);
            } else {
              reject(error);
            }
          });
      };

      attempt();
    })
  );
}

export default lazyWithRetry;

