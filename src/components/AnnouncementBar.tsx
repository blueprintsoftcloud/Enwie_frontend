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
import { useTheme } from "../context/ThemeContext";

const DEFAULT_ITEMS = [
  "Free shipping on orders above ₹999",
  "New arrivals every week",
  "100% authentic products",
  "Secure payments",
];

interface FestiveAnnouncementConfig {
  gradient: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  icons: string[];
  items: string[];
}

export const FESTIVE_ANNOUNCEMENTS: Record<string, FestiveAnnouncementConfig> = {
  diwali: {
    gradient: "linear-gradient(90deg, #2b0408 0%, #580c14 22%, #3d1004 50%, #580c14 78%, #2b0408 100%)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    textColor: "#fef3c7",
    accentColor: "#fbbf24",
    fontFamily: "'Rozha One', 'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🪔", "🧨"],
    items: [
      "Happy Diwali! May divine light illuminate your life with joy, peace & prosperity",
      "Special Diwali Festive Offers & Discounts Live Now",
      "Celebrate the Festival of Lights with Handpicked Festive Collections",
    ],
  },
  holi: {
    gradient: "linear-gradient(90deg, #4c0519 0%, #831843 25%, #701a75 50%, #831843 75%, #4c0519 100%)",
    borderColor: "rgba(244, 63, 94, 0.4)",
    textColor: "#fdf2f8",
    accentColor: "#f472b6",
    fontFamily: "'Rozha One', 'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🎨", "✨"],
    items: [
      "Happy Holi! May your life be filled with vibrant colors, joy & laughter",
      "Splash Into The Holi Sale — Special Festive Discounts Inside",
      "Celebrate the Festival of Colors with Radiant Festive Styles",
    ],
  },
  eid: {
    gradient: "linear-gradient(90deg, #022c22 0%, #064e3b 25%, #065f46 50%, #064e3b 75%, #022c22 100%)",
    borderColor: "rgba(52, 211, 153, 0.4)",
    textColor: "#ecfdf5",
    accentColor: "#fbbf24",
    fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🌙", "✨"],
    items: [
      "Eid Mubarak! May divine blessings bring peace, joy & prosperity to your home",
      "Exclusive Eid Festive Wear & Royal Heritage Collections Live Now",
      "Celebrate in Timeless Elegance with Special Eid Offers",
    ],
  },
  onam: {
    gradient: "linear-gradient(90deg, #2e1605 0%, #542d0c 25%, #78350f 50%, #542d0c 75%, #2e1605 100%)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    textColor: "#fef3c7",
    accentColor: "#facc15",
    fontFamily: "'Rozha One', 'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🌼", "🪔"],
    items: [
      "Happy Onam! Celebrating the season of harvest, abundance & togetherness",
      "Special Onam Festive Hampers & Traditional Attire Live Now",
      "Celebrate Kerala's Grand Heritage with Handcrafted Festive Picks",
    ],
  },
  "christmas-new-year": {
    gradient: "linear-gradient(90deg, #0f2316 0%, #164e2a 25%, #450a0a 50%, #164e2a 75%, #0f2316 100%)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    textColor: "#fef2f2",
    accentColor: "#fde047",
    fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🎄", "⭐"],
    items: [
      "Merry Christmas & Happy New Year! Wishing you warmth, peace & cheerful holiday spirit",
      "Ring in the New Year in Style — Exclusive Holiday Season Markdowns",
      "Curated Winter Collections & Thoughtful Festive Gifting Live Now",
    ],
  },
  "wedding-season": {
    gradient: "linear-gradient(90deg, #3b0724 0%, #6b1446 25%, #4a0d31 50%, #6b1446 75%, #3b0724 100%)",
    borderColor: "rgba(251, 113, 133, 0.4)",
    textColor: "#fff1f2",
    accentColor: "#fde047",
    fontFamily: "'Playfair Display', 'Cinzel Decorative', serif",
    icons: ["💍", "✨"],
    items: [
      "Happy Wedding Season! Curated for every celebration, ceremony & reception",
      "The Grand Wedding Edit — Exquisite Ethnic & Bridal Collections Live Now",
      "Celebrate Sacred Unions in Royal Splendor & Handcrafted Luxury",
    ],
  },
  "republic-day": {
    gradient: "linear-gradient(90deg, #1e1b4b 0%, #1e3a8a 25%, #172554 50%, #1e3a8a 75%, #1e1b4b 100%)",
    borderColor: "rgba(96, 165, 250, 0.4)",
    textColor: "#eff6ff",
    accentColor: "#fbbf24",
    fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🇮🇳", "✦"],
    items: [
      "Happy Republic Day! Proudly celebrating the vibrant spirit & sovereignty of India",
      "Republic Day Grand Sale — Celebrate with Special Storewide Savings",
      "Honoring Indian Heritage & Craftsmanship with Limited-Time Offers",
    ],
  },
  valentines: {
    gradient: "linear-gradient(90deg, #4c0519 0%, #881337 25%, #9f1239 50%, #881337 75%, #4c0519 100%)",
    borderColor: "rgba(244, 63, 94, 0.4)",
    textColor: "#ffffff",
    accentColor: "#fbcfe8",
    fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    icons: ["💝", "💖"],
    items: [
      "Happy Valentine's Day! Curated gifts & romantic styles for the ones you love",
      "Love is in the Details — Special Valentine Gifts & Couple Edits Live Now",
      "Celebrate Your Special Moments with Exclusive Season Markdowns",
    ],
  },
  "sale-event": {
    gradient: "linear-gradient(90deg, #0f172a 0%, #1e293b 25%, #334155 50%, #1e293b 75%, #0f172a 100%)",
    borderColor: "rgba(251, 191, 36, 0.4)",
    textColor: "#f8fafc",
    accentColor: "#f59e0b",
    fontFamily: "'Cinzel Decorative', 'Playfair Display', serif",
    icons: ["🏷️", "🔥"],
    items: [
      "Mega Sale Event is Live! Biggest markdowns & seasonal price drops",
      "Up to 70% OFF Everything — Grab Your Favorites While Stocks Last",
      "Limited Time Celebration Deals Across All Product Categories",
    ],
  },
  "summer-coastal": {
    gradient: "linear-gradient(90deg, #083344 0%, #0e7490 25%, #155e75 50%, #0e7490 75%, #083344 100%)",
    borderColor: "rgba(34, 211, 238, 0.4)",
    textColor: "#ecfeff",
    accentColor: "#38bdf8",
    fontFamily: "'Playfair Display', serif",
    icons: ["🌴", "☀️"],
    items: [
      "Happy Summer! Light breathable fabrics, bright colors & endless sunshine",
      "The Summer Coastal Edit — Beat the Heat with Breezy Seasonal Styles",
      "Fresh Resort Wear & Sunny Season Essentials Live Now",
    ],
  },
};

interface TemplateProps {
  items: string[];
}

const FestiveAnnouncementBar = ({ config }: { config: FestiveAnnouncementConfig }) => {
  const marqueeItems = [...config.items, ...config.items];

  return (
    <div
      className="relative overflow-hidden py-2 sm:py-2.5 select-none shadow-sm"
      style={{
        background: config.gradient,
        borderBottom: `1px solid ${config.borderColor}`,
      }}
    >
      {/* Warm ambient golden shimmer overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />

      <div className="flex animate-marquee whitespace-nowrap items-center">
        {marqueeItems.map((text, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 sm:gap-3 mx-4 sm:mx-8 text-xs sm:text-sm font-semibold tracking-wide"
            style={{ color: config.textColor }}
          >
            {config.icons.map((icon, iconIdx) => (
              <span
                key={iconIdx}
                className="text-sm select-none"
                style={{
                  filter: `drop-shadow(0 0 6px ${config.accentColor})`,
                }}
              >
                {icon}
              </span>
            ))}
            <span
              className="tracking-wide font-semibold"
              style={{
                fontFamily: config.fontFamily,
                color: config.textColor,
                textShadow: "0 1px 3px rgba(0, 0, 0, 0.65)",
              }}
            >
              {text}
            </span>
            <span className="text-[10px] opacity-80" style={{ color: config.accentColor }}>
              ✦
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 16s linear infinite;
        }
        @media (min-width: 640px) {
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

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

  const { activeOccasion } = useTheme();
  const festiveConfig = activeOccasion ? FESTIVE_ANNOUNCEMENTS[activeOccasion.id] : null;

  // When any festive occasion is active, the festive announcement bar is automatically shown
  const isVisible = enabled || Boolean(festiveConfig);
  if (!isVisible) return null;

  if (festiveConfig) {
    // If merchant has customized items in ANNOUNCEMENT_BAR, render their custom text
    const hasCustomItems =
      items &&
      items.length > 0 &&
      items.some((item) => !DEFAULT_ITEMS.includes(item));

    const displayItems = hasCustomItems ? items : festiveConfig.items;

    return (
      <FestiveAnnouncementBar
        config={{
          ...festiveConfig,
          items: displayItems,
        }}
      />
    );
  }

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
