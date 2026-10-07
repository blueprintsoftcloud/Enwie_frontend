// src/dashboard/components/StorefrontPreviewFrame.tsx
//
// Shared live preview of the real customer storefront, embedded via <iframe
// src="/?preview=1"> rather than mounting the real page components directly —
// Customerdashboard.tsx and its route guards actively redirect an admin/super-admin
// session away from the customer layout; isStorefrontPreview() (utils/preview.ts) is the
// one narrow exception, gated on both ?preview=1 AND actually being framed. Used by every
// tab in HomepageManager.tsx: each of the 8 content tabs passes `anchor` to scroll
// straight to the section being edited; the Theme tab omits it (whole-page view) and
// drives `previewThemeId` instead so swatch clicks preview instantly with no reload.

import React, { useEffect, useRef, useState } from "react";

interface StorefrontPreviewFrameProps {
  /** Section id to scroll to once the preview loads — matches the ids Customerdashboard.tsx
   * wraps its sections in (hero, banner, announcement, category, discount, carousel,
   * featured, footer). Omit for a full-page, no-scroll preview. */
  anchor?: string;
  /** Previews this theme instantly via postMessage, without saving it or reloading the
   * frame. Falls back to the tenant's saved theme when omitted. */
  previewThemeId?: string;
  className?: string;
  /** Bump this (any changing value — a counter works well) after a save that changed
   * real storefront content (hero text, banners, footer, nav, ...). The frame's `src`
   * is otherwise fixed for its whole lifetime (see the comment below) so nothing else
   * would ever tell an already-mounted preview to go fetch the data it just saved —
   * this is that explicit signal. Re-navigates the iframe in place (same URL), which
   * re-fires onLoad, which re-sends the current anchor so scroll position is restored. */
  reloadToken?: number | string;
}

const StorefrontPreviewFrame: React.FC<StorefrontPreviewFrameProps> = ({ anchor, previewThemeId, className, reloadToken }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Computed once — the iframe must never re-navigate on its own after mount (that's
  // what postMessage below is for instead), so `src` intentionally ignores later prop
  // changes. reloadToken is the one deliberate exception (see its own doc comment) and
  // goes through contentWindow.location.reload() below, not by changing this src.
  const [src] = useState(() => {
    const params = new URLSearchParams({ preview: "1" });
    if (previewThemeId) params.set("previewTheme", previewThemeId);
    return `/?${params.toString()}`;
  });

  const postToFrame = (message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    if (!loaded || !previewThemeId) return;
    postToFrame({ type: "STORRA_PREVIEW_THEME", themeId: previewThemeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, previewThemeId]);

  useEffect(() => {
    if (!loaded || !anchor) return;
    postToFrame({ type: "STORRA_SCROLL_TO", anchor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, anchor]);

  // Skip the token's initial value — only react to it actually changing (a real save),
  // not to this effect's own first run on mount.
  const isFirstReloadRef = useRef(true);
  useEffect(() => {
    if (isFirstReloadRef.current) {
      isFirstReloadRef.current = false;
      return;
    }
    if (reloadToken === undefined) return;
    setLoaded(false);
    iframeRef.current?.contentWindow?.location.reload();
  }, [reloadToken]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Storefront live preview"
      onLoad={() => setLoaded(true)}
      className={className ?? "w-full h-full border-0"}
    />
  );
};

export default StorefrontPreviewFrame;
