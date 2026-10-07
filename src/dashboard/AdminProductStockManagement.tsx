import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../utils/api";
import { domainUrl } from "../utils/constant";
import { useAuth } from "../context/AuthContext";
import { formatProductDescription } from "../utils/sanitizeHtml";
import { calculateDiscountedPrice } from "../utils/product";
import {
  CubeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  EyeIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  TagIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon,
  FolderIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  InformationCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

const BACKEND_BASE_URL = domainUrl.replace(/\/api\/?$/, "");

const resolveProductImage = (path?: string | null) => {
  if (!path || path === "Image") {
    return "";
  }
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  return `${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`;
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  code?: string;
  image?: string;
}

interface ProductVariant {
  id: string;
  productId: string;
  options: Record<string, string>;
  sku?: string;
  priceOverride?: number;
  stock: number;
  isActive: boolean;
  images?: string[];
  createdAt?: string;
}

interface ProductAttributeValue {
  id: string;
  attribute?: { id: string; name: string; type?: string };
  attributeValue?: { id: string; value: string };
  variant?: { id: string; options: Record<string, string> };
}

interface ProductItem {
  id: string;
  name: string;
  code?: string;
  brand?: string;
  categoryId?: string;
  category?: Category;
  price: number;
  salePrice?: number | null;
  basePrice?: number | null;
  discount?: number;
  purchasePrice?: number | null;
  stock: number;
  stockQuantity?: number;
  isActive: boolean;
  image?: string;
  images?: string[];
  description?: string;
  hsnCode?: string;
  taxRate?: number;
  attributeValues?: ProductAttributeValue[];
  priceRange?: { min: number; max: number } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface StockSummary {
  totalProducts: number;
  activeProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalVariants: number;
  totalInventoryUnits: number;
  totalInventoryValue: number;
}

interface SalesStats {
  totalUnitsSold: number;
  totalRevenue: number;
  totalOrdersCount: number;
}

interface ProductDetailResponse {
  product: ProductItem;
  variants: ProductVariant[];
  salesStats: SalesStats;
}

export default function AdminProductStockManagement() {
  const { user } = useAuth();
  const userRole = (user?.role || localStorage.getItem("userRole") || "").toUpperCase();

  // Navigation base prefix based on role
  const dashboardPrefix =
    userRole === "SUPER_ADMIN"
      ? "/super-admin-dashboard"
      : userRole === "STAFF"
      ? "/staff-dashboard"
      : "/admin-dashboard";

  // ── States ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "ACTIVE" | "DISABLED">("ALL");
  const [sortBy, setSortBy] = useState<"stock_asc" | "stock_desc" | "name_asc" | "price_asc" | "price_desc" | "newest">("stock_asc");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Slide-out Drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<ProductDetailResponse | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Custom dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const limitDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Stock Modal State
  const [quickStockModalOpen, setQuickStockModalOpen] = useState(false);
  const [quickStockLoading, setQuickStockLoading] = useState(false);
  const [quickStockProduct, setQuickStockProduct] = useState<ProductItem | null>(null);
  const [quickStockVariants, setQuickStockVariants] = useState<ProductVariant[]>([]);
  const [quickStockValue, setQuickStockValue] = useState<number>(0);
  const [variantStockInputs, setVariantStockInputs] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (limitDropdownRef.current && !limitDropdownRef.current.contains(e.target as Node)) {
        setLimitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when drawer or modal is open to prevent double scrollbars and flickering
  useEffect(() => {
    if (detailDrawerOpen || quickStockModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [detailDrawerOpen, quickStockModalOpen]);

  // ── Fetch Summary Metrics ───────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get("/product/stock-summary");
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error("Failed to load inventory summary", err);
    }
  }, []);

  // ── Fetch Categories ────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/category/list");
      if (res.data?.list) {
        setCategories(res.data.list);
      }
    } catch (err: any) {
      console.error("Failed to load categories", err);
    }
  }, []);

  // ── Fetch Products ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }

      if (selectedCategory && selectedCategory !== "ALL") {
        params.categoryId = selectedCategory;
      }

      if (stockStatusFilter === "IN_STOCK") {
        params.status = "active";
      } else if (stockStatusFilter === "OUT_OF_STOCK") {
        params.status = "out_of_stock";
      } else if (stockStatusFilter === "ACTIVE") {
        params.status = "active";
      } else if (stockStatusFilter === "DISABLED") {
        params.status = "disabled";
      }

      if (sortBy) {
        params.sortBy = sortBy;
      }

      const res = await api.get("/product/list", { params });
      if (res.data?.list) {
        setProducts(res.data.list);
        setTotalItems(res.data.pagination?.total ?? res.data.list.length);
        setTotalPages(res.data.pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      console.error("Failed to fetch products list", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, searchQuery, selectedCategory, stockStatusFilter, sortBy]);

  // Initial Load
  useEffect(() => {
    fetchSummary();
    fetchCategories();
  }, [fetchSummary, fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Refresh Button
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(), fetchProducts()]);
  };

  // ── Load Product Detail (Drawer) ───────────────────────────────────────────
  const openProductDetail = async (productId: string) => {
    setSelectedProductId(productId);
    setDetailDrawerOpen(true);
    setDetailLoading(true);
    setActiveImageIndex(0);
    try {
      const res = await api.get(`/product/detail/${productId}`);
      setDetailData(res.data);
      // Initialize variant stock inputs
      if (res.data?.variants && res.data.variants.length > 0) {
        const vInputs: Record<string, number> = {};
        res.data.variants.forEach((v: ProductVariant) => {
          vInputs[v.id] = v.stock;
        });
        setVariantStockInputs(vInputs);
      } else {
        setQuickStockValue(res.data?.product?.stock ?? 0);
      }
    } catch (err: any) {
      console.error("Failed to load product detail", err);
      toast.error("Error loading product stock details");
      setDetailDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Quick Stock Modal Opener ────────────────────────────────────────────────
  const openQuickStockModal = async (product: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickStockProduct(product);
    setQuickStockValue(product.stock ?? 0);
    setQuickStockVariants([]);
    setVariantStockInputs({});
    setQuickStockLoading(true);
    setQuickStockModalOpen(true);

    // Fetch full variants for this product
    try {
      const res = await api.get(`/product/detail/${product.id}`);
      if (res.data?.variants && res.data.variants.length > 0) {
        setQuickStockVariants(res.data.variants);
        const vInputs: Record<string, number> = {};
        res.data.variants.forEach((v: ProductVariant) => {
          vInputs[v.id] = v.stock;
        });
        setVariantStockInputs(vInputs);
      } else {
        setQuickStockVariants([]);
        setQuickStockValue(res.data?.product?.stock ?? product.stock ?? 0);
      }
    } catch (err) {
      console.error("Failed to load variants for quick stock", err);
      setQuickStockVariants([]);
    } finally {
      setQuickStockLoading(false);
    }
  };

  // ── Save Quick Stock ────────────────────────────────────────────────────────
  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    try {
      setSavingStock(true);
      const payload: any = {};

      if (quickStockVariants.length > 0) {
        payload.variantStocks = variantStockInputs;
      } else {
        payload.stock = Number(quickStockValue);
      }

      const res = await api.patch(`/product/${quickStockProduct.id}/quick-stock`, payload);
      toast.success(res.data?.message || "Stock updated successfully");

      setQuickStockModalOpen(false);
      // Refresh list and summary
      fetchProducts();
      fetchSummary();

      // If drawer is also open for this product, silently update its detail data
      if (detailDrawerOpen && selectedProductId === quickStockProduct.id) {
        const detailRes = await api.get(`/product/detail/${quickStockProduct.id}`);
        setDetailData(detailRes.data);
      }
    } catch (err: any) {
      console.error("Failed to update stock", err);
      toast.error(err.response?.data?.message || "Failed to update stock");
    } finally {
      setSavingStock(false);
    }
  };

  // ── Save Stock directly from Drawer ────────────────────────────────────────
  const handleSaveDrawerStock = async () => {
    if (!detailData?.product) return;
    try {
      setSavingStock(true);
      const payload: any = {};

      if (detailData.variants && detailData.variants.length > 0) {
        payload.variantStocks = variantStockInputs;
      } else {
        payload.stock = Number(quickStockValue);
      }

      const res = await api.patch(`/product/${detailData.product.id}/quick-stock`, payload);
      toast.success("Stock inventory saved successfully");

      // Silently refresh detail data without triggering the full loading screen flicker
      const detailRes = await api.get(`/product/detail/${detailData.product.id}`);
      setDetailData(detailRes.data);
      if (detailRes.data?.variants && detailRes.data.variants.length > 0) {
        const vInputs: Record<string, number> = {};
        detailRes.data.variants.forEach((v: ProductVariant) => {
          vInputs[v.id] = v.stock;
        });
        setVariantStockInputs(vInputs);
      }
      fetchProducts();
      fetchSummary();
    } catch (err: any) {
      console.error("Failed to save drawer stock", err);
      toast.error(err.response?.data?.message || "Failed to save stock");
    } finally {
      setSavingStock(false);
    }
  };

  // ── Client-side Filtered and Sorted list ─────────────────────────────────────
  const sortedProducts = useMemo(() => {
    let result = [...products];

    // Client-side Stock Status Filter for LOW_STOCK (1 to 5)
    if (stockStatusFilter === "LOW_STOCK") {
      result = result.filter((p) => p.stock > 0 && p.stock <= 5);
    }

    // Client Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "stock_asc":
          return a.stock - b.stock;
        case "stock_desc":
          return b.stock - a.stock;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "price_asc":
          return (a.price ?? 0) - (b.price ?? 0);
        case "price_desc":
          return (b.price ?? 0) - (a.price ?? 0);
        case "newest":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return result;
  }, [products, stockStatusFilter, sortBy]);

  // Stock Badge Helper
  const renderStockBadge = (stock: number) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Out of Stock (0)
        </span>
      );
    }
    if (stock <= 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="font-bold mr-1">{stock}</span> left (Low Stock)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="font-bold mr-1">{stock}</span> in stock
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-5 lg:p-7 max-w-full overflow-x-hidden">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 shrink-0">
            <CubeIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Products & Stock Inventory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">
              Live stock levels, variants breakdown & inventory adjustments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh Inventory"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            to={`${dashboardPrefix}/manage-catalog`}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95 whitespace-nowrap"
          >
            <TagIcon className="w-4 h-4" />
            <span>Catalog Manager</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">Products</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <CubeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{summary?.totalProducts ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            <span className="font-semibold text-emerald-600">{summary?.activeProducts ?? 0} active</span> in store
          </div>
        </div>

        {/* In Stock */}
        <div
          onClick={() => setStockStatusFilter("IN_STOCK")}
          className={`cursor-pointer bg-white rounded-2xl p-3.5 sm:p-4 border transition-all ${
            stockStatusFilter === "IN_STOCK"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
              : "border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700">In Stock</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700">{summary?.inStockProducts ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">&gt; 5 units available</div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setStockStatusFilter("LOW_STOCK")}
          className={`cursor-pointer bg-white rounded-2xl p-3.5 sm:p-4 border transition-all ${
            stockStatusFilter === "LOW_STOCK"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md"
              : "border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700">Low Stock</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <ExclamationTriangleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-700">{summary?.lowStockProducts ?? 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1 truncate">1 to 5 units left</div>
        </div>

        {/* Out of Stock Alert */}
        <div
          onClick={() => setStockStatusFilter("OUT_OF_STOCK")}
          className={`cursor-pointer bg-white rounded-2xl p-3.5 sm:p-4 border transition-all ${
            stockStatusFilter === "OUT_OF_STOCK"
              ? "border-rose-500 ring-2 ring-rose-500/20 shadow-md"
              : "border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700">Out of Stock</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <XCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-700">{summary?.outOfStockProducts ?? 0}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1 truncate">Immediate restock needed</div>
        </div>
      </div>

      {/* ── Filters and Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 mb-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, code, brand..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdowns & View Mode row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5">
            {/* Category Custom Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[130px]" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setCategoryDropdownOpen((prev) => !prev);
                  setSortDropdownOpen(false);
                }}
                className={`w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
                  categoryDropdownOpen
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white text-indigo-900"
                    : "border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 truncate max-w-[130px] sm:max-w-[160px]">
                  <FolderIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {selectedCategory === "ALL"
                      ? "All Categories"
                      : categories.find((c) => c.id === selectedCategory)?.name || "All Categories"}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    categoryDropdownOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {categoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5 z-40 max-h-72 overflow-y-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("ALL");
                        setPage(1);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedCategory === "ALL"
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TagIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>All Categories</span>
                      </div>
                      {selectedCategory === "ALL" && <CheckIcon className="w-4 h-4 text-indigo-600" />}
                    </button>

                    {categories.length > 0 && <div className="my-1 border-t border-slate-100" />}

                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setPage(1);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort selector Custom Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[130px]" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setSortDropdownOpen((prev) => !prev);
                  setCategoryDropdownOpen(false);
                }}
                className={`w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
                  sortDropdownOpen
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white text-indigo-900"
                    : "border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 truncate max-w-[140px] sm:max-w-[170px]">
                  <ArrowsUpDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {
                      [
                        { label: "Stock: Low to High", value: "stock_asc" },
                        { label: "Stock: High to Low", value: "stock_desc" },
                        { label: "Recently Added", value: "newest" },
                        { label: "Name: A to Z", value: "name_asc" },
                        { label: "Price: Low to High", value: "price_asc" },
                        { label: "Price: High to Low", value: "price_desc" },
                      ].find((o) => o.value === sortBy)?.label || "Sort"
                    }
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    sortDropdownOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {sortDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1.5 w-64 sm:w-72 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5 z-40"
                  >
                    {[
                      { label: "Stock: Low to High (Needs Restock)", value: "stock_asc" },
                      { label: "Stock: High to Low", value: "stock_desc" },
                      { label: "Recently Added", value: "newest" },
                      { label: "Name: A to Z", value: "name_asc" },
                      { label: "Price: Low to High", value: "price_asc" },
                      { label: "Price: High to Low", value: "price_desc" },
                    ].map((opt) => {
                      const isSelected = sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value as any);
                            setPage(1);
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "card"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <Squares2X2Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table View"
              >
                <ListBulletIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3.5 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {[
            { label: "All Items", key: "ALL" },
            { label: "In Stock (>5)", key: "IN_STOCK" },
            { label: "Low Stock (≤5)", key: "LOW_STOCK" },
            { label: "Out of Stock (0)", key: "OUT_OF_STOCK" },
            { label: "Active in Store", key: "ACTIVE" },
            { label: "Disabled / Draft", key: "DISABLED" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setStockStatusFilter(item.key as any);
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockStatusFilter === item.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}

          {(selectedCategory !== "ALL" || stockStatusFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setStockStatusFilter("ALL");
                setSearchQuery("");
                setPage(1);
              }}
              className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Products & Stock List Container ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading inventory data...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CubeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No products found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No products match your current search and filter criteria. Try adjusting the filters or search keywords.
            </p>
          </div>
        ) : viewMode === "card" ? (
          /* ── Premium Card Grid View ───────────────────────────────────────── */
          <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
            {sortedProducts.map((p) => {
              const displayPrice = p.salePrice || p.price;
              const hasDiscount = p.basePrice && p.basePrice > displayPrice;
              const discountPercent = hasDiscount
                ? Math.round(((p.basePrice! - displayPrice) / p.basePrice!) * 100)
                : 0;
              const resolvedImg = resolveProductImage(p.image);

              return (
                <div
                  key={p.id}
                  onClick={() => openProductDetail(p.id)}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Top Product Image Box with floating category badge */}
                  <div className="relative w-full h-44 sm:h-48 bg-gradient-to-b from-slate-50/80 to-slate-100/50 border-b border-slate-100 flex items-center justify-center p-3 overflow-hidden">
                    {resolvedImg ? (
                      <img
                        src={resolvedImg}
                        alt={p.name}
                        className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                        <CubeIcon className="w-8 h-8" />
                      </div>
                    )}

                    {/* Category badge top left */}
                    <div className="absolute top-2.5 left-2.5 max-w-[80%]">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/80 shadow-xs truncate">
                        <TagIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{p.category?.name || "Uncategorized"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content Information */}
                  <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        {p.code && (
                          <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            Code: {p.code}
                          </span>
                        )}
                        {p.brand && <span className="truncate font-medium text-slate-500">• {p.brand}</span>}
                      </div>
                    </div>

                    {/* Price and Stock Status Box */}
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100/90 space-y-2.5">
                      {/* Price row */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Price
                        </span>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {p.priceRange ? (
                              <span>₹{p.priceRange.min} – ₹{p.priceRange.max}</span>
                            ) : (
                              <span>₹{displayPrice}</span>
                            )}
                          </div>
                          {hasDiscount && (
                            <div className="flex items-center justify-end gap-1 text-[10px]">
                              <span className="line-through text-slate-400">₹{p.basePrice}</span>
                              <span className="font-semibold text-emerald-600">({discountPercent}% OFF)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subtle divider */}
                      <div className="border-t border-slate-200/60" />

                      {/* Stock Inventory row */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Stock
                        </span>
                        <div>
                          {p.stock <= 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                              Out of Stock (0)
                            </span>
                          ) : p.stock <= 5 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                              <span className="font-bold mr-1 text-amber-900">{p.stock}</span> units left (Low)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="font-bold mr-1 text-emerald-900">{p.stock}</span> units in stock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div
                    className="px-3.5 sm:px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => openQuickStockModal(p, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-indigo-600 hover:border-slate-300 transition-colors shadow-2xs"
                      title="Quick Stock Adjustment"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Quick Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openProductDetail(p.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
                      title="Open Sidebar Details"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Details</span>
                      <ChevronRightIcon className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ───────────────────────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Pricing</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedProducts.map((p) => {
                  const displayPrice = p.salePrice || p.price;
                  const hasDiscount = p.basePrice && p.basePrice > displayPrice;
                  const discountPercent = hasDiscount
                    ? Math.round(((p.basePrice! - displayPrice) / p.basePrice!) * 100)
                    : 0;
                  const resolvedImg = resolveProductImage(p.image);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openProductDetail(p.id)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative group/img">
                            {resolvedImg ? (
                              <img
                                src={resolvedImg}
                                alt={p.name}
                                className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <CubeIcon className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              {p.code && <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Code: {p.code}</span>}
                              {p.brand && <span>• {p.brand}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          <TagIcon className="w-3 h-3 text-slate-400" />
                          {p.category?.name || "Uncategorized"}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {p.priceRange ? (
                            <span>
                              ₹{p.priceRange.min} – ₹{p.priceRange.max}
                            </span>
                          ) : (
                            <span>₹{displayPrice}</span>
                          )}
                        </div>
                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="line-through text-slate-400">₹{p.basePrice}</span>
                            <span className="font-semibold text-emerald-600">({discountPercent}% OFF)</span>
                          </div>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {renderStockBadge(p.stock)}
                          <span className="text-[11px] text-slate-400">
                            Est. Value: ₹{((p.stock ?? 0) * (displayPrice ?? 0)).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => openQuickStockModal(p, e)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                            title="Quick Stock Adjustment"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openProductDetail(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
                            title="View Full Stock Details"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{sortedProducts.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalItems}</span> products
          </div>

          <div className="flex items-center gap-2">
            {/* Custom Limit Dropdown */}
            <div className="relative" ref={limitDropdownRef}>
              <button
                type="button"
                onClick={() => setLimitDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none transition-all cursor-pointer shadow-2xs"
              >
                <span>{limit} per page</span>
                <ChevronDownIcon
                  className={`w-3 h-3 text-slate-400 transition-transform ${limitDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {limitDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full right-0 mb-1.5 w-32 bg-white rounded-xl border border-slate-200 shadow-lg p-1 z-30"
                  >
                    {[10, 25, 50, 100].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLimit(l);
                          setPage(1);
                          setLimitDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          limit === l
                            ? "bg-indigo-50 text-indigo-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{l} per page</span>
                        {limit === l && <CheckIcon className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-Out Product & Stock Detail Drawer ───────────────────────────── */}
      <AnimatePresence>
        {detailDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDetailDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/50"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <CubeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Product & Stock Details</h2>
                      <p className="text-xs text-slate-500">Live breakdown, variants matrix and sales demand</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailDrawerOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                  {detailLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                      <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                      <p className="text-sm font-medium">Loading product stock details...</p>
                    </div>
                  ) : !detailData?.product ? (
                    <div className="py-20 text-center text-slate-500">Product details not available</div>
                  ) : (
                    <>
                      {/* Product Overview Card */}
                      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Image Gallery */}
                          <div className="shrink-0">
                            {(() => {
                              const gallery = [
                                detailData.product.image,
                                ...(detailData.product.images || []),
                              ]
                                .filter(Boolean)
                                .map((img) => resolveProductImage(img))
                                .filter(Boolean);

                              const currentImg = gallery[activeImageIndex] || resolveProductImage(detailData.product.image);

                              return (
                                <div className="flex flex-col gap-2">
                                  <div className="w-32 h-32 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                                    {currentImg ? (
                                      <img
                                        src={currentImg}
                                        alt={detailData.product.name}
                                        className="w-full h-full object-cover object-center"
                                      />
                                    ) : (
                                      <CubeIcon className="w-10 h-10 text-slate-300" />
                                    )}
                                  </div>
                                  {gallery.length > 1 && (
                                    <div className="flex flex-wrap gap-1.5 max-w-[130px]">
                                      {gallery.map((img, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setActiveImageIndex(idx)}
                                          className={`w-7 h-7 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                            activeImageIndex === idx
                                              ? "border-indigo-600 ring-2 ring-indigo-600/30"
                                              : "border-slate-200 opacity-60 hover:opacity-100"
                                          }`}
                                        >
                                          <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                <TagIcon className="w-3 h-3" />
                                {detailData.product.category?.name || "Uncategorized"}
                              </span>
                              {detailData.product.isActive ? (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Active in Store
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  Draft / Hidden
                                </span>
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-slate-900">{detailData.product.name}</h3>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
                              <div>
                                <span className="text-slate-400">Product Code:</span>{" "}
                                <span className="font-mono font-bold text-slate-800">
                                  {detailData.product.code || "N/A"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Brand:</span>{" "}
                                <span className="font-semibold text-slate-800">{detailData.product.brand || "N/A"}</span>
                              </div>
                              {(() => {
                                const rawPrice = Number(detailData.product.price || 0);
                                const discount = Number(detailData.product.discount || 0);
                                const hasDiscount = discount > 0;
                                const sellingPrice = hasDiscount
                                  ? calculateDiscountedPrice(rawPrice, discount)
                                  : (detailData.product.salePrice != null ? Number(detailData.product.salePrice) : rawPrice);
                                const baseMrp = detailData.product.basePrice != null ? Number(detailData.product.basePrice) : rawPrice;

                                return (
                                  <>
                                    <div>
                                      <span className="text-slate-400">Selling Price:</span>{" "}
                                      <span className="font-bold text-slate-900">₹{sellingPrice.toLocaleString("en-IN")}</span>
                                      {hasDiscount && (
                                        <span className="ml-1 text-[10px] font-bold text-emerald-600">({discount}% OFF)</span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Base / MRP:</span>{" "}
                                      <span className={`font-semibold ${hasDiscount ? "line-through text-slate-400" : "text-slate-700"}`}>
                                        ₹{baseMrp.toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sales Demand Performance Cards */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                          <ChartBarIcon className="w-4 h-4 text-indigo-600" />
                          Sales Performance & Demand
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500">Lifetime Units Sold</div>
                            <div className="text-xl font-bold text-slate-900 mt-1">
                              {detailData.salesStats?.totalUnitsSold ?? 0}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500">Total Revenue</div>
                            <div className="text-xl font-bold text-emerald-700 mt-1">
                              ₹{(detailData.salesStats?.totalRevenue ?? 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500">Orders Count</div>
                            <div className="text-xl font-bold text-indigo-700 mt-1">
                              {detailData.salesStats?.totalOrdersCount ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock Management Section */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Inventory & Stock Adjustment</h4>
                            <p className="text-xs text-slate-500">
                              {detailData.variants && detailData.variants.length > 0
                                ? `Adjust stock across all ${detailData.variants.length} individual variants`
                                : "Adjust total available units for this product"}
                            </p>
                          </div>
                          <div>{renderStockBadge(detailData.product.stock)}</div>
                        </div>

                        {/* If Product has Variants */}
                        {detailData.variants && detailData.variants.length > 0 ? (
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                                  <tr>
                                    <th className="p-3">Variant (Options)</th>
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3 text-center">Stock Level</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {detailData.variants.map((v) => {
                                    const optString = Object.entries(v.options || {})
                                      .map(([k, val]) => `${k}: ${val}`)
                                      .join(", ");
                                    const currentVal = variantStockInputs[v.id] ?? v.stock;

                                    return (
                                      <tr key={v.id} className="hover:bg-slate-50/60">
                                        <td className="p-3 font-semibold text-slate-800">{optString || "Default"}</td>
                                        <td className="p-3 font-mono text-slate-500">{v.sku || "—"}</td>
                                        <td className="p-3 font-medium text-slate-700">
                                          ₹{v.priceOverride || detailData.product.price}
                                        </td>
                                        <td className="p-3">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setVariantStockInputs((prev) => ({
                                                  ...prev,
                                                  [v.id]: Math.max((prev[v.id] ?? v.stock) - 1, 0),
                                                }))
                                              }
                                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                                            >
                                              <MinusIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <input
                                              type="number"
                                              min="0"
                                              value={currentVal}
                                              onChange={(e) =>
                                                setVariantStockInputs((prev) => ({
                                                  ...prev,
                                                  [v.id]: Math.max(parseInt(e.target.value) || 0, 0),
                                                }))
                                              }
                                              className="w-16 text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setVariantStockInputs((prev) => ({
                                                  ...prev,
                                                  [v.id]: (prev[v.id] ?? v.stock) + 1,
                                                }))
                                              }
                                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                                            >
                                              <PlusIcon className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {(() => {
                              const hasChanges = Boolean(
                                detailData.variants &&
                                detailData.variants.some((v) => (variantStockInputs[v.id] ?? v.stock) !== v.stock)
                              );

                              return (
                                <AnimatePresence>
                                  {hasChanges && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0, y: 4 }}
                                      animate={{ opacity: 1, height: "auto", y: 0 }}
                                      exit={{ opacity: 0, height: 0, y: 4 }}
                                      transition={{ duration: 0.18 }}
                                      className="flex justify-end pt-2 overflow-hidden"
                                    >
                                      <button
                                        type="button"
                                        onClick={handleSaveDrawerStock}
                                        disabled={savingStock}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95 disabled:opacity-50"
                                      >
                                        {savingStock ? (
                                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircleIcon className="w-4 h-4" />
                                        )}
                                        <span>Save All Variant Stocks</span>
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              );
                            })()}
                          </div>
                        ) : (
                          /* Simple Product Stock Adjuster */
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-600">Current Available Units:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQuickStockValue((prev) => Math.max(prev - 1, 0))}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                                >
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={quickStockValue}
                                  onChange={(e) => setQuickStockValue(Math.max(parseInt(e.target.value) || 0, 0))}
                                  className="w-24 text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setQuickStockValue((prev) => prev + 1)}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>

                              {(() => {
                                const hasChanges = quickStockValue !== (detailData.product.stock ?? 0);

                                return (
                                  <AnimatePresence>
                                    {hasChanges && (
                                      <motion.button
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        type="button"
                                        onClick={handleSaveDrawerStock}
                                        disabled={savingStock}
                                        className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                                      >
                                        {savingStock && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                                        <span>Update Stock</span>
                                      </motion.button>
                                    )}
                                  </AnimatePresence>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Product Specifications & Attributes */}
                      {detailData.product.attributeValues && detailData.product.attributeValues.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Assigned Attributes & Specifications
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {detailData.product.attributeValues.map((av) => (
                              <div key={av.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                                  {av.attribute?.name || "Attribute"}
                                </span>
                                <span className="font-semibold text-slate-800 mt-0.5 block">
                                  {av.attributeValue?.value || "N/A"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description Preview */}
                      {detailData.product.description && (
                        <div className="bg-white rounded-2xl p-5 border border-slate-200">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Description</h4>
                          <div
                            className="text-xs text-slate-600 leading-relaxed space-y-2 [&>p]:mb-2 [&>p:last-child]:mb-0 [&_b]:font-bold [&_b]:text-slate-900 [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                            dangerouslySetInnerHTML={{
                              __html: formatProductDescription(detailData.product.description),
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  {detailData?.product && (
                    <a
                      href={`/products/${detailData.product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      <span>View on Storefront</span>
                    </a>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      to={`${dashboardPrefix}/manage-catalog`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      <span>Edit in Catalog</span>
                    </Link>

                    <button
                      onClick={() => setDetailDrawerOpen(false)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Quick Stock Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {quickStockModalOpen && quickStockProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setQuickStockModalOpen(false)}
                className="fixed inset-0 bg-slate-900/50"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 z-10"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <PencilSquareIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Quick Stock Adjustment</h3>
                      <p className="text-xs text-slate-500">{quickStockProduct.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuickStockModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4 space-y-4">
                  {quickStockLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Loading Variant Stock...</p>
                        <p className="text-xs text-slate-400 mt-0.5">Fetching live inventory details</p>
                      </div>
                    </div>
                  ) : quickStockVariants.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto overscroll-contain pr-1">
                      <p className="text-xs text-slate-500">
                        Adjust stock count for each variant. Total stock will be automatically synchronized.
                      </p>
                      {quickStockVariants.map((v) => {
                        const optString = Object.entries(v.options || {})
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(", ");
                        const currentVal = variantStockInputs[v.id] ?? v.stock;

                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{optString || "Default"}</div>
                              {v.sku && <div className="text-[10px] font-mono text-slate-400">Code: {v.sku}</div>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setVariantStockInputs((prev) => ({
                                    ...prev,
                                    [v.id]: Math.max((prev[v.id] ?? v.stock) - 1, 0),
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <MinusIcon className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={currentVal}
                                onChange={(e) =>
                                  setVariantStockInputs((prev) => ({
                                    ...prev,
                                    [v.id]: Math.max(parseInt(e.target.value) || 0, 0),
                                  }))
                                }
                                className="w-16 text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setVariantStockInputs((prev) => ({
                                    ...prev,
                                    [v.id]: (prev[v.id] ?? v.stock) + 1,
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-500 mb-2">Available Stock Units:</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuickStockValue((prev) => Math.max(prev - 1, 0))}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-xs font-bold"
                        >
                          <MinusIcon className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={quickStockValue}
                          onChange={(e) => setQuickStockValue(Math.max(parseInt(e.target.value) || 0, 0))}
                          className="w-28 text-center py-2 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuickStockValue((prev) => prev + 1)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-xs font-bold"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {(() => {
                  const hasChanges = quickStockVariants.length > 0
                    ? quickStockVariants.some((v) => (variantStockInputs[v.id] ?? v.stock) !== v.stock)
                    : quickStockValue !== (quickStockProduct.stock ?? 0);

                  return (
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setQuickStockModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <AnimatePresence>
                        {hasChanges && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            type="button"
                            onClick={handleSaveQuickStock}
                            disabled={savingStock || quickStockLoading}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95 disabled:opacity-50"
                          >
                            {savingStock && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save Changes</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
