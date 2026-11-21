import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import api from "../utils/api";
import { resolveAssetUrl } from "../utils/category";
import { useTheme } from "../context/ThemeContext";

interface Category {
  _id?: string;
  id?: string;
  name: string;
  image: string;
  slug?: string;
  parentId?: string | null;
}

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "https://placehold.co/600x600?text=Category";
  return resolveAssetUrl(imagePath) || "https://placehold.co/600x600?text=Category";
};

const CategorySection = () => {
  const { categoryShape } = useTheme();
  const isCircle = categoryShape === "circle";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/user/shop/categories");
      const fetchedCategories: Category[] = res.data.categories || [];
      // Storefront home only shows top-level categories
      const rootCategories = fetchedCategories.filter((cat) => !cat.parentId);
      const processedCategories = rootCategories.map((cat) => ({
        ...cat,
        slug: cat.name.toLowerCase().replace(/\s+/g, "-"),
      }));
      setCategories(processedCategories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- Loading Skeleton ---
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 py-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-full animate-pulse">
          <div className={`w-full aspect-square bg-stone-100 ${isCircle ? "rounded-full" : "rounded-2xl"} mb-3 border border-gray-100`} />
          <div className={`h-3.5 bg-stone-100 rounded ${isCircle ? "w-1/3 mx-auto" : "w-1/2"}`} />
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-white py-12 relative overflow-hidden font-sans">
      <div className={`w-full ${isCircle ? "max-w-7xl mx-auto" : ""} px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 relative z-10`}>
        {/* Section Header Matching Featured Products / Tribal Ornaments Style */}
        <div className="flex items-baseline justify-between mb-6 sm:mb-8 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-950 font-sans uppercase">
              Shop by Category
            </h2>
          </div>

          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-black transition-colors group shrink-0"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-light text-sm">
              No collections found.
            </p>
          </div>
        ) : (
          /* All Categories in a Clean Top-to-Bottom Responsive Grid ("Down to Down") */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {categories.map((category) => {
              const categoryId = category._id ?? category.id;
              return (
                <div key={categoryId} className="w-full">
                  <Link
                    to={`/categories/${categoryId}`}
                    className="group block select-none"
                  >
                    {/* Square 1:1 Aspect Ratio Card with Rounded-2xl / Circle */}
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
                      <div className="relative aspect-square w-full rounded-2xl border border-gray-100 overflow-hidden bg-stone-50 shadow-xs transition-all duration-300 group-hover:shadow-md">
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
                      </div>
                    )}

                    {/* Category Name Under Image */}
                    <div className={`mt-3 sm:mt-4 flex flex-col ${isCircle ? "items-center text-center" : "items-start text-left"} px-0.5 font-sans`}>
                      <h3 className={`w-full text-xs sm:text-[13px] font-normal text-gray-800 leading-snug line-clamp-1 group-hover:text-black transition-colors ${isCircle ? "text-center text-xs sm:text-sm font-semibold text-gray-900" : "text-left text-xs sm:text-[13px] font-normal text-gray-800"} uppercase tracking-wider`}>
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategorySection;
