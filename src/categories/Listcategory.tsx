import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  Pencil,
  Trash2,
  Search,
  X,
  Image as ImageIcon,
  Layers,
  Filter,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Tag,
  FolderOpen,
  Folder,
  FolderTree,
  Home,
  ChevronRight,
  MoreVertical,
  Package,
  Eye,
  Maximize2,
  Camera,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import { normalizeCategory, nodeStateOf, CatalogNodeState } from "../utils/category";
import { compressImage } from "../utils/compressImage";
import Listproducts from "../products/Listproducts";
import CategoryAttributesModal from "./CategoryAttributesModal";
import AddCategoryModal from "./AddCategoryModal";
import AddProductModal from "../products/AddProductModal";

interface ListCategory {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  showFilters?: boolean;
  createdAt?: string;
  parentId?: string | null;
  directProductCount?: number;
  directSubcategoryCount?: number;
}

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  image: File | null;
  showFilters: boolean;
}

// Enhanced Loader Component
const LoaderSpinner = ({
  size = "md",
  color = "slate",
}: {
  size?: "sm" | "md" | "lg";
  color?: "slate" | "white" | "emerald";
}) => {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const colors = {
    slate: "text-slate-600",
    white: "text-white",
    emerald: "text-emerald-500",
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${colors[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

// Premium Card Skeleton Loader
const CategoryCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm animate-pulse">
    {/* Image Skeleton */}
    <div className="relative h-44 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
      <div className="absolute bottom-3 left-3 h-6 w-24 rounded-lg bg-slate-300/80" />
    </div>

    {/* Content Skeleton */}
    <div className="p-5 space-y-4">
      {/* Title & Status Pill */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 mr-3">
          <div className="h-5 w-3/4 rounded-md bg-slate-200" />
          <div className="h-3 w-1/3 rounded-md bg-slate-100" />
        </div>
        <div className="h-7 w-20 rounded-full bg-slate-200" />
      </div>

      {/* Description lines */}
      <div className="space-y-2 pt-1">
        <div className="h-3.5 w-full rounded-md bg-slate-100" />
        <div className="h-3.5 w-4/5 rounded-md bg-slate-100" />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="h-4 w-24 rounded-md bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-200" />
          <div className="h-9 w-9 rounded-lg bg-red-100/60" />
        </div>
      </div>
    </div>
  </div>
);

// Combines Edit + Delete into a single trigger button, matching the same dropdown
// pattern already used for product row actions (Listproducts.tsx's ActionModel) —
// one predictable "…" button instead of two separate icon buttons per card.
const CategoryActionMenu = ({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  openDirection = "up",
}: {
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Which way the dropdown opens relative to the trigger button. */
  openDirection?: "up" | "down";
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isOpen && !(event.target as HTMLElement).closest(".category-action-menu")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative category-action-menu">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Category actions"
        className="p-2 rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow transition-all duration-200"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            openDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            disabled={!canEdit}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left border-b border-slate-100 transition-colors ${
              canEdit ? "text-slate-700 hover:bg-slate-50" : "text-slate-300 cursor-not-allowed opacity-60"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            disabled={!canDelete}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${
              canDelete ? "text-rose-600 hover:bg-rose-50" : "text-slate-300 cursor-not-allowed opacity-60"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const ListCategory = () => {
  const [categories, setCategories] = useState<ListCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ListCategory[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<ListCategory | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    code: "",
    name: "",
    description: "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});

  // Drill-down folder navigation — null = root/top-level. Categories are fetched once,
  // flat, and the whole tree (children-of-X, breadcrumb, descendant counts) is built
  // client-side from `parentId` pointers, same pattern as the existing search/sort.
  // Seeded from (and kept in sync with) a `folder` URL param below, so reloading or
  // sharing a link lands back in the same nested folder instead of resetting to root.
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(() => searchParams.get("folder"));

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (currentFolderId) next.set("folder", currentFolderId);
        else next.delete("folder");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  // A category holds direct products OR subcategories, never both (enforced server-side
  // on new writes) — this decides whether the current folder shows the subcategory grid
  // or the embedded product list. "conflict" is a pre-existing category that has both
  // products and subcategories from before the rule existed; it gets a warning banner +
  // a manual toggle instead of an auto-picked view. Root always shows the subcategory
  // grid — a product's categoryId must reference a real category, so "Add Product" is
  // never valid there. Attributes are handled in their own modal (see
  // CategoryAttributesModal / attributesModalCategory below), not as a tab here.
  const [conflictTab, setConflictTab] = useState<"subcategories" | "products">("subcategories");

  // Add Category/Subcategory and Add Product now happen in modals over this browser
  // instead of navigating to a standalone page — see AddCategoryModal/AddProductModal.
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  // Which category's Attributes modal is open, if any — set from the persistent
  // breadcrumb-row button or a per-card shortcut; null means the modal is closed.
  const [attributesModalCategory, setAttributesModalCategory] = useState<{
    id: string;
    name: string;
    path: string[];
  } | null>(null);
  // Bumped after a successful product add to force the embedded Listproducts (keyed
  // on `${currentFolderId}-${productsRefreshKey}`) to remount and refetch.
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);

  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();

  const isStaff = user.role === "STAFF";
  const canAdd = !isStaff || hasPermission("CATEGORY_ADD");
  const canEdit = !isStaff || hasPermission("CATEGORY_EDIT");
  const canDelete = !isStaff || hasPermission("CATEGORY_DELETE");
  const canAddProduct = !isStaff || hasPermission("PRODUCT_ADD");

  const getCatId = (cat: ListCategory): string | undefined => cat._id ?? cat.id;

  // Direct-children count for a category (used for the "N subcategories" badge).
  const childCountOf = (categoryId: string | undefined): number =>
    categoryId ? categories.filter((c) => (c.parentId ?? null) === categoryId).length : 0;

  // Categories at this exact level (siblings of whatever's shown) — NOT categories.length,
  // which is every category in the system across every nesting depth. Comparing
  // filteredCategories (this folder's children, post-search) against that flat total made
  // "15 of 68 shown" read as most categories being hidden, when the other 53 were really
  // subcategories living under entirely different folders.
  const totalInCurrentFolder = categories.filter((c) => (c.parentId ?? null) === currentFolderId).length;

  // Every descendant category, to any depth — used for the delete-confirmation warning.
  const countDescendants = (categoryId: string | undefined): number => {
    if (!categoryId) return 0;
    const directChildren = categories.filter((c) => (c.parentId ?? null) === categoryId);
    return directChildren.reduce(
      (sum, child) => sum + 1 + countDescendants(getCatId(child)),
      0,
    );
  };

  // Breadcrumb trail from root down to the current folder, built by walking `parentId`
  // pointers up through the in-memory flat list.
  const breadcrumb: { id: string | null; name: string }[] = (() => {
    const trail: { id: string | null; name: string }[] = [{ id: null, name: "All Categories" }];
    const chain: ListCategory[] = [];
    let cursor = currentFolderId;
    while (cursor) {
      const found = categories.find((c) => getCatId(c) === cursor);
      if (!found) break;
      chain.unshift(found);
      cursor = found.parentId ?? null;
    }
    for (const cat of chain) {
      trail.push({ id: getCatId(cat) ?? null, name: cat.name });
    }
    return trail;
  })();

  const currentFolderCategory = currentFolderId
    ? categories.find((c) => getCatId(c) === currentFolderId)
    : null;

  // Prefer the subcategory count already implied by the loaded `categories` list
  // (the exact same data driving the grid below) over the server-computed
  // `directSubcategoryCount` field — this is the one number that must never disagree
  // with what's actually rendered, since it decides whether "Add Product" is even
  // offered here. `directProductCount` still has to come from the server (no products
  // are loaded at this level to count client-side).
  const nodeState: CatalogNodeState = currentFolderCategory
    ? nodeStateOf({ ...currentFolderCategory, directSubcategoryCount: childCountOf(currentFolderId) })
    : "has-subcategories";

  // Which view is actually on screen right now — auto-picked from nodeState, except
  // a "conflict" node (grandfathered legacy data) where the admin toggles manually.
  // "empty" folders keep showing the subcategory grid (its own empty-state placard
  // already offers both Add actions).
  const showProductsView =
    nodeState === "has-products" || (nodeState === "conflict" && conflictTab === "products");

  useEffect(() => {
    setConflictTab("subcategories");
  }, [currentFolderId]);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combined Search and Sort Logic
  useEffect(() => {
    // Scope to the current folder — search/sort operate within it, matching the
    // drill-down "folder" mental model rather than searching the whole tree.
    let results = categories.filter((c) => (c.parentId ?? null) === currentFolderId);

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(
        (cat) =>
          cat.name?.toLowerCase().includes(lowerSearchTerm) ||
          String(cat.code).toLowerCase().includes(lowerSearchTerm) ||
          cat.description?.toLowerCase().includes(lowerSearchTerm),
      );
    }

    // Disable scrolling when any modal is open

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "code":
          // Assuming code might be numeric, if not, treat as string comparison
          return (a.code || "")
            .toString()
            .localeCompare((b.code || "").toString());
        case "recent":
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        default:
          return 0;
      }
    });

    setFilteredCategories(results);
  }, [searchTerm, categories, sortBy, currentFolderId]);

  useBodyScrollLock(showEditModal || showDeleteModal || showDetailModal);

  // `silent` skips the isLoading flip so callers that already know the shape of the
  // result (e.g. a status toggle applied optimistically) can reconcile with the server
  // in the background without swapping the whole grid out for skeletons.
  const fetchCategories = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // **COOKIE AUTH: Added withCredentials**
      const res = await api.get("/category/list", {
        // withCredentials: true,
      });
      const list = (res.data.list || []).map(normalizeCategory);
      setCategories(list);
    } catch (err) {
      const _e = err as any;
      console.error("Error fetching categories:", err);
      toast.error("Error loading categories");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleToggleStatus = async (category: ListCategory) => {
    const categoryId = category._id ?? category.id;
    if (!categoryId) return;
    const newStatus = category.isActive === false ? true : false;

    // Optimistic update — flip the switch immediately instead of waiting on the round
    // trip, and avoid the full-grid skeleton flicker a non-silent fetchCategories would
    // otherwise cause on every toggle.
    setCategories((prev) =>
      prev.map((c) => (getCatId(c) === categoryId ? { ...c, isActive: newStatus } : c)),
    );
    if (selectedCategory && getCatId(selectedCategory) === categoryId) {
      setSelectedCategory((prev) => prev ? { ...prev, isActive: newStatus } : null);
    }

    try {
      const res = await api.patch(`/category/${categoryId}/status`, { isActive: newStatus });
      toast.success(res.data.message || "Category status updated successfully!");
      fetchCategories(true);
    } catch (err: any) {
      // Roll back the optimistic update on failure
      setCategories((prev) =>
        prev.map((c) => (getCatId(c) === categoryId ? { ...c, isActive: category.isActive } : c)),
      );
      if (selectedCategory && getCatId(selectedCategory) === categoryId) {
        setSelectedCategory((prev) => prev ? { ...prev, isActive: category.isActive } : null);
      }
      toast.error(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDesc((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleEditClick = (category: ListCategory) => {
    setSelectedCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description ?? "",
      image: null,
      showFilters: category.showFilters !== false,
    });
    // Set preview to the existing image URL
    setImagePreview(category.image || "");
    setShowEditModal(true);
  };

  const handleToggleFilters = async (category: ListCategory, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const categoryId = category._id ?? category.id;
    if (!categoryId) return;
    const currentVal = category.showFilters !== false;
    const nextVal = !currentVal;

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => ((c._id ?? c.id) === categoryId ? { ...c, showFilters: nextVal } : c))
    );
    if (selectedCategory && (selectedCategory._id ?? selectedCategory.id) === categoryId) {
      setSelectedCategory((prev) => (prev ? { ...prev, showFilters: nextVal } : null));
    }

    try {
      await api.patch(`/category/${categoryId}/filters-toggle`, { showFilters: nextVal });
      toast.success(`Storefront filters ${nextVal ? "enabled" : "disabled"} for "${category.name}"`);
    } catch (err: any) {
      // Revert on error
      setCategories((prev) =>
        prev.map((c) => ((c._id ?? c.id) === categoryId ? { ...c, showFilters: currentVal } : c))
      );
      toast.error(err?.response?.data?.message || "Failed to toggle filter status");
    }
  };

  const handleDeleteClick = (category: ListCategory) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleViewClick = (category: ListCategory) => {
    setSelectedCategory(category);
    setShowDetailModal(true);
  };

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    if (name === "image") {
      const file = files?.[0];
      if (file) {
        // Revoke old URL to prevent memory leaks if switching images
        if (imagePreview && imagePreview.startsWith("blob:")) {
          URL.revokeObjectURL(imagePreview);
        }
        const compressed = await compressImage(file);
        if (compressed.size > 1024 * 1024) {
          toast.dismiss();
          toast.error("Image size must be less than 1 MB.");
          const input = document.getElementById("updateImage") as HTMLInputElement | null;
          if (input) input.value = "";
          return;
        }
        setFormData((prev) => ({ ...prev, image: compressed }));
        const previewUrl = URL.createObjectURL(compressed);
        setImagePreview(previewUrl);
      } else {
        // If file input is cleared but we had a file selected
        setImagePreview(selectedCategory?.image || "");
        setFormData((prev) => ({ ...prev, image: null }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRevertImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(selectedCategory?.image || "");
    const input = document.getElementById("updateImage") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) return;
    const categoryId = selectedCategory._id ?? selectedCategory.id;
    if (!categoryId) {
      toast.error("Missing category id for update.");
      return;
    }

    if (!formData.code.trim()) {
      toast.error("Category code is required.", { id: "cat-edit-validate" });
      return;
    }
    if (formData.name.trim().length < 3) {
      toast.error("Category name must be at least 3 characters.", {
        id: "cat-edit-validate",
      });
      return;
    }
    if (
      formData.description.trim().length > 0 &&
      formData.description.trim().length < 10
    ) {
      toast.error("Description must be at least 10 characters.", {
        id: "cat-edit-validate",
      });
      return;
    }

    // 🔍 CHECK: no changes made
    const noTextChange =
      formData.code === selectedCategory.code &&
      formData.name === selectedCategory.name &&
      formData.description === selectedCategory.description &&
      formData.showFilters === (selectedCategory.showFilters !== false);

    const noImageChange = !formData.image; // no new image selected

    if (noTextChange && noImageChange) {
      toast("No changes detected. Please update the category.", {
        icon: "⚠️",
        id: "no-category-change",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const data = new FormData();
      data.append("code", formData.code);
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("showFilters", String(formData.showFilters));

      if (formData.image) {
        data.append("image", formData.image);
      }

      const res = await api.put(`/category/update/${categoryId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || "Category updated successfully!", {
        id: "category-updated",
      });

      closeEditModal();
      fetchCategories();
    } catch (err) {
      const _e = err as any;
      toast.error(_e.response?.data?.message || "Error updating category", {
        id: "category-update-error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (!selectedCategory) return;
      const categoryId = selectedCategory._id ?? selectedCategory.id;
      if (!categoryId) {
        toast.error("Missing category id for delete.");
        return;
      }
      await api.delete(`/category/delete/${categoryId}`, {
        // withCredentials: true,
      });
      closeDeleteModal();
      fetchCategories();
      toast.success("Category deleted successfully!");
    } catch (err) {
      const _e = err as any;
      // 409 = server blocked deletion due to open orders — show the exact reason
      const msg = _e?.response?.data?.message || "Error deleting category";
      toast.error(msg, { duration: 6000 });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to close and reset state for Edit Modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setLightboxImage(null);
    // Cleanup blob URL if one was created
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedCategory(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      image: null,
    });
    setImagePreview("");
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCategory(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedCategory(null);
  };

  const btnClick = () => setShowAddCategoryModal(true);

  const addProductClick = () => {
    if (!currentFolderId) return; // never valid at root — no button reaches this
    setShowAddProductModal(true);
  };

  // Which "Add" action(s) make sense here, driven by the exclusivity rule: an empty
  // folder can go either way, a folder that already committed to one path only offers
  // that path, and root can only ever hold subcategories.
  const showAddSubcategory = nodeState === "has-subcategories" || nodeState === "empty";
  const showAddProduct = Boolean(currentFolderId) && (nodeState === "empty" || nodeState === "has-products");

  const AddButtons = ({ fullWidthOnMobile = false }: { fullWidthOnMobile?: boolean }) => (
    <div className={`flex items-center gap-2 ${fullWidthOnMobile ? "w-full md:w-auto flex-col sm:flex-row" : ""}`}>
      {showAddSubcategory && (
        <button
          onClick={canAdd ? btnClick : undefined}
          disabled={!canAdd}
          title={!canAdd ? "You don't have permission to add categories" : undefined}
          className={`${fullWidthOnMobile ? "w-full sm:w-auto" : ""} inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            canAdd
              ? "cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:shadow-lg"
              : "cursor-not-allowed bg-slate-300 text-slate-500 opacity-60"
          }`}
        >
          {currentFolderId ? "Add Subcategory" : "Add Category"}
        </button>
      )}
      {showAddProduct && (
        <button
          onClick={canAddProduct ? addProductClick : undefined}
          disabled={!canAddProduct}
          title={!canAddProduct ? "You don't have permission to add products" : undefined}
          className={`${fullWidthOnMobile ? "w-full sm:w-auto" : ""} inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
            canAddProduct
              ? "cursor-pointer border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60"
          }`}
        >
          Add Product
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-8 w-full font-sans">
    {/* Premium Dashboard Header Section */}
    <div className="w-full mx-auto">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200">
            {/* Title & Description */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                {/* <div className="p-2 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg">
                  <Layers className="h-6 w-6 text-white" />
                </div> */}
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-950">
                  Category Management
                </h1>
              </div>
              <p className="text-slate-600 max-w-2xl mt-2">
                Organize and manage your product categories.
              </p>
            </div>

            {/* Stats Card - Always visible, responsive layout */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 shadow-lg border border-slate-100 flex-1 lg:flex-none">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <span className="text-lg font-bold text-white">
                        {filteredCategories.filter((c) => c.isActive !== false).length}
                      </span>
                    </div>
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center">
                      <TrendingUp className="h-2.5 w-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Active Categories
                    </p>
                    <p className="text-xs text-slate-500">
                      Out of {totalInCurrentFolder} total
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb — drill-down folder navigation */}
        <div className="mb-6 flex items-center flex-wrap gap-1.5 text-sm">
          {breadcrumb.map((crumb, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <React.Fragment key={crumb.id ?? "root"}>
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  disabled={isLast}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    isLast
                      ? "text-slate-900 cursor-default"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  }`}
                >
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}

          {/* Persistent Attributes entry point for the current folder — shown for any
              leaf-like node (empty / has-products / conflict), since only such a node can
              ever hold attributes under the product/subcategory exclusivity rule. */}
          {canEdit && currentFolderId && nodeState !== "has-subcategories" && (
            <button
              type="button"
              onClick={() =>
                setAttributesModalCategory({
                  id: currentFolderId,
                  name: currentFolderCategory?.name ?? "",
                  path: breadcrumb.slice(1).map((b) => b.name),
                })
              }
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/60 text-xs font-medium text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              Filters
            </button>
          )}
        </div>

        {/* Conflict warning — a legacy category that already holds both direct products
            and subcategories from before the exclusivity rule existed. Not blocked, just
            flagged, with a manual toggle since the view can't be auto-picked here.
            Attributes are reached via the persistent breadcrumb-row button above, which
            opens the modal — no longer a third tab state here. */}
        {nodeState === "conflict" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  This category has both direct products and subcategories
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  That's no longer allowed for new items, but this existing setup is preserved as-is.
                  Resolve it by moving the products elsewhere or removing the subcategories.
                </p>
                <div className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setConflictTab("subcategories")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      conflictTab === "subcategories" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-50"
                    }`}
                  >
                    Subcategories ({childCountOf(currentFolderId)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictTab("products")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      conflictTab === "products" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-50"
                    }`}
                  >
                    Products ({currentFolderCategory?.directProductCount ?? 0})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Control Panel - Responsive grid for search, sort, and actions.
            Hidden entirely when viewing products at a leaf node — the embedded
            Listproducts below has its own toolbar (its "Add Product" sits right next to
            its Refresh button), so this panel would otherwise just be a second,
            redundant Add button. */}
        {!showProductsView && (
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-4 md:p-6">
            {categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {/* Search Box */}
                <div className="relative group col-span-1 md:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="name">Sort by Name (A-Z)</option>
                    <option value="code">Sort by Code</option>
                    <option value="recent">Sort by Recent</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Stats & Export — count and the Add button are a related, grouped
                    pair, so they sit close together at the end of the row instead of
                    being pushed to opposite ends of this cell with a big empty gap. */}
                <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 flex flex-col md:flex-row items-center md:justify-end gap-3 md:gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 justify-start md:justify-center w-full md:w-auto whitespace-nowrap">
                    <span className="font-medium">
                      {filteredCategories.length}
                    </span>
                    <span className="text-slate-400">of</span>
                    <span className="font-medium">{totalInCurrentFolder}</span>
                    <span>categories shown</span>
                  </div>
                  <AddButtons fullWidthOnMobile />
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <AddButtons fullWidthOnMobile />
              </div>
            )}
          </div>
        </div>
        )}

        {/* Categories Grid - Highly responsive grid layout */}
        {!showProductsView && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            // Skeleton Loaders
            Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))
          ) : filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => {
              // A subcategory is never shown to customers as its own visual tile — it
              // only exists to narrow products down as a filter (see the Edit modal,
              // where Code/Image were dropped for the same reason) — so its card skips
              // the image/code showcase entirely in favor of a compact, filter-flavored
              // header that reads as visually distinct from a root category's card.
              const isSubcategory = Boolean(cat.parentId);
              return (
              <div
                key={cat._id ?? cat.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/30 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
              >
                {/* Edit/Delete — always visible on mobile/touch, hover-revealed on desktop */}
                <div className="absolute top-3 right-3 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-200">
                  <CategoryActionMenu
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => handleEditClick(cat)}
                    onDelete={() => handleDeleteClick(cat)}
                    openDirection="down"
                  />
                </div>

                {isSubcategory ? (
                  /* Compact subcategory header — no image, no code */
                  <div
                    className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100 cursor-pointer"
                    onClick={() => handleViewClick(cat)}
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wide">
                      <Tag className="h-3 w-3" />
                      Subcategory
                    </div>
                  </div>
                ) : (
                  /* Image */
                  <div
                    className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 cursor-pointer"
                    onClick={() => handleViewClick(cat)}
                  >
                    {cat.image ? (
                      <>
                        <div className="relative w-full h-full min-h-64 max-h-80 overflow-hidden bg-white flex items-center justify-center ">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="h-full w-auto max-w-full object-cover"
                          />
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                        <div className="p-3 rounded-full bg-slate-200/50">
                          <ImageIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          No image
                        </span>
                      </div>
                    )}

                    {/* Code Overlay */}
                    <div className="absolute bottom-3 left-3">
                      <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-white text-xs font-semibold">
                        CODE: {cat.code}
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <div className="mb-3 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1" title={cat.name}>
                        {cat.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(cat);
                      }}
                      title={cat.isActive !== false ? "Click to Disable Category" : "Click to Enable Category"}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <span className={`text-xs font-semibold ${cat.isActive !== false ? "text-emerald-700" : "text-slate-500"}`}>
                        {cat.isActive !== false ? "Active" : "Disabled"}
                      </span>
                      <div className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        cat.isActive !== false ? "bg-emerald-500" : "bg-slate-300"
                      }`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          cat.isActive !== false ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </div>
                    </button>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {cat.description || "No description available."}
                  </p>

                  {cat.description && cat.description.length > 80 && (
                    <button
                      onClick={() => handleViewClick(cat)} // ← OPEN DETAIL MODAL
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 underline mt-1"
                    >
                      Show more
                    </button>
                  )}

                  {/* Subcategory + product counts — informational only, not an action.
                      Opening the folder is the explicit "Open" button below, so these
                      don't need their own click target or arrow implying navigation.
                      A category holds one or the other (never both, except a
                      grandfathered "conflict" — see nodeStateOf), so only the relevant
                      count shows; an empty category shows both, both reading zero. */}
                  <div className="mt-3 flex items-center gap-2">
                    {nodeStateOf({
                      directSubcategoryCount: childCountOf(getCatId(cat)),
                      directProductCount: cat.directProductCount,
                    }) !== "has-products" && (
                      <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/60">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          {childCountOf(getCatId(cat)) > 0 ? (
                            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {childCountOf(getCatId(cat)) > 0
                            ? `${childCountOf(getCatId(cat))} Subcategor${childCountOf(getCatId(cat)) === 1 ? "y" : "ies"}`
                            : "No subcategories"}
                        </span>
                      </div>
                    )}

                    {nodeStateOf({
                      directSubcategoryCount: childCountOf(getCatId(cat)),
                      directProductCount: cat.directProductCount,
                    }) !== "has-subcategories" && (
                      <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/60">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <Package className={`h-3.5 w-3.5 ${(cat.directProductCount ?? 0) > 0 ? "text-emerald-500" : "text-slate-400"}`} />
                          {(cat.directProductCount ?? 0) > 0
                            ? `${cat.directProductCount} Product${cat.directProductCount === 1 ? "" : "s"}`
                            : "No products"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions — Edit/Delete now live in the hover-revealed corner menu
                      above, so this row is just the navigation/info actions. */}
                  <div className="flex items-center flex-wrap gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(getCatId(cat) ?? null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Open
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(cat);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors sm:hidden"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        Edit
                      </button>
                    )}

                    {canEdit && childCountOf(getCatId(cat)) === 0 && (
                      <button
                        onClick={() => {
                          const categoryId = getCatId(cat);
                          if (categoryId) {
                            // Open the Attributes modal directly for this card's category
                            // — no need to drill into the folder first.
                            setAttributesModalCategory({
                              id: categoryId,
                              name: cat.name,
                              path: [...breadcrumb.slice(1).map((b) => b.name), cat.name],
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/60 text-xs font-medium text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        Attributes
                      </button>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFilters(cat, e)}
                        title={cat.showFilters !== false ? "Storefront filters are active. Click to disable." : "Storefront filters are disabled. Click to enable."}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          cat.showFilters !== false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Filters: {cat.showFilters !== false ? "On" : "Off"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="col-span-full">
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 py-16 text-center">
                <div className="p-4 rounded-full bg-slate-100 mb-4">
                  <Layers className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {currentFolderId ? "This category is empty" : "No categories found"}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                  {searchTerm
                    ? `No results found for "${searchTerm}". Try different keywords.`
                    : currentFolderId
                      ? `${currentFolderCategory?.name ?? "This category"} has no subcategories or products yet. Add a subcategory to keep organizing, or add products directly here — whichever you pick first is what it'll hold.`
                      : "Start by adding your first product category to build your catalogue."}
                </p>
                {(canAdd || canAddProduct) && !searchTerm && <AddButtons />}
              </div>
            </div>
          )}
        </div>
        )}

        {showProductsView && currentFolderId && (
          <Listproducts
            embedded
            lockedCategoryId={currentFolderId}
            lockedCategoryName={currentFolderCategory?.name}
            onAddProduct={() => setShowAddProductModal(true)}
            key={`${currentFolderId}-${productsRefreshKey}`}
          />
        )}

      </div>

      {/* Toast Message */}

      {/* Edit Modal — same split-layout language as AddCategoryModal (accent bar,
          breadcrumb header, live card preview) so editing doesn't feel like a
          different, older piece of UI than creating. */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
          <div
            className={`bg-white rounded-3xl shadow-2xl border w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
              selectedCategory?.parentId ? "border-indigo-100" : "border-slate-100"
            }`}
          >
            {/* Accent bar */}
            <div
              className={`h-1.5 shrink-0 ${
                selectedCategory?.parentId
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600"
                  : "bg-gradient-to-r from-slate-900 to-slate-700"
              }`}
            />

            {/* Header */}
            <div
              className={`flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b shrink-0 ${
                selectedCategory?.parentId ? "bg-indigo-50/40 border-indigo-100" : "border-slate-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${selectedCategory?.parentId ? "bg-indigo-100" : "bg-slate-900"}`}>
                  {selectedCategory?.parentId ? (
                    <FolderTree className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Tag className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-950">
                      {selectedCategory?.parentId ? "Edit Subcategory" : "Edit Category"}
                    </h2>
                    {selectedCategory?.parentId && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">
                        Subcategory
                      </span>
                    )}
                  </div>
                  {selectedCategory?.parentId ? (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {breadcrumb.slice(1).map((crumb, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-medium">
                            {crumb.name}
                          </span>
                        </React.Fragment>
                      ))}
                      <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold border border-dashed border-indigo-300">
                        {formData.name || selectedCategory?.name}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1">Update category details and image</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                  {/* LEFT — form fields */}
                  <div className="min-w-0 px-6 md:px-8 py-6 space-y-6 lg:border-r border-slate-100">
                    {/* Code + Image only apply to root categories, which still get shown to
                        customers as their own browsable tile — a subcategory only exists to
                        narrow products down as a filter, so it has no use for either. */}
                    {!selectedCategory?.parentId && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Category code
                        </label>
                        <input
                          type="text"
                          name="code"
                          maxLength={15}
                          value={formData.code}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all duration-200"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        {selectedCategory?.parentId ? "Subcategory name" : "Category name"}
                      </label>
                      <input
                        type="text"
                        name="name"
                        maxLength={40}
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${
                          selectedCategory?.parentId
                            ? "border-slate-200 focus:ring-indigo-200 focus:border-indigo-400"
                            : "border-slate-200 focus:ring-slate-300 focus:border-slate-400"
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                          selectedCategory?.parentId
                            ? "border-slate-200 focus:ring-indigo-200 focus:border-indigo-400"
                            : "border-slate-200 focus:ring-slate-300 focus:border-slate-400"
                        }`}
                        placeholder={
                          selectedCategory?.parentId
                            ? "Describe this subcategory..."
                            : "Describe this category..."
                        }
                      />
                    </div>

                    {/* Image — root categories only */}
                    {!selectedCategory?.parentId && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                          Category image
                        </label>
                        <label
                          htmlFor="updateImage"
                          className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/30 hover:bg-slate-50/60 cursor-pointer transition-all duration-200 min-w-0"
                        >
                          <Upload className="h-8 w-8 text-slate-400 mb-2 shrink-0" />
                          <span className="text-sm font-medium text-slate-700 text-center max-w-full truncate px-4 block">
                            {formData.image
                              ? formData.image.name
                              : "Click to upload new image"}
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
                              onClick={handleRevertImage}
                              className="text-rose-600 hover:text-rose-700 font-bold shrink-0 cursor-pointer"
                            >
                              Revert
                            </button>
                          </div>
                        )}

                        <input
                          type="file"
                          id="updateImage"
                          name="image"
                          onChange={handleChange}
                          className="hidden"
                          accept="image/*"
                        />
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

                  {/* RIGHT — live preview, mirrors the real card markup from the grid above */}
                  <div className={`w-full lg:w-[360px] shrink-0 px-6 md:px-8 py-6 ${selectedCategory?.parentId ? "bg-indigo-50/20" : "bg-slate-50/60"}`}>
                    <div className="lg:sticky lg:top-0 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Eye className="h-3.5 w-3.5" />
                        Live preview
                      </div>
                      <p className="text-xs text-slate-400 -mt-2">Exactly how this will look in the catalog browser.</p>

                      <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/30 shadow-lg overflow-hidden">
                        {selectedCategory?.parentId ? (
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
                              {formData.name || "Untitled"}
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-4 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isUpdating}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-white font-medium hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ${
                    selectedCategory?.parentId
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700"
                      : "bg-gradient-to-r from-slate-900 to-slate-800"
                  }`}
                >
                  {isUpdating ? (
                    <>
                      <LoaderSpinner size="sm" color="white" />
                      Updating...
                    </>
                  ) : selectedCategory?.parentId ? (
                    "Update Subcategory"
                  ) : (
                    "Update Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal (Responsive) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                Delete Category
              </h3>

              <p className="text-slate-600 mb-2">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-900">
                  {selectedCategory?.name}
                </span>
                ?
              </p>

              <p className="text-sm text-slate-500 mb-8">
                {(() => {
                  const descendants = countDescendants(selectedCategory ? getCatId(selectedCategory) : undefined);
                  return descendants > 0
                    ? `This action cannot be undone. This will also delete ${descendants} subcategor${descendants === 1 ? "y" : "ies"} beneath it, and every product in all of them.`
                    : "This action cannot be undone. All products under this category will be affected.";
                })()}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={closeDeleteModal}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <LoaderSpinner size="sm" color="white" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Category"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (Responsive) */}
      {showDetailModal && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  Category Details
                </h2>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDetailModal();
                        handleEditClick(selectedCategory);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={closeDetailModal}
                    className="p-2 rounded-lg hover:bg-slate-100 transition"
                  >
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Section */}
                <div>
                  <div className="w-full rounded-xl  mb-6 overflow-hidden flex items-center justify-center">
                    {selectedCategory.image ? (
                      <img
                        src={selectedCategory.image}
                        alt={selectedCategory.name}
                        className="max-h-[400px] w-auto object-contain"
                      />
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">
                      Category Name
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">
                      {selectedCategory.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">
                      Category Code
                    </div>
                    <div className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white font-medium">
                      {selectedCategory.code}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">
                      Description
                    </div>
                    <div className="text-slate-600 whitespace-pre-wrap break-words">
                      {selectedCategory.description ||
                        "No description provided"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">
                      Status
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleStatus(selectedCategory);
                      }}
                      className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <span className={`text-xs font-semibold ${selectedCategory.isActive !== false ? "text-emerald-700" : "text-slate-500"}`}>
                        {selectedCategory.isActive !== false ? "Active (Visible to customers)" : "Disabled (Hidden from store)"}
                      </span>
                      <div className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        selectedCategory.isActive !== false ? "bg-emerald-500" : "bg-slate-300"
                      }`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          selectedCategory.isActive !== false ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </div>
                    </button>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">
                      Category ID
                    </div>
                    <div className="text-xs sm:text-sm font-mono text-slate-700 bg-slate-50 p-3 rounded-lg break-words">
                      {selectedCategory.id || selectedCategory._id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        parentId={currentFolderId ?? undefined}
        parentName={currentFolderCategory?.name}
        parentPath={breadcrumb.slice(1).map((b) => b.name)}
        onSuccess={() => {
          setShowAddCategoryModal(false);
          fetchCategories();
        }}
      />

      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        categoryId={currentFolderId ?? undefined}
        categoryName={currentFolderCategory?.name}
        categoryPath={breadcrumb.slice(1).map((b) => b.name)}
        onSuccess={() => {
          setShowAddProductModal(false);
          setProductsRefreshKey((k) => k + 1);
          fetchCategories(); // refresh directProductCount too
        }}
      />

      <CategoryAttributesModal
        isOpen={!!attributesModalCategory}
        onClose={() => {
          setAttributesModalCategory(null);
          // The embedded Listproducts below (and its AttributeFilterPanel, keyed off
          // the same remount) has no way to know an attribute/value was just
          // added/edited/removed in this sibling modal — force a refetch so a newly
          // created attribute shows up immediately instead of only after a page reload.
          setProductsRefreshKey((k) => k + 1);
        }}
        categoryId={attributesModalCategory?.id}
        categoryName={attributesModalCategory?.name}
        categoryPath={attributesModalCategory?.path}
      />

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
};

export default ListCategory;
