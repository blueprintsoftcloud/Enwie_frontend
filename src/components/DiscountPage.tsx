// src/components/DiscountPage.tsx
//
// Template-aware like HeroSection.tsx — activeTemplate picks which hand-built layout
// renders the SAME DISCOUNT_PANEL rows (see companySettings.controller.ts's
// SECTION_TEMPLATE_KEYS: this section has no per-template content, only layout).
// Template1 below is byte-for-byte the left/right split-grid layout that existed before
// this split.

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

const ShopNowButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="px-6 py-2 border border-white text-white text-sm font-semibold uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-300"
  >
    Shop Now
  </button>
);

interface TemplateProps {
  banners: Banner[];
  header: typeof FALLBACK_HEADER;
  handleShopNow: () => void;
}

const Template1 = ({ banners, header, handleShopNow }: TemplateProps) => {
  if (banners.length <= 2) {
    return (
      <div className="bg-white font-sans text-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <DiscountHeader header={header} />
          <div className={`grid gap-6 ${banners.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {banners.map((panel) => (
              <div
                key={panel.id}
                className="relative group overflow-hidden h-[420px] sm:h-[500px] rounded-2xl shadow-sm"
              >
                <img
                  src={panel.image}
                  alt={panel.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 text-white">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2">
                    {panel.title}
                  </h3>
                  {panel.discount && (
                    <div className="text-4xl sm:text-5xl font-extrabold mb-3 text-white tracking-tight">
                      {formatDiscountBadge(panel.discount)}
                    </div>
                  )}
                  {panel.description && (
                    <p className="text-gray-200 text-sm mb-5 max-w-md line-clamp-2">
                      {panel.description}
                    </p>
                  )}
                  <ShopNowButton onClick={handleShopNow} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // First 2 panels fill the large left slots (showcase)
  // Panels 3 & 4 fill the right stacked column (up to 2 cards)
  // Panels 5+ flow into a clean, balanced responsive grid below
  const leftPanels = banners.slice(0, 2);
  const rightStacked = banners.slice(2, 4);
  const extraPanels = banners.slice(4);

  return (
    <div className="bg-white font-sans text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <DiscountHeader header={header} />

        {/* --- MAIN SHOWCASE GRID (Top 2 to 4 panels) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left large showcase panels (positions 0, 1) */}
          {leftPanels.map((panel) => (
            <div
              key={panel.id}
              className="relative group overflow-hidden h-[420px] sm:h-[500px] lg:h-[560px] rounded-2xl shadow-sm"
            >
              <img
                src={panel.image}
                alt={panel.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2">
                  {panel.title}
                </h3>
                {panel.discount && (
                  <div className="text-4xl sm:text-5xl font-extrabold mb-3 text-white tracking-tight">
                    {formatDiscountBadge(panel.discount)}
                  </div>
                )}
                {panel.description && (
                  <p className="text-gray-200 text-sm mb-5 max-w-sm line-clamp-2">
                    {panel.description}
                  </p>
                )}
                <ShopNowButton onClick={handleShopNow} />
              </div>
            </div>
          ))}

          {/* Right stacked column (positions 2, 3) */}
          {rightStacked.length > 0 && (
            <div className="flex flex-col gap-6 h-[420px] sm:h-[500px] lg:h-[560px]">
              {rightStacked.map((panel, i) => (
                <div
                  key={panel.id}
                  className="relative group overflow-hidden flex-1 w-full rounded-2xl shadow-sm min-h-[200px]"
                >
                  <img
                    src={panel.image}
                    alt={panel.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div
                    className={`absolute inset-0 flex flex-col justify-end p-6 text-white ${
                      i % 2 === 1 ? "items-end text-right" : "items-start text-left"
                    }`}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1">
                      {panel.title}
                    </h3>
                    {panel.discount && (
                      <div className="text-3xl font-extrabold mb-2 text-white">
                        {formatDiscountBadge(panel.discount)}
                      </div>
                    )}
                    {panel.description && (
                      <p className="text-gray-200 text-xs mb-3 max-w-[240px] line-clamp-2">
                        {panel.description}
                      </p>
                    )}
                    <ShopNowButton onClick={handleShopNow} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- ADDITIONAL PANELS (Positions 4+) --- */}
        {extraPanels.length > 0 && (
          <div
            className={`grid gap-6 mt-6 ${
              extraPanels.length === 1
                ? "grid-cols-1"
                : extraPanels.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {extraPanels.map((panel) => (
              <div
                key={panel.id}
                className="relative group overflow-hidden rounded-2xl h-[280px] sm:h-[320px] shadow-sm"
              >
                <img
                  src={panel.image}
                  alt={panel.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {panel.title}
                  </h3>
                  {panel.discount && (
                    <div className="text-3xl font-extrabold mb-2 text-white">
                      {formatDiscountBadge(panel.discount)}
                    </div>
                  )}
                  {panel.description && (
                    <p className="text-gray-200 text-xs mb-4 max-w-sm line-clamp-2">
                      {panel.description}
                    </p>
                  )}
                  <ShopNowButton onClick={handleShopNow} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Shared header block — every new template below uses the identical header, only the
// panel grid underneath differs.
const DiscountHeader = ({ header }: { header: typeof FALLBACK_HEADER }) => (
  <div className="mb-10">
    <h4 className="text-[var(--theme-accent)] font-bold uppercase tracking-wider text-sm mb-2">
      Discount
    </h4>
    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{header.title}</h2>
    <p className="text-gray-500 max-w-xl text-lg">{header.subtitle}</p>
  </div>
);

// ─── Template 2: Masonry ────────────────────────────────────────────────────────
// Balanced-height columns in a modern masonry grid layout — organic, editorial feel
// with zero awkward empty bottom column holes regardless of item count.
const Template2 = ({ banners, header, handleShopNow }: TemplateProps) => {
  // Round-robin distribution into 3 columns for desktop, 2 columns for tablet
  const col3 = [
    banners.filter((_, i) => i % 3 === 0),
    banners.filter((_, i) => i % 3 === 1),
    banners.filter((_, i) => i % 3 === 2),
  ];

  return (
    <div className="bg-white font-sans text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <DiscountHeader header={header} />

        {/* Desktop 3-Column Balanced Masonry */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-start">
          {col3.map((colBanners, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-6">
              {colBanners.map((panel, i) => (
                <div
                  key={panel.id}
                  className="relative group overflow-hidden rounded-2xl shadow-sm border border-gray-100/80 transition-all duration-300 hover:shadow-md"
                  style={{ aspectRatio: (colIndex + i) % 2 === 0 ? "4/5" : "1/1" }}
                >
                  <img
                    src={panel.image}
                    alt={panel.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  {panel.discount && (
                    <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                      {formatDiscountBadge(panel.discount)}
                    </span>
                  )}
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1 drop-shadow-sm">{panel.title}</h3>
                    {panel.discount && (
                      <div className="text-2xl sm:text-3xl font-extrabold mb-3 text-white tracking-tight">
                        {formatDiscountBadge(panel.discount)}
                      </div>
                    )}
                    <ShopNowButton onClick={handleShopNow} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile / Tablet 1 or 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-6 items-start">
          {banners.map((panel, i) => (
            <div
              key={panel.id}
              className="relative group overflow-hidden rounded-2xl shadow-sm border border-gray-100/80 transition-all duration-300 hover:shadow-md"
              style={{ aspectRatio: i % 2 === 0 ? "4/5" : "1/1" }}
            >
              <img
                src={panel.image}
                alt={panel.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              {panel.discount && (
                <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                  {formatDiscountBadge(panel.discount)}
                </span>
              )}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 drop-shadow-sm">{panel.title}</h3>
                {panel.discount && (
                  <div className="text-2xl sm:text-3xl font-extrabold mb-3 text-white tracking-tight">
                    {formatDiscountBadge(panel.discount)}
                  </div>
                )}
                <ShopNowButton onClick={handleShopNow} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Template 3: Ticker Strip ───────────────────────────────────────────────────
// A single horizontal row of compact cards with left/right chevron navigation —
// good for a store running many small promotions rather than a few hero-sized ones.
const Template3 = ({ banners, header, handleShopNow }: TemplateProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [banners]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white font-sans text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <DiscountHeader header={header} />

        {/* Carousel / Ticker Wrapper */}
        <div className="relative group/ticker">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-200 hover:bg-black hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl border border-gray-200 hover:bg-black hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {banners.map((panel) => (
              <div
                key={panel.id}
                onClick={handleShopNow}
                className="relative group overflow-hidden rounded-2xl shrink-0 w-60 sm:w-68 aspect-[3/4] cursor-pointer border border-gray-100/80 shadow-xs hover:shadow-md transition-all duration-300"
              >
                <img
                  src={panel.image}
                  alt={panel.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                {panel.discount && (
                  <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                    {formatDiscountBadge(panel.discount)}
                  </span>
                )}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider truncate drop-shadow-sm mb-0.5">{panel.title}</h3>
                  {panel.discount && (
                    <div className="text-xl font-extrabold tracking-tight text-white">{formatDiscountBadge(panel.discount)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleShopNow}
          className="mt-8 px-6 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] text-sm font-semibold uppercase tracking-wider hover:bg-[var(--theme-primary-hover)] transition-colors rounded-xl shadow-md cursor-pointer"
        >
          Shop All Offers
        </button>
      </div>
    </div>
  );
};

// ─── Template 4: Badge Grid ─────────────────────────────────────────────────────
// Uniform square cards, each with a sleek, minimal discount badge in the top-right corner —
// clean, modern catalog-style e-commerce grid.
const Template4 = ({ banners, header, handleShopNow }: TemplateProps) => (
  <div className="bg-white font-sans text-gray-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <DiscountHeader header={header} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {banners.map((panel) => (
          <button
            key={panel.id}
            onClick={handleShopNow}
            className="relative group overflow-hidden rounded-2xl aspect-square text-left cursor-pointer border border-gray-100/80 shadow-xs hover:shadow-md transition-all duration-300"
          >
            <img
              src={panel.image}
              alt={panel.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
            {panel.discount && (
              <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                {formatDiscountBadge(panel.discount)}
              </span>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white text-xs font-bold uppercase tracking-wider truncate drop-shadow-sm">{panel.title}</h3>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

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
        const activeBanners: Banner[] = (data.banners ?? []).filter(
          (b: any) => b.isActive,
        );
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

  const handleShopNow = () => navigate("/products");

  if (!loaded) return null; // avoid layout shift while loading

  if (banners.length === 0) return null;

  switch (activeTemplate) {
    case 2:
      return <Template2 banners={banners} header={header} handleShopNow={handleShopNow} />;
    case 3:
      return <Template3 banners={banners} header={header} handleShopNow={handleShopNow} />;
    case 4:
      return <Template4 banners={banners} header={header} handleShopNow={handleShopNow} />;
    default:
      return <Template1 banners={banners} header={header} handleShopNow={handleShopNow} />;
  }
};

export default DiscountPage;
