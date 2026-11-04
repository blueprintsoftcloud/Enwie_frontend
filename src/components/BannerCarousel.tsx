// src/components/BannerCarousel.tsx
//
// Template-aware like HeroSection.tsx — activeTemplate picks which hand-built layout
// renders the SAME PROMO_BANNER rows (see companySettings.controller.ts's
// SECTION_TEMPLATE_KEYS: this section has no per-template content, only layout).

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

interface PromoBanner {
  id: string;
  image: string;
  title: string;
  link?: string | null;
  discount?: string | null;
  description?: string | null;
}

interface TemplateProps {
  banners: PromoBanner[];
}

const useBannerRedirect = () => {
  const navigate = useNavigate();
  return (link?: string | null) => {
    if (!link) return;
    const trimmed = link.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      window.open(trimmed, "_blank", "noopener,noreferrer");
    } else {
      navigate(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
    }
  };
};

// --------- Template 1: Auto-scroll Row ------------------------------------------------------------------------------------------------------------------------------------------------
const Template1 = ({ banners }: TemplateProps) => {
  const [scrollWidth, setScrollWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleBannerClick = useBannerRedirect();

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
          justify-content: flex-start;
          align-items: center;
          will-change: transform;
        }
      `}</style>

      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="overflow-hidden w-full">
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
              justifyContent: "flex-start",
              alignItems: "center",
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
                onClick={() => (b.link ? handleBannerClick(b.link) : undefined)}
                className={`flex-none overflow-hidden bg-gray-100 rounded-2xl shrink-0 w-[260px] sm:w-[360px] md:w-[480px] lg:w-[580px] aspect-[16/9] mr-4 shadow-sm relative group ${b.link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
              >
                <img
                  src={b.image}
                  alt={b.title || "Banner"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                {(b.title || b.discount || b.description) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5 pointer-events-none">
                    {b.title && <p className="text-white text-sm sm:text-base font-bold uppercase tracking-wide truncate">{b.title}</p>}
                    {b.discount && <p className="text-white/90 text-xs sm:text-sm font-semibold mt-0.5">{b.discount}</p>}
                    {b.description && <p className="text-white/80 text-xs sm:text-sm mt-0.5 max-w-sm line-clamp-2">{b.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// --------- Template 2: Auto Multi-Carousel (Matches Referral Image) ---------------------------------------------------
// Keeps all banners in ONE single horizontal line with auto-advancing slide,
// side-by-side cards with right-side peek, center pill indicator, and bottom-right round arrow controls.
// Loop buffer ensures continuous cycling with NO blank space at the end.
const Template2 = ({ banners }: TemplateProps) => {
  const isSingle = banners.length === 1;
  const handleBannerClick = useBannerRedirect();

  // Buffer repeated sets (min 21 cards) to guarantee seamless infinite looping without gaps
  const repeatSets = Math.max(5, Math.ceil(21 / banners.length));
  const repeatedBanners = Array.from({ length: repeatSets }, () => banners).flat();
  const initialIndex = Math.floor(repeatSets / 2) * banners.length;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const activeDot = ((currentIndex % banners.length) + banners.length) % banners.length;

  const getOffset = (idx: number) => {
    if (!trackRef.current) return 0;
    const children = trackRef.current.children;
    if (children.length > idx && children.length > 0) {
      const first = children[0] as HTMLElement;
      const target = children[idx] as HTMLElement;
      if (first && target) {
        return target.offsetLeft - first.offsetLeft;
      }
    }
    return 0;
  };

  // Initial mount & resize listener: position at initialIndex with transition disabled
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsTransitioning(false);

    const updateOffset = () => {
      setTranslateX(getOffset(initialIndex));
    };

    updateOffset();

    // Enable smooth transitions after the initial position has been established
    const timer = setTimeout(() => {
      setIsTransitioning(true);
    }, 60);

    const handleResize = () => {
      setTranslateX(getOffset(currentIndex));
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [banners.length]);

  // Update translateX whenever currentIndex changes
  useEffect(() => {
    if (!trackRef.current) return;
    setTranslateX(getOffset(currentIndex));
  }, [currentIndex]);

  // Auto-advance carousel every 4.5 seconds
  useEffect(() => {
    if (banners.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length, isHovered]);

  const handlePrev = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === activeDot) return;
    setIsTransitioning(true);
    const diff = targetIndex - activeDot;
    setCurrentIndex((prev) => prev + diff);
  };

  // Silent infinite loop reset when sliding beyond buffer boundaries
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return;
    const len = banners.length;
    if (len <= 1) return;

    const minThreshold = len * 2;
    const maxThreshold = len * (repeatSets - 2);

    if (currentIndex >= maxThreshold) {
      const newIndex = currentIndex - len;
      setIsTransitioning(false);
      setCurrentIndex(newIndex);
      setTranslateX(getOffset(newIndex));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    } else if (currentIndex < minThreshold) {
      const newIndex = currentIndex + len;
      setIsTransitioning(false);
      setCurrentIndex(newIndex);
      setTranslateX(getOffset(newIndex));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsHovered(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
    setIsHovered(false);
  };

  if (isSingle) {
    return (
      <section className="w-full py-3 sm:py-5 bg-white">
        <div className="w-full px-3 sm:px-5 lg:px-6">
          <div
            onClick={() => (banners[0].link ? handleBannerClick(banners[0].link) : undefined)}
            className={`relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9] sm:aspect-[2/1] lg:aspect-[2.4/1] max-h-[360px] w-full shadow-sm group ${banners[0].link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
          >
            <img
              src={banners[0].image}
              alt={banners[0].title || "Banner"}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {(banners[0].title || banners[0].discount || banners[0].description) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10">
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
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-5 sm:py-7 bg-white overflow-hidden">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        {/* Single-line Horizontal Track: starts with space in front & end, infinite loop with no empty gap */}
        <div
          className="overflow-hidden w-full select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={trackRef}
            onTransitionEnd={handleTransitionEnd}
            className="flex will-change-transform"
            style={{
              transform: `translateX(-${translateX}px)`,
              transition: isTransitioning
                ? "transform 600ms cubic-bezier(0.25, 1, 0.5, 1)"
                : "none",
            }}
          >
            {repeatedBanners.map((b, i) => (
              <div
                key={`t2-banner-${b.id}-${i}`}
                onClick={() => (b.link ? handleBannerClick(b.link) : undefined)}
                className={`flex-none shrink-0 w-[84%] sm:w-[58%] md:w-[44%] lg:w-[35.5%] aspect-[2/1] max-h-[340px] mr-3 sm:mr-4 lg:mr-5 rounded-2xl overflow-hidden bg-gray-100 shadow-sm relative group ${b.link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
              >
                <img
                  src={b.image}
                  alt={b.title || "Banner"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                {(b.title || b.discount || b.description) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4 sm:p-5 lg:p-6 pointer-events-none">
                    {b.title && (
                      <h3 className="text-white text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wide truncate">
                        {b.title}
                      </h3>
                    )}
                    {b.discount && (
                      <p className="text-white/95 text-[11px] sm:text-xs font-semibold mt-0.5">
                        {b.discount}
                      </p>
                    )}
                    {b.description && (
                      <p className="text-white/75 text-[10px] sm:text-xs mt-0.5 line-clamp-1 max-w-xs">
                        {b.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Controls: Center Dynamic Pill + Right Round Arrow Buttons */}
        <div className="flex items-center justify-between mt-3.5 sm:mt-4">
          {/* Left balance spacer */}
          <div className="w-20 hidden sm:block" />

          {/* Center Dynamic Pagination Pill & Dots matching referral image */}
          <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
            {banners.map((_, i) =>
              i === activeDot ? (
                <div
                  key={i}
                  className="bg-[#1e1b2e] text-white text-[10px] sm:text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs tracking-widest min-w-[42px] text-center"
                >
                  {activeDot + 1}/{banners.length}
                </div>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDotClick(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="w-1.5 h-1.5 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors cursor-pointer"
                />
              )
            )}
          </div>

          {/* Right Purple Round Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous banner"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#4a1d6e] text-white hover:bg-[#381454] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next banner"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#4a1d6e] text-white hover:bg-[#381454] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// --------- Template 3: Full-bleed Slider ------------------------------------------------------------------------------------------------------------------------------------------
// One large banner at a time, auto-advancing, with dot indicators and manual arrows.
const Template3 = ({ banners }: TemplateProps) => {
  const [index, setIndex] = useState(0);
  const handleBannerClick = useBannerRedirect();

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
        <div
          onClick={() => (banner.link ? handleBannerClick(banner.link) : undefined)}
          className={`relative w-full aspect-[16/9] sm:aspect-[1.9/1] lg:aspect-[2.1/1] max-h-[520px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm ${banner.link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
        >
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

// --------- Template 4: Split Showcase ------------------------------------------------------------------------------------------------------------------------------------------------
// Displays in ONE single horizontal line as 2 splits (side-by-side).
// If more than 2 banners are present, navigation arrows allow sliding through them without wrapping.
const Template4 = ({ banners }: TemplateProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(2);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const handleBannerClick = useBannerRedirect();

  const isSingle = banners.length === 1;

  useEffect(() => {
    const updateCardsPerView = () => {
      setCardsPerView(window.innerWidth >= 640 ? 2 : 1);
    };
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  const maxIndex = Math.max(0, banners.length - cardsPerView);

  const getOffset = (idx: number) => {
    if (!trackRef.current) return 0;
    const children = trackRef.current.children;
    if (children.length > idx && children.length > 0) {
      const first = children[0] as HTMLElement;
      const target = children[idx] as HTMLElement;
      if (first && target) {
        return target.offsetLeft - first.offsetLeft;
      }
    }
    return 0;
  };

  useEffect(() => {
    if (!trackRef.current) return;
    const update = () => {
      setTranslateX(getOffset(currentIndex));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [currentIndex, cardsPerView, banners]);

  // Keep currentIndex bounded when resizing changes cardsPerView
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Auto-advance every 5 seconds if there are more banners than visible
  useEffect(() => {
    if (banners.length <= cardsPerView || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, cardsPerView, maxIndex, isHovered]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsHovered(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
    setIsHovered(false);
  };

  const showArrows = banners.length > cardsPerView;

  if (isSingle) {
    return (
      <section className="w-full py-3 sm:py-5 bg-white">
        <div className="w-full px-3 sm:px-5 lg:px-6">
          <div
            onClick={() => (banners[0].link ? handleBannerClick(banners[0].link) : undefined)}
            className={`relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9] sm:aspect-[2/1] lg:aspect-[2.4/1] max-h-[360px] w-full shadow-sm group ${banners[0].link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
          >
            <img
              src={banners[0].image}
              alt={banners[0].title || "Banner"}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {(banners[0].title || banners[0].discount || banners[0].description) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex flex-col justify-end p-5 sm:p-7">
                {banners[0].title && (
                  <h3 className="text-white text-base sm:text-xl font-bold tracking-tight">
                    {banners[0].title}
                  </h3>
                )}
                {banners[0].discount && (
                  <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1">
                    {banners[0].discount}
                  </p>
                )}
                {banners[0].description && (
                  <p className="text-white/70 text-xs mt-1 max-w-sm line-clamp-2">
                    {banners[0].description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-3 sm:py-5 bg-white">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div
          className="relative group select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Viewport: keeps all cards in ONE single horizontal line */}
          <div className="overflow-hidden w-full rounded-2xl">
            <div
              ref={trackRef}
              className="flex gap-3 sm:gap-5 transition-transform duration-500 ease-out will-change-transform"
              style={{
                transform: `translateX(-${translateX}px)`,
              }}
            >
              {banners.map((b) => (
                <div
                  key={b.id}
                  onClick={() => (b.link ? handleBannerClick(b.link) : undefined)}
                  className={`flex-none shrink-0 w-full sm:w-[calc(50%-0.625rem)] aspect-[16/9] sm:aspect-[1.85/1] md:aspect-[2/1] lg:aspect-[2.2/1] max-h-[250px] sm:max-h-[290px] md:max-h-[320px] lg:max-h-[340px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm relative group ${b.link ? "cursor-pointer hover:shadow-md" : "cursor-default"}`}
                >
                  <img
                    src={b.image}
                    alt={b.title || "Banner"}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                  {(b.title || b.discount || b.description) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-5 sm:p-7 pointer-events-none">
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

          {/* Left and Right Navigation Arrows */}
          {showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous split banners"
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 hover:bg-white shadow-lg border border-gray-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next split banners"
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 hover:bg-white shadow-lg border border-gray-100 transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Pagination Dots */}
        {showArrows && maxIndex > 0 && (
          <div className="flex justify-center items-center gap-1.5 mt-3.5 sm:mt-4">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to split slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentIndex ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
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
            link: b.link,
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
