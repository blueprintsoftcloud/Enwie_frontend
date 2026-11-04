import { createRoot } from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import { setupToastDeduplication } from "./utils/setupToastDeduplication";

setupToastDeduplication();

// Handle Vite dynamic import chunk load failures (due to ERR_NETWORK_CHANGED, dev server rebuilds, or chunk hash shifts)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[Vite] Dynamic import preload failed. Attempting graceful reload...", event);
  const reloadKey = "vite_preload_failed_reload_time";
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

// Browsers silently change a focused <input type="number">'s value when the user
// scrolls over it — easy to trigger by accident while scrolling the page. Blur the
// field the moment a wheel event reaches it so scrolling never edits unsaved data.
document.addEventListener(
  "wheel",
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === "number") {
      active.blur();
    }
  },
  { passive: true },
);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
  </>,
);
