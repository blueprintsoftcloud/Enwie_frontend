import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import api from "../utils/api";

interface Category {
  _id?: string;
  id?: string;
  name: string;
  image: string;
  slug?: string;
  parentId?: string | null;
}

const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Logic remains exactly the same ---
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/user/shop/categories");
      const fetchedCategories: Category[] = res.data.categories || [];
      // Storefront home only shows top-level categories — subcategories are reached by
      // drilling into a category or via the product filter sidebar, not as their own tile.
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

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const cardVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  // --- Loading Skeleton Component ---
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-10">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="w-full aspect-[3/4] bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      ))}
    </div>
  );

  // --- Main Render ---
  return (
    <section className="bg-white py-24 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[var(--theme-primary)]/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header with the "Midnight Summer" Gradient */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl font-bold tracking-tighter sm:text-5xl"
          >
            <span className="text-gray-900 text-3xl uppercase">
              Shop by Category
            </span>
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "80px" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="h-1 bg-[var(--theme-primary)] mx-auto mt-4"
          />
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400 font-light">
              No collections found.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-10 sm:gap-y-12"
          >
            {categories.map((category) => {
              const categoryId = category._id ?? category.id;
              return (
                <motion.div
                  key={categoryId}
                  variants={cardVariants}
                  className="group cursor-pointer"
                >
                  <Link to={`/categories/${categoryId}`} className="block">
                    {/* Image Container */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all duration-500 group-hover:shadow-xl">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 z-10" />
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-cover object-center transform transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-110"
                      />
                    </div>

                    {/* Text Container */}
                    <div className="mt-4 text-center relative">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-widest">
                        {category.name}
                      </h3>
                      {/* Animated Underline */}
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-px bg-gray-400 transition-all duration-300 group-hover:w-1/2"></span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default CategorySection;
