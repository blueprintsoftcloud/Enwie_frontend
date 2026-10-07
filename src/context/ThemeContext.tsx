// src/context/ThemeContext.tsx
//
// Storefront visual theme delivery — a separate concern from BrandingContext (which owns
// identity: name/logo/favicon). Fetches the tenant's saved theme choice, caches it to
// avoid a flash of the default theme on reload, and injects it as CSS custom properties
// onto <html> so every theme-aware storefront component can read it via
// `bg-[var(--theme-primary)]` etc. without needing this context directly.
//
// Preview support: when embedded inside HomepageManager's live-preview iframe
// (window.self !== window.top), a `?previewTheme=<id>` query param seeds the initial
// value (handles a hard refresh of the iframe), and a postMessage from the parent frame
// applies further changes instantly with no reload — see StorefrontPreviewFrame.tsx.
// Neither path does anything for a real top-level visitor, even if the URL leaked.

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "../utils/api";
import { THEME_CSS_VARS, DEFAULT_THEME_ID, getThemeById, ThemeTokens } from "../utils/themes";

interface ThemeContextValue {
  themeId: string;
  tokens: ThemeTokens;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_CACHE_KEY = "storra_theme_cache";
const FONT_LINK_ID = "storra-theme-fonts";

const isEmbeddedPreview = () => {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access throws — treat as embedded (conservative: this app is
    // only ever embedded by itself, same-origin, via StorefrontPreviewFrame.tsx).
    return true;
  }
};

function readThemeCache(): string | null {
  try {
    return localStorage.getItem(THEME_CACHE_KEY);
  } catch {
    return null;
  }
}

const readPreviewThemeFromUrl = (): string | null => {
  if (!isEmbeddedPreview()) return null;
  return new URLSearchParams(window.location.search).get("previewTheme");
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const previewFromUrl = readPreviewThemeFromUrl();
  const cached = readThemeCache();
  const [themeId, setThemeId] = useState<string>(previewFromUrl ?? cached ?? DEFAULT_THEME_ID);
  const [loading, setLoading] = useState(!previewFromUrl && !cached);
  // Once a live preview message arrives, it wins over whatever the real fetch resolves —
  // otherwise a slow-landing fetch response could stomp the admin's swatch click.
  const [previewLocked, setPreviewLocked] = useState(!!previewFromUrl);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/home-banners/homepage-config");
      const fetchedId: string | undefined = res.data?.themeConfig?.themeId;
      if (fetchedId) {
        try {
          localStorage.setItem(THEME_CACHE_KEY, fetchedId);
        } catch {
          /* quota exceeded — ignore */
        }
        setThemeId((prev) => (previewLocked ? prev : fetchedId));
      }
    } catch {
      // Keep cached/default value on error — non-critical.
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live preview channel — instant, no-reload theme swap while embedded in the admin's
  // preview iframe. Ignored entirely for a real top-level visitor.
  useEffect(() => {
    if (!isEmbeddedPreview()) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "STORRA_PREVIEW_THEME" && typeof event.data.themeId === "string") {
        setPreviewLocked(true);
        setThemeId(event.data.themeId);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const tokens = getThemeById(themeId);

  // Inject CSS custom properties onto <html> — same mechanical setProperty pattern
  // App.tsx already uses for --primary-color etc., generalized to loop over all tokens.
  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(THEME_CSS_VARS) as (keyof typeof THEME_CSS_VARS)[]).forEach((key) => {
      root.style.setProperty(THEME_CSS_VARS[key], String(tokens[key]));
    });
  }, [tokens]);

  // Load the active theme's two Google Fonts on demand — nothing is statically loaded
  // for any theme up front; mirrors BrandingContext.tsx's id-checked, create-if-missing
  // favicon <link> pattern.
  useEffect(() => {
    const families = tokens.googleFontFamilies.map((f) => `family=${f}`).join("&");
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [tokens.googleFontFamilies]);

  return <ThemeContext.Provider value={{ themeId, tokens, loading }}>{children}</ThemeContext.Provider>;
};
