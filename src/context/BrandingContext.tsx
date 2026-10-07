// src/context/BrandingContext.tsx
// Fetches company branding (logo, name, tagline) once from the public API
// and makes it available throughout the app via useBranding().

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "../utils/api";

interface BrandingData {
  companyName: string;
  companyTagline: string;
  companyLogo: string;
  companyFavicon: string;
  showCompanyName: boolean;
  showCompanyTagline: boolean;
}

interface BrandingContextValue {
  branding: BrandingData;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

const BRANDING_CACHE_KEY = "crm_branding_cache";

const DEFAULT_BRANDING: BrandingData = {
  companyName: "Storra",
  companyTagline: "",
  companyLogo: "",
  companyFavicon: "/vite.svg",
  showCompanyName: true,
  showCompanyTagline: true,
};

function readBrandingCache(): BrandingData | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandingData;
    return {
      ...parsed,
      companyName: parsed.companyName?.trim() || "Storra",
      companyFavicon: parsed.companyFavicon?.trim() || "/vite.svg",
    };
  } catch {
    return null;
  }
}

export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used inside <BrandingProvider>");
  return ctx;
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  // Initialise immediately from cache or defaults so the navbar never flickers on reload
  const cached = readBrandingCache();
  const [branding, setBranding] = useState<BrandingData>(cached ?? DEFAULT_BRANDING);
  // If we already have cached data, consider it "loaded" right away
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/admin/company-settings");
      const s = res.data.settings ?? {};
      const fresh: BrandingData = {
        companyName: s.COMPANY_NAME?.trim() || "Storra",
        companyTagline: s.COMPANY_TAGLINE ?? "",
        companyLogo: s.COMPANY_LOGO ?? "",
        companyFavicon: s.COMPANY_FAVICON?.trim() || "/vite.svg",
        showCompanyName:
          s.SHOW_COMPANY_NAME === "true" ||
          s.SHOW_COMPANY_NAME === "1" ||
          s.SHOW_COMPANY_NAME === undefined ||
          s.SHOW_COMPANY_NAME === null,
        showCompanyTagline:
          s.SHOW_COMPANY_TAGLINE === "true" ||
          s.SHOW_COMPANY_TAGLINE === "1" ||
          s.SHOW_COMPANY_TAGLINE === undefined ||
          s.SHOW_COMPANY_TAGLINE === null,
      };
      setBranding(fresh);
      try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(fresh)); } catch { /* quota exceeded — ignore */ }
    } catch {
      // Keep cached / default values on error — non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sync browser tab title and favicon whenever branding changes
  useEffect(() => {
    const title = branding.companyName?.trim() || "Storra";
    if (!document.title || document.title === "Amore Webstore" || document.title === "Vite App") {
      document.title = title;
    }
    const faviconUrl = branding.companyFavicon?.trim() || "/vite.svg";
    try {
      const existingIcons = document.querySelectorAll<HTMLLinkElement>(
        "link[rel*='icon'], link#app-favicon"
      );
      existingIcons.forEach((el) => el.remove());

      const link = document.createElement("link");
      link.id = "app-favicon";
      link.rel = "icon";
      if (faviconUrl.endsWith(".svg")) {
        link.type = "image/svg+xml";
      } else {
        link.type = "image/png";
      }
      link.href = faviconUrl;
      document.head.appendChild(link);
    } catch {
      // Fallback for non-standard environments
    }
  }, [branding.companyName, branding.companyFavicon]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
};
