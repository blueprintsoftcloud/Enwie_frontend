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
import { ArrowRight, Check, ArrowLeft, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { domainUrl } from "../utils/constant";
import FooterSection from "../components/FooterSection";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import PageSeo from "./seo/PageSeo";
import { useSeoSettings } from "../context/SeoContext";


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

// --- MODERN CARD COMPONENT ---
// Wishlist/add-to-cart both require a specific variant selection (size/color/etc), so
// they live only on the product detail page's variant picker — this listing card is
// just a "browse and open" surface, one card per product (see paginateListingRows'
// per-product collapse on the backend).
const ModernProductCard = React.memo(function ModernProductCard({ product }: { product: AllProduct }) {
  const navigate = useNavigate();

  const primaryUrl = product.image || "https://placehold.co/600x800?text=No+Image";
  const secondaryUrl = product.secondaryImage || (product.images && product.images.length > 1 ? product.images[1] : null);

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  const categoryName = typeof product.category === 'object'
    ? product.category?.name
    : product.category;

  return (
    <div 
      onClick={handleCardClick}
      className="group relative aspect-[5/7] w-full cursor-pointer overflow-hidden rounded-3xl bg-gray-50 border border-gray-200/80 shadow-xs transition-shadow duration-300 hover:shadow-xl"
    >
      {/* Background Primary Image */}
      <img
        src={primaryUrl}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          secondaryUrl ? "group-hover:opacity-0" : ""
        }`}
      />

      {/* Secondary Angle / Detail Image (Cross-fade on hover) */}
      {secondaryUrl && (
        <img
          src={secondaryUrl}
          alt={`${product.name} alternate view`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}

      {/* Bottom Floating Info Card */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center justify-between min-h-[76px] rounded-2xl bg-white p-3.5 shadow-md border border-gray-200 transition-all duration-300 group-hover:border-gray-300 group-hover:shadow-lg">
          <div className="flex flex-col justify-center truncate pr-2 min-w-0">
            <h3 className="truncate text-sm font-bold text-gray-900">
              {product.name}
            </h3>
            {product.variantOptions && Object.keys(product.variantOptions).length > 0 && (
              <span className="truncate text-[10px] font-medium text-gray-500">
                {Object.entries(product.variantOptions)
                  .map(([axis, value]) => `${axis}: ${value}`)
                  .join(" · ")}
              </span>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {product.discount && product.discount > 0 ? (
                <>
                  <span className="text-sm font-extrabold text-gray-900">
                    ₹{calculateDiscountedPrice(product.price, product.discount).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-gray-400 line-through">
                    ₹{product.price?.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/60 px-1 rounded">
                    {product.discount}% OFF
                  </span>
                </>
              ) : (
                <span className="text-sm font-extrabold text-gray-900">
                  ₹{product.price?.toFixed(0)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900 group-hover:bg-[var(--theme-primary)] group-hover:text-[var(--theme-primary-ink)] transition-colors duration-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
});

// Skeleton loader
function SkeletonCard() {
  return (
    <div className="relative aspect-[5/7] w-full overflow-hidden rounded-3xl bg-gray-100 animate-pulse border border-gray-200/80">
      <div className="absolute top-4 right-4 h-10 w-10 rounded-full bg-gray-200" />
      <div className="absolute bottom-4 left-4 right-4 h-20 rounded-2xl bg-gray-200" />
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

      <main className="max-w-7xl mx-auto px-4 py-8 mt-(--app-header-h)">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform transition-transform group-hover:-translate-x-1" />
          <span>Go Back</span>
        </button>

        {/* --- HEADER & CONTROLS ALIGNED IN ONE ROW --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          {/* Header Title */}
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl font-sans text-gray-900"
          >
            {filters.category || "All Products"}
          </motion.h2>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input matched with referral image */}
            <div className="relative w-full sm:w-64 md:w-72">
              <input
                type="text"
                placeholder="Search products & categories.."
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-8 py-2 bg-[#f0f4f8] focus:bg-[#e8eef4] rounded-[20px] text-xs text-gray-700 placeholder:text-slate-400 focus:outline-none transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              {filters.q && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, q: "", page: 1 }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Smaller Category Filter Popover Dropdown */}
            <Popover className="relative w-full sm:w-auto">
              <Popover.Button className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-xs font-medium text-gray-700 focus:outline-none cursor-pointer transition-colors">
                <span className="truncate">
                  {filters.category ? `Category: ${filters.category}` : "All Categories"}
                </span>
                <ChevronDownIcon className="h-3 w-3 text-gray-400 shrink-0" />
              </Popover.Button>
              <Popover.Panel className="absolute left-0 sm:right-0 mt-2 w-56 max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 ring-1 ring-black/5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in fade-in zoom-in-95 duration-150">
                {({ close }) => (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className={classNames(
                        !filters.category
                          ? "bg-slate-100 text-gray-900 font-bold"
                          : "text-gray-700 hover:bg-gray-50",
                        "flex items-center justify-between w-full px-3 py-1.5 text-left text-xs rounded-xl transition-colors"
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
                          style={{ paddingLeft: `${depth * 14 + 12}px` }}
                          className={classNames(
                            isSelected
                              ? "bg-slate-100 text-gray-900 font-bold"
                              : depth === 0
                                ? "text-gray-900 font-semibold hover:bg-gray-50"
                                : "text-gray-600 hover:bg-gray-50",
                            "flex items-center justify-between w-full py-1.5 pr-3 text-left text-xs rounded-xl transition-colors"
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
              </Popover.Panel>
            </Popover>

            {/* Smaller Sort By Dropdown */}
            <Popover className="relative w-full sm:w-auto">
              <Popover.Button className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-xs font-medium text-gray-700 focus:outline-none cursor-pointer transition-colors">
                <span className="truncate">
                  {filters.sort === "relevance"
                    ? "Sort By: Default"
                    : filters.sort === "newest"
                    ? "Sort By: Newest"
                    : filters.sort === "price-asc"
                    ? "Price: Low to High"
                    : filters.sort === "price-desc"
                    ? "Price: High to Low"
                    : "Sort By"}
                </span>
                <ChevronDownIcon className="h-3 w-3 text-gray-400 shrink-0" />
              </Popover.Button>
              <Popover.Panel className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 ring-1 ring-black/5">
                {({ close }) => (
                  <div className="flex flex-col gap-0.5">
                    {[
                      { name: "Relevance", value: "relevance" },
                      { name: "Newest", value: "newest" },
                      { name: "Price: Low to High", value: "price-asc" },
                      { name: "Price: High to Low", value: "price-desc" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={classNames(
                          filters.sort === option.value
                            ? "bg-slate-100 text-gray-900 font-bold"
                            : "text-gray-700 hover:bg-gray-50",
                          "block w-full px-3 py-1.5 text-left text-xs rounded-xl transition-colors"
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
              </Popover.Panel>
            </Popover>

            {/* Mobile Filters Button */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="sm:hidden w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Bars3Icon className="h-3.5 w-3.5" /> Filters
            </button>
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

        {/* Results Counter */}
        {(loading || items.length > 0) && (
          <div className="mb-6 text-xs text-gray-500 text-right">
             {!loading && (
               <>Showing {items.length ? Math.min((filters.page - 1) * filters.limit + 1, total) : 0} – {Math.min(filters.page * filters.limit, total)} of {total} products</>
             )}
          </div>
        )}

        {/* PRODUCT GRID LAYOUT */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
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