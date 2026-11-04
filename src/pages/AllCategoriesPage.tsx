import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, ChevronRight, Layers } from "lucide-react";
import api from "../utils/api";
import { resolveAssetUrl } from "../utils/category";
import FooterSection from "../components/FooterSection";
import PageSeo from "../components/seo/PageSeo";
import { useTheme } from "../context/ThemeContext";

interface Category {
  _id?: string;
  id?: string;
  name: string;
  image?: string;
  description?: string;
  parentId?: string | null;
  code?: string;
}

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://placehold.co/600x600?text=Category";
  return resolveAssetUrl(imagePath) || "https://placehold.co/600x600?text=Category";
};

const AllCategoriesPage: React.FC = () => {
  const { categoryShape } = useTheme();
  const isCircle = categoryShape === "circle";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isInitialMount = useRef(true);

  // Backend search fetcher: queries the server API directly
  const fetchCategories = useCallback(async (query: string, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsSearching(true);
    }

    const term = query.trim();
    const params = term ? { search: term } : {};

    try {
      const res = await api.get("/user/shop/categories", { params });
      const list = res.data?.categories || [];
      if (list.length > 0 || term) {
        setCategories(list);
      } else {
        const fallback = await api.get("/category/list", { params });
        setCategories(fallback.data?.list || []);
      }
    } catch (err) {
      console.error("Error fetching categories from backend:", err);
      try {
        const fallback = await api.get("/category/list", { params });
        setCategories(fallback.data?.list || []);
      } catch {
        // Keep empty if both fail
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect: debounces backend queries by 300ms while user types
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchCategories("", true);
      return;
    }

    // Immediately fetch when search query is cleared
    if (!searchQuery.trim()) {
      fetchCategories("", false);
      return;
    }

    const timer = setTimeout(() => {
      fetchCategories(searchQuery, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchCategories]);

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchCategories("", false);
  };

  // Normalize parentId helper
  const getParentId = (cat: Category): string | null => {
    if (!cat.parentId) return null;
    if (typeof cat.parentId === "object") {
      const obj = cat.parentId as any;
      return String(obj._id ?? obj.id ?? "");
    }
    return String(cat.parentId);
  };

  // Top-level categories returned directly by backend
  const rootCategories = useMemo(() => {
    const idSet = new Set(categories.map((c) => String(c._id ?? c.id)));
    return categories.filter((cat) => {
      const pid = getParentId(cat);
      // Category is root if it has no parentId, or if its parent is not in the search results
      return !pid || !idSet.has(pid);
    });
  }, [categories]);

  // Children helper
  const getSubcategories = (parentId: string) => {
    return categories.filter((cat) => {
      const pid = getParentId(cat);
      return pid === parentId;
    });
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col justify-between pt-24 sm:pt-28 md:pt-32">
      <PageSeo
        title="All Categories | Mandaram Drapes"
        description="Browse all collections and categories of fine apparel and drapes."
      />

      <main className="flex-1 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 sm:mt-4 mb-6 uppercase tracking-wider">
          <Link to="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Categories</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 mb-8 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-gray-950 font-sans uppercase">
                All Categories
              </h1>
              {rootCategories.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#7c3aed]">
                  {searchQuery.trim()
                    ? `${rootCategories.length} ${rootCategories.length === 1 ? "Result" : "Results"}`
                    : `${rootCategories.length} Collections`}
                </span>
              )}
            </div>
          </div>

          {/* Backend Quick Search */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full text-xs px-3.5 py-2.5 pl-9 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-black text-gray-900 placeholder-gray-400 font-medium transition-all"
            />
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin absolute left-3 top-3" />
            ) : (
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-black text-xs cursor-pointer p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-square w-full rounded-2xl bg-stone-100 border border-gray-100" />
                <div className="h-4 bg-stone-100 rounded w-2/3" />
                <div className="h-3 bg-stone-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : rootCategories.length === 0 ? (
          <div className="text-center py-20 bg-stone-50/50 rounded-2xl border border-gray-200 my-6">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              No categories found
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4 font-light">
              {searchQuery.trim()
                ? `No collections match "${searchQuery.trim()}". Try a different keyword.`
                : "No categories are currently available in the catalog."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black border border-black rounded-full hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Categories Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {rootCategories.map((category) => {
              const categoryId = String(category._id ?? category.id);
              const subcategories = getSubcategories(categoryId);

              return (
                <div
                  key={categoryId}
                  className={
                    isCircle
                      ? "group flex flex-col items-center text-center w-full"
                      : "group flex flex-col justify-between rounded-2xl p-2.5 sm:p-3 border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white"
                  }
                >
                  <Link to={`/categories/${categoryId}`} className="block w-full">
                    {/* Image Card (Clean Circle or Rounded Square) */}
                    {isCircle ? (
                      <div
                        className="relative aspect-square w-full rounded-full border-2 border-gray-200/80 p-1.5 bg-white isolate shadow-sm transition-all duration-300 group-hover:border-black/30 group-hover:scale-105 group-hover:shadow-lg"
                        style={{ borderRadius: "9999px" }}
                      >
                        <div
                          className="w-full h-full rounded-full overflow-hidden relative bg-stone-100"
                          style={{ borderRadius: "9999px" }}
                        >
                          <img
                            src={getImageUrl(category.image)}
                            alt={category.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "https://placehold.co/600x600?text=Category";
                            }}
                            className="h-full w-full object-cover rounded-full transition-transform duration-500 ease-out group-hover:scale-110"
                            style={{ borderRadius: "9999px" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative aspect-square w-full rounded-xl border border-gray-100 overflow-hidden bg-stone-50 shadow-xs transition-all duration-300 group-hover:shadow-md">
                        <img
                          src={getImageUrl(category.image)}
                          alt={category.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://placehold.co/600x600?text=Category";
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                        {subcategories.length > 0 && (
                          <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            {subcategories.length} {subcategories.length === 1 ? "style" : "styles"}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Category Title */}
                    <div className={`mt-3 sm:mt-4 flex flex-col ${isCircle ? "items-center text-center" : "items-start text-left"}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <h2 className={`font-sans uppercase text-sm sm:text-base font-semibold tracking-wider text-gray-950 group-hover:text-black transition-colors ${isCircle ? "w-full text-center" : "truncate"}`}
                        >
                          {category.name}
                        </h2>
                        {!isCircle && (
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1.5" />
                        )}
                      </div>
                      {isCircle && subcategories.length > 0 && (
                        <span className="text-[11px] text-gray-400 font-medium mt-1">
                          {subcategories.length} {subcategories.length === 1 ? "collection" : "collections"}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Subcategories Tags (Only rendered in default square card mode) */}
                  {!isCircle && (
                    subcategories.length > 0 ? (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-wrap gap-1.5">
                        {subcategories.slice(0, 4).map((sub) => {
                          const subId = String(sub._id ?? sub.id);
                          return (
                            <Link
                              key={subId}
                              to={`/categories/${subId}`}
                              className="text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-black hover:text-white px-2 py-0.5 rounded-md transition-colors truncate max-w-[140px]"
                            >
                              {sub.name}
                            </Link>
                          );
                        })}
                        {subcategories.length > 4 && (
                          <Link
                            to={`/categories/${categoryId}`}
                            className="text-[11px] font-bold text-[#7c3aed] hover:underline px-1 py-0.5 flex items-center"
                          >
                            +{subcategories.length - 4} more
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                        <Link
                          to={`/categories/${categoryId}`}
                          className="text-[11px] font-medium text-gray-400 hover:text-black flex items-center gap-1 transition-colors"
                        >
                          <span>Explore collection</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
};

export default AllCategoriesPage;