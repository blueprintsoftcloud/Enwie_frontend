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
  Sparkles,
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
    <div className="flex items-center gap-1.5 mt-1.5 animate-fadeIn">
      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
      <span className="text-xs font-semibold text-rose-600">{message}</span>
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
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validation, setValidation] = useState<CategoryValidation>(() => ({
    code: {
      isValid: Boolean(parentId),
      message: "Category code is required",
    },
    name: { isValid: false, message: parentId ? "Subcategory name is required" : "Category name is required" },
    description: { isValid: false, message: "Description is required (min 10 chars)" },
    image: {
      isValid: Boolean(parentId),
      message: parentId ? "Optional for subcategories" : "Category image is required",
    },
  }));

  // Reset form whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM);
      setImagePreview(null);
      setLightboxImage(null);
      setTouched({});
      setServerErrors({});
      setSubmitAttempted(false);
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
        isValid: description.length >= 10 && description.length <= 1000,
        message:
          description.length > 1000
            ? "Description cannot exceed 1000 characters"
            : description.length > 0 && description.length < 10
              ? "Description must be at least 10 characters"
              : "Description is required (min 10 chars)",
      },
      image: {
        isValid: Boolean(parentId) || Boolean(image),
        message: parentId
          ? "Optional for subcategories"
          : !image
            ? "Category image is required"
            : image.size > MAX_IMAGE_SIZE
              ? "Image must be less than 1MB"
              : "Valid image selected",
      },
    });
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
        toast.error(`Image must be under 1MB even after compression (${(compressed.size / 1024 / 1024).toFixed(2)} MB)`);
        const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
        if (input) input.value = "";
        return;
      }

      setFormData((prev) => ({ ...prev, image: compressed }));
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
      setTouched((prev) => ({ ...prev, image: true }));
      if (serverErrors.image) {
        setServerErrors((prev) => {
          const next = { ...prev };
          delete next.image;
          return next;
        });
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (serverErrors[name]) {
        setServerErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    }
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setLightboxImage(null);
    setTouched({});
    setServerErrors({});
    setSubmitAttempted(false);
    const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
    const input = document.getElementById("addCategoryImageUpload") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const focusFirstInvalidField = (errs?: Record<string, string>) => {
    setTimeout(() => {
      if (errs?.name || !validation.name.isValid) {
        document.getElementById("addCategoryName")?.focus();
      } else if (!parentId && (errs?.code || !validation.code.isValid)) {
        document.getElementById("addCategoryCode")?.focus();
      } else if (errs?.description || !validation.description.isValid) {
        document.getElementById("addCategoryDescription")?.focus();
      } else if (!parentId && (errs?.image || !validation.image.isValid)) {
        document.getElementById("addCategoryImageUpload")?.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const allValid = Object.values(validation).every((v) => v.isValid);
    if (!allValid) {
      setTouched({ code: true, name: true, description: true, image: true });
      focusFirstInvalidField();
      toast.dismiss();

      let errorMsg = "Please correct the highlighted field(s).";
      if (!validation.name.isValid) {
        errorMsg = validation.name.message;
      } else if (!parentId && !validation.code.isValid) {
        errorMsg = validation.code.message;
      } else if (!validation.description.isValid) {
        errorMsg = validation.description.message;
      } else if (!parentId && !validation.image.isValid) {
        errorMsg = validation.image.message;
      }

      toast.error(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setServerErrors({});

      const data = new FormData();
      if (!parentId) data.append("code", formData.code.trim().toUpperCase());
      data.append("name", formData.name.trim());
      data.append("description", formData.description.trim());
      if (formData.image) data.append("image", formData.image);
      data.append("showFilters", String(formData.showFilters));
      if (parentId) data.append("parentId", parentId);

      const res = await api.post("/category/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.dismiss();
      toast.success(res.data.message || "Category added successfully!");
      onSuccess();
    } catch (err) {
      const _e = err as any;
      const backendErrors = _e.response?.data?.errors;
      const firstError = backendErrors ? (Object.values(backendErrors).flat()[0] as string) : undefined;
      const rawMsg =
        firstError ||
        _e.response?.data?.message ||
        _e.response?.data?.error ||
        "Category creation failed. Please try again.";

      const newServerErrors: Record<string, string> = {};
      const lower = rawMsg.toLowerCase();
      if (lower.includes("code") || (lower.includes("unique") && lower.includes("code"))) {
        newServerErrors.code = rawMsg;
      } else if (lower.includes("name") || lower.includes("slug")) {
        newServerErrors.name = rawMsg;
      } else if (lower.includes("description")) {
        newServerErrors.description = rawMsg;
      } else if (lower.includes("image")) {
        newServerErrors.image = rawMsg;
      }

      setServerErrors(newServerErrors);
      setTouched({ code: true, name: true, description: true, image: true });
      focusFirstInvalidField(newServerErrors);
      toast.dismiss();
      toast.error(rawMsg);
    } finally {
      setLoading(false);
    }
  };

  const ancestorPath = parentId ? (parentPath?.length ? parentPath : [parentName ?? "Selected category"]) : [];

  const focusClasses = parentId
    ? "border-slate-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 hover:border-slate-300"
    : "border-slate-200 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 hover:border-slate-300";

  const isNameInvalid = ((submitAttempted || touched.name) && !validation.name.isValid) || Boolean(serverErrors.name);
  const isCodeInvalid = !parentId && (((submitAttempted || touched.code) && !validation.code.isValid) || Boolean(serverErrors.code));
  const isDescInvalid = ((submitAttempted || touched.description) && !validation.description.isValid) || Boolean(serverErrors.description);
  const isImageInvalid = !parentId && (((submitAttempted || touched.image) && !validation.image.isValid) || Boolean(serverErrors.image));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div
        className={`bg-white rounded-3xl shadow-2xl border w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
          parentId ? "border-indigo-100" : "border-slate-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 py-4.5 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${parentId ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-900 text-white"}`}>
              {parentId ? <FolderTree className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                  {parentId ? "Add Subcategory" : "Add New Category"}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${parentId ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-100 text-slate-600"}`}>
                  {parentId ? "Hierarchy" : "Catalogue"}
                </span>
              </div>
              {parentId ? (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                  <span>Nesting under:</span>
                  <span className="font-semibold text-indigo-600 flex items-center gap-1">
                    {ancestorPath.join(" / ")}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">Create a new product category for your store catalog</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px]">
              {/* LEFT — compact fields */}
              <div className="min-w-0 px-6 md:px-8 py-5 space-y-4 lg:border-r border-slate-100">
                {/* Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="addCategoryName" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {parentId ? "Subcategory name" : "Category name"}
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                      {formData.name.length}/60
                    </span>
                  </div>
                  <input
                    id="addCategoryName"
                    type="text"
                    name="name"
                    maxLength={60}
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => markTouched("name")}
                    placeholder="e.g. Sarees"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/40 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none transition-all duration-200 ${
                      isNameInvalid
                        ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/10 focus:ring-rose-200 focus:border-rose-500 text-slate-900"
                        : focusClasses
                    }`}
                  />
                  <FieldError
                    show={isNameInvalid}
                    message={serverErrors.name || validation.name.message}
                  />
                </div>

                {/* Code — root categories only */}
                {!parentId && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="addCategoryCode" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Category code
                        </label>
                        <span className="text-[11px] text-slate-400 font-normal">
                          (badge preview)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                        {formData.code.length}/15
                      </span>
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
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/40 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 text-sm font-mono uppercase focus:outline-none transition-all duration-200 ${
                        isCodeInvalid
                          ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/10 focus:ring-rose-200 focus:border-rose-500 text-slate-900"
                          : focusClasses
                      }`}
                    />
                    <FieldError
                      show={isCodeInvalid}
                      message={serverErrors.code || validation.code.message}
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="addCategoryDescription" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Description
                    </label>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${formData.description.length > 1000 ? "bg-rose-50 text-rose-500 font-bold" : "bg-slate-100 text-slate-500"}`}>
                      {formData.description.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="addCategoryDescription"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={() => markTouched("description")}
                    rows={3}
                    placeholder="Describe this category in detail..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/40 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none transition-all duration-200 resize-none ${
                      isDescInvalid
                        ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/10 focus:ring-rose-200 focus:border-rose-500 text-slate-900"
                        : focusClasses
                    }`}
                  />
                  <FieldError
                    show={isDescInvalid}
                    message={serverErrors.description || validation.description.message}
                  />
                </div>

                {/* Image — root categories only */}
                {!parentId && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Category image</label>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-500 border border-rose-100">
                        Required
                      </span>
                    </div>

                    {!formData.image ? (
                      <label
                        htmlFor="addCategoryImageUpload"
                        className={`flex flex-col items-center justify-center w-full p-4.5 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 min-w-0 group ${
                          isImageInvalid
                            ? "border-rose-400 bg-rose-50/30 text-rose-600"
                            : "border-slate-200 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs mb-2 group-hover:scale-105 transition-transform">
                          <Upload className={`h-5 w-5 ${isImageInvalid ? "text-rose-400" : "text-slate-500"}`} />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            Click to upload category image
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            PNG, JPG, WEBP up to 1MB
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 group">
                          {imagePreview ? (
                            <>
                              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setLightboxImage(imagePreview)}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                title="Full View"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800 truncate" title={formData.image.name}>
                              {formData.image.name}
                            </p>
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Ready
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {(formData.image.size / 1024 / 1024).toFixed(2)} MB • Compressed
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <label
                            htmlFor="addCategoryImageUpload"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Change
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <FieldError
                      show={isImageInvalid}
                      message={serverErrors.image || validation.image.message}
                    />

                    <input
                      type="file"
                      id="addCategoryImageUpload"
                      name="image"
                      onChange={handleChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                )}

                {/* Storefront Filters Setting */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/70 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <label
                      onClick={() => setFormData((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
                      className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
                      Storefront Product Filters
                    </label>
                    <p className="text-[11.5px] text-slate-500 leading-normal">
                      Enable sidebar filters (ratings, price range & attributes) on this category's storefront page.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.showFilters}
                    onClick={() => setFormData((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.showFilters ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formData.showFilters ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* RIGHT — live preview */}
              <div className={`w-full lg:w-[370px] shrink-0 p-6 md:p-7 flex flex-col justify-between ${parentId ? "bg-indigo-50/25" : "bg-slate-50/60"}`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Preview</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Card Mockup</span>
                  </div>
                  <p className="text-xs text-slate-500 -mt-2">
                    Exactly how shoppers will discover this category in your catalog.
                  </p>

                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden transition-all duration-300">
                    {parentId ? (
                      <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wide">
                          <Tag className="h-3 w-3" />
                          Subcategory
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-44 w-full overflow-hidden bg-slate-100 group">
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                            <div className="p-3.5 rounded-2xl bg-white shadow-xs border border-slate-200/60">
                              <ImageIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-400">Card cover preview</span>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3">
                          <div className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[11px] font-mono font-semibold tracking-wider border border-white/10 shadow-sm">
                            CODE: {formData.code || "—"}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4.5">
                      <div className="mb-2 flex justify-between items-start gap-2">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                          {formData.name || (parentId ? "New Subcategory" : "New Category")}
                        </h3>
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {formData.description || "No description provided yet."}
                      </p>
                    </div>
                  </div>

                  {parentId && (
                    <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                      <FolderTree className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700 leading-relaxed">
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
          <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-xs uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 ${
                parentId
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-200"
                  : "bg-slate-900 hover:bg-slate-800 shadow-slate-300"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {parentId ? "Creating Subcategory..." : "Creating Category..."}
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
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
