// src/context/WishlistContext.tsx
// Migrated: TanStack Query handles server fetching/mutations.
// Zustand (useWishlistStore) holds local state for instant UI updates.
// Public API (useWishlist hook) is unchanged.

import React, { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import api from "../utils/api";
import { useWishlistStore, WishlistProduct } from "../store/wishlistStore";
import { normalizeProduct } from "../utils/product";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
export type { WishlistProduct };

interface WishlistContextValue {
  wishlistItems: WishlistProduct[];
  wishlistCount: number;
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (productId: string, variantId?: string | null) => Promise<boolean>;
  isProductInWishlist: (productId: string, variantId?: string | null) => boolean;
  clearWishlist: () => Promise<boolean>;
}

const fallback: WishlistContextValue = {
  wishlistItems: [],
  wishlistCount: 0,
  loading: false,
  fetchWishlist: async () => {},
  toggleWishlist: async () => false,
  isProductInWishlist: () => false,
  clearWishlist: async () => false,
};

// ── Context ────────────────────────────────────────────────────────────────────
const WishlistContext = createContext<WishlistContextValue | null>(null);

export const useWishlist = (): WishlistContextValue => {
  const ctx = useContext(WishlistContext);
  return ctx ?? fallback;
};

// ── Provider ───────────────────────────────────────────────────────────────────
export const WishlistProvider = ({
  children,
  isAuthenticated: isAuthProp,
}: {
  children: ReactNode;
  isAuthenticated?: boolean;
}) => {
  const { user } = useAuth();
  const isAuthenticated = isAuthProp ?? user?.isAuthenticated === true;
  const queryClient = useQueryClient();
  const { items, setItems, addItem, removeItem, clear, hasFetched, setHasFetched } = useWishlistStore();

  // ── Query: fetch wishlist ────────────────────────────────────────────────────
  const { isFetching, refetch } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const response = await api.get<{ items: WishlistProduct[] }>("/user/wishlist");
      const fetched = (response.data.items ?? []).map((item) => normalizeProduct(item) as WishlistProduct);
      setItems(fetched);
      setHasFetched(true);
      return fetched;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: (failureCount: number, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  // Clear wishlist in store when user logs out
  React.useEffect(() => {
    if (!isAuthenticated) {
      clear();
      queryClient.removeQueries({ queryKey: ["wishlist"] });
    }
  }, [isAuthenticated, clear, queryClient]);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    await refetch();
  }, [isAuthenticated, refetch]);

  // ── Mutation: add to wishlist ────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId?: string | null }) =>
      api.post("/user/wishlist", { productId, variantId: variantId ?? undefined }),
    onMutate: ({ productId, variantId }) => addItem({ id: productId, variantId: variantId ?? null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: (_err, { productId, variantId }) => removeItem(productId, variantId),
  });

  // ── Mutation: remove from wishlist ───────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId?: string | null }) =>
      api.delete(`/user/wishlist/${productId}`, { params: variantId ? { variantId } : undefined }),
    onMutate: ({ productId, variantId }) => removeItem(productId, variantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: () => {
      // Rollback — refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  // ── Mutation: clear wishlist ─────────────────────────────────────────────────
  const clearMutation = useMutation({
    mutationFn: () => api.delete("/user/wishlist"),
    onMutate: () => clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const toggleWishlist = useCallback(
    async (productId: string, variantId?: string | null): Promise<boolean> => {
      if (!isAuthenticated) {
        toast.error("Please login to add product to wishlist", {
          id: "login-to-wishlist",
        });
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
        return false;
      }
      try {
        const isInWishlist = items.some(
          (item) => String(item.id) === String(productId) && String(item.variantId ?? "") === String(variantId ?? ""),
        );
        if (isInWishlist) {
          await removeMutation.mutateAsync({ productId, variantId });
        } else {
          await addMutation.mutateAsync({ productId, variantId });
        }
        return true;
      } catch {
        return false;
      }
    },
    [isAuthenticated, items, addMutation, removeMutation],
  );

  const clearWishlist = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    try {
      await clearMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [isAuthenticated, clearMutation]);

  const isProductInWishlist = useCallback(
    (productId: string, variantId?: string | null) =>
      items.some(
        (item) => String(item.id) === String(productId) && String(item.variantId ?? "") === String(variantId ?? ""),
      ),
    [items],
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems: items,
        wishlistCount: items.length,
        loading: (!hasFetched || isFetching) && items.length === 0,
        fetchWishlist,
        toggleWishlist,
        isProductInWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
