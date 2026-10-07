// src/context/SeoContext.tsx
// Fetches store-wide SEO settings once from the public API and makes them available
// via useSeoSettings(). Mirrors BrandingContext.tsx's fetch/cache pattern exactly —
// same endpoint (GET /admin/company-settings is public; this app already relies on
// that for branding), so this adds zero extra network round trips at app boot.

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "../utils/api";

export interface SeoSettings {
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage: string;
  keywords: string;
  googleSiteVerification: string;
  gaMeasurementId: string;
  metaPixelId: string;
  orgType: string;
  orgAddress: string;
  orgPhone: string;
  orgEmail: string;
  /** Parsed from newline-separated SEO_SOCIAL_LINKS. */
  socialLinks: string[];
  homeTitle: string;
  homeDescription: string;
  productsTitle: string;
  productsDescription: string;
  /** Intro line for the Contact Us page — the rest of that page (address/phone/email)
   * reads orgAddress/orgPhone/orgEmail above, so nothing is entered twice. */
  pageContactIntro: string;
}

interface SeoContextValue {
  seo: SeoSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SeoContext = createContext<SeoContextValue | undefined>(undefined);

const SEO_CACHE_KEY = "crm_seo_cache";

const EMPTY_SEO: SeoSettings = {
  titleTemplate: "",
  defaultDescription: "",
  defaultOgImage: "",
  keywords: "",
  googleSiteVerification: "",
  gaMeasurementId: "",
  metaPixelId: "",
  orgType: "",
  orgAddress: "",
  orgPhone: "",
  orgEmail: "",
  socialLinks: [],
  homeTitle: "",
  homeDescription: "",
  productsTitle: "",
  productsDescription: "",
  pageContactIntro: "",
};

function readSeoCache(): SeoSettings | null {
  try {
    const raw = localStorage.getItem(SEO_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SeoSettings) : null;
  } catch {
    return null;
  }
}

export const useSeoSettings = (): SeoContextValue => {
  const ctx = useContext(SeoContext);
  if (!ctx) throw new Error("useSeoSettings must be used inside <SeoProvider>");
  return ctx;
};

export const SeoProvider = ({ children }: { children: ReactNode }) => {
  const cached = readSeoCache();
  const [seo, setSeo] = useState<SeoSettings>(cached ?? EMPTY_SEO);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/admin/company-settings");
      const s = res.data.settings ?? {};
      const fresh: SeoSettings = {
        titleTemplate: s.SEO_TITLE_TEMPLATE ?? "",
        defaultDescription: s.SEO_DEFAULT_DESCRIPTION ?? "",
        defaultOgImage: s.SEO_DEFAULT_OG_IMAGE ?? "",
        keywords: s.SEO_KEYWORDS ?? "",
        googleSiteVerification: s.SEO_GOOGLE_SITE_VERIFICATION ?? "",
        gaMeasurementId: s.SEO_GA_MEASUREMENT_ID ?? "",
        metaPixelId: s.META_PIXEL_ID ?? "",
        orgType: s.SEO_ORG_TYPE ?? "",
        orgAddress: s.SEO_ORG_ADDRESS ?? "",
        orgPhone: s.SEO_ORG_PHONE ?? "",
        orgEmail: s.SEO_ORG_EMAIL ?? "",
        socialLinks: (s.SEO_SOCIAL_LINKS ?? "")
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean),
        homeTitle: s.SEO_HOME_TITLE ?? "",
        homeDescription: s.SEO_HOME_DESCRIPTION ?? "",
        productsTitle: s.SEO_PRODUCTS_TITLE ?? "",
        productsDescription: s.SEO_PRODUCTS_DESCRIPTION ?? "",
        pageContactIntro: s.PAGE_CONTACT_INTRO ?? "",
      };
      setSeo(fresh);
      try { localStorage.setItem(SEO_CACHE_KEY, JSON.stringify(fresh)); } catch { /* quota exceeded — ignore */ }
    } catch {
      // Keep cached / default values on error — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SeoContext.Provider value={{ seo, loading, refresh }}>
      {children}
    </SeoContext.Provider>
  );
};
