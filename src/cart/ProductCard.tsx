import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Check, ArrowRight } from "lucide-react"; // Consistent icons
import { toast } from "react-hot-toast"; // Using hot-toast for consistency
import { useCart } from "../context/CartContext";
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
  stock?: number;
  category?: ProductCategory | string;
}

function classNames(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();


  // Safety check
  if (!product || !product.id) return null;

  // State
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  
  // Derived State
  const isSaved = isProductInWishlist(product.id);
  const isInCart = cartItems.some((item) => {
    const cartId = item.productId;
    return String(cartId) === String(product.id);
  });
  const stock = typeof product.stock === "number" ? product.stock : 1;
  const isOutOfStock = stock <= 0;

  // Image Helper
  const imageUrl = product.image?.startsWith("http")
    ? product.image
    : `${domainUrl}/${product.image}`;

  const categoryName = typeof product.category === 'object' 
    ? product.category?.name 
    : product.category;

  // Handlers
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
        toast.success(isSaved ? "Removed from favourites" : "Added to favourites",{id:"removed wishlist productcard"});
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





  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isInCart) {
      toast.error("This item is already in your cart",{id:"already to cart allproducts"});
      return;
    }

    if (isOutOfStock) {
        toast.error("This item is out of stock",{id:"out of stock product card"});
        return;
    }

    try {
      await addToCart(product.id);
      toast.success(`Added ${product.name} to cart`);
    } catch (error: any) {
      if (error?.message !== "Not authenticated") {
        console.error(error);
        toast.error(error?.response?.data?.message || "Failed to add to cart");
      }
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group relative aspect-[5/7] w-full cursor-pointer overflow-hidden rounded-[2rem] bg-gray-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
    >
      {/* 1. Background Image */}
      <img
        src={imageUrl}
        alt={product.name}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />

      {/* 2. Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* 4. Top Right: Action Buttons */}
      <div className="absolute right-4 top-4 flex flex-col gap-3">
        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          disabled={isWishlistLoading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95 disabled:opacity-70"
        >
          <Heart
            className={classNames(
              "h-5 w-5 transition-colors",
              isSaved ? "fill-red-500 text-red-500" : "text-gray-900"
            )}
          />
        </button>

        {/* Add To Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isInCart || isOutOfStock}
          className={classNames(
            "flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95",
            isInCart 
              ? "bg-green-100 text-green-700 cursor-default" 
              : "bg-white/90 text-gray-900 hover:bg-black hover:text-white"
          )}
        >
          {isInCart ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
        </button>
      </div>

      {/* 5. Bottom Info Card */}
      <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex items-center justify-between rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md border border-white/50">
          <div className="flex flex-col truncate pr-2">
            <h3 className="truncate text-sm font-bold text-gray-900">
              {product.name}
            </h3>
            {product.discount && product.discount > 0 ? (
              <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-extrabold text-gray-900">
                  ₹{calculateDiscountedPrice(product.price, product.discount).toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-400 line-through">
                  ₹{product.price?.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                  {product.discount}% OFF
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-xs font-bold text-gray-500">
                ₹ {product.price?.toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors duration-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      


    </div>
  );
};

export default ProductCard;
