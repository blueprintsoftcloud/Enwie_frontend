// src/products/VariantsManagerFields.tsx
// The actual variant-management UI (add option groups, generate combinations, edit each
// row's stock/price/cost/discount/active state) — factored out of ProductVariantsModal.tsx
// so it can be rendered two ways: inside that standalone modal (opened from the product
// list's "..." menu), and inline inside Listproducts.tsx's Edit Product form, so editing
// a variant product's options doesn't require leaving that form for a separate modal.
//
// Every action here writes immediately via the real API (add/generate/update/delete),
// same as before — there's no "draft, then Save Changes" step, unlike the Add Product
// form's preview table (which can't hit these endpoints yet because the product doesn't
// exist until it's created).

import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Layers,
  SlidersHorizontal,
  Pencil,
  Check,
  X,
  Image as ImageIcon,
  Upload,
  ArrowLeftRight,
  RefreshCw,
  AlertTriangle,
  Eye,
  CheckCircle,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { compressImage } from "../utils/compressImage";

// A controlled number input just echoes back whatever string you hand it — typing "5"
// after a displayed "0" produces "05", not "5", since nothing strips the stale leading
// zero. Keeps a genuine "0.5" intact (lookahead requires a digit right after the zeros).
const stripLeadingZero = (raw: string) => raw.replace(/^0+(?=\d)/, "");
// Stock is a whole-unit count — type="number" still lets "." (and "e", "-") through, so
// strip everything but digits before the leading-zero cleanup above.
const sanitizeStockInput = (raw: string) => stripLeadingZero(raw.replace(/[^\d]/g, ""));

interface Variant {
  id: string;
  /** e.g. { Storage: "128GB", Color: "Black" } or { Weight: "1kg" } — admin-named
   * axes, not a fixed Size/Color pair. */
  options: Record<string, string>;
  sku?: string;
  stock: number;
  priceOverride: number | null;
  /** Falls back to the product's own Purchase Price when null — see mongoose.ts's
   * ProductVariant. Lets margin be tracked per option, not just once for the product. */
  purchasePriceOverride: number | null;
  /** Falls back to the product's own Discount % when null, 0-100. */
  discountOverride: number | null;
  /** Primary featured photo for this variant (Slot 1) */
  image?: string | null;
  /** Secondary angle/detail photo for this variant (Slot 2) */
  secondaryImage?: string | null;
  images?: string[];
  isActive: boolean;
}

/** One row of the "add options" builder — a raw, not-yet-parsed axis name + its
 * comma-separated values, kept as free text while the admin is still typing. */
interface OptionGroupInput {
  name: string;
  values: string;
  /** When on (the default), generating this option also creates/reuses a matching
   * Category Filter attribute and tags each variant with it (see backend/src/utils/
   * optionFilterSync.ts) — no separate trip through Category Management needed. */
  isFilterable?: boolean;
}

const formatOptions = (options: Record<string, string>): string =>
  Object.entries(options ?? {})
    .map(([axis, value]) => `${axis}: ${value}`)
    .join(" / ");

/** Mirrors backend/src/utils/productVariant.ts's computeOptionsKey — used client-side
 * only to flag which previewed combinations already exist as a variant, never sent
 * to the server (the backend recomputes its own key from the raw options it saves). */
const computeOptionsKeyClient = (options: Record<string, string>): string =>
  Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => [key.trim(), String(value).trim()] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

/** Minimal shape needed to render a Category Filter attribute's control — mirrors
 * Listproducts.tsx's own CategoryAttr, kept as a separate local type so this
 * component doesn't need to import from there. */
interface CategoryFilterAttr {
  id: string;
  name: string;
  isRequired: boolean;
  type: string;
  values: { id: string; value: string }[];
}

interface VariantsManagerFieldsProps {
  productId: string;
  /** Fired after any change that could shift the product's derived stock/price/cost/
   * discount (add, generate, per-row save, toggle, delete) — the caller re-syncs
   * whatever summary it shows elsewhere (e.g. Listproducts.tsx's read-only Stock/Price
   * blocks) since this component only owns the variant rows themselves. */
  onVariantsChanged?: () => void;
  /** When provided, each variant row also shows its own Category Filter controls
   * (Colour, Storage, ...) right alongside Stock/Price/Discount — merged in here
   * instead of a separate "Category Filters" tab, since once a product has options,
   * every filter value is assigned per-variant anyway (see Listproducts.tsx). */
  categoryFilters?: {
    attrs: CategoryFilterAttr[];
    getValue: (variantId: string, attributeId: string) => string;
    onChange: (variantId: string, attributeId: string, next: string) => void;
  };
  /** Fired whenever the set of unsaved row edits (stock/price/discount) goes from
   * empty to non-empty or back — lets a caller with its own Save Changes button
   * (ProductVariantsModal.tsx) enable/label it without polling the ref. */
  onPendingEditsChange?: (hasPendingEdits: boolean) => void;
  /** The product's own Selling/Purchase Price — what an active variant's override
   * falls back to when left blank (see the Variant.priceOverride doc comment below).
   * Used only to validate that every active variant resolves to a real price before
   * a save is allowed to proceed; null means the product itself has no base price to
   * fall back on. */
  basePrice?: number | null;
  basePurchasePrice?: number | null;
  /** Existing images from the parent product gallery to allow 1-click variant image assignment */
  productImages?: string[];
}

/** Imperative handle so a parent's own "Save Changes" button can commit these rows'
 * pending edits together with the rest of its form, instead of each field saving
 * itself on blur. Exposed via ref since the pending-edits state lives entirely inside
 * this component. */
export interface VariantsManagerFieldsHandle {
  hasPendingEdits: () => boolean;
  /** Saves every row with an unsaved edit. Resolves false if any row failed to save
   * (that row's own error toast has already fired) — callers should treat false as
   * "don't proceed" rather than silently continuing. */
  flushPendingEdits: () => Promise<boolean>;
  /** Count of active variants if EVERY active variant is still missing a price (never
   * priced at all, not just one field forgotten among priced siblings) — 0 otherwise.
   * A single unpriced row among priced siblings still silently saves as 0; the whole
   * product having no prices at all is worth a confirmation before it goes live at ₹0. */
  allUnpriced: () => number;
  /** Lowercased option axis names (e.g. "size", "color") already in use across this
   * product's variants — lets a caller offering its own per-variant Category Filter
   * picker (see categoryFilters prop) exclude attributes that are already the thing
   * driving the variant combination itself, same exclusion Listproducts.tsx applies
   * for its own embedded picker (see its perVariantCategoryAttrs). */
  getVariantOptionAxisNames: () => string[];
  /** Returns active variants that are missing a required primary image (Slot 1) */
  getVariantsMissingImage: () => { id: string; label: string }[];
  /** Returns true if any active variant has no primary image */
  hasMissingImages: () => boolean;
}

/** Renders one Category Filter attribute's control (SELECT/MULTISELECT/BOOLEAN/
 * TEXT/NUMBER/DATE) against a single value + onChange — mirrors Listproducts.tsx's
 * renderAttrControl, duplicated locally so this component stays usable standalone
 * (ProductVariantsModal.tsx) without needing that file's state/types. */
const renderAttrControl = (attr: CategoryFilterAttr, value: string, onChange: (next: string) => void) => {
  if (attr.type === "SELECT") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">— Select —</option>
        {attr.values.map((v) => (
          <option key={v.id} value={v.id}>
            {v.value}
          </option>
        ))}
      </select>
    );
  }
  if (attr.type === "MULTISELECT") {
    const selectedIds = value.split(",").filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1.5">
        {attr.values.map((v) => {
          const selected = selectedIds.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                const next = selected ? selectedIds.filter((x) => x !== v.id) : [...selectedIds, v.id];
                onChange(next.join(","));
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
            >
              {v.value}
            </button>
          );
        })}
      </div>
    );
  }
  if (attr.type === "BOOLEAN") {
    return (
      <div className="flex gap-2">
        {attr.values.map((v) => {
          const active = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(active ? "" : v.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
            >
              {v.value}
            </button>
          );
        })}
      </div>
    );
  }
  // TEXT / NUMBER / DATE
  return (
    <input
      type={attr.type === "NUMBER" ? "number" : attr.type === "DATE" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${attr.name.toLowerCase()}`}
      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  );
};

const VariantsManagerFields = forwardRef<VariantsManagerFieldsHandle, VariantsManagerFieldsProps>(({
  productId,
  onVariantsChanged,
  categoryFilters,
  onPendingEditsChange,
  basePrice = null,
  basePurchasePrice = null,
  productImages = [],
}, ref) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // Starts with one blank row; admin can add more axes (Storage, Color, Weight, ...)
  // or leave it at one if the product only varies along a single dimension.
  const [optionGroups, setOptionGroups] = useState<OptionGroupInput[]>([{ name: "", values: "", isFilterable: true }]);

  // Local edits before they're saved (blur/toggle/delete) — keyed by variant id, so
  // typing in one row's stock field doesn't touch any other row's pending value.
  const [pendingEdits, setPendingEdits] = useState<Record<string, {
    stock?: string;
    priceOverride?: string;
    purchasePriceOverride?: string;
    discountOverride?: string;
  }>>({});

  // Which variant's option combination (Size/Color/Storage values, not stock/price)
  // is currently being edited, plus its in-progress draft values keyed by axis name —
  // separate from pendingEdits above since this needs an explicit Save (a typo'd
  // combination shouldn't silently commit on blur the way a stock number can).
  const [editingOptionsId, setEditingOptionsId] = useState<string | null>(null);
  const [editingOptionsDraft, setEditingOptionsDraft] = useState<Record<string, string>>({});
  const [savingOptions, setSavingOptions] = useState(false);

  // Variant Image Management State (Dual Slots: Primary & Secondary)
  const [uploadingSlot, setUploadingSlot] = useState<{ variantId: string; slot: "primary" | "secondary" } | null>(null);
  const [galleryPickerTarget, setGalleryPickerTarget] = useState<{ variantId: string | "ALL"; slot: "primary" | "secondary" } | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string } | null>(null);
  const [applyingToAll, setApplyingToAll] = useState(false);

  const handleImageUpload = async (variantId: string, slot: "primary" | "secondary", file: File) => {
    setUploadingSlot({ variantId, slot });
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      if (slot === "primary") {
        formData.append("image", compressed);
      } else {
        formData.append("secondaryImage", compressed);
      }

      const res = await api.post(`/product/${productId}/variants/${variantId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.variant) {
        setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.variant : v)));
        toast.success(slot === "primary" ? "1st image uploaded" : "2nd image uploaded");
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to upload variant image");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSetImageUrl = async (variantId: string | "ALL", slot: "primary" | "secondary", url: string | null) => {
    if (variantId === "ALL") {
      if (!url) return;
      await handleGalleryApplyToAll(url, slot);
      return;
    }
    try {
      const payload = slot === "primary" ? { image: url } : { secondaryImage: url };
      const res = await api.put(`/product/${productId}/variants/${variantId}`, payload);
      if (res.data.variant) {
        setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.variant : v)));
        toast.success(slot === "primary" ? "1st image updated" : "2nd image updated");
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update variant image");
    }
  };

  const handleRemoveImage = async (variantId: string, slot: "primary" | "secondary") => {
    await handleSetImageUrl(variantId, slot, null);
  };

  const handleSwapImages = async (variant: Variant) => {
    try {
      const res = await api.put(`/product/${productId}/variants/${variant.id}`, {
        image: variant.secondaryImage || null,
        secondaryImage: variant.image || null,
      });
      if (res.data.variant) {
        setVariants((prev) => prev.map((v) => (v.id === variant.id ? res.data.variant : v)));
        toast.success("1st and 2nd images swapped");
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to swap variant images");
    }
  };

  const handleApplyImagesToAll = async (sourceVariantId: string, slot: "primary" | "secondary" | "both" = "both") => {
    setApplyingToAll(true);
    try {
      const res = await api.post(`/product/${productId}/variants/apply-images-all`, {
        sourceVariantId,
        slot,
      });
      if (res.data.variants) {
        setVariants(res.data.variants);
        const label = slot === "primary" ? "1st image" : slot === "secondary" ? "2nd image" : "Photos";
        toast.success(res.data.message || `${label} applied to all ${res.data.variants.length} variants ✓`);
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to apply image to all variants");
    } finally {
      setApplyingToAll(false);
    }
  };

  const handleBulkUploadToAll = async (slot: "primary" | "secondary", file: File) => {
    setApplyingToAll(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      if (slot === "primary") {
        formData.append("image", compressed);
      } else {
        formData.append("secondaryImage", compressed);
      }
      formData.append("slot", slot);

      const res = await api.post(`/product/${productId}/variants/apply-images-all`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.variants) {
        setVariants(res.data.variants);
        toast.success(res.data.message || `Photo uploaded and applied to all ${res.data.variants.length} variants ✓`);
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to upload and apply image to all variants");
    } finally {
      setApplyingToAll(false);
    }
  };

  const handleGalleryApplyToAll = async (url: string, slot: "primary" | "secondary") => {
    setApplyingToAll(true);
    try {
      const payload = slot === "primary" ? { image: url, slot: "primary" } : { secondaryImage: url, slot: "secondary" };
      const res = await api.post(`/product/${productId}/variants/apply-images-all`, payload);
      if (res.data.variants) {
        setVariants(res.data.variants);
        toast.success(`Gallery photo applied to all ${res.data.variants.length} variants ✓`);
        onVariantsChanged?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to apply gallery image to variants");
    } finally {
      setApplyingToAll(false);
      setGalleryPickerTarget(null);
    }
  };

  const startEditOptions = (v: Variant) => {
    setEditingOptionsId(v.id);
    setEditingOptionsDraft({ ...v.options });
  };
  const cancelEditOptions = () => {
    setEditingOptionsId(null);
    setEditingOptionsDraft({});
  };
  const saveEditOptions = async (variantId: string) => {
    setSavingOptions(true);
    try {
      const res = await api.put(`/product/${productId}/variants/${variantId}`, { options: editingOptionsDraft });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.variant : v)));
      toast.success("Combination updated");
      setEditingOptionsId(null);
      setEditingOptionsDraft({});
      onVariantsChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update combination");
    } finally {
      setSavingOptions(false);
    }
  };

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api
      .get(`/product/${productId}/variants`)
      .then((res) => {
        setVariants(res.data.variants ?? []);
        // Also on the initial load, not just later mutations — a caller using this to
        // learn the variants' own option axis names (see getVariantOptionAxisNames)
        // needs a signal the first time they're known, too.
        onVariantsChanged?.();
      })
      .catch(() => toast.error("Failed to load variants"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    onPendingEditsChange?.(Object.keys(pendingEdits).length > 0);
  }, [pendingEdits]);

  const addOptionGroupRow = () => setOptionGroups((prev) => [...prev, { name: "", values: "", isFilterable: true }]);
  const removeOptionGroupRow = (index: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  const updateOptionGroupRow = (index: number, field: "name" | "values", value: string) =>
    setOptionGroups((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const toggleOptionGroupFilterable = (index: number) =>
    setOptionGroups((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isFilterable: !(row.isFilterable ?? true) } : row)),
    );

  // Live preview of what "Add Combinations" would create — only worth showing once
  // there are 2+ real axes, since a single axis's own Values field already IS the
  // list (Storage: 128GB, 256GB, 512GB reads as 3 rows without extra help; crossing
  // Storage × Color into 6 combinations is the part that's hard to picture in advance).
  const parsedOptionGroups = optionGroups
    .map((row) => ({
      name: row.name.trim(),
      values: [...new Set(row.values.split(",").map((v) => v.trim()).filter(Boolean))],
      isFilterable: row.isFilterable ?? true,
    }))
    .filter((g) => g.name && g.values.length > 0);
  const previewCombos: Record<string, string>[] =
    parsedOptionGroups.length >= 2
      ? parsedOptionGroups.reduce<Record<string, string>[]>(
          (combos, group) => combos.flatMap((combo) => group.values.map((value) => ({ ...combo, [group.name]: value }))),
          [{}],
        )
      : [];
  const existingOptionKeys = new Set(variants.map((v) => computeOptionsKeyClient(v.options)));

  const handleGenerate = async () => {
    if (parsedOptionGroups.length === 0) {
      toast.error("Enter an option name (e.g. Storage) and at least one value");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post(`/product/${productId}/variants/generate`, { optionGroups: parsedOptionGroups });
      setVariants(res.data.variants ?? []);
      toast.success(res.data.message ?? "Variants added");
      setOptionGroups([{ name: "", values: "" }]);
      onVariantsChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to generate variants");
    } finally {
      setGenerating(false);
    }
  };

  const saveEdit = async (variantId: string): Promise<boolean> => {
    const edit = pendingEdits[variantId];
    if (!edit) return true;
    try {
      const res = await api.put(`/product/${productId}/variants/${variantId}`, {
        stock: edit.stock !== undefined ? (edit.stock || "0") : undefined,
        priceOverride: edit.priceOverride !== undefined ? (edit.priceOverride || "0") : undefined,
        purchasePriceOverride: edit.purchasePriceOverride !== undefined ? (edit.purchasePriceOverride || "0") : undefined,
        discountOverride: edit.discountOverride !== undefined ? (edit.discountOverride || null) : undefined,
      });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.variant : v)));
      setPendingEdits((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      onVariantsChanged?.();
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update variant");
      return false;
    }
  };

  // Active variants whose price/purchase price were never set at all (created before
  // this field started defaulting to 0, or generated some other way) — these have no
  // pendingEdits entry to trigger saveEdit's own "empty → 0" handling above, since
  // nothing was ever typed into them. Save Changes fixes these directly.
  const variantsMissingPrice = variants.filter(
    (v) => v.isActive && (v.priceOverride == null || v.purchasePriceOverride == null) && !pendingEdits[v.id],
  );

  const fixMissingPrice = async (variantId: string): Promise<boolean> => {
    try {
      const res = await api.put(`/product/${productId}/variants/${variantId}`, {
        priceOverride: 0,
        purchasePriceOverride: 0,
      });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.variant : v)));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update variant");
      return false;
    }
  };

  const activeVariants = variants.filter((v) => v.isActive);

  useImperativeHandle(
    ref,
    () => ({
      hasPendingEdits: () => Object.keys(pendingEdits).length > 0 || variantsMissingPrice.length > 0,
      flushPendingEdits: async () => {
        const editIds = Object.keys(pendingEdits);
        const missingIds = variantsMissingPrice.map((v) => v.id);
        if (editIds.length === 0 && missingIds.length === 0) return true;
        const results = await Promise.all([
          ...editIds.map((id) => saveEdit(id)),
          ...missingIds.map((id) => fixMissingPrice(id)),
        ]);
        return results.every(Boolean);
      },
      allUnpriced: () =>
        activeVariants.length > 0 && variantsMissingPrice.length === activeVariants.length
          ? activeVariants.length
          : 0,
      getVariantOptionAxisNames: () => [
        ...new Set(variants.flatMap((v) => Object.keys(v.options ?? {}).map((k) => k.trim().toLowerCase()))),
      ],
      getVariantsMissingImage: () =>
        variants
          .filter((v) => v.isActive && (!v.image || !v.image.trim()))
          .map((v) => ({ id: v.id, label: formatOptions(v.options) || "Variant" })),
      hasMissingImages: () =>
        variants.some((v) => v.isActive && (!v.image || !v.image.trim())),
    }),
    [pendingEdits, variantsMissingPrice, activeVariants, variants],
  );

  const toggleActive = async (variant: Variant) => {
    // Strict safeguard: cannot activate an option without a 1st image
    if (!variant.isActive && (!variant.image || !variant.image.trim())) {
      toast.error(
        `Please upload 1st image before activating ${formatOptions(variant.options) || "this variant"}.`,
        { id: "variant-image-required-toggle" }
      );
      return;
    }
    try {
      const res = await api.put(`/product/${productId}/variants/${variant.id}`, { isActive: !variant.isActive });
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? res.data.variant : v)));
      onVariantsChanged?.();
    } catch {
      toast.error("Failed to update variant");
    }
  };

  const handleDelete = async (variant: Variant) => {
    const label = formatOptions(variant.options) || "this variant";
    if (!confirm(`Delete ${label}? This can't be undone.`)) return;
    try {
      await api.delete(`/product/${productId}/variants/${variant.id}`);
      setVariants((prev) => prev.filter((v) => v.id !== variant.id));
      toast.success("Variant deleted");
      onVariantsChanged?.();
    } catch {
      toast.error("Failed to delete variant");
    }
  };

  return (
    <div>
      {/* Add options */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5">
        <div className="flex items-start gap-2.5 mb-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Add options</h3>
          
          </div>
        </div>

        <div className="space-y-2">
          {optionGroups.map((row, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeOptionGroupRow(index)}
                  disabled={optionGroups.length <= 1}
                  className="p-1.5 -m-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition"
                  title="Remove this option"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Option name
                  </label>
                  <input
                    value={row.name}
                    onChange={(e) => updateOptionGroupRow(index, "name", e.target.value)}
                    placeholder="e.g. Storage"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Values <span className="normal-case font-medium text-slate-400">(comma-separated)</span>
                  </label>
                  <input
                    value={row.values}
                    onChange={(e) => updateOptionGroupRow(index, "values", e.target.value)}
                    placeholder="e.g. 128GB, 256GB, 512GB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleOptionGroupFilterable(index)}
                className="mt-2.5 inline-flex items-center gap-2 text-xs text-slate-600"
              >
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                    row.isFilterable ?? true ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      row.isFilterable ?? true ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                Show as filter to customers
              </button>
            </div>
          ))}
        </div>

        {previewCombos.length > 0 && (
          <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide mb-2">
              Preview — {previewCombos.length} combination{previewCombos.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {previewCombos.map((combo, i) => {
                const exists = existingOptionKeys.has(computeOptionsKeyClient(combo));
                return (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      exists
                        ? "bg-slate-50 text-slate-400 border-slate-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {formatOptions(combo)}
                    {exists && <span className="ml-1 text-[10px]">(exists)</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={addOptionGroupRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            {generating ? "Adding…" : "Add Combinations"}
          </button>
        </div>
      </div>

      {/* Existing variants */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Loading variants…</p>
      ) : variants.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-slate-200 bg-white">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">No variants yet</p>
          <p className="text-slate-400 text-xs mt-1">
            This product is sold as a single item — add options above to give it its own stock per combination.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((v) => {
            const edit = pendingEdits[v.id];
            const hasEdit = !!edit;
            const field = (
              key: "stock" | "priceOverride" | "purchasePriceOverride" | "discountOverride",
              label: string,
              placeholder?: string,
              max?: number,
              // Mirrors the non-variant Purchase/Selling Price fields in Listproducts.tsx
              // (amber = cost, emerald = current selling price) so the same field always
              // reads the same color whether or not the product has variants.
              tone?: "amber" | "emerald" | "slate",
            ) => (
              <div>
                <label
                  className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
                    tone === "amber" ? "text-amber-500" : tone === "emerald" ? "text-emerald-500" : "text-slate-400"
                  }`}
                >
                  {label}
                </label>
                <input
                  // Stock is a whole-unit count — a native type="number" input still lets
                  // the browser echo "." (and "-", "e") back before our sanitizer's re-render
                  // catches up, so it uses type="text" instead: fully controlled, nothing to
                  // strip after the fact because a decimal character never renders at all.
                  type={key === "stock" ? "text" : "number"}
                  inputMode={key === "stock" ? "numeric" : undefined}
                  pattern={key === "stock" ? "[0-9]*" : undefined}
                  min={key === "stock" ? undefined : 0}
                  max={key === "stock" ? undefined : max}
                  step={key === "stock" ? undefined : "any"}
                  placeholder={placeholder}
                  value={edit?.[key] ?? v[key] ?? ""}
                  onChange={(e) =>
                    setPendingEdits((prev) => ({
                      ...prev,
                      [v.id]: {
                        ...prev[v.id],
                        [key]: key === "stock" ? sanitizeStockInput(e.target.value) : stripLeadingZero(e.target.value),
                      },
                    }))
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    tone === "amber"
                      ? "border-amber-100 bg-amber-50/30 focus:ring-amber-200"
                      : tone === "emerald"
                        ? "border-emerald-100 bg-emerald-50/30 focus:ring-emerald-200"
                        : tone === "slate"
                          ? "border-slate-200 bg-slate-50/50 focus:ring-slate-300"
                          : "border-slate-200 focus:ring-indigo-200"
                  }`}
                />
              </div>
            );
            const purchaseVal = parseFloat(String(edit?.purchasePriceOverride ?? v.purchasePriceOverride ?? ""));
            const sellVal = parseFloat(String(edit?.priceOverride ?? v.priceOverride ?? ""));
            const hasMargin = Number.isFinite(purchaseVal) && purchaseVal > 0 && Number.isFinite(sellVal);
            const margin = hasMargin ? sellVal - purchaseVal : 0;
            const marginPct = hasMargin ? (margin / purchaseVal) * 100 : 0;
            const isEditingOptions = editingOptionsId === v.id;

            const renderImageSlot = (
              variant: Variant,
              slot: "primary" | "secondary",
              title: string,
              subtitle: string,
            ) => {
              const currentUrl = slot === "primary" ? variant.image : variant.secondaryImage;
              const isSlotUploading = uploadingSlot?.variantId === variant.id && uploadingSlot?.slot === slot;
              const isRequiredSlot = slot === "primary";
              const isMissingRequired = isRequiredSlot && !currentUrl && variant.isActive;
              const badgeNumber = slot === "primary" ? "1" : "2";

              if (currentUrl) {
                return (
                  <div className="relative group/slot rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all space-y-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-2xs ${
                            slot === "primary" ? "bg-emerald-600" : "bg-indigo-600"
                          }`}
                        >
                          {badgeNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{title}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Ready
                      </span>
                    </div>

                    {/* Square Photo Preview Box */}
                    <div
                      className="relative aspect-4/3 sm:aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group/thumb cursor-pointer"
                      onClick={() =>
                        setPreviewModalImage({
                          url: currentUrl,
                          title: `${formatOptions(variant.options)} — ${title}`,
                        })
                      }
                    >
                      <img
                        src={currentUrl}
                        alt={`${formatOptions(variant.options)} - ${slot}`}
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/thumb:scale-105"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-sm pointer-events-none shadow-xs">
                        #{badgeNumber}
                      </div>
                      <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-200">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                          <Maximize2 className="h-3.5 w-3.5" />
                          <span>Full Preview</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="pt-0.5 flex items-center justify-between gap-1.5">
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-2xs">
                        <Upload className="h-3 w-3 text-slate-500" />
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isSlotUploading || applyingToAll}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(variant.id, slot, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={isSlotUploading || applyingToAll}
                        onClick={() => handleRemoveImage(variant.id, slot)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/60 transition shadow-2xs ml-auto cursor-pointer"
                        title="Remove image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {isSlotUploading && (
                      <div className="absolute inset-0 rounded-2xl bg-white/90 backdrop-blur-xs flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 z-10">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Uploading…
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-indigo-300 transition-all p-3 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700">
                        {badgeNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{title}</span>
                    </div>
                    {isRequiredSlot ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-600 bg-slate-100 border-slate-200">
                        Required *
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex-1 cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-xl py-2.5 px-3 transition-all duration-200 flex items-center justify-center gap-2 group">
                      <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Upload className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                        {slot === "primary" ? "Upload 1st Image *" : "Upload 2nd Image"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isSlotUploading || applyingToAll}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(variant.id, slot, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {productImages && productImages.length > 0 && (
                      <button
                        type="button"
                        disabled={isSlotUploading || applyingToAll}
                        onClick={() => setGalleryPickerTarget({ variantId: variant.id, slot })}
                        className="inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition shadow-2xs cursor-pointer"
                        title="Pick an existing photo from the product's gallery"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span>Gallery</span>
                      </button>
                    )}
                  </div>

                  {isSlotUploading && (
                    <div className="absolute inset-0 rounded-xl bg-white/90 backdrop-blur-xs flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 z-10">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading…
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                {isEditingOptions ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.keys(v.options ?? {}).map((axis) => (
                        <div key={axis}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            {axis}
                          </label>
                          <input
                            value={editingOptionsDraft[axis] ?? ""}
                            onChange={(e) =>
                              setEditingOptionsDraft((prev) => ({ ...prev, [axis]: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditOptions(v.id)}
                        disabled={savingOptions}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save combination
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditOptions}
                        disabled={savingOptions}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => startEditOptions(v)}
                    className="flex items-center gap-1.5 min-w-0 text-left group"
                    title="Edit this combination"
                  >
                    <span className="text-base font-bold text-slate-900 truncate">
                      {formatOptions(v.options) || "—"}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0 transition" />
                  </button>
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(v)}
                      title={v.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        v.isActive ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          v.isActive ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {field("stock", "Stock")}
                  {field("purchasePriceOverride", "Purchase price", "Base cost", undefined, "amber")}
                  {field("priceOverride", "Selling price", "Base price", undefined, "emerald")}
                  {field("discountOverride", "Discount %", "0", 100)}
                </div>
                {hasMargin && (
                  <p className={`text-[10px] font-semibold ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    Margin: ₹{margin.toFixed(0)} ({marginPct.toFixed(1)}%)
                  </p>
                )}
                {hasEdit && (
                  <span className="block text-[10px] font-semibold text-amber-600">Unsaved — click Save Changes below</span>
                )}

                {/* DUAL VARIANT IMAGES (1st image & 2nd image) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Variant Images <span className="normal-case font-normal text-slate-400">(1st image Required *, 2nd image Optional)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.image && v.secondaryImage && (
                        <button
                          type="button"
                          onClick={() => handleSwapImages(v)}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          title="Swap 1st image and 2nd image"
                        >
                          <ArrowLeftRight className="h-3 w-3" />
                          Swap order
                        </button>
                      )}
                    </div>
                  </div>

                  {v.isActive && !v.image && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>1st image is required before saving or selling this variant.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {renderImageSlot(v, "primary", "1st image *", "Shown when this option is selected")}
                    {renderImageSlot(v, "secondary", "2nd image", "Hover cross-fade & gallery thumbnail")}
                  </div>
                </div>

                {categoryFilters && categoryFilters.attrs.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                    {categoryFilters.attrs.map((attr) => (
                      <div key={attr.id}>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                          {attr.name}
                          {attr.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {renderAttrControl(attr, categoryFilters.getValue(v.id, attr.id), (next) =>
                          categoryFilters.onChange(v.id, attr.id, next),
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gallery Picker Modal */}
      {galleryPickerTarget && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Choose from Product Gallery</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {galleryPickerTarget.variantId === "ALL"
                    ? `Apply chosen image to ALL ${variants.length} variants (${galleryPickerTarget.slot === "primary" ? "1st image" : "2nd image"})`
                    : `Select an image for ${galleryPickerTarget.slot === "primary" ? "1st image" : "2nd image"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryPickerTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {productImages && productImages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {productImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={applyingToAll}
                      onClick={() => {
                        handleSetImageUrl(galleryPickerTarget.variantId, galleryPickerTarget.slot, imgUrl);
                        if (galleryPickerTarget.variantId !== "ALL") setGalleryPickerTarget(null);
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 hover:border-indigo-600 focus:border-indigo-600 transition shadow-2xs cursor-pointer"
                    >
                      <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded shadow transition">
                          Select
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">No product gallery images found.</p>
              )}
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setGalleryPickerTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / High-Res Image Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                  {previewModalImage.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                title="Close preview (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[260px] max-h-[65vh] overflow-hidden">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Esc</kbd> or click outside to close</span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VariantsManagerFields.displayName = "VariantsManagerFields";

export default VariantsManagerFields;
