// src/components/AlternatingShowcase.tsx
//
// Dynamic Interleaved / Alternating Showcase:
// Alternates Full-Width Banners and Featured Product Sections down the homepage.
// - Featured Section 1: Global Handpicked Featured Products (isFeatured: true).
// - Featured Sections 2 and 3: Category-based selections configured in Homepage Manager.
// - Banners 1 to 3: Full-width natural size banners.
// Handles uneven counts seamlessly: e.g. 1 banner and 3 featured sections or vice versa.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import FeaturedProducts, { Product } from "./FeaturedProducts";
import { PreFooterBannerItem } from "./PreFooterBannerSlider";

export interface FeaturedCategorySlot {
  id: string;
  categoryId: string;
  customTitle?: string;
  customSubtitle?: string;
  limit?: number;
  isActive?: boolean;
}

export interface FeaturedCategoriesConfig {
  slots: FeaturedCategorySlot[];
}

export const DEFAULT_FEATURED_CATEGORIES_CONFIG: FeaturedCategoriesConfig = {
  slots: [
    { id: "slot-1", categoryId: "", customTitle: "", customSubtitle: "", limit: 8, isActive: true },
    { id: "slot-2", categoryId: "", customTitle: "", customSubtitle: "", limit: 8, isActive: true },
  ],
};

interface AlternatingShowcaseProps {
  handpickedProducts: Product[];
  productsLoading: boolean;
  productsError: string | null;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

interface LoadedCategorySection {
  slotId: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink: string;
}

const FullWidthBanner = ({ banner, index }: { banner: PreFooterBannerItem; index: number }) => {
  const navigate = useNavigate();
  const hasLink = Boolean(banner.link?.trim());

  const handleBannerClick = () => {
    const rawLink = banner.link?.trim();
    if (!rawLink) return;

    if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
      window.open(rawLink, "_blank", "noopener,noreferrer");
    } else {
      const route = rawLink.startsWith("/") ? rawLink : `/${rawLink}`;
      navigate(route);
    }
  };

  return (
    <div className="w-full bg-white select-none py-2 sm:py-4">
      <div
        className={`w-full overflow-hidden relative group ${
          hasLink ? "cursor-pointer" : "cursor-default"
        }`}
        onClick={handleBannerClick}
      >
        <img
          src={banner.image}
          alt={banner.title || `Promotional banner ${index + 1}`}
          className="w-full h-auto block object-contain transition-transform duration-500 group-hover:scale-[1.005]"
          loading={index === 0 ? "eager" : "lazy"}
          draggable={false}
        />
        {hasLink && (
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-900 shadow-md backdrop-blur-sm">
              Explore &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function AlternatingShowcase({
  handpickedProducts,
  productsLoading,
  productsError,
  sectionTitle = "Featured Collections",
  sectionSubtitle,
}: AlternatingShowcaseProps) {
  const [banners, setBanners] = useState<PreFooterBannerItem[]>([]);
  const [categorySections, setCategorySections] = useState<LoadedCategorySection[]>([]);

  useEffect(() => {
    let isMounted = true;

    api
      .get("/home-banners/homepage-config")
      .then(async ({ data }) => {
        if (!isMounted) return;

        // 1. Extract active full-width banners (max 3)
        if (data?.preFooterConfig?.enabled !== false && Array.isArray(data?.preFooterConfig?.banners)) {
          const active = data.preFooterConfig.banners
            .slice(0, 3)
            .filter(
              (b: PreFooterBannerItem) => b && b.isActive !== false && b.image && b.image.trim() !== ""
            );
          setBanners(active);
        } else {
          setBanners([]);
        }

        // 2. Fetch Category Featured Sections (Slots 1 and 2 — Featured Sections 2 and 3)
        const slots: FeaturedCategorySlot[] = (data?.featuredCategoriesConfig?.slots || []).slice(0, 2);
        const activeSlots = slots.filter((s) => s && s.isActive !== false && s.categoryId && s.categoryId.trim() !== "");

        if (activeSlots.length === 0) {
          setCategorySections([]);
          return;
        }

        // Fetch products for each active category slot in parallel
        const results = await Promise.allSettled(
          activeSlots.map(async (slot) => {
            const limit = slot.limit || 8;
            const res = await api.get(`/user/shop/categories/${slot.categoryId}?limit=${limit}`);
            const rawProducts = res.data?.getProducts || res.data?.products || [];
            const categoryName = res.data?.category?.name || "Collection";

            const normalized: Product[] = rawProducts.map((p: any) => ({
              id: p.id || p._id,
              name: p.name,
              price: typeof p.price === "number" ? p.price : Number(p.price) || 0,
              image: p.image || (Array.isArray(p.images) && p.images[0]) || "",
              category: { name: p.category?.name || categoryName },
              discount: typeof p.discount === "number" ? p.discount : Number(p.discount) || 0,
            }));

            return {
              slotId: slot.id,
              title: slot.customTitle?.trim() || categoryName,
              subtitle: slot.customSubtitle?.trim(),
              products: normalized,
              viewAllLink: `/categories/${slot.categoryId}`,
            } as LoadedCategorySection;
          })
        );

        if (!isMounted) return;

        const loaded: LoadedCategorySection[] = [];
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.products.length > 0) {
            loaded.push(r.value);
          }
        }
        setCategorySections(loaded);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Construct all active Featured Sections (Section 1 = handpicked, Sections 2-3 = categories)
  const allSections: {
    key: string;
    title: string;
    subtitle?: string;
    products: Product[];
    viewAllLink?: string;
    loading: boolean;
    error: string | null;
  }[] = [];

  // Section 1: Handpicked Featured Products (renders if products exist or currently loading)
  if (handpickedProducts.length > 0 || productsLoading) {
    allSections.push({
      key: "handpicked-featured",
      title: sectionTitle,
      subtitle: sectionSubtitle,
      products: handpickedProducts,
      viewAllLink: "/products",
      loading: productsLoading,
      error: productsError,
    });
  }

  // Sections 2 and 3: Category Showcases
  for (const catSec of categorySections) {
    allSections.push({
      key: catSec.slotId,
      title: catSec.title,
      subtitle: catSec.subtitle,
      products: catSec.products,
      viewAllLink: catSec.viewAllLink,
      loading: false,
      error: null,
    });
  }

  const maxCount = Math.max(banners.length, allSections.length);

  if (maxCount === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {Array.from({ length: maxCount }).map((_, i) => (
        <React.Fragment key={`showcase-slot-${i}`}>
          {/* Featured Section i (if it exists) */}
          {allSections[i] && (
            <div className="w-full">
              <FeaturedProducts
                featuredProducts={allSections[i].products}
                productsLoading={allSections[i].loading}
                productsError={allSections[i].error}
                sectionTitle={allSections[i].title}
                sectionSubtitle={allSections[i].subtitle}
                viewAllLink={allSections[i].viewAllLink}
              />
            </div>
          )}

          {/* Banner i (if it exists) */}
          {banners[i] && (
            <div className="w-full">
              <FullWidthBanner banner={banners[i]} index={i} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
