import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Popover } from "@headlessui/react";
import {
  ShoppingBag,
  ArrowLeft,
  ChevronDown,
  RotateCcw,
  Heart,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Components
import Navbar from "../components/Navbar";
import FooterSection from "../components/FooterSection";
import PageSeo from "../components/seo/PageSeo";
import { BreadcrumbJsonLd } from "../components/seo/JsonLd";
import api from "../utils/api";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { type FilterAttribute } from "../components/AttributeFilterPanel";
import PriceRangeSlider from "../components/PriceRangeSlider";
import AutoAlignPopoverPanel from "../components/AutoAlignPopoverPanel";

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
  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-100 animate-pulse border border-gray-100">
    <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-stone-200" />
  </div>
);

// MODERN PRODUCT CARD (Matches Tribal Ornaments Referral Image)
const ModernProductCard = React.memo(function ModernProductCard({
  product,
}: {
  product: CategoryProduct;
}) {
  const navigate = useNavigate();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const isWishlisted = isProductInWishlist(product.id);

  const primaryUrl = product.image || "https://placehold.co/600x600?text=No+Image";
  const secondaryUrl =
    product.secondaryImage ||
    (product.images && product.images.length > 1 ? product.images[1] : null);

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
    window.scrollTo(0, 0);
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWishlistLoading) return;

    if (!user.isAuthenticated) {
      toast.error("Please login to add product to wishlist", { id: "login-to-wishlist" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    setIsWishlistLoading(true);
    try {
      const success = await toggleWishlist(product.id);
      if (success) {
        toast.success(isWishlisted ? "Removed from favourites" : "Added to favourites", {
          id: "wishlist-toggle-category-card",
        });
      }
    } catch {
      toast.error("Could not update wishlist");
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const finalPrice = hasDiscount
    ? Math.round(calculateDiscountedPrice(product.price, product.discount!))
    : Math.round(Number(product.price));
  const originalPrice = Math.round(Number(product.price));

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col w-full cursor-pointer select-none transition-transform duration-300"
    >
      {/* 1. Square Image Container with Rounded Corners */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-50 shadow-xs border border-gray-100">
        <img
          src={primaryUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
            secondaryUrl ? "group-hover:opacity-0" : ""
          }`}
        />

        {secondaryUrl && (
          <img
            src={secondaryUrl}
            alt={`${product.name} alternate view`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-105"
          />
        )}

        {/* 2. Floating Circular Wishlist Button (Top Right) */}
        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-10 flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:scale-110 hover:bg-white active:scale-90 border border-gray-200/60 disabled:opacity-60 cursor-pointer"
        >
          <Heart
            className={classNames(
              "h-4 w-4 transition-colors",
              isWishlisted
                ? "fill-red-500 text-red-500 stroke-red-500"
                : "text-gray-700 stroke-[1.75]"
            )}
          />
        </button>
      </div>

      {/* 3. Product Info Left-Aligned Below Image */}
      <div className="mt-2.5 sm:mt-3 flex flex-col items-start text-left px-0.5 font-sans">
        <h3 className="w-full text-xs sm:text-[13px] font-normal text-gray-800 leading-snug line-clamp-1 group-hover:text-black transition-colors text-left">
          {product.name}
        </h3>

        <div className="mt-1 flex items-center justify-start gap-2 text-xs sm:text-[13px] flex-wrap">
          {hasDiscount ? (
            <>
              <span className="text-gray-400 line-through font-normal text-[11px] sm:text-xs">
                ₹ {originalPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-gray-950 font-medium">
                From ₹ {finalPrice.toLocaleString("en-IN")}
              </span>
            </>
          ) : (
            <span className="text-gray-950 font-medium">
              ₹ {originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const SORT_OPTIONS = [
  { label: "Date, new to old", value: "newest" },
  { label: "Date, old to new", value: "oldest" },
  { label: "Price, low to high", value: "price-asc" },
  { label: "Price, high to low", value: "price-desc" },
  { label: "Featured", value: "featured" },
  { label: "Best Selling", value: "popular" },
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
  const [categoryName, setCategoryName] = useState("");
  const [sortType, setSortType] = useState("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Dynamic attribute filters
  const [activeAttrValueIds, setActiveAttrValueIds] = useState<string[]>([]);
  const attrIdsKey = activeAttrValueIds.slice().sort().join(",");

  const [activeFilters, setActiveFilters] = useState<SelectedFilters>({
    size: [],
    color: [],
    discount: false,
    inStock: false,
  });

  // Price Bounds & Range
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number } | null>(null);
  const [pendingPriceRange, setPendingPriceRange] = useState<[number, number] | null>(null);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number] | null>(null);

  // Category attributes & filter loading state
  const [categoryAttributes, setCategoryAttributes] = useState<FilterAttribute[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Fetch the price bounds and filterable attributes
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
          if (min >= max) min = 0;
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
          limit: 16,
        };

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
          const [lo, hi] = appliedPriceRange;
          if (lo > priceBounds.min) params.minPrice = lo;
          if (hi < priceBounds.max) params.maxPrice = hi;
        }

        const res = await api.get(`/user/shop/categories/${slug}`, { params });
        const newProducts = (res.data.getProducts || []).map(normalizeProduct);

        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }

        setHasMore(newProducts.length === 16);
        setPage(pageNum);
      } catch (err) {
        setError("Unable to load products at this time");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [slug, sortType, activeFilters, activeAttrValueIds, appliedPriceRange, priceBounds]
  );

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
  }, [slug, sortType, activeFilters, attrIdsKey, priceRangeKey]);

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
          }));

          const matched = rawList.find(
            (c: any) =>
              String(c.id) === String(slug) ||
              String(c._id) === String(slug) ||
              String(c.code).toLowerCase() === String(slug).toLowerCase() ||
              String(c.name).toLowerCase() === String(slug).toLowerCase()
          );
          if (!matched) return;

          const matchedId = String(matched.id ?? matched._id);

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
    setActiveFilters({
      size: [],
      color: [],
      discount: false,
      inStock: false,
    });
    setActiveAttrValueIds([]);
    setSearchQuery("");
    setPendingPriceRange(priceBounds ? [priceBounds.min, priceBounds.max] : null);
    setAppliedPriceRange(null);
  };

  const hasActiveFilters =
    activeFilters.inStock ||
    activeFilters.discount ||
    activeAttrValueIds.length > 0 ||
    (appliedPriceRange !== null &&
      priceBounds !== null &&
      (appliedPriceRange[0] > priceBounds.min || appliedPriceRange[1] < priceBounds.max));

  const isCategoryEmpty = products.length === 0 && !hasActiveFilters && !loading;

  if (initialLoading || filtersLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-24 mt-[var(--app-header-h,5rem)]">
          <div className="h-8 w-48 bg-stone-100 rounded-md mb-8 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-sans">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button
            onClick={() => fetchProductsByCategory(1, true)}
            className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer text-xs uppercase tracking-wider font-medium"
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
        description={
          categoryName
            ? `Shop ${categoryName} — browse the full collection.`
            : undefined
        }
        path={`/categories/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: categoryName || "Category", path: `/categories/${slug}` },
        ]}
      />

      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-4 pb-16 mt-[var(--app-header-h,5rem)] flex-1 flex flex-col">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors mb-3 shrink-0 self-start cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform transition-transform group-hover:-translate-x-1" />
          <span>Go Back</span>
        </button>

        {/* --- TITLE MATCHING REFERRAL IMAGE (e.g. "NEW ARRIVALS") --- */}
        {!isCategoryEmpty && (
          <div className="mb-4 pt-1">
            <h1 className="text-2xl sm:text-3xl lg:text-3xl font-medium tracking-wide uppercase text-gray-950 font-sans">
              {categoryName && isNaN(Number(categoryName.trim()))
                ? categoryName
                : "New Arrivals"}
            </h1>
          </div>
        )}

        {/* --- HORIZONTAL FILTER & SORT BAR MATCHING REFERRAL IMAGE --- */}
        {!isCategoryEmpty && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-b border-gray-200/90 mb-6 font-sans">
            {/* Left: Filter Label & Popover Dropdowns */}
            <div className="flex items-center gap-x-3.5 sm:gap-x-6 gap-y-2.5 flex-wrap text-xs text-gray-800">
              <span className="text-gray-500 font-normal text-xs sm:text-[13px] tracking-wide">
                Filter:
              </span>

              {/* 1. Availability */}
              <Popover className="relative">
                {({ open }) => (
                  <>
                    <Popover.Button className="inline-flex items-center gap-1 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                      <span>Availability</span>
                      {activeFilters.inStock && (
                        <span className="h-1.5 w-1.5 rounded-full bg-black ml-0.5" />
                      )}
                      <ChevronDown
                        className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </Popover.Button>
                    <AutoAlignPopoverPanel className="left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 p-3 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none py-1 px-1 rounded-md hover:bg-gray-50">
                          <input
                            type="radio"
                            name="availability"
                            checked={!activeFilters.inStock}
                            onChange={() =>
                              setActiveFilters((prev) => ({ ...prev, inStock: false }))
                            }
                            className="w-3.5 h-3.5 text-black accent-black cursor-pointer"
                          />
                          <span>All Items</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none py-1 px-1 rounded-md hover:bg-gray-50">
                          <input
                            type="radio"
                            name="availability"
                            checked={activeFilters.inStock}
                            onChange={() =>
                              setActiveFilters((prev) => ({ ...prev, inStock: true }))
                            }
                            className="w-3.5 h-3.5 text-black accent-black cursor-pointer"
                          />
                          <span>In Stock</span>
                        </label>
                      </div>
                    </AutoAlignPopoverPanel>
                  </>
                )}
              </Popover>

              {/* 2. Price */}
              {priceBounds && (
                <Popover className="relative">
                  {({ open }) => (
                    <>
                      <Popover.Button className="inline-flex items-center gap-1 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                        <span>Price</span>
                        {appliedPriceRange && (
                          <span className="h-1.5 w-1.5 rounded-full bg-black ml-0.5" />
                        )}
                        <ChevronDown
                          className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </Popover.Button>
                      <AutoAlignPopoverPanel className="-left-14 sm:left-0 mt-2 w-64 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-xl border border-gray-200 p-4 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-medium text-gray-900">
                            <span>Price Range</span>
                            <span className="text-gray-500 font-normal">
                              ₹{pendingPriceRange?.[0] ?? priceBounds.min} – ₹
                              {pendingPriceRange?.[1] ?? priceBounds.max}
                            </span>
                          </div>
                          {pendingPriceRange && (
                            <PriceRangeSlider
                              bounds={priceBounds}
                              value={pendingPriceRange}
                              onChange={setPendingPriceRange}
                            />
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => {
                                setPendingPriceRange([priceBounds.min, priceBounds.max]);
                                setAppliedPriceRange(null);
                              }}
                              className="text-[11px] text-gray-500 hover:text-black underline cursor-pointer"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => setAppliedPriceRange(pendingPriceRange)}
                              className="px-3.5 py-1 bg-black text-white text-[11px] font-medium rounded-md hover:bg-zinc-800 cursor-pointer transition-all"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </AutoAlignPopoverPanel>
                    </>
                  )}
                </Popover>
              )}

              {/* 3. Dynamic Category Attributes (Shop By Type, Color, Stone, etc.) */}
              {categoryAttributes.map((attr) => (
                <Popover key={attr.name} className="relative">
                  {({ open }) => {
                    const selectedCount = attr.values.filter((v) =>
                      activeAttrValueIds.includes(String(v.id))
                    ).length;
                    return (
                      <>
                        <Popover.Button className="inline-flex items-center gap-1 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                          <span>{attr.name}</span>
                          {selectedCount > 0 && (
                            <span className="h-4 w-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
                              {selectedCount}
                            </span>
                          )}
                          <ChevronDown
                            className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                              open ? "rotate-180" : ""
                            }`}
                          />
                        </Popover.Button>
                        <AutoAlignPopoverPanel className="right-0 sm:right-auto sm:left-0 mt-2 w-52 sm:w-56 max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 p-3 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                          <div className="space-y-2">
                            {attr.values.map((val) => {
                              const isChecked = activeAttrValueIds.includes(String(val.id));
                              return (
                                <label
                                  key={val.id}
                                  className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer select-none py-1 px-1 rounded-md hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setActiveAttrValueIds((prev) =>
                                        isChecked
                                          ? prev.filter((id) => id !== String(val.id))
                                          : [...prev, String(val.id)]
                                      );
                                    }}
                                    className="w-3.5 h-3.5 text-black accent-black rounded-[2px] cursor-pointer"
                                  />
                                  <span>{val.value}</span>
                                </label>
                              );
                            })}
                          </div>
                        </AutoAlignPopoverPanel>
                      </>
                    );
                  }}
                </Popover>
              ))}
            </div>

            {/* Right: Sort by & Product count */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between sm:justify-end">
              <Popover className="relative">
                {({ open }) => (
                  <>
                    <Popover.Button className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                      <span className="text-gray-500 font-normal">Sort by:</span>
                      <span className="font-medium text-gray-900">
                        {SORT_OPTIONS.find((o) => o.value === sortType)?.label ||
                          "Date, new to old"}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </Popover.Button>
                    <AutoAlignPopoverPanel className="left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
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
                                "block w-full px-4 py-2 text-left text-xs transition-colors cursor-pointer"
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
                    </AutoAlignPopoverPanel>
                  </>
                )}
              </Popover>

              <span className="text-xs sm:text-[13px] text-gray-500 font-normal">
                {displayedProducts.length}{" "}
                {displayedProducts.length === 1 ? "product" : "products"}
              </span>
            </div>
          </div>
        )}

        {/* --- ACTIVE FILTER CHIPS --- */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
            {activeFilters.inStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs text-gray-800">
                <span>In Stock</span>
                <button
                  type="button"
                  onClick={() => setActiveFilters((prev) => ({ ...prev, inStock: false }))}
                  className="hover:text-black cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {appliedPriceRange && priceBounds && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs text-gray-800">
                <span>
                  ₹{appliedPriceRange[0]} – ₹{appliedPriceRange[1]}
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedPriceRange(null)}
                  className="hover:text-black cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {activeAttrValueIds.length > 0 &&
              categoryAttributes.flatMap((a) =>
                a.values
                  .filter((v) => activeAttrValueIds.includes(String(v.id)))
                  .map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-xs text-gray-800"
                    >
                      <span>
                        {a.name}: {v.value}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAttrValueIds((prev) =>
                            prev.filter((id) => id !== String(v.id))
                          )
                        }
                        className="hover:text-black cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
              )}

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black underline cursor-pointer ml-2"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* --- PRODUCTS 4-COLUMN GRID MATCHING REFERRAL IMAGE --- */}
        {isCategoryEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto">
            <ShoppingBag className="w-10 h-10 text-gray-300 stroke-[1.25] mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products available</h3>
            <p className="text-xs text-gray-500 max-w-xs mb-6">
              We are currently curating new pieces for this collection.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-950 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
              <span>Continue Shopping</span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            {displayedProducts.length === 0 && !loading ? (
              <div className="text-center py-16 bg-stone-50 rounded-2xl border border-dashed border-gray-200">
                <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-500 mb-4 text-xs">
                  We couldn't find any products matching your selected filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-5 py-2 bg-black text-white text-xs font-medium rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
                  {displayedProducts.map((product) => (
                    <ModernProductCard key={product.id} product={product} />
                  ))}
                </div>

                {hasMore && !searchQuery && (
                  <div className="text-center mt-12">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-8 py-3 border border-gray-300 text-gray-800 text-xs font-medium uppercase tracking-wider rounded-full hover:bg-black hover:text-white hover:border-black transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Loading more styles..." : "Load More Products"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};

export default CategoryProductsPage;
