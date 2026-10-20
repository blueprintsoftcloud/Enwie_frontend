// src/components/PreFooterBannerSlider.tsx
//
// Full-width Pre-Footer Banner Section (located right above <FooterSection />).
// Renders uploaded banners one by one at their natural uploaded image size across the full width (no carousel).
// Each banner supports an optional click link. If disabled or 0 banners, hides cleanly.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export interface PreFooterBannerItem {
  id: string;
  image: string;
  link?: string;
  title?: string;
  isActive?: boolean;
}

export interface PreFooterConfig {
  enabled: boolean;
  banners: PreFooterBannerItem[];
  autoplaySpeed?: number;
}

export const DEFAULT_PRE_FOOTER_CONFIG: PreFooterConfig = {
  enabled: true,
  banners: [],
};

interface PreFooterBannerSliderProps {
  /** Optional override (used by Homepage Manager preview frame to mirror unsaved changes live) */
  config?: PreFooterConfig;
}

export default function PreFooterBannerSlider({ config: propConfig }: PreFooterBannerSliderProps) {
  const navigate = useNavigate();
  const [fetchedConfig, setFetchedConfig] = useState<PreFooterConfig | null>(null);

  useEffect(() => {
    if (propConfig) return; // If config is supplied as prop, skip fetching
    let isMounted = true;
    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.preFooterConfig) {
          setFetchedConfig({
            enabled: data.preFooterConfig.enabled ?? true,
            banners: Array.isArray(data.preFooterConfig.banners)
              ? data.preFooterConfig.banners.slice(0, 3)
              : [],
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [propConfig]);

  const activeConfig = propConfig ?? fetchedConfig ?? DEFAULT_PRE_FOOTER_CONFIG;
  const isEnabled = activeConfig.enabled !== false;

  // Filter only active banners that have a valid image URL
  const activeBanners = (activeConfig.banners || []).filter(
    (b) => b && b.isActive !== false && typeof b.image === "string" && b.image.trim() !== ""
  );

  if (!isEnabled || activeBanners.length === 0) {
    return null;
  }

  const handleBannerClick = (banner: PreFooterBannerItem) => {
    const rawLink = banner.link?.trim();
    if (!rawLink) return;

    if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
      window.open(rawLink, "_blank", "noopener,noreferrer");
    } else {
      const route = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
      navigate(route);
    }
  };

  return (
    <section className="w-full bg-white select-none py-2 sm:py-4">
      <div className="w-full flex flex-col space-y-4 sm:space-y-6">
        {activeBanners.map((b, idx) => {
          const hasLink = Boolean(b.link?.trim());
          return (
            <div
              key={b.id || idx}
              className={`w-full overflow-hidden relative group ${
                hasLink ? "cursor-pointer" : "cursor-default"
              }`}
              onClick={() => handleBannerClick(b)}
            >
              <img
                src={b.image}
                alt={b.title || `Promotional banner ${idx + 1}`}
                className="w-full h-auto block object-contain transition-transform duration-500 group-hover:scale-[1.005]"
                loading={idx === 0 ? "eager" : "lazy"}
                draggable={false}
              />
              {/* Optional Subtle Link Indicator on Hover */}
              {hasLink && (
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-900 shadow-md backdrop-blur-sm">
                    Explore &rarr;
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
