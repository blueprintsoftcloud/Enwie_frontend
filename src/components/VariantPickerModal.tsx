// src/components/VariantPickerModal.tsx
import React, { useEffect } from "react";
import { XMarkIcon, ShoppingBagIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export interface VariantOptionItem {
  id: string;
  _id?: string;
  options: Record<string, string>;
  stock: number;
  priceOverride: number | null;
  sku?: string;
  barcode?: string;
  image?: string | null;
}

interface VariantPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    code: string;
    price: number;
    image?: string;
    variants?: VariantOptionItem[];
  };
  cartItems?: Array<{ variantId?: string | null; quantity: number }>;
  onSelectVariant: (variant: VariantOptionItem) => void;
}

export const VariantPickerModal: React.FC<VariantPickerModalProps> = ({
  isOpen,
  onClose,
  product,
  cartItems = [],
  onSelectVariant,
}) => {
  const variants = product.variants || [];

  // Keyboard shortcut listener: numbers 1-9 select variant, Esc closes
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Check number keys 1-9
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= variants.length) {
        const target = variants[num - 1];
        if (target && target.stock > 0) {
          e.preventDefault();
          onSelectVariant(target);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, variants, onClose, onSelectVariant]);

  if (!isOpen) return null;

  const formatVariantLabel = (options: Record<string, string>) => {
    const entries = Object.entries(options);
    if (entries.length === 0) return "Default Option";
    return entries.map(([k, val]) => `${k}: ${val}`).join(" · ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-200/80 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <ShoppingBagIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">{product.name}</h3>
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                  {product.code}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Select an option to add to bill:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Variant Cards List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 sm:space-y-2.5 flex-1">
          {variants.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No active options available for this product.
            </div>
          ) : (
            variants.map((v, idx) => {
              const vid = String(v.id || v._id || "");
              const isOutOfStock = v.stock <= 0;
              const unitPrice = v.priceOverride ?? product.price;
              const cartEntry = cartItems.find((c) => String(c.variantId ?? "") === vid);
              const inCartQty = cartEntry ? cartEntry.quantity : 0;
              const shortcutNumber = idx + 1 <= 9 ? idx + 1 : null;

              return (
                <button
                  key={vid || idx}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onSelectVariant(v)}
                  className={`w-full group text-left p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 sm:gap-3 ${
                    isOutOfStock
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
                      : "cursor-pointer bg-white hover:bg-indigo-50/50 hover:border-indigo-300 border-slate-200 hover:shadow-md active:scale-99"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Shortcut key badge (desktop only) */}
                    {shortcutNumber && (
                      <span className="hidden sm:flex w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-indigo-600 text-slate-600 group-hover:text-white font-mono text-xs font-bold items-center justify-center shrink-0 transition-colors">
                        {shortcutNumber}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-950">
                          {formatVariantLabel(v.options)}
                        </span>
                        {inCartQty > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> In Cart ({inCartQty})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs">
                        {v.sku && (
                          <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
                            SKU: {v.sku}
                          </span>
                        )}
                        <span
                          className={`font-medium ${
                            isOutOfStock
                              ? "text-rose-600 font-semibold"
                              : v.stock <= 3
                              ? "text-amber-600"
                              : "text-slate-500"
                          }`}
                        >
                          {isOutOfStock ? "Out of Stock" : `${v.stock} in stock`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Select Button */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-extrabold text-indigo-600">
                        ₹{unitPrice.toLocaleString("en-IN")}
                      </span>
                      {v.priceOverride && v.priceOverride !== product.price && (
                        <p className="text-[10px] text-slate-400 line-through">
                          ₹{product.price.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    {!isOutOfStock && (
                      <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white text-xs font-bold transition-all shadow-2xs">
                        + Add
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline text-[11px]">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">1</kbd> - <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">{Math.min(variants.length, 9)}</kbd> to quick-add, or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> to cancel.
          </span>
          <span className="sm:hidden text-[11px] text-slate-400">
            Tap any option to add to bill
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

