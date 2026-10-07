// src/products/AddProductModal.tsx
// Modal version of the former standalone "Add Product" page — launched from the
// unified Catalog browser (Listcategory.tsx) instead of navigating away. Same form,
// validation, and API call as before, just rendered over the browser.

import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Type,
  RefreshCw,
  Zap,
  Tag,
  IndianRupee,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeftRight,
  AlertTriangle,
  Eye,
  Sparkles,
  Check,
  Camera,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Bold,
} from "lucide-react";
import { compressImage } from "../utils/compressImage";
import { calculateDiscountDetails, calculateDiscountedPrice, calculateDiscountAmount } from "../utils/product";
import { convertClipboardHtmlToText } from "../utils/sanitizeHtml";

interface ValidationField {
  isValid: boolean;
  message: string;
}

interface ProductFormData {
  categoryCode: string;
  productCode: string;
  productName: string;
  brand: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  purchasePrice: string;
  price: string;
  stock: string;
  discount: string;
  image: File | null;
  additionalImages: File[];
}

interface ProductValidation {
  category: ValidationField;
  productCode: ValidationField;
  productName: ValidationField;
  description: ValidationField;
  purchasePrice: ValidationField;
  price: ValidationField;
  image: ValidationField;
  stock: ValidationField;
  discount: ValidationField;
}

/** Human-readable label per validation key, used to name the specific field(s)
 * blocking submission — see handleSubmit's invalid-fields toast below. */
const FIELD_LABELS: Record<keyof ProductValidation, string> = {
  category: "Category",
  productCode: "Product Code",
  productName: "Product Name",
  description: "Description",
  purchasePrice: "Purchase Price",
  price: "Selling Price",
  image: "Product Image",
  stock: "Stock",
  discount: "Discount",
};

interface CategoryAttr {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  values: { id: string; value: string }[];
}

/** One row of the "add options" builder — a raw, not-yet-parsed axis name + its
 * comma-separated values, kept as free text while the admin is still typing. Same
 * shape as ProductVariantsModal.tsx's OptionGroupInput, since it's the same builder
 * pattern reused here so a variant product can be fully set up in one pass instead of
 * needing a second trip through Manage Variants after saving. */
interface OptionGroupInput {
  name: string;
  values: string;
  /** When on (the default), generating this option also creates/reuses a matching
   * Category Filter attribute and tags each variant with it (see backend/src/utils/
   * optionFilterSync.ts) — no separate trip through Category Management needed. */
  isFilterable?: boolean;
}

/** Per-combination edits the admin makes in the live preview table, keyed by the
 * combo's canonical options key (see computeOptionsKeyClient) — kept separate from
 * the combos themselves so retyping an option's values doesn't wipe out edits for
 * combinations that still exist after the change. */
interface DraftVariantEdit {
  stock?: string;
  priceOverride?: string;
  purchasePriceOverride?: string;
  discountOverride?: string;
  /** Defaults to true (unset) — every new ProductVariant row starts active; this only
   * ever gets set to false, when the admin explicitly flips a combo's toggle off. */
  isActive?: boolean;
  /** Primary image file for this specific variant (Slot 1) */
  imageFile?: File | null;
  imagePreview?: string | null;
  /** Secondary angle/detail image file for this specific variant (Slot 2) */
  secondaryImageFile?: File | null;
  secondaryImagePreview?: string | null;
}

/** Client-side mirror of backend/src/utils/productVariant.ts's computeOptionsKey —
 * must stay byte-for-byte identical so a combo computed here matches the same combo's
 * optionsKey once the backend actually creates it (that's how submitted draft edits
 * get matched back up to their real variant id after generateVariants runs). */
const computeOptionsKeyClient = (options: Record<string, string>): string =>
  Object.entries(options)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => [k.trim(), String(v).trim()] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

const ValidationIndicator = ({ isValid, message }: { isValid: boolean; message: string }) => (
  <div className="flex items-center gap-2 mt-1">
    {isValid ? (
      <CheckCircle className="h-3 w-3 text-emerald-500" />
    ) : (
      <AlertCircle className="h-3 w-3 text-amber-500" />
    )}
    <span className="text-xs text-slate-500">{message}</span>
  </div>
);

const emptyForm = (categoryCode: string): ProductFormData => ({
  categoryCode,
  productCode: "",
  productName: "",
  brand: "",
  description: "",
  metaTitle: "",
  metaDescription: "",
  purchasePrice: "",
  price: "",
  stock: "",
  discount: "",
  image: null,
  additionalImages: [],
});

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Drill-down context from Listcategory.tsx's "Add Product Here" button — the
   * category is always fixed by whichever leaf node the browser is drilled into,
   * so there's no in-form picker to change it, just this fixed context. */
  categoryId?: string;
  categoryName?: string;
  /** Full ancestor chain from root down to (and including) this category, e.g.
   * ["Triumph", "Early Bird Discount"], for the breadcrumb shown in the header. */
  categoryPath?: string[];
  /** Called after a successful create — use it to close the modal and refresh the list. */
  onSuccess: () => void;
}

export default function AddProductModal({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  categoryPath,
  onSuccess,
}: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => emptyForm(categoryId ?? ""));
  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttr[]>([]);
  const [attrsLoading, setAttrsLoading] = useState(false);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Whether this product is being created as a plain single-SKU item or one with its
  // own purchasable options (see backend/src/models/mongoose.ts's ProductVariant).
  // "variants" swaps the Stock field for a live preview built from optionGroups below,
  // combining what used to be a separate trip through Manage Variants after saving.
  const [variantMode, setVariantMode] = useState<"none" | "variants">("none");
  const [optionGroups, setOptionGroups] = useState<OptionGroupInput[]>([{ name: "", values: "", isFilterable: true }]);
  const [draftVariants, setDraftVariants] = useState<Record<string, DraftVariantEdit>>({});
  // Once variant mode is on, Category Filters moves out of the right column and joins
  // Options in a tabbed section below — with many attributes AND many combinations
  // both on screen at once the form could grow to several screens tall otherwise.
  const [addSectionTab, setAddSectionTab] = useState<"variants" | "images">("images");
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; subtitle?: string } | null>(
    null,
  );
  const [activePreviewComboKey, setActivePreviewComboKey] = useState<string | null>(null);
  const [activePreviewSlot, setActivePreviewSlot] = useState<"primary" | "secondary">("primary");
  const [comboCardTabs, setComboCardTabs] = useState<Record<string, "pricing" | "images">>({});
  const [globalComboTab, setGlobalComboTab] = useState<"pricing" | "images">("pricing");

  const [validation, setValidation] = useState<ProductValidation>({
    category: { isValid: false, message: "Category is required" },
    productCode: { isValid: false, message: "Alphanumeric only" },
    productName: { isValid: false, message: "Letters, numbers & basic symbols" },
    description: { isValid: false, message: "Minimum 10 characters" },
    purchasePrice: { isValid: true, message: "Optional — cost/purchase price" },
    price: { isValid: false, message: "Price must be greater than 0" },
    image: { isValid: false, message: "Image required" },
    stock: { isValid: true, message: "Optional — default stock is 0" },
    discount: { isValid: true, message: "Optional — 0% to 100%" },
  });

  // Reset form whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setFormData(emptyForm(categoryId ?? ""));
      setAttrValues({});
      setCategoryAttrs([]);
      setImagePreview(null);
      setAdditionalPreviews([]);
      setCharCount(0);
      setVariantMode("none");
      setOptionGroups([{ name: "", values: "", isFilterable: true }]);
      setDraftVariants({});
      setAddSectionTab("images");
      setPreviewModalImage(null);
      setActivePreviewComboKey(null);
      setActivePreviewSlot("primary");
      setComboCardTabs({});
      setGlobalComboTab("pricing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categoryId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewModalImage) {
          setPreviewModalImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, previewModalImage, onClose]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!formData.categoryCode) {
      setCategoryAttrs([]);
      setAttrsLoading(false);
      setAttrValues({});
      return;
    }
    setAttrsLoading(true);
    api
      .get(`/category/${formData.categoryCode}/attributes`)
      .then((res) => {
        // RATING/PRICE are informational entries admins can add for visibility in the
        // filter list (see CategoryAttributes.tsx) — the storefront's actual Rating/
        // Price filtering is global and built into every product's own rating/price
        // fields, not something tagged per-product here, so there's no input to render.
        const attrs: CategoryAttr[] = (res.data.attributes ?? []).filter(
          (a: CategoryAttr) => a.type !== "RATING" && a.type !== "PRICE",
        );
        setCategoryAttrs(attrs);
        setAttrValues({});
      })
      .catch(() => {})
      .finally(() => setAttrsLoading(false));
  }, [formData.categoryCode]);

  // Cartesian product across every named-and-valued row, exactly matching
  // productVariant.controller.ts's generateVariants — recomputed on every keystroke so
  // the preview table below always reflects what submitting right now would create.
  const parsedOptionGroups = useMemo(
    () =>
      optionGroups
        .map((row) => ({
          name: row.name.trim(),
          values: [...new Set(row.values.split(",").map((v) => v.trim()).filter(Boolean))],
          isFilterable: row.isFilterable ?? true,
        }))
        .filter((g) => g.name && g.values.length > 0),
    [optionGroups],
  );

  const previewCombos: Array<{ key: string; options: Record<string, string> }> = useMemo(() => {
    if (parsedOptionGroups.length === 0) return [];
    let combos: Array<Record<string, string>> = [{}];
    for (const group of parsedOptionGroups) {
      combos = combos.flatMap((combo) => group.values.map((value) => ({ ...combo, [group.name]: value })));
    }
    return combos.map((options) => ({ key: computeOptionsKeyClient(options), options }));
  }, [parsedOptionGroups]);

  const previewTotalStock = useMemo(
    () =>
      previewCombos.reduce(
        (sum, c) => sum + (parseInt(draftVariants[c.key]?.stock ?? "") || 0),
        0,
      ),
    [previewCombos, draftVariants],
  );

  const firstActiveCombo = useMemo(
    () => previewCombos.find((c) => (draftVariants[c.key]?.isActive !== false) && draftVariants[c.key]?.imagePreview),
    [previewCombos, draftVariants],
  );
  const firstVariantCoverUrl = firstActiveCombo ? draftVariants[firstActiveCombo.key]?.imagePreview : null;

  const currentPreviewCombo = useMemo(() => {
    if (previewCombos.length === 0) return null;
    const found = previewCombos.find((c) => c.key === activePreviewComboKey);
    return found || previewCombos[0];
  }, [previewCombos, activePreviewComboKey]);

  const currentDraft = currentPreviewCombo ? draftVariants[currentPreviewCombo.key] : null;
  const currentPrimaryUrl = currentDraft?.imagePreview || null;
  const currentSecondaryUrl = currentDraft?.secondaryImagePreview || null;
  const currentActiveUrl =
    activePreviewSlot === "secondary" && currentSecondaryUrl
      ? currentSecondaryUrl
      : (currentPrimaryUrl || currentSecondaryUrl || null);

  const currentPriceRaw =
    parseFloat(currentDraft?.priceOverride || formData.price || "0") || 0;
  const currentDiscountRaw =
    parseFloat(currentDraft?.discountOverride || formData.discount || "0") || 0;
  const currentStockRaw = parseInt(currentDraft?.stock || "0", 10) || 0;
  const previewDiscountDetails = calculateDiscountDetails(currentPriceRaw, currentDiscountRaw);

  const handleVariantImageUpload = async (comboKey: string, slot: "primary" | "secondary", file: File) => {
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setDraftVariants((prev) => {
        const current = prev[comboKey] ?? {};
        if (slot === "primary") {
          if (current.imagePreview) URL.revokeObjectURL(current.imagePreview);
          return { ...prev, [comboKey]: { ...current, imageFile: compressed, imagePreview: previewUrl } };
        } else {
          if (current.secondaryImagePreview) URL.revokeObjectURL(current.secondaryImagePreview);
          return { ...prev, [comboKey]: { ...current, secondaryImageFile: compressed, secondaryImagePreview: previewUrl } };
        }
      });
      toast.success(slot === "primary" ? "1st image attached" : "2nd image attached", { id: "variant-img-upload", duration: 1500 });
    } catch {
      toast.error("Failed to process image");
    }
  };

  const handleRemoveVariantImage = (comboKey: string, slot: "primary" | "secondary") => {
    setDraftVariants((prev) => {
      const current = prev[comboKey] ?? {};
      if (slot === "primary") {
        if (current.imagePreview) URL.revokeObjectURL(current.imagePreview);
        return { ...prev, [comboKey]: { ...current, imageFile: null, imagePreview: null } };
      } else {
        if (current.secondaryImagePreview) URL.revokeObjectURL(current.secondaryImagePreview);
        return { ...prev, [comboKey]: { ...current, secondaryImageFile: null, secondaryImagePreview: null } };
      }
    });
  };

  const handleSwapVariantImages = (comboKey: string) => {
    setDraftVariants((prev) => {
      const current = prev[comboKey] ?? {};
      return {
        ...prev,
        [comboKey]: {
          ...current,
          imageFile: current.secondaryImageFile ?? null,
          imagePreview: current.secondaryImagePreview ?? null,
          secondaryImageFile: current.imageFile ?? null,
          secondaryImagePreview: current.imagePreview ?? null,
        },
      };
    });
    toast.success("Variant photos swapped", { id: "swap-variant-img", duration: 1500 });
  };

  const handleApplyToAllVariants = (sourceKey: string, slot: "primary" | "secondary" | "both" = "both") => {
    const source = draftVariants[sourceKey];
    if (!source || (!source.imageFile && !source.secondaryImageFile)) {
      toast.error("Upload a photo for this option first before applying to all", { id: "no-src-img" });
      return;
    }

    setDraftVariants((prev) => {
      const next = { ...prev };
      for (const combo of previewCombos) {
        const cur = next[combo.key] ?? {};
        const updated = { ...cur };
        if (slot === "primary" || slot === "both") {
          if (source.imageFile && source.imagePreview) {
            updated.imageFile = source.imageFile;
            updated.imagePreview = source.imagePreview;
          }
        }
        if (slot === "secondary" || slot === "both") {
          if (source.secondaryImageFile && source.secondaryImagePreview) {
            updated.secondaryImageFile = source.secondaryImageFile;
            updated.secondaryImagePreview = source.secondaryImagePreview;
          }
        }
        next[combo.key] = updated;
      }
      return next;
    });

    const label =
      slot === "primary" ? "1st image" : slot === "secondary" ? "2nd image" : "Photos";
    toast.success(`${label} applied to all ${previewCombos.length} options ✓`, {
      id: "applied-all-variants",
      duration: 2500,
    });
  };

  const handleBulkUploadToAll = async (slot: "primary" | "secondary", file: File) => {
    try {
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setDraftVariants((prev) => {
        const next = { ...prev };
        for (const combo of previewCombos) {
          const cur = next[combo.key] ?? {};
          if (slot === "primary") {
            next[combo.key] = { ...cur, imageFile: compressed, imagePreview: previewUrl };
          } else {
            next[combo.key] = { ...cur, secondaryImageFile: compressed, secondaryImagePreview: previewUrl };
          }
        }
        return next;
      });
      toast.success(
        slot === "primary"
          ? `1st image applied to all ${previewCombos.length} options ✓`
          : `2nd image applied to all ${previewCombos.length} options ✓`,
        { id: "bulk-upload-all", duration: 2500 }
      );
    } catch {
      toast.error("Failed to process image");
    }
  };

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      additionalPreviews.forEach((url) => URL.revokeObjectURL(url));
      Object.values(draftVariants).forEach((d) => {
        if (d.imagePreview) URL.revokeObjectURL(d.imagePreview);
        if (d.secondaryImagePreview) URL.revokeObjectURL(d.secondaryImagePreview);
      });
    },
    [imagePreview, additionalPreviews, draftVariants],
  );

  useEffect(() => {
    const { categoryCode, productCode, productName, description, purchasePrice, price, stock, image } = formData;

    const activeCombos = previewCombos.filter((c) => draftVariants[c.key]?.isActive !== false);
    const allActiveHaveImages =
      previewCombos.length > 0 &&
      activeCombos.length > 0 &&
      activeCombos.every((c) => Boolean(draftVariants[c.key]?.imageFile));

    setValidation({
      category: {
        isValid: !!categoryCode,
        message: categoryCode ? "Category selected ✓" : "Category is required",
      },
      productCode: {
        isValid: /^[a-zA-Z0-9\s\-_/]+$/.test(productCode) && productCode.length > 0 && productCode.length <= 20,
        message:
          productCode.length === 0
            ? "Product code is required"
            : productCode.length > 20
              ? "Max 20 characters allowed"
              : !/^[a-zA-Z0-9\s\-_/]+$/.test(productCode)
                ? "Letters, numbers, spaces, -, _, and / only"
                : "Alphanumeric code ✓",
      },
      productName: {
        isValid:
          /^[a-zA-Z0-9\s&_\-,'()/]+$/.test(productName) && productName.trim().length > 0 && productName.length <= 100,
        message:
          productName.length === 0
            ? "Product name is required"
            : productName.length > 100
              ? "Max 100 characters allowed"
              : !/^[a-zA-Z0-9\s&_\-,'()/]+$/.test(productName)
                ? "Only letters, numbers, spaces, and basic symbols"
                : "Product name ✓",
      },
      description: {
        isValid: description.length >= 10,
        message: `${description.length}/10 characters minimum`,
      },
      purchasePrice: {
        isValid:
          purchasePrice === "" ||
          (!isNaN(parseFloat(purchasePrice)) && parseFloat(purchasePrice) >= 0 && parseFloat(purchasePrice) <= 999999999),
        message:
          purchasePrice === ""
            ? "Optional — cost/purchase price"
            : parseFloat(purchasePrice) > 999999999
              ? "Max cost price is ₹99 Crores"
              : !isNaN(parseFloat(purchasePrice)) && parseFloat(purchasePrice) >= 0
                ? "Valid purchase price ✓"
                : "Must be a non-negative number",
      },
      price: {
        // In variant mode, Selling Price isn't a field the admin fills in here at all
        // (see the Options card's preview table) — the base price gets derived from
        // whatever's entered there at submit time, so this field has nothing to
        // validate until it's actually shown again.
        isValid:
          variantMode === "variants" ||
          (!isNaN(parseFloat(price)) && parseFloat(price) > 0 && parseFloat(price) <= 999999999),
        message:
          price === ""
            ? "Price must be greater than 0"
            : parseFloat(price) > 999999999
              ? "Max selling price is ₹99 Crores"
              : !isNaN(parseFloat(price)) && parseFloat(price) > 0
                ? "Valid selling price ✓"
                : "Price must be greater than 0",
      },
      stock: {
        isValid:
          stock === "" || (!isNaN(Number(stock)) && Number(stock) >= 0 && Number(stock) <= 999999 && Number.isInteger(+stock)),
        message:
          stock === ""
            ? "Optional — default stock is 0"
            : Number(stock) > 999999
              ? "Max stock limit is 999,999 units"
              : !isNaN(Number(stock)) && Number(stock) >= 0 && Number.isInteger(+stock)
                ? "Valid stock count ✓"
                : "Stock must be a positive whole number",
      },
      discount: {
        isValid:
          formData.discount === "" ||
          (!isNaN(parseFloat(formData.discount)) && parseFloat(formData.discount) >= 0 && parseFloat(formData.discount) <= 100),
        message:
          formData.discount === ""
            ? "Optional — 0% to 100%"
            : !isNaN(parseFloat(formData.discount)) && parseFloat(formData.discount) >= 0 && parseFloat(formData.discount) <= 100
              ? "Valid discount % ✓"
              : "Discount must be between 0% and 100%",
      },
      image: {
        isValid: variantMode === "variants" ? allActiveHaveImages : image !== null,
        message:
          variantMode === "variants"
            ? previewCombos.length === 0
              ? "Add at least one option combination"
              : allActiveHaveImages
                ? "Variant images ready ✓"
                : "1st image required for all active options"
            : image
              ? "Image selected ✓"
              : "Image required",
      },
    });

    setCharCount(description.length);
  }, [formData, variantMode, previewCombos, draftVariants]);

  if (!isOpen) return null;

  const applyBoldToDescription = () => {
    const textarea = descriptionTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = formData.description;

    let newText = "";
    let newCursorPos = 0;

    if (start !== end) {
      const selected = currentText.substring(start, end);
      if (selected.startsWith("<b>") && selected.endsWith("</b>")) {
        const unwrapped = selected.slice(3, -4);
        newText = currentText.substring(0, start) + unwrapped + currentText.substring(end);
        newCursorPos = start + unwrapped.length;
      } else if (selected.startsWith("**") && selected.endsWith("**")) {
        const unwrapped = selected.slice(2, -2);
        newText = currentText.substring(0, start) + unwrapped + currentText.substring(end);
        newCursorPos = start + unwrapped.length;
      } else {
        const wrapped = `<b>${selected}</b>`;
        newText = currentText.substring(0, start) + wrapped + currentText.substring(end);
        newCursorPos = start + wrapped.length;
      }
    } else {
      const insertion = "<b>bold text</b>";
      newText = currentText.substring(0, start) + insertion + currentText.substring(end);
      newCursorPos = start + insertion.length;
    }

    setFormData((prev) => ({ ...prev, description: newText }));
    setCharCount(newText.length);

    setTimeout(() => {
      if (descriptionTextareaRef.current) {
        descriptionTextareaRef.current.focus();
        descriptionTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      applyBoldToDescription();
    }
  };

  const handleDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardHtml = e.clipboardData.getData("text/html");
    const clipboardPlain = e.clipboardData.getData("text/plain");

    if (!clipboardHtml && !clipboardPlain) return;

    const formatted = convertClipboardHtmlToText(clipboardHtml, clipboardPlain);

    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = formData.description;

    const newText = currentText.substring(0, start) + formatted + currentText.substring(end);
    const newCursorPos = start + formatted.length;

    setFormData((prev) => ({ ...prev, description: newText }));
    setCharCount(newText.length);

    setTimeout(() => {
      if (descriptionTextareaRef.current) {
        descriptionTextareaRef.current.focus();
        descriptionTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    if (name === "purchasePrice" || name === "price") {
      if (value !== "" && parseFloat(value) > 999999999) return;
    }
    if (name === "stock") {
      if (value !== "" && parseFloat(value) > 999999) return;
    }
    if (name === "discount") {
      if (value !== "" && parseFloat(value) > 100) return;
    }

    if (name === "image") {
      const file = files?.[0];
      if (file) {
        const compressed = await compressImage(file);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        const url = URL.createObjectURL(compressed);
        setFormData((prev) => ({ ...prev, image: compressed }));
        setImagePreview(url);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdditionalImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const remaining = 5 - formData.additionalImages.length;
    const allowed = newFiles.slice(0, remaining);
    const compressed = await Promise.all(allowed.map(compressImage));

    const newUrls = compressed.map((f) => URL.createObjectURL(f));
    setFormData((prev) => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...compressed],
    }));
    setAdditionalPreviews((prev) => [...prev, ...newUrls]);
    e.target.value = "";
  };

  const removeAdditionalImage = (index: number) => {
    URL.revokeObjectURL(additionalPreviews[index]);
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index),
    }));
  };

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    additionalPreviews.forEach((url) => URL.revokeObjectURL(url));
    Object.values(draftVariants).forEach((d) => {
      if (d.imagePreview) URL.revokeObjectURL(d.imagePreview);
      if (d.secondaryImagePreview) URL.revokeObjectURL(d.secondaryImagePreview);
    });
    setFormData(emptyForm(categoryId ?? ""));
    setAttrValues({});
    setCategoryAttrs([]);
    setImagePreview(null);
    setAdditionalPreviews([]);
    setCharCount(0);
    setVariantMode("none");
    setOptionGroups([{ name: "", values: "", isFilterable: true }]);
    setDraftVariants({});
    setAddSectionTab("options");
    setActivePreviewComboKey(null);
    setActivePreviewSlot("primary");
    setComboCardTabs({});
    setGlobalComboTab("pricing");
    setPreviewModalImage(null);

    const input = document.getElementById("addProductImageUpload") as HTMLInputElement | null;
    if (input) input.value = "";
    const addInput = document.getElementById("addProductAdditionalImagesUpload") as HTMLInputElement | null;
    if (addInput) addInput.value = "";
  };

  const addOptionGroupRow = () => setOptionGroups((prev) => [...prev, { name: "", values: "", isFilterable: true }]);
  const removeOptionGroupRow = (index: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  const updateOptionGroupRow = (index: number, field: "name" | "values", value: string) =>
    setOptionGroups((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const toggleOptionGroupFilterable = (index: number) =>
    setOptionGroups((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isFilterable: !(row.isFilterable ?? true) } : row)),
    );

  // Once a product has variants, any category attribute whose name matches one of the
  // option axes being typed below (e.g. "Color") gets its value set automatically from
  // the option itself once the product is created (see backend/src/utils/
  // optionFilterSync.ts) — showing it here too would just be a second, manually-set
  // place for the same attribute to disagree with the option driving it. Only relevant
  // once variants are on; a plain single-SKU product has no options to collide with.
  const optionAxisNames = new Set(parsedOptionGroups.map((g) => g.name.trim().toLowerCase()));
  const visibleCategoryAttrs =
    variantMode === "variants" ? categoryAttrs.filter((attr) => !optionAxisNames.has(attr.name.trim().toLowerCase())) : categoryAttrs;

  // Shared between the two places Category Filters can render — nested in the right
  // column for a plain product, or its own card in the Filters/Options tab once
  // variant mode is on (see addSectionTab).
  const categoryFilterFields = (
    <div className="space-y-4">
      {visibleCategoryAttrs.map((attr) => (
        <div key={attr.id}>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {attr.name}
            {attr.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          {attr.type === "SELECT" && (
            <select
              value={attrValues[attr.id] ?? ""}
              onChange={(e) => setAttrValues((prev) => ({ ...prev, [attr.id]: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">— Select {attr.name} —</option>
              {attr.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.value}
                </option>
              ))}
            </select>
          )}
          {attr.type === "MULTISELECT" && (
            <div className="flex flex-wrap gap-2">
              {attr.values.map((v) => {
                const selected = (attrValues[attr.id] ?? "").split(",").filter(Boolean).includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      const cur = (attrValues[attr.id] ?? "").split(",").filter(Boolean);
                      const next = selected ? cur.filter((id) => id !== v.id) : [...cur, v.id];
                      setAttrValues((prev) => ({ ...prev, [attr.id]: next.join(",") }));
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                      selected ? "bg-gray-900 text-white border-gray-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {v.value}
                  </button>
                );
              })}
            </div>
          )}
          {attr.type === "BOOLEAN" && (
            <div className="flex gap-3">
              {attr.values.map((v) => {
                const active = attrValues[attr.id] === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setAttrValues((prev) => ({ ...prev, [attr.id]: active ? "" : v.id }))}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                      active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {v.value}
                  </button>
                );
              })}
            </div>
          )}
          {(attr.type === "TEXT" || attr.type === "NUMBER" || attr.type === "DATE") && (
            <input
              type={attr.type === "NUMBER" ? "number" : attr.type === "DATE" ? "date" : "text"}
              value={attrValues[attr.id] ?? ""}
              onChange={(e) => setAttrValues((prev) => ({ ...prev, [attr.id]: e.target.value }))}
              placeholder={`Enter ${attr.name.toLowerCase()}…`}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          )}
        </div>
      ))}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (variantMode === "variants" && previewCombos.length === 0) {
      toast.error("Add at least one option (a name and its values) below, or switch back to “Single item”.", {
        id: "no-variant-options",
      });
      return;
    }

    if (variantMode === "variants") {
      const activeMissingImages = previewCombos.filter(
        (c) => (draftVariants[c.key]?.isActive !== false) && !draftVariants[c.key]?.imageFile,
      );
      if (activeMissingImages.length > 0) {
        const names = activeMissingImages
          .slice(0, 2)
          .map((c) => Object.entries(c.options).map(([k, v]) => `${k}: ${v}`).join(" / "))
          .join(", ");
        const more = activeMissingImages.length > 2 ? ` (+${activeMissingImages.length - 2} more)` : "";
        toast.error(`1st image is required for all active options. Missing: ${names}${more}`, {
          id: "variant-image-required-add",
          duration: 5000,
        });
        return;
      }
    }

    const invalidFields = (Object.keys(validation) as (keyof ProductValidation)[]).filter(
      (key) => !validation[key].isValid,
    );
    if (invalidFields.length > 0) {
      const names = invalidFields.map((key) => FIELD_LABELS[key]).join(", ");
      toast.error(`Please fix the following before submitting: ${names}.`, { id: "fill all feilds" });
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();

      data.append("category", formData.categoryCode);
      data.append("code", formData.productCode);
      data.append("name", formData.productName);
      if (formData.brand.trim()) data.append("brand", formData.brand.trim());
      data.append("description", formData.description);
      if (formData.metaTitle.trim()) data.append("metaTitle", formData.metaTitle.trim());
      if (formData.metaDescription.trim()) data.append("metaDescription", formData.metaDescription.trim());

      if (variantMode === "variants") {
        // Auto-assign the first active variant's image as the initial product image
        const firstActive = previewCombos.find(
          (c) => (draftVariants[c.key]?.isActive !== false) && draftVariants[c.key]?.imageFile,
        );
        if (firstActive && draftVariants[firstActive.key]?.imageFile) {
          data.append("image", draftVariants[firstActive.key]!.imageFile!);
        } else if (formData.image) {
          data.append("image", formData.image);
        }

        // Purchase Price / Selling Price / Stock / Discount aren't filled in here at
        // all (see the Options card's per-combination Defaults) — a `price` still has
        // to be sent to satisfy the backend's required field, so use the cheapest
        // price actually entered below as a starting point. syncProductFromVariants
        // (backend/src/utils/productVariant.ts) immediately recomputes the real
        // Product.price/purchasePrice/discount once the variants exist, so this value
        // only matters for the brief moment before that runs.
        const enteredPrices = previewCombos
          .map((c) => parseFloat(draftVariants[c.key]?.priceOverride ?? ""))
          .filter((n) => !isNaN(n) && n > 0);
        data.append("price", String(enteredPrices.length > 0 ? Math.min(...enteredPrices) : 1));
      } else {
        if (formData.image) data.append("image", formData.image);
        formData.additionalImages.forEach((img) => data.append("images", img));
        if (formData.purchasePrice !== "") data.append("purchasePrice", formData.purchasePrice);
        data.append("price", formData.price);
        if (formData.stock !== "") data.append("stock", formData.stock);
        if (formData.discount !== "") data.append("discount", formData.discount);
      }

      const attrPayload = Object.entries(attrValues)
        .filter(([, v]) => v)
        .map(([attributeId, v]) => {
          const attr = categoryAttrs.find((a) => a.id === attributeId);
          // BOOLEAN stores a real CategoryAttributeValue id too (see its button handler
          // below, which sets attrValues[attr.id] = v.id) — it's id-based like SELECT/
          // MULTISELECT, not free text, despite reading like a plain toggle.
          if (attr && (attr.type === "SELECT" || attr.type === "MULTISELECT" || attr.type === "BOOLEAN")) {
            return { attributeId, attributeValueId: v };
          }
          return { attributeId, textValue: v };
        });
      if (attrPayload.length > 0) data.append("attributeValues", JSON.stringify(attrPayload));

      const res = await api.post("/product/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newProductId: string | undefined = res.data.product?.id ?? res.data.product?._id;

      // Product exists now, so the option groups drawn up in the preview below can
      // actually be created — same two calls Manage Variants itself makes
      // (generateVariants, then updateVariant per row with a value typed in), just run
      // right here instead of needing a second trip back into this product later.
      if (variantMode === "variants" && newProductId && previewCombos.length > 0) {
        const genRes = await api.post(`/product/${newProductId}/variants/generate`, {
          optionGroups: parsedOptionGroups,
        });
        const createdVariants: Array<{ id: string; optionsKey: string }> = genRes.data.variants ?? [];

        // Upload cache: maps File instances to uploaded Cloudinary URLs to prevent duplicate uploads
        const uploadedFileCache = new Map<File, string>();

        for (const variant of createdVariants) {
          const draft = draftVariants[variant.optionsKey];
          if (!draft) continue;

          let primaryUrl: string | undefined = undefined;
          let secondaryUrl: string | undefined = undefined;

          // 1. Upload or reuse Slot 1 image
          if (draft.imageFile) {
            if (uploadedFileCache.has(draft.imageFile)) {
              primaryUrl = uploadedFileCache.get(draft.imageFile);
            } else {
              const imgData = new FormData();
              imgData.append("image", draft.imageFile);
              const uploadRes = await api.post(`/product/${newProductId}/variants/${variant.id}/images`, imgData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              primaryUrl = uploadRes.data.variant?.image || undefined;
              if (primaryUrl) uploadedFileCache.set(draft.imageFile, primaryUrl);
            }
          }

          // 2. Upload or reuse Slot 2 image
          if (draft.secondaryImageFile) {
            if (uploadedFileCache.has(draft.secondaryImageFile)) {
              secondaryUrl = uploadedFileCache.get(draft.secondaryImageFile);
            } else {
              const imgData = new FormData();
              imgData.append("secondaryImage", draft.secondaryImageFile);
              const uploadRes = await api.post(`/product/${newProductId}/variants/${variant.id}/images`, imgData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              secondaryUrl = uploadRes.data.variant?.secondaryImage || undefined;
              if (secondaryUrl) uploadedFileCache.set(draft.secondaryImageFile, secondaryUrl);
            }
          }

          // 3. Update stock, price, discount, active state, and assigned image URLs
          await api.put(`/product/${newProductId}/variants/${variant.id}`, {
            stock: draft.stock || undefined,
            priceOverride: draft.priceOverride || "0",
            purchasePriceOverride: draft.purchasePriceOverride || "0",
            discountOverride: draft.discountOverride || null,
            isActive: draft.isActive === false ? false : true,
            ...(primaryUrl ? { image: primaryUrl } : {}),
            ...(secondaryUrl ? { secondaryImage: secondaryUrl } : {}),
          });
        }
      }

      toast.success(res.data.message || "Product added successfully!", { id: "product-added" });
      onSuccess();
    } catch (err) {
      const _e = err as any;
      toast.error(
        _e.response?.data?.message || _e.response?.data?.Error || "Error adding product. Please try again.",
        { id: "error adding product" },
      );
    } finally {
      setLoading(false);
    }
  };

  // Ancestor chain for the header breadcrumb — falls back to just the category name
  // if the caller didn't pass the full path (e.g. a direct categoryName-only usage).
  const pathSegments = categoryId ? (categoryPath?.length ? categoryPath : categoryName ? [categoryName] : []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-950">Add New Product</h2>
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
                Deploy a new product into the catalog and set its pricing and attributes.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* 1. Product Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100">
                    <Tag className="h-4 w-4 text-slate-700" />
                  </div>
                  Product Information
                </h3>
                <p className="text-sm text-slate-500 mt-1">Define your product details and attributes</p>
              </div>

              {/* Variant mode toggle */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Sold as</label>
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVariantMode("none");
                      setAddSectionTab("images");
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      variantMode === "none" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Single item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVariantMode("variants");
                      setAddSectionTab("variants");
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      variantMode === "variants" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Multiple options
                  </button>
                </div>
                {variantMode === "variants" && (
                  <p className="text-xs text-slate-400 mt-2">
                    Each combination gets its own stock and price in the Variants tab below.
                  </p>
                )}
              </div>

              {/* Product Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-800">Product Code</label>
                  <span className="text-xs font-medium text-slate-500">{formData.productCode.length}/20 chars</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="productCode"
                    maxLength={20}
                    value={formData.productCode}
                    onChange={handleChange}
                    placeholder="PROD-1001"
                    className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validation.productCode.isValid ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : formData.productCode ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                <ValidationIndicator isValid={validation.productCode.isValid} message={validation.productCode.message} />
              </div>

              {/* Product Name */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-800">Product Name</label>
                  <span className="text-xs font-medium text-slate-500">{formData.productName.length}/100 chars</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="productName"
                    maxLength={100}
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Eg: Cotton Silk Saree with Zari Border"
                    className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validation.productName.isValid ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : formData.productName ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                <ValidationIndicator isValid={validation.productName.isValid} message={validation.productName.message} />
              </div>

              {/* Brand */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-800">Brand</label>
                  <span className="text-xs font-medium text-slate-500">Optional</span>
                </div>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Eg: Nike, Adidas…"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-semibold text-slate-800">Description</label>
                    <button
                      type="button"
                      onClick={applyBoldToDescription}
                      title="Bold (Ctrl+B) - Select text to bold"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors shadow-xs cursor-pointer"
                    >
                      <Bold className="w-3 h-3" />
                      <span>Bold</span>
                    </button>
                  </div>
                  <span className={`text-xs font-medium ${charCount >= 10 ? "text-emerald-600" : "text-slate-500"}`}>
                    {charCount}/10 characters
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    ref={descriptionTextareaRef}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onKeyDown={handleDescriptionKeyDown}
                    onPaste={handleDescriptionPaste}
                    rows={4}
                    placeholder="Describe this product in detail... (Select text and click Bold, paste rich text, or use **word** / <b>word</b>)"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 resize-y"
                  />
                  <div className="absolute right-3 top-3">
                    {validation.description.isValid ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : formData.description ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                <ValidationIndicator isValid={validation.description.isValid} message={validation.description.message} />
              </div>

              {/* SEO */}
              <div className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">SEO <span className="font-normal normal-case text-slate-400">(optional)</span></p>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-800">Meta Title</label>
                    <span className="text-xs font-medium text-slate-500">{formData.metaTitle.length}/70</span>
                  </div>
                  <input
                    type="text"
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    maxLength={70}
                    placeholder={formData.productName || "Defaults to the product name"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-800">Meta Description</label>
                    <span className="text-xs font-medium text-slate-500">{formData.metaDescription.length}/160</span>
                  </div>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    rows={2}
                    maxLength={160}
                    placeholder="Defaults to the description above, trimmed to fit"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>
              </div>

              {/* Single item pricing & stock fields */}
              {variantMode === "none" && (
                <>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Purchase Price */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-slate-800">Purchase Price</label>
                          <span className="text-xs font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                            Cost Price
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            name="purchasePrice"
                            min={0}
                            max={999999999}
                            step="any"
                            value={formData.purchasePrice}
                            onChange={handleChange}
                            placeholder="Eg: 1200"
                            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-amber-100 bg-amber-50/30 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition-all duration-200"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {validation.purchasePrice.isValid && formData.purchasePrice ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : formData.purchasePrice ? (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span className="text-xs text-amber-400 font-semibold">₹</span>
                            )}
                          </div>
                        </div>
                        <ValidationIndicator isValid={validation.purchasePrice.isValid} message={validation.purchasePrice.message} />
                      </div>

                      {/* Selling Price */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-slate-800">Selling Price</label>
                          <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Current Price
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            name="price"
                            min={0}
                            max={999999999}
                            step="any"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Eg: 2499"
                            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {validation.price.isValid ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : formData.price ? (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">₹</span>
                            )}
                          </div>
                        </div>
                        <ValidationIndicator isValid={validation.price.isValid} message={validation.price.message} />
                      </div>
                    </div>

                    {/* Profit Indicator */}
                    {formData.purchasePrice !== "" && formData.price !== "" && parseFloat(formData.price) > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 text-sm">
                        <IndianRupee className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="text-slate-600">Estimated profit:</span>
                        <span
                          className={`font-bold ${
                            parseFloat(formData.price) - parseFloat(formData.purchasePrice || "0") >= 0
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          ₹{(parseFloat(formData.price) - parseFloat(formData.purchasePrice || "0")).toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-xs">
                          (
                          {parseFloat(formData.purchasePrice || "0") > 0
                            ? (
                                ((parseFloat(formData.price) - parseFloat(formData.purchasePrice)) /
                                  parseFloat(formData.purchasePrice)) *
                                100
                              ).toFixed(1)
                            : "—"}
                          % margin)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stock */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-800">Stock</label>
                      <span className="text-xs font-medium text-slate-500">(Update stock)</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        name="stock"
                        min={0}
                        max={999999}
                        step={1}
                        value={formData.stock}
                        onChange={handleChange}
                        placeholder="Eg: 50"
                        className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {validation.stock.isValid && formData.stock ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : formData.stock ? (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        ) : null}
                      </div>
                    </div>
                    <ValidationIndicator isValid={validation.stock.isValid} message={validation.stock.message} />
                  </div>

                  {/* Discount, Discount Amount & Final Offer Price */}
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Discount % */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-slate-800">Discount %</label>
                          <span className="text-xs font-medium text-slate-500">0 to 100</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            name="discount"
                            value={formData.discount}
                            onChange={handleChange}
                            placeholder="Eg: 23.85"
                            min={0}
                            max={100}
                            step="any"
                            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {validation.discount.isValid && formData.discount ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : formData.discount ? (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">%</span>
                            )}
                          </div>
                        </div>
                        <ValidationIndicator isValid={validation.discount.isValid} message={validation.discount.message} />
                      </div>

                      {/* Discount Amount */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-slate-800">Discount Amount</label>
                          <span className="text-xs font-semibold text-amber-600">₹ off</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={parseFloat(String(formData.price || 0)) || undefined}
                            placeholder="e.g. 119"
                            disabled={!formData.price || parseFloat(String(formData.price)) <= 0}
                            value={
                              formData.price && formData.discount !== "" && parseFloat(String(formData.discount)) > 0
                                ? calculateDiscountAmount(formData.price, formData.discount)
                                : ""
                            }
                            onChange={(e) => {
                              const discAmt = parseFloat(e.target.value);
                              const basePrice = parseFloat(String(formData.price || 0));
                              if (isNaN(discAmt) || e.target.value === "") {
                                setFormData((prev) => ({ ...prev, discount: "" }));
                              } else if (basePrice > 0) {
                                const boundedDiscAmt = Math.max(0, Math.min(basePrice, discAmt));
                                const calculatedDiscount = (boundedDiscAmt / basePrice) * 100;
                                setFormData((prev) => ({
                                  ...prev,
                                  discount: calculatedDiscount > 0 ? Number(calculatedDiscount.toFixed(2)).toString() : "0",
                                }));
                              }
                            }}
                            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-amber-200 bg-amber-50/30 text-amber-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition-all duration-200 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-semibold">
                            ₹
                          </span>
                        </div>
                      </div>

                      {/* Final Offer Price */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-slate-800">Final Offer Price</label>
                          <span className="text-xs font-semibold text-emerald-600">Selling ₹</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={parseFloat(String(formData.price || 0)) || undefined}
                            placeholder={
                              formData.price && parseFloat(String(formData.price)) > 0
                                ? `e.g. ${Math.round(parseFloat(String(formData.price)) * 0.8)}`
                                : "Enter MRP first"
                            }
                            disabled={!formData.price || parseFloat(String(formData.price)) <= 0}
                            value={
                              formData.price && formData.discount !== "" && parseFloat(String(formData.discount)) >= 0
                                ? calculateDiscountedPrice(formData.price, formData.discount)
                                : ""
                            }
                            onChange={(e) => {
                              const offerVal = parseFloat(e.target.value);
                              const basePrice = parseFloat(String(formData.price || 0));
                              if (isNaN(offerVal) || e.target.value === "") {
                                setFormData((prev) => ({ ...prev, discount: "" }));
                              } else if (basePrice > 0) {
                                const boundedOffer = Math.max(0, Math.min(basePrice, offerVal));
                                const calculatedDiscount = ((basePrice - boundedOffer) / basePrice) * 100;
                                setFormData((prev) => ({
                                  ...prev,
                                  discount: calculatedDiscount > 0 ? Number(calculatedDiscount.toFixed(2)).toString() : "0",
                                }));
                              }
                            }}
                            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-emerald-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-transparent transition-all duration-200 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-semibold">
                            ₹
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live discount amount readout */}
                    {formData.price !== "" && parseFloat(String(formData.price)) > 0 && formData.discount !== "" && parseFloat(String(formData.discount)) > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs px-3.5 py-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-slate-700">
                        <span>
                          MRP: <span className="line-through font-mono font-semibold">₹{formData.price}</span>
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Discount: ₹{calculateDiscountAmount(formData.price, formData.discount)} ({formData.discount}%)
                        </span>
                        <span className="font-bold text-emerald-950 font-mono">
                          Customer pays: ₹{calculateDiscountedPrice(formData.price, formData.discount)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 2. Variants Section (when Sold as: Multiple options) */}
            {variantMode === "variants" && (
              <div id="add-variants-section" className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Variants
                  </p>
                </div>

                {/* FILTER VISIBILITY Card */}
                {optionGroups.some((g) => g.name.trim()) && (
                  <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      FILTER VISIBILITY
                    </p>
                    {optionGroups.filter((g) => g.name.trim()).map((group, index) => {
                      const isOn = group.isFilterable ?? true;
                      return (
                        <div key={index} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-700">{group.name.trim()}</span>
                          <button
                            type="button"
                            onClick={() => toggleOptionGroupFilterable(index)}
                            className="inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer"
                          >
                            <span>{isOn ? "Shown to customers" : "Hidden from customers"}</span>
                            <span
                              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                                isOn ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                                  isOn ? "translate-x-3.5" : "translate-x-0.5"
                                }`}
                              />
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add options Card */}
                <div className="bg-white rounded-xl border border-indigo-100 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Add options</h4>
                  </div>

                  <div className="space-y-3">
                    {optionGroups.map((row, index) => (
                      <div key={index} className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOptionGroupRow(index)}
                            disabled={optionGroups.length <= 1}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition cursor-pointer"
                            title="Remove option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              OPTION NAME
                            </label>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateOptionGroupRow(index, "name", e.target.value)}
                              placeholder="e.g. Storage"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              VALUES (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={row.values}
                              onChange={(e) => updateOptionGroupRow(index, "values", e.target.value)}
                              placeholder="e.g. 128GB, 256GB, 512GB"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleOptionGroupFilterable(index)}
                          className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1"
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

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={addOptionGroupRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add option
                    </button>
                    {previewCombos.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs">
                        <Plus className="h-3.5 w-3.5" />
                        Add Combinations ({previewCombos.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Combinations List Section */}
                {previewCombos.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                      <span>PREVIEW — {previewCombos.length} COMBINATIONS, {previewTotalStock} UNITS TOTAL</span>
                    </div>

                    {/* Top Batch Toolbar for Shared Images */}
                    {previewCombos.length > 1 && (
                      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Same photo for all the variants?</p>
                            <p className="text-[11px] text-slate-500">
                              Upload once to quickly apply the same photo across all {previewCombos.length} variants.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all">
                            <Upload className="h-3.5 w-3.5" />
                            <span>1st image for All</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleBulkUploadToAll("primary", file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all">
                            <Upload className="h-3.5 w-3.5 text-slate-400" />
                            <span>2nd image (All)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleBulkUploadToAll("secondary", file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {previewCombos.map((combo) => {
                      const draft = draftVariants[combo.key] ?? {};
                      const isActive = draft.isActive ?? true;
                      const label = Object.entries(combo.options)
                        .map(([axis, value]) => `${axis}: ${value}`)
                        .join(" · ");
                      const setField = (field: keyof DraftVariantEdit, value: string) =>
                        setDraftVariants((prev) => ({
                          ...prev,
                          [combo.key]: { ...prev[combo.key], [field]: value },
                        }));

                      return (
                        <div
                          key={combo.key}
                          className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all ${
                            isActive ? "border-slate-200 bg-white shadow-2xs" : "border-slate-200 bg-slate-50/60 opacity-70"
                          }`}
                        >
                          {/* Header: Label and Switch */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{label}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftVariants((prev) => ({
                                  ...prev,
                                  [combo.key]: { ...prev[combo.key], isActive: !isActive },
                                }))
                              }
                              title={isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                isActive ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  isActive ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          {/* 4 Clean Columns: STOCK, SELLING PRICE, PURCHASE PRICE, DISCOUNT % */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                                STOCK
                              </label>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={draft.stock ?? ""}
                                onChange={(e) => setField("stock", e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                                SELLING PRICE
                              </label>
                              <input
                                type="number"
                                min={0}
                                placeholder="Base price"
                                value={draft.priceOverride ?? ""}
                                onChange={(e) => setField("priceOverride", e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                                PURCHASE PRICE
                              </label>
                              <input
                                type="number"
                                min={0}
                                placeholder="Base cost"
                                value={draft.purchasePriceOverride ?? ""}
                                onChange={(e) => setField("purchasePriceOverride", e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                                DISCOUNT %
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                placeholder="0"
                                value={draft.discountOverride ?? ""}
                                onChange={(e) => setField("discountOverride", e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                              />
                            </div>
                          </div>

                          {/* Dual Image Slots: 1st image (Required) & 2nd image (Optional) */}
                          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* 1st image: Empty State (Small Box) */}
                            {draft.imagePreview ? (
                              <div className="relative group/slot rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all space-y-2.5 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                                      1
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">1st image *</span>
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
                                      url: draft.imagePreview!,
                                      title: `${label} — 1st image`,
                                      subtitle: draft.imageFile?.name,
                                    })
                                  }
                                >
                                  <img
                                    src={draft.imagePreview}
                                    alt={`${label} - 1st image`}
                                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/thumb:scale-105"
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-sm pointer-events-none shadow-xs">
                                    #1
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-200">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                                      <Maximize2 className="h-3.5 w-3.5" />
                                      <span>Full Preview</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions footer */}
                                <div className="pt-0.5 flex flex-wrap items-center justify-between gap-1.5">
                                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-2xs">
                                    <Upload className="h-3 w-3 text-slate-500" />
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleVariantImageUpload(combo.key, "primary", file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  {previewCombos.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyToAllVariants(combo.key, "primary")}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition shadow-2xs cursor-pointer"
                                      title="Apply this 1st image to all options"
                                    >
                                      <Layers className="h-3 w-3" />
                                      <span>Apply to all</span>
                                    </button>
                                  )}
                                  {draft.secondaryImagePreview && (
                                    <button
                                      type="button"
                                      onClick={() => handleSwapVariantImages(combo.key)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition shadow-2xs cursor-pointer"
                                      title="Swap with 2nd image"
                                    >
                                      <ArrowLeftRight className="h-3 w-3" />
                                      Swap
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantImage(combo.key, "primary")}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/60 transition shadow-2xs ml-auto cursor-pointer"
                                    title="Remove 1st image"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-indigo-300 transition-all p-3 space-y-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700">
                                      1
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">1st image *</span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-600 bg-slate-100 border-slate-200">
                                    Required *
                                  </span>
                                </div>

                                <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-xl py-2.5 px-3 transition-all duration-200 flex items-center justify-center gap-2 group">
                                  <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Upload className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                                    Upload 1st Image *
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleVariantImageUpload(combo.key, "primary", file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            )}

                            {/* 2nd image: Empty State (Small Box) */}
                            {draft.secondaryImagePreview ? (
                              <div className="relative group/slot rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all space-y-2.5 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
                                      2
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">2nd image</span>
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
                                      url: draft.secondaryImagePreview!,
                                      title: `${label} — 2nd image`,
                                      subtitle: draft.secondaryImageFile?.name,
                                    })
                                  }
                                >
                                  <img
                                    src={draft.secondaryImagePreview}
                                    alt={`${label} - 2nd image`}
                                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/thumb:scale-105"
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-sm pointer-events-none shadow-xs">
                                    #2
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-200">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                                      <Maximize2 className="h-3.5 w-3.5" />
                                      <span>Full Preview</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions footer */}
                                <div className="pt-0.5 flex flex-wrap items-center justify-between gap-1.5">
                                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-2xs">
                                    <Upload className="h-3 w-3 text-slate-500" />
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleVariantImageUpload(combo.key, "secondary", file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  {previewCombos.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyToAllVariants(combo.key, "secondary")}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 transition shadow-2xs cursor-pointer"
                                      title="Apply this 2nd image to all options"
                                    >
                                      <Layers className="h-3 w-3" />
                                      <span>Apply to all</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantImage(combo.key, "secondary")}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/60 transition shadow-2xs ml-auto cursor-pointer"
                                    title="Remove 2nd image"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-indigo-300 transition-all p-3 space-y-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700">
                                      2
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">2nd image</span>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Optional
                                  </span>
                                </div>

                                <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 rounded-xl py-2.5 px-3 transition-all duration-200 flex items-center justify-center gap-2 group">
                                  <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Upload className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                                    Upload 2nd Image
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleVariantImageUpload(combo.key, "secondary", file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <p className="text-[11px] text-slate-400 pt-1">
                      Only Stock and 1st image are required per active option — Selling price/Purchase price/Discount can be left blank to fall back to base values.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Images Section (only for Single item products) */}
            {variantMode === "none" && (
              <div className="space-y-6">
                {/* PRIMARY IMAGE */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-slate-800">
                        Primary Product Image
                      </label>
                      <p className="text-xs text-slate-500">
                        Main thumbnail shown across catalog, storefront, and search
                      </p>
                    </div>
                    {formData.image && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        Image selected
                      </span>
                    )}
                  </div>

                  {imagePreview ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                      {/* Thumbnail container */}
                      <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group flex items-center justify-center shrink-0">
                        <img
                          src={imagePreview}
                          alt={formData.productName || "Product"}
                          className="w-full h-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() =>
                            setPreviewModalImage({
                              url: imagePreview,
                              title: `Primary Image — ${formData.productName || "Product"}`,
                            })
                          }
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm pointer-events-none">
                          Primary
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewModalImage({
                              url: imagePreview,
                              title: `Primary Image — ${formData.productName || "Product"}`,
                            })
                          }
                          className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                          title="View Full Size"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Controls and file info */}
                      <div className="space-y-3 flex-1 min-w-0 w-full">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Current Selection
                          </p>
                          <p className="text-sm font-bold text-slate-800 truncate mt-0.5">
                            {formData.image ? formData.image.name : formData.productName ? `${formData.productName} main image` : "Product main image"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formData.image ? `Size: ${(formData.image.size / 1024).toFixed(0)} KB (Ready to upload)` : "Image ready"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label
                            htmlFor="addProductImageUpload"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Change Image
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModalImage({
                                url: imagePreview,
                                title: `Primary Image — ${formData.productName || "Product"}`,
                              })
                            }
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                          >
                            <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                            Full View Preview
                          </button>

                          {formData.image && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, image: null }));
                                setImagePreview(null);
                                toast.success("Primary image cleared", { id: "primary-revert" });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer"
                              title="Clear image"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="addProductImageUpload"
                      className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl bg-white hover:bg-indigo-50/20 cursor-pointer transition-all text-center group"
                    >
                      <div className="p-3 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition mb-2">
                        <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-600 transition" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">
                        {variantMode === "variants" ? "Upload Custom Cover Image" : "Upload Primary Image"}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        PNG, JPG, WEBP up to 5MB
                      </span>
                    </label>
                  )}

                  <input
                    type="file"
                    id="addProductImageUpload"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                </div>

                {/* GALLERY IMAGES (Only for Single Product Mode) */}
                {variantMode === "none" && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-bold text-slate-800">
                          Gallery Images
                        </label>
                        <p className="text-xs text-slate-500">
                          Additional angles and variation views. Hover or tap to preview full size or remove.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full">
                        {formData.additionalImages.length}/5
                      </span>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {/* Uploaded Gallery Images */}
                      {additionalPreviews.map((url, i) => (
                        <div
                          key={`gallery-${i}`}
                          className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-center"
                        >
                          <img
                            src={url}
                            alt={`gallery ${i + 1}`}
                            className="w-full h-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            onClick={() =>
                              setPreviewModalImage({
                                url,
                                title: `Gallery Image #${i + 1} — ${formData.productName || "Product"}`,
                              })
                            }
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm pointer-events-none">
                            #{i + 1}
                          </div>

                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModalImage({
                                url,
                                title: `Gallery Image #${i + 1} — ${formData.productName || "Product"}`,
                              })
                            }
                            className="absolute top-2 left-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Full View Preview"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(i)}
                            className="absolute top-2 right-2 p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Remove this gallery image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add Image Slot */}
                      {formData.additionalImages.length < 5 && (
                        <label
                          htmlFor="addProductAdditionalImagesUpload"
                          className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center p-3 group"
                        >
                          <div className="p-2.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition text-slate-400 group-hover:text-indigo-600">
                            <Upload className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                            Add Image
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {5 - formData.additionalImages.length} remaining
                          </span>
                        </label>
                      )}

                      <input
                        type="file"
                        id="addProductAdditionalImagesUpload"
                        multiple
                        accept="image/*"
                        onChange={handleAdditionalImages}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category Filters */}
            {visibleCategoryAttrs.length > 0 && (
              <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Category Filters
                </p>
                {categoryFilterFields}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Product...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>

        {/* Lightbox / High-Res Image Preview Modal */}
        {previewModalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
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
                  {previewModalImage.subtitle && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{previewModalImage.subtitle}</p>
                  )}
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
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
