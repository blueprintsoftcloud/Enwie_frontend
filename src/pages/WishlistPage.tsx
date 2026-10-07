import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import toast from "react-hot-toast";
import { domainUrl } from "../utils/constant";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const BACKEND_BASE_URL = domainUrl.replace(/\/api\/?$/, "");

interface WishlistProduct {
  id?: string;
  _id?: string;
  name?: string;
  brand?: string;
  price?: number;
  image?: string;
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface WishlistProductCardProps {
  product: WishlistProduct;
  cardVariants: Variants;
}

// --- CUSTOM MODAL COMPONENT ---
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmationModalProps) => {
  useBodyScrollLock(isOpen);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border border-gray-100"
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Clear Wishlist?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to remove all items from your wishlist?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-all cursor-pointer"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// --- Component: WishlistProductCard ---
const WishlistProductCard = ({
  product,
  cardVariants,
}: WishlistProductCardProps) => {
  const { toggleWishlist } = useWishlist();
  const productId = product?.id ?? product?._id;

  if (!product || !productId) return null;
  const name = product?.name || "Product Name Missing";
  const formattedPrice =
    product?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(product.price)
      : "N/A";

  const imageUrl = product?.image
    ? product.image.startsWith("http")
      ? product.image
      : `${BACKEND_BASE_URL}/${product.image}`
    : "https://placehold.co/300x400/F3F4F6/9CA3AF?text=No+Image";

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const success = await toggleWishlist(productId, product.variantId);
    if (success) {
      toast.success(`${name} removed`, { id: "item removed" });
    } else {
      toast.error("Could not remove item", { id: "could not item removed" });
    }
  };

  return (
    <motion.div variants={cardVariants} className="group cursor-pointer">
      <Link
        to={product.variantId ? `/products/${productId}?variantId=${product.variantId}` : `/products/${productId}`}
        className="block"
      >
        {/* Image Container */}
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-lg">
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 z-10" />

          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover object-center transform transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Floating Remove Button */}
          <div className="absolute top-3 right-3 z-20 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            <button
              onClick={handleRemove}
              className="bg-white/95 backdrop-blur-xs p-2.5 rounded-full shadow-md hover:bg-red-50 transition-colors group/btn cursor-pointer"
              title="Remove from Wishlist"
            >
              <Trash2 className="w-4 h-4 text-gray-900 group-hover/btn:text-red-600" />
            </button>
          </div>
        </div>

        {/* Text Container */}
        <div className="mt-4 text-center relative px-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider line-clamp-1">
            {name}
          </h3>
          {product.variantOptions && Object.keys(product.variantOptions).length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 font-medium tracking-wide">
              {Object.entries(product.variantOptions)
                .map(([axis, value]) => `${axis}: ${value}`)
                .join(" · ")}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1 font-semibold tracking-wide">
            {formattedPrice}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

// --- Main WishlistPage Component ---
const WishlistPage = () => {
  const navigate = useNavigate();
  const {
    wishlistItems,
    loading,
    wishlistCount,
    clearWishlist,
  } = useWishlist();

  const [isClearModalOpen, setClearModalOpen] = useState(false);

  const handleClearConfirm = async () => {
    const success = await clearWishlist();
    setClearModalOpen(false);
    if (success) {
      toast.success("Wishlist cleared successfully", { id: "wishlist-cleared" });
    } else {
      toast.error("Failed to clear wishlist", { id: "wishlist-clear-fail" });
    }
  };

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const cardVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: "easeOut" as const },
    },
  };

  // --- Loading Skeleton ---
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="w-full aspect-[3/4] bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-white min-h-screen pt-[var(--app-header-h,5rem)] pb-24 relative overflow-hidden">
      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleClearConfirm}
      />

      {/* Background Decor */}
      <div
        className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 30%, transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-10">
        {/* Render header block when items exist */}
        {!loading && wishlistCount > 0 && (
          <>
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transform transition-transform group-hover:-translate-x-1" />
              <span>Go Back</span>
            </button>

            {/* Header Section */}
            <div className="text-center mb-12 relative">
              <h2
                className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-5xl"
                style={{ fontFamily: "var(--theme-font-heading)" }}
              >
                My Wishlist
              </h2>

              <div
                className="h-1 w-20 mx-auto mt-4 mb-6 rounded-full"
                style={{ background: "var(--theme-primary)" }}
              />

              <button
                type="button"
                onClick={() => setClearModalOpen(true)}
                className="group flex items-center justify-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                <span>Clear All Items</span>
                <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </>
        )}

        {/* Content Area */}
        {loading && wishlistCount === 0 ? (
          <LoadingSkeleton />
        ) : wishlistCount === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-2">
              Your Wishlist is Empty
            </h3>
            <p className="text-gray-500 font-light mb-8">
              Start exploring our collections to add items.
            </p>
            <Link
              to="/products"
              className="inline-block border-b border-gray-900 text-gray-900 pb-1 text-sm uppercase tracking-widest hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)] transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12"
          >
            {wishlistItems.map((product) => (
              <WishlistProductCard
                key={`${product.id ?? product._id ?? product.image ?? product.name ?? "wishlist-item"}-${product.variantId ?? ""}`}
                product={product}
                cardVariants={cardVariants}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default WishlistPage;
