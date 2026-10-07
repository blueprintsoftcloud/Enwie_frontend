// src/context/CartContext.tsx
// Migrated: TanStack Query handles server fetching/mutations.
// Zustand (useCartStore) holds the cart items & total for granular subscriptions.
// Public API (useCart hook) is unchanged — all consumers work without modification.

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useCartStore, CartItem } from "../store/cartStore";
import { useAuth } from "./AuthContext";
import { calculateDiscountedPrice } from "../utils/product";

// ── Types ──────────────────────────────────────────────────────────────────────
export type { CartItem };

interface AddToCartOptions {
  quantity?: number;
  /** Required once the product has variants (see ProductDetailPage.tsx's option
   * picker) — the backend rejects an add-to-cart with no variantId for such a product. */
  variantId?: string | null;
}

interface CartContextValue {
  cartItems: CartItem[];
  cartTotal: string;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (
    productId: string,
    options?: AddToCartOptions,
  ) => Promise<unknown>;
  removeFromCart: (productId: string, variantId?: string | null) => Promise<void>;
  updateQuantity: (productId: string, newQuantity: number, variantId?: string | null) => Promise<void>;
  clearCart: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | undefined>(undefined);

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};

// ── Fetch helper ───────────────────────────────────────────────────────────────
const fetchCartFromServer = async (): Promise<{
  items: CartItem[];
  total: string;
}> => {
  const res = await api.get<{
    cart: { items: any[] } | null;
    totalAmount?: number;
  }>("/cart/list");
  const backendCart = res.data.cart ?? { items: [] };
  const serverTotal = res.data.totalAmount ?? 0;

  const items: CartItem[] = (backendCart.items ?? [])
    .map((item: any) => ({
      _id: item._id ?? item.id,
      // Use the product sub-document if available, fall back to the raw productId field
      productId: item.product?._id ?? item.product?.id ?? item.productId,
      variantId: item.variantId ?? null,
      name: item.product?.name,
      // item.product.price/stock are already the variant's own values when this row
      // carries a variantId — see cart.controller.ts's cartList.
      price: item.product?.discount && item.product?.discount > 0
        ? calculateDiscountedPrice(item.product.price, item.product.discount)
        : item.product?.price,
      image: item.product?.image,
      stock: item.product?.stock ?? 0,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions ?? {},
    }))
    .filter((item: CartItem) => item.productId);

  return { items, total: parseFloat(String(serverTotal)).toFixed(2) };
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { items, total, loading, setItems, setLoading, clear } = useCartStore();

  // Only fetch the cart when the user is authenticated (avoids 401 for guests)
  const isCustomerLoggedIn =
    user.isAuthenticated && !user.isInitialLoad && user.role === "CUSTOMER";

  // ── Query: fetch cart ────────────────────────────────────────────────────────
  const { error: queryError, refetch } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const data = await fetchCartFromServer();
      setItems(data.items, data.total);
      setLoading(false);
      return data;
    },
    enabled: isCustomerLoggedIn,
    staleTime: 30_000,
    retry: (failureCount: number, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  // Clear cart on logout — but NOT during the initial auth check (isInitialLoad=true).
  // While isInitialLoad is true, we don't yet know the user's role, so we keep
  // the Zustand store in its initial loading:true state and let the query populate it.
  useEffect(() => {
    if (!user.isInitialLoad && !isCustomerLoggedIn) {
      clear();
      setLoading(false);
    }
  }, [user.isInitialLoad, isCustomerLoggedIn, clear, setLoading]);

  // Stop loading spinner if the query errors (e.g. 401 unauthenticated)
  useEffect(() => {
    if (queryError) setLoading(false);
  }, [queryError, setLoading]);

  const fetchCart = useCallback(async () => {
    try {
      await refetch();
    } finally {
      setLoading(false);
    }
  }, [refetch, setLoading]);

  // ── Mutation: add to cart ────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
      variantId,
    }: {
      productId: string;
      quantity: number;
      variantId: string | null;
    }) => api.post("/cart/add", { productId, quantity, variantId }),
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error("Please login to add items to your cart", {
          id: "login-to-add-cart",
        });
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
        return;
      }

      toast.error(err?.response?.data?.message ?? "Failed to add to cart", {
        id: "failed-to-add-cart",
      });
    },
  });

  const addToCart = useCallback(
    async (productId: string, options: AddToCartOptions = {}) => {
      if (!user.isAuthenticated) {
        toast.error("Please login to add items to your cart", {
          id: "login-to-add-cart",
        });
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
        return Promise.reject(new Error("Not authenticated"));
      }

      const { quantity = 1, variantId = null } = options;
      const result = await addMutation.mutateAsync({
        productId,
        quantity,
        variantId,
      });
      // Immediately refresh the cart store so the navbar count and cart page
      // reflect the new item before the caller's promise resolves.
      try {
        await refetch();
      } catch {
        // refetch failure is non-critical; query will self-heal
      }
      return result;
    },
    [addMutation, user.isAuthenticated, refetch],
  );

  // ── Mutation: remove from cart ───────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId?: string | null }) =>
      api.delete(`/cart/remove/${productId}`, variantId ? { params: { variantId } } : undefined),
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to remove item", {
        id: "failed-to-remove-cart",
      });
    },
  });

  // ── Mutation: clear cart ─────────────────────────────────────────────────────
  const clearMutation = useMutation({
    mutationFn: () => api.delete("/cart/clear"),
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to clear cart. Please try again.", {
        id: "failed-to-clear-cart",
      });
    },
  });

  const removeFromCart = useCallback(
    async (productId: string, variantId: string | null = null) => {
      // Snapshot for rollback
      const snapshotItems = items;
      const snapshotTotal = total;

      // Match on (productId, variantId) — two different sizes of the same product
      // are two separate cart rows now, so removing one must not touch the other.
      const matches = (i: (typeof items)[number]) =>
        String(i.productId) === String(productId) && String(i.variantId ?? "") === String(variantId ?? "");

      // Optimistic removal — item disappears immediately in the UI
      const updatedItems = items.filter((i) => !matches(i));
      const removedItem = items.find(matches);
      const newTotal = removedItem
        ? Math.max(
            0,
            parseFloat(total) - removedItem.price * removedItem.quantity,
          ).toFixed(2)
        : total;
      setItems(updatedItems, newTotal);

      try {
        await removeMutation.mutateAsync({ productId, variantId });
        // Sync with server to confirm
        try {
          await refetch();
        } catch {
          /* non-critical */
        }
      } catch {
        // Rollback on backend failure
        setItems(snapshotItems, snapshotTotal);
      }
    },
    [removeMutation, items, total, setItems, refetch],
  );

  // ── Mutation: update quantity (optimistic) ───────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
      variantId,
    }: {
      productId: string;
      quantity: number;
      variantId?: string | null;
    }) => api.put(`/cart/updateQuantity/${productId}`, { quantity, variantId }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const updateQuantity = useCallback(
    async (productId: string, newQuantity: number, variantId: string | null = null) => {
      if (newQuantity <= 0) return;

      // Match on (productId, variantId) — see removeFromCart for why.
      const matches = (i: (typeof items)[number]) =>
        i.productId === productId && String(i.variantId ?? "") === String(variantId ?? "");

      // Optimistic update in Zustand store
      const item = items.find(matches);
      if (item) {
        const diff = (newQuantity - item.quantity) * item.price;
        const updatedItems = items.map((i) => (matches(i) ? { ...i, quantity: newQuantity } : i));
        setItems(updatedItems, (parseFloat(total) + diff).toFixed(2));
      }

      await updateMutation.mutateAsync({ productId, quantity: newQuantity, variantId });
    },
    [items, total, setItems, updateMutation],
  );

  const clearCart = useCallback(async () => {
    // Snapshot for rollback
    const snapshotItems = items;
    const snapshotTotal = total;

    // Optimistic UI: clear cart items and total instantly
    clear();

    try {
      const res = await clearMutation.mutateAsync();
      toast.success(res.data.message || "Cart cleared successfully", { id: "cart-cleared" });
      queryClient.removeQueries({ queryKey: ["cart"] });
      try {
        await refetch();
      } catch {
        /* non-critical */
      }
    } catch {
      // Rollback on failure
      setItems(snapshotItems, snapshotTotal);
    }
  }, [clearMutation, clear, setItems, items, total, queryClient, refetch]);

  const contextValue = useMemo(
    () => ({
      cartItems: items,
      cartTotal: total,
      // removeMutation uses optimistic updates, so exclude its pending state from
      // the full-page loading flag to avoid a flash spinner after removal.
      loading: loading || addMutation.isPending,
      error: queryError ? "Could not load cart" : null,
      fetchCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      total,
      loading,
      addMutation.isPending,
      queryError,
      fetchCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};
