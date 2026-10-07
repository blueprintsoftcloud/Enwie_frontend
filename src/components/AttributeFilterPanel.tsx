// src/components/AttributeFilterPanel.tsx
// Shared attribute-based product filter panel — used by both the customer storefront
// (cart/CategoryProductPage.tsx) and the admin catalog browser's embedded product list
// (products/Listproducts.tsx). Sourced from the subtree-aware filters endpoint so it
// works correctly regardless of how deep in the category tree it's mounted (attributes
// are defined per-leaf-category only — see backend/src/controllers/product-user
// .controller.ts's getProductFilters, which aggregates them across every leaf
// descendant of `categoryId`).
//
// TEXT/NUMBER/DATE attributes are deliberately not filterable here (they never made it
// past the UI before this rewrite either) — they stay enterable/visible at the product
// level, just not part of this panel. The backend already excludes them from its response.
//
// Two layouts, same underlying selection state, different commit behavior:
//   - "sidebar" (default): each attribute is a full-width, always-expanded block,
//     stacked vertically (the storefront usage). STAGED — selections only take effect
//     when applied, so browsing several options doesn't refetch the product grid on
//     every click. There's no Apply button *inside* this component in sidebar mode —
//     it sits in a sidebar alongside other built-in filters (price, rating), which all
//     commit together behind ONE shared Apply button in the parent (see
//     CategoryProductPage.tsx's FilterControls). Sidebar-mode callers get an
//     imperative `applyNow()` via ref to trigger that commit.
//   - "toolbar": each attribute collapses into a compact popover trigger, all of them
//     sitting in a wrapping horizontal row (the admin catalog view, Listproducts.tsx —
//     a vertical stack of full-width blocks breaks down fast in a horizontal strip once
//     there's more than one or two attributes). INSTANT — applies on every click, no
//     button, since an admin quick-filtering the catalog wants immediate feedback.

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Popover } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import api from "../utils/api";
import type { AttributeType } from "../constants/attributeTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterValue {
  value: string;
  /** One displayed value can map to several underlying CategoryAttributeValue ids —
   * e.g. the same "Red" defined independently on two sibling leaf categories. */
  ids: string[];
}

export interface FilterAttribute {
  name: string;
  type: AttributeType;
  values: FilterValue[];
}

export interface ActiveFilters {
  attributeValueIds: string[];
}

interface Props {
  categoryId?: string;
  attributes?: FilterAttribute[];
  onFiltersChange: (filters: ActiveFilters) => void;
  resetKey?: number; // increment to reset all selections
  layout?: "sidebar" | "toolbar";
}

export interface AttributeFilterPanelHandle {
  /** Commits the currently staged selection. No-op if there's nothing pending —
   * safe for the parent's shared Apply button to always call unconditionally. */
  applyNow: () => void;
}

const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  blue: "#2563EB",
  "navy blue": "#1E3A8A",
  navy: "#1E3A8A",
  red: "#DC2626",
  green: "#16A34A",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  yellow: "#EAB308",
  beige: "#E5E0D8",
  brown: "#78350F",
  pink: "#EC4899",
  orange: "#EA580C",
  purple: "#9333EA",
  maroon: "#831843",
  teal: "#0D9488",
  olive: "#65A30D",
  gold: "#CA8A04",
  silver: "#D1D5DB",
  cream: "#FFFBEB",
  mustard: "#D97706",
  charcoal: "#374151",
  coral: "#F43F5E",
  burgundy: "#881337",
  khaki: "#A3A375",
  tan: "#D2B48C",
};

const keyOf = (attr: FilterAttribute, value: string) => `${attr.type}::${attr.name}::${value}`;

// ─── Individual Attribute Section in Sidebar ──────────────────────────────────
const SidebarAttributeSection = ({
  attr,
  selectedKeys,
  onToggle,
  onPickSingle,
}: {
  attr: FilterAttribute;
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onPickSingle: (attr: FilterAttribute, key: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const isColor =
    attr.name.toLowerCase().includes("color") || attr.name.toLowerCase().includes("colour");

  const displayedValues = expanded ? attr.values : attr.values.slice(0, 6);
  const remainingCount = attr.values.length - 6;

  return (
    <div className="pt-4 pb-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          {attr.name}
        </span>
      </div>

      <div className="space-y-1.5">
        {displayedValues.map((v) => {
          const key = keyOf(attr, v.value);
          const checked = selectedKeys.has(key);
          const colorHex = isColor
            ? COLOR_MAP[v.value.toLowerCase()] || v.value.toLowerCase()
            : null;

          return (
            <label
              key={key}
              className="flex items-center gap-2.5 py-0.5 cursor-pointer group select-none"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (attr.type === "SELECT" || attr.type === "BOOLEAN") {
                    onPickSingle(attr, key);
                  } else {
                    onToggle(key);
                  }
                }}
                className="w-3.5 h-3.5 rounded-[2px] border-gray-300 text-black accent-black focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              {isColor && colorHex && (
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-gray-300/80 shadow-2xs"
                  style={{ backgroundColor: colorHex }}
                />
              )}
              <span className="text-xs text-gray-800 group-hover:text-black font-normal transition-colors">
                {v.value}
              </span>
            </label>
          );
        })}
      </div>

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-semibold text-black hover:underline cursor-pointer transition-colors block"
        >
          {expanded ? "Show less" : `+ ${remainingCount} more`}
        </button>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const AttributeFilterPanel = forwardRef<AttributeFilterPanelHandle, Props>(
  ({ categoryId, attributes: propsAttributes, onFiltersChange, resetKey, layout = "sidebar" }, ref) => {
    const [attributes, setAttributes] = useState<FilterAttribute[]>(propsAttributes ?? []);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const lastEmittedRef = useRef<string>("");

    // Sync with parent-provided attributes if passed directly
    useEffect(() => {
      if (propsAttributes !== undefined) {
        setAttributes(propsAttributes);
      }
    }, [propsAttributes]);

    // Reset internal state when resetKey changes (parent clicked "Clear")
    useEffect(() => {
      if (resetKey === undefined) return;
      setSelectedKeys(new Set());
    }, [resetKey]);

    // Fetch filterable attributes for this category's subtree if not passed as prop
    useEffect(() => {
      if (propsAttributes !== undefined || !categoryId) return;
      setSelectedKeys(new Set());

      api
        .get(`/user/shop/categories/${categoryId}/filters`)
        .then((res) => setAttributes(res.data.attributes ?? []))
        .catch(() => setAttributes([]));
    }, [categoryId, propsAttributes]);

    const computeIds = () =>
      attributes
        .flatMap((attr) =>
          attr.values.filter((v) => selectedKeys.has(keyOf(attr, v.value))).flatMap((v) => v.ids)
        )
        .sort();

    // Toolbar mode only
    useEffect(() => {
      if (layout !== "toolbar") return;
      const ids = computeIds();
      const key = ids.join(",");
      if (key === lastEmittedRef.current) return;
      lastEmittedRef.current = key;
      onFiltersChange({ attributeValueIds: ids });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKeys, attributes, layout]);

    const applyNow = () => {
      const ids = computeIds();
      lastEmittedRef.current = ids.join(",");
      onFiltersChange({ attributeValueIds: ids });
    };

    useImperativeHandle(ref, () => ({ applyNow }));

    if (attributes.length === 0) return null;

    const toggleKey = (key: string) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
    };

    const pickSingle = (attr: FilterAttribute, key: string) => {
      const isActive = selectedKeys.has(key);
      const next = new Set(
        Array.from(selectedKeys).filter((k) => !attr.values.some((av) => keyOf(attr, av.value) === k))
      );
      if (!isActive) next.add(key);
      setSelectedKeys(next);
    };

    const selectedCountOf = (attr: FilterAttribute) =>
      attr.values.filter((v) => selectedKeys.has(keyOf(attr, v.value))).length;

    const selectedLabelOf = (attr: FilterAttribute) => {
      const selected = attr.values.filter((v) => selectedKeys.has(keyOf(attr, v.value)));
      if (selected.length === 0) return attr.name;
      if (selected.length === 1) return `${attr.name}: ${selected[0].value}`;
      return `${attr.name} (${selected.length})`;
    };

    if (layout === "toolbar") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {attributes.map((attr) => {
            const count = selectedCountOf(attr);
            return (
              <Popover key={`${attr.type}::${attr.name}`} className="relative">
                <Popover.Button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus:outline-none ${
                    count > 0
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span className="truncate max-w-40">{selectedLabelOf(attr)}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Popover.Button>
                <Popover.Panel className="absolute left-0 top-full z-30 mt-2 w-56 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="space-y-1.5">
                    {attr.values.map((v) => {
                      const key = keyOf(attr, v.value);
                      return (
                        <label key={key} className="flex items-center gap-2 py-1 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(key)}
                            onChange={() => toggleKey(key)}
                            className="w-3.5 h-3.5 rounded-[2px] border-gray-300 text-black accent-black"
                          />
                          <span>{v.value}</span>
                        </label>
                      );
                    })}
                  </div>
                </Popover.Panel>
              </Popover>
            );
          })}
        </div>
      );
    }

    return (
      <div className="divide-y divide-transparent">
        {attributes.map((attr) => (
          <SidebarAttributeSection
            key={`${attr.type}::${attr.name}`}
            attr={attr}
            selectedKeys={selectedKeys}
            onToggle={toggleKey}
            onPickSingle={pickSingle}
          />
        ))}
      </div>
    );
  }
);

AttributeFilterPanel.displayName = "AttributeFilterPanel";

export default AttributeFilterPanel;
