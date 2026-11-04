// src/components/FeaturedProducts.tsx
//
// Template-aware like HeroSection.tsx — activeTemplate picks which hand-built layout
// renders the SAME featured-product list (see companySettings.controller.ts's
// SECTION_TEMPLATE_KEYS: this section has no per-template content, only layout).
// Template1 below is byte-for-byte the horizontal-scroll carousel that existed before
// this split. Unlike the other three sections, the product list itself is prop-driven
// (Customerdashboard.tsx fetches it) — only the template number is self-fetched here, so
// the parent needs no changes.

import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { resolveAssetUrl } from "../utils/category";
import { calculateDiscountedPrice } from "../utils/product";
import ProductCard from "../cart/ProductCard";
import api from "../utils/api";

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: { name: string };
  discount?: number;
}

export interface FeaturedProductsProps {
  featuredProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  sectionTitle?: string;
  sectionSubtitle?: string;
  viewAllLink?: string;
  template?: number;
}

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://via.placeholder.com/300?text=No+Image";
  return resolveAssetUrl(imagePath) ?? "https://via.placeholder.com/300?text=No+Image";
};

// Shared section header — left-aligned heading matching Tribal Ornaments referral image
const SectionHeader = ({
  sectionTitle = "Featured Collections",
  sectionSubtitle,
  showSeeAll,
  viewAllLink,
}: {
  sectionTitle?: string;
  sectionSubtitle?: string;
  showSeeAll: boolean;
  viewAllLink?: string;
}) => (
  <div className="flex items-baseline justify-between mb-6 sm:mb-8 pb-3 border-b border-gray-100">
    <div>
      <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-950 font-sans uppercase">
        {sectionTitle}
      </h2>
      {sectionSubtitle && (
        <p className="text-gray-500 text-xs sm:text-sm mt-1 font-sans">
          {sectionSubtitle}
        </p>
      )}
    </div>

    {showSeeAll && (
      <Link
        to={viewAllLink || "/products"}
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-black transition-colors group shrink-0"
      >
        <span>View All</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    )}
  </div>
);

const Template1 = ({
  featuredProducts,
  productsLoading,
  productsError,
  sectionTitle = "Featured Collections",
  sectionSubtitle,
  viewAllLink,
}: FeaturedProductsProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  // --- Scroll Logic ---
  useEffect(() => {
    const checkScrollable = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setIsScrollable(container.scrollWidth > container.clientWidth);
      }
    };
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, [featuredProducts]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount =
        direction === "left"
          ? -scrollContainerRef.current.clientWidth * 0.8
          : scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // --- Loading Skeleton ---
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 py-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-full animate-pulse">
          <div className="w-full aspect-square bg-stone-100 rounded-2xl mb-3 border border-gray-100" />
          <div className="h-3.5 bg-stone-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-white py-12 relative overflow-hidden font-sans">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 relative z-10">
        {/* --- Header Section --- */}
        <SectionHeader
          sectionTitle={sectionTitle}
          sectionSubtitle={sectionSubtitle}
          showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0}
          viewAllLink={viewAllLink}
        />

        {/* --- Loading State --- */}
        {productsLoading && <LoadingSkeleton />}

        {/* --- Error State --- */}
        {!productsLoading && productsError && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-light text-sm">
              Could not load featured products.
            </p>
          </div>
        )}

        {/* --- Products Available --- */}
        {!productsLoading && !productsError && featuredProducts.length > 0 && (
          featuredProducts.length <= 4 ? (
            /* Exactly 4 Products: Full 4-Column Grid Matching Referral Image */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {featuredProducts.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* More than 4 Products: 4-Across-Desktop Carousel Slider */
            <div className="relative group/carousel">
              {/* Navigation Arrows */}
              {isScrollable && (
                <>
                  <button
                    onClick={() => scroll("left")}
                    className="absolute -left-3 top-[38%] -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-800 hover:bg-black hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => scroll("right")}
                    className="absolute -right-3 top-[38%] -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/95 shadow-md border border-gray-200 text-gray-800 hover:bg-black hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Scrollable Container with large 4-column-proportioned cards on desktop */}
              <div
                ref={scrollContainerRef}
                className="
                  flex overflow-x-auto scroll-smooth snap-x snap-mandatory
                  py-2 pb-6
                  gap-x-4 sm:gap-x-6 lg:gap-x-8
                "
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {featuredProducts.map((product: Product) => (
                  <div
                    key={product.id}
                    className="w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.5rem)] shrink-0 snap-start"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* --- Empty State --- */}
        {!productsLoading &&
          !productsError &&
          featuredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 font-light text-sm">
                New collections arriving soon.
              </p>
            </div>
          )}
      </div>
    </section>
  );
};

// ─── Template 2: Static Grid (Matches Tribal Ornaments 4-Column Layout) ───────────
const Template2 = ({ featuredProducts, productsLoading, productsError, sectionTitle, sectionSubtitle, viewAllLink }: FeaturedProductsProps) => (
  <section className="bg-white py-12 font-sans">
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
      <SectionHeader sectionTitle={sectionTitle} sectionSubtitle={sectionSubtitle} showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0} viewAllLink={viewAllLink} />
      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-square bg-gray-100 rounded-2xl mb-3"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : productsError ? (
        <div className="text-center py-16"><p className="text-gray-400 font-light text-sm">Could not load featured products.</p></div>
      ) : featuredProducts.length === 0 ? (
        <div className="text-center py-16"><p className="text-gray-400 font-light text-sm">New collections arriving soon.</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  </section>
);

const ProductPrice = ({ product }: { product: Product }) =>
  product.discount && product.discount > 0 ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400 line-through">
        ₹ {Math.round(Number(product.price)).toLocaleString("en-IN")}
      </span>
      <span className="text-sm font-medium text-white">
        From ₹ {Math.round(calculateDiscountedPrice(product.price, product.discount)).toLocaleString("en-IN")}
      </span>
    </div>
  ) : (
    <span className="text-sm font-medium text-white">
      ₹ {Math.round(Number(product.price)).toLocaleString("en-IN")}
    </span>
  );

// ─── Template 3: Spotlight Carousel (Editorial Split Showcase) ──────────────────
// Features 1 product in full natural portrait (3:4) orientation on one side with
// full headroom (no heads/pleats cropped) alongside editorial details and thumbnail selector rail.
const Template3 = ({
  featuredProducts,
  productsLoading,
  productsError,
  sectionTitle,
  sectionSubtitle,
  viewAllLink,
}: FeaturedProductsProps) => {
  const [index, setIndex] = useState(0);
  const active = featuredProducts[index];

  return (
    <section className="bg-white py-6 sm:py-8 font-sans">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <SectionHeader
          sectionTitle={sectionTitle}
          sectionSubtitle={sectionSubtitle}
          showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0}
          viewAllLink={viewAllLink}
        />

        {productsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-gray-50/70 rounded-3xl p-5 sm:p-6 animate-pulse">
            <div className="lg:col-span-5 aspect-[3/4] max-h-[420px] bg-gray-200 rounded-2xl w-full" />
            <div className="lg:col-span-7 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-10 bg-gray-200 rounded w-1/2 mt-4" />
            </div>
          </div>
        ) : productsError ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-light">Could not load featured products.</p>
          </div>
        ) : !active ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-light">New collections arriving soon.</p>
          </div>
        ) : (
          <div className="bg-stone-50/70 border border-stone-200/80 rounded-3xl overflow-hidden p-4 sm:p-6 lg:p-7 shadow-xs transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Left Column: Bounded Full Portrait Image (3:4 ratio, capped at 430px height) */}
              <div className="lg:col-span-5 flex items-center justify-center lg:justify-start">
                <Link
                  to={`/products/${active.id}`}
                  className="group block relative h-[360px] sm:h-[400px] lg:h-[430px] aspect-[3/4] rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-500"
                >
                  <img
                    src={getImageUrl(active.image)}
                    alt={active.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {active.discount && active.discount > 0 && (
                    <span className="absolute top-3 left-3 bg-black/85 backdrop-blur-md text-amber-300 text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300/30 shadow-sm">
                      {Math.round(active.discount)}% OFF
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </Link>
              </div>

              {/* Right Column: Editorial Product Details & Interactive Thumbnail Rail */}
              <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4 lg:py-1">
                <div className="space-y-3 sm:space-y-3.5">
                  {active.category?.name && (
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                      {active.category.name}
                    </p>
                  )}

                  <Link to={`/products/${active.id}`} className="group block">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-gray-950 tracking-tight leading-snug group-hover:text-indigo-900 transition-colors line-clamp-2">
                      {active.name}
                    </h3>
                  </Link>

                  {/* Price display */}
                  <div>
                    {active.discount && active.discount > 0 ? (
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-xl sm:text-2xl font-bold text-gray-950">
                          ₹ {Math.round(calculateDiscountedPrice(active.price, active.discount)).toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          ₹ {Math.round(Number(active.price)).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Save ₹ {Math.round(Number(active.price) - calculateDiscountedPrice(active.price, active.discount)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-gray-950">
                        ₹ {Math.round(Number(active.price)).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* Action CTA */}
                  <div className="pt-1">
                    <Link
                      to={`/products/${active.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
                    >
                      <span>View Product</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Thumbnails to Switch Between Spotlight Products */}
                {featuredProducts.length > 1 && (
                  <div className="pt-4 border-t border-stone-200/80">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      More in this Collection ({index + 1} of {featuredProducts.length}):
                    </p>
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                      {featuredProducts.map((product, i) => {
                        const isCurrent = i === index;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setIndex(i)}
                            className={`group/thumb relative shrink-0 w-14 sm:w-16 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              isCurrent
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-md scale-105"
                                : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400"
                            }`}
                          >
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                            />
                            {isCurrent && (
                              <div className="absolute inset-x-0 bottom-0 bg-indigo-600 text-white text-[8px] font-bold text-center py-0.5">
                                Active
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Template 4: Editorial List ─────────────────────────────────────────────────
// Vertical stacked rows with a large image and more room for product info — a
// magazine-style treatment rather than a compact grid/scroll of small cards.
const Template4 = ({ featuredProducts, productsLoading, productsError, sectionTitle, sectionSubtitle, viewAllLink }: FeaturedProductsProps) => (
  <section className="bg-white py-12 font-sans">
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
      <SectionHeader sectionTitle={sectionTitle} sectionSubtitle={sectionSubtitle} showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0} viewAllLink={viewAllLink} />
      {productsLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-6 animate-pulse">
              <div className="w-40 h-40 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 py-2"><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-3 bg-gray-200 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : productsError ? (
        <div className="text-center py-20"><p className="text-gray-400 font-light">Could not load featured products.</p></div>
      ) : featuredProducts.length === 0 ? (
        <div className="text-center py-20"><p className="text-gray-400 font-light">New collections arriving soon.</p></div>
      ) : (
        <div className="divide-y divide-gray-100">
          {featuredProducts.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} className="group flex items-center gap-6 py-6">
              <div className="relative overflow-hidden w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gray-100 shrink-0">
                <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{product.category?.name || "Collection"}</p>
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 truncate mb-2">{product.name}</h3>
                <div className="flex items-center gap-1.5"><ProductPrice product={product} /></div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-300 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black" />
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

const FeaturedProducts = ({ template, ...props }: FeaturedProductsProps) => {
  const [activeTemplate, setActiveTemplate] = useState<number>(template || 1);

  useEffect(() => {
    if (typeof template === "number") {
      setActiveTemplate(template);
      return;
    }
    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (typeof data?.featuredTemplate === "number") {
          setActiveTemplate(data.featuredTemplate);
        }
      })
      .catch(() => { });
  }, [template]);

  switch (activeTemplate) {
    case 2:
      return <Template2 {...props} />;
    case 3:
      return <Template3 {...props} />;
    case 4:
      return <Template4 {...props} />;
    default:
      return <Template1 {...props} />;
  }
};

export default FeaturedProducts;
