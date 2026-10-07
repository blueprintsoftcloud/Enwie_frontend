// src/utils/preview.ts
//
// Detects whether the current page is being rendered inside Homepage Manager's live
// preview iframe (StorefrontPreviewFrame.tsx) rather than being visited directly.
// Requires BOTH the `preview=1` query param AND actually being embedded
// (window.self !== window.top) — the query param alone does nothing for a real
// top-level visitor, even if the URL leaked, was bookmarked, or got crawled. This is a
// cosmetic UX gate that lets the admin/staff→customer-layout redirect be skipped so the
// preview can render at all, not a new auth boundary — real authorization still lives in
// route/middleware guards elsewhere, unaffected by this check.
//
// Once confirmed for this iframe instance, that stays remembered in module state rather
// than being re-derived from the URL on every call. Clicking any in-preview link (nav,
// category chips, the logo) does a normal client-side route change to a path that never
// had `?preview=1` on it, which used to make this flip back to false mid-session and
// bounce the admin's in-iframe session to their own dashboard — this fixes that. A real
// full reload (StorefrontPreviewFrame's reloadToken) resets this module, but the iframe's
// `src` always includes `?preview=1` again, so the very first render re-confirms it.
let confirmedPreview = false;

export const isStorefrontPreview = (): boolean => {
  try {
    if (window.self === window.top) return false;
  } catch {
    // Cross-origin frame access throws — this app is only ever embedded by itself
    // (same-origin), so treat that as NOT a valid preview context rather than assuming.
    return false;
  }
  if (confirmedPreview) return true;
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  if (isPreview) confirmedPreview = true;
  return isPreview;
};
