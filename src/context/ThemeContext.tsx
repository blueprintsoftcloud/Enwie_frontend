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

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import api from "../utils/api";
import { THEME_CSS_VARS, DEFAULT_THEME_ID, getThemeById, ThemeTokens } from "../utils/themes";
import { findMatchingOccasion, type OccasionPreset } from "../utils/occasionPresets";
import { getFestiveOccasionColors, type FestiveThemeColors } from "../utils/festiveThemeMapping";

interface ThemeContextValue {
  themeId: string;
  tokens: ThemeTokens;
  loading: boolean;
  activeOccasion: OccasionPreset | null;
  activeFestiveColors: FestiveThemeColors | null;
  customButtonBg: string | null;
  customButtonText: string | null;
  categoryShape: "square" | "circle";
  setCategoryShape: (shape: "square" | "circle") => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_CACHE_KEY = "storra_theme_cache";
const OCCASION_CACHE_KEY = "storra_occasion_cache";
const BUTTON_BG_CACHE_KEY = "storra_button_bg_cache";
const BUTTON_TEXT_CACHE_KEY = "storra_button_text_cache";
const CATEGORY_SHAPE_CACHE_KEY = "storra_category_shape_cache";
const FONT_LINK_ID = "storra-theme-fonts";

function adjustColorBrightness(hex: string, percent: number): string {
  try {
    const cleanHex = hex.replace("#", "");
    const fullHex = cleanHex.length === 3
      ? cleanHex.split("").map((c) => c + c).join("")
      : cleanHex;
    const num = parseInt(fullHex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

function isLightColor(hex: string): boolean {
  try {
    const cleanHex = hex.replace("#", "");
    const fullHex = cleanHex.length === 3
      ? cleanHex.split("").map((c) => c + c).join("")
      : cleanHex;
    const num = parseInt(fullHex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160;
  } catch {
    return false;
  }
}

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

function readOccasionCache(): string | null {
  try {
    return localStorage.getItem(OCCASION_CACHE_KEY);
  } catch {
    return null;
  }
}

function readButtonBgCache(): string | null {
  try {
    return localStorage.getItem(BUTTON_BG_CACHE_KEY);
  } catch {
    return null;
  }
}

function readButtonTextCache(): string | null {
  try {
    return localStorage.getItem(BUTTON_TEXT_CACHE_KEY);
  } catch {
    return null;
  }
}

function readCategoryShapeCache(): "square" | "circle" {
  try {
    const val = localStorage.getItem(CATEGORY_SHAPE_CACHE_KEY);
    return val === "circle" ? "circle" : "square";
  } catch {
    return "square";
  }
}

const readPreviewThemeFromUrl = (): string | null => {
  if (!isEmbeddedPreview()) return null;
  return new URLSearchParams(window.location.search).get("previewTheme");
};

const readPreviewCategoryShapeFromUrl = (): "square" | "circle" | null => {
  if (!isEmbeddedPreview()) return null;
  const shape = new URLSearchParams(window.location.search).get("previewCategoryShape");
  return shape === "circle" || shape === "square" ? shape : null;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const previewFromUrl = readPreviewThemeFromUrl();
  const cached = readThemeCache();
  const cachedOccasionId = readOccasionCache();
  const initialThemeId = previewFromUrl ?? cached ?? DEFAULT_THEME_ID;
  const [themeId, setThemeId] = useState<string>(initialThemeId);
  const [customButtonBg, setCustomButtonBg] = useState<string | null>(readButtonBgCache);
  const [customButtonText, setCustomButtonText] = useState<string | null>(readButtonTextCache);
  const previewCategoryShapeFromUrl = readPreviewCategoryShapeFromUrl();
  const [categoryShape, setCategoryShape] = useState<"square" | "circle">(() => {
    return previewCategoryShapeFromUrl ?? readCategoryShapeCache();
  });
  const [categoryShapeLocked, setCategoryShapeLocked] = useState(!!previewCategoryShapeFromUrl);
  const [activeOccasion, setActiveOccasion] = useState<OccasionPreset | null>(() => {
    if (cachedOccasionId) {
      return findMatchingOccasion(cachedOccasionId) || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(!previewFromUrl && !cached);
  // Once a live preview message arrives, it wins over whatever the real fetch resolves —
  // otherwise a slow-landing fetch response could stomp the admin's swatch click.
  const [previewLocked, setPreviewLocked] = useState(!!previewFromUrl);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/home-banners/homepage-config");
      const fetchedThemeConfig = res.data?.themeConfig;
      const fetchedId: string | undefined = fetchedThemeConfig?.themeId;
      const fetchedButtonBg = fetchedThemeConfig?.customButtonBg;
      const fetchedButtonText = fetchedThemeConfig?.customButtonText;
      const explicitOccasionId: string | null | undefined = res.data?.activeOccasionId;
      const fetchedCategoryShape = res.data?.categoryShape;

      if (fetchedId) {
        try {
          localStorage.setItem(THEME_CACHE_KEY, fetchedId);
        } catch {
          /* quota exceeded — ignore */
        }
        setThemeId((prev) => (previewLocked ? prev : fetchedId));
      }

      if (typeof fetchedButtonBg !== "undefined") {
        try {
          if (fetchedButtonBg) localStorage.setItem(BUTTON_BG_CACHE_KEY, fetchedButtonBg);
          else localStorage.removeItem(BUTTON_BG_CACHE_KEY);
        } catch {
          /* quota */
        }
        setCustomButtonBg(fetchedButtonBg || null);
      }

      if (typeof fetchedButtonText !== "undefined") {
        try {
          if (fetchedButtonText) localStorage.setItem(BUTTON_TEXT_CACHE_KEY, fetchedButtonText);
          else localStorage.removeItem(BUTTON_TEXT_CACHE_KEY);
        } catch {
          /* quota */
        }
        setCustomButtonText(fetchedButtonText || null);
      }

      if (typeof explicitOccasionId !== "undefined") {
        const matchingOccasion = explicitOccasionId
          ? findMatchingOccasion(explicitOccasionId)
          : null;
        try {
          if (explicitOccasionId) {
            localStorage.setItem(OCCASION_CACHE_KEY, explicitOccasionId);
          } else {
            localStorage.removeItem(OCCASION_CACHE_KEY);
          }
        } catch {
          /* quota */
        }
        setActiveOccasion(matchingOccasion);
      }

      if (fetchedCategoryShape === "circle" || fetchedCategoryShape === "square") {
        try {
          localStorage.setItem(CATEGORY_SHAPE_CACHE_KEY, fetchedCategoryShape);
        } catch {
          /* quota */
        }
        setCategoryShape((prev) => (categoryShapeLocked ? prev : fetchedCategoryShape));
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
      if (event.data?.type === "STORRA_PREVIEW_THEME") {
        if (typeof event.data.themeId === "string") {
          setPreviewLocked(true);
          setThemeId(event.data.themeId);
        }
        if (typeof event.data.customButtonBg !== "undefined") {
          setCustomButtonBg(event.data.customButtonBg || null);
        }
        if (typeof event.data.customButtonText !== "undefined") {
          setCustomButtonText(event.data.customButtonText || null);
        }
        if (event.data.categoryShape === "circle" || event.data.categoryShape === "square") {
          setCategoryShapeLocked(true);
          setCategoryShape(event.data.categoryShape);
        }
      }
      if (event.data?.type === "STORRA_PREVIEW_CATEGORY_SHAPE") {
        if (event.data.categoryShape === "circle" || event.data.categoryShape === "square") {
          setCategoryShapeLocked(true);
          setCategoryShape(event.data.categoryShape);
        }
      }
      if (event.data?.type === "STORRA_PREVIEW_OCCASION") {
        const occId = event.data.occasionId;
        setActiveOccasion(occId ? findMatchingOccasion(occId) : null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const tokens = getThemeById(themeId);
  const activeFestiveColors = useMemo(
    () => getFestiveOccasionColors(activeOccasion?.id),
    [activeOccasion?.id]
  );

  const effectiveTokens = useMemo(() => {
    const base = activeFestiveColors
      ? {
          ...tokens,
          primary: activeFestiveColors.primary,
          primaryHover: activeFestiveColors.primaryHover,
          primaryInk: activeFestiveColors.primaryInk,
          accent: activeFestiveColors.accent,
          accentInk: activeFestiveColors.accentInk,
          border: activeFestiveColors.border,
        }
      : tokens;

    if (!customButtonBg) {
      return base;
    }

    const defaultInk = isLightColor(customButtonBg) ? "#0B0B0C" : "#FFFFFF";
    return {
      ...base,
      primary: customButtonBg,
      primaryHover: adjustColorBrightness(customButtonBg, -15),
      primaryInk: customButtonText || defaultInk,
    };
  }, [tokens, activeFestiveColors, customButtonBg, customButtonText]);

  // Inject CSS custom properties onto <html> — synchronizes theme variables, buttons,
  // line colors, and the festive announcement bar colors for the footer and storefront.
  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(THEME_CSS_VARS) as (keyof typeof THEME_CSS_VARS)[]).forEach((key) => {
      root.style.setProperty(THEME_CSS_VARS[key], String(effectiveTokens[key]));
    });

    // Global button color variables
    root.style.setProperty("--primary-color", effectiveTokens.primary);
    root.style.setProperty("--primary-hover", effectiveTokens.primaryHover);
    root.style.setProperty("--primary-light", effectiveTokens.accent);

    // Festive announcement bar colors for footer, buttons, and lines
    if (activeFestiveColors && activeOccasion) {
      root.setAttribute("data-active-occasion", activeOccasion.id);
      root.style.setProperty("--festive-gradient", activeFestiveColors.gradient);
      root.style.setProperty("--festive-border", activeFestiveColors.borderColor);
      root.style.setProperty("--festive-accent", activeFestiveColors.accent);
      root.style.setProperty("--festive-text", activeFestiveColors.textColor);
    } else {
      root.removeAttribute("data-active-occasion");
      root.style.removeProperty("--festive-gradient");
      root.style.removeProperty("--festive-border");
      root.style.removeProperty("--festive-accent");
      root.style.removeProperty("--festive-text");
    }
  }, [effectiveTokens, activeFestiveColors, activeOccasion]);

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

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        tokens: effectiveTokens,
        loading,
        activeOccasion,
        activeFestiveColors,
        customButtonBg,
        customButtonText,
        categoryShape,
        setCategoryShape,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
