// src/categories/AddCategoryModal.tsx
// Modal version of the former standalone "Add Category" page — launched from the
// unified Catalog browser (Listcategory.tsx) instead of navigating away.
//
// Redesigned around a live preview: instead of a validation-tile dashboard and a
// generic photo dropzone, the right-hand panel mirrors the ACTUAL category card
// markup from Listcategory.tsx's grid (same classes, same layout) and updates as
// the admin types — answering "will this look right?" directly rather than via a
// checklist. Field validation itself is unchanged (same rules, same API call).

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import { compressImage } from "../utils/compressImage";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Tag,
  FolderTree,
  ChevronRight,
  Eye,
  Maximize2,
  Camera,
  CheckCircle,
  SlidersHorizontal,
} from "lucide-react";

interface ValidationField {
  isValid: boolean;
  message: string;
}

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  image: File | null;
  showFilters: boolean;
}

interface CategoryValidation {
  code: ValidationField;
  name: ValidationField;
  description: ValidationField;
  image: ValidationField;
}

const EMPTY_FORM: CategoryFormData = { code: "", name: "", description: "", image: null, showFilters: true };
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

const FieldError = ({ show, message }: { show: boolean; message: string }) =>
  show ? (
    <div className="flex items-center gap-1.5 mt-1.5">
      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
      <span className="text-xs text-amber-600">{message}</span>
    </div>
  ) : null;

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Drill-down context from Listcategory.tsx's "Add Subcategory" button — absent means a top-level category. */
  parentId?: string;
  parentName?: string;
  /** Full ancestor chain from root down to the immediate parent (e.g. ["Men", "Churidar"]),
   * for the breadcrumb shown in the header. Falls back to [parentName] when omitted. */
  parentPath?: string[];
  /** Called after a successful create — use it to close the modal and refresh the list. */
  onSuccess: () => void;
}

export default function AddCategoryModal({ isOpen, onClose, parentId, parentName, parentPath, onSuccess }: AddCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validation, setValidation] = useState<CategoryValidation>(() => ({
    code: {
      isValid: Boolean(parentId),
      message: "Letters, numbers & hyphens (max 15)",
    },
    name: { isValid: false, message: "Category name (max 60 chars)" },
    description: { isValid: false, message: "Minimum 10 characters" },
    image: {
      isValid: Boolean(parentId),
      message: parentId ? "Optional for subcategories" : "Image required",
    },
  }));

  // Reset form whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM);
      setImagePreview(null);
      setLightboxImage(null);
      setTouched({});
    }
  }, [isOpen]);

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

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Real-time validation
  useEffect(() => {
    const { code, name, description, image } = formData;

    setValidation({
      code: {
        // Subcategories never show a code badge to customers (see the removed Code
        // field below and the matching Edit-subcategory modal) — the backend generates
        // one silently, so there's nothing to validate here for a subcategory.
        isValid: Boolean(parentId) || (/^[a-zA-Z0-9_-]+$/.test(code) && code.length > 0 && code.length <= 15),
        message:
          code.length > 15
            ? "Max 15 characters allowed"
            : code.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(code)
              ? "Letters, numbers & hyphens only"
              : "Category code is required",
      },
      name: {
        isValid: /^[a-zA-Z0-9\s&'-]+$/.test(name) && name.length > 0 && name.length <= 60,
        message:
          name.length > 60
            ? "Max 60 characters allowed"
            : name.length > 0 && !/^[a-zA-Z0-9\s&'-]+$/.test(name)
              ? "Letters, numbers & spaces allowed"
              : "Category name is required",
      },
      description: {
        isValid: description.length >= 10,
        message: `Minimum 10 characters (${description.length}/10)`,
      },
      image: {
        // Optional for subcategories — a top-level category needs a representative
        // image for the storefront grid, but a subcategory often inherits its parent's
        // visual context and shouldn't be blocked on uploading one.
        isValid: Boolean(parentId) || image !== null,
        message: parentId ? "Optional for subcategories" : "Image required",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, parentId]);

  if (!isOpen) return null;

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    if (name === "image") {
      const file = files?.[0];
      if (!file) return;

      const compressed = await compressImage(file);
      if (compressed.size > MAX_IMAGE_SIZE) {
        toast.dismiss();
        toast.error("Image size must be less than 1 MB.");
        setFormData((prev) => ({ ...prev, image: null }));
        setImagePreview(null);
        const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
        if (input) input.value = "";
        return;
      }

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      const url = URL.createObjectURL(compressed);
      setFormData((prev) => ({ ...prev, image: compressed }));
      setImagePreview(url);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFormData(EMPTY_FORM);
    setImagePreview(null);
    setLightboxImage(null);
    setTouched({});
    const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allValid = Object.values(validation).every((v) => v.isValid);
    if (!allValid) {
      setTouched({ code: true, name: true, description: true, image: true });
      toast.dismiss();
      toast.error("Please fill all the required fields.");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      // Subcategories don't collect a code at all — the backend generates one silently.
      if (!parentId) data.append("code", formData.code);
      data.append("name", formData.name);
      data.append("description", formData.description);
      if (formData.image) data.append("image", formData.image);
      data.append("showFilters", String(formData.showFilters));
      // FormData.append('parentId', undefined) would stringify to the literal "undefined" —
      // only append it at all when a parent context actually exists; the backend
      // defaults to top-level (null) when the field is absent.
      if (parentId) data.append("parentId", parentId);

      const res = await api.post("/category/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.dismiss();
      toast.success(res.data.message || "Category added successfully!");
      onSuccess();
    } catch (err) {
      const _e = err as any;
      toast.dismiss();
      toast.error(
        _e.response?.data?.message ||
          _e.response?.data?.error ||
          "Category creation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Full breadcrumb of the category this will live under, ending with the name being
  // typed right now — makes the resulting hierarchy obvious at a glance, especially a
  // few levels deep, instead of a "under X" sentence that only names the immediate parent.
  const ancestorPath = parentId ? (parentPath?.length ? parentPath : [parentName ?? "Selected category"]) : [];
  // Tailwind's scanner needs full literal class strings, not `focus:ring-${accent}-200` —
  // so this is a plain ternary of two complete strings, not string interpolation.
  const focusClasses = parentId
    ? "border-slate-200 focus:ring-indigo-200 focus:border-indigo-400"
    : "border-slate-200 focus:ring-slate-300 focus:border-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div
        className={`bg-white rounded-3xl shadow-2xl border w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          parentId ? "border-indigo-100" : "border-slate-100"
        }`}
      >
        {/* Accent bar — the quickest visual cue for which mode this is */}
        <div className={`h-1.5 shrink-0 ${parentId ? "bg-gradient-to-r from-indigo-500 to-indigo-600" : "bg-gradient-to-r from-slate-900 to-slate-700"}`} />

        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b shrink-0 ${
            parentId ? "bg-indigo-50/40 border-indigo-100" : "border-slate-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${parentId ? "bg-indigo-100" : "bg-slate-900"}`}>
              {parentId ? (
                <FolderTree className="h-5 w-5 text-indigo-600" />
              ) : (
                <Tag className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-950">
                  {parentId ? "Add Subcategory" : "Add New Category"}
                </h2>
                {parentId && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">
                    Subcategory
                  </span>
                )}
              </div>
              {parentId ? (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {ancestorPath.map((seg, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-medium">
                        {seg}
                      </span>
                    </React.Fragment>
                  ))}
                  <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold border border-dashed border-indigo-300">
                    {formData.name || "New subcategory"}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Create a new product category for your catalogue</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* LEFT — compact fields, no card chrome, nothing between the admin and the form */}
              <div className="min-w-0 px-6 md:px-8 py-6 space-y-6 lg:border-r border-slate-100">
                {/* Name */}
                <div>
                  <label htmlFor="addCategoryName" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {parentId ? "Subcategory name" : "Category name"}
                  </label>
                  <input
                    id="addCategoryName"
                    type="text"
                    name="name"
                    maxLength={60}
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => markTouched("name")}
                    placeholder="Sarees"
                    className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      touched.name && !validation.name.isValid
                        ? "border-amber-300 focus:ring-amber-200"
                        : focusClasses
                    }`}
                  />
                  <FieldError show={touched.name && !validation.name.isValid} message={validation.name.message} />
                </div>

                {/* Code — root categories only. A subcategory is never shown to
                    customers as its own tile (see the compact card style in
                    Listcategory.tsx), so its code is just internal bookkeeping the
                    backend generates silently — same as the Edit-subcategory modal. */}
                {!parentId && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="addCategoryCode" className="block text-sm font-semibold text-slate-800">
                        Category code
                      </label>
                      <span className="text-xs text-slate-400">{formData.code.length}/15</span>
                    </div>
                    <input
                      id="addCategoryCode"
                      type="text"
                      name="code"
                      maxLength={15}
                      value={formData.code}
                      onChange={handleChange}
                      onBlur={() => markTouched("code")}
                      placeholder="CAT001"
                      className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 font-mono uppercase focus:outline-none focus:ring-2 transition-all duration-200 ${
                        touched.code && !validation.code.isValid
                          ? "border-amber-300 focus:ring-amber-200"
                          : focusClasses
                      }`}
                    />
                    <FieldError show={touched.code && !validation.code.isValid} message={validation.code.message} />
                    <p className="text-xs text-slate-400 mt-1.5">Shown on the card badge in the preview →</p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label htmlFor="addCategoryDescription" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="addCategoryDescription"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={() => markTouched("description")}
                    rows={4}
                    placeholder="Describe this category in detail..."
                    className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                      touched.description && !validation.description.isValid
                        ? "border-amber-300 focus:ring-amber-200"
                        : focusClasses
                    }`}
                  />
                  <FieldError
                    show={touched.description && !validation.description.isValid}
                    message={validation.description.message}
                  />
                </div>

                {/* Image — root categories only, same reasoning as Code above. */}
                {!parentId && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="block text-sm font-semibold text-slate-800">Category image</label>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-500">
                        Required
                      </span>
                    </div>
                    <label
                      htmlFor="addCategoryImageUpload"
                      className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/30 hover:bg-slate-50/60 cursor-pointer transition-all duration-200 min-w-0"
                    >
                      <Upload className="h-8 w-8 text-slate-400 mb-2 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 text-center max-w-full truncate px-4 block">
                        {formData.image ? formData.image.name : "Click to upload category image"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        PNG, JPG, WEBP up to 1MB
                      </span>
                    </label>
                    {formData.image && (
                      <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs min-w-0">
                        <span className="text-emerald-700 font-medium truncate mr-2" title={formData.image.name}>
                          Selected: {formData.image.name} ({(formData.image.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreview) URL.revokeObjectURL(imagePreview);
                            setFormData((prev) => ({ ...prev, image: null }));
                            setImagePreview(null);
                            const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
                            if (input) input.value = "";
                          }}
                          className="text-rose-600 hover:text-rose-700 font-bold shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <input
                      type="file"
                      id="addCategoryImageUpload"
                      name="image"
                      onChange={handleChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <FieldError show={touched.image && !validation.image.isValid} message={validation.image.message} />
                  </div>
                )}

                {/* Storefront Filters Setting */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <label
                      onClick={() => setFormData((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
                      className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                      Storefront Product Filters
                    </label>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Enable sidebar filters (ratings, price range & attributes) on this category's storefront page.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.showFilters}
                    onClick={() => setFormData((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.showFilters ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.showFilters ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* RIGHT — live preview, mirrors the real card markup from Listcategory.tsx */}
              <div className={`w-full lg:w-[360px] shrink-0 px-6 md:px-8 py-6 ${parentId ? "bg-indigo-50/20" : "bg-slate-50/60"}`}>
                <div className="lg:sticky lg:top-0 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    Live preview
                  </div>
                  <p className="text-xs text-slate-400 -mt-2">Exactly how this will look in the catalog browser.</p>

                  {/* ── Mirrors the real category card in Listcategory.tsx — a
                      subcategory gets the compact indigo "Subcategory" header (no
                      image, no code), a root category keeps the full image + code
                      showcase. ── */}
                  <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/30 shadow-lg overflow-hidden">
                    {parentId ? (
                      <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wide">
                          <Tag className="h-3 w-3" />
                          Subcategory
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 group">
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setLightboxImage(imagePreview)}
                              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-105"
                              title="Full View"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                            <div className="p-3 rounded-full bg-slate-200/50">
                              <ImageIcon className="h-7 w-7 text-slate-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-500">No image</span>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3">
                          <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-xs font-semibold">
                            CODE: {formData.code || "—"}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="mb-2 flex justify-between items-start gap-2">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {formData.name || (parentId ? "New Subcategory" : "New Category")}
                        </h3>
                        <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-emerald-700">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {formData.description || "No description available."}
                      </p>
                    </div>
                  </div>

                  {parentId && (
                    <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                      <FolderTree className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700">
                        Nests under <strong>{ancestorPath[ancestorPath.length - 1]}</strong>. It'll appear as a folder
                        card there until it holds a product or subcategory of its own.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-4 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-medium hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ${
                parentId
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700"
                  : "bg-gradient-to-r from-slate-900 to-slate-800"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {parentId ? "Creating Subcategory..." : "Creating Category..."}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {parentId ? "Create Subcategory" : "Create Category"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox Modal for Full View */}
      {lightboxImage && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/50">
              <div className="flex items-center gap-2 text-white">
                <ImageIcon className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-bold truncate">Category Image — Full View</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/40 min-h-[300px]">
              <img
                src={lightboxImage}
                alt="Category full view"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg select-none"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
