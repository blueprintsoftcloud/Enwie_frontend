import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Popover } from "@headlessui/react";
import {
  ShoppingBag,
  ArrowRight,
  Filter,
  ArrowLeft,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Star,
} from "lucide-react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Components
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import PageSeo from "../components/seo/PageSeo";
import { BreadcrumbJsonLd } from "../components/seo/JsonLd";
import api from "../utils/api";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import AttributeFilterPanel, {
  type ActiveFilters as DynFilters,
  type AttributeFilterPanelHandle,
  type FilterAttribute,
} from "../components/AttributeFilterPanel";
import PriceRangeSlider from "../components/PriceRangeSlider";

interface CategoryProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  secondaryImage?: string | null;
  images?: string[];
  stock?: number;
  sizes?: string[];
  size?: string;
  color?: string;
  discount?: number;
  category?: { name?: string } | string;
  categoryName?: string;
  /** Set when this card represents one specific active variant of a product with
   * options (e.g. Storage/Color) instead of a plain single-SKU product — see backend's
   * expandProductsWithVariants. Null/absent for a plain product. */
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
}

interface SelectedFilters {
  size: string[];
  color: string[];
  discount: boolean;
  inStock: boolean;
}

interface FlatCategory {
  id: string;
  name: string;
  parentId: string | null;
}

// --- CUSTOM HOOKS ---
const useInfiniteScroll = (callback: () => void) => {
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500
      ) {
        callback();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback]);
};

function classNames(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

// MODERN SKELETON LOADER
const SkeletonCard = () => (
  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-gray-100 animate-pulse">
    <div className="absolute top-4 right-4 h-10 w-10 rounded-full bg-gray-200" />
    <div className="absolute bottom-4 left-4 right-4 h-20 rounded-2xl bg-gray-200" />
  </div>
);

// MODERN PRODUCT CARD
// Wishlist/add-to-cart both require a specific variant selection (size/color/etc), so
// they live only on the product detail page's variant picker — this listing card is
// just a "browse and open" surface, one card per product (see paginateListingRows'
// per-product collapse on the backend).
const ModernProductCard = React.memo(function ModernProductCard({ product }: { product: CategoryProduct }) {
  const navigate = useNavigate();

  const primaryUrl = product.image || "https://placehold.co/600x800?text=No+Image";
  const secondaryUrl = product.secondaryImage || (product.images && product.images.length > 1 ? product.images[1] : null);

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  const finalPrice =
    (product.discount ?? 0) > 0
      ? calculateDiscountedPrice(product.price, product.discount!)
      : product.price;

  return (
    <div
      onClick={handleCardClick}
      className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-3xl bg-gray-50 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl transform-gpu"
    >
      {/* Primary Product Image */}
      <img
        src={primaryUrl}
        alt={product.name}
        className={`h-full w-full object-cover transition-all duration-700 ease-out transform-gpu group-hover:scale-105 ${
          secondaryUrl ? "group-hover:opacity-0" : ""
        }`}
        loading="lazy"
        decoding="async"
      />

      {/* Secondary Angle / Detail Image (Cross-fade on hover) */}
      {secondaryUrl && (
        <img
          src={secondaryUrl}
          alt={`${product.name} alternate view`}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out transform-gpu group-hover:opacity-100 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Gradient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10 opacity-60 transition-opacity duration-300 group-hover:opacity-80 pointer-events-none" />



      {/* Bottom Floating Info Card */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-3.5 sm:left-3.5 sm:right-3.5 transition-transform duration-300 group-hover:-translate-y-0.5">
        <div className="flex items-center justify-between min-h-[72px] sm:min-h-[76px] rounded-2xl bg-white/90 p-3 sm:p-3.5 shadow-lg backdrop-blur-md border border-white/40 transition-all duration-300 group-hover:shadow-xl group-hover:border-white/60">
          <div className="flex flex-col justify-center truncate pr-2 min-w-0 flex-1">
            <h3 className="truncate text-xs sm:text-[13px] font-bold text-gray-900 leading-tight">
              {product.name}
            </h3>

            {product.variantOptions && Object.keys(product.variantOptions).length > 0 ? (
              <span className="truncate text-[9.5px] sm:text-[10px] font-medium text-gray-500 leading-none mt-0.5">
                {Object.entries(product.variantOptions)
                  .map(([axis, value]) => `${axis}: ${value}`)
                  .join(" · ")}
              </span>
            ) : (product.size || product.color) ? (
              <span className="truncate text-[9.5px] sm:text-[10px] font-medium text-gray-500 leading-none mt-0.5">
                {[product.size, product.color].filter(Boolean).join(" · ")}
              </span>
            ) : (product as any).variantsCount && (product as any).variantsCount > 1 ? (
              <span className="truncate text-[9.5px] sm:text-[10px] font-medium text-gray-500 leading-none mt-0.5">
                Variants: {(product as any).variantsCount}
              </span>
            ) : null}

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                ₹{finalPrice.toFixed(0)}
              </span>
              {(product.discount ?? 0) > 0 && (
                <>
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                    ₹{product.price?.toFixed(0)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    {product.discount}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900 group-hover:bg-black group-hover:text-white transition-all duration-300 ml-2 group-hover:scale-105 shadow-xs">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
});

// Every threshold implicitly includes everything above it (4★ & above already covers
// 5★), so checking several boxes is redundant except for the LOOSEST one checked —
// e.g. checking both "3★ & above" and "1★ & above" only ever needs minRating=1, since
// that already covers everything the 3★ box would. Multi-checkbox "OR of nested
// ranges" collapses to a single min() — see applyAllFilters below.
const RATING_THRESHOLDS = [4, 3, 2, 1];

const RatingsFilterSection = ({
  selected,
  onToggle,
}: {
  selected: Set<number>;
  onToggle: (threshold: number) => void;
}) => (
  <div className="pt-4 pb-4 border-b border-gray-200">
    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
      Customer Ratings
    </h4>
    <div className="space-y-1.5">
      {RATING_THRESHOLDS.map((t) => {
        const active = selected.has(t);
        return (
          <label
            key={t}
            onClick={(e) => {
              e.preventDefault();
              onToggle(t);
            }}
            className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none"
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => {}}
              className="w-3.5 h-3.5 rounded-[2px] border-gray-300 text-black accent-black focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1 text-xs text-gray-800 group-hover:text-black transition-colors font-normal">
              <span>{t}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline shrink-0" />
              <span className="text-gray-400 text-[11px]">&amp; above</span>
            </span>
          </label>
        );
      })}
    </div>
  </div>
);

// FILTER CONTROL COMPONENT
const FilterControls = ({
  resetFilters,
  onApply,
  ratingsSection,
  priceSection,
  attributesSection,
  filtersLoading,
}: {
  resetFilters: () => void;
  onApply: () => void;
  ratingsSection?: React.ReactNode;
  priceSection?: React.ReactNode;
  attributesSection?: React.ReactNode;
  filtersLoading?: boolean;
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          FILTERS
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          CLEAR ALL
        </button>
      </div>

      {ratingsSection}

      {filtersLoading ? (
        <div className="space-y-3 pt-4 animate-pulse">
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded pt-2" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-100 rounded" />
          </div>
        </div>
      ) : (
        <>
          {priceSection}
          {attributesSection}
        </>
      )}

      <div className="pt-4 mt-2">
        <button
          type="button"
          onClick={onApply}
          disabled={filtersLoading}
          className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 shadow-xs"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

const SORT_OPTIONS = [
  { label: "Recommended", value: "featured" },
  { label: "What's New", value: "newest" },
  { label: "Popularity", value: "popular" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Price: Low to High", value: "price-asc" },
];

// --- MAIN PAGE COMPONENT ---
const CategoryProductsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Page title is the top-level ancestor of whatever category `slug` resolves to
  // (itself when the slug already is a root category) — see the effect below.
  const [categoryName, setCategoryName] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [sortType, setSortType] = useState("featured");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Dynamic attribute filters (AttributeFilterPanel)
  const [activeAttrValueIds, setActiveAttrValueIds] = useState<string[]>([]);
  const attrIdsKey = activeAttrValueIds.slice().sort().join(",");
  const [dynFilterResetKey, setDynFilterResetKey] = useState(0);

  const handleDynFiltersChange = useCallback((f: DynFilters) => {
    setActiveAttrValueIds((prev) => {
      const next = f.attributeValueIds.slice().sort();
      const cur = prev.slice().sort();
      if (next.join(",") === cur.join(",")) return prev;
      return next;
    });
    // AttributeFilterPanel's sidebar layout only fires this on an explicit "Apply
    // Filter" press (see its applyNow) — on mobile that's the moment to dismiss the
    // drawer and reveal the (now filtering) product grid. A no-op on desktop, where
    // this state is never true.
    setIsMobileFilterOpen(false);
  }, []);

  const [activeFilters, setActiveFilters] = useState<SelectedFilters>({
    size: [],
    color: [],
    discount: false,
    inStock: false,
  });

  // Built-in Price + Customer Rating filters — every product has these, unlike
  // Fabric/Color which are category-specific admin-defined attributes. Staged the
  // same way as AttributeFilterPanel's sidebar mode: "pending" tracks in-progress
  // slider drags/checkbox clicks, "applied" is what's actually sent to the backend,
  // and the two only sync when the shared "Apply Filters" button fires (see
  // applyAllFilters below).
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [pendingPriceRange, setPendingPriceRange] = useState<[number, number] | null>(null);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number] | null>(null);
  const [pendingRatingThresholds, setPendingRatingThresholds] = useState<Set<number>>(new Set());
  const [appliedMinRating, setAppliedMinRating] = useState<number | null>(null);

  // Category attributes & filter loading state
  const [categoryAttributes, setCategoryAttributes] = useState<FilterAttribute[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Desktop and mobile drawer each mount their OWN AttributeFilterPanel instance with
  // independent internal selection state, so each needs its own ref for the shared
  // Apply button to commit the co-located instance.
  const desktopAttrPanelRef = useRef<AttributeFilterPanelHandle>(null);
  const mobileAttrPanelRef = useRef<AttributeFilterPanelHandle>(null);

  // Fetch the price bounds and filterable attributes for this category's subtree simultaneously
  useEffect(() => {
    if (!slug) return;
    setFiltersLoading(true);
    api
      .get(`/user/shop/categories/${slug}/filters`)
      .then((res) => {
        const range = res.data?.priceRange;
        if (range && typeof range.min === "number" && typeof range.max === "number") {
          let min = Math.floor(range.min);
          const max = Math.ceil(range.max);
          if (min >= max) {
            min = 0;
          }
          setPriceBounds({ min, max });
          setPendingPriceRange([min, max]);
        } else {
          setPriceBounds(null);
          setPendingPriceRange(null);
        }
        setCategoryAttributes(res.data?.attributes ?? []);
      })
      .catch(() => {
        setPriceBounds(null);
        setPendingPriceRange(null);
        setCategoryAttributes([]);
      })
      .finally(() => {
        setFiltersLoading(false);
      });
  }, [slug]);

  const toggleRatingThreshold = (threshold: number) => {
    setPendingRatingThresholds((prev) => {
      const next = new Set(prev);
      next.has(threshold) ? next.delete(threshold) : next.add(threshold);
      return next;
    });
  };

  // Desktop and mobile drawer each mount their OWN AttributeFilterPanel instance
  // (see desktopAttrPanelRef/mobileAttrPanelRef above) — both stay mounted at all
  // times (the drawer/aside are only CSS-hidden, not unmounted), so calling
  // applyNow() on BOTH refs unconditionally would let whichever one the user *didn't*
  // touch (still sitting at its empty default selection) clobber the real one right
  // after it applies. Only the ref the caller identifies as "the one the user actually
  // used" gets applied.
  const applyAllFilters = (panelRef: React.RefObject<AttributeFilterPanelHandle | null>) => {
    setAppliedPriceRange(pendingPriceRange);
    setAppliedMinRating(
      pendingRatingThresholds.size > 0 ? Math.min(...pendingRatingThresholds) : null
    );
    panelRef.current?.applyNow();
    setIsMobileFilterOpen(false);
  };

  const fetchProductsByCategory = useCallback(
    async (pageNum = 1, reset = false) => {
      if (!slug) return;
      if (reset) {
        setLoading(true);
      }

      try {
        setError(null);
        const params: Record<string, string | number> = {
          sort: sortType,
          page: pageNum,
          limit: 12,
        };

        if (activeFilters.size.length > 0) {
          params.sizes = activeFilters.size.join(",");
        }
        if (activeFilters.inStock) {
          params.inStock = "true";
        }
        if (activeFilters.discount) {
          params.onSale = "true";
        }
        if (activeAttrValueIds.length > 0) {
          params.attributeValueIds = activeAttrValueIds.join(",");
        }
        if (appliedPriceRange && priceBounds) {
          // Only send bounds the user actually narrowed — an untouched slider at its
          // full extent shouldn't add a redundant min/maxPrice query param.
          const [lo, hi] = appliedPriceRange;
          if (lo > priceBounds.min) params.minPrice = lo;
          if (hi < priceBounds.max) params.maxPrice = hi;
        }
        if (appliedMinRating !== null) {
          params.minRating = appliedMinRating;
        }

        const res = await api.get(`/user/shop/categories/${slug}`, { params });
        const newProducts = (res.data.getProducts || []).map(normalizeProduct);

        if (res.data.category && typeof res.data.category.showFilters === "boolean") {
          setShowFilters(res.data.category.showFilters);
        }

        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }

        // Page title comes from the resolved root category (see the effect below),
        // not from the products themselves — a subcategory's products still carry
        // their own (sub)category name, which would otherwise override the top-level
        // title we deliberately show instead.

        setHasMore(newProducts.length === 12);
        setPage(pageNum);
      } catch (err) {
        setError("Unable to load products at this time");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [slug, sortType, activeFilters, activeAttrValueIds, appliedPriceRange, appliedMinRating, priceBounds]
  );

  // Client-side real-time product filtering based on search query
  const displayedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const pName = p.name?.toLowerCase() || "";
      const pBrand = p.brand?.toLowerCase() || "";
      const pCat =
        typeof p.category === "object"
          ? p.category?.name?.toLowerCase() || ""
          : String(p.category || "").toLowerCase();
      return pName.includes(q) || pBrand.includes(q) || pCat.includes(q);
    });
  }, [products, searchQuery]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchProductsByCategory(page + 1, false);
    }
  }, [loading, hasMore, page, fetchProductsByCategory]);

  const priceRangeKey = appliedPriceRange ? appliedPriceRange.join(",") : "";

  useEffect(() => {
    fetchProductsByCategory(1, true);
  }, [slug, sortType, activeFilters, attrIdsKey, priceRangeKey, appliedMinRating]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setInitialLoading(true);
    setProducts([]);

    if (slug) {
      api
        .get("/user/shop/categories")
        .then((res) => {
          const rawList = res.data.categories || [];
          const normalized: FlatCategory[] = rawList.map((c: any) => ({
            id: String(c.id ?? c._id),
            name: c.name,
            parentId: c.parentId ? String(c.parentId) : null,
            showFilters: c.showFilters !== false,
          }));

          const matched = rawList.find(
            (c: any) =>
              String(c.id) === String(slug) ||
              String(c._id) === String(slug) ||
              String(c.code).toLowerCase() === String(slug).toLowerCase() ||
              String(c.name).toLowerCase() === String(slug).toLowerCase()
          );
          if (!matched) return;

          if (matched.showFilters !== undefined) {
            setShowFilters(matched.showFilters !== false);
          }

          const matchedId = String(matched.id ?? matched._id);

          // Walk up parentId pointers to the top-level ancestor — that's the name the
          // page titles itself with, regardless of how deep the actual slug's
          // subcategory sits.
          let rootNode = normalized.find((c) => c.id === matchedId) ?? null;
          while (rootNode?.parentId) {
            const parent = normalized.find((c) => c.id === rootNode!.parentId);
            if (!parent) break;
            rootNode = parent;
          }

          if (rootNode?.name && isNaN(Number(rootNode.name.trim()))) {
            setCategoryName(rootNode.name);
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  useInfiniteScroll(loadMore);

  const resetFilters = () => {
    const empty: SelectedFilters = {
      size: [],
      color: [],
      discount: false,
      inStock: false,
    };
    setActiveFilters(empty);
    setActiveAttrValueIds([]);
    setSearchQuery("");
    setDynFilterResetKey((k) => k + 1);
    setPendingRatingThresholds(new Set());
    setAppliedMinRating(null);
    setPendingPriceRange(priceBounds ? [priceBounds.min, priceBounds.max] : null);
    setAppliedPriceRange(null);
    setIsMobileFilterOpen(false);
  };

  const hasActiveFilters =
    activeFilters.size.length > 0 ||
    activeFilters.color.length > 0 ||
    activeFilters.discount ||
    activeFilters.inStock ||
    activeAttrValueIds.length > 0 ||
    appliedMinRating !== null ||
    (appliedPriceRange !== null &&
      priceBounds !== null &&
      (appliedPriceRange[0] > priceBounds.min || appliedPriceRange[1] < priceBounds.max));
  const isCategoryEmpty = products.length === 0 && !hasActiveFilters && !loading;

  if (initialLoading || filtersLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-24 bg-gradient-to-r from-gray-50 to-white" />
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchProductsByCategory(1, true)}
            className="px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      <PageSeo
        title={categoryName || "Shop"}
        description={categoryName ? `Shop ${categoryName} — browse the full collection.` : undefined}
        path={`/categories/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: categoryName || "Category", path: `/categories/${slug}` },
        ]}
      />
      <main className={`w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-16 mt-[var(--app-header-h,5rem)] flex-1 flex flex-col ${isCategoryEmpty ? "justify-center min-h-[calc(100vh-10rem)]" : ""}`}>
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors mb-4 mt-2 shrink-0 self-start cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform transition-transform group-hover:-translate-x-1" />
          <span>Go Back</span>
        </button>

        {/* --- CENTERED HEADING WITH UNDERLINE --- */}
        {!isCategoryEmpty && (
          <div className="text-center mb-6">
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-4xl font-bold tracking-tight font-sans text-black capitalize"
            >
              {categoryName && isNaN(Number(categoryName.trim()))
                ? categoryName
                : "Collection"}
            </motion.h2>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "60px" }}
              transition={{ duration: 0.8 }}
              className="h-1 bg-black mx-auto mt-2 rounded-full"
            />
          </div>
        )}

        {/* --- CONTROLS BAR (SEARCH & SORT & RESULTS COUNT) --- */}
        {!isCategoryEmpty && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            {/* Results Count on left */}
            <div className="text-xs text-gray-500 font-medium order-2 sm:order-1">
              Showing <strong className="text-gray-900 font-bold">{displayedProducts.length}</strong> {displayedProducts.length === 1 ? "item" : "items"}
            </div>

            {/* Right Controls: Sort Popover & Mobile Filter */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Popover className="relative flex-1 sm:flex-initial">
                <Popover.Button className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded-[2px] text-xs text-gray-700 focus:outline-none cursor-pointer transition-colors">
                  <span className="truncate">
                    Sort by : <strong className="font-bold text-gray-900">{SORT_OPTIONS.find((o) => o.value === sortType)?.label || "Recommended"}</strong>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0 ml-1" />
                </Popover.Button>
                <Popover.Panel className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-52 bg-white border border-gray-200 rounded-[2px] shadow-lg py-1 z-40">
                  {({ close }) => (
                    <div className="flex flex-col">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={classNames(
                            sortType === option.value
                              ? "bg-gray-100 text-black font-bold"
                              : "text-gray-700 hover:bg-gray-50",
                            "block w-full px-4 py-2.5 text-left text-xs transition-colors cursor-pointer"
                          )}
                          onClick={() => {
                            setSortType(option.value);
                            close();
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </Popover.Panel>
              </Popover>

              {/* Mobile Filters Button */}
              {showFilters && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded-[2px] text-xs font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Filter className="h-3.5 w-3.5 text-black" /> Filters
                </button>
              )}
            </div>
          </div>
        )}

        <div className={isCategoryEmpty ? "my-auto flex-1 flex flex-col justify-center" : ""}>
          {isCategoryEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                No products available
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mb-6 font-medium">
                We are currently curating new styles for this collection. Please check back soon!
              </p>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[var(--theme-primary-hover)] transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div>
              {/* MAIN CONTENT GRID */}
              <div className={showFilters ? "flex flex-col lg:flex-row gap-8 items-start w-full" : "w-full"}>
                {/* DESKTOP SIDEBAR */}
                {showFilters && (
                  <aside className="lg:w-64 xl:w-72 flex-shrink-0 hidden lg:block pr-6 xl:pr-8 border-r border-gray-200">
                    <div className="sticky top-24">
                      <FilterControls
                        resetFilters={resetFilters}
                        onApply={() => applyAllFilters(desktopAttrPanelRef)}
                        filtersLoading={filtersLoading}
                        ratingsSection={
                          <RatingsFilterSection
                            selected={pendingRatingThresholds}
                            onToggle={toggleRatingThreshold}
                          />
                        }
                        priceSection={
                          priceBounds && pendingPriceRange ? (
                            <div className="pt-4 pb-4 border-b border-gray-200">
                              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                                Price
                              </h4>
                              <PriceRangeSlider
                                bounds={priceBounds}
                                value={pendingPriceRange}
                                onChange={setPendingPriceRange}
                              />
                            </div>
                          ) : undefined
                        }
                        attributesSection={
                          categoryAttributes.length > 0 ? (
                            <AttributeFilterPanel
                              ref={desktopAttrPanelRef}
                              categoryId={slug}
                              attributes={categoryAttributes}
                              onFiltersChange={handleDynFiltersChange}
                              resetKey={dynFilterResetKey}
                            />
                          ) : undefined
                        }
                      />
                    </div>
                  </aside>
                )}

                {/* PRODUCTS GRID */}
                <div className="flex-1 w-full min-w-0">
                  {displayedProducts.length === 0 && !loading ? (
                    <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        No products found
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto text-xs">
                        We couldn't find any products matching your search or filters.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div
                      className={classNames(
                        "transition-opacity duration-200",
                        loading ? "opacity-50 pointer-events-none" : "opacity-100"
                      )}
                    >
                      <div
                        className={`grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 ${
                          showFilters
                            ? "lg:grid-cols-3 xl:grid-cols-3"
                            : "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                        }`}
                      >
                        {displayedProducts.map((product) => (
                          <ModernProductCard key={product.id} product={product} />
                        ))}
                      </div>

                      {hasMore && !searchQuery && (
                        <div className="text-center mt-12">
                          <button
                            onClick={loadMore}
                            disabled={loading}
                            className="px-8 py-3 border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] hover:border-[var(--theme-primary)] transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {loading
                              ? "Loading more styles..."
                              : "Load More Products"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE FILTER DRAWER */}
      <AnimatePresence>
        {showFilters && isMobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white p-5 shadow-2xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-200 mb-3">
                <h3 className="text-xs font-bold text-gray-900 tracking-wider uppercase">FILTERS</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <FilterControls
                  resetFilters={resetFilters}
                  onApply={() => applyAllFilters(mobileAttrPanelRef)}
                  filtersLoading={filtersLoading}
                  ratingsSection={
                    <RatingsFilterSection
                      selected={pendingRatingThresholds}
                      onToggle={toggleRatingThreshold}
                    />
                  }
                  priceSection={
                    priceBounds && pendingPriceRange ? (
                      <div className="pt-4 pb-4 border-b border-gray-200">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                          Price
                        </h4>
                        <PriceRangeSlider
                          bounds={priceBounds}
                          value={pendingPriceRange}
                          onChange={setPendingPriceRange}
                        />
                      </div>
                    ) : undefined
                  }
                  attributesSection={
                    categoryAttributes.length > 0 ? (
                      <AttributeFilterPanel
                        ref={mobileAttrPanelRef}
                        categoryId={slug}
                        attributes={categoryAttributes}
                        onFiltersChange={handleDynFiltersChange}
                        resetKey={dynFilterResetKey}
                      />
                    ) : undefined
                  }
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isCategoryEmpty && <FooterSection />}
    </div>
  );
};

export default CategoryProductsPage;