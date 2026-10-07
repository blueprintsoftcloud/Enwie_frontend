import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  FaEdit,
  FaTrash,
  FaSearch,
  FaTag,
  FaBoxOpen,
  FaInfoCircle,
  FaTimes,
  FaEllipsisV,
  FaImage,
} from "react-icons/fa";
import { domainUrl } from "../utils/constant";

const BACKEND_BASE_URL = domainUrl.replace(/\/api\/?$/, "");

const resolveProductImage = (path?: string | null) => {
  if (!path || path === "Image") {
    return "https://placehold.co/500x500?text=No+Image";
  }
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  return `${BACKEND_BASE_URL}/${path}`;
};
// Import Heroicons for the product card look
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import api from "../utils/api";
import {
  Upload,
  Plus,
  LayoutGrid,
  List,
  Search,
  Filter,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Camera,
  Trash2,
  Eye,
  RotateCcw,
  X,
  Image as ImageIcon,
  Layers,
  Bold,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import { normalizeProduct, calculateDiscountedPrice, calculateDiscountAmount } from "../utils/product";
import { normalizeCategory } from "../utils/category";
import { compressImage } from "../utils/compressImage";
import { formatProductDescription, convertClipboardHtmlToText } from "../utils/sanitizeHtml";
import AttributeFilterPanel from "../components/AttributeFilterPanel";
import ProductVariantsModal from "./ProductVariantsModal";
import VariantsManagerFields, { VariantsManagerFieldsHandle } from "./VariantsManagerFields";

// SAME FILE – ListProducts.jsx
const LoaderSpinner = ({
  size = "sm",
  color = "white",
}: {
  size?: "sm" | "md";
  color?: "white" | "slate";
}) => {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
  };

  const colors = {
    white: "text-white",
    slate: "text-slate-600",
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${colors[color]}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};

interface CategoryAttr {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  isFilterable: boolean;
  values: { id: string; value: string }[];
}

interface ProductAttrValue {
  id: string;
  attributeId: string;
  attributeValueId: string | null;
  textValue: string | null;
  attribute: { id: string; name: string; type: string };
  attributeValue: { id: string; value: string } | null;
  /** Null = this tag applies to the whole product. Set = it only describes one
   * specific variant (e.g. "Fabric: Cotton" applies to 128GB/Black but not
   * 256GB/Silver) — see mongoose.ts's ProductAttributeValue on the backend. */
  variantId: string | null;
  variant: { id: string; options: Record<string, string> } | null;
}

interface ListProduct {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  brand?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  purchasePrice?: number | null;
  price?: number;
  stock?: number;
  sizes?: string[];
  discount?: number;
  image?: string;
  images?: string[];
  category?: { id?: string; name?: string; code?: string } | string;
  attributeValues?: ProductAttrValue[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** Min–max across this product's own active variants (null for a plain product) —
   * `price` alone is just the cheapest one and reads as misleading on its own once
   * other options cost more. See product.controller.ts's productList. */
  priceRange?: { min: number; max: number } | null;
}

interface ListCategoryItem {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface ProductFormData {
  categoryCode: string;
  productCode: string;
  productName: string;
  brand: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  purchasePrice: number | string;
  price: number | string;
  stock: number | string;
  discount: number | string;
  image: File | null;
  additionalImages: File[];
  removeImages: string[];
}

interface ModalProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

// Color Palette
const colors = {
  primary: "#2D5A27", // Dark green - Main brand color
  secondary: "#4A7C59", // Medium green
  accent: "#8FB996", // Light green
  light: "#C8D5B9", // Very light green
  background: "#F5F9F4", // Off-white background
  text: "#1A1F16", // Dark text
  textLight: "#5A6D57", // Light text
  danger: "#D32F2F", // Red for delete
  warning: "#FF9800", // Orange for warnings
  border: "#E0E0E0", // Light border
};

// --- Custom Components for Modals & Model (Dropdown) ---

/**  Generic Modal Component - Updated Design */
const Modal = ({ title, children, isOpen, onClose }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 transition-opacity duration-300 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 animate-slideUp relative">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/**  Custom Model Dropdown Component (Replaces direct icons) */
// Portaled to <body> with a fixed position computed from the trigger button's
// bounding rect, rather than an absolutely-positioned <div> nested in the table row.
// The table's scroll wrapper is overflow-x-auto (see its <div> below) — setting only
// one overflow axis forces the other to clip too per the CSS overflow spec, so a
// nested absolute dropdown got cut off at the table's edge the moment it extended past
// the visible rows (exactly what was reported: "Delete Product" cut off at the bottom).
// Same fix as CategoryMegaMenu's collapsed-rail flyout in Navbar.tsx.
const ActionModel = ({
  onEdit,
  onDelete,
  onManageVariants,
  canEdit = true,
  canDelete = true,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onManageVariants: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setIsOpen(true);
  };

  // Close on outside click, and on scroll/resize — the menu's position is computed
  // once at open time, so it would otherwise visually detach from the trigger button
  // the moment the table (or the page) scrolls.
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".action-model-trigger") && !target.closest(".action-model-menu")) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => setIsOpen(false);
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          isOpen ? setIsOpen(false) : openMenu();
        }}
        className="action-model-trigger p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200 border border-gray-200 hover:border-gray-300 cursor-pointer"
        title="Product Actions"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>
      {isOpen &&
        createPortal(
          <div
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
            className="action-model-menu w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 origin-top-right animate-fadeIn ring-1 ring-gray-100 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
                setIsOpen(false);
              }}
              disabled={!canEdit}
              className={`w-full text-left flex items-center px-4 py-3 text-sm transition-all duration-200 border-b border-gray-100 ${
                canEdit
                  ? "text-gray-700 hover:bg-gray-50 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed opacity-50"
              }`}
            >
              <PencilSquareIcon
                className={`w-4 h-4 mr-3 ${canEdit ? "text-blue-600" : "text-gray-300"}`}
              />
              <span className="font-medium">
                {canEdit ? "Edit Product" : "No Edit Permission"}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onManageVariants();
                setIsOpen(false);
              }}
              disabled={!canEdit}
              className={`w-full text-left flex items-center px-4 py-3 text-sm transition-all duration-200 border-b border-gray-100 ${
                canEdit
                  ? "text-gray-700 hover:bg-gray-50 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed opacity-50"
              }`}
            >
              <Squares2X2Icon
                className={`w-4 h-4 mr-3 ${canEdit ? "text-indigo-600" : "text-gray-300"}`}
              />
              <span className="font-medium">Manage Variants</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
              disabled={!canDelete}
              className={`w-full text-left flex items-center px-4 py-3 text-sm transition-all duration-200 ${
                canDelete
                  ? "text-gray-700 hover:bg-gray-50 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed opacity-50"
              }`}
            >
              <TrashIcon
                className={`w-4 h-4 mr-3 ${canDelete ? "text-red-600" : "text-gray-300"}`}
              />
              <span className="font-medium">
                {canDelete ? "Delete Product" : "No Delete Permission"}
              </span>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

const ProductSkeletonCard = () => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs animate-pulse">
    <div className="bg-slate-200/70 rounded-xl h-[200px] w-full mb-4" />
    <div className="space-y-2">
      <div className="bg-slate-200/70 h-4 w-1/3 rounded" />
      <div className="bg-slate-200/70 h-5 w-3/4 rounded" />
      <div className="flex justify-between items-center pt-2">
        <div className="bg-slate-200/70 h-6 w-1/3 rounded" />
        <div className="bg-slate-200/70 h-6 w-1/4 rounded" />
      </div>
    </div>
  </div>
);

// --- Product Card Component adapted for Dashboard ---

const DashboardProductCard = ({
  product,
  handleEditClick,
  handleDeleteClick,
  handleViewProduct,
  handleToggleStatus,
  handleManageVariants,
  canEdit = true,
  canDelete = true,
}: {
  product: ListProduct;
  handleEditClick: (p: ListProduct) => void;
  handleDeleteClick: (p: ListProduct) => void;
  handleViewProduct: (p: ListProduct) => void;
  handleToggleStatus: (p: ListProduct) => void;
  handleManageVariants: (p: ListProduct) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) => {
  const name = product?.name || "Untitled Product";
  const priceRange = product?.priceRange;
  const hasRange = !!(priceRange && priceRange.min !== priceRange.max);
  const basePrice = product?.price != null ? Number(product.price) : null;
  const discountPercent = product?.discount != null ? Number(product.discount) : 0;
  const hasDiscount = !hasRange && discountPercent > 0 && basePrice != null && basePrice > 0;
  const discountedPrice = hasDiscount ? calculateDiscountedPrice(basePrice, discountPercent) : basePrice;

  const price =
    hasRange
      ? `₹${priceRange.min.toLocaleString("en-IN")} – ₹${priceRange.max.toLocaleString("en-IN")}`
      : basePrice != null
        ? `₹${basePrice.toLocaleString("en-IN")}`
        : "N/A";
  const imageUrl = resolveProductImage(product?.image);
  const isStockAvailable = (product.stock || 0) > 0;
  const galleryImages = useMemo(
    () => Array.from(new Set([product?.image, ...(product?.images || [])].filter(Boolean))) as string[],
    [product?.image, product?.images],
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const activeImage = resolveProductImage(galleryImages[activeImageIdx] ?? product?.image);

  const showPrevImage = () =>
    setActiveImageIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  const showNextImage = () =>
    setActiveImageIdx((i) => (i + 1) % galleryImages.length);

  // Touch-swipe support — a real drag advances/retreats the gallery instead of the tap
  // below opening View Details. Refs (not state) since only the end result matters; a
  // mid-swipe re-render here would be wasted work on every touchmove event.
  const touchStartXRef = useRef<number | null>(null);
  const isSwipeRef = useRef(false);
  const SWIPE_THRESHOLD_PX = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    isSwipeRef.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    if (Math.abs(e.touches[0].clientX - touchStartXRef.current) > 10) isSwipeRef.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null || galleryImages.length < 2) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (delta <= -SWIPE_THRESHOLD_PX) showNextImage();
    else if (delta >= SWIPE_THRESHOLD_PX) showPrevImage();
  };

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      <div>
        {/* IMAGE CONTAINER */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-xl overflow-hidden relative mb-4 border border-slate-100 p-2">
          <div
            className="w-full h-[200px] md:h-[220px] xl:h-[240px] flex items-center justify-center cursor-pointer select-none"
            onClick={() => {
              // A drag that crossed the swipe threshold shouldn't ALSO open View
              // Details — touchend synthesizes a click in most mobile browsers.
              if (isSwipeRef.current) {
                isSwipeRef.current = false;
                return;
              }
              handleViewProduct(product);
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageUrl ? (
              <img
                src={`${activeImage}?v=${product.updatedAt || Date.now()}`}
                alt={name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-sm text-slate-400">
                <FaImage className="text-3xl mb-2 text-slate-300" />
                No Image
              </div>
            )}
          </div>

          {/* PREV/NEXT ARROWS — click to cycle without leaving the card; hidden until
              hover so the card doesn't look cluttered when there's nothing to switch. */}
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrevImage();
                }}
                aria-label="Previous image"
                className="absolute left-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white hover:text-slate-900 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNextImage();
                }}
                aria-label="Next image"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm border border-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white hover:text-slate-900 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* GALLERY DOTS — only when the product actually has more than one image */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/80 backdrop-blur px-2 py-1 rounded-full shadow-sm border border-slate-200/60">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === activeImageIdx ? "w-4 bg-slate-800" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Show image ${idx + 1} of ${galleryImages.length}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 mb-1">
                {product.code || "NO CODE"}
              </span>
              <h3
                className="text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors"
                title={name}
              >
                {name}
              </h3>
            </div>
            <ActionModel
              onEdit={() => handleEditClick(product)}
              onDelete={() => handleDeleteClick(product)}
              onManageVariants={() => handleManageVariants(product)}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </div>

          {/* PRICE & STOCK ROW */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {hasDiscount ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-slate-900 font-extrabold tracking-tight font-mono text-xl">
                  ₹{discountedPrice?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 line-through font-mono">
                  {price}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              </div>
            ) : (
              <span
                className={`text-slate-900 font-extrabold tracking-tight font-mono ${
                  hasRange ? "text-base" : "text-xl"
                }`}
              >
                {price}
              </span>
            )}
            {product.stock !== undefined && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${
                  isStockAvailable
                    ? "bg-slate-100 text-slate-700 border-slate-200/80"
                    : "bg-rose-50 text-rose-700 border-rose-200/80"
                }`}
              >
                {isStockAvailable ? `${product.stock} in stock` : "Out of stock"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
        <button
          onClick={() => handleViewProduct(product)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100/80 hover:bg-slate-900 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <FaInfoCircle className="h-3 w-3" />
          View Details
        </button>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleStatus(product);
            }}
            title={product.isActive !== false ? "Click to Disable Product" : "Click to Enable Product"}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              product.isActive !== false
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-slate-300 hover:bg-slate-400"
            }`}
          >
            <span className="sr-only">Toggle Active Status</span>
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                product.isActive !== false ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-xs font-bold ${product.isActive !== false ? "text-emerald-700" : "text-slate-400"}`}>
            {product.isActive !== false ? "Active" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
interface ListproductsProps {
  /**
   * Rendered inline inside the unified Catalog browser (Listcategory.tsx) at a
   * leaf category node, instead of as its own standalone page — hides this
   * component's own page chrome/header/KPI cards/category sidebar, since the
   * host page already supplies its own header, breadcrumb, and category context.
   */
  embedded?: boolean;
  /** When set (typically alongside `embedded`), locks the product list to this
   * category and skips the sidebar's own category-selection/auto-select behavior. */
  lockedCategoryId?: string;
  /** Name of the locked category, passed by the parent host page to ensure accurate title display */
  lockedCategoryName?: string;
  /** Embedded mode's own "Add Product" trigger, rendered next to Refresh instead of
   * the (hidden, in embedded mode) page-level header button — the host page
   * (Listcategory.tsx) owns the actual Add Product modal, this just opens it. */
  onAddProduct?: () => void;
}

const Listproducts = ({
  embedded = false,
  lockedCategoryId,
  lockedCategoryName,
  onAddProduct,
}: ListproductsProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = location.pathname.startsWith("/super-admin-dashboard")
    ? "/super-admin-dashboard"
    : location.pathname.startsWith("/staff-dashboard")
      ? "/staff-dashboard"
      : "/admin-dashboard";

  const [categories, setCategories] = useState<ListCategoryItem[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<
    Record<string, ListProduct[]>
  >({});
  const [currentProducts, setCurrentProducts] = useState<ListProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    lockedCategoryId ?? null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ListProduct | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [variantsModalProduct, setVariantsModalProduct] = useState<ListProduct | null>(null);
  // Whether the product currently open in the edit form has any active variants — if
  // so, its Stock field is derived (see backend's syncProductStock) and the form shows
  // a read-only total instead of an editable input. Null while that check is loading.
  const [editingVariantStock, setEditingVariantStock] = useState<{ hasVariants: boolean; total: number } | null>(null);
  // Variants / Images each used to be stacked cards inside the same scroll — with a
  // full variant list (plus, once a product has options, each row's own Category
  // Filter controls merged in below — see the categoryFilters prop passed to
  // VariantsManagerFields) the form could grow to several screens tall. Splitting
  // into tabs keeps the modal a fixed height; the core Details fields above the tabs
  // (name/code/price/etc.) stay always visible since none of that content grows.
  // Category Filters no longer gets its own tab — once a product has options, every
  // filter value is assigned per-variant anyway, so it lives right in each variant's
  // own row instead of a second full list of the same variants. Reset to the first
  const [editSectionTab, setEditSectionTab] = useState<"variants" | "images">("variants");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");
  // Full variant list (not just the count) for the product currently open in the edit
  // form — lets the Category Filters section offer "applies to: <variant>" per
  // selected value once a product has variants. Refreshed alongside editingVariantStock.
  const [editingVariantsList, setEditingVariantsList] = useState<
    Array<{
      id: string;
      options: Record<string, string>;
      isActive: boolean;
      stock: number;
      priceOverride: number | null;
      discountOverride: number | null;
    }>
  >([]);
  const [formData, setFormData] = useState<ProductFormData>({
    categoryCode: "",
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
    removeImages: [],
  });
  const [imagePreview, setImagePreview] = useState("");
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<
    string[]
  >([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ListProduct | null>(null);
  // Null while loading/for a plain single-SKU product — populated with every variant
  // row (active and inactive) so the Details modal can show the actual per-option
  // price/stock breakdown instead of just the derived "starting from" Price/Stock at
  // the top (see utils/productVariant.ts's syncProductFromVariants on the backend).
  const [detailProductVariants, setDetailProductVariants] = useState<Array<{
    id: string;
    options: Record<string, string>;
    stock: number;
    priceOverride: number | null;
    isActive: boolean;
  }> | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productFetchError, setProductFetchError] = useState<string | null>(
    null,
  );
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "out_of_stock">("all");
  const [activeAttributeValueIds, setActiveAttributeValueIds] = useState<string[]>([]);
  const activeAttributeValueIdsKey = activeAttributeValueIds.slice().sort().join(",");

  // Debounce the search box before it triggers a server refetch
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(productSearchQuery.trim()), 400);
    return () => clearTimeout(handler);
  }, [productSearchQuery]);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const PAGE_SIZE = 20;

  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttr[]>([]);
  // Which option axis's "Filter visibility" toggle currently has a create-and-backfill
  // request in flight (see createFilterFromOption below) — null when none does. Only
  // one axis name at a time since each is its own button.
  const [syncingFilterAxis, setSyncingFilterAxis] = useState<string | null>(null);
  // Whole-product filter values — only used while the product has NO variants. Once
  // it has variants, each one is set independently instead (variantAttrValues below),
  // same as Stock/Purchase Price/Selling Price/Discount.
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const initialAttrValuesRef = useRef<Record<string, string>>({});
  // Per-(variant, attribute) filter value, keyed by `${variantId}:${attributeId}` -> a
  // single value id/text, or (MULTISELECT) a comma-joined list of value ids. Replaces
  // a single shared whole-product value once the product has variants — a SELECT
  // attribute like "Colour" can't otherwise represent Black for some combos and
  // Silver for others at the same time. See ProductAttrValue.variantId.
  const [variantAttrValues, setVariantAttrValues] = useState<Record<string, string>>({});
  const initialVariantAttrValuesRef = useRef<Record<string, string>>({});
  // Variant row stock/price/discount edits are typed but no longer saved on blur —
  // this form's own "Save Changes" button flushes them via this ref, alongside
  // everything else on the form. See VariantsManagerFields.tsx.
  const variantsManagerRef = useRef<VariantsManagerFieldsHandle>(null);
  // Confirm dialog (replaces window.confirm) — only shown when EVERY active variant has
  // no price at all, so saving would put the whole product live at ₹0. Null = hidden.
  const [unpricedConfirmCount, setUnpricedConfirmCount] = useState<number | null>(null);

  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();
  const isStaff = user.role === "STAFF";
  const canAdd = !isStaff || hasPermission("PRODUCT_ADD");
  const canEdit = !isStaff || hasPermission("PRODUCT_EDIT");
  const canDelete = !isStaff || hasPermission("PRODUCT_DELETE");
  // Catalog Management's nav/route access (see Listcategory.tsx / AppRoutes.tsx) is
  // granted by ANY of the 8 category+product permissions — a staff member with only
  // CATEGORY_VIEW (say) can reach this embedded product browser for a leaf category,
  // but /product/list itself requires PRODUCT_VIEW specifically. Without this check,
  // that combination fires the fetch anyway and surfaces the backend's raw permission
  // error inline ("You do not have permission to perform this action (PRODUCT_VIEW).")
  // instead of skipping the pointless request and explaining why up front.
  const canView = !isStaff || hasPermission("PRODUCT_VIEW");

  // 🔹 Fetch Categories on Mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      let list = [];
      const res = await api.get("/category/list");
      list = (res.data.list || []).map(normalizeCategory);
      console.log("Fetched categories:", list); // Debug log
      setCategories(list);
      if (!lockedCategoryId && list.length > 0) {
        setSelectedCategoryId(list[0].id ?? list[0]._id ?? "");
      }
    } catch (err) {
      const _e = err as any;
      console.error("Error fetching categories:", err);
    }
  };

  // 🔹 Fetch products with backend pagination — status/search/attribute filters are
  // all sent server-side (see the note by `filteredProductsToDisplay` below).
  const fetchProductsByCategory = useCallback(
    async (categoryId: string, page = 1) => {
      setLoadingProducts(true);
      setProductFetchError(null);
      setCurrentProducts([]);
      if (!canView) {
        setLoadingProducts(false);
        setProductFetchError("You don't have permission to view products — ask an admin to grant Product View access.");
        setTotalPages(1);
        setTotalProducts(0);
        return;
      }
      try {
        let products: ListProduct[] = [];
        let total = 0;
        let totalPages = 1;

        const params = new URLSearchParams({
          categoryId,
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
        if (activeAttributeValueIdsKey) params.set("attributeValueIds", activeAttributeValueIdsKey);

        const res = await api.get(`/product/list?${params.toString()}`);
        products = res.data.list || [];
        const pagination = res.data.pagination ?? {};
        total = pagination.total ?? products.length;
        totalPages = pagination.totalPages ?? 1;

        setCurrentProducts(products);
        setProductsByCategory((prev) => ({ ...prev, [categoryId]: products }));
        setCurrentPage(page);
        setTotalPages(totalPages);
        setTotalProducts(total);
      } catch (err) {
        const _e = err as any;
        const msg =
          _e?.response?.data?.message ||
          _e?.message ||
          "Failed to load products";
        setProductFetchError(msg);
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    },
    [PAGE_SIZE, statusFilter, debouncedSearchQuery, activeAttributeValueIdsKey, canView],
  );

  // Re-fetch whenever the selected category or any filter changes — reset to page 1
  useEffect(() => {
    if (selectedCategoryId) {
      setCurrentPage(1);
      fetchProductsByCategory(selectedCategoryId, 1);
    } else {
      setCurrentProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    }
  }, [selectedCategoryId, fetchProductsByCategory]);

  // Refresh button handler
  const refreshProducts = useCallback(() => {
    if (selectedCategoryId)
      fetchProductsByCategory(selectedCategoryId, currentPage);
  }, [selectedCategoryId, currentPage, fetchProductsByCategory]);

  const handleToggleStatus = async (product: ListProduct) => {
    const productId = product._id ?? product.id;
    if (!productId) return;
    const newStatus = product.isActive === false ? true : false;
    try {
      const res = await api.patch(`/product/${productId}/status`, { isActive: newStatus });
      toast.success(res.data.message || "Product status updated successfully!");
      refreshProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to toggle status");
    }
  };

  // Page change handler
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    fetchProductsByCategory(selectedCategoryId!, page);
    // Scroll product panel back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useBodyScrollLock(showEditModal || showDeleteModal || showProductDetailModal || !!lightboxImage);

  // Close lightbox on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxImage) {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage]);

  // 🔹 Filtered Categories and Products (for search)
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      (cat.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [categories, searchTerm]);

  // Status/search/attribute filtering all happen server-side now (see
  // fetchProductsByCategory) — attribute filters can't be applied client-side since
  // unloaded pages aren't in memory, and it'd be inconsistent to filter these two
  // client-side while attributes are server-side. `currentProducts` is already the
  // filtered result for the current page.
  const filteredProductsToDisplay = currentProducts;
  const productsToDisplay = filteredProductsToDisplay;

  const selectedCategoryName = useMemo(() => {
    if (lockedCategoryName) return lockedCategoryName;
    return categories.find((c) => (c.id ?? c._id) === selectedCategoryId)?.name;
  }, [categories, selectedCategoryId, lockedCategoryName]);

  // 🔹 Fetch category attributes when edit modal's category changes
  useEffect(() => {
    if (!showEditModal || !formData.categoryCode) {
      setCategoryAttrs([]);
      return;
    }
    api
      .get(`/category/${formData.categoryCode}/attributes`)
      .then((res) => {
        // RATING/PRICE are informational entries (see CategoryAttributes.tsx) — the
        // storefront's actual Rating/Price filtering is global, not tagged per-product,
        // so there's no per-product input to render for them here.
        const attrs: CategoryAttr[] = (res.data.attributes ?? []).filter(
          (a: CategoryAttr) => a.type !== "RATING" && a.type !== "PRICE",
        );
        setCategoryAttrs(attrs);
      })
      .catch(() => {});
  }, [showEditModal, formData.categoryCode]);

  // Fetches the active-variant stock total for the Stock field's read-only summary, AND
  // mirrors backend/src/utils/productVariant.ts's syncProductFromVariants to refresh the
  // Purchase Price/Selling Price/Discount summaries too — called after every inline edit
  // in the embedded VariantsManagerFields below (add/generate/save/toggle/delete), so
  // those read-only blocks stay live without a full product refetch.
  const refreshEditingVariantStock = (productId: string) => {
    api
      .get(`/product/${productId}/variants`)
      .then((res) => {
        const variants: Array<{
          id: string;
          options: Record<string, string>;
          stock: number;
          isActive: boolean;
          priceOverride: number | null;
          purchasePriceOverride: number | null;
          discountOverride: number | null;
        }> = res.data.variants ?? [];
        // Any row at all (active or not) means stock/price/etc. are derived — matches
        // the backend's own criterion (see syncProductFromVariants: only reverts to
        // admin-controlled once every row is gone, not just deactivated).
        const hasVariants = variants.length > 0;
        const active = variants.filter((v) => v.isActive);
        setEditingVariantStock({ hasVariants, total: active.reduce((sum, v) => sum + (v.stock || 0), 0) });
        setEditingVariantsList(
          variants.map((v) => ({
            id: v.id,
            options: v.options,
            isActive: v.isActive,
            stock: v.stock,
            priceOverride: v.priceOverride,
            discountOverride: v.discountOverride,
          })),
        );

        if (active.length > 0) {
          setFormData((prev) => {
            const currentPrice = parseFloat(String(prev.price)) || 0;
            const cheapest = active.reduce(
              (min, v) => ((v.priceOverride ?? currentPrice) < (min.priceOverride ?? currentPrice) ? v : min),
              active[0],
            );
            return {
              ...prev,
              price: String(cheapest.priceOverride ?? currentPrice),
              purchasePrice: cheapest.purchasePriceOverride != null ? String(cheapest.purchasePriceOverride) : (prev.purchasePrice || "0"),
              discount: cheapest.discountOverride != null ? String(cheapest.discountOverride) : "0",
            };
          });
        }
      })
      .catch(() => {
        setEditingVariantStock({ hasVariants: false, total: 0 });
        setEditingVariantsList([]);
      });
  };

  // Variant management now lives inline in this same Edit form (see
  // VariantsManagerFields below) instead of a separate modal — every "Manage Variants"
  // mention switches to its tab then scrolls to it, rather than opening anything.
  // The section is unmounted while its tab isn't active, so the tab switch has to
  // land before the scroll can find it — one render tick is enough in practice.
  const scrollToVariantsSection = () => {
    setEditSectionTab("variants");
    setTimeout(() => {
      document.getElementById("edit-variants-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // 🔹 Handle Edit / Delete setup
  const handleEditClick = (product: ListProduct) => {
    setSelectedProduct(product);
    const categoryId =
      (typeof product.category === "object"
        ? product.category?.id
        : undefined) ?? "";

    // Pre-populate attribute values from existing product data — a variantId-null
    // row is a whole-product tag (only meaningful pre-variants), a variantId-carrying
    // row belongs to that one variant's own set.
    const existingAttrs: Record<string, string> = {};
    const existingVariantAttrs: Record<string, string> = {};
    (product.attributeValues ?? []).forEach((av) => {
      const value = av.attributeValueId ?? (av.textValue || undefined);
      if (!value) return;
      if (av.variantId) {
        const key = `${av.variantId}:${av.attributeId}`;
        existingVariantAttrs[key] = existingVariantAttrs[key] ? `${existingVariantAttrs[key]},${value}` : value;
      } else {
        existingAttrs[av.attributeId] = existingAttrs[av.attributeId]
          ? `${existingAttrs[av.attributeId]},${value}`
          : value;
      }
    });
    setAttrValues(existingAttrs);
    initialAttrValuesRef.current = existingAttrs;
    setVariantAttrValues(existingVariantAttrs);
    initialVariantAttrValuesRef.current = existingVariantAttrs;

    setFormData({
      categoryCode: categoryId,
      productCode: product.code ?? "",
      productName: product.name,
      brand: product.brand ?? "",
      description: product.description || "",
      metaTitle: product.metaTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      purchasePrice: product.purchasePrice ?? "",
      price: product.price ?? "",
      stock: product.stock || 0,
      discount: product.discount ?? "",
      image: null,
      additionalImages: [],
      removeImages: [],
    });
    setImagePreview(product.image || "");
    setExistingAdditionalImages(product.images || []);
    setAdditionalPreviews([]);
    setShowEditModal(true);

    // Whether this product's Stock field should be editable — once it has variants,
    // stock is derived (see backend's syncProductStock) and the form shows a read-only
    // total instead. Re-checked fresh on every open since variants can change between
    // edits without this list re-fetching.
    setEditingVariantStock(null);
    setEditingVariantsList([]);
    setEditSectionTab("variants");
    const editingProductId = product._id ?? product.id;
    if (editingProductId) refreshEditingVariantStock(editingProductId);
  };

  const handleViewProduct = (product: ListProduct) => {
    setDetailProduct(product);
    setShowProductDetailModal(true);
    setDetailProductVariants(null);
    const viewedProductId = product._id ?? product.id;
    if (viewedProductId) {
      api
        .get(`/product/${viewedProductId}/variants`)
        .then((res) => setDetailProductVariants(res.data.variants ?? []))
        .catch(() => setDetailProductVariants([]));
    }
  };

  const handleDeleteClick = (product: ListProduct) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const editDescriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyBoldToEditDescription = () => {
    const textarea = editDescriptionTextareaRef.current;
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

    setTimeout(() => {
      if (editDescriptionTextareaRef.current) {
        editDescriptionTextareaRef.current.focus();
        editDescriptionTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleEditDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      applyBoldToEditDescription();
    }
  };

  const handleEditDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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

    setTimeout(() => {
      if (editDescriptionTextareaRef.current) {
        editDescriptionTextareaRef.current.focus();
        editDescriptionTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleChange = async (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;

    if (name === "purchasePrice" || name === "price") {
      if (value !== "" && parseFloat(value) > 999999999) {
        return; // Restrict typing prices higher than ₹99 Crores
      }
    }
    if (name === "stock") {
      if (value !== "" && parseFloat(value) > 999999) {
        return; // Restrict typing stock higher than 999,999
      }
    }
    if (name === "discount") {
      if (value !== "" && parseFloat(value) > 100) {
        return; // Restrict typing discount higher than 100%
      }
    }

    if (name === "image") {
      const file = files?.[0];

      if (file) {
        if (imagePreview?.startsWith("blob:")) {
          URL.revokeObjectURL(imagePreview);
        }
        const compressed = await compressImage(file);
        setFormData((prev) => ({ ...prev, image: compressed }));
        setImagePreview(URL.createObjectURL(compressed));
      } else {
        setFormData((prev) => ({ ...prev, image: null }));
        setImagePreview(selectedProduct?.image ?? "");
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAdditionalImages = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    const remaining =
      5 - existingAdditionalImages.length - formData.additionalImages.length;
    const allowed = newFiles.slice(0, Math.max(0, remaining));
    const compressed = await Promise.all(allowed.map(compressImage));
    const newUrls = compressed.map((f) => URL.createObjectURL(f));
    setFormData((prev) => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...compressed],
    }));
    setAdditionalPreviews((prev) => [...prev, ...newUrls]);
    e.target.value = "";
  };

  const removeNewAdditionalImage = (index: number) => {
    URL.revokeObjectURL(additionalPreviews[index]);
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index),
    }));
    toast.success("Unsaved gallery image removed", { id: "gallery-remove", duration: 1500 });
  };

  const removeExistingImage = (url: string) => {
    setExistingAdditionalImages((prev) => prev.filter((img) => img !== url));
    setFormData((prev) => ({
      ...prev,
      removeImages: [...prev.removeImages, url],
    }));
    toast.success("Gallery image marked for removal", { id: "gallery-remove", duration: 2000 });
  };

  const restoreRemovedImages = () => {
    const restored = formData.removeImages;
    setExistingAdditionalImages((prev) => [...prev, ...restored]);
    setFormData((prev) => ({
      ...prev,
      removeImages: [],
    }));
    toast.success("Restored removed images", { id: "gallery-restore", duration: 2000 });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    if (!selectedProduct) return;
    e.preventDefault();

    // 🔍 No changes check
    const hasVariantEdits = variantsManagerRef.current?.hasPendingEdits() ?? false;
    const isUnchanged =
      !hasVariantEdits &&
      formData.productCode === (selectedProduct.code ?? "") &&
      formData.productName === selectedProduct.name &&
      formData.brand === (selectedProduct.brand ?? "") &&
      formData.price === selectedProduct.price &&
      formData.description === selectedProduct.description &&
      formData.metaTitle === (selectedProduct.metaTitle ?? "") &&
      formData.metaDescription === (selectedProduct.metaDescription ?? "") &&
      formData.stock === selectedProduct.stock &&
      formData.purchasePrice === (selectedProduct.purchasePrice ?? "") &&
      String(formData.discount) === String(selectedProduct.discount ?? "") &&
      !formData.image &&
      formData.additionalImages.length === 0 &&
      formData.removeImages.length === 0 &&
      JSON.stringify(attrValues) ===
        JSON.stringify(initialAttrValuesRef.current) &&
      JSON.stringify(variantAttrValues) ===
        JSON.stringify(initialVariantAttrValuesRef.current);

    if (isUnchanged) {
      toast("No changes detected", {
        icon: "ℹ️",
        id: "no-change-toast",
      });
      return;
    }

    // Strict requirement: every active variant must have a primary image (Slot 1)
    const missingImages = variantsManagerRef.current?.getVariantsMissingImage() ?? [];
    if (missingImages.length > 0) {
      setEditSectionTab("variants");
      const names = missingImages.slice(0, 2).map((m) => m.label).join(", ");
      const more = missingImages.length > 2 ? ` (+${missingImages.length - 2} more)` : "";
      toast.error(
        `1st image is required for all active variants. Missing: ${names}${more}`,
        { id: "variant-missing-image-update", duration: 5000 },
      );
      return;
    }

    // Every active variant still unpriced (never touched, not just one row among priced
    // siblings) means proceeding would silently put the whole product live at ₹0 — confirm
    // first instead of saving that outright, same guard as ProductVariantsModal.tsx.
    const unpricedCount = variantsManagerRef.current?.allUnpriced() ?? 0;
    if (unpricedCount > 0) {
      setUnpricedConfirmCount(unpricedCount);
      return;
    }

    await proceedUpdate();
  };

  const proceedUpdate = async () => {
    if (!selectedProduct) return;
    const missingImages = variantsManagerRef.current?.getVariantsMissingImage() ?? [];
    if (missingImages.length > 0) {
      setEditSectionTab("variants");
      const names = missingImages.slice(0, 2).map((m) => m.label).join(", ");
      const more = missingImages.length > 2 ? ` (+${missingImages.length - 2} more)` : "";
      toast.error(
        `1st image is required for all active variants. Missing: ${names}${more}`,
        { id: "variant-missing-image-update", duration: 5000 },
      );
      return;
    }

    const hasVariantEdits = variantsManagerRef.current?.hasPendingEdits() ?? false;
    const productId = selectedProduct._id ?? selectedProduct.id;
    if (!productId) {
      toast.error("Unable to update product: missing product ID", {
        id: "product-update-no-id",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Flush any unsaved variant row edits (stock/price/discount) first — if any row
      // fails to save, its own error toast has already fired; stop here rather than
      // closing the modal on a partial save.
      if (hasVariantEdits) {
        const variantEditsOk = await variantsManagerRef.current?.flushPendingEdits();
        if (!variantEditsOk) return;
      }

      const data = new FormData();
      data.append("category", formData.categoryCode);
      data.append("code", formData.productCode);
      data.append("name", formData.productName);
      data.append("brand", formData.brand.trim());
      data.append("description", formData.description);
      data.append("metaTitle", formData.metaTitle.trim());
      data.append("metaDescription", formData.metaDescription.trim());
      // Skip price/purchasePrice/stock/discount when the product has variants — all
      // four are derived server-side (syncProductFromVariants) and read-only in that
      // case; sending the last value the form loaded would be stale the moment any
      // variant's own stock/price/cost/discount changes. The backend guards against
      // this regardless of what's sent, but there's no reason to send stale values.
      if (!editingVariantStock?.hasVariants) {
        data.append("price", String(formData.price));
        if (formData.purchasePrice !== "" && formData.purchasePrice !== null) {
          data.append("purchasePrice", String(formData.purchasePrice));
        }
        data.append("stock", String(formData.stock));
        if (formData.discount !== "" && formData.discount !== null) {
          data.append("discount", String(formData.discount));
        }
      }

      if (formData.image) {
        data.append("image", formData.image);
      }
      // Additional images
      formData.additionalImages.forEach((img) => data.append("images", img));
      // Images to be removed
      if (formData.removeImages.length > 0) {
        data.append("removeImages", JSON.stringify(formData.removeImages));
      }

      // Dynamic attribute values. Once the product has variants, every filter value
      // is set per-variant (variantAttrValues) instead of once for the whole product —
      // sending only the per-variant rows here means the old whole-product tags (if
      // any, from before it had variants) get replaced by this save, same "delete old
      // rows, insert new ones" contract productUpdate already uses.
      const buildAttrEntries = (
        source: Record<string, string>,
        keyToIds: (key: string) => { attributeId: string; variantId?: string },
      ) =>
        Object.entries(source)
          .filter(([, v]) => v)
          .flatMap(([key, v]) => {
            const { attributeId, variantId } = keyToIds(key);
            const attr = categoryAttrs.find((a) => a.id === attributeId);
            // BOOLEAN stores a real CategoryAttributeValue id too (see its button
            // handler below) — it's id-based like SELECT/MULTISELECT, not free text,
            // despite reading like a plain toggle.
            if (attr && (attr.type === "SELECT" || attr.type === "MULTISELECT" || attr.type === "BOOLEAN")) {
              return v
                .split(",")
                .filter(Boolean)
                .map((valueId) => ({ attributeId, attributeValueId: valueId, variantId }));
            }
            return [{ attributeId, textValue: v, variantId }];
          });

      const attrPayload = editingVariantStock?.hasVariants
        ? buildAttrEntries(variantAttrValues, (key) => {
            const [variantId, attributeId] = key.split(":");
            return { attributeId, variantId };
          })
        : buildAttrEntries(attrValues, (attributeId) => ({ attributeId }));
      data.append("attributeValues", JSON.stringify(attrPayload));

      // ✅ Capture response
      const res = await api.put(`/product/update/${productId}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedProduct = res.data.product;

      // Update both the current list and the cache
      const updatedId = updatedProduct.id ?? updatedProduct._id;
      setCurrentProducts((prev) =>
        prev.map((p) => ((p.id ?? p._id) === updatedId ? { ...p, ...updatedProduct } : p)),
      );
      setProductsByCategory((prev) => ({
        ...prev,
        [formData.categoryCode]: (prev[formData.categoryCode] || []).map((p) =>
          (p.id ?? p._id) === updatedId ? { ...p, ...updatedProduct } : p,
        ),
      }));
      refreshProducts();

      // Handle category change
      const catId =
        typeof selectedProduct?.category === "object"
          ? (selectedProduct.category as { id?: string }).id
          : undefined;
      if (catId !== formData.categoryCode) {
        setSelectedCategoryId(formData.categoryCode as string);
      }

      toast.success(`Product "${formData.productName}" updated successfully`, {
        id: "product-updated",
      });

      setShowEditModal(false);
    } catch (err) {
      const _e = err as any;
      console.error("Error updating product:", err);
      toast.error(
        _e.response?.data?.message || "Error updating product. Please check the data",
        { id: "product-update-error" },
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // 🔹 Delete Product
  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsDeleting(true);

    const categoryId =
      typeof selectedProduct.category === "object"
        ? (selectedProduct.category?.id ?? "")
        : (selectedProduct.category ?? "");
    const productName = selectedProduct.name;
    const deletedId = selectedProduct._id ?? selectedProduct.id;
    if (!deletedId) {
      toast.error("Unable to delete product: missing product ID", {
        id: "product-delete-no-id",
      });
      return;
    }
    try {
      await api.delete(`/product/delete/${deletedId}`, {
        // withCredentials: true,
      });
      setShowDeleteModal(false);
      setCurrentProducts((prev) => prev.filter((p) => p.id !== deletedId));
      setProductsByCategory((prev) => ({
        ...prev,
        [categoryId]: (prev[categoryId] || []).filter(
          (p) => p.id !== deletedId,
        ),
      }));
      toast.success(`Product "${productName}" deleted successfully`, {
        id: "product deleted",
      });
    } catch (err) {
      const _e = err as any;
      console.error("Error deleting product:", err);
      // 409 = server blocked deletion due to open orders — show the exact reason
      const msg = _e?.response?.data?.message || "Error deleting product";
      toast.error(msg, { id: "error deleting products", duration: 6000 });
    } finally {
      setIsDeleting(false);
    }
  };

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
            .animate-slideUp { animation: slideUp 0.3s ease-out; }
            .line-clamp-3 {
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Renders one Category Filter attribute's control (SELECT/MULTISELECT/BOOLEAN/
  // TEXT/NUMBER/DATE) against a single value + onChange — reused for both the
  // whole-product case (one control, attrValues) and the per-variant case (one
  // control per variant, variantAttrValues), so the type-specific JSX only lives
  // in one place. `value` is a single id/text, or (MULTISELECT) a comma-joined list.
  const renderAttrControl = (attr: CategoryAttr, value: string, onChange: (next: string) => void) => {
    if (attr.type === "SELECT") {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
        <div className="flex flex-wrap gap-2">
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
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
              >
                {v.value}
              </button>
            );
          })}
        </div>
      );
    }
    // BOOLEAN is id-based (real "Yes"/"No" CategoryAttributeValue rows the backend
    // seeds automatically), same as SELECT/MULTISELECT above — NOT free text. Storing
    // it as free text would make it impossible to filter, since filtering is entirely
    // id-based (see utils/attributeFilter.ts).
    if (attr.type === "BOOLEAN") {
      return (
        <div className="flex gap-3">
          {attr.values.map((v) => {
            const active = value === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange(active ? "" : v.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
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
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    );
  };

  // Any option axis name already in use on this product's variants (e.g. "Color")
  // gets its filter value set automatically from the option itself — see backend/src/
  // utils/optionFilterSync.ts. Showing a SECOND, manually-set picker for the same
  // attribute name under each variant row would just invite it to disagree with the
  // option that's actually driving that combination, so those are excluded from the
  // per-variant Category Filters list below; only attributes that aren't already one
  // of the product's own option axes still need a manual picker per variant.
  const variantOptionAxisNames = new Set(
    editingVariantsList.flatMap((v) => Object.keys(v.options ?? {}).map((k) => k.trim().toLowerCase())),
  );
  const perVariantCategoryAttrs = categoryAttrs.filter(
    (attr) => !variantOptionAxisNames.has(attr.name.trim().toLowerCase()),
  );

  // The "Show as filter to customers" toggle in the Add Options builder only fires at
  // the moment a combination is generated — once options already exist as variants,
  // that toggle is gone, leaving no way to check or change whether an axis is
  // currently a customer-facing filter. This surfaces one persistent row per option
  // axis already in use, wired straight to that axis's real CategoryAttribute.
  // isFilterable (matched by name, same as the exclusion above) — a no-op display row
  // if that axis was never turned into a filter yet (nothing to toggle until it
  // exists; regenerate with the option checked on to create it).
  const variantOptionAxisAttrs = [...variantOptionAxisNames].map((axisLower) => {
    const attr = categoryAttrs.find((a) => a.name.trim().toLowerCase() === axisLower) ?? null;
    const displayName =
      editingVariantsList
        .flatMap((v) => Object.keys(v.options ?? {}))
        .find((k) => k.trim().toLowerCase() === axisLower) ?? axisLower;
    return { axisLower, displayName, attr };
  });

  const toggleCategoryAttributeFilterable = async (attrId: string, next: boolean) => {
    try {
      await api.put(`/category/${formData.categoryCode}/attributes/${attrId}`, { isFilterable: next });
      setCategoryAttrs((prev) => prev.map((a) => (a.id === attrId ? { ...a, isFilterable: next } : a)));
    } catch {
      toast.error("Failed to update filter visibility");
    }
  };

  // Turning an axis's toggle on when it was never generated as a filter (no matching
  // CategoryAttribute exists yet) — reads the axis's real values straight off the
  // product's existing variants and creates the attribute + backfills every matching
  // variant server-side (productVariant.controller.ts's syncVariantOptionFilter), so
  // this works without retyping anything or leaving the product.
  const createFilterFromOption = async (optionName: string) => {
    const productId = (selectedProduct?._id ?? selectedProduct?.id) as string | undefined;
    if (!productId) return;
    setSyncingFilterAxis(optionName);
    try {
      const res = await api.post(`/product/${productId}/variants/sync-filter`, { optionName });
      toast.success(res.data.message ?? `"${optionName}" is now a filter`);
      const attrsRes = await api.get(`/category/${formData.categoryCode}/attributes`);
      const attrs: CategoryAttr[] = (attrsRes.data.attributes ?? []).filter(
        (a: CategoryAttr) => a.type !== "RATING" && a.type !== "PRICE",
      );
      setCategoryAttrs(attrs);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create filter");
    } finally {
      setSyncingFilterAxis(null);
    }
  };

  // A single "Price (from) ₹X" figure happened to read back the exact same number as
  // whichever option row was cheapest right below it in the read-only Product Details
  // modal — looked like a copy-paste mistake rather than an intentional summary. A
  // min–max range (or a single value when every active option is priced the same)
  // reads as its own distinct figure instead of echoing one specific row.
  const detailVariantPriceRange = (() => {
    if (!detailProductVariants) return null;
    const activePrices = detailProductVariants
      .filter((v) => v.isActive)
      .map((v) => v.priceOverride ?? (parseFloat(String(detailProduct?.price ?? 0)) || 0));
    if (activePrices.length === 0) return null;
    const min = Math.min(...activePrices);
    const max = Math.max(...activePrices);
    return { min, max };
  })();

  // --- RENDERING ---

  return (
    <div className={embedded ? "" : "min-h-screen bg-slate-50/50 font-sans"}>
      <div className={embedded ? "" : "w-full pt-6 pb-12 px-6 sm:px-8"}>
        {!embedded && (
        <>
        {/* Premium Dashboard Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Product Management Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Organize your retail inventory catalogs by active database categories, inspect stock levels, and coordinate master item variations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!canAdd) {
                  toast.error("You don't have permission to add products");
                  return;
                }
                navigate(`${dashboardBase}/manage-products/add-products`);
              }}
              disabled={!canAdd}
              title={canAdd ? undefined : "You don't have permission to add products"}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
                canAdd
                  ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
              }`}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Categories</div>
            <div className="text-2xl font-black text-slate-900">{categories.length}</div>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Products Count</div>
            <div className="text-2xl font-black text-slate-900">{totalProducts}</div>
          </div>
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-xs">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Active Products</div>
            <div className="text-2xl font-black text-emerald-900">
              {currentProducts.filter(p => p.isActive !== false).length}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 shadow-xs">
            <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">Out of Stock</div>
            <div className="text-2xl font-black text-rose-900">
              {currentProducts.filter(p => (p.stock || 0) <= 0).length}
            </div>
          </div>
        </div>
        </>
        )}

        <div className={embedded ? "" : "flex flex-col xl:flex-row gap-6 xl:gap-8"}>
          {/* Category Sidebar */}
          {!embedded && (
          <div className="w-full xl:w-1/4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 h-fit xl:sticky top-20">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center justify-between">
              <span>Categories</span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                {categories.length} total
              </span>
            </h2>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition duration-200"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>

            <nav className="space-y-2 max-h-[550px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => {
                  const categoryId = category._id ?? category.id;
                  const isSelected = selectedCategoryId === categoryId;
                  return (
                    <button
                      key={categoryId}
                      onClick={() => setSelectedCategoryId(categoryId)}
                      className={`w-full text-left flex justify-between items-center px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate pr-2">{category.name || "No Name"}</span>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
                        }`}
                      >
                        {category.code || "NO CODE"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-10 px-4">
                  <FaSearch className="text-slate-300 text-2xl mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    {categories.length === 0
                      ? "No categories available yet."
                      : "No categories match search."}
                  </p>
                </div>
              )}
            </nav>
          </div>
          )}

          {/* Product Detail/List */}
          <div className={embedded ? "w-full" : "w-full xl:w-3/4"}>
            <div className={embedded ? "" : "bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80"}>
              {/* Product Header & Filters */}
              <div className="flex flex-col space-y-4 mb-8 border-b border-slate-100 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                      {selectedCategoryName
                        ? `${selectedCategoryName} Products`
                        : embedded || lockedCategoryId
                          ? "Products"
                          : "Select a Category"}
                    </h2>
                    {(selectedCategoryName || embedded || lockedCategoryId) && (
                      <p className="text-slate-500 text-xs font-medium mt-1">
                        {totalProducts > 0
                          ? `Showing ${filteredProductsToDisplay.length} of ${totalProducts} items`
                          : "No products in this category"}
                      </p>
                    )}
                  </div>

                  {selectedCategoryId && (
                    <div className="flex items-center gap-2">
                      {currentProducts.length > 0 && (
                        /* View Mode Toggle */
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              viewMode === "grid"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                            title="Grid View"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              viewMode === "table"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                            title="Table View"
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Refresh Button */}
                      <button
                        onClick={refreshProducts}
                        disabled={loadingProducts}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer"
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${loadingProducts ? "animate-spin" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {loadingProducts ? "Loading…" : "Refresh"}
                      </button>

                      {embedded && onAddProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!canAdd) {
                              toast.error("You don't have permission to add products");
                              return;
                            }
                            onAddProduct();
                          }}
                          disabled={!canAdd}
                          title={canAdd ? undefined : "You don't have permission to add products"}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 ${
                            canAdd
                              ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white hover:shadow-lg cursor-pointer"
                              : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Product
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Search & Filter Bar — stays visible while a filter is active even
                    if it currently yields zero results, so there's always a way to see/clear it */}
                {selectedCategoryId &&
                  (currentProducts.length > 0 ||
                    statusFilter !== "all" ||
                    productSearchQuery ||
                    activeAttributeValueIds.length > 0) && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search products by name or code..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition duration-200"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                      {productSearchQuery && (
                        <button
                          onClick={() => setProductSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "active", label: "Active" },
                          { id: "disabled", label: "Disabled" },
                          { id: "out_of_stock", label: "Out of Stock" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setStatusFilter(f.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            statusFilter === f.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attribute filters — same subtree-aware panel the storefront uses, but in
                    the compact "toolbar" layout (each attribute collapses into a popover
                    trigger) rather than the sidebar's always-expanded vertical stack —
                    this bar has to stay a fixed, compact height no matter how many
                    attributes a category ends up with, or how many values each has. */}
                {selectedCategoryId && (
                  <div className="pt-1">
                    <AttributeFilterPanel
                      key={selectedCategoryId}
                      categoryId={selectedCategoryId}
                      onFiltersChange={(f) => setActiveAttributeValueIds(f.attributeValueIds)}
                      layout="toolbar"
                    />
                  </div>
                )}
              </div>

              {selectedCategoryId &&
                (loadingProducts ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <ProductSkeletonCard key={i} />
                    ))}
                  </div>
                ) : productFetchError ? (
                  <div className="text-center py-16 bg-rose-50/50 rounded-2xl border border-rose-100">
                    <FaBoxOpen size={48} className="text-rose-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-rose-800 mb-2">
                      Failed to load products
                    </h3>
                    <p className="text-rose-600 text-xs max-w-md mx-auto mb-4">
                      {productFetchError}
                    </p>
                    <button
                      onClick={refreshProducts}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors text-xs font-semibold shadow-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredProductsToDisplay.length > 0 ? (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {filteredProductsToDisplay.map((prod) => (
                          <DashboardProductCard
                            key={prod.id}
                            product={prod}
                            handleEditClick={handleEditClick}
                            handleDeleteClick={handleDeleteClick}
                            handleViewProduct={handleViewProduct}
                            handleToggleStatus={handleToggleStatus}
                            handleManageVariants={setVariantsModalProduct}
                            canEdit={canEdit}
                            canDelete={canDelete}
                          />
                        ))}
                      </div>
                    ) : (
                      /* Table View Mode */
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider">
                            <tr>
                              <th className="py-3.5 px-4">Product</th>
                              <th className="py-3.5 px-4">Code</th>
                              <th className="py-3.5 px-4">Price</th>
                              <th className="py-3.5 px-4">Cost</th>
                              <th className="py-3.5 px-4">Stock</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredProductsToDisplay.map((prod) => {
                              const imageUrl = resolveProductImage(prod.image);
                              return (
                                <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors group">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={imageUrl}
                                        alt={prod.name}
                                        className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-200/60 p-1 flex-shrink-0"
                                      />
                                      <span className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                        {prod.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                                    <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px]">
                                      {prod.code || "NO CODE"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                                    ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-500">
                                    {prod.purchasePrice ? `₹${Number(prod.purchasePrice).toLocaleString("en-IN")}` : "—"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                        (prod.stock || 0) > 0
                                          ? "bg-slate-100 text-slate-700 border-slate-200/80"
                                          : "bg-rose-50 text-rose-700 border-rose-200/80"
                                      }`}
                                    >
                                      {(prod.stock || 0) > 0 ? `${prod.stock} units` : "Out of stock"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStatus(prod)}
                                        title={prod.isActive !== false ? "Click to Disable Product" : "Click to Enable Product"}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                          prod.isActive !== false
                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                            : "bg-slate-300 hover:bg-slate-400"
                                        }`}
                                      >
                                        <span className="sr-only">Toggle Status</span>
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                            prod.isActive !== false ? "translate-x-4" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                          prod.isActive !== false
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${prod.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                        {prod.isActive !== false ? "Active" : "Disabled"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleViewProduct(prod)}
                                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="View Details"
                                      >
                                        <FaInfoCircle className="h-4 w-4" />
                                      </button>
                                      <ActionModel
                                        onEdit={() => handleEditClick(prod)}
                                        onDelete={() => handleDeleteClick(prod)}
                                        onManageVariants={() => setVariantsModalProduct(prod)}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                        <p className="text-xs font-semibold text-slate-500 hidden sm:block">
                          Page <span className="font-extrabold text-slate-900">{currentPage}</span> of{" "}
                          <span className="font-extrabold text-slate-900">{totalPages}</span>
                        </p>

                        <div className="flex items-center gap-1 mx-auto sm:mx-0">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Prev
                          </button>

                          {(() => {
                            const pages: (number | "...")[] = [];
                            if (totalPages <= 7) {
                              for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              if (currentPage > 3) pages.push("...");
                              for (
                                let i = Math.max(2, currentPage - 1);
                                i <= Math.min(totalPages - 1, currentPage + 1);
                                i++
                              )
                                pages.push(i);
                              if (currentPage < totalPages - 2) pages.push("...");
                              pages.push(totalPages);
                            }
                            return pages.map((p, idx) =>
                              p === "..." ? (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400">
                                  …
                                </span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() => handlePageChange(p as number)}
                                  className={`min-w-[32px] px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                                    p === currentPage
                                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {p}
                                </button>
                              ),
                            );
                          })()}

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/40 text-center shadow-xs">
                    
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                      No products found
                    </h3>
                    <p className="text-slate-500 text-xs max-w-md mx-auto mb-5 leading-relaxed">
                      {productSearchQuery ? (
                        <>No catalog items match your search query <span className="font-semibold text-slate-900">"{productSearchQuery}"</span>.</>
                      ) : (
                        <>There are currently no products registered under <span className="font-bold text-slate-900">"{selectedCategoryName}"</span>.</>
                      )}
                    </p>
                    
                  </div>
                ))}

              {!selectedCategoryId && (
                <div className="text-center py-20 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200/80">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <FaBoxOpen size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Select a Category
                  </h3>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Choose a category from the left sidebar to inspect, filter, and manage catalog items.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🛠 Updated Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center  backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full sm:w-[90%] md:w-[75%] lg:w-[60%] max-h-[90vh] overflow-y-auto">
              {/* HEADER */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 ">
                      Edit Product
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Update product details and image
                    </p>
                  </div>

                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition"
                  >
                    <FaTimes className="text-slate-500" />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <div className="p-6">
                <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-6">
                  {/* Category — fixed once a product exists, not editable here. Its
                      variants/options and any auto-synced Category Filters are tied to
                      this category, so switching it isn't a safe inline edit. */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600">
                      {categories.find((cat) => (cat._id ?? cat.id) === formData.categoryCode)?.name ?? "—"}
                    </div>
                  </div>

                  {/* Product Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Code
                    </label>
                    <input
                      type="text"
                      name="productCode"
                      maxLength={20}
                      value={formData.productCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50"
                      required
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="productName"
                      maxLength={100}
                      value={formData.productName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50"
                      required
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Eg: Nike, Adidas…"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50"
                    />
                  </div>

                  {/* Price / Stock / Discount — a single consolidated summary once the
                      product has variants (all four numbers come from the same place:
                      the option combinations below), otherwise the normal editable
                      fields for a plain single-SKU product. */}
                  {editingVariantStock?.hasVariants ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                          <Squares2X2Icon className="w-3.5 h-3.5 shrink-0" />
                          From variants
                        </div>
                        <button
                          type="button"
                          onClick={scrollToVariantsSection}
                          className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 whitespace-nowrap"
                        >
                          Edit in Variants ↓
                        </button>
                      </div>
                      <div className="pt-3 border-t border-indigo-100 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Purchase Price</span>
                          <span className="text-sm font-semibold text-slate-900">₹{formData.purchasePrice || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Selling Price</span>
                          <span className="text-sm font-semibold text-slate-900">₹{formData.price}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Margin</span>
                          {formData.purchasePrice !== "" &&
                          formData.price !== "" &&
                          parseFloat(String(formData.purchasePrice)) > 0 ? (
                            <span
                              className={`text-sm font-semibold ${parseFloat(String(formData.price)) - parseFloat(String(formData.purchasePrice)) >= 0 ? "text-emerald-600" : "text-red-500"}`}
                            >
                              ₹
                              {(
                                parseFloat(String(formData.price)) - parseFloat(String(formData.purchasePrice))
                              ).toFixed(0)}{" "}
                              (
                              {(
                                ((parseFloat(String(formData.price)) - parseFloat(String(formData.purchasePrice))) /
                                  parseFloat(String(formData.purchasePrice))) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">—</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Stock</span>
                          <span className="text-sm font-semibold text-slate-900">{editingVariantStock.total} units</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Discount</span>
                          <span className="text-sm font-semibold text-slate-900">{formData.discount || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Purchase Price */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Purchase Price
                            <span className="ml-2 text-xs text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Cost
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="purchasePrice"
                              value={formData.purchasePrice}
                              onChange={handleChange}
                              placeholder="e.g. 1200"
                              className="w-full px-4 py-3 rounded-xl border border-amber-100 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-200"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-semibold">
                              ₹
                            </span>
                          </div>
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Base / MRP Price
                            <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold">
                              Original
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="price"
                              value={formData.price}
                              onChange={handleChange}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                              required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                              ₹
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Profit indicator & Live Final Customer Price Calculator */}
                      {formData.price !== "" && parseFloat(String(formData.price)) > 0 && (
                        <div className="space-y-2">
                          {/* Live Discount Calculation Preview */}
                          {formData.discount !== "" && parseFloat(String(formData.discount)) > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-800">Final Customer Price:</span>
                                <span className="font-mono text-base font-extrabold text-emerald-900">
                                  ₹{calculateDiscountedPrice(formData.price, formData.discount)}
                                </span>
                              </div>
                              <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                                Save ₹{calculateDiscountAmount(formData.price, formData.discount)} ({formData.discount}% OFF)
                              </span>
                            </div>
                          )}

                          {formData.purchasePrice !== "" && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                              <span>Margin (from base price):</span>
                              <span
                                className={`font-bold ${parseFloat(String(formData.price)) - parseFloat(String(formData.purchasePrice || 0)) >= 0 ? "text-emerald-600" : "text-red-500"}`}
                              >
                                ₹
                                {(
                                  parseFloat(String(formData.price)) -
                                  parseFloat(String(formData.purchasePrice || 0))
                                ).toFixed(2)}
                              </span>
                              {parseFloat(String(formData.purchasePrice)) > 0 && (
                                <span className="text-slate-400">
                                  (
                                  {(
                                    ((parseFloat(String(formData.price)) -
                                      parseFloat(String(formData.purchasePrice))) /
                                      parseFloat(String(formData.purchasePrice))) *
                                    100
                                  ).toFixed(1)}
                                  %)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stock */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50"
                          required
                        />
                      </div>

                      {/* Discount, Discount Amount & Final Offer Price */}
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Discount % */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Discount %{" "}
                              <span className="text-xs text-slate-400">
                                (0 to 100)
                              </span>
                            </label>
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
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                                %
                              </span>
                            </div>
                          </div>

                          {/* Discount Amount (₹ off) */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Discount Amount{" "}
                              <span className="text-xs text-amber-600 font-medium">
                                (₹ off)
                              </span>
                            </label>
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
                                className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/30 text-amber-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-semibold">
                                ₹
                              </span>
                            </div>
                          </div>

                          {/* Final Offer Price (₹) Calculator */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Final Offer Price{" "}
                              <span className="text-xs text-emerald-600 font-medium">
                                (Selling ₹)
                              </span>
                            </label>
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
                                className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/30 text-emerald-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400"
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

                  {/* Variants / Images / Preview — tabbed so the modal doesn't keep
                      growing taller as variants pile up (see editSectionTab). Full modal
                      width so a variant row's Stock/Price/Discount fields get real room —
                      see VariantsManagerFields.tsx. */}
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                    {(
                      [
                        { key: "variants", label: "Variants", count: editingVariantsList.length },
                        {
                          key: "images",
                          label: "Images",
                          count: (imagePreview ? 1 : 0) + existingAdditionalImages.length + additionalPreviews.length,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setEditSectionTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          editSectionTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span className="truncate">{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`shrink-0 inline-flex items-center justify-center min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold ${
                              editSectionTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Variants — managed inline right here instead of a separate modal,
                      so nothing about a variant product needs a second screen. See
                      VariantsManagerFields.tsx (shared with the standalone
                      ProductVariantsModal, still reachable from the product list's
                      "..." menu as a shortcut). Category Filters lives in here too now
                      — once options exist, each variant row shows its own filter
                      controls (see the categoryFilters prop below); before any options
                      exist, there's nothing to scope a filter value to yet, so a plain
                      whole-product picker shows above the option builder instead. */}
                  {editSectionTab === "variants" && (
                  <div id="edit-variants-section" className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-4 scroll-mt-4">
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Squares2X2Icon className="w-3.5 h-3.5" />
                        Variants
                      </p>
                    </div>
                    {variantOptionAxisAttrs.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2.5">
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                          Filter visibility
                        </p>
                        {variantOptionAxisAttrs.map(({ axisLower, displayName, attr }) => {
                          const isOn = attr?.isFilterable ?? false;
                          const isSyncing = syncingFilterAxis === displayName;
                          return (
                            <div key={axisLower} className="flex items-center justify-between gap-3">
                              <span className="text-sm text-slate-700">{displayName}</span>
                              <button
                                type="button"
                                disabled={isSyncing}
                                onClick={() =>
                                  attr
                                    ? toggleCategoryAttributeFilterable(attr.id, !attr.isFilterable)
                                    : createFilterFromOption(displayName)
                                }
                                className="inline-flex items-center gap-2 text-xs text-slate-500 disabled:opacity-40"
                              >
                                {isSyncing ? "Syncing…" : isOn ? "Shown to customers" : "Hidden from customers"}
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
                    {!editingVariantStock?.hasVariants && categoryAttrs.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-3">
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                          Category Filters
                        </p>
                        {categoryAttrs.map((attr) => (
                          <div key={attr.id}>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              {attr.name}
                              {attr.isRequired && (
                                <span className="text-red-500 ml-0.5">*</span>
                              )}
                            </label>
                            {renderAttrControl(attr, attrValues[attr.id] ?? "", (next) =>
                              setAttrValues((prev) => ({ ...prev, [attr.id]: next })),
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(selectedProduct?._id ?? selectedProduct?.id) && (
                      <VariantsManagerFields
                        ref={variantsManagerRef}
                        productId={(selectedProduct._id ?? selectedProduct.id) as string}
                        onVariantsChanged={() =>
                          refreshEditingVariantStock((selectedProduct._id ?? selectedProduct.id) as string)
                        }
                        categoryFilters={{
                          attrs: perVariantCategoryAttrs,
                          getValue: (variantId, attributeId) => variantAttrValues[`${variantId}:${attributeId}`] ?? "",
                          onChange: (variantId, attributeId, next) =>
                            setVariantAttrValues((prev) => ({ ...prev, [`${variantId}:${attributeId}`]: next })),
                        }}
                        basePrice={selectedProduct.price ?? null}
                        basePurchasePrice={selectedProduct.purchasePrice ?? null}
                        productImages={[selectedProduct.image, ...(selectedProduct.images ?? [])].filter(Boolean) as string[]}
                      />
                    )}
                  </div>
                  )}

                  {editSectionTab === "images" && (
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
                              New image selected
                            </span>
                          )}
                        </div>

                        {imagePreview ? (
                          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                            {/* Thumbnail container */}
                            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group flex items-center justify-center shrink-0">
                              <img
                                src={resolveProductImage(imagePreview)}
                                alt={formData.productName || "Product"}
                                className="w-full h-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                onClick={() => {
                                  setLightboxImage(resolveProductImage(imagePreview));
                                  setLightboxTitle(`Primary Image — ${formData.productName || selectedProduct?.name || "Product"}`);
                                }}
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm pointer-events-none">
                                Primary
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setLightboxImage(resolveProductImage(imagePreview));
                                  setLightboxTitle(`Primary Image — ${formData.productName || selectedProduct?.name || "Product"}`);
                                }}
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
                                  {formData.image
                                    ? formData.image.name
                                    : (selectedProduct?.name ? `${selectedProduct.name} main image` : "Saved primary image")}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {formData.image
                                    ? `Size: ${(formData.image.size / 1024).toFixed(0)} KB (Ready to upload)`
                                    : "Saved on server"}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <label
                                  htmlFor="productImage"
                                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <Camera className="h-3.5 w-3.5" />
                                  Change Image
                                </label>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxImage(resolveProductImage(imagePreview));
                                    setLightboxTitle(`Primary Image — ${formData.productName || selectedProduct?.name || "Product"}`);
                                  }}
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
                                      setImagePreview(selectedProduct?.image || "");
                                      toast.success("Reverted to original primary image", { id: "primary-revert" });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer"
                                    title="Revert to original saved image"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Revert
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="productImage"
                            className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl bg-white hover:bg-indigo-50/20 cursor-pointer transition-all text-center group"
                          >
                            <div className="p-3 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition mb-2">
                              <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-600 transition" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">
                              Upload Primary Image
                            </span>
                            <span className="text-xs text-slate-400 mt-1">
                              PNG, JPG, WEBP up to 1MB
                            </span>
                          </label>
                        )}

                        <input
                          type="file"
                          id="productImage"
                          name="image"
                          accept="image/*"
                          onChange={handleChange}
                          className="hidden"
                        />

                        {editingVariantsList.length > 0 && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-slate-700 mt-2">
                            <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                            <span>
                              This product has {editingVariantsList.length} options — photos for each variant are managed directly in the{" "}
                              <button
                                type="button"
                                onClick={() => setEditSectionTab("variants")}
                                className="font-bold text-indigo-700 underline hover:text-indigo-900 cursor-pointer"
                              >
                                Variants tab
                              </button>.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* GALLERY IMAGES - Only shown for single-SKU products without variants */}
                      {editingVariantsList.length === 0 && (
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
                            {existingAdditionalImages.length + formData.additionalImages.length}/5
                          </span>
                        </div>

                        {/* Gallery Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {/* Existing images */}
                          {existingAdditionalImages.map((url, i) => (
                            <div
                              key={`existing-${i}`}
                              className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-center"
                            >
                              <img
                                src={resolveProductImage(url)}
                                alt={`gallery ${i + 1}`}
                                className="w-full h-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                onClick={() => {
                                  setLightboxImage(resolveProductImage(url));
                                  setLightboxTitle(`Gallery Image ${i + 1} — ${formData.productName || selectedProduct?.name || "Product"}`);
                                }}
                              />
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-sm pointer-events-none">
                                #{i + 1}
                              </div>

                              {/* Preview Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setLightboxImage(resolveProductImage(url));
                                  setLightboxTitle(`Gallery Image ${i + 1} — ${formData.productName || selectedProduct?.name || "Product"}`);
                                }}
                                className="absolute top-2 left-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Full View Preview"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeExistingImage(url)}
                                className="absolute top-2 right-2 p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Remove this gallery image"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* New images to be added */}
                          {additionalPreviews.map((url, i) => (
                            <div
                              key={`new-${i}`}
                              className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-emerald-300 bg-emerald-50/50 shadow-xs hover:shadow-md transition-all flex items-center justify-center"
                            >
                              <img
                                src={url}
                                alt={`new gallery ${i + 1}`}
                                className="w-full h-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                onClick={() => {
                                  setLightboxImage(url);
                                  setLightboxTitle(`New Gallery Image ${i + 1}`);
                                }}
                              />
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs pointer-events-none">
                                New
                              </div>

                              {/* Preview Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setLightboxImage(url);
                                  setLightboxTitle(`New Gallery Image ${i + 1}`);
                                }}
                                className="absolute top-2 left-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Full View Preview"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeNewAdditionalImage(i)}
                                className="absolute top-2 right-2 p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all cursor-pointer hover:scale-110 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Remove unsaved image"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* Add Images Dropzone */}
                          {existingAdditionalImages.length + formData.additionalImages.length < 5 && (
                            <label
                              htmlFor="editAdditionalImages"
                              className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all p-3 text-center group shadow-2xs"
                            >
                              <div className="p-2.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition">
                                <Upload className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                                Add Image
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {5 - (existingAdditionalImages.length + formData.additionalImages.length)} remaining
                              </span>
                            </label>
                          )}
                        </div>

                        <input
                          type="file"
                          id="editAdditionalImages"
                          multiple
                          accept="image/*"
                          onChange={handleAdditionalImages}
                          className="hidden"
                        />

                        {/* Undo Banner for removed images */}
                        {formData.removeImages.length > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mt-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>
                                {formData.removeImages.length} gallery image{formData.removeImages.length > 1 ? "s" : ""} will be deleted upon saving.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={restoreRemovedImages}
                              className="font-bold text-indigo-700 hover:text-indigo-900 underline hover:no-underline cursor-pointer ml-3 shrink-0"
                            >
                              Undo All
                            </button>
                          </div>
                        )}
                        </div>
                      )}
                    </div>
                  )}



                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Description
                        </label>
                        <button
                          type="button"
                          onClick={applyBoldToEditDescription}
                          title="Bold (Ctrl+B) - Select text to bold"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors shadow-xs cursor-pointer"
                        >
                          <Bold className="w-3 h-3" />
                          <span>Bold</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={editDescriptionTextareaRef}
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      onKeyDown={handleEditDescriptionKeyDown}
                      onPaste={handleEditDescriptionPaste}
                      rows={4}
                      placeholder="Describe this product in detail... (Select text and click Bold, paste rich text, or use **word** / <b>word</b>)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 resize-y focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  {/* SEO — both optional; falls back to product name/description when unset. */}
                  <div className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">SEO <span className="font-normal normal-case text-slate-400">(optional)</span></p>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">Meta Title</label>
                        <span className="text-xs font-medium text-slate-500">{formData.metaTitle.length}/70</span>
                      </div>
                      <input
                        type="text"
                        name="metaTitle"
                        value={formData.metaTitle}
                        onChange={handleChange}
                        maxLength={70}
                        placeholder={formData.productName || "Defaults to the product name"}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                        <span className="text-xs font-medium text-slate-500">{formData.metaDescription.length}/160</span>
                      </div>
                      <textarea
                        name="metaDescription"
                        value={formData.metaDescription}
                        onChange={handleChange}
                        rows={2}
                        maxLength={160}
                        placeholder="Defaults to the description above, trimmed to fit"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white resize-none"
                      />
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="sticky bottom-0 z-10 -mx-6 md:mx-0 bg-white/95 backdrop-blur-sm flex justify-end gap-3 px-6 md:px-0 py-4 mt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800
             text-white flex items-center justify-center gap-2
             disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? (
                        <>
                          <LoaderSpinner />
                          Updating...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>

                {/* Confirm dialog — replaces window.confirm so it matches the app's styling */}
                {unpricedConfirmCount !== null && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm">
                              {unpricedConfirmCount} variant{unpricedConfirmCount === 1 ? "" : "s"} have no price set
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              None of this product's variants have a Selling or Purchase Price yet. Saving now will
                              set them all to ₹0, making this product purchasable for free while it stays Active.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 px-5 pb-5">
                        <button
                          onClick={() => {
                            setUnpricedConfirmCount(null);
                            proceedUpdate();
                          }}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition"
                        >
                          Save as ₹0 anyway
                        </button>
                        <button
                          onClick={() => setUnpricedConfirmCount(null)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showProductDetailModal && detailProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* HEADER */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-5 border-b border-slate-100 flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    Product Details
                  </p>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5 truncate">
                    {detailProduct.name}
                  </h2>
                </div>
                <button
                  onClick={() => setShowProductDetailModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                >
                  <FaTimes />
                </button>
              </div>

              {/* BODY */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                {/* IMAGE + badges */}
                <div className="space-y-3">
                  <div className="relative group aspect-square flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    {detailProduct.image ? (
                      <>
                        <img
                          src={`${resolveProductImage(detailProduct.image)}?v=${detailProduct.updatedAt || Date.now()}`}
                          alt={detailProduct.name}
                          className="h-full w-full object-contain p-2 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => {
                            setLightboxImage(resolveProductImage(detailProduct.image));
                            setLightboxTitle(`Primary Image — ${detailProduct.name}`);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxImage(resolveProductImage(detailProduct.image));
                            setLightboxTitle(`Primary Image — ${detailProduct.name}`);
                          }}
                          className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-950 text-white shadow-md backdrop-blur-sm transition-all cursor-pointer hover:scale-110 flex items-center justify-center"
                          title="View Full Size"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <FaImage className="text-6xl text-slate-300" />
                    )}
                  </div>

                  {/* Gallery Thumbnails in Detail View */}
                  {detailProduct.images && detailProduct.images.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Gallery ({detailProduct.images.length})
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {detailProduct.images.map((gUrl, gIdx) => (
                          <button
                            key={gIdx}
                            type="button"
                            onClick={() => {
                              setLightboxImage(resolveProductImage(gUrl));
                              setLightboxTitle(`Gallery #${gIdx + 1} — ${detailProduct.name}`);
                            }}
                            className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 bg-white p-0.5 transition-all shrink-0 cursor-pointer hover:scale-105"
                            title={`View Gallery Image ${gIdx + 1}`}
                          >
                            <img src={resolveProductImage(gUrl)} alt="" className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {detailProduct.brand && (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {detailProduct.brand}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono">
                      {detailProduct.code}
                    </span>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="space-y-4 min-w-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                        {detailProduct.discount && detailProduct.discount > 0 && !(detailProductVariants && detailProductVariants.length > 0) ? "Discounted Price" : "Price"}
                      </p>
                      <p className="text-lg font-bold text-emerald-700 mt-0.5">
                        {detailProduct.discount && detailProduct.discount > 0 && !(detailProductVariants && detailProductVariants.length > 0) ? (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xl font-extrabold text-slate-900 font-mono">
                              ₹{calculateDiscountedPrice(detailProduct.price, detailProduct.discount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-slate-400 line-through font-mono">
                              ₹{Number(detailProduct.price).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {detailProduct.discount}% OFF
                            </span>
                          </div>
                        ) : detailProductVariants && detailProductVariants.length > 0 ? (
                          detailVariantPriceRange &&
                          detailVariantPriceRange.min === detailVariantPriceRange.max ? (
                            <>₹{detailVariantPriceRange.min}</>
                          ) : (
                            <>₹{detailVariantPriceRange?.min} – ₹{detailVariantPriceRange?.max}</>
                          )
                        ) : (
                          <>₹{detailProduct.price}</>
                        )}
                      </p>
                    </div>
                    {detailProduct.stock !== undefined && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {detailProductVariants && detailProductVariants.length > 0 ? "Stock (total)" : "Stock"}
                        </p>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">
                          {detailProduct.stock} <span className="text-sm font-medium text-slate-400">units</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {detailProductVariants && detailProductVariants.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Squares2X2Icon className="w-3.5 h-3.5" />
                        Options
                      </p>
                      <div className="space-y-3">
                        {detailProductVariants.map((v) => (
                          <div
                            key={v.id}
                            className={`rounded-2xl border px-5 py-4 ${
                              v.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className={`text-base font-semibold ${v.isActive ? "text-slate-800" : "text-slate-400"}`}>
                                {Object.entries(v.options).map(([axis, value]) => `${axis}: ${value}`).join(" · ")}
                              </span>
                              {!v.isActive && (
                                <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 text-xs font-semibold">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-5 mt-2.5">
                              <span className={`text-xl font-bold ${v.isActive ? "text-slate-900" : "text-slate-400"}`}>
                                ₹{v.priceOverride ?? detailProduct.price}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  !v.isActive ? "text-slate-400" : v.stock > 0 ? "text-slate-600" : "text-rose-500"
                                }`}
                              >
                                {v.stock} in stock
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <div 
                      className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-2 [&_b]:font-bold [&_b]:text-slate-900 [&_strong]:font-bold [&_strong]:text-slate-900"
                      dangerouslySetInnerHTML={{ __html: formatProductDescription(detailProduct.description) }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
                  <TrashIcon className="h-8 w-8 text-red-600" />
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                  Delete Product
                </h3>

                {/* Message */}
                <p className="text-slate-600 mb-2">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-slate-900">
                    {selectedProduct?.name}
                  </span>
                  ?
                </p>

                {/* Product Meta */}
                <p className="text-sm text-slate-500 mb-2">
                  Code: {selectedProduct?.code} • Price: ₹
                  {selectedProduct?.price}
                </p>

                <p className="text-sm text-slate-500 mb-8">
                  This action cannot be undone. The product will be permanently
                  removed.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
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
                      "Delete Product"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <ProductVariantsModal
          product={variantsModalProduct}
          onClose={() => {
            // If the edit form is still open behind this modal for the same product,
            // refresh its read-only stock total — it may have just changed.
            const closedId = variantsModalProduct?._id ?? variantsModalProduct?.id;
            const editingId = selectedProduct?._id ?? selectedProduct?.id;
            if (showEditModal && closedId && closedId === editingId) {
              refreshEditingVariantStock(closedId);
            }
            setVariantsModalProduct(null);
          }}
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
                <div className="flex items-center gap-2 text-white min-w-0">
                  <ImageIcon className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-sm font-bold truncate">
                    {lightboxTitle || "Product Image — Full View"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/40 min-h-[300px]">
                <img
                  src={lightboxImage}
                  alt={lightboxTitle || "Product full view"}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg select-none"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

    </div>
  );
};

export default Listproducts;
