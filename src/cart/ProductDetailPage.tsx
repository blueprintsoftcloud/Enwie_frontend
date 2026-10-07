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
  ZoomIn
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import toast from 'react-hot-toast';
import { motion } from "framer-motion";
import FooterSection from "../components/FooterSection";
import DeliveryLocationModal from "./DeliveryLocationModal";

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
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold tracking-wider text-gray-900 uppercase">
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
                className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all rounded-sm"
              >
                Write a Review
              </button>
            )
          )
        ) : (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("openCustomerAuth"))}
            className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all rounded-sm"
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
                          className="h-full bg-gray-900 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
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
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-gray-800 disabled:opacity-50 transition-colors rounded-sm flex items-center gap-2"
                  >
                    {submitting ? <BeatLoader size={6} color="#fff" /> : editMode ? "Update" : "Submit"}
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

  return (
    <div 
      onClick={handleCardClick}
      className="group flex flex-col w-full cursor-pointer transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-50 shadow-xs">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={handleToggleWishlist}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/60"
          >
            <Heart className={classNames("h-4 w-4 transition-colors", isWishlisted ? "fill-red-500 text-red-500" : "text-gray-900")} />
          </button>
          <button
            onClick={handleAddToCart}
            className={classNames(
              "flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/60",
              isInCart ? "bg-green-100 text-green-700 cursor-default" : "bg-white/90 text-gray-900 hover:bg-black hover:text-white"
            )}
          >
            {isInCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2 px-1">
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-gray-900 group-hover:text-[var(--theme-primary)] transition-colors">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {product.discount && product.discount > 0 ? (
              <>
                <span className="text-sm font-extrabold text-gray-900">
                  ₹{calculateDiscountedPrice(product.price, product.discount).toFixed(0)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  ₹{product.price?.toFixed(0)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  {product.discount}% OFF
                </span>
              </>
            ) : (
              <span className="text-sm font-extrabold text-gray-900">
                ₹{product.price?.toFixed(0)}
              </span>
            )}
          </div>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 group-hover:bg-black group-hover:text-white transition-colors duration-300 mt-1">
          <ArrowRight className="h-4 w-4" />
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
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  const { cartItems, addToCart, fetchCart, updateQuantity } = useCart();
  const { user } = useAuth();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
      return;
    }

    setIsAdding(true);
    try {
      if (addToCart) {
        await addToCart(product.id, { quantity, variantId: selectedVariant?.id ?? null });
        toast.success(`Added ${product.name} (${quantity}) to cart`, { id: "added productsss" });
      } else {
        const cartData = { productId: product.id, quantity, variantId: selectedVariant?.id ?? null };
        await api.post(`/cart/add`, cartData);
        fetchCart();
        toast.success(`${product.name} added to cart!`, { id: "added to cart done" });
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
      <main className="w-full max-w-[1440px] xl:max-w-[1536px] mx-auto px-4 pt-8 pb-16 sm:px-6 lg:px-8 xl:px-10 mt-(--app-header-h)">

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
          
          {/* --- LEFT: PORTRAIT IMAGE GALLERY (3:4 Portrait with left thumbnail strip and zoom) --- */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col-reverse lg:flex-row gap-3 sm:gap-4 mb-8 lg:mb-0 lg:sticky lg:top-24 items-start"
          >
            {/* Vertical Thumbnail Strip on Desktop, Horizontal on Mobile */}
            {galleryImages.length > 1 && (
              <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[640px] lg:w-20 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 lg:py-0 w-full lg:w-auto">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setIsZoomed(false);
                      setSelectedImageIndex(i);
                    }}
                    className={`group/thumb flex-shrink-0 w-16 h-20 sm:w-18 sm:h-22 lg:w-20 lg:h-24 rounded-xl overflow-hidden border border-gray-200/60 transition-all duration-300 cursor-pointer bg-gray-50 ${
                      i === selectedImageIndex
                        ? "scale-105 shadow-md opacity-100 z-10"
                        : "opacity-60 hover:opacity-100 hover:scale-102 shadow-xs"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={getImgSrc(img)}
                      alt={`${safeRender(product.name)} thumbnail ${i + 1}`}
                      className={`w-full h-full object-cover pointer-events-none transition-transform duration-300 ${
                        i === selectedImageIndex
                          ? "scale-110"
                          : "scale-100 group-hover/thumb:scale-105"
                      }`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Portrait Card (3:4 aspect ratio) with zoom and navigation */}
            <div className="flex-1 w-full min-w-0 max-w-[490px] xl:max-w-[500px]">
              <div
                className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-200/60 group shadow-sm select-none flex items-center justify-center ${
                  isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsZoomed(false)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Main Image with Zoom & Hover Scale */}
                <img
                  key={selectedImageIndex}
                  src={getImgSrc(galleryImages[selectedImageIndex])}
                  alt={`${safeRender(product.name)} view ${selectedImageIndex + 1}`}
                  className={`h-full w-full object-cover object-center select-none pointer-events-none transition-transform duration-200 ${
                    isZoomed ? "scale-[2.4]" : "scale-100 group-hover:scale-105"
                  }`}
                  style={
                    isZoomed
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                      : { transformOrigin: "center center" }
                  }
                  draggable={false}
                />

                {/* Prev / Next Carousel Navigation Arrows (Shown on Hover) */}
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm shadow-md text-gray-800 hover:bg-white disabled:opacity-0 group-hover:disabled:opacity-25 transition-all duration-200 cursor-pointer disabled:cursor-default opacity-0 group-hover:opacity-100"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm shadow-md text-gray-800 hover:bg-white disabled:opacity-0 group-hover:disabled:opacity-25 transition-all duration-200 cursor-pointer disabled:cursor-default opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Bottom-Right Image Count Badge */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full pointer-events-none">
                    {selectedImageIndex + 1} / {galleryImages.length}
                  </div>
                )}

                {/* Bottom-Left Zoom / Inspect Hint */}
                <div className="absolute bottom-4 left-4 z-10 bg-white/85 backdrop-blur-xs text-[11px] font-medium text-gray-700 px-2.5 py-1 rounded-md shadow-xs pointer-events-none flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-gray-200/50">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{isZoomed ? "Click to zoom out" : "Click to zoom • Move to inspect"}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- RIGHT: PRODUCT DETAILS & BLACK BUTTON STACK --- */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.6, delay: 0.2 }}
             className="px-2 sm:px-0"
          >
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 font-sans mb-1">
              {safeRender(product.name)}
            </h1>

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

            {/* Price Header with Green Discount Percentage Badge */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                      Rs. {discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-base text-gray-400 line-through">
                      Rs. {effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {/* Vibrant Green Discount Badge */}
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                      {effectiveDiscount}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                    Rs. {effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Option Pickers — one row per admin-defined axis (Storage, Color, Weight,
                Metal, whatever this product's variants use); a plain single-SKU
                product has optionAxes: [] and none of this renders. */}
            {optionAxes.map((axis) => {
              const axisValues = [...new Set((product.variants ?? []).map((v) => v.options[axis]).filter(Boolean))];
              if (axisValues.length === 0) return null;
              return (
                <div className="mb-5" key={axis}>
                  <label className="block text-xs font-bold text-neutral-900 mb-2">
                    {axis} {selectedOptions[axis] && <span className="font-normal text-gray-500 normal-case">— {selectedOptions[axis]}</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {axisValues.map((value) => {
                      // A value is only truly pickable if it has at least one in-stock
                      // combination once every OTHER already-picked axis is factored in.
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
                          disabled={stockForValue <= 0}
                          className={classNames(
                            "min-w-11 px-3 py-2 text-xs font-bold rounded-md border transition-all",
                            active
                              ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] border-[var(--theme-primary)]"
                              : stockForValue <= 0
                                ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                                : "border-gray-300 text-neutral-900 hover:border-[var(--theme-primary)]",
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

            {/* Quantity Control & Wishlist */}
            <div className="mb-6">
              {!isOutOfStock && (
                <label className="block text-xs font-bold text-neutral-900 mb-2">
                  Quantity
                </label>
              )}
              <div className="flex items-center gap-3">
                {!isOutOfStock && (
                  <div className="inline-flex items-center border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm h-10">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      disabled={quantity <= 1}
                      className="px-3.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors flex items-center justify-center"
                    >
                      <MinusIcon className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span className="px-4 text-sm font-bold text-neutral-900 select-none">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      disabled={!needsVariantSelection && quantity >= stock}
                      className="px-3.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors flex items-center justify-center"
                    >
                      <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border transition-all active:scale-95 cursor-pointer shadow-sm ${
                    isInWishlist
                      ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                  title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  aria-label={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Heart className={`h-5 w-5 transition-colors ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                </button>
              </div>
            </div>

            {/* Action Buttons Stack */}
            <div className="flex flex-col gap-3 mb-8">
              {/* Add to Cart Button */}
              <button
                onClick={handleMainAddToCart}
                disabled={isAdding || isOutOfStock || isAlreadyAdded || needsVariantSelection}
                className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition-all rounded-sm text-center
                  ${(isOutOfStock || isAdding || isAlreadyAdded || needsVariantSelection)
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)]"
                  }`}
              >
                {isAdding ? <BeatLoader size={8} color="#fff" /> :
                 isOutOfStock ? "Out of Stock" :
                 needsVariantSelection ? `Select ${optionAxesLabel}` :
                 isAlreadyAdded ? "In Cart" : "ADD TO CART"}
              </button>

              {/* Buy Now Button */}
              <button
                onClick={handleBuyNow}
                disabled={isAdding || isOutOfStock || needsVariantSelection}
                className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition-all rounded-sm text-center border-2 border-[var(--theme-primary)]
                  ${(isOutOfStock || isAdding || needsVariantSelection)
                    ? "border-gray-300 text-gray-400 cursor-not-allowed bg-transparent"
                    : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)]"
                  }`}
              >
                {isAdding ? <BeatLoader size={8} color="#fff" /> : needsVariantSelection ? `Select ${optionAxesLabel}` : "BUY IT NOW"}
              </button>
            </div>

            {/* Product Description */}
            {product.description && (
              <div ref={descriptionRef} className="scroll-mt-28 mb-8 pt-2">
                <div
                  className={`relative transition-all duration-300 ${
                    !isDescriptionExpanded && (product.description.length > 250 || product.description.includes("\n"))
                      ? "max-h-48 overflow-hidden"
                      : ""
                  }`}
                >
                  <div 
                    className="text-neutral-800 text-[15px] sm:text-base leading-relaxed space-y-3 [&>p]:mb-3 [&_b]:font-bold [&_b]:text-neutral-900 [&_strong]:font-bold [&_strong]:text-neutral-900"
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
                    className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer select-none hover:underline focus:outline-none"
                  >
                    {isDescriptionExpanded ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>
            )}

          </motion.div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        {relatedProducts.length > 0 && (
          <section className="mt-28">
            <div className="text-center mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold tracking-tight sm:text-3xl font-sans"
              >
                You May Also Like
              </motion.h2>
              <div className="h-0.5 bg-[var(--theme-primary)] mx-auto mt-3 rounded-full w-16" />
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
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
    </div>
  );
}