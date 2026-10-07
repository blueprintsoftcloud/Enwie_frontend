// src/components/BannerCarousel.tsx
//
// Template-aware like HeroSection.tsx — activeTemplate picks which hand-built layout
// renders the SAME PROMO_BANNER rows (see companySettings.controller.ts's
// SECTION_TEMPLATE_KEYS: this section has no per-template content, only layout).

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../utils/api";

interface PromoBanner {
  id: string;
  image: string;
  title: string;
  discount?: string | null;
  description?: string | null;
}

interface TemplateProps {
  banners: PromoBanner[];
}

// ─── Template 1: Auto-scroll Row ────────────────────────────────────────────────
const Template1 = ({ banners }: TemplateProps) => {
  const [scrollWidth, setScrollWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (banners.length === 0) return;

    const measure = () => {
      if (trackRef.current && trackRef.current.children.length > banners.length) {
        const first = trackRef.current.children[0] as HTMLElement;
        const target = trackRef.current.children[banners.length] as HTMLElement;
        if (first && target) {
          setScrollWidth(target.offsetLeft - first.offsetLeft);
        }
      }
    };

    const frameId = requestAnimationFrame(() => {
      measure();
    });
    const timeoutId = setTimeout(measure, 100);

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      window.removeEventListener("resize", measure);
    };
  }, [banners]);

  const repeated = [...banners, ...banners, ...banners, ...banners, ...banners, ...banners];
  const duration = Math.max(banners.length * 6, 16);

  return (
    <section className="w-full py-6 sm:py-8 bg-white overflow-hidden">
      <style>{`
        @keyframes banner-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(var(--scroll-width, 0px)); }
        }
        .banner-scroll-track {
          display: flex;
          will-change: transform;
        }
      `}</style>

      <div className="overflow-hidden w-[94vw] max-w-7xl mx-auto">
        <div
          ref={trackRef}
          className="banner-scroll-track"
          onMouseEnter={() => {
            if (!window.matchMedia("(pointer: coarse)").matches) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
          onTouchCancel={() => setIsHovered(false)}
          style={{
            display: "flex",
            animationName: scrollWidth > 0 ? "banner-scroll" : "none",
            animationDuration: `${duration}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: isHovered ? "paused" : "running",
            "--scroll-width": `-${scrollWidth}px`,
          } as React.CSSProperties}
        >
          {repeated.map((b, i) => (
            <div
              key={`${b.id}-${i}`}
              className="flex-none overflow-hidden bg-gray-100 rounded-2xl shrink-0 w-[260px] sm:w-[360px] md:w-[480px] lg:w-[580px] aspect-[16/9] mr-4 shadow-sm relative group"
            >
              <img
                src={b.image}
                alt={b.title || "Banner"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />
              {(b.title || b.discount) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5 pointer-events-none">
                  {b.title && <p className="text-white text-sm sm:text-base font-bold uppercase tracking-wide truncate">{b.title}</p>}
                  {b.discount && <p className="text-white/90 text-xs sm:text-sm font-semibold mt-0.5">{b.discount}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Template 2: Static Grid ────────────────────────────────────────────────────
// A responsive layout showing the full banner in wide proportion.
// If single banner: spans full-width with widescreen panoramic ratio.
// If multiple: adaptive grid with standard 16:9 banner aspect ratio.
const Template2 = ({ banners }: TemplateProps) => {
  const isSingle = banners.length === 1;

  return (
    <section className="w-full py-6 sm:py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isSingle ? (
          <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9] sm:aspect-[1.9/1] lg:aspect-[2.1/1] max-h-[520px] w-full shadow-sm group">
            <img
              src={banners[0].image}
              alt={banners[0].title || "Banner"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {(banners[0].title || banners[0].discount || banners[0].description) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10">
                {banners[0].title && (
                  <h3 className="text-white text-lg sm:text-2xl md:text-3xl font-bold uppercase tracking-tight">
                    {banners[0].title}
                  </h3>
                )}
                {banners[0].discount && (
                  <p className="text-white/90 text-xs sm:text-base font-semibold mt-1">
                    {banners[0].discount}
                  </p>
                )}
                {banners[0].description && (
                  <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xl line-clamp-2">
                    {banners[0].description}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-4 sm:gap-6 ${
              banners.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : banners.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {banners.map((b) => (
              <div
                key={b.id}
                className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9] group shadow-sm"
              >
                <img
                  src={b.image}
                  alt={b.title || "Banner"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {(b.title || b.discount || b.description) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-6">
                    {b.title && (
                      <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide truncate">
                        {b.title}
                      </p>
                    )}
                    {b.discount && (
                      <p className="text-white/90 text-[11px] sm:text-xs font-semibold mt-0.5">
                        {b.discount}
                      </p>
                    )}
                    {b.description && (
                      <p className="text-white/75 text-[11px] sm:text-xs mt-0.5 line-clamp-1">
                        {b.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Template 3: Full-bleed Slider ──────────────────────────────────────────────
// One large banner at a time, auto-advancing, with dot indicators and manual arrows.
const Template3 = ({ banners }: TemplateProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[index];
  if (!banner) return null;

  return (
    <section className="w-full py-6 sm:py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full aspect-[16/9] sm:aspect-[1.9/1] lg:aspect-[2.1/1] max-h-[520px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          <img
            src={banner.image}
            alt={banner.title || "Banner"}
            className="w-full h-full object-cover transition-all duration-700"
          />
          {(banner.title || banner.discount || banner.description) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10">
              {banner.title && (
                <h3 className="text-white text-lg sm:text-2xl md:text-3xl font-bold tracking-tight">
                  {banner.title}
                </h3>
              )}
              {banner.discount && (
                <p className="text-white/90 text-xs sm:text-base font-semibold mt-1">
                  {banner.discount}
                </p>
              )}
              {banner.description && (
                <p className="text-white/70 text-xs sm:text-sm mt-1 max-w-md line-clamp-2">
                  {banner.description}
                </p>
              )}
            </div>
          )}

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
                aria-label="Previous banner"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-gray-900 hover:bg-white shadow-md transition-all hover:scale-110"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % banners.length)}
                aria-label="Next banner"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-gray-900 hover:bg-white shadow-md transition-all hover:scale-110"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show banner ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Template 4: Split Showcase ────────────────────────────────────────────────
// Large side-by-side cards with wide banner aspect ratio.
const Template4 = ({ banners }: TemplateProps) => {
  const isSingle = banners.length === 1;

  return (
    <section className="w-full py-6 sm:py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid gap-5 ${
            isSingle
              ? "grid-cols-1"
              : banners.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : banners.length === 3
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {banners.map((b) => (
            <div
              key={b.id}
              className={`relative overflow-hidden rounded-2xl bg-gray-100 shadow-sm group ${
                isSingle
                  ? "aspect-[16/9] sm:aspect-[1.9/1] lg:aspect-[2.1/1] max-h-[520px]"
                  : banners.length === 3
                  ? "aspect-[16/9] sm:aspect-[4/3] lg:aspect-[16/10]"
                  : "aspect-[16/9] sm:aspect-[16/10]"
              }`}
            >
              <img
                src={b.image}
                alt={b.title || "Banner"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {(b.title || b.discount || b.description) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex flex-col justify-end p-5 sm:p-7">
                  {b.title && (
                    <h3 className="text-white text-base sm:text-xl font-bold tracking-tight">
                      {b.title}
                    </h3>
                  )}
                  {b.discount && (
                    <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1">
                      {b.discount}
                    </p>
                  )}
                  {b.description && (
                    <p className="text-white/70 text-xs mt-1 max-w-sm line-clamp-2">
                      {b.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function BannerCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(1);

  useEffect(() => {
    api
      .get("/home-banners?type=PROMO_BANNER")
      .then(({ data }) => {
        const active: PromoBanner[] = (data.banners ?? [])
          .filter((b: any) => b.isActive)
          .map((b: any) => ({
            id: b.id,
            image: b.image,
            title: b.title,
            discount: b.discount,
            description: b.description,
          }));
        setBanners(active);
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (typeof data?.carouselTemplate === "number") {
          setActiveTemplate(data.carouselTemplate);
        }
      })
      .catch(() => { });
  }, []);

  if (loading || banners.length === 0) return null;

  switch (activeTemplate) {
    case 2:
      return <Template2 banners={banners} />;
    case 3:
      return <Template3 banners={banners} />;
    case 4:
      return <Template4 banners={banners} />;
    default:
      return <Template1 banners={banners} />;
  }
}
