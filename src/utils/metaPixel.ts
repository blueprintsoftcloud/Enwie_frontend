// src/utils/metaPixel.ts
// Helper functions to track standard Meta (Facebook) Pixel events:
// PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, etc.

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

/** Check if fbq is loaded and available */
export const isMetaPixelReady = (): boolean => {
  return typeof window !== "undefined" && typeof window.fbq === "function";
};

/** Track PageView on route navigation */
export const trackMetaPageView = (): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "PageView");
  }
};

/** Track ViewContent when viewing a single product page */
export const trackMetaViewContent = (product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "ViewContent", {
      content_name: product.name,
      content_ids: [product.id],
      content_type: "product",
      value: product.price,
      currency: product.currency || "INR",
      content_category: product.category,
    });
  }
};

/** Track AddToCart when customer adds an item to their cart */
export const trackMetaAddToCart = (item: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "AddToCart", {
      content_name: item.name,
      content_ids: [item.id],
      content_type: "product",
      value: item.price * (item.quantity || 1),
      currency: item.currency || "INR",
    });
  }
};

/** Track InitiateCheckout when customer enters the checkout page */
export const trackMetaInitiateCheckout = (data: {
  numItems: number;
  totalValue: number;
  currency?: string;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "InitiateCheckout", {
      num_items: data.numItems,
      value: data.totalValue,
      currency: data.currency || "INR",
    });
  }
};

/** Track Purchase when an order is successfully completed */
export const trackMetaPurchase = (order: {
  orderId: string;
  amount: number;
  currency?: string;
  numItems?: number;
}): void => {
  if (isMetaPixelReady()) {
    window.fbq!("track", "Purchase", {
      content_type: "product",
      value: order.amount,
      currency: order.currency || "INR",
      order_id: order.orderId,
      num_items: order.numItems || 1,
    });
  }
};
