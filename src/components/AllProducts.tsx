import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  XMarkIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { ArrowRight, Check, ArrowLeft, RotateCcw, Heart } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { domainUrl } from "../utils/constant";
import FooterSection from "../components/FooterSection";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import PageSeo from "./seo/PageSeo";
import { useSeoSettings } from "../context/SeoContext";
import AutoAlignPopoverPanel from "./AutoAlignPopoverPanel";


interface AllProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  secondaryImage?: string | null;
  images?: string[];
  stock?: number;
  category?: { name?: string } | string;
  discount?: number;
  /** Set when this card represents one specific active variant of a product with
   * options (e.g. Storage/Color) instead of a plain single-SKU product — see backend's
   * expandProductsWithVariants. Null/absent for a plain product. */
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
}

interface Category {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  parentId?: string | null;
}

interface Filters {
  q: string;
  category: string;
  minPrice: number | string;
  maxPrice: number | string;
  sort: string;
  page: number;
  limit: number;
}

interface SearchParamsObject {
  q?: string;
  category?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sort?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 24;
const DEBOUNCE_MS = 300;

function classNames(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

// --- MODERN CARD COMPONENT MATCHING REFERRAL IMAGE ---
const ModernProductCard = React.memo(function ModernProductCard({ product }: { product: AllProduct }) {
  const navigate = useNavigate();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const isWishlisted = isProductInWishlist(product.id);

  const primaryUrl = product.image || "https://placehold.co/600x600?text=No+Image";
  const secondaryUrl = product.secondaryImage || (product.images && product.images.length > 1 ? product.images[1] : null);

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
          id: "wishlist-toggle-allproducts-card",
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
      {/* 1. Square Image with Rounded Corners */}
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

        {/* 2. Floating Circular Wishlist Button */}
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
              isWishlisted ? "fill-red-500 text-red-500 stroke-red-500" : "text-gray-700 stroke-[1.75]"
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

// Skeleton loader
function SkeletonCard() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-100 animate-pulse border border-gray-100">
      <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-stone-200" />
    </div>
  );
}

export default function AllProducts() {
  const navigate = useNavigate();
  const { seo } = useSeoSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useBodyScrollLock(mobileFiltersOpen);

  const { user, logout } = useAuth();

  const isAuthenticated = user?.isAuthenticated;
  const role = user?.role;

  // Filters state
  const [filters, setFilters] = useState<Filters>(() => {
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const minPrice = searchParams.get("minPrice") ?? "";
    const maxPrice = searchParams.get("maxPrice") ?? "";
    const sort = searchParams.get("sort") || "relevance";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit =
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) ||
      DEFAULT_LIMIT;
    return {
      q,
      category,
      minPrice: minPrice === "" ? "" : Number(minPrice),
      maxPrice: maxPrice === "" ? "" : Number(maxPrice),
      sort,
      page,
      limit,
    };
  });

  const [items, setItems] = useState<AllProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flattened top-down walk of the category tree (root, its children, their children,
  // ...) instead of the raw fetch order — the dropdown otherwise mixed every depth
  // together with no indication of which categories are top-level vs nested under
  // another, which read as an arbitrary/broken list rather than a real hierarchy.
  const hierarchicalCategories = useMemo(() => {
    const byParent = new Map<string, Category[]>();
    for (const cat of categories) {
      const parentKey = cat.parentId ?? "";
      if (!byParent.has(parentKey)) byParent.set(parentKey, []);
      byParent.get(parentKey)!.push(cat);
    }
    for (const group of byParent.values()) {
      group.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const ordered: { cat: Category; depth: number }[] = [];
    const walk = (parentKey: string, depth: number) => {
      for (const cat of byParent.get(parentKey) ?? []) {
        ordered.push({ cat, depth });
        walk((cat._id ?? cat.id ?? "") as string, depth + 1);
      }
    };
    walk("", 0);
    return ordered;
  }, [categories]);

  const abortRef = useRef<AbortController | null>(null);
  const [debouncedQ, setDebouncedQ] = useState(filters.q);

  // Debounce search text
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters.q]);

  // Sync filters -> URL
  useEffect(() => {
    const q: SearchParamsObject = {};
    if (filters.q) q.q = filters.q;
    if (filters.category) q.category = filters.category;
    if (filters.minPrice !== "" && filters.minPrice !== undefined)
      q.minPrice = filters.minPrice;
    if (filters.maxPrice !== "" && filters.maxPrice !== undefined)
      q.maxPrice = filters.maxPrice;
    if (filters.sort) q.sort = filters.sort;
    if (filters.page) q.page = filters.page;
    if (filters.limit) q.limit = filters.limit;
    setSearchParams(q as Record<string, string>, { replace: true });
  }, [filters, setSearchParams]);

  // Load Categories
  useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await api.get("/user/shop/categories");
          if (!mounted) return;
          setCategories((res.data.categories || []).map(normalizeCategory));
        } catch (err) {
      const _e = err as any;
          console.error("Categories load failed", err);
        }
      })();
      return () => {
        mounted = false;
      };
  }, []);

  // Fetch items (main fetch)
  useEffect(() => {
    const params = {
      q: debouncedQ || undefined,
      category: filters.category || undefined,
      minPrice: filters.minPrice === "" ? undefined : filters.minPrice,
      maxPrice: filters.maxPrice === "" ? undefined : filters.maxPrice,
      sort: filters.sort || undefined,
      page: filters.page || 1,
      limit: filters.limit || DEFAULT_LIMIT,
    };

    try {
      abortRef.current?.abort();
    } catch (e) {}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get("/user/products/search", {
          params,
          signal: controller.signal,
        });
        setItems((res.data.items || []).map(normalizeProduct));
        setTotal(res.data.total || 0);
      } catch (err) {
      const _e = err as any;
        if (_e.name === "CanceledError" || _e?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Search error", err);
        setError(_e.response?.data?.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      try {
        controller.abort();
      } catch (e) {}
    };
  }, [
    debouncedQ,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.sort,
    filters.page,
    filters.limit,
  ]);

  // Handlers
  const updateFilter = useCallback((change: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...change, page: 1 }));
  }, []);

  const clearFilter = useCallback(
    (key: keyof Filters) => {
      const resetValue = key === "page" ? filters.page : "";
      setFilters((prev) => ({ ...prev, [key]: resetValue, page: 1 }));
    },
    [filters.page]
  );

  const clearAll = useCallback(() => {
    setFilters({
      q: "",
      category: "",
      minPrice: "",
      maxPrice: "",
      sort: "relevance",
      page: 1,
      limit: DEFAULT_LIMIT,
    });
  }, []);

  // Active chips logic (Excludes search 'q' because it is represented inside search box)
  const activeChips = [];
  if (filters.category)
    activeChips.push({
      key: "category",
      label: `Category: ${filters.category}`,
    });
  if (filters.minPrice !== "" || filters.maxPrice !== "") {
    activeChips.push({
      key: "price",
      label: `Price: ₹${filters.minPrice === "" ? 0 : filters.minPrice}–${
        filters.maxPrice === "" ? "∞" : filters.maxPrice
      }`,
    });
  }

  return (
    <div className="bg-white min-h-screen">
      <PageSeo
        title={seo.productsTitle?.trim() || "All Products"}
        description={seo.productsDescription?.trim() || "Browse our full product catalog."}
        path="/products"
      />

      {/* Mobile Filter Dialog */}
      <Dialog
        open={mobileFiltersOpen}
        onClose={setMobileFiltersOpen}
        className="relative z-40 sm:hidden"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        <div className="fixed inset-0 z-40 flex">
          <DialogPanel className="relative ml-auto w-full max-w-xs transform overflow-y-auto bg-white p-4 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Filters</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {/* Filter Inputs (Category, Price) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={filters.category || ""}
                onChange={(e) => updateFilter({ category: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-[var(--theme-primary)] focus:outline-none focus:ring-[var(--theme-primary)] sm:text-sm"
              >
                <option value="">All categories</option>
                {hierarchicalCategories.map(({ cat: c, depth }) => (
                  <option key={c._id || c.id} value={c.name || c.title}>
                    {"  ".repeat(depth)}
                    {c.name || c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Price Range</label>
              <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    value={filters.minPrice === "" ? "" : filters.minPrice}
                    onChange={(e) => updateFilter({ minPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 p-2 text-sm focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    value={filters.maxPrice === "" ? "" : filters.maxPrice}
                    onChange={(e) => updateFilter({ maxPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 p-2 text-sm focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-md bg-[var(--theme-primary)] px-3 py-2 text-sm font-semibold text-[var(--theme-primary-ink)] shadow-sm hover:bg-[var(--theme-primary-hover)]"
              >
                Apply
              </button>
              <button
                onClick={clearAll}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 mt-[var(--app-header-h,5rem)]">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform transition-transform group-hover:-translate-x-1" />
          <span>Go Back</span>
        </button>

        {/* --- TITLE MATCHING REFERRAL IMAGE --- */}
        <div className="mb-4 pt-1">
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-medium tracking-wide uppercase text-gray-950 font-sans">
            {filters.category ? filters.category : "All Products"}
          </h1>
        </div>

        {/* --- HORIZONTAL FILTER & SORT BAR MATCHING REFERRAL IMAGE --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-t border-b border-gray-200/90 mb-6 font-sans">
          {/* Left: Filter triggers */}
          <div className="flex items-center gap-x-3.5 sm:gap-x-6 gap-y-2.5 flex-wrap text-xs text-gray-800">
            <span className="text-gray-500 font-normal text-xs sm:text-[13px] tracking-wide">
              Filter:
            </span>

            {/* Category Filter Dropdown */}
            <Popover className="relative">
              {({ open }) => (
                <>
                  <Popover.Button className="inline-flex items-center gap-1 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                    <span>{filters.category ? `Category: ${filters.category}` : "Category"}</span>
                    <ChevronDownIcon
                      className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Popover.Button>
                  <AutoAlignPopoverPanel className="left-0 mt-2 w-56 max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 p-2 ring-1 ring-black/5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in fade-in zoom-in-95 duration-150">
                    {({ close }) => (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          className={classNames(
                            !filters.category
                              ? "bg-stone-100 text-gray-900 font-medium"
                              : "text-gray-700 hover:bg-stone-50",
                            "flex items-center justify-between w-full px-3 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer"
                          )}
                          onClick={() => {
                            updateFilter({ category: "" });
                            close();
                          }}
                        >
                          <span>All Categories</span>
                          {!filters.category && <Check className="h-3.5 w-3.5 text-gray-900" />}
                        </button>
                        {hierarchicalCategories.map(({ cat: c, depth }) => {
                          const name = c.name || c.title || "";
                          const isSelected = filters.category === name;
                          return (
                            <button
                              key={c._id || c.id}
                              type="button"
                              style={{ paddingLeft: `${depth * 12 + 12}px` }}
                              className={classNames(
                                isSelected
                                  ? "bg-stone-100 text-gray-900 font-medium"
                                  : "text-gray-700 hover:bg-stone-50",
                                "flex items-center justify-between w-full py-1.5 pr-3 text-left text-xs rounded-lg transition-colors cursor-pointer"
                              )}
                              onClick={() => {
                                updateFilter({ category: name });
                                close();
                              }}
                            >
                              <span className="truncate">{name}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-gray-900 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </AutoAlignPopoverPanel>
                </>
              )}
            </Popover>

            {/* Price Filter Dropdown */}
            <Popover className="relative">
              {({ open }) => (
                <>
                  <Popover.Button className="inline-flex items-center gap-1 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                    <span>Price</span>
                    {(filters.minPrice !== "" || filters.maxPrice !== "") && (
                      <span className="h-1.5 w-1.5 rounded-full bg-black ml-0.5" />
                    )}
                    <ChevronDownIcon
                      className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Popover.Button>
                  <AutoAlignPopoverPanel className="-left-14 sm:left-0 mt-2 w-64 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-xl border border-gray-200 p-4 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-medium text-gray-900">
                        <span>Price Range (₹)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.minPrice}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              minPrice: e.target.value === "" ? "" : Number(e.target.value),
                              page: 1,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                        <span className="text-gray-400 text-xs">–</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.maxPrice}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              maxPrice: e.target.value === "" ? "" : Number(e.target.value),
                              page: 1,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, minPrice: "", maxPrice: "", page: 1 }));
                          }}
                          className="text-[11px] text-gray-500 hover:text-black underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </AutoAlignPopoverPanel>
                </>
              )}
            </Popover>

            {/* Search Input inline */}
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="Search products..."
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
                className="w-full pl-7 pr-6 py-1 bg-stone-50 hover:bg-stone-100 focus:bg-white border border-gray-200 rounded-full text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, q: "", page: 1 }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Sort by & Product count */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between sm:justify-end">
            <Popover className="relative">
              {({ open }) => (
                <>
                  <Popover.Button className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-gray-800 hover:text-black font-normal focus:outline-none cursor-pointer transition-colors py-1.5 px-0.5 sm:px-0 sm:py-1">
                    <span className="text-gray-500 font-normal">Sort by:</span>
                    <span className="font-medium text-gray-900">
                      {filters.sort === "relevance"
                        ? "Date, new to old"
                        : filters.sort === "newest"
                        ? "Date, new to old"
                        : filters.sort === "price-asc"
                        ? "Price: Low to High"
                        : filters.sort === "price-desc"
                        ? "Price: High to Low"
                        : "Sort By"}
                    </span>
                    <ChevronDownIcon
                      className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Popover.Button>
                  <AutoAlignPopoverPanel className="left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                    {({ close }) => (
                      <div className="flex flex-col">
                        {[
                          { name: "Date, new to old", value: "newest" },
                          { name: "Relevance", value: "relevance" },
                          { name: "Price: Low to High", value: "price-asc" },
                          { name: "Price: High to Low", value: "price-desc" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={classNames(
                              filters.sort === option.value
                                ? "bg-stone-100 text-black font-medium"
                                : "text-gray-700 hover:bg-stone-50",
                              "block w-full px-4 py-2 text-left text-xs transition-colors cursor-pointer"
                            )}
                            onClick={() => {
                              updateFilter({ sort: option.value });
                              close();
                            }}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </AutoAlignPopoverPanel>
                </>
              )}
            </Popover>

            <span className="text-xs sm:text-[13px] text-gray-500 font-normal">
              {total} {total === 1 ? "product" : "products"}
            </span>
          </div>
        </div>

        {/* Active Filters Display */}
        {(activeChips.length > 0 || (filters.q && (filters.category || filters.minPrice !== "" || filters.maxPrice !== ""))) && (
          <div className="mb-6 flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
            {activeChips.length > 0 && (
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                Active Filters:
              </span>
            )}
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-3 py-0.5 text-xs font-medium text-gray-800 shadow-xs hover:bg-slate-200/60 transition-all"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={() => clearFilter((chip.key === "price" ? "minPrice" : chip.key) as keyof Filters)}
                  className="rounded-full p-0.5 hover:bg-gray-300/60 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Remove filter"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {/* Clear All Pill */}
            {(activeChips.length > 0 || filters.q) && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 hover:bg-rose-100/90 border border-rose-200/80 px-3 py-0.5 text-xs font-bold text-rose-600 transition-all shadow-xs active:scale-95 cursor-pointer ml-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}

        {/* PRODUCT GRID LAYOUT MATCHING REFERRAL IMAGE */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
          {loading && items.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : items.map((p) => (
                <ModernProductCard key={p.id} product={p} />
              ))}
        </div>

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-slate-50/50 py-16 px-6 text-center max-w-lg mx-auto shadow-xs">
            
            <h3 className="text-lg font-bold text-gray-900">No products found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-xs font-medium leading-relaxed">
              We couldn't find any matches for your current search filters. Try adjusting your category or price limits.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-ink)] text-xs font-bold uppercase tracking-wider rounded-full transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading products</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => { setError(null); setFilters((p) => ({ ...p })); }}
                    className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {total > filters.limit && (
        <div className="mt-20 flex items-center justify-center gap-6">
          <button
            onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={filters.page === 1}
            className="flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:hover:bg-transparent disabled:shadow-none transition-all"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-full">
            Page {filters.page}
          </span>
          <button
            onClick={() => setFilters((p) => ({
                ...p,
                page: Math.min(Math.ceil(total / p.limit), p.page + 1),
              }))
            }
            disabled={filters.page >= Math.ceil(total / filters.limit)}
            className="flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:hover:bg-transparent disabled:shadow-none transition-all"
          >
            Next
          </button>
        </div>
        )}
      </main>

      <FooterSection/>
    </div>
  );
}