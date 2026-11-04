import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { sanitizeHtml, formatProductDescription } from "../utils/sanitizeHtml";
import {
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { 
  Heart, 
  ShoppingBag, 
  Check, 
  ArrowRight,
  ZoomIn,
  Share2,
  Tag,
  FileText,
  Sparkles,
  X
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import toast from 'react-hot-toast';
import { motion } from "framer-motion";
import FooterSection from "../components/FooterSection";
import DeliveryLocationModal from "./DeliveryLocationModal";
import ShareProductModal from "../components/ShareProductModal";

// Components & Context
import api from "../utils/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import PageSeo from "../components/seo/PageSeo";
import { ProductJsonLd, BreadcrumbJsonLd } from "../components/seo/JsonLd";
import { trackMetaViewContent, trackMetaAddToCart } from "../utils/metaPixel";

interface ProductVariantOption {
  id: string;
  /** Admin-named axes, e.g. { Storage: "128GB", Color: "Black" } or { Weight: "1kg" }
   * — see backend/src/models/mongoose.ts's ProductVariant. */
  options: Record<string, string>;
  stock: number;
  priceOverride: number | null;
  /** Falls back to the product's own discount when null — see ProductVariant. */
  discountOverride: number | null;
  image?: string | null;
  secondaryImage?: string | null;
  images?: string[];
  isActive: boolean;
  /** This variant's own rating, independent of the parent product's overall rating —
   * see review.controller.ts's recalcVariantRating. 0 until it has its own reviews. */
  rating?: number;
  numReviews?: number;
}

interface DetailProduct {
  id: string;
  code?: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  images?: string[];
  stock?: number;
  description?: string;
  category?: { name?: string } | string;
  discount?: number;
  sizes?: string[];
  rating?: number;
  numReviews?: number;
  metaTitle?: string;
  metaDescription?: string;
  materialCare?: string;
  customSections?: Array<{ heading: string; content: string }>;
  specifications?: Array<{ key: string; value: string }>;
  attributeValues?: Array<{
    attribute?: { name?: string; type?: string };
    attributeValue?: { value?: string };
    textValue?: string;
  }>;
  /** Present only when an admin has defined size/color combinations for this product
   * (see ProductVariant) — an empty/absent array means it's a plain single-SKU
   * product, same as every product before this feature existed. */
  variants?: ProductVariantOption[];
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock?: number;
  category?: { name?: string } | string;
  discount?: number;
}

interface ReviewUser {
  id: string;
  username: string;
  avatar?: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  variantId?: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewDistribution {
  star: number;
  count: number;
}

// ── Star Rating Display ───────────────────────────────────────────────────────
function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= Math.round(rating)
          ? <StarSolid key={star} className={`${sz} text-amber-500`} />
          : <StarIcon key={star} className={`${sz} text-neutral-200`} />
      ))}
    </div>
  );
}

// ── Interactive Star Picker ───────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(value === star ? star - 1 : star)}
          className="transition-all hover:scale-110 active:scale-95 text-neutral-300 hover:text-amber-500"
        >
          {(hovered || value) >= star
            ? <StarSolid className="h-7 w-7 text-amber-500" />
            : <StarIcon className="h-7 w-7 text-neutral-300" />}
        </button>
      ))}
    </div>
  );
}

// ── Clean Minimal Standard Review Section ───────────────────────────────────
function ReviewSection({
  productId,
  variantId,
  variantLabel,
  needsVariantSelection,
  optionAxesLabel,
  isAuthenticated,
  onReviewChange,
}: {
  productId: string;
  /** The currently-selected variant, if the product has variants — reviews and the
   * rating shown here are scoped to this exact variant, independently of any other
   * option of the same product (see review.controller.ts's recalcVariantRating). */
  variantId?: string | null;
  /** e.g. "65W" or "128GB / Black" — shown so it's unambiguous which option a review
   * will attach to, instead of silently landing on the whole product. */
  variantLabel?: string | null;
  /** True when the product has variants but none is selected yet — same guard
   * add-to-cart/wishlist already use (see ProductDetailPage's needsVariantSelection),
   * applied here too so a review can't silently fall back to a product-level review
   * the shopper never intended. */
  needsVariantSelection?: boolean;
  /** e.g. "Power" or "Storage / Color" — used in the prompt telling the shopper what
   * to pick before they can review. */
  optionAxesLabel?: string;
  isAuthenticated: boolean;
  onReviewChange?: () => Promise<unknown> | void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [distribution, setDistribution] = useState<ReviewDistribution[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [, setCanReview] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const handleOpenForm = () => {
      if (isAuthenticated && !myReview) {
        setEditMode(false);
        setShowForm(true);
      } else if (!isAuthenticated) {
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      }
    };
    window.addEventListener("open-review-form", handleOpenForm);
    return () => window.removeEventListener("open-review-form", handleOpenForm);
  }, [isAuthenticated, myReview]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.get(`/reviews/${productId}`, { params: variantId ? { variantId } : undefined });
      setReviews(res.data.reviews);
      setAvg(res.data.avg);
      setDistribution(res.data.distribution);
      setFeatureEnabled(true);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } }).response?.status === 403) {
        setFeatureEnabled(false);
      }
    }
  }, [productId, variantId]);

  const loadMyReview = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get(`/reviews/my/${productId}`, { params: variantId ? { variantId } : undefined });
      setMyReview(res.data.review || null);
      setCanReview(res.data.canReview);
      if (res.data.review) {
        setRating(res.data.review.rating);
        setComment(res.data.review.comment || "");
      } else {
        // No review for THIS variant — reset the form instead of leaving a stale
        // rating/comment from whichever variant was selected before.
        setRating(5);
        setComment("");
      }
    } catch {
      // ignore
    }
  }, [productId, variantId, isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadReviews(), loadMyReview()]).finally(() => setLoading(false));
  }, [loadReviews, loadMyReview]);

  if (!featureEnabled) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Not just a UI nicety — without this, submitting with the option picker still
    // untouched would silently save a whole-product review instead of the specific
    // variant the shopper thinks they're rating.
    if (!editMode && needsVariantSelection) {
      toast.error(`Select ${optionAxesLabel ?? "an option"} above before writing a review.`, { id: "review-needs-variant" });
      return;
    }
    setSubmitting(true);
    try {
      if (editMode && myReview) {
        const reviewId = myReview.id || (myReview as any)._id;
        await api.patch(`/reviews/${reviewId}`, { rating, comment });
        toast.success("Review updated!", { id: "review-update" });
      } else {
        await api.post(`/reviews/${productId}`, { rating, comment, variantId: variantId ?? undefined });
        toast.success("Review submitted!", { id: "review-submit" });
      }
      await Promise.all([loadReviews(), loadMyReview()]);
      if (onReviewChange) await onReviewChange();
      setShowForm(false);
      setEditMode(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to submit review";
      toast.error(msg, { id: "review-error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      const reviewId = myReview.id || (myReview as any)._id;
      await api.delete(`/reviews/${reviewId}`);
      toast.success("Review deleted", { id: "review-delete" });
      setMyReview(null);
      setRating(5);
      setComment("");
      setShowForm(false);
      await loadReviews();
      if (onReviewChange) onReviewChange();
    } catch {
      toast.error("Failed to delete review", { id: "review-delete-err" });
    }
  };

  const startEdit = () => {
    if (!myReview) return;
    setRating(myReview.rating);
    setComment(myReview.comment || "");
    setEditMode(true);
    setShowForm(true);
  };

  const totalReviews = reviews.length;
  const sortedDistribution = [...distribution].sort((a, b) => b.star - a.star);

  return (
    <section id="reviews-section" className="mt-16 pt-6 max-w-4xl mx-auto px-4 font-sans">
      
      {/* ── Section Header (Line removed above) ── */}
      <div className="flex items-center justify-between gap-3 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-base sm:text-xl font-bold tracking-wider text-gray-900 uppercase">
            Customer Reviews
          </h2>
          {variantLabel && (
            <p className="text-xs text-gray-500 mt-1">Showing reviews for: <span className="font-semibold text-gray-700">{variantLabel}</span></p>
          )}
        </div>

        {isAuthenticated ? (
          !myReview && !showForm && (
            needsVariantSelection ? (
              <p className="text-xs text-gray-400 italic max-w-[220px] text-right">
                Select {optionAxesLabel ?? "an option"} above to write a review
              </p>
            ) : (
              <button
                onClick={() => { setEditMode(false); setShowForm(true); }}
                style={{
                  backgroundColor: "var(--theme-primary)",
                  color: "var(--theme-primary-ink, #ffffff)",
                }}
                className="px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest hover:opacity-90 active:scale-95 transition-all rounded-md sm:rounded-sm shadow-xs cursor-pointer shrink-0 text-center leading-tight sm:leading-normal"
              >
                Write a Review
              </button>
            )
          )
        ) : (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openCustomerAuth"))}
            style={{
              backgroundColor: "var(--theme-primary)",
              color: "var(--theme-primary-ink, #ffffff)",
            }}
            className="px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest hover:opacity-90 active:scale-95 transition-all rounded-md sm:rounded-sm shadow-xs cursor-pointer shrink-0 text-center leading-tight sm:leading-normal"
          >
            Log in to Write a Review
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <BeatLoader size={8} color="#000" />
        </div>
      ) : (
        <div className="pt-8">
          {/* ── Summary Row: Score & Progress Bars ── */}
          {totalReviews > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-start pb-10 border-b border-gray-200">
              
              {/* Score summary */}
              <div className="sm:col-span-5 flex flex-col items-start">
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
                    {avg.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">out of 5</span>
                </div>
                <div className="mt-2">
                  <StarDisplay rating={avg} size="lg" />
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>

              {/* Progress Bars */}
              <div className="sm:col-span-7 space-y-2">
                {sortedDistribution.map(({ star, count }) => {
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs text-gray-600 font-medium">
                      <span className="w-10 text-gray-500">{star} ★</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: "var(--theme-primary)",
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-400 font-mono text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 pb-10 border-b border-gray-200">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">No reviews yet. Be the first to review this product!</p>
            </div>
          )}

          {/* ── Form Section ── */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-8 p-6 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4 pb-2 border-b border-gray-200">
                {editMode ? "Edit your review" : "Write a review"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Rating</label>
                  <StarPicker value={rating} onChange={setRating} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Review Comment</label>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your review here..."
                    className="w-full bg-white border border-gray-300 rounded-sm p-3 text-sm text-gray-900 focus:border-black focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-right text-[11px] text-gray-400 font-mono">{comment.length}/1000</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditMode(false); }}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors rounded-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    style={{
                      backgroundColor: "var(--theme-primary)",
                      color: "var(--theme-primary-ink, #ffffff)",
                    }}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all rounded-sm flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {submitting ? <BeatLoader size={6} color="currentColor" /> : editMode ? "Update" : "Submit"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── User's Active Review ── */}
          {myReview && !showForm && (
            <div className="my-6 p-5 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <StarDisplay rating={myReview.rating} />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Your Review</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={startEdit} className="font-bold text-gray-700 hover:text-black hover:underline">Edit</button>
                  <span className="text-gray-300">•</span>
                  <button onClick={handleDelete} className="font-bold text-red-600 hover:text-red-800 hover:underline">Delete</button>
                </div>
              </div>
              {myReview.comment ? (
                <p className="text-sm text-gray-700 leading-relaxed mt-2">{myReview.comment}</p>
              ) : (
                <p className="text-xs italic text-gray-400 mt-1">Rating left without written comment.</p>
              )}
            </div>
          )}

          {/* ── Reviews Stream List ── */}
          {reviews.length > 0 && (
            <div className="divide-y divide-gray-200">
              {reviews.map((r) => (
                <div key={r.id || (r as any)._id} className="py-7 first:pt-4 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">{r.user.username}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  <div className="mb-2">
                    <StarDisplay rating={r.rating} />
                  </div>

                  {r.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed max-w-3xl whitespace-pre-line">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// --- HELPERS ---
const safeRender = (value: unknown, fallback = ""): string => {
  if (!value) return fallback;
  if (typeof value === 'object' && value !== null && 'name' in value) return (value as {name: string}).name;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function classNames(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

// --- MODERN CARD COMPONENT ---
const ModernProductCard = React.memo(function ModernProductCard({ product, addToCart, cartItems }: { product: RelatedProduct; addToCart: (productId: string) => Promise<unknown>; cartItems: { productId: string }[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInCart = cartItems.some((item) => String(item.productId) === String(product.id));
  const imageUrl = product.image || "https://placehold.co/600x800?text=No+Image";

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
    window.scrollTo(0,0);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.isAuthenticated) {
      toast.error("Please login to add items to your cart", { id: "login-to-add-cart" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    if (isInCart) {
      toast.error("This item is already in your cart", { id: "This item is already in your cartmnmnm" });
      return;
    }

    try {
      await addToCart(product.id);
      const productPrice = product.discount && product.discount > 0 
        ? calculateDiscountedPrice(product.price, product.discount)
        : (product.price ?? 0);
      trackMetaAddToCart({
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: "product",
        value: productPrice,
        currency: "INR",
      });
      toast.success(`${product.name} added to cart`, { id: "added-to-cart-related-product" });
    } catch (err: any) {
      if (err?.message !== "Not authenticated") {
        toast.error(err?.response?.data?.message || "Failed to add to cart", {
          id: "failed-add-related-product",
        });
      }
    }
  };

  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isProductInWishlist(product.id);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.isAuthenticated) {
      toast.error("Please login to add product to wishlist", { id: "login-to-wishlist" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }
    const success = await toggleWishlist(product.id);
    if (success) {
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist", {id:"wishlist-toggle-related"});
    }
  };

  const categoryName = typeof product.category === 'object' 
    ? product.category?.name 
    : product.category;

  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const discountedPrice = hasDiscount
    ? Math.round(calculateDiscountedPrice(product.price, product.discount!))
    : Math.round(Number(product.price));
  const originalPrice = Math.round(Number(product.price));

  return (
    <div 
      onClick={handleCardClick}
      className="group flex flex-col w-full cursor-pointer select-none transition-transform duration-300"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-50 shadow-xs border border-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={handleToggleWishlist}
          className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-10 flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:scale-110 hover:bg-white active:scale-90 border border-gray-200/60 cursor-pointer"
        >
          <Heart className={classNames("h-4 w-4 transition-colors", isWishlisted ? "fill-red-500 text-red-500 stroke-red-500" : "text-gray-700 stroke-[1.75]")} />
        </button>
      </div>

      <div className="mt-2.5 sm:mt-3 flex flex-col items-start text-left px-0.5 font-sans">
        <h3 className="w-full text-xs sm:text-[13px] font-normal text-gray-800 leading-snug line-clamp-1 group-hover:text-black transition-colors text-left">{product.name}</h3>
        <div className="mt-1 flex items-center justify-start gap-2 text-xs sm:text-[13px] font-sans flex-wrap">
          {hasDiscount ? (
            <>
              <span className="text-gray-400 line-through font-normal text-[11px] sm:text-xs">
                ₹ {originalPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-gray-950 font-medium">
                From ₹ {discountedPrice.toLocaleString("en-IN")}
              </span>
            </>
          ) : (
            <span className="text-gray-950 font-medium">
              ₹ {originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// --- MAIN DETAIL PAGE COMPONENT ---
export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  // Arriving from a listing card that already represents one specific variant (see
  // components/AllProducts.tsx / cart/CategoryProductPage.tsx's expanded cards) —
  // that option should already be selected here, not reset to "pick an option".
  const [searchParams] = useSearchParams();
  const preselectedVariantId = searchParams.get("variantId");
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  const { cartItems, addToCart, fetchCart, updateQuantity, openCartDrawer } = useCart();
  const { user } = useAuth();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isBuyNowHovered, setIsBuyNowHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
    setIsZoomed((prev) => !prev);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 45 && selectedImageIndex > 0) {
      setIsZoomed(false);
      setSelectedImageIndex((i) => i - 1);
    } else if (deltaX < -45 && selectedImageIndex < galleryImages.length - 1) {
      setIsZoomed(false);
      setSelectedImageIndex((i) => i + 1);
    }
    setTouchStartX(null);
  };

  const [quantity, setQuantity] = useState<number>(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const handleToggleDescription = () => {
    if (isDescriptionExpanded) {
      if (descriptionRef.current) {
        descriptionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setIsDescriptionExpanded(false);
    } else {
      setIsDescriptionExpanded(true);
    }
  };
  // Empty until the shopper picks every axis — see the option picker below and the
  // auto-select effect further down (skips the picker for axes with only one option).
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedSimpleSize, setSelectedSimpleSize] = useState<string>("");

  const combinedSpecs = useMemo(() => {
    const list: Array<{ key: string; value: string }> = [];
    const seen = new Set<string>();

    if (Array.isArray(product?.specifications)) {
      for (const s of product.specifications) {
        if (s && s.key && s.value) {
          const k = s.key.trim();
          if (!seen.has(k.toLowerCase())) {
            seen.add(k.toLowerCase());
            list.push({ key: k, value: s.value.trim() });
          }
        }
      }
    }

    if (Array.isArray(product?.attributeValues)) {
      for (const av of product.attributeValues) {
        const name = av?.attribute?.name?.trim();
        const val = av?.attributeValue?.value?.trim() || av?.textValue?.trim();
        if (name && val) {
          if (!seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            list.push({ key: name, value: val });
          }
        }
      }
    }

    return list;
  }, [product?.specifications, product?.attributeValues]);

  // Admin-named axes actually used by this product's variants — e.g. ["Storage",
  // "Color"] for a phone, ["Weight"] for groceries, [] for a plain single-SKU
  // product. Order follows first appearance across variants (Set preserves
  // insertion order), so the picker's row order matches how the admin built them.
  // Memoized: this and activeVariants below were previously recomputed from scratch
  // on every render (including every quantity/selectedOptions keystroke) even though
  // they only ever change when the fetched product itself changes.
  const optionAxes = useMemo(
    () => [...new Set((product?.variants ?? []).flatMap((v) => Object.keys(v.options || {})))],
    [product?.variants],
  );
  const hasVariants = (product?.variants?.length ?? 0) > 0;
  // Used in validation toasts/buttons below — e.g. "Storage / Color" or "Weight".
  const optionAxesLabel = optionAxes.join(" / ") || "an option";
  // product.variants includes disabled variants too now (see product-user.controller.ts's
  // productCard) so the option picker's display order stays fixed regardless of which
  // ones an admin has toggled off — but a customer can only ever land on an active one.
  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.isActive),
    [product?.variants],
  );

  const selectedVariant = hasVariants
    ? activeVariants.find((v) =>
        optionAxes.every((axis) => v.options[axis] === selectedOptions[axis]),
      ) ?? null
    : null;

  // For a variant product, "in wishlist" means this SPECIFIC option is saved — matches
  // ModernProductCard's own listing-level (productId, variantId) identity, so wishing
  // one size doesn't show every other size as saved too.
  const isInWishlist = product ? isProductInWishlist(product.id, selectedVariant?.id ?? null) : false;

  // Once a product has variants, ITS OWN stock/price are meaningless (see
  // product-user.controller.ts's productCard) — everything below reads from the
  // selected variant instead, falling back to the product's own fields for a plain
  // single-SKU product (selectedVariant is always null for those).
  const effectiveStock = selectedVariant ? selectedVariant.stock : hasVariants ? 0 : (product?.stock ?? 0);
  const effectivePrice = selectedVariant?.priceOverride ?? product?.price ?? 0;
  // A variant's own discount (e.g. a promo on just one option) wins over the
  // product-level one — see mongoose.ts's ProductVariant discountOverride.
  const effectiveDiscount = selectedVariant ? (selectedVariant.discountOverride ?? 0) : (product?.discount ?? 0);

  // A ?variantId= from the listing card wins outright — select every axis of that
  // exact variant. Otherwise fall back to pre-selecting any axis that only has one
  // real value, so the shopper isn't asked to click a choice that isn't actually one.
  // Resets whenever the product itself changes.
  useEffect(() => {
    const preselected = preselectedVariantId
      ? activeVariants.find((v) => v.id === preselectedVariantId)
      : null;
    if (preselected) {
      setSelectedOptions({ ...preselected.options });
      return;
    }
    const initial: Record<string, string> = {};
    optionAxes.forEach((axis) => {
      const values = [...new Set(activeVariants.map((v) => v.options[axis]).filter(Boolean))];
      if (values.length === 1) initial[axis] = values[0];
    });
    setSelectedOptions(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, preselectedVariantId]);

  // When selected variant changes and it has its own image, automatically jump to first image
  useEffect(() => {
    setIsZoomed(false);
    if (selectedVariant && (selectedVariant.image || selectedVariant.secondaryImage)) {
      setSelectedImageIndex(0);
    }
  }, [selectedVariant?.id]);

  const cartItem = cartItems.find(
    (item) =>
      String(item.productId) === String(productId) &&
      String(item.variantId ?? "") === String(selectedVariant?.id ?? ""),
  );
  const isAlreadyAdded = !!cartItem;

  useEffect(() => {
    if (cartItem && cartItem.quantity) {
      setQuantity(cartItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [cartItem?.quantity, productId, selectedVariant?.id]);

  const handleDecreaseQuantity = async () => {
    if (quantity <= 1) return;
    const newQty = quantity - 1;
    setQuantity(newQty);
    if (isAlreadyAdded && product) {
      try {
        await updateQuantity(product.id, newQty, selectedVariant?.id ?? null);
      } catch {
        toast.error("Failed to update quantity", { id: "qty-update-error" });
      }
    }
  };

  const handleIncreaseQuantity = async () => {
    if (!product) return;
    if (hasVariants && !selectedVariant) {
      toast.error(`Please select ${optionAxesLabel} first`, { id: "select-variant-first" });
      return;
    }
    if (quantity >= effectiveStock) {
      toast.error(`Only ${effectiveStock} item(s) available in stock`, { id: "max-stock-reached" });
      return;
    }
    const newQty = quantity + 1;
    setQuantity(newQty);
    if (isAlreadyAdded) {
      try {
        await updateQuantity(product.id, newQty, selectedVariant?.id ?? null);
      } catch {
        toast.error("Failed to update quantity", { id: "qty-update-error" });
      }
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedImageIndex(0);
        window.scrollTo(0, 0);
        const res = await api.get(`/user/shop/product/${productId}`);
        setProduct(normalizeProduct(res.data.product));
        setRelatedProducts((res.data.relatedProducts || []).map(normalizeProduct));
      } catch (err) {
        const _e = err as any;
        console.error(err);
        setError(_e.response?.status === 404 ? "Product not found" : "Error loading product");
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchProduct();
  }, [productId]);

  // Track Meta Pixel ViewContent event when product details are viewed
  useEffect(() => {
    if (product) {
      const finalPrice = product.discount && product.discount > 0
        ? calculateDiscountedPrice(product.price, product.discount)
        : (product.price ?? 0);
      trackMetaViewContent({
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: "product",
        value: finalPrice,
        currency: "INR",
      });
    }
  }, [product?.id]);


  const handleMainAddToCart = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user.isAuthenticated) {
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error(`Please select ${optionAxesLabel}`, { id: "select-variant-first" });
      return;
    }
    if (effectiveStock <= 0) {
      toast.error("Sorry, this product is out of stock.", { id: "sorry product is out of stooooooooooockkkk" });
      return;
    }

    if (isAlreadyAdded) {
      toast.success("Already in your cart!", { id: "already-in-cart" });
      openCartDrawer();
      return;
    }

    setIsAdding(true);
    try {
      if (addToCart) {
        await addToCart(product.id, { quantity, variantId: selectedVariant?.id ?? null });
        toast.success(`Added ${product.name} (${quantity}) to cart`, { id: "added productsss" });
        openCartDrawer();
      } else {
        const cartData = { productId: product.id, quantity, variantId: selectedVariant?.id ?? null };
        await api.post(`/cart/add`, cartData);
        fetchCart();
        toast.success(`${product.name} added to cart!`, { id: "added to cart done" });
        openCartDrawer();
      }

      const finalUnitPrice = selectedVariant
        ? (selectedVariant.discountOverride
            ? calculateDiscountedPrice(selectedVariant.priceOverride ?? product.price, selectedVariant.discountOverride)
            : (selectedVariant.priceOverride ?? product.price))
        : (product.discount
            ? calculateDiscountedPrice(product.price, product.discount)
            : (product.price ?? 0));

      trackMetaAddToCart({
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: "product",
        value: finalUnitPrice * quantity,
        currency: "INR",
      });
    } catch (err) {
      const _e = err as any;
      if (_e.response?.status === 401) {
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      } else {
        toast.error(_e.response?.data?.message || "Failed to add to cart", { id: "failedddddddd" });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user.isAuthenticated) {
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error(`Please select ${optionAxesLabel}`, { id: "select-variant-first" });
      return;
    }
    if (effectiveStock <= 0) {
      toast.error("Sorry, this product is out of stock.", { id: "buynow-oos" });
      return;
    }
    setShowDeliveryModal(true);
  };

  const handleRelatedAddToCart = async (productId: string): Promise<void> => {
    if (!addToCart) return;
    await addToCart(productId);
  };

  const handleToggleWishlist = async () => {
    if (!user?.isAuthenticated) {
      toast.error("Please login to add product to wishlist", { id: "login-to-wishlist" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }
    if (!product) return;
    if (hasVariants && !selectedVariant) {
      toast.error(`Please select ${optionAxesLabel}`, { id: "select-variant-first" });
      return;
    }
    const success = await toggleWishlist(product.id, selectedVariant?.id ?? null);
    if (success) {
      toast.success(isInWishlist ? "Removed from Wishlist" : "Added to Wishlist!",{id:"removed or add to wishlist"});
    }
  };

  const variantImages = useMemo(() => {
    if (!selectedVariant) return [];
    const list: string[] = [];
    if (selectedVariant.image) list.push(selectedVariant.image);
    if (selectedVariant.secondaryImage && selectedVariant.secondaryImage !== selectedVariant.image) {
      list.push(selectedVariant.secondaryImage);
    }
    return list;
  }, [selectedVariant]);

  const baseProductImages = useMemo(() => {
    return [product?.image, ...(product?.images ?? [])].filter(Boolean) as string[];
  }, [product?.image, product?.images]);

  const allImages = useMemo(() => {
    // If a variant is selected and has its own photos, show EXCLUSIVELY the variant's photos (Slot 1 & Slot 2)
    // to prevent mixing different colors/angles into the gallery.
    if (variantImages.length > 0) {
      return variantImages;
    }
    return baseProductImages;
  }, [variantImages, baseProductImages]);

  if (loading) return <div className="h-screen flex justify-center items-center bg-white"><BeatLoader color="#000" /></div>;
  if (error || !product) return <div className="text-center py-20 text-red-600 font-semibold">{error || "Unavailable"}</div>;

  const getImgSrc = (img: string) => normalizeProduct({ image: img }).image || "https://placehold.co/600x800?text=No+Image";
  const galleryImages = allImages.length > 0 ? allImages : [""];

  const stock = effectiveStock;
  // Distinct from "needs a size/color picked" below — this only means "the selected
  // (or only possible) combination has zero stock," not "nothing picked yet".
  const isOutOfStock = hasVariants ? !!selectedVariant && selectedVariant.stock <= 0 : (product.stock ?? 0) <= 0;
  const needsVariantSelection = hasVariants && !selectedVariant;
  const categoryName = safeRender(product.category, "Collection");
  const hasDiscount = effectiveDiscount > 0;
  const discountedPrice = hasDiscount ? calculateDiscountedPrice(effectivePrice, effectiveDiscount) : effectivePrice;

  // Meta description falls back to the product's own (HTML) description, stripped to
  // plain text and trimmed to a search-result-friendly length.
  const seoDescription =
    product.metaDescription?.trim() ||
    product.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
    undefined;

  return (
    <div className="bg-white min-h-screen font-sans">
      <PageSeo
        title={product.metaTitle?.trim() || product.name}
        description={seoDescription}
        image={allImages[0]}
        path={`/products/${product.id}`}
      />
      <ProductJsonLd
        product={{
          id: product.id,
          name: product.name,
          description: seoDescription,
          brand: product.brand,
          code: product.code || product.id,
          price: discountedPrice,
          image: product.image,
          images: product.images,
          inStock: !isOutOfStock,
          rating: product.rating,
          numReviews: product.numReviews,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: categoryName, path: "/products" },
          { name: product.name, path: `/products/${product.id}` },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 mt-[var(--app-header-h,5rem)]">

        {/* --- BREADCRUMB / BACK --- */}
        <div className="mb-6 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors duration-300"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
            Go Back
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16 items-start">
          
          {/* --- LEFT: PRODUCT IMAGE GALLERY (Square referral style with centered product and navigation) --- */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center lg:items-start mb-8 lg:mb-0 lg:sticky lg:top-24 w-full"
          >
            {/* Main Image Card (Fitted portrait card without white side gaps) */}
            <div className="w-full max-w-[460px] xl:max-w-[490px]">
              <div
                className={`relative aspect-[3/4] max-h-[580px] xl:max-h-[620px] w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-100 border border-gray-200/80 shadow-xs select-none flex items-center justify-center ${
                  isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsZoomed(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Main Image with Zoom & Hover Scale — object-cover object-top fills the card completely */}
                <img
                  key={selectedImageIndex}
                  src={getImgSrc(galleryImages[selectedImageIndex])}
                  alt={`${safeRender(product.name)} view ${selectedImageIndex + 1}`}
                  className={`h-full w-full object-cover object-top select-none pointer-events-none transition-transform duration-200 ${
                    isZoomed ? "scale-[2.4]" : "scale-100 hover:scale-[1.02]"
                  }`}
                  style={
                    isZoomed
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                      : { transformOrigin: "center center" }
                  }
                  draggable={false}
                />

                {/* Prev / Next Carousel Navigation Arrows (Always visible like referral image) */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(false);
                        setSelectedImageIndex((i) => Math.max(0, i - 1));
                      }}
                      disabled={selectedImageIndex === 0}
                      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs border border-gray-200/80 shadow-md text-gray-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(false);
                        setSelectedImageIndex((i) => Math.min(galleryImages.length - 1, i + 1));
                      }}
                      disabled={selectedImageIndex === galleryImages.length - 1}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs border border-gray-200/80 shadow-md text-gray-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Bottom-Left Zoom Hint */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 bg-white/90 backdrop-blur-xs text-[11px] font-medium text-gray-700 px-2.5 py-1 rounded-md shadow-xs pointer-events-none flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity duration-200 border border-gray-200/60">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{isZoomed ? "Click to zoom out" : "Click to zoom"}</span>
                </div>
              </div>

              {/* Horizontal Thumbnail Rail directly underneath main square card */}
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-2.5 mt-3.5 overflow-x-auto w-full max-w-[460px] xl:max-w-[490px] py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setIsZoomed(false);
                        setSelectedImageIndex(i);
                      }}
                      className={`group/thumb shrink-0 w-14 aspect-[3/4] sm:w-16 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer bg-white ${
                        i === selectedImageIndex
                          ? "border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm opacity-100"
                          : "border-gray-200 hover:border-gray-400 opacity-60 hover:opacity-100 shadow-2xs"
                      }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img
                        src={getImgSrc(img)}
                        alt={`${safeRender(product.name)} thumbnail ${i + 1}`}
                        className="w-full h-full object-cover object-top pointer-events-none"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* --- RIGHT: PRODUCT DETAILS & BLACK BUTTON STACK --- */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.6, delay: 0.2 }}
             className="w-full px-2 sm:px-0"
          >
            {/* Title & Share Button */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 font-sans">
                {safeRender(product.name)}
              </h1>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowShareModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-950 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 mt-1"
                title="Share this product"
                aria-label="Share this product"
              >
                <Share2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Share</span>
              </button>
            </div>

            {/* Brand */}
            {product.brand && (
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                <span className="font-semibold text-gray-900">Brand:</span> {product.brand}
              </p>
            )}

            {/* Restored Rating Display Always Visible — the selected variant's own
                rating once one's picked, falling back to the product's overall rating
                for a variant-less product or before any option is chosen. */}
            <div className="flex items-center gap-2 mb-4">
              <StarDisplay rating={selectedVariant?.rating ?? product.rating ?? 0} />
            </div>

            {/* Price Header matching reference screenshot */}
            <div className="mb-5 font-sans">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#282c3f] tracking-tight">
                  ₹{Math.round(hasDiscount ? discountedPrice : effectivePrice).toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-base sm:text-lg text-gray-500 line-through font-normal">
                      MRP ₹{Math.round(effectivePrice).toLocaleString("en-IN")}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#ff905a]">
                      ({Math.round(Number(effectiveDiscount))}% OFF)
                    </span>
                  </>
                )}
              </div>
              
            </div>

            {/* Option Pickers */}
            {optionAxes.map((axis) => {
              const axisValues = [...new Set((product.variants ?? []).map((v) => v.options[axis]).filter(Boolean))];
              if (axisValues.length === 0) return null;
              const isSizeAxis = axis.toLowerCase().includes("size");

              return (
                <div className="mb-5" key={axis}>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {axis.toUpperCase()}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {axisValues.map((value) => {
                      const stockForValue = activeVariants
                        .filter(
                          (v) =>
                            v.options[axis] === value &&
                            optionAxes.every(
                              (otherAxis) =>
                                otherAxis === axis ||
                                !selectedOptions[otherAxis] ||
                                v.options[otherAxis] === selectedOptions[otherAxis],
                            ),
                        )
                        .reduce((sum, v) => sum + v.stock, 0);
                      const active = selectedOptions[axis] === value;
                      const isOutOfStockOption = stockForValue <= 0;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => {
                              const next = { ...prev };
                              if (active) delete next[axis];
                              else next[axis] = value;
                              return next;
                            })
                          }
                          disabled={isOutOfStockOption}
                          style={
                            active
                              ? {
                                  backgroundColor: "var(--theme-primary)",
                                  color: "var(--theme-primary-ink, #ffffff)",
                                  borderColor: "var(--theme-primary)",
                                }
                              : undefined
                          }
                          className={classNames(
                            "min-w-[48px] h-10 px-4 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center transition-all cursor-pointer",
                            active
                              ? "border-2 shadow-xs"
                              : isOutOfStockOption
                                ? "border border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50/60 line-through"
                                : "border border-slate-200 text-slate-800 hover:border-slate-400 bg-white shadow-2xs",
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Fallback Size Picker if product has sizes and no variant axis */}
            {optionAxes.length === 0 && product.sizes && product.sizes.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    SIZE
                  </label>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSimpleSize(s)}
                      style={
                        selectedSimpleSize === s
                          ? {
                              backgroundColor: "var(--theme-primary)",
                              color: "var(--theme-primary-ink, #ffffff)",
                              borderColor: "var(--theme-primary)",
                            }
                          : undefined
                      }
                      className={classNames(
                        "min-w-[48px] h-10 px-4 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center transition-all cursor-pointer",
                        selectedSimpleSize === s
                          ? "border-2 shadow-xs"
                          : "border border-slate-200 text-slate-800 hover:border-slate-400 bg-white shadow-2xs",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity:</span>
                <div className="inline-flex items-center border border-gray-300 rounded-md bg-white overflow-hidden shadow-2xs h-8">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1}
                    className="px-2.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <MinusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="px-3 text-xs font-bold text-gray-900 select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncreaseQuantity}
                    disabled={!needsVariantSelection && quantity >= stock}
                    className="px-2.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                {effectiveStock > 0 && effectiveStock <= 5 && (
                  <span className="text-xs font-semibold text-rose-600 animate-pulse">
                    Only {effectiveStock} left in stock!
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons Stack (Reflects Admin Theme Color) */}
            <div className="flex items-stretch gap-3 mb-3">
              {/* ADD TO BAG Button */}
              <button
                type="button"
                onClick={handleMainAddToCart}
                disabled={isAdding || isOutOfStock || needsVariantSelection}
                style={
                  !(isOutOfStock || needsVariantSelection)
                    ? {
                        backgroundColor: "var(--theme-primary)",
                        color: "var(--theme-primary-ink)",
                      }
                    : undefined
                }
                className={classNames(
                  "flex-1 sm:flex-[1.4] py-4 px-4 sm:px-6 rounded-md font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer",
                  isOutOfStock || needsVariantSelection
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "hover:brightness-95 hover:shadow-md",
                )}
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>
                  {isAdding ? (
                    <BeatLoader size={8} color="currentColor" />
                  ) : isOutOfStock ? (
                    "Out of Stock"
                  ) : needsVariantSelection ? (
                    `Select ${optionAxesLabel}`
                  ) : isAlreadyAdded ? (
                    "In Bag"
                  ) : (
                    "ADD TO BAG"
                  )}
                </span>
              </button>

              {/* WISHLIST Button */}
              <button
                type="button"
                onClick={handleToggleWishlist}
                className="flex-1 py-4 px-4 sm:px-6 rounded-md border border-gray-300 hover:border-gray-900 bg-white text-gray-900 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
              >
                <Heart
                  className={classNames(
                    "w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors",
                    isInWishlist ? "fill-red-500 text-red-500" : "text-gray-900",
                  )}
                />
                <span>{isInWishlist ? "WISHLISTED" : "WISHLIST"}</span>
              </button>
            </div>

            {/* Direct Buy Now button (Outlined with Theme Color, Fills on Hover) */}
            {!isOutOfStock && (
              <button
                type="button"
                onClick={handleBuyNow}
                onMouseEnter={() => setIsBuyNowHovered(true)}
                onMouseLeave={() => setIsBuyNowHovered(false)}
                disabled={isAdding || needsVariantSelection}
                style={
                  !(isAdding || needsVariantSelection)
                    ? {
                        borderColor: "var(--theme-primary)",
                        backgroundColor: isBuyNowHovered
                          ? "var(--theme-primary)"
                          : "#ffffff",
                        color: isBuyNowHovered
                          ? "var(--theme-primary-ink, #ffffff)"
                          : "var(--theme-primary)",
                      }
                    : undefined
                }
                className={classNames(
                  "w-full mb-6 py-3.5 px-4 rounded-md border-2 bg-white font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]",
                  isAdding || needsVariantSelection
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:!text-[var(--theme-primary-ink)] hover:shadow-xs",
                )}
              >
                BUY NOW
              </button>
            )}

            {/* Divider */}
            <div className="my-8 border-t border-gray-200" />

            {/* PRODUCT DETAILS Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-gray-950 flex items-center gap-2.5">
                PRODUCT DETAILS
                
              
              </h3>
            </div>

            {/* Product Description */}
            {product.description && (
              <div ref={descriptionRef} className="scroll-mt-28 mb-7">
                <div
                  className={`relative transition-all duration-300 ${
                    !isDescriptionExpanded && (product.description.length > 250 || product.description.includes("\n"))
                      ? "max-h-52 overflow-hidden"
                      : ""
                  }`}
                >
                  <div 
                    className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-3 [&>p]:mb-3 [&_b]:font-bold [&_b]:text-gray-950 [&_strong]:font-bold [&_strong]:text-gray-950"
                    dangerouslySetInnerHTML={{ __html: formatProductDescription(product.description) }}
                  />
                  {!isDescriptionExpanded && (product.description.length > 250 || product.description.includes("\n")) && (
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                  )}
                </div>

                {(product.description.length > 250 || product.description.includes("\n")) && (
                  <button
                    type="button"
                    onClick={handleToggleDescription}
                    style={{ color: "var(--theme-primary)" }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider hover:underline cursor-pointer select-none focus:outline-none"
                  >
                    <span>{isDescriptionExpanded ? "Show Less" : "Show More"}</span>
                    <span className="text-[10px]">{isDescriptionExpanded ? "▲" : "▼"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Custom Detail Sections / Material & Care */}
            {(() => {
              const sections = Array.isArray(product.customSections) && product.customSections.length > 0
                ? product.customSections.filter((s) => s && (s.heading?.trim() || s.content?.trim()))
                : (product.materialCare && product.materialCare.trim()
                    ? [{ heading: "Material & Care", content: product.materialCare.trim() }]
                    : []);

              return sections.map((sec, idx) => (
                <div key={idx} className="mb-7">
                  <h4 className="text-sm sm:text-base font-bold text-gray-950 mb-2">
                    {sec.heading}
                  </h4>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                </div>
              ));
            })()}

            {/* Specifications (2-Column Grid Matching Reference Screenshot) */}
            {combinedSpecs.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm sm:text-base font-bold text-gray-950 mb-5 uppercase tracking-wide">
                  Specifications
                </h4>
                <div className="grid grid-cols-2 gap-x-10 sm:gap-x-16 gap-y-5">
                  {combinedSpecs.map((spec, i) => (
                    <div key={i} className="border-b border-gray-200/90 pb-3">
                      <span className="block text-xs sm:text-sm font-normal text-gray-500 tracking-wide">
                        {spec.key}
                      </span>
                      <span className="block text-sm sm:text-base font-semibold text-gray-950 mt-1">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {relatedProducts.length > 0 && (
          <section className="mt-28">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-medium tracking-wide uppercase text-gray-950 font-sans">
                You May Also Like
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
              {relatedProducts.map((item) => (
                <ModernProductCard 
                  key={item.id} 
                  product={item} 
                  addToCart={handleRelatedAddToCart}
                  cartItems={cartItems}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        {productId && (
          <ReviewSection
            productId={productId}
            variantId={selectedVariant?.id ?? null}
            variantLabel={selectedVariant ? Object.values(selectedVariant.options).join(" / ") : null}
            needsVariantSelection={needsVariantSelection}
            optionAxesLabel={optionAxesLabel}
            isAuthenticated={user.isAuthenticated}
            onReviewChange={async () => {
              try {
                const res = await api.get(`/user/shop/product/${productId}`);
                setProduct(normalizeProduct(res.data.product));
              } catch (err) {
                console.error("Error refreshing product rating:", err);
              }
            }}
          />
        )}
      </main>

      <FooterSection/>

      {/* Delivery Modal */}
      {product && (
        <DeliveryLocationModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          product={{ id: product.id, name: safeRender(product.name), price: hasDiscount ? discountedPrice : effectivePrice, quantity: quantity, variantId: selectedVariant?.id ?? null }}
        />
      )}

      {/* Share Product Modal */}
      {product && (
        <ShareProductModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          product={{
            id: product.id,
            name: safeRender(product.name),
            image: getImgSrc(galleryImages[0] || product.image || ""),
            price: hasDiscount ? Math.round(discountedPrice) : Math.round(effectivePrice),
            brand: product.brand,
          }}
          variantLabel={selectedVariant ? Object.values(selectedVariant.options).join(" / ") : undefined}
        />
      )}
    </div>
  );
}