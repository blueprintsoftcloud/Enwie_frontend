// src/components/AnnouncementBar.tsx
//
// Template-aware like HeroSection.tsx/FooterSection.tsx — activeTemplate picks which
// hand-built layout renders the SAME text/enabled state (see companySettings.controller.
// ts's SECTION_TEMPLATE_KEYS: this section has no per-template content of its own, only
// style variants). Template1 below is byte-for-byte the marquee that existed before this
// split, so a store that never touches the new picker sees zero change.

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import api from "../utils/api";

const DEFAULT_ITEMS = [
  "Free shipping on orders above ₹999",
  "New arrivals every week",
  "100% authentic products",
  "Secure payments",
];

interface TemplateProps {
  items: string[];
}

const Template1 = ({ items }: TemplateProps) => {
  // Duplicate items so the marquee loops seamlessly
  const marqueeItems = [...items, ...items];

  return (
    <div className="bg-gray-900 text-white overflow-hidden py-1.5 sm:py-2.5 select-none">
      <div className="flex animate-marquee whitespace-nowrap">
        {marqueeItems.map((text, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 sm:gap-3 mx-4 sm:mx-8 text-[10px] sm:text-xs font-bold tracking-widest uppercase"
          >
            <span className="text-yellow-400">✦</span>
            {text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 14s linear infinite;
        }
        @media (min-width: 640px) {
          .animate-marquee {
            animation: marquee 28s linear infinite;
          }
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

// Shared "cycle through items every few seconds" timer — used by Template2/Template4,
// which show one message at a time instead of a continuous scroll.
const useCyclingIndex = (count: number, intervalMs = 3500) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);
  return index;
};

// ─── Template 2: Static Fade Cycle ─────────────────────────────────────────────
// No scrolling — one message at a time, centered, cross-fading into the next. Calmer
// than the marquee, better for a store with only one or two announcements.
const Template2 = ({ items }: TemplateProps) => {
  const index = useCyclingIndex(items.length);
  return (
    <div className="bg-gray-900 text-white py-2 sm:py-2.5 select-none overflow-hidden">
      <div className="relative h-4 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="absolute text-[10px] sm:text-xs font-bold tracking-widest uppercase text-center"
          >
            {items[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Template 3: Dismissible Pill ──────────────────────────────────────────────
// A floating rounded pill instead of a full-width strip — customer can close it for the
// session. Shows only the first configured message (a dismissible element cycling
// through several messages would be a confusing UX — closing it should mean "gone").
const Template3 = ({ items }: TemplateProps) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || items.length === 0) return null;

  return (
    <div className="flex justify-center bg-white py-2 px-4 select-none">
      <div
        className="inline-flex items-center gap-2.5 rounded-full pl-4 pr-2 py-1.5 text-[10px] sm:text-xs font-bold tracking-wide uppercase shadow-sm"
        style={{ background: "color-mix(in srgb, var(--theme-primary) 10%, white)", color: "var(--theme-primary)" }}
      >
        <span>{items[0]}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ─── Template 4: Icon Colored Band ─────────────────────────────────────────────
// Full-width theme-accent band with a megaphone icon, cross-fading between messages —
// same cycling behavior as Template2 but with the storefront's own brand color instead
// of a neutral dark strip.
const Template4 = ({ items }: TemplateProps) => {
  const index = useCyclingIndex(items.length);
  return (
    <div
      className="py-2 sm:py-2.5 select-none overflow-hidden"
      style={{ background: "var(--theme-accent)", color: "var(--theme-accent-ink)" }}
    >
      <div className="relative h-4 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="absolute flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-widest uppercase text-center"
          >
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            {items[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

const ANNOUNCEMENT_CACHE_KEY = "crm_announcement_cache";

interface AnnouncementCache {
  enabled: boolean;
  activeTemplate: number;
  items: string[];
}

function readAnnouncementCache(): AnnouncementCache | null {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.activeTemplate === "number" &&
      Array.isArray(parsed.items)
    ) {
      return {
        enabled: Boolean(parsed.enabled),
        activeTemplate: parsed.activeTemplate,
        items: parsed.items,
      };
    }
  } catch {}
  return null;
}

export default function AnnouncementBar() {
  const cached = readAnnouncementCache();
  const [items, setItems] = useState<string[]>(cached?.items ?? DEFAULT_ITEMS);
  const [enabled, setEnabled] = useState<boolean>(cached?.enabled ?? false);
  const [activeTemplate, setActiveTemplate] = useState<number>(
    cached?.activeTemplate ?? 1
  );

  useEffect(() => {
    let isMounted = true;

    // Helper to persist current combined state to localStorage
    const updateCache = (newValues: Partial<AnnouncementCache>) => {
      try {
        const current = readAnnouncementCache() || {
          enabled,
          activeTemplate,
          items,
        };
        const updated = { ...current, ...newValues };
        localStorage.setItem(ANNOUNCEMENT_CACHE_KEY, JSON.stringify(updated));
      } catch {}
    };

    api
      .get("/admin/company-settings")
      .then(({ data }) => {
        if (!isMounted) return;
        // Check enabled flag — default to true if not set yet
        const enabledVal: string =
          data?.settings?.ANNOUNCEMENT_BAR_ENABLED ?? "true";
        const isEnabled = enabledVal !== "false";
        setEnabled(isEnabled);

        const raw: string = data?.settings?.ANNOUNCEMENT_BAR ?? "";
        const parsed = raw
          .split("|")
          .map((s: string) => s.trim())
          .filter(Boolean);
        const newItems = parsed.length > 0 ? parsed : DEFAULT_ITEMS;
        setItems(newItems);
        updateCache({ enabled: isEnabled, items: newItems });
      })
      .catch(() => {
        /* keep defaults */
      });

    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (!isMounted) return;
        if (typeof data?.announcementTemplate === "number") {
          setActiveTemplate(data.announcementTemplate);
          updateCache({ activeTemplate: data.announcementTemplate });
        }
      })
      .catch(() => {
        /* keep default template */
      });

    // Listen for live preview messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "STORRA_PREVIEW_ANNOUNCEMENT") {
        const tmpl = Number(event.data.template) || 1;
        setActiveTemplate(tmpl);
        updateCache({ activeTemplate: tmpl });
      }
    };
    window.addEventListener("message", handleMessage);

    return () => {
      isMounted = false;
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!enabled) return null;

  switch (activeTemplate) {
    case 2:
      return <Template2 items={items} />;
    case 3:
      return <Template3 items={items} />;
    case 4:
      return <Template4 items={items} />;
    default:
      return <Template1 items={items} />;
  }
}
