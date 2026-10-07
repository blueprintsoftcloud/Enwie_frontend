// src/products/ProductVariantsModal.tsx
// Standalone-modal shell around VariantsManagerFields.tsx (which holds the actual
// variant UI/logic) — opened from the product list's "..." menu as a quick way to
// manage a product's variants without opening the full Edit Product form. The same
// fields also render inline inside Listproducts.tsx's Edit Product form directly, so
// editing a variant product doesn't require leaving that form for this modal at all;
// this remains as a shortcut for when only the variants need attention.
//
// See backend/src/models/mongoose.ts's ProductVariant for the full design rationale
// (deliberately separate from the CategoryAttribute filter system).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Layers, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import VariantsManagerFields, { VariantsManagerFieldsHandle } from "./VariantsManagerFields";

interface CategoryAttr {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  isFilterable: boolean;
  values: { id: string; value: string }[];
}

interface ProductAttrValue {
  attributeId: string;
  attributeValueId: string | null;
  textValue: string | null;
  variantId: string | null;
}

interface ProductVariantsModalProps {
  product: {
    id?: string;
    _id?: string;
    name: string;
    price?: number | null;
    purchasePrice?: number | null;
    category?: { id?: string; name?: string; code?: string } | string;
    attributeValues?: ProductAttrValue[];
    image?: string | null;
    images?: string[];
  } | null;
  onClose: () => void;
}

const ProductVariantsModal: React.FC<ProductVariantsModalProps> = ({ product, onClose }) => {
  const productId = product?.id ?? product?._id;
  const categoryId = typeof product?.category === "object" ? product.category?.id : undefined;
  // Row edits (stock/price/discount) no longer save themselves on blur — this modal
  // has no other form to piggyback a save on, so it needs its own Save Changes button.
  const variantsRef = useRef<VariantsManagerFieldsHandle>(null);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const [saving, setSaving] = useState(false);
  // Confirm dialog (replaces window.confirm) — only shown when EVERY active variant has
  // no price at all, so saving would put the whole product live at ₹0.
  const [unpricedCount, setUnpricedCount] = useState<number | null>(null);

  // Per-variant Category Filter controls (Colour, Fabric, ...) — same feature as the
  // embedded copy of this component in Listproducts.tsx's Edit Product form, wired up
  // separately here since this modal has no bigger form to piggyback its own save on.
  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttr[]>([]);
  const [variantAttrValues, setVariantAttrValues] = useState<Record<string, string>>({});
  const initialVariantAttrValuesRef = useRef<Record<string, string>>({});
  const [variantOptionAxisNames, setVariantOptionAxisNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!categoryId) {
      setCategoryAttrs([]);
      return;
    }
    api
      .get(`/category/${categoryId}/attributes`)
      .then((res) => {
        const attrs: CategoryAttr[] = (res.data.attributes ?? []).filter(
          (a: CategoryAttr) => a.type !== "RATING" && a.type !== "PRICE",
        );
        setCategoryAttrs(attrs);
      })
      .catch(() => setCategoryAttrs([]));
  }, [categoryId]);

  // Pre-populate from whatever this product was already tagged with — only the
  // variant-scoped rows matter here (variantId null = a whole-product tag, a separate
  // concept only meaningful pre-variants, owned by the full Edit Product form instead).
  useEffect(() => {
    const existing: Record<string, string> = {};
    (product?.attributeValues ?? []).forEach((av) => {
      if (!av.variantId) return;
      const value = av.attributeValueId ?? (av.textValue || undefined);
      if (!value) return;
      const key = `${av.variantId}:${av.attributeId}`;
      existing[key] = existing[key] ? `${existing[key]},${value}` : value;
    });
    setVariantAttrValues(existing);
    initialVariantAttrValuesRef.current = existing;
  }, [productId]);

  // Attributes already driving the variant combination itself (e.g. "Size") shouldn't
  // also get a second, manually-set picker here — same exclusion Listproducts.tsx
  // applies (see its perVariantCategoryAttrs) for the same reason: a second picker for
  // the same attribute would just invite it to disagree with the option that's actually
  // on the combination.
  const perVariantCategoryAttrs = useMemo(
    () => categoryAttrs.filter((attr) => !variantOptionAxisNames.has(attr.name.trim().toLowerCase())),
    [categoryAttrs, variantOptionAxisNames],
  );

  const hasAttrEdits = JSON.stringify(variantAttrValues) !== JSON.stringify(initialVariantAttrValuesRef.current);

  const saveAttrValues = async (): Promise<boolean> => {
    if (!hasAttrEdits) return true;
    const entries = Object.entries(variantAttrValues)
      .filter(([, v]) => v)
      .map(([key, v]) => {
        const [variantId, attributeId] = key.split(":");
        const attr = categoryAttrs.find((a) => a.id === attributeId);
        if (attr && (attr.type === "SELECT" || attr.type === "MULTISELECT" || attr.type === "BOOLEAN")) {
          return { attributeId, attributeValueId: v, variantId };
        }
        return { attributeId, textValue: v, variantId };
      });
    try {
      await api.put(`/product/${productId}/variants/attribute-values`, { attributeValues: entries });
      initialVariantAttrValuesRef.current = variantAttrValues;
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save filter values");
      return false;
    }
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const [variantsOk, attrsOk] = await Promise.all([variantsRef.current?.flushPendingEdits() ?? true, saveAttrValues()]);
      if (variantsOk && attrsOk) toast.success("Variant changes saved");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Strict requirement: every active variant must have a primary image (Slot 1)
    const missingImages = variantsRef.current?.getVariantsMissingImage() ?? [];
    if (missingImages.length > 0) {
      const names = missingImages.slice(0, 2).map((m) => m.label).join(", ");
      const more = missingImages.length > 2 ? ` (+${missingImages.length - 2} more)` : "";
      toast.error(
        `1st image is required for all active variants. Missing: ${names}${more}`,
        { id: "variant-missing-image-modal", duration: 5000 },
      );
      return;
    }

    const count = variantsRef.current?.allUnpriced() ?? 0;
    if (count > 0) {
      setUnpricedCount(count);
      return;
    }
    await doSave();
  };

  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [product, onClose]);

  useBodyScrollLock(!!product);

  if (!product || !productId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-950 flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-400" />
              Manage Variants
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl truncate">{product.name}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              What's actually for sale, and its stock — separate from Category Filters, which only affects search.
            </p>
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
          <VariantsManagerFields
            ref={variantsRef}
            productId={productId}
            onPendingEditsChange={setHasPendingEdits}
            onVariantsChanged={() =>
              setVariantOptionAxisNames(new Set(variantsRef.current?.getVariantOptionAxisNames() ?? []))
            }
            categoryFilters={{
              attrs: perVariantCategoryAttrs,
              getValue: (variantId, attributeId) => variantAttrValues[`${variantId}:${attributeId}`] ?? "",
              onChange: (variantId, attributeId, next) =>
                setVariantAttrValues((prev) => ({ ...prev, [`${variantId}:${attributeId}`]: next })),
            }}
            basePrice={product.price ?? null}
            basePurchasePrice={product.purchasePrice ?? null}
            productImages={[product.image, ...(product.images ?? [])].filter(Boolean) as string[]}
          />
        </div>

        {/* FOOTER — row edits (stock/price/discount) no longer save on blur */}
        <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={(!hasPendingEdits && !hasAttrEdits) || saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Confirm dialog — replaces window.confirm so it matches the app's styling */}
      {unpricedCount !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {unpricedCount} variant{unpricedCount === 1 ? "" : "s"} have no price set
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    None of this product's variants have a Selling or Purchase Price yet. Saving now will set them
                    all to ₹0, making this product purchasable for free while it stays Active.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => {
                  setUnpricedCount(null);
                  doSave();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition"
              >
                Save as ₹0 anyway
              </button>
              <button
                onClick={() => setUnpricedCount(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVariantsModal;
