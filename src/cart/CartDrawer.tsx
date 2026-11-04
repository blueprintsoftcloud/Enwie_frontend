import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Gift,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart, CartItem } from "../context/CartContext";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useAuth } from "../context/AuthContext";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cartItems,
    cartTotal,
    loading,
    isDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
  } = useCart();

  useBodyScrollLock(isDrawerOpen);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Sync latest cart data from server whenever drawer opens
  React.useEffect(() => {
    if (isDrawerOpen) {
      fetchCart();
    }
  }, [isDrawerOpen, fetchCart]);

  // Validate stock when items are loaded
  React.useEffect(() => {
    if (!isDrawerOpen || !cartItems || cartItems.length === 0) return;
    cartItems.forEach((item) => {
      const stock = item.stock ?? 0;
      if (stock > 0 && item.quantity > stock) {
        updateQuantity(item.productId, stock, item.variantId);
        toast(`${item.name} quantity reduced to ${stock} due to stock change`, {
          id: "drawer-stock-change",
        });
      }
    });
  }, [isDrawerOpen, cartItems, updateQuantity]);

  if (typeof document === "undefined") return null;

  const totalNum = parseFloat(cartTotal) || 0;
  const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Free shipping / reward threshold calculation (e.g. ₹499 threshold)
  const FREE_SHIPPING_THRESHOLD = 499;
  const progressPercent = Math.min(100, (totalNum / FREE_SHIPPING_THRESHOLD) * 100);
  const amountRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalNum);

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "https://via.placeholder.com/100?text=No+Image";
    return path.startsWith("http") ? path : `${domainUrl}/${path}`;
  };

  const handleIncrement = (item: CartItem) => {
    const stock = item.stock ?? 0;
    if (item.quantity >= stock && stock > 0) {
      toast.error(`Only ${stock} item(s) available in stock`, { id: "drawer-limited-stock" });
      return;
    }
    updateQuantity(item.productId, item.quantity + 1, item.variantId);
  };

  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1, item.variantId);
    } else {
      removeFromCart(item.productId, item.variantId);
    }
  };

  const handleRemove = (item: CartItem) => {
    removeFromCart(item.productId, item.variantId);
    toast.success(`${item.name} removed from cart`, { id: `drawer-remove-${item.productId}` });
  };

  const handleCheckout = async () => {
    if (!user.isAuthenticated) {
      closeCartDrawer();
      toast.error("Please login to proceed to checkout", { id: "drawer-login-required" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    try {
      setCheckoutLoading(true);
      const res = await api.post("/order/pre-checkout");
      if (res.data?.message && res.data.message !== "Proceed to address selection") {
        toast(res.data.message);
      }
      closeCartDrawer();
      navigate("/checkout");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Checkout failed", {
        id: "drawer-checkout-failed",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur */}
          <motion.div
            key="cart-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCartDrawer}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-Over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              key="cart-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-screen max-w-md bg-white pointer-events-auto flex flex-col shadow-2xl overflow-hidden"
            >
              {/* ── 1. Drawer Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white z-10 shrink-0">
                <button
                  type="button"
                  onClick={closeCartDrawer}
                  className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black font-semibold text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
                  <span>Your Cart ({totalCount})</span>
                </button>
                <div className="flex items-center gap-3">
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearCart();
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCartDrawer}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="Close cart"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── 2. Top Promotional Bar / Free Shipping Progress ── */}
              

              {/* Free Delivery Meter */}
            

              {/* ── 3. Cart Items Scroll Area ── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 [scrollbar-width:thin]">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Your Cart is Empty</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                        Looks like you haven't added any products yet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeCartDrawer();
                        navigate("/");
                      }}
                      style={{
                        background: "var(--theme-primary)",
                        color: "var(--theme-primary-ink)",
                      }}
                      className="px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer hover:brightness-105"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cartItems.map((item) => {
                    const variantText = item.selectedOptions
                      ? Object.values(item.selectedOptions).filter(Boolean).join(" • ")
                      : "";
                    const itemTotal = (item.price * item.quantity).toFixed(2);

                    return (
                      <div
                        key={item._id || `${item.productId}-${item.variantId ?? ""}`}
                        className="flex gap-3.5 p-3.5 rounded-xl bg-white border border-gray-100 shadow-2xs hover:border-gray-200 transition-all"
                      >
                        {/* Thumbnail */}
                        <Link
                          to={`/products/${item.productId}`}
                          onClick={closeCartDrawer}
                          className="w-18 h-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0"
                        >
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/products/${item.productId}`}
                                onClick={closeCartDrawer}
                                className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 hover:underline"
                              >
                                {item.name}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRemove(item)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5 shrink-0"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {variantText && (
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                {variantText}
                              </p>
                            )}
                          </div>

                          {/* Price & Quantity Stepper */}
                          <div className="flex items-center justify-between mt-2 pt-1">
                            <span className="text-xs font-bold text-gray-900">
                              ₹{parseFloat(itemTotal).toLocaleString("en-IN")}
                            </span>

                            {/* Stepper */}
                            <div className="inline-flex items-center border border-gray-200 rounded-lg bg-gray-50/80 overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleDecrement(item)}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                              >
                                <Minus className="w-3 h-3 stroke-[2.5]" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold text-gray-900 select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrement(item)}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── 4. Sticky Bottom Checkout Section ── */}
              {cartItems.length > 0 && (
                <div className="border-t border-gray-100 bg-white p-4 space-y-3 shrink-0 shadow-lg">
                  {/* Trust indicator */}
                  
                  



                  

                  {/* Estimated Total row */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estimated Total
                    </span>
                    <span className="text-lg font-extrabold text-neutral-900">
                      ₹{totalNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Checkout CTA Button */}
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading || cartItems.length === 0}
                    style={{
                      background: "var(--theme-primary)",
                      color: "var(--theme-primary-ink)",
                    }}
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-sm shadow-md transition-all hover:brightness-105 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {checkoutLoading ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <span>Proceed to Checkout</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>

                  {/* Payment security info */}
                  <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                    <span>UPI • Cards • NetBanking • Cash on Delivery</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
