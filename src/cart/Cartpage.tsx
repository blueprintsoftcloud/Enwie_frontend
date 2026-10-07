import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";
import toast from "react-hot-toast";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";

interface CartItemType {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  image?: string;
  /** Admin-named axes (Storage/Color, Weight, ...) — see cartStore.ts's CartItem. */
  selectedOptions?: Record<string, string>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

// ── Loading skeleton ──────────────────────────────────────────────────────────
const RowSkeleton = () => (
  <div className="flex items-center gap-4 bg-[#F9FAFB] rounded-xl p-4 animate-pulse">
    <div className="w-16 h-16 rounded-lg bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-1/5 bg-gray-200 rounded" />
    </div>
    <div className="h-8 w-24 bg-gray-200 rounded-lg" />
    <div className="h-4 w-16 bg-gray-200 rounded" />
  </div>
);

function CartPage() {
  const navigate = useNavigate();
  const {
    cartItems,
    loading,
    error,
    removeFromCart,
    updateQuantity,
    cartTotal,
    clearCart,
    fetchCart,
  } = useCart();

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // --- 1. Stock Validation Logic ---
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;

    cartItems.forEach((item) => {
      const stock = item.stock ?? 0;
      if (stock > 0 && item.quantity > stock) {
        updateQuantity(item.productId, stock, item.variantId);
        toast(`${item.name} quantity reduced to ${stock} due to stock change`, {
          id: "stock change",
        });
      }
    });
  }, [cartItems, updateQuantity]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // --- 2. Helper Functions ---
  const getImageUrl = (path: string | undefined) => {
    if (!path) return "https://via.placeholder.com/100?text=No+Image";
    return path.startsWith("http") ? path : `${domainUrl}/${path}`;
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleIncrement = (item: CartItemType) => {
    const stock = item.stock ?? 0;
    if (item.quantity >= stock) {
      toast.error(`Only ${stock} item(s) available`, { id: "limited stock" });
      return;
    }
    updateQuantity(item.productId, item.quantity + 1, item.variantId);
  };

  const handleDecrement = (item: CartItemType) => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1, item.variantId);
    }
  };

  const handleRemoveItem = (item: CartItemType) => {
    removeFromCart(item.productId, item.variantId);
    toast(`${item.name} removed from cart`, {
      id: "removed change",
      style: { background: "#fff5f5", color: "#a33" },
    });
  };

  const handleCheckoutClick = async () => {
    try {
      setCheckoutLoading(true);
      const res = await api.post("/order/pre-checkout");
      if (res.data?.message && res.data.message !== "Proceed to address selection") {
        toast(res.data.message);
      }
      navigate("/checkout");
    } catch (err) {
      const _e = err as any;
      toast.error(_e.response?.data?.message || "Checkout failed", { id: "checkout failedd" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const hasOutOfStockItem = cartItems.some((item) => (item.stock ?? 0) === 0);
  const cartTotalNum = Number(cartTotal) || 0;

  // --- 3. Error state ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-red-600 font-medium">
        {error}
      </div>
    );
  }

  // --- 4. Loading state for initial load ---
  if (loading && cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  // --- 5. Empty state ---
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: "color-mix(in srgb, var(--theme-primary) 10%, white)" }}
        >
          <ShoppingBag className="w-7 h-7" style={{ color: "var(--theme-primary)" }} />
        </div>
        <h1 className="text-2xl font-bold text-[#111827] mb-2">
          Your Cart is Empty
        </h1>
        <p className="text-[#9CA3AF] mb-6 text-sm">
          Looks like you haven't added anything yet.
        </p>
        <Link
          to="/"
          className="rounded-full px-8 py-3 font-bold transition-all hover:brightness-110"
          style={{ background: "var(--theme-primary)", color: "var(--theme-primary-ink)" }}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  // --- 5. Main Render ---
  return (
    <div className="min-h-screen bg-white font-sans p-4 md:p-10 mt-20">
      {/* Header Section */}
      <div className="w-full mb-8 flex items-center gap-3">
        <button
          onClick={handleGoBack}
          className="p-2 rounded-full hover:bg-[#F3F4F6] transition-colors group shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-[#111827] group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div
          className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-hover) 100%)" }}
        >
          <ShoppingBag className="w-5 h-5" style={{ color: "var(--theme-primary-ink)" }} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827]">My Cart</h1>
          {!loading && (
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {cartItems.length} product{cartItems.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full flex flex-col lg:flex-row gap-8 relative">
        {/* Left Column: Cart Items List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-[#111827]">
              Cart{" "}
              {!loading && (
                <span className="text-[#9CA3AF] text-base font-normal">
                  ({cartItems.length} product{cartItems.length !== 1 ? "s" : ""})
                </span>
              )}
            </h2>
            {!loading && cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[#EF4444] font-medium flex items-center gap-1.5 hover:text-red-700 transition-colors text-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear cart
              </button>
            )}
          </div>

          {/* Table Headers - Hidden on Mobile */}
          {!loading && (
            <div className="hidden md:grid grid-cols-12 text-[#9CA3AF] font-medium mb-4 text-xs uppercase tracking-wider">
              <div className="col-span-6 pl-2">Product</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right pr-2">Price</div>
            </div>
          )}

          <div className="space-y-4">
            {loading && cartItems.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
            ) : (
              cartItems.map((item) => {
                const stock = item.stock ?? 0;
                return (
                  <div
                    key={item._id || `${item.productId}-${item.variantId ?? ""}`}
                    className="grid grid-cols-12 gap-y-4 md:gap-y-0 items-center bg-[#F9FAFB] rounded-xl p-4 relative"
                  >
                    {/* Product Info */}
                    <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 border border-gray-100">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/products/${item.productId}`}
                          className="font-bold text-[#111827] text-sm sm:text-base hover:underline block truncate"
                        >
                          {item.name}
                        </Link>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <p className="text-[#9CA3AF] text-sm">
                            {Object.entries(item.selectedOptions)
                              .map(([axis, value]) => `${axis}: ${value}`)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="text-xs mt-1">
                          {stock > 5 ? (
                            <span className="text-green-600">In stock</span>
                          ) : stock > 0 ? (
                            <span className="text-orange-600">Only {stock} left</span>
                          ) : (
                            <span className="text-red-600">Out of stock</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="col-span-6 md:col-span-3 flex justify-start md:justify-center items-center">
                      <div className="flex items-center bg-white border border-gray-200 rounded-lg">
                        <button
                          onClick={() => handleDecrement(item)}
                          className="p-2 text-[#9CA3AF] hover:text-[#111827] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1 text-[#111827] font-semibold text-sm w-8 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncrement(item)}
                          className="p-2 text-[#9CA3AF] hover:text-[#111827] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={item.quantity >= stock}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="col-span-6 md:col-span-3 flex justify-end items-center gap-4">
                      <span className="font-bold text-[#111827] tabular-nums">
                        {fmt(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-[#EF4444] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer p-1.5 rounded-lg"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="w-full lg:w-[400px] bg-[#F9FAFB] rounded-2xl p-6 h-fit flex flex-col lg:sticky lg:top-28">
          {loading && cartItems.length === 0 ? (
            <div className="space-y-3 mb-8 animate-pulse">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
              <div className="h-6 w-full bg-gray-200 rounded mt-4" />
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(cartTotalNum)}</span>
              </div>
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Discount</span>
                <span className="tabular-nums">-{fmt(0)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#111827] text-xl pt-4 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{fmt(cartTotalNum)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckoutClick}
            disabled={
              checkoutLoading ||
              loading ||
              cartItems.length === 0 ||
              hasOutOfStockItem
            }
            className="w-full rounded-xl py-4 font-bold transition-all text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:brightness-110"
            style={{ background: "var(--theme-primary)", color: "var(--theme-primary-ink)" }}
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : hasOutOfStockItem ? (
              "Remove Out of Stock Items"
            ) : (
              "Continue to checkout"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
