// src/categories/CategoryAttributesModal.tsx
// Modal wrapper around CategoryAttributes, launched from the Catalog browser
// (Listcategory.tsx) instead of an inline in-page tab — matches the AddCategoryModal /
// AddProductModal convention: everything happens over the browser, nothing navigates away.

import React, { useEffect } from "react";
import { X, ChevronRight, Tag } from "lucide-react";
import CategoryAttributes from "./CategoryAttributes";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface CategoryAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
  categoryName?: string;
  categoryPath?: string[];
}

const CategoryAttributesModal: React.FC<CategoryAttributesModalProps> = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  categoryPath = [],
}) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen);

  if (!isOpen || !categoryId) return null;

  const pathSegments = categoryPath.length > 0 ? categoryPath : categoryName ? [categoryName] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-950 flex items-center gap-2">
              <Tag className="h-5 w-5 text-slate-400" />
              Category Filters
            </h2>
            {pathSegments.length > 0 ? (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {pathSegments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        i === pathSegments.length - 1
                          ? "bg-slate-900 text-white font-semibold"
                          : "bg-white border border-slate-200 text-slate-600"
                      }`}
                    >
                      {seg}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Define the filterable specs for products in this category.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <CategoryAttributes categoryId={categoryId} inline key={categoryId} />
        </div>
      </div>
    </div>
  );
};

export default CategoryAttributesModal;
