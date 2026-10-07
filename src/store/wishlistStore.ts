// src/store/wishlistStore.ts
// Zustand store for wishlist UI state (optimistic toggles, local item set).
// Actual server-sync is handled by TanStack Query in WishlistContext.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistProduct {
  id: string;
  /** Null/absent = the plain product (or a variant product with no option picked).
   * Set = this entry is one specific variant — each variant is its own wishlist item,
   * matching CartItem's own (productId, variantId) identity, so saving one size/colour
   * doesn't read as every other option of the same product also being saved. */
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
  name?: string;
  price?: number;
  image?: string;
  [key: string]: unknown;
}

const sameEntry = (a: { id: string; variantId?: string | null }, id: string, variantId?: string | null) =>
  String(a.id) === String(id) && String(a.variantId ?? "") === String(variantId ?? "");

interface WishlistState {
  items: WishlistProduct[];
  hasFetched: boolean;
  setItems: (items: WishlistProduct[]) => void;
  setHasFetched: (val: boolean) => void;
  addItem: (product: WishlistProduct) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      hasFetched: false,

      setItems: (items) => set({ items, hasFetched: true }),
      setHasFetched: (hasFetched) => set({ hasFetched }),
      addItem: (product) =>
        set((state) => ({
          items: state.items.some((i) => sameEntry(i, product.id, product.variantId))
            ? state.items
            : [...state.items, product],
        })),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameEntry(i, productId, variantId)),
        })),
      clear: () => set({ items: [], hasFetched: false }),
    }),
    {
      name: "wishlist-storage",
      partialize: (state) => ({ items: state.items, hasFetched: state.hasFetched }),
    }
  )
);
