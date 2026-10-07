import { createRoot } from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import { setupToastDeduplication } from "./utils/setupToastDeduplication";

setupToastDeduplication();

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
