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
import api from "../utils/api";

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: { name: string };
  discount?: number;
}

interface FeaturedProductsProps {
  featuredProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://via.placeholder.com/300?text=No+Image";
  return resolveAssetUrl(imagePath) ?? "https://via.placeholder.com/300?text=No+Image";
};

const Template1 = ({
  featuredProducts,
  productsLoading,
  productsError,
  sectionTitle = "Featured Collections",
  sectionSubtitle,
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
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // --- Loading Skeleton ---
  const LoadingSkeleton = () => (
    <div className="flex overflow-x-hidden gap-x-8 pb-12">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-64 shrink-0 animate-pulse">
          <div className="w-full aspect-[3/4] bg-gray-200 rounded-xl mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-white py-20 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[var(--theme-primary)]/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="text-center md:text-left w-full md:w-auto">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
            >
              {sectionTitle}
            </motion.h2>
            {sectionSubtitle && (
              <p className="text-gray-500 text-sm mt-2">{sectionSubtitle}</p>
            )}
            <div className="h-1 w-20 bg-[var(--theme-primary)] mt-4 mx-auto md:mx-0 rounded-full" />
          </div>

          {/* "See All" Link */}
          {!productsLoading && !productsError && featuredProducts.length > 0 && (
            <Link
              to="/products"
              className="hidden md:flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500 hover:text-[var(--theme-primary)] transition-colors group shrink-0 whitespace-nowrap"
            >
              See All
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* --- Loading State --- */}
        {/* ================= CONTENT STATES ================= */}

        {/* --- Loading State --- */}
        {productsLoading && <LoadingSkeleton />}

        {/* --- Error State (text only, no box) --- */}
        {!productsLoading && productsError && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-light">
              Could not load featured products.
            </p>
          </div>
        )}

        {/* --- Products Available --- */}
        {!productsLoading && !productsError && featuredProducts.length > 0 && (
          <div className="relative group/carousel">
            {/* Navigation Arrows */}
            {isScrollable && (
              <>
                <button
                  onClick={() => scroll("left")}
                  className="absolute -left-4 top-[40%] -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 text-gray-800 hover:bg-black hover:text-white transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 translate-x-4 group-hover/carousel:translate-x-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={() => scroll("right")}
                  className="absolute -right-4 top-[40%] -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 text-gray-800 hover:bg-black hover:text-white transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 -translate-x-4 group-hover/carousel:translate-x-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Scrollable Container */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              ref={scrollContainerRef}
              className="
                flex overflow-x-auto scroll-smooth snap-x snap-mandatory
                py-6 pb-10
                -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8
                scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-8
                gap-x-6 sm:gap-x-8
              "
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {featuredProducts.map((product: Product) => (
                <motion.div
                  key={product.id}
                  variants={cardVariants}
                  className="w-60 sm:w-64 shrink-0 snap-start"
                >
                  <Link to={`/products/${product.id}`} className="group block">
                    {/* Image */}
                    <div className="relative overflow-hidden aspect-[3/4] rounded-xl bg-gray-100 border border-gray-100 shadow-sm transition-all duration-500 group-hover:shadow-lg group-hover:-translate-y-1">
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>

                    {/* Info */}
                    <div className="mt-4 px-1">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {product.category?.name || "Collection"}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {product.discount && product.discount > 0 ? (
                            <>
                              <span className="text-sm font-bold text-gray-900">
                                ₹{calculateDiscountedPrice(product.price, product.discount).toFixed(0)}
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                ₹{product.price.toFixed(0)}
                              </span>
                              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">
                                -{product.discount}%
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-gray-900">
                              ₹{product.price.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* --- Empty State (ONLY when no error) --- */}
        {!productsLoading &&
          !productsError &&
          featuredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 font-light">
                New collections arriving soon.
              </p>
            </div>
          )}
      </div>
    </section>
  );
};

// Shared section header — every template below renders the identical title/subtitle/
// underline/"See All" block, only the product layout underneath differs.
const SectionHeader = ({
  sectionTitle = "Featured Collections",
  sectionSubtitle,
  showSeeAll,
}: {
  sectionTitle?: string;
  sectionSubtitle?: string;
  showSeeAll: boolean;
}) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
    <div className="text-center md:text-left w-full md:w-auto">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
      >
        {sectionTitle}
      </motion.h2>
      {sectionSubtitle && <p className="text-gray-500 text-sm mt-2">{sectionSubtitle}</p>}
      <div className="h-1 w-20 bg-[var(--theme-primary)] mt-4 mx-auto md:mx-0 rounded-full" />
    </div>
    {showSeeAll && (
      <Link
        to="/products"
        className="hidden md:flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gray-500 hover:text-[var(--theme-primary)] transition-colors group shrink-0 whitespace-nowrap"
      >
        See All
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    )}
  </div>
);

const ProductPrice = ({ product }: { product: Product }) =>
  product.discount && product.discount > 0 ? (
    <>
      <span className="text-sm font-bold text-gray-900">
        ₹{calculateDiscountedPrice(product.price, product.discount).toFixed(0)}
      </span>
      <span className="text-xs text-gray-400 line-through">₹{product.price.toFixed(0)}</span>
      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">-{product.discount}%</span>
    </>
  ) : (
    <span className="text-sm font-bold text-gray-900">₹{product.price.toFixed(0)}</span>
  );

// ─── Template 2: Static Grid ────────────────────────────────────────────────────
// A calm responsive grid instead of a horizontal scroll — every product visible at
// once, no scroll interaction needed.
const Template2 = ({ featuredProducts, productsLoading, productsError, sectionTitle, sectionSubtitle }: FeaturedProductsProps) => (
  <section className="bg-white py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader sectionTitle={sectionTitle} sectionSubtitle={sectionSubtitle} showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0} />
      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-[3/4] bg-gray-200 rounded-xl mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : productsError ? (
        <div className="text-center py-20"><p className="text-gray-400 font-light">Could not load featured products.</p></div>
      ) : featuredProducts.length === 0 ? (
        <div className="text-center py-20"><p className="text-gray-400 font-light">New collections arriving soon.</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {featuredProducts.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} className="group block">
              <div className="relative overflow-hidden aspect-[3/4] rounded-xl bg-gray-100 border border-gray-100 shadow-sm transition-all duration-500 group-hover:shadow-lg group-hover:-translate-y-1">
                <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
              <div className="mt-4 px-1">
                <h3 className="text-base font-medium text-gray-900 truncate">{product.name}</h3>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider truncate min-w-0">{product.category?.name || "Collection"}</p>
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap"><ProductPrice product={product} /></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

// ─── Template 3: Spotlight Carousel ─────────────────────────────────────────────
// One large product at a time with a thumbnail rail below to jump between them — a
// "product of the moment" treatment rather than a browse-everything grid/scroll.
const Template3 = ({ featuredProducts, productsLoading, productsError, sectionTitle, sectionSubtitle }: FeaturedProductsProps) => {
  const [index, setIndex] = useState(0);
  const active = featuredProducts[index];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader sectionTitle={sectionTitle} sectionSubtitle={sectionSubtitle} showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0} />
        {productsLoading ? (
          <div className="w-full aspect-[16/8] bg-gray-200 rounded-2xl animate-pulse" />
        ) : productsError ? (
          <div className="text-center py-20"><p className="text-gray-400 font-light">Could not load featured products.</p></div>
        ) : !active ? (
          <div className="text-center py-20"><p className="text-gray-400 font-light">New collections arriving soon.</p></div>
        ) : (
          <div>
            <Link to={`/products/${active.id}`} className="group block relative overflow-hidden rounded-2xl bg-gray-100 aspect-[16/9] sm:aspect-[16/7] mb-4">
              <img src={getImageUrl(active.image)} alt={active.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider mb-1">{active.category?.name || "Collection"}</p>
                  <h3 className="text-white text-xl sm:text-2xl font-bold">{active.name}</h3>
                </div>
                <div className="flex items-center gap-1.5"><ProductPrice product={active} /></div>
              </div>
            </Link>
            {featuredProducts.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {featuredProducts.map((product, i) => (
                  <button
                    key={product.id}
                    onClick={() => setIndex(i)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-colors ${i === index ? "border-[var(--theme-primary)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Template 4: Editorial List ─────────────────────────────────────────────────
// Vertical stacked rows with a large image and more room for product info — a
// magazine-style treatment rather than a compact grid/scroll of small cards.
const Template4 = ({ featuredProducts, productsLoading, productsError, sectionTitle, sectionSubtitle }: FeaturedProductsProps) => (
  <section className="bg-white py-20">
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <SectionHeader sectionTitle={sectionTitle} sectionSubtitle={sectionSubtitle} showSeeAll={!productsLoading && !productsError && featuredProducts.length > 0} />
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
              <div className="relative overflow-hidden w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-gray-100 shrink-0">
                <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{product.category?.name || "Collection"}</p>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate mb-2">{product.name}</h3>
                <div className="flex items-center gap-1.5"><ProductPrice product={product} /></div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-300 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--theme-primary)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

const FeaturedProducts = (props: FeaturedProductsProps) => {
  const [activeTemplate, setActiveTemplate] = useState(1);

  useEffect(() => {
    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (typeof data?.featuredTemplate === "number") {
          setActiveTemplate(data.featuredTemplate);
        }
      })
      .catch(() => { });
  }, []);

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
