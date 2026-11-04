// src/components/DiscountPage.tsx
//
// Template-aware banner section for DISCOUNT_PANEL items.
// All templates match the high-end luxury banner aesthetic of Template 1:
// 1: Split Grid (Dual Banner Showcase - 2 wide banners side-by-side)
// 2: Triple Showcase (3 wide banners side-by-side in a single line)
// 3: Cinematic Panorama (Full-width wide editorial banner carousel)

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../utils/api";
import { formatDiscountBadge } from "../utils/product";

// Fallback local images used when no banners are configured in the backend
import image20 from "../assets/1020.jpeg";
import image21 from "../assets/1021.jpeg";
import image22 from "../assets/1022.jpeg";
import image23 from "../assets/1023.jpeg";

interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string | null;
  discount: string | null;
  description: string | null;
}

const FALLBACK_BANNERS: Banner[] = [
  { id: "f1", title: "Women's Collection", image: image20, discount: "20% OFF", description: "Elegant kurtas and dresses designed for comfort, grace, and everyday style" },
  { id: "f2", title: "Mohey Women's Festive Saree", image: image21, discount: "20% OFF", description: "Smart casuals and everyday essentials crafted for comfort and confidence." },
  { id: "f3", title: "Moda Women's Rapido Sarees", image: image23, discount: "25% OFF", description: null },
  { id: "f4", title: "Featured Collection", image: image22, discount: "25% OFF", description: "Our most-loved designs chosen for comfort." },
];

const FALLBACK_HEADER = {
  title: "SHOP NOW AND SAVE 30%",
  subtitle: "Grace at a Great Price! Sarees on Discount",
};

interface TemplateProps {
  banners: Banner[];
  header: typeof FALLBACK_HEADER;
  handleShopNow: (link?: string | null) => void;
}

// ─── Section Header ────────────────────────────────────────────────────────
// Left-aligned header matching CategorySection style (no subtitle, no underline).
const DiscountHeader = ({ header }: { header: typeof FALLBACK_HEADER }) => {
  const hasTitle = Boolean(header?.title && header.title.trim());
  if (!hasTitle) return null;

  return (
    <div className="flex items-baseline justify-between mb-6 sm:mb-8 pb-3 border-b border-gray-100">
      <div>
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-950 font-sans uppercase">
          {header.title}
        </h2>
      </div>
    </div>
  );
};

// ─── Shared Reusable Banner Card ───────────────────────────────────────────
// Entire image card is clickable to link if present (no extra "Shop Now" text).
// Elegant text overlay displays when title/discount/description are entered;
// pure graphic banner displays unadorned when text fields are omitted.
interface BannerCardProps {
  banner: Banner;
  className?: string;
  imageClassName?: string;
  aspectRatioClass?: string;
  handleShopNow: (link?: string | null) => void;
}

const BannerCard: React.FC<BannerCardProps> = ({
  banner,
  className = "",
  imageClassName = "",
  aspectRatioClass = "aspect-[16/9] sm:aspect-[16/10]",
  handleShopNow,
}) => {
  const hasLink = Boolean(banner.link && banner.link.trim());
  const hasText = Boolean(banner.title || banner.discount || banner.description);

  return (
    <div
      onClick={() => hasLink && handleShopNow(banner.link)}
      className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm group select-none ${aspectRatioClass} ${
        hasLink ? "cursor-pointer hover:shadow-md" : "cursor-default"
      } ${className}`}
    >
      <img
        src={banner.image}
        alt={banner.title || "Banner"}
        className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02] ${imageClassName}`}
        draggable={false}
      />

      {hasText && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-5 sm:p-7 md:p-8 text-white pointer-events-none">
          {banner.discount && (
            <span className="inline-block self-start text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-300 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-amber-300/30 mb-2 shadow-xs">
              {formatDiscountBadge(banner.discount)}
            </span>
          )}
          {banner.title && (
            <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white drop-shadow-md">
              {banner.title}
            </h3>
          )}
          {banner.description && (
            <p className="text-xs sm:text-sm text-gray-200 italic mt-1 line-clamp-2 max-w-xs sm:max-w-sm drop-shadow-sm">
              {banner.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Template 1: Split Grid (Dual Banner Showcase) ─────────────────────────
// Displays 2 wide banners side-by-side in one line, starting with clean margin at the start.
// If more than 2 banners are present, smooth navigation arrows allow sliding through them without wrapping.
const Template1 = ({ banners, header, handleShopNow }: TemplateProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(2);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  if (banners.length === 0) return null;

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

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Auto-advance if more banners than visible
  useEffect(() => {
    if (banners.length <= cardsPerView || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5500);
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

  // Single full-width banner
  if (isSingle) {
    return (
      <section className="w-full py-4 sm:py-6 bg-transparent">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <DiscountHeader header={header} />
          <BannerCard
            banner={banners[0]}
            className="w-full"
            aspectRatioClass="w-full aspect-[2/1] sm:aspect-[2.4/1] md:aspect-[2.8/1] lg:aspect-[3.2/1] max-h-[450px]"
            handleShopNow={handleShopNow}
          />
        </div>
      </section>
    );
  }

  // 2 or more banners: Full 2-split banner showcase
  return (
    <section className="w-full py-4 sm:py-6 bg-transparent">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <DiscountHeader header={header} />
        <div
          className="relative group/track select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Outer floating side arrow buttons */}
          {showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous banners"
                className="flex absolute left-1 sm:-left-3 lg:-left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next banners"
                className="flex absolute right-1 sm:-right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

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
                  className="flex-none shrink-0 w-full sm:w-[calc(50%-0.625rem)]"
                >
                  <BannerCard
                    banner={b}
                    className="w-full"
                    aspectRatioClass="w-full aspect-[16/9] sm:aspect-[1.85/1] lg:aspect-[2.1/1] max-h-[290px] sm:max-h-[330px] lg:max-h-[350px]"
                    handleShopNow={handleShopNow}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Template 2: Triple Showcase (3 Wide Banners in 1 Single Row) ──────────
// 3 wide banner columns side-by-side in one line across desktop.
// If more than 3 banners are present, smooth navigation arrows allow sliding through them without wrapping.
const Template2 = ({ banners, header, handleShopNow }: TemplateProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  if (banners.length === 0) return null;

  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth >= 1024) {
        setCardsPerView(3);
      } else if (window.innerWidth >= 640) {
        setCardsPerView(2);
      } else {
        setCardsPerView(1);
      }
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

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Auto-advance if more banners than visible
  useEffect(() => {
    if (banners.length <= cardsPerView || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5500);
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

  return (
    <section className="w-full py-4 sm:py-6 bg-transparent">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <DiscountHeader header={header} />
        <div
          className="relative group/track select-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Outer floating side arrow buttons */}
          {showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous banners"
                className="flex absolute left-1 sm:-left-3 lg:-left-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next banners"
                className="flex absolute right-1 sm:-right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-20 h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

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
                  className="flex-none shrink-0 w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.833rem)]"
                >
                  <BannerCard
                    banner={b}
                    className="w-full"
                    aspectRatioClass="w-full aspect-[16/9] sm:aspect-[1.85/1] lg:aspect-[1.95/1] max-h-[260px] sm:max-h-[300px] lg:max-h-[320px]"
                    handleShopNow={handleShopNow}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Template 3: Cinematic Panorama (Full-Width Wide Editorial Banner) ─────
// High-impact panoramic banner carousel across the full width of the container.
// Fills 100% of the available width with zero side cutoff.
const Template3 = ({ banners, header, handleShopNow }: TemplateProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (banners.length === 0) return null;

  const total = banners.length;

  useEffect(() => {
    if (currentIndex >= total) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  // Auto-advance every 5.5s
  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= total - 1 ? 0 : prev + 1));
    }, 5500);
    return () => clearInterval(interval);
  }, [total, isHovered]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? total - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= total - 1 ? 0 : prev + 1));
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

  const activeBanner = banners[currentIndex] || banners[0];

  return (
    <section className="w-full py-4 sm:py-6 bg-transparent">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <DiscountHeader header={header} />
        <div
          className="relative group select-none w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Floating outer navigation arrows */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous banner"
                className="hidden md:flex absolute -left-3 lg:-left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next banner"
                className="hidden md:flex absolute -right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Full-Width Panoramic Banner */}
          <div className="w-full overflow-hidden rounded-2xl shadow-sm transition-opacity duration-500">
            <BannerCard
              key={activeBanner.id}
              banner={activeBanner}
              className="w-full"
              aspectRatioClass="w-full aspect-[2/1] sm:aspect-[2.4/1] md:aspect-[2.8/1] lg:aspect-[3.2/1] xl:aspect-[3.5/1] max-h-[320px] sm:max-h-[380px] md:max-h-[420px] lg:max-h-[450px]"
              handleShopNow={handleShopNow}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Main DiscountPage Component ───────────────────────────────────────────
const DiscountPage = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [header, setHeader] = useState(FALLBACK_HEADER);
  const [loaded, setLoaded] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(1);

  useEffect(() => {
    api
      .get("/home-banners?type=DISCOUNT_PANEL")
      .then(({ data }) => {
        const activeBanners: Banner[] = (data.banners ?? [])
          .filter((b: any) => b.isActive)
          .map((b: any) => ({
            id: b.id,
            title: b.title,
            image: b.image,
            link: b.link,
            discount: b.discount,
            description: b.description,
          }));
        setBanners(activeBanners);
        if (data.discountSection) {
          setHeader(data.discountSection);
        }
      })
      .catch(() => {
        setBanners([]);
      })
      .finally(() => setLoaded(true));

    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (typeof data?.discountTemplate === "number") {
          setActiveTemplate(data.discountTemplate);
        }
      })
      .catch(() => { });
  }, []);

  const handleShopNow = (link?: string | null) => {
    if (!link || !link.trim()) return;
    const trimmed = link.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      window.open(trimmed, "_blank", "noopener,noreferrer");
    } else {
      navigate(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
    }
  };

  if (!loaded) return null; // avoid layout shift while loading

  if (banners.length === 0) return null;

  switch (activeTemplate) {
    case 2:
      return <Template2 banners={banners} header={header} handleShopNow={handleShopNow} />;
    case 3:
    case 4:
      return <Template3 banners={banners} header={header} handleShopNow={handleShopNow} />;
    default:
      return <Template1 banners={banners} header={header} handleShopNow={handleShopNow} />;
  }
};

export default DiscountPage;
