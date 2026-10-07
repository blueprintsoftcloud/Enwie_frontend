// src/store/cartStore.ts
// Zustand store for cart UI state (optimistic updates, local count, loading flags).
// Actual server-sync is handled by TanStack Query in CartContext.

import { create } from "zustand";

export interface CartItem {
  _id: string;
  productId: string;
  /** Null for a plain single-SKU product — set only when this row is a specific
   * option combination (see backend/src/models/mongoose.ts's ProductVariant). */
  variantId: string | null;
  name: string;
  price: number;
  image: string;
  stock: number;
  quantity: number;
  /** e.g. { Storage: "128GB", Color: "Black" } or { Weight: "1kg" } — admin-named
   * axes, not a fixed Size/Color pair. {} for a plain non-variant cart item. */
  selectedOptions: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  total: string;
  loading: boolean;
  setItems: (items: CartItem[], total: string) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: "0.00",
  loading: false,

  setItems: (items, total) => set({ items, total }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ items: [], total: "0.00" }),
}));
