import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useWishlist } from "../context/WishlistContext";
import { domainUrl } from "../utils/constant";
import { useAuth } from "../context/AuthContext";
import { calculateDiscountedPrice } from "../utils/product";

interface ProductCategory {
  name: string;
  _id?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image?: string;
  secondaryImage?: string | null;
  images?: string[];
  stock?: number;
  category?: ProductCategory | string;
}

function classNames(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();

  if (!product || !product.id) return null;

  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const isSaved = isProductInWishlist(product.id);

  const primaryUrl = product.image?.startsWith("http")
    ? product.image
    : product.image
    ? `${domainUrl}/${product.image}`
    : "https://placehold.co/600x600?text=No+Image";

  const secondaryUrl = product.secondaryImage
    ? product.secondaryImage.startsWith("http")
      ? product.secondaryImage
      : `${domainUrl}/${product.secondaryImage}`
    : product.images && product.images.length > 1
    ? product.images[1].startsWith("http")
      ? product.images[1]
      : `${domainUrl}/${product.images[1]}`
    : null;

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
    window.scrollTo(0, 0);
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWishlistLoading) return;

    setIsWishlistLoading(true);
    try {
      if (!user.isAuthenticated) {
        toast.error("Please login to add product to wishlist", { id: "login-to-wishlist" });
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
        return;
      }

      const success = await toggleWishlist(product.id);
      if (success) {
        toast.success(isSaved ? "Removed from favourites" : "Added to favourites", {
          id: "wishlist-toggle-productcard",
        });
      } else {
        toast.error("Could not update wishlist", { id: "wishlist-product-card-failed" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not update wishlist", { id: "wishlist-product-card-error" });
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const productUrl = `${window.location.origin}/product/${product.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: product.name,
          text: `Check out ${product.name} on our store!`,
          url: productUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(productUrl)
        .then(() => {
          toast.success("Product link copied to clipboard!", { id: `share-${product.id}` });
        })
        .catch(() => {
          toast.success("Link copied!", { id: `share-${product.id}` });
        });
    }
  };

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
      {/* 1. Square Image Container with Rounded Corners */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-stone-50 shadow-xs border border-gray-100">
        <img
          src={primaryUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
            secondaryUrl ? "group-hover:opacity-0" : ""
          }`}
        />

        {secondaryUrl && (
          <img
            src={secondaryUrl}
            alt={`${product.name} alternate view`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-105"
          />
        )}

        {/* 2. Floating Circular Wishlist Button (Top Right) */}
        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-10 flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:scale-110 hover:bg-white active:scale-90 border border-gray-200/60 disabled:opacity-60 cursor-pointer"
        >
          <Heart
            className={classNames(
              "h-4 w-4 transition-colors",
              isSaved ? "fill-red-500 text-red-500 stroke-red-500" : "text-gray-700 stroke-[1.75]"
            )}
          />
        </button>

        {/* 3. Floating Circular Share Button (Desktop hover only - hidden on mobile) */}
        <button
          type="button"
          aria-label="Share product"
          onClick={handleShare}
          className="hidden sm:flex absolute right-2.5 top-11.5 sm:right-3 sm:top-12 z-10 h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:scale-110 hover:bg-white active:scale-90 border border-gray-200/60 cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
          title="Share product"
        >
          <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 stroke-[1.75]" />
        </button>
      </div>

      {/* 4. Product Info Left-Aligned Below Image */}
      <div className="mt-2.5 sm:mt-3 flex flex-col items-start text-left px-0.5 font-sans">
        <h3 className="w-full text-xs sm:text-[13px] font-normal text-gray-800 leading-snug line-clamp-1 group-hover:text-black transition-colors text-left">
          {product.name}
        </h3>

        <div className="mt-1 flex items-center justify-start gap-2 text-xs sm:text-[13px] flex-wrap">
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
};

export default ProductCard;
