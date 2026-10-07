// src/components/CategoryMegaMenu.tsx
// Site-wide "browse by category" bar rendered directly under Navbar.
// Displays top-level categories configured in Homepage Manager > Navigation Menu.
// Hovering a category with subcategories displays an elevated glassmorphic mega flyout.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import api from "../utils/api";

interface FlatCategory {
  id: string;
  name: string;
  parentId: string | null;
  showInNav?: boolean;
}

const CategoryMegaMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [openTopId, setOpenTopId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width?: number } | null>(
    null
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth * 0.6), behavior: "smooth" });
  };

  useEffect(() => {
    api
      .get("/user/shop/categories")
      .then((res) => {
        const raw = res.data.categories || [];
        const normalized: FlatCategory[] = raw.map((c: any) => ({
          id: String(c.id ?? c._id),
          name: c.name,
          parentId: c.parentId ? String(c.parentId) : null,
          showInNav: c.showInNav !== false,
        }));
        setCategories(normalized);
      })
      .catch(() => setCategories([]));
  }, []);

  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const topLevel = categories.filter((c) => !c.parentId && c.showInNav !== false);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [topLevel.length]);

  if (topLevel.length === 0) return null;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenu = (id: string, triggerEl: HTMLElement) => {
    cancelClose();
    const rect = triggerEl.getBoundingClientRect();
    // Position dropdown under the trigger, clamping left to prevent viewport clipping
    const dropdownEstimatedWidth = 460;
    let leftPos = rect.left;
    if (leftPos + dropdownEstimatedWidth > window.innerWidth - 16) {
      leftPos = Math.max(16, window.innerWidth - dropdownEstimatedWidth - 16);
    }
    setMenuPos({ left: leftPos, top: rect.bottom + 4 });
    setOpenTopId(id);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenTopId(null), 180);
  };

  const goTo = (id: string) => {
    setOpenTopId(null);
    navigate(`/categories/${id}`);
  };

  const openTop = topLevel.find((t) => t.id === openTopId) ?? null;
  const openColumns = openTop ? childrenOf(openTop.id) : [];

  return (
    <div className="relative z-20 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all">
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Left Scroll Button & Fade Mask */}
        {canScrollLeft && (
          <div className="absolute left-2 sm:left-4 top-0 bottom-0 z-30 flex items-center">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/90 to-transparent" />
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll left"
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Strip */}
        <nav
          ref={scrollRef}
          onScroll={updateScrollState}
          onMouseLeave={scheduleClose}
          className="flex items-center gap-1.5 sm:gap-2 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {/* Quick All Categories Pill */}
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50/80 border border-gray-200/70 transition-all duration-200 cursor-pointer shadow-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span>All Products</span>
          </button>

          <div className="h-4 w-px bg-gray-200 shrink-0 mx-1 hidden sm:block" />

          {/* Top-level Category Pills */}
          {topLevel.map((top) => {
            const columns = childrenOf(top.id);
            const hasChildren = columns.length > 0;
            const isOpen = openTopId === top.id;
            const isActiveCategory = location.pathname === `/categories/${top.id}`;

            return (
              <div
                key={top.id}
                className="relative shrink-0"
                onMouseEnter={(e) => hasChildren && openMenu(top.id, e.currentTarget)}
              >
                <button
                  type="button"
                  onClick={() => goTo(top.id)}
                  className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActiveCategory
                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                      : isOpen
                      ? "bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200/60"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-100/90 border border-transparent hover:border-gray-200/60"
                  }`}
                >
                  <span>{top.name}</span>

                  {hasChildren && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 text-indigo-600"
                          : isActiveCategory
                          ? "text-white/80"
                          : "text-gray-400 group-hover:text-indigo-600"
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Right Scroll Button & Fade Mask */}
        {canScrollRight && (
          <div className="absolute right-2 sm:right-4 top-0 bottom-0 z-30 flex items-center">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/90 to-transparent" />
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Scroll right"
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-gray-700 hover:text-black hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modern Glassmorphic Mega Menu Flyout */}
      {openTop && openColumns.length > 0 && menuPos &&
        createPortal(
          <div
            className="fixed z-50 transition-all duration-200 animate-in fade-in-50 zoom-in-98"
            style={{ left: menuPos.left, top: menuPos.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="rounded-2xl border border-gray-200/80 bg-white/98 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-6 min-w-[380px] max-w-[760px] backdrop-blur-2xl ring-1 ring-black/5">
              {/* Flyout Header */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 tracking-wide uppercase">
                      {openTop.name}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goTo(openTop.id)}
                  className="group inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
                >
                  <span>Explore All</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Subcategory Columns Grid */}
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(openColumns.length, 3)}, minmax(140px, 1fr))`,
                }}
              >
                {openColumns.map((col) => {
                  const grandchildren = childrenOf(col.id);
                  return (
                    <div key={col.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => goTo(col.id)}
                        className="group flex items-center gap-1.5 text-left text-xs font-bold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                        <span className="truncate">{col.name}</span>
                      </button>

                      {grandchildren.length > 0 && (
                        <ul className="space-y-1.5 pl-3 border-l border-gray-100">
                          {grandchildren.map((leaf) => (
                            <li key={leaf.id}>
                              <button
                                type="button"
                                onClick={() => goTo(leaf.id)}
                                className="group flex items-center gap-1 text-left text-xs text-gray-500 hover:text-indigo-600 transition-all cursor-pointer py-0.5"
                              >
                                <span className="group-hover:translate-x-1 transition-transform truncate">
                                  {leaf.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CategoryMegaMenu;

