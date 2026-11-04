// src/utils/staticPagesCache.ts
//
// Instant synchronous cache for static content pages (About Us, Terms & Conditions, Privacy Policy, Help Center).
// Eliminates layout shift, empty screen flashes, and Suspense loading flickers during page navigation.

import { useEffect, useState } from "react";
import api from "./api";

export interface TextPageContent {
  title: string;
  body: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface HelpContent {
  title: string;
  faqs: Faq[];
}

export interface StaticPagesData {
  about: TextPageContent;
  terms: TextPageContent;
  privacy: TextPageContent;
  help: HelpContent;
}

export const DEFAULT_STATIC_PAGES: StaticPagesData = {
  about: {
    title: "Our Story",
    body: "We are dedicated to timeless craftsmanship and modern style. Every piece in our collection is curated with passion, celebrating heritage textiles and sustainable elegance.\n\nOur journey began with a simple belief: that quality clothing should be both authentic and accessible. Today, we work closely with master artisans to bring you thoughtfully designed apparel built to last.",
  },
  terms: {
    title: "Terms & Conditions",
    body: "Welcome to our store. By accessing or using our services, you agree to be bound by the terms and conditions outlined below.\n\nAll products, prices, and promotions are subject to availability and may change without prior notice. Orders placed are confirmed upon successful payment verification.\n\nWe respect your privacy and are committed to protecting your personal information. For questions regarding cancellations, returns, or warranty, please review our customer support guidelines.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "We value your privacy and are committed to safeguarding your personal data. This Privacy Policy explains how we collect, use, and protect your information when you visit or shop on our platform.\n\nWe collect details such as your name, contact information, shipping address, and payment confirmation solely to fulfill your orders, provide customer support, and communicate important order updates. We will never sell, rent, or share your personal information with third parties for marketing purposes without your explicit consent.\n\nWe implement standard security measures to protect your information against unauthorized access, loss, or alteration. For any inquiries or requests regarding your personal data, please reach out via our Contact Us page.",
  },
  help: {
    title: "Help Center",
    faqs: [
      {
        question: "How do I track my order?",
        answer: "You can track your order in real-time under My Orders in your account, or by using the Shipment Tracking link in the header.",
      },
      {
        question: "What is your return & exchange policy?",
        answer: "We offer hassle-free returns and exchanges within 7 days of delivery for unworn items in their original packaging.",
      },
      {
        question: "What payment methods are supported?",
        answer: "We accept all major credit/debit cards, UPI, net banking, and secure online payment gateways.",
      },
      {
        question: "How long does shipping usually take?",
        answer: "Standard shipping typically takes 3 to 5 business days, depending on your delivery pin code.",
      },
    ],
  },
};

const CACHE_KEY = "crm_static_pages_cache";
const UPDATE_EVENT = "crm_static_pages_updated";

// In-memory module cache for immediate 0ms synchronous access
let inMemoryCache: StaticPagesData | null = null;
let fetchPromise: Promise<StaticPagesData> | null = null;

export const readStaticPagesCache = (): StaticPagesData => {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const merged: StaticPagesData = {
            about: { ...DEFAULT_STATIC_PAGES.about, ...parsed.about },
            terms: { ...DEFAULT_STATIC_PAGES.terms, ...parsed.terms },
            privacy: { ...DEFAULT_STATIC_PAGES.privacy, ...parsed.privacy },
            help: {
              title: parsed.help?.title || DEFAULT_STATIC_PAGES.help.title,
              faqs: Array.isArray(parsed.help?.faqs) && parsed.help.faqs.length > 0
                ? parsed.help.faqs
                : DEFAULT_STATIC_PAGES.help.faqs,
            },
          };
          inMemoryCache = merged;
          return merged;
        }
      }
    } catch {
      // ignore JSON errors
    }
  }

  inMemoryCache = DEFAULT_STATIC_PAGES;
  return DEFAULT_STATIC_PAGES;
};

export const writeStaticPagesCache = (data: Partial<StaticPagesData>): void => {
  const current = readStaticPagesCache();
  const updated: StaticPagesData = {
    about: data.about ? { ...current.about, ...data.about } : current.about,
    terms: data.terms ? { ...current.terms, ...data.terms } : current.terms,
    privacy: data.privacy ? { ...current.privacy, ...data.privacy } : current.privacy,
    help: data.help ? { ...current.help, ...data.help } : current.help,
  };

  inMemoryCache = updated;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: updated }));
    } catch {
      // ignore
    }
  }
};

export const fetchStaticPages = async (): Promise<StaticPagesData> => {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await api.get("/pages");
      if (data && typeof data === "object") {
        const fresh: StaticPagesData = {
          about: data.about?.title ? data.about : DEFAULT_STATIC_PAGES.about,
          terms: data.terms?.title ? data.terms : DEFAULT_STATIC_PAGES.terms,
          privacy: data.privacy?.title ? data.privacy : DEFAULT_STATIC_PAGES.privacy,
          help: data.help?.title
            ? {
                title: data.help.title,
                faqs: Array.isArray(data.help.faqs) && data.help.faqs.length > 0
                  ? data.help.faqs
                  : DEFAULT_STATIC_PAGES.help.faqs,
              }
            : DEFAULT_STATIC_PAGES.help,
        };
        writeStaticPagesCache(fresh);
        return fresh;
      }
    } catch {
      // Fallback silently to cached/default data
    } finally {
      fetchPromise = null;
    }
    return readStaticPagesCache();
  })();

  return fetchPromise;
};

/**
 * Custom React hook for static page components.
 * Immediately yields synchronous cached content on mount (0ms delay, no loader flash),
 * then revalidates in the background (Stale-While-Revalidate).
 */
export function useStaticPageContent<K extends keyof StaticPagesData>(pageKey: K): StaticPagesData[K] {
  const [content, setContent] = useState<StaticPagesData[K]>(() => {
    return readStaticPagesCache()[pageKey];
  });

  useEffect(() => {
    // Revalidate in background without blocking paint
    fetchStaticPages().then((fresh) => {
      setContent(fresh[pageKey]);
    });

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<StaticPagesData>;
      if (customEvent.detail?.[pageKey]) {
        setContent(customEvent.detail[pageKey]);
      } else {
        setContent(readStaticPagesCache()[pageKey]);
      }
    };

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
    };
  }, [pageKey]);

  return content;
}
