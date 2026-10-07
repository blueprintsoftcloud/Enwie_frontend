import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import { useAuth } from "../context/AuthContext";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  MagnifyingGlassIcon,
  SpeakerWaveIcon,
  RectangleStackIcon,
  PhotoIcon as HeroPhotoIcon,
  Squares2X2Icon,
  SparklesIcon,
  Bars3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  SwatchIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import StorefrontPreviewFrame from "./components/StorefrontPreviewFrame";
import { THEMES, DEFAULT_THEME_ID } from "../utils/themes";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { formatDiscountBadge } from "../utils/product";

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerType = "DISCOUNT_PANEL" | "CAROUSEL_ITEM" | "PROMO_BANNER";
type Tab = BannerType | "FEATURED" | "ANNOUNCEMENT" | "HERO" | "HEADER" | "FOOTER" | "NAVIGATION" | "THEME";

interface NavbarConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6;
}

const DEFAULT_NAVBAR: NavbarConfig = {
  activeTemplate: 1,
};

const NAVBAR_TEMPLATE_LABELS: Record<string, { name: string; desc: string; tag: string }> = {
  "1": {
    name: "Dark Professional",
    desc: "Obsidian noir background with crisp white typography, micro-lift pill links, and sleek circular icons.",
    tag: "Pairs with Footer 1",
  },
  "2": {
    name: "Light Editorial",
    desc: "Refined off-white magazine canvas with centered small baseline active indicators and curated classic buttons.",
    tag: "Pairs with Footer 2",
  },
  "3": {
    name: "Gradient with Aurora",
    desc: "Deep indigo & slate glowing backdrop with luminous tech pills and matching neon focus accents.",
    tag: "Pairs with Footer 3",
  },
  "4": {
    name: "Minimal Centered",
    desc: "Pure white balanced layout with centered brand mark, subtle micro-dot indicator, and airy spacing.",
    tag: "Pairs with Footer 4",
  },
  "5": {
    name: "Festive Accent Band",
    desc: "Full theme-primary brand header with high-contrast white active tabs and festive energetic energy.",
    tag: "Pairs with Footer 5",
  },
  "6": {
    name: "Split Statement",
    desc: "Bold modern asymmetric high-fashion design with sculpted squircle tabs and magnetic spring physics.",
    tag: "Pairs with Footer 6",
  },
};

interface NavCategory {
  id: string;
  name: string;
  showInNav: boolean;
  navOrder: number;
}

interface HomeBanner {
  id: string;
  type: BannerType;
  title: string;
  image: string;
  discount: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface SectionHeader {
  title: string;
  subtitle: string;
}

interface FeaturedProduct {
  id: string;
  name: string;
  code: string;
  image?: string;
  price: number;
  isFeatured: boolean;
  featuredOrder: number | null;
  category?: { id: string; name: string };
}

interface HeroTemplateData {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage?: string;
  accentText?: string;
  images?: string[];
  imageTitles?: string[];
  imageLinks?: string[];
  imageSubtitles?: string[];
  highlightText?: string;
  badgeText?: string;
}

interface HeroConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  templates: Record<string, HeroTemplateData>;
}

interface FooterLinkItem {
  label: string;
  url: string;
}

interface FooterLinkColumn {
  heading: string;
  links: FooterLinkItem[];
}

interface FooterTemplateData {
  tagline: string;
  newsletterTitle?: string;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  /** Templates 1/2/3/5/6's "Shop / Company / Support"-style link grid — always exactly
   * 3 columns to match those templates' fixed layouts. Template 4 has no link grid. */
  linkColumns?: FooterLinkColumn[];
}

interface FooterConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6;
  templates: Record<string, FooterTemplateData>;
}

const DEFAULT_LINK_COLUMNS: FooterLinkColumn[] = [
  { heading: "Shop", links: [{ label: "New Arrivals", url: "/products" }, { label: "Best Sellers", url: "/products" }] },
  { heading: "Company", links: [{ label: "Our Story", url: "/about" }, { label: "Terms & Conditions", url: "/terms" }] },
  { heading: "Support", links: [{ label: "Help Center", url: "/help" }, { label: "Contact Us", url: "/contact" }] },
];

// â”€â”€â”€ Defaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_HERO: HeroConfig = {
  activeTemplate: 1,
  templates: {
    "1": {
      title: "Summer styles are finally here",
      subtitle:
        "This year, our new summer collection will shelter you from the harsh elements of a world that doesn't care if you live or die.",
      ctaText: "Shop Collection",
      ctaLink: "/products",
    },
    "2": {
      title: "New Arrivals Just Dropped",
      subtitle: "Discover our latest curated pieces made for the modern era.",
      ctaText: "Explore Collection",
      ctaLink: "/products",
      accentText: "SS26 Collection",
      bgImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=2000",
    },
    "3": {
      title: "Elegance Redefined",
      subtitle: "Timeless. Modern. Yours.",
      ctaText: "Shop Now",
      ctaLink: "/products",
      accentText: "New Season",
    },
    "4": {
      title: "Lets Create your Own Style",
      subtitle:
        "It is a long established fact that a reader will be distracted by the readable content of a page.",
      ctaText: "Shop Now",
      ctaLink: "/products",
      accentText: "Trendy Collections",
      highlightText: "Create",
      badgeText: "25%\nDiscount on Everything",
      bgImage: "",
    },
    "5": {
      title: "Elevate Your Style With Bold Fashion",
      subtitle: "Discover our latest curated pieces for the season.",
      ctaText: "Explore Collections",
      ctaLink: "/products",
      accentText: "New Season / Avant-Garde Collection",
      images: [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800",
      ],
    },
    "6": {
      title: "The SS26 Campaign",
      subtitle: "Discover our latest curated edits and signature pieces.",
      ctaText: "Explore All",
      ctaLink: "/products",
      accentText: "New Campaign",
      images: [
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=1000",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000",
      ],
      imageTitles: [
        "Shop Chains",
        "Shop Rings",
        "SS26 Campaign: Out Now",
      ],
      imageLinks: [
        "/products",
        "/products",
        "/products",
      ],
      imageSubtitles: [
        "",
        "",
        "SOURCE MATERIAL",
      ],
    },
    "7": {
      title: "Simplicity Is The Ultimate Sophistication",
      subtitle: "Considered pieces, made to last. No noise — just great design.",
      ctaText: "Shop Now",
      ctaLink: "/products",
      accentText: "The Collection",
    },
    "8": {
      title: "Curious What Else We've Created?",
      subtitle:
        "Explore our latest collection of handcrafted fashion, signature jewelry, and artisanal creations made for the modern aesthetic.",
      ctaText: "Explore Projects",
      ctaLink: "/products",
      accentText: "Behind the Designs",
      images: [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800",
      ],
    },
    "9": {
      images: [
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=1920",
        "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=85&w=1920",
        "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=85&w=1920",
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=85&w=1920",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=85&w=1920",
      ],
    },
    "10": {
      title: "Festive",
      highlightText: "Sale",
      subtitle: "Flat 50% OFF +\nExtra Rs.1000/- OFF",
      ctaText: "Explore More",
      ctaLink: "/products",
      bgImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=85&w=2400",
    },
  },
};

const DEFAULT_FOOTER: FooterConfig = {
  activeTemplate: 1,
  templates: {
    "1": {
      tagline:
        "We are a design house dedicated to the art of Indian textile. Our mission is to keep the loom alive while dressing the future.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
      linkColumns: DEFAULT_LINK_COLUMNS,
    },
    "2": {
      tagline: "Crafting timeless Indian fashion for the modern world.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
      linkColumns: DEFAULT_LINK_COLUMNS,
    },
    "3": {
      tagline: "From our looms to your wardrobe -- authentically Indian.",
      newsletterTitle: "Stay in the loop",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
      linkColumns: DEFAULT_LINK_COLUMNS,
    },
    "4": {
      tagline: "Thank you for being part of our story.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "5": {
      tagline: "Celebrate the season with us.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
      linkColumns: DEFAULT_LINK_COLUMNS,
    },
    "6": {
      tagline: "Designed with care, worn with pride.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
      linkColumns: DEFAULT_LINK_COLUMNS,
    },
  },
};

const DEFAULT_ANNOUNCEMENT_TEXT =
  "Free shipping on orders above ₹999 | New arrivals every week | 100% authentic products | Secure payments";

const emptyForm = {
  type: "DISCOUNT_PANEL" as BannerType,
  title: "",
  discount: "",
  description: "",
  sortOrder: "0",
  isActive: true,
};

const HERO_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": {
    name: "Editorial Split",
    desc: "Text left, asymmetric image grid right — modern editorial look",
  },
  "2": {
    name: "Cinematic Full-width",
    desc: "Large background image with overlay text — dramatic & immersive",
  },
  "3": {
    name: "Dark Minimal Centered",
    desc: "Dark gradient bg, oversized bold typography — high fashion feel",
  },
  "4": {
    name: "Product Spotlight",
    desc: "White bg, text left + single product image right with decorative shapes & badge",
  },
  "5": {
    name: "Fashion Collage Gallery",
    desc: "Centered headline with an elegant 5-column editorial image collage layout below",
  },
  "6": {
    name: "Editorial Triptych",
    desc: "3-image high-fashion split banner with custom editable headline and link for each image",
  },
  "7": {
    name: "Minimal Statement",
    desc: "Oversized type-only hero, no photography needed — safest choice if you don't have hero imagery ready",
  },
  "8": {
    name: "3D Curved Gallery Arc",
    desc: "Panoramic 3D curved arc ribbon of 7 images with centered headline & subtitle",
  },
  "9": {
    name: "5-Banner Auto Carousel",
    desc: "Full-screen carousel with 5 rotating banner images (cycles every 5 seconds) & optional CTA overlay",
  },
  "10": {
    name: "Festive Editorial Banner",
    desc: "Luxury banner with high-contrast serif headline, cursive script accent, discount offer text, and outline CTA button",
  },
};

const FOOTER_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": {
    name: "Dark Professional",
    desc: "Dark background, multi-column grid -- classic & sophisticated",
  },
  "2": {
    name: "Light Editorial",
    desc: "Clean white background, brand-forward -- minimal & modern",
  },
  "3": {
    name: "Gradient with Newsletter",
    desc: "Indigo-to-slate gradient + email signup -- bold & engaging",
  },
  "4": {
    name: "Minimal Centered",
    desc: "Single centered column, no link grid -- pairs with a minimalist storefront",
  },
  "5": {
    name: "Festive Accent Band",
    desc: "Solid theme-primary band with centered branding -- carries the brand color to the page bottom",
  },
  "6": {
    name: "Split Statement",
    desc: "Large brand statement on the left, compact link columns on the right",
  },
};

// Announcement Bar / Banner Carousel / Discount Panels / Featured Collections have no
// per-template content (see saveSectionTemplate above) — only Template 1 exists so far,
// more land here the same way Hero/Footer's label maps grew.
const ANNOUNCEMENT_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": { name: "Scrolling Marquee", desc: "Dark strip, items scroll continuously -- classic ticker" },
  "2": { name: "Static Fade Cycle", desc: "One message at a time, centered, cross-fades to the next -- calmer than the marquee" },
  "3": { name: "Dismissible Pill", desc: "A floating rounded pill the customer can close for the session -- shows only the first message" },
  "4": { name: "Icon Colored Band", desc: "Full-width band in your accent color with a megaphone icon, cross-fading between messages" },
};
const CAROUSEL_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": { name: "Auto-scroll Row", desc: "Images glide horizontally, pauses on hover" },
  "2": { name: "Static Grid", desc: "Calm responsive grid with title/discount text overlays" },
  "3": { name: "Full-bleed Slider", desc: "One large banner at a time, auto-advancing with dots and arrows" },
  "4": { name: "Split Showcase", desc: "Large side-by-side promo cards with an editorial feel" },
};
const DISCOUNT_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": { name: "Split Grid", desc: "Two large left panels, stacked panels on the right" },
  "2": { name: "Masonry", desc: "Varied-height columns for a more organic, less rigid feel" },
  "3": { name: "Ticker Strip", desc: "Single horizontal row of compact cards — good for many small promotions" },
  "4": { name: "Badge Grid", desc: "Uniform square cards with a prominent discount badge — clean catalog style" },
};
const FEATURED_TEMPLATE_LABELS: Record<string, { name: string; desc: string }> = {
  "1": { name: "Horizontal Scroll", desc: "Card row with left/right scroll arrows" },
  "2": { name: "Static Grid", desc: "Every product visible at once in a responsive grid — no scrolling needed" },
  "3": { name: "Spotlight Carousel", desc: "One large product at a time with a thumbnail rail to jump between them" },
  "4": { name: "Editorial List", desc: "Magazine-style stacked rows with large images and more room for product info" },
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Compact picker for the 4 presentation-only sections — a smaller cousin of the Hero/
// Footer template grid above (no per-template "Edit content" step, since there's no
// per-template content: just "which layout renders this section's existing data").
const SectionTemplatePicker = ({
  labels,
  activeTemplate,
  onSelect,
  disabled,
}: {
  labels: Record<string, { name: string; desc: string }>;
  activeTemplate: number;
  onSelect: (n: number) => void;
  disabled?: boolean;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
    {Object.entries(labels).map(([key, label]) => {
      const isActive = String(activeTemplate) === key;
      return (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(Number(key))}
          className={`text-left border-2 rounded-xl p-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            isActive
              ? "border-indigo-500 bg-indigo-50/60 shadow-sm shadow-indigo-100"
              : "border-gray-200 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-gray-900">{label.name}</p>
            {isActive && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-snug">{label.desc}</p>
        </button>
      );
    })}
  </div>
);

export default function HomepageManager() {
  // hasPermission() already returns true unconditionally for ADMIN/SUPER_ADMIN (see
  // StaffPermissionContext.tsx) — a STAFF member without the specific permission below
  // is the only case any of these come back false. This page previously had NO
  // permission awareness at all: every Save/Add/Delete/Toggle control rendered fully
  // interactive regardless of what the logged-in staff member actually had, so clicking
  // one just produced a raw {"message":"You do not have permission..."} network 403 with
  // no warning. Each handler below now checks up front and shows a clear toast instead.
  // Note: the Navigation Menu tab's save (saveNavSettings) actually hits
  // /category/nav-order, gated by CATEGORY_EDIT (not a BANNER_* permission) — it rides
  // along in this "Homepage Manager" feature but is a genuinely different permission.
  const { hasPermission } = useStaffPermissions();
  const { user } = useAuth();
  const canBannerAdd = hasPermission("BANNER_ADD");
  const canBannerEdit = hasPermission("BANNER_EDIT");
  const canBannerDelete = hasPermission("BANNER_DELETE");
  const canCategoryEdit = hasPermission("CATEGORY_EDIT");
  const NO_PERMISSION_MSG = "You don't have permission to make changes here — ask an admin to grant it.";
  // The announcement-bar endpoints (/admin/company-settings, /admin/announcement-toggle)
  // are role-gated ADMIN-only on the backend (see admin.routes.ts) — not staff-permission
  // aware at all, unlike everything else on this page. No BANNER_* permission unlocks
  // them, so this is a flat role check rather than hasPermission(...).
  const isStaff = user.role === "STAFF";

  const [activeTab, setActiveTab] = useState<Tab>("ANNOUNCEMENT");

  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [discountSection, setDiscountSection] = useState<SectionHeader>({
    title: "SHOP NOW AND SAVE 30%",
    subtitle: "Grace at a Great Price! Sarees on Discount",
  });
  const [carouselSection, setCarouselSection] = useState<SectionHeader>({
    title: "Curated Looks For You",
    subtitle: "",
  });
  const [featuredSection, setFeaturedSection] = useState<SectionHeader>({
    title: "Featured Collections",
    subtitle: "",
  });
  const [promoSection, setPromoSection] = useState<SectionHeader>({
    title: "Special Offers",
    subtitle: "",
  });
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState(
    DEFAULT_ANNOUNCEMENT_TEXT,
  );
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [togglingAnnouncement, setTogglingAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // Hero config state
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(DEFAULT_HERO);
  const [savingHero, setSavingHero] = useState(false);
  const [editingHeroTemplate, setEditingHeroTemplate] = useState<string | null>(
    null,
  );
  const [heroForm, setHeroForm] = useState<HeroTemplateData>(
    DEFAULT_HERO.templates["1"],
  );

  // Navbar config state
  const [navbarConfig, setNavbarConfig] =
    useState<NavbarConfig>(DEFAULT_NAVBAR);
  const [savingNavbar, setSavingNavbar] = useState(false);

  // Footer config state
  const [footerConfig, setFooterConfig] =
    useState<FooterConfig>(DEFAULT_FOOTER);
  const [savingFooter, setSavingFooter] = useState(false);
  const [editingFooterTemplate, setEditingFooterTemplate] = useState<
    string | null
  >(null);
  const [footerForm, setFooterForm] = useState<FooterTemplateData>(
    DEFAULT_FOOTER.templates["1"],
  );

  // Storefront theme state — themeId is the saved/live value; draftThemeId is what's
  // currently selected in the picker but not yet saved (drives the instant preview via
  // StorefrontPreviewFrame's previewThemeId prop, independent of what's actually live).
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [draftThemeId, setDraftThemeId] = useState<string>(DEFAULT_THEME_ID);

  // Presentation-only template choices for the 4 sections that have no per-template
  // content of their own (see companySettings.controller.ts's SECTION_TEMPLATE_KEYS) —
  // just which hand-built layout renders the same announcement text / banner rows /
  // featured products. Only "1" exists today; more land here the same way Hero/Footer's
  // template numbers grew, with zero change to sections nobody has re-picked.
  const [announcementTemplate, setAnnouncementTemplate] = useState(1);
  const [carouselTemplate, setCarouselTemplate] = useState(1); // PROMO_BANNER / "Banner Carousel" tab
  const [discountTemplate, setDiscountTemplate] = useState(1);
  const [featuredTemplate, setFeaturedTemplate] = useState(1);
  const [savingTheme, setSavingTheme] = useState(false);

  // Bumped after every successful save that changes real storefront content — the
  // single shared preview's src is otherwise fixed for its whole mounted lifetime (see
  // StorefrontPreviewFrame's own comment), so this is what tells it to actually go
  // fetch what was just saved instead of continuing to show stale, first-load content.
  const [previewReloadToken, setPreviewReloadToken] = useState(0);
  const refreshPreview = () => setPreviewReloadToken((n) => n + 1);

  // Device preview toggle for the Live Preview panel. The sidebar column is only ever
  // mobile-width, so "Mobile" renders inline there; "Desktop" needs real desktop-width
  // pixels to mean anything, which the sidebar can't offer, so it opens a full-size
  // modal with its own iframe instead (mounted only while open — the persistent sidebar
  // iframe below is untouched either way).
  const [desktopPreviewOpen, setDesktopPreviewOpen] = useState(false);

  // Navigation menu state — which top-level categories show in the site-wide
  // CategoryMegaMenu, and in what order. Subcategories always ride along with
  // their parent automatically (see CategoryMegaMenu.tsx), so there's nothing to
  // manage for them here.
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navSaving, setNavSaving] = useState(false);
  const [navDirty, setNavDirty] = useState(false);

  // Featured products state
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(
    [],
  );
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<
    "ALL" | "FEATURED_ONLY" | "UNFEATURED_ONLY"
  >("ALL");
  const [featuredPage, setFeaturedPage] = useState(1);
  const [featuredTotalPages, setFeaturedTotalPages] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orderSavingId, setOrderSavingId] = useState<string | null>(null);
  const [orderEditId, setOrderEditId] = useState<string | null>(null);
  const [orderInput, setOrderInput] = useState("");

  // Header edit state (for DISCOUNT/CAROUSEL/FEATURED/PROMO section headers)
  const [editingSection, setEditingSection] = useState<
    "DISCOUNT" | "CAROUSEL" | "FEATURED" | "PROMO" | null
  >(null);
  const [sectionForm, setSectionForm] = useState({ title: "", subtitle: "" });
  const [savingSection, setSavingSection] = useState(false);

  // Banner modal
  const [showModal, setShowModal] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<HomeBanner | null>(null);
  useBodyScrollLock(showModal || desktopPreviewOpen || !!bannerToDelete);
  const [editBanner, setEditBanner] = useState<HomeBanner | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHeroImage, setUploadingHeroImage] = useState<number | null>(
    null,
  );
  const [uploadingBgImage, setUploadingBgImage] = useState(false);

  // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/home-banners/admin");
      setBanners(data.banners);
      setDiscountSection(data.discountSection);
      if (data.carouselSection) setCarouselSection(data.carouselSection);
      if (data.featuredSection) setFeaturedSection(data.featuredSection);
      if (data.promoSection) setPromoSection(data.promoSection);
    } catch {
      toast.error("Failed to load homepage banners");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHomepageConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const [settingsResp, configResp] = await Promise.all([
        api.get("/admin/company-settings"),
        api.get("/admin/homepage-config"),
      ]);
      const announcementRaw: string =
        settingsResp.data?.settings?.ANNOUNCEMENT_BAR ?? "";
      if (announcementRaw) setAnnouncementText(announcementRaw);
      const enabledVal: string =
        settingsResp.data?.settings?.ANNOUNCEMENT_BAR_ENABLED ?? "true";
      setAnnouncementEnabled(enabledVal !== "false");
      // `templates` is deep-merged per key (not shallow-spread) — a store's saved
      // HERO_CONFIG/FOOTER_CONFIG blob predates whichever templates were added after it
      // was first saved, so a shallow `{...DEFAULT_HERO, ...fetched}` would silently
      // drop any newly-added template's defaults the moment ANY template had ever been
      // saved (fetched.templates entirely replacing DEFAULT_HERO.templates instead of
      // filling in what's missing). Mirrors HeroSection.tsx's own per-key merge.
      if (configResp.data?.heroConfig) {
        const fetchedHero = configResp.data.heroConfig;
        setHeroConfig({
          activeTemplate: fetchedHero.activeTemplate ?? DEFAULT_HERO.activeTemplate,
          templates: Object.fromEntries(
            Object.keys(DEFAULT_HERO.templates).map((key) => [
              key,
              { ...DEFAULT_HERO.templates[key], ...fetchedHero.templates?.[key] },
            ]),
          ),
        });
      }
      if (configResp.data?.navbarConfig) {
        const fetchedNavbar = configResp.data.navbarConfig;
        setNavbarConfig({
          activeTemplate: fetchedNavbar.activeTemplate ?? DEFAULT_NAVBAR.activeTemplate,
        });
      }
      if (configResp.data?.footerConfig) {
        const fetchedFooter = configResp.data.footerConfig;
        setFooterConfig({
          activeTemplate: fetchedFooter.activeTemplate ?? DEFAULT_FOOTER.activeTemplate,
          templates: Object.fromEntries(
            Object.keys(DEFAULT_FOOTER.templates).map((key) => [
              key,
              { ...DEFAULT_FOOTER.templates[key], ...fetchedFooter.templates?.[key] },
            ]),
          ),
        });
      }
      const fetchedThemeId: string | undefined = configResp.data?.themeConfig?.themeId;
      if (fetchedThemeId) {
        setThemeId(fetchedThemeId);
        setDraftThemeId(fetchedThemeId);
      }
      if (typeof configResp.data?.announcementTemplate === "number")
        setAnnouncementTemplate(configResp.data.announcementTemplate);
      if (typeof configResp.data?.carouselTemplate === "number")
        setCarouselTemplate(configResp.data.carouselTemplate);
      if (typeof configResp.data?.discountTemplate === "number")
        setDiscountTemplate(configResp.data.discountTemplate);
      if (typeof configResp.data?.featuredTemplate === "number")
        setFeaturedTemplate(configResp.data.featuredTemplate);
    } catch {
      // silently keep defaults
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    fetchHomepageConfig();
  }, [fetchBanners, fetchHomepageConfig]);

  const sortFeaturedList = useCallback((list: FeaturedProduct[]) => {
    return [...list].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const orderA = a.featuredOrder ?? 99999;
      const orderB = b.featuredOrder ?? 99999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const fetchFeaturedProducts = useCallback(
    async (search = featuredSearch, page = featuredPage) => {
      try {
        setFeaturedLoading(true);
        const params = new URLSearchParams({
          search,
          page: String(page),
          limit: "20",
        });
        const { data } = await api.get(
          `/home-banners/featured-products?${params}`,
        );
        setFeaturedProducts(sortFeaturedList(data.products));
        setFeaturedTotalPages(data.pagination.totalPages || 1);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setFeaturedLoading(false);
      }
    },
    [featuredSearch, featuredPage, sortFeaturedList],
  );

  useEffect(() => {
    if (activeTab === "FEATURED") fetchFeaturedProducts();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Navigation menu --------------------------------------------------------
  // Reuses the admin category list endpoint (same one Catalog Management uses) rather
  // than a dedicated one -- it already returns every field on Category, including
  // showInNav/navOrder, so there's nothing new to add server-side for reading.

  const fetchNavCategories = useCallback(async () => {
    setNavLoading(true);
    try {
      const { data } = await api.get("/category/list");
      const topLevel: NavCategory[] = (data.list || [])
        .filter((c: any) => !c.parentId)
        .map((c: any) => ({
          id: c._id ?? c.id,
          name: c.name,
          showInNav: c.showInNav !== false,
          navOrder: c.navOrder ?? 0,
        }))
        .sort((a: NavCategory, b: NavCategory) => a.navOrder - b.navOrder || a.name.localeCompare(b.name));
      setNavCategories(topLevel);
      setNavDirty(false);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setNavLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "NAVIGATION") fetchNavCategories();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNavVisibility = (id: string) => {
    setNavCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, showInNav: !c.showInNav } : c)),
    );
    setNavDirty(true);
  };

  const moveNavCategory = (id: string, direction: "up" | "down") => {
    setNavCategories((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
    setNavDirty(true);
  };

  const saveNavSettings = async () => {
    if (!canCategoryEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "nav-perm-error" });
      return;
    }
    if (navSaving) return;
    setNavSaving(true);
    try {
      const items = navCategories.map((c, index) => ({
        id: c.id,
        showInNav: c.showInNav,
        navOrder: index,
      }));
      await api.patch("/category/nav-order", { items });
      toast.success("Navigation menu updated", { id: "nav-settings-updated" });
      setNavDirty(false);
      fetchNavCategories();
      refreshPreview();
    } catch {
      toast.error("Failed to save navigation settings", { id: "nav-settings-error" });
    } finally {
      setNavSaving(false);
    }
  };

  // -- Announcement -------------------------------------------------------

  const saveAnnouncement = async () => {
    if (isStaff) {
      toast.error("Only an admin can edit the announcement bar.", { id: "announcement-admin-error" });
      return;
    }
    if (savingAnnouncement) return;
    try {
      setSavingAnnouncement(true);
      await api.put("/admin/company-settings", {
        announcementBar: announcementText,
      });
      toast.success("Announcement bar updated", { id: "announcement-bar-updated" });
      refreshPreview();
    } catch {
      toast.error("Failed to save announcement", { id: "announcement-bar-error" });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const toggleAnnouncement = async (enabled: boolean) => {
    if (isStaff) {
      toast.error("Only an admin can enable/disable the announcement bar.", { id: "announcement-toggle-perm" });
      return;
    }
    if (togglingAnnouncement) return;
    try {
      setTogglingAnnouncement(true);
      await api.patch("/admin/announcement-toggle", { enabled });
      setAnnouncementEnabled(enabled);
      toast.success(`Announcement bar ${enabled ? "enabled" : "disabled"}`, { id: "announcement-toggle-status" });
      refreshPreview();
    } catch {
      toast.error("Failed to update announcement bar visibility", { id: "announcement-toggle-error" });
    } finally {
      setTogglingAnnouncement(false);
    }
  };

  // Storefront Theme
  const saveTheme = async () => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    if (savingTheme) return;
    setSavingTheme(true);
    try {
      await api.put("/admin/homepage-config/theme", { themeId: draftThemeId });
      setThemeId(draftThemeId);
      toast.success("Storefront theme updated", { id: "storefront-theme-updated" });
      refreshPreview();
    } catch {
      toast.error("Failed to update storefront theme", { id: "storefront-theme-error" });
      // Roll the draft back to the last saved value so the picker/preview don't keep
      // showing a theme that never actually saved.
      setDraftThemeId(themeId);
    } finally {
      setSavingTheme(false);
    }
  };

  // ── Presentation-only section templates (Announcement/Carousel/Discount/Featured) ──
  // Each is a bare positive integer, not a JSON blob — no per-template content to save,
  // just which layout renders the section's existing data (see the state declarations
  // above). All four follow the identical save-then-preview-refresh shape, factored into
  // one helper instead of four near-copies of the same nine lines.
  const saveSectionTemplate = async (
    endpoint: string,
    templateNum: number,
    currentValue: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "section-perm-error" });
      return;
    }
    setter(templateNum); // optimistic — the picker should react instantly
    try {
      await api.put(endpoint, { activeTemplate: templateNum });
      toast.success("Template updated", { id: `template-update-${endpoint}` });
      refreshPreview();
    } catch {
      toast.error("Failed to update template", { id: `template-error-${endpoint}` });
      setter(currentValue); // roll back to whatever was actually saved before this click
    }
  };

  const handleAnnouncementTemplateSelect = (n: number) =>
    saveSectionTemplate("/admin/homepage-config/announcement-template", n, announcementTemplate, setAnnouncementTemplate);
  const handleCarouselTemplateSelect = (n: number) =>
    saveSectionTemplate("/admin/homepage-config/carousel-template", n, carouselTemplate, setCarouselTemplate);
  const handleDiscountTemplateSelect = (n: number) =>
    saveSectionTemplate("/admin/homepage-config/discount-template", n, discountTemplate, setDiscountTemplate);
  const handleFeaturedTemplateSelect = (n: number) =>
    saveSectionTemplate("/admin/homepage-config/featured-template", n, featuredTemplate, setFeaturedTemplate);

  // ─── Hero Config ────────────────────────────────────────────────────────────

  const handleHeroTemplateSelect = async (templateNum: number) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "hero-perm-error" });
      return;
    }
    const updated = {
      ...heroConfig,
      activeTemplate: templateNum as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
    };
    setHeroConfig(updated);
    try {
      await api.put("/admin/homepage-config/hero", updated);
      toast.success(`Hero template ${templateNum} activated`, { id: "hero-template-activated" });
      refreshPreview();
    } catch {
      toast.error("Failed to update hero template", { id: "hero-template-error" });
    }
  };

  const openHeroEdit = (templateKey: string) => {
    // Falls back to THIS template's own defaults, not template 1's — matters whenever
    // the DB's saved HERO_CONFIG predates a newly-added template (e.g. right after
    // Template6 shipped, existing installs' saved blob has no "6" entry yet).
    const rawData =
      heroConfig.templates[templateKey] ??
      DEFAULT_HERO.templates[templateKey] ??
      DEFAULT_HERO.templates["1"];
    const cleaned = { ...rawData };
    // Prevent cross-template field leakage between collage/carousel templates and background image templates
    if (["1", "3", "5", "6", "8", "9"].includes(templateKey)) {
      delete cleaned.bgImage;
    } else if (["2", "4", "10"].includes(templateKey)) {
      delete cleaned.images;
      delete cleaned.imageTitles;
      delete cleaned.imageLinks;
      delete cleaned.imageSubtitles;
    } else if (["7"].includes(templateKey)) {
      delete cleaned.bgImage;
      delete cleaned.images;
      delete cleaned.imageTitles;
      delete cleaned.imageLinks;
      delete cleaned.imageSubtitles;
    }
    setHeroForm(cleaned);
    setEditingHeroTemplate(templateKey);
  };

  const saveHeroTemplate = async () => {
    if (!editingHeroTemplate) return;
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "hero-perm-error" });
      return;
    }
    if (savingHero) return;

    // Sanitize template data to prevent cross-pollution between bgImage and images
    const sanitizedForm: HeroTemplateData = { ...heroForm };
    if (["1", "3", "5", "6", "8", "9"].includes(editingHeroTemplate)) {
      delete sanitizedForm.bgImage;
    } else if (["2", "4", "10"].includes(editingHeroTemplate)) {
      delete sanitizedForm.images;
      delete sanitizedForm.imageTitles;
      delete sanitizedForm.imageLinks;
      delete sanitizedForm.imageSubtitles;
    } else if (["7"].includes(editingHeroTemplate)) {
      delete sanitizedForm.bgImage;
      delete sanitizedForm.images;
      delete sanitizedForm.imageTitles;
      delete sanitizedForm.imageLinks;
      delete sanitizedForm.imageSubtitles;
    }

    const updated: HeroConfig = {
      ...heroConfig,
      templates: { ...heroConfig.templates, [editingHeroTemplate]: sanitizedForm },
    };
    try {
      setSavingHero(true);
      await api.put("/admin/homepage-config/hero", updated);
      setHeroConfig(updated);
      setEditingHeroTemplate(null);
      toast.success("Hero template saved", { id: "hero-template-saved" });
      refreshPreview();
    } catch {
      toast.error("Failed to save hero template", { id: "hero-template-save-error" });
    } finally {
      setSavingHero(false);
    }
  };

  const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB

  const uploadHeroImage = async (file: File, index: number) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "hero-upload-perm-error" });
      return;
    }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB", { id: "hero-img-upload-error" });
      return;
    }
    const previousUrl = heroForm.images?.[index];
    try {
      setUploadingHeroImage(index);
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "hero");
      if (previousUrl && previousUrl.includes("cloudinary.com")) {
        fd.append("previousUrl", previousUrl);
      }
      const { data } = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imgs = [...(heroForm.images ?? [])];
      imgs[index] = data.url;
      setHeroForm((p) => ({ ...p, images: imgs }));
      toast.success("Image uploaded successfully", { id: "hero-img-uploaded" });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Image upload failed";
      toast.error(msg, { id: "hero-img-upload-error" });
    } finally {
      setUploadingHeroImage(null);
    }
  };

  const uploadHeroBgImage = async (file: File) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "hero-upload-perm-error" });
      return;
    }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB", { id: "hero-bg-upload-error" });
      return;
    }
    const previousUrl = heroForm.bgImage;
    try {
      setUploadingBgImage(true);
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", "hero");
      if (previousUrl && previousUrl.includes("cloudinary.com")) {
        fd.append("previousUrl", previousUrl);
      }
      const { data } = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHeroForm((p) => ({ ...p, bgImage: data.url }));
      toast.success("Image uploaded successfully", { id: "hero-bg-uploaded" });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Image upload failed";
      toast.error(msg, { id: "hero-bg-upload-error" });
    } finally {
      setUploadingBgImage(false);
    }
  };

  const removeHeroImage = async (index: number) => {
    const oldUrl = heroForm.images?.[index];
    const imgs = [...(heroForm.images ?? [])];
    imgs[index] = "";
    setHeroForm((p) => ({ ...p, images: imgs }));

    if (oldUrl && oldUrl.includes("cloudinary.com")) {
      try {
        await api.post("/admin/delete-image", { url: oldUrl });
        toast.success("Image removed", { id: "hero-img-removed" });
      } catch (err) {
        console.warn("Failed to delete removed hero image from Cloudinary", err);
      }
    }
  };

  const removeHeroBgImage = async () => {
    const oldUrl = heroForm.bgImage;
    setHeroForm((p) => ({ ...p, bgImage: "" }));

    if (oldUrl && oldUrl.includes("cloudinary.com")) {
      try {
        await api.post("/admin/delete-image", { url: oldUrl });
        toast.success("Background image removed", { id: "hero-bg-removed" });
      } catch (err) {
        console.warn("Failed to delete background image from Cloudinary", err);
      }
    }
  };

  // ── Header / Navbar Config ──────────────────────────────────────────────────

  const handleNavbarTemplateSelect = async (templateNum: number) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "navbar-perm-error" });
      return;
    }
    if (savingNavbar) return;
    const updated: NavbarConfig = {
      ...navbarConfig,
      activeTemplate: templateNum as 1 | 2 | 3 | 4,
    };
    setNavbarConfig(updated);
    try {
      setSavingNavbar(true);
      await api.put("/admin/homepage-config/navbar", updated);
      toast.success(`Header template ${templateNum} activated`, { id: "navbar-template-activated" });
      refreshPreview();
    } catch {
      toast.error("Failed to update navbar template", { id: "navbar-template-error" });
    } finally {
      setSavingNavbar(false);
    }
  };

  // â”€â”€ Footer Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFooterTemplateSelect = async (templateNum: number) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "footer-perm-error" });
      return;
    }
    const updated = {
      ...footerConfig,
      activeTemplate: templateNum as 1 | 2 | 3 | 4 | 5 | 6,
    };
    setFooterConfig(updated);
    try {
      await api.put("/admin/homepage-config/footer", updated);
      toast.success(`Footer template ${templateNum} activated`, { id: "footer-template-activated" });
      refreshPreview();
    } catch {
      toast.error("Failed to update footer template", { id: "footer-template-error" });
    }
  };

  const openFooterEdit = (templateKey: string) => {
    // Same "fall back to this template's own defaults" fix as openHeroEdit above.
    setFooterForm({
      ...(footerConfig.templates[templateKey] ?? DEFAULT_FOOTER.templates[templateKey] ?? DEFAULT_FOOTER.templates["1"]),
    });
    setEditingFooterTemplate(templateKey);
  };

  // Templates 1/2/3/5/6's link-grid columns — always exactly 3 (Shop/Company/Support by
  // default), each with 2 links. Both helpers copy-on-write down to the specific link
  // being edited so React sees a new array/object and re-renders.
  const updateLinkColumnHeading = (colIdx: number, heading: string) => {
    setFooterForm((p) => {
      const cols = (p.linkColumns ?? DEFAULT_LINK_COLUMNS).map((c) => ({ ...c, links: [...c.links] }));
      cols[colIdx].heading = heading;
      return { ...p, linkColumns: cols };
    });
  };
  const updateLinkItem = (colIdx: number, linkIdx: number, patch: Partial<FooterLinkItem>) => {
    setFooterForm((p) => {
      const cols = (p.linkColumns ?? DEFAULT_LINK_COLUMNS).map((c) => ({ ...c, links: [...c.links] }));
      cols[colIdx].links[linkIdx] = { ...cols[colIdx].links[linkIdx], ...patch };
      return { ...p, linkColumns: cols };
    });
  };

  const saveFooterTemplate = async () => {
    if (!editingFooterTemplate) return;
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG, { id: "footer-perm-error" });
      return;
    }
    if (savingFooter) return;
    const updated: FooterConfig = {
      ...footerConfig,
      templates: {
        ...footerConfig.templates,
        [editingFooterTemplate]: footerForm,
      },
    };
    try {
      setSavingFooter(true);
      await api.put("/admin/homepage-config/footer", updated);
      setFooterConfig(updated);
      setEditingFooterTemplate(null);
      toast.success("Footer template saved", { id: "footer-template-saved" });
      refreshPreview();
    } catch {
      toast.error("Failed to save footer template", { id: "footer-template-save-error" });
    } finally {
      setSavingFooter(false);
    }
  };

  // â”€â”€ Featured â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFeaturedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFeaturedPage(1);
    fetchFeaturedProducts(featuredSearch, 1);
  };

  const handleToggleFeatured = async (product: FeaturedProduct) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      setTogglingId(product.id);
      const { data } = await api.patch(
        `/home-banners/featured-products/${product.id}/toggle`,
      );
      setFeaturedProducts((prev) =>
        sortFeaturedList(
          prev.map((p) => (p.id === product.id ? { ...p, ...data } : p))
        )
      );
      toast.success(
        data.isFeatured
          ? `"${product.name}" enabled in Featured Collections`
          : `"${product.name}" disabled from Featured Collections`,
      );
      refreshPreview();
    } catch {
      toast.error("Failed to update featured status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSwapFeaturedOrder = async (
    product: FeaturedProduct,
    direction: "UP" | "DOWN",
  ) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    const activeFeatured = featuredProducts.filter((p) => p.isFeatured);
    const currentIndex = activeFeatured.findIndex((p) => p.id === product.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "UP" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeFeatured.length) return;

    const neighborProduct = activeFeatured[targetIndex];
    const newCurrentOrder = targetIndex + 1;
    const newNeighborOrder = currentIndex + 1;

    try {
      setOrderSavingId(product.id);
      await Promise.all([
        api.patch(`/home-banners/featured-products/${product.id}/order`, {
          order: newCurrentOrder,
        }),
        api.patch(`/home-banners/featured-products/${neighborProduct.id}/order`, {
          order: newNeighborOrder,
        }),
      ]);

      setFeaturedProducts((prev) =>
        sortFeaturedList(
          prev.map((p) => {
            if (p.id === product.id)
              return { ...p, featuredOrder: newCurrentOrder };
            if (p.id === neighborProduct.id)
              return { ...p, featuredOrder: newNeighborOrder };
            return p;
          })
        )
      );

      toast.success(`Moved "${product.name}" to position #${newCurrentOrder}`);
      refreshPreview();
    } catch {
      toast.error("Failed to update order position");
    } finally {
      setOrderSavingId(null);
    }
  };

  const handleSaveOrder = async (
    product: FeaturedProduct,
    explicitOrder?: number,
  ) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    const targetVal =
      explicitOrder !== undefined ? explicitOrder : parseInt(orderInput);
    if (isNaN(targetVal) || targetVal < 1) {
      toast.error("Order position must be 1 or greater");
      return;
    }

    try {
      setOrderSavingId(product.id);

      const activeFeatured = featuredProducts.filter(
        (p) => p.isFeatured && p.id !== product.id
      );
      const targetIdx = Math.max(
        0,
        Math.min(targetVal - 1, activeFeatured.length)
      );
      activeFeatured.splice(targetIdx, 0, product);

      const updates = activeFeatured.map((item, idx) => ({
        id: item.id,
        order: idx + 1,
      }));

      await Promise.all(
        updates
          .filter(
            (u) =>
              u.id === product.id ||
              u.order !==
                featuredProducts.find((p) => p.id === u.id)?.featuredOrder
          )
          .map((u) =>
            api.patch(`/home-banners/featured-products/${u.id}/order`, {
              order: u.order,
            })
          )
      );

      setFeaturedProducts((prev) =>
        sortFeaturedList(
          prev.map((p) => {
            const match = updates.find((u) => u.id === p.id);
            return match ? { ...p, featuredOrder: match.order } : p;
          })
        )
      );

      setOrderEditId(null);
      toast.success(
        `Position #${targetIdx + 1} assigned to "${product.name}"`,
      );
      refreshPreview();
    } catch {
      toast.error("Failed to update order position");
    } finally {
      setOrderSavingId(null);
    }
  };

  const filtered =
    activeTab === "DISCOUNT_PANEL" ||
      activeTab === "CAROUSEL_ITEM" ||
      activeTab === "PROMO_BANNER"
      ? banners.filter((b) => b.type === activeTab)
      : [];

  // â”€â”€ Section Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openHeaderEdit = (
    section: "DISCOUNT" | "CAROUSEL" | "FEATURED" | "PROMO",
  ) => {
    const current =
      section === "DISCOUNT"
        ? discountSection
        : section === "CAROUSEL"
          ? carouselSection
          : section === "PROMO"
            ? promoSection
            : featuredSection;
    setSectionForm({ title: current.title, subtitle: current.subtitle });
    setEditingSection(section);
  };

  const saveHeader = async () => {
    if (!editingSection) return;
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      setSavingSection(true);
      const endpoint =
        editingSection === "DISCOUNT"
          ? "/home-banners/discount-header"
          : editingSection === "CAROUSEL"
            ? "/home-banners/carousel-header"
            : editingSection === "PROMO"
              ? "/home-banners/promo-header"
              : "/home-banners/featured-header";
      await api.put(endpoint, sectionForm);
      if (editingSection === "DISCOUNT") setDiscountSection({ ...sectionForm });
      else if (editingSection === "CAROUSEL")
        setCarouselSection({ ...sectionForm });
      else if (editingSection === "PROMO") setPromoSection({ ...sectionForm });
      else setFeaturedSection({ ...sectionForm });
      setEditingSection(null);
      toast.success("Header updated");
      refreshPreview();
    } catch {
      toast.error("Failed to update header");
    } finally {
      setSavingSection(false);
    }
  };

  // â”€â”€ Banner form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openCreate = () => {
    setEditBanner(null);
    const bannerType: BannerType =
      activeTab === "DISCOUNT_PANEL" ||
        activeTab === "CAROUSEL_ITEM" ||
        activeTab === "PROMO_BANNER"
        ? activeTab
        : "DISCOUNT_PANEL";
    setForm({ ...emptyForm, type: bannerType });
    setImageFile(null);
    setImagePreview("");
    setShowModal(true);
  };

  const openEdit = (banner: HomeBanner) => {
    setEditBanner(banner);
    setForm({
      type: banner.type,
      title: banner.title,
      discount: banner.discount ?? "",
      description: banner.description ?? "",
      sortOrder: String(banner.sortOrder),
      isActive: banner.isActive,
    });
    setImageFile(null);
    setImagePreview(banner.image);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB");
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editBanner ? !canBannerEdit : !canBannerAdd) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    if (!editBanner && !imageFile) {
      toast.error("Please select an image");
      return;
    }
    const fd = new FormData();
    fd.append("type", form.type);
    fd.append("title", form.title);
    fd.append("discount", form.discount);
    fd.append("description", form.description);
    fd.append("sortOrder", form.sortOrder);
    fd.append("isActive", String(form.isActive));
    if (imageFile) fd.append("image", imageFile);
    try {
      setSaving(true);
      if (editBanner) {
        await api.put(`/home-banners/${editBanner.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner updated");
      } else {
        await api.post("/home-banners", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner created");
      }
      setShowModal(false);
      fetchBanners();
      refreshPreview();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save banner";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (banner: HomeBanner) => {
    if (!canBannerDelete) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setBannerToDelete(banner);
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    if (!canBannerDelete) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      setDeletingId(bannerToDelete.id);
      await api.delete(`/home-banners/${bannerToDelete.id}`);
      toast.success("Banner deleted");
      setBanners((prev) => prev.filter((b) => b.id !== bannerToDelete.id));
      refreshPreview();
      setBannerToDelete(null);
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (banner: HomeBanner) => {
    if (!canBannerEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      const { data } = await api.patch(`/home-banners/${banner.id}/toggle`);
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? data : b)));
      refreshPreview();
    } catch {
      toast.error("Failed to toggle banner");
    }
  };

  // ─── Tab definitions ────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "ANNOUNCEMENT",
      label: "Announcement Bar",
      icon: <SpeakerWaveIcon className="w-4 h-4" />,
    },
    {
      key: "HEADER",
      label: "Header / Navbar",
      icon: <ComputerDesktopIcon className="w-4 h-4" />,
    },
    {
      key: "HERO",
      label: "Hero Section",
      icon: <HeroPhotoIcon className="w-4 h-4" />,
    },
    {
      key: "PROMO_BANNER",
      label: "Banner Carousel",
      icon: <RectangleStackIcon className="w-4 h-4" />,
    },
    { key: "DISCOUNT_PANEL", label: "Discount Panels", icon: null },
    { key: "CAROUSEL_ITEM", label: "Curated Carousel", icon: null },
    { key: "FEATURED", label: "Featured Collections", icon: null },
    {
      key: "FOOTER",
      label: "Footer Section",
      icon: <Squares2X2Icon className="w-4 h-4" />,
    },
    {
      key: "NAVIGATION",
      label: "Navigation Menu",
      icon: <Bars3Icon className="w-4 h-4" />,
    },
    {
      key: "THEME",
      label: "Storefront Theme",
      icon: <SwatchIcon className="w-4 h-4" />,
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  // The single shared preview's anchor — which section of the real storefront it
  // scrolls to — derived from whichever tab is active. Undefined (top of page) for
  // tabs with no one specific section to jump to (Navigation, Theme).
  const previewAnchor: string | undefined =
    activeTab === "ANNOUNCEMENT"
      ? "announcement"
      : activeTab === "HEADER"
        ? "header"
        : activeTab === "HERO"
          ? "hero"
        : activeTab === "FOOTER"
          ? "footer"
          : activeTab === "DISCOUNT_PANEL"
            ? "discount"
            : activeTab === "CAROUSEL_ITEM"
              ? "carousel"
              : activeTab === "PROMO_BANNER"
                ? "banner"
                : activeTab === "FEATURED"
                  ? "featured"
                  : undefined;

  return (
    <div className="px-8 py-8 w-full bg-slate-50/50 min-h-screen">
      {/* Premium Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-600 uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Storefront Control Center
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            Homepage Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Deploy dynamic promotional layouts, calibrate your main hero templates, orchestrate live active product grids, and configure global canvas banner layouts.
          </p>
        </div>
      </div>

      {/* Navigation Matrix Tabs */}
      <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-xl border border-gray-200/80 shadow-sm mb-8">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${activeTab === key
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            {icon && <span className={activeTab === key ? "text-white" : "text-gray-400 group-hover:text-gray-600"}>{icon}</span>}
            {label}
          </button>
        ))}
      </div>

      {/* Editor (left) + single persistent storefront preview (right) — the preview
          never unmounts on tab switch (see StorefrontPreviewFrame's own comment on why
          the iframe must never re-navigate): only its anchor/previewThemeId props
          change, so it stays one live iframe instead of a fresh reload per tab. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-8 items-start">
        <div className="min-w-0">

      {/* ── ANNOUNCEMENT TAB ─────────────────────────────────────────────────── */}
      {activeTab === "ANNOUNCEMENT" && (
        <div className="space-y-6 animate-fadeIn">

          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Layout</h3>
            <SectionTemplatePicker
              labels={ANNOUNCEMENT_TEMPLATE_LABELS}
              activeTemplate={announcementTemplate}
              onSelect={handleAnnouncementTemplateSelect}
              disabled={!canBannerEdit}
            />
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] " />
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">

                <div>
                  <h3 className="font-bold text-gray-900 text-sm">System Visibility</h3>
                  <p className="text-xs text-gray-400">Global global status header toggle</p>
                </div>
              </div>

              {configLoading ? (
                <button
                  disabled
                  className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border bg-gray-50 text-gray-400 border-gray-200"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                  Checking...
                </button>
              ) : (
                <button
                  onClick={() => toggleAnnouncement(!announcementEnabled)}
                  disabled={togglingAnnouncement}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 disabled:opacity-50 ${announcementEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${announcementEnabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                  {togglingAnnouncement ? "Syncing..." : announcementEnabled ? "Active on Store" : "Deactivated"}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              This scrolling marquee ticker displays real-time messages at the absolute top point of the frontend client experience.
            </p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ticker String Sequence Pipeline
                </label>

              </div>

              <textarea
                rows={5}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-800 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 resize-none font-sans shadow-inner leading-relaxed"
                placeholder="Free shipping on orders above ₹999 | New arrivals every week"
              />

              <div className="flex gap-2 items-start mt-3 text-xs text-gray-400 leading-normal">
                <span className="text-indigo-500 font-bold mt-0.5">💡</span>
                <p>
                  Each sentence broken down by standard pipe character <code className="bg-slate-100 text-slate-700 font-mono px-1 py-0.5 rounded font-bold">|</code> acts as an independent carousel slide entry when rendered.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => saveAnnouncement()}
                disabled={savingAnnouncement}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide uppercase hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {savingAnnouncement ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Committing Changes...
                  </>
                ) : (
                  "Deploy Announcement"
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* â”€â”€ HERO TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "HERO" && (
        <div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-indigo-700 font-medium">
              Choose one of 5 modern hero section templates. Edit each
              template's content independently. The{" "}
              <span className="font-bold">active</span> template is shown on the
              live homepage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((key) => {
              const label = HERO_TEMPLATE_LABELS[key];
              const isActive = String(heroConfig.activeTemplate) === key;
              const isEditing = editingHeroTemplate === key;
              const isDarkStrip = key === "2" || key === "3" || key === "5" || key === "6" || key === "8" || key === "9" || key === "10";
              return (
                <div
                  key={key}
                  className={`border-2 rounded-xl overflow-hidden transition-all ${isActive
                    ? "border-indigo-500 shadow-md shadow-indigo-100"
                    : "border-gray-200"
                    }`}
                >
                  {/* Template preview strip */}
                  <div
                    className={`h-24 flex items-center justify-center text-xs font-bold text-white tracking-wider uppercase ${key === "1"
                      ? "bg-gradient-to-r from-gray-100 to-indigo-100 text-gray-700"
                      : key === "2"
                        ? "bg-gradient-to-r from-gray-900 to-gray-700"
                        : key === "3"
                          ? "bg-gradient-to-r from-indigo-950 to-slate-900"
                          : key === "4"
                            ? "bg-gradient-to-r from-rose-50 to-purple-100 text-gray-900"
                            : key === "5"
                              ? "bg-gradient-to-r from-[#FF6A13] to-[#FFB03A] text-white"
                              : key === "6"
                                ? "bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] text-white"
                                : key === "7"
                                  ? "bg-gradient-to-r from-white to-gray-50 text-gray-700 border-b border-gray-100"
                                  : key === "8"
                                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white"
                                    : key === "9"
                                      ? "bg-gradient-to-r from-neutral-800 to-neutral-600"
                                      : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white"
                      }`}
                  >
                    <div className="text-center px-3">
                      <p
                        className={`text-base font-black tracking-tight mb-1 ${isDarkStrip ? "text-white" : "text-gray-900"}`}
                      >
                        {label.name}
                      </p>
                      <p
                        className={`text-[10px] font-normal ${isDarkStrip ? "text-white/60" : "text-gray-500"}`}
                      >
                        Template {key}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <p className="text-xs text-gray-500 mb-3 leading-snug">
                      {label.desc}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleHeroTemplateSelect(Number(key))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                          ? "bg-indigo-100 text-indigo-700 cursor-default"
                          : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                          }`}
                      >
                        {isActive ? "Active" : "Set Active"}
                      </button>
                      <button
                        onClick={() =>
                          isEditing
                            ? setEditingHeroTemplate(null)
                            : openHeroEdit(key)
                        }
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                      {key !== "6" && key !== "9" && key !== "10" && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Headline
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.title}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Hero headline"
                            />
                          </div>
                          {key !== "5" && (
                            <div>
                              <label className="text-xs font-semibold text-gray-600">
                                Subtitle / Description
                              </label>
                              <textarea
                                rows={2}
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                value={heroForm.subtitle}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    subtitle: e.target.value,
                                  }))
                                }
                                placeholder="Supporting text below the headline"
                              />
                            </div>
                          )}
                          {key !== "8" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-semibold text-gray-600">
                                  CTA Button Text
                                </label>
                                <input
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  value={heroForm.ctaText}
                                  onChange={(e) =>
                                    setHeroForm((p) => ({
                                      ...p,
                                      ctaText: e.target.value,
                                    }))
                                  }
                                  placeholder="Shop Now"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600">
                                  CTA Link
                                </label>
                                <input
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  value={heroForm.ctaLink}
                                  onChange={(e) =>
                                    setHeroForm((p) => ({
                                      ...p,
                                      ctaLink: e.target.value,
                                    }))
                                  }
                                  placeholder="/products"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {key === "1" && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Hero Images{" "}
                            <span className="font-normal text-gray-400">
                              (9 slots — fills the 3×3 image grid)
                            </span>
                          </label>
                          <p className="text-[11px] text-gray-400 mb-2">
                            Leave empty to use built-in sample images.
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {Array.from({ length: 9 }).map((_, i) => {
                              const imgUrl = heroForm.images?.[i] ?? "";
                              const uploading = uploadingHeroImage === i;
                              return (
                                <label
                                  key={i}
                                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors bg-gray-50 flex items-center justify-center group"
                                >
                                  {imgUrl ? (
                                    <>
                                      <img
                                        src={imgUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-[9px] font-bold">
                                          Replace
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          removeHeroImage(i);
                                        }}
                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center z-10 leading-none"
                                      >
                                        ×
                                      </button>
                                    </>
                                  ) : uploading ? (
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span className="text-[8px] text-indigo-600 font-bold tracking-wide">
                                        Uploading
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <PhotoIcon className="w-4 h-4 text-gray-300 mx-auto" />
                                      <span className="text-[9px] text-gray-400 mt-0.5 block">
                                        {i + 1}
                                      </span>
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) uploadHeroImage(f, i);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {key === "2" && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Accent Label{" "}
                              <span className="font-normal text-gray-400">
                                (small pill badge above headline)
                              </span>
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.accentText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  accentText: e.target.value,
                                }))
                              }
                              placeholder="SS26 Collection"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Full-Width Background Photo{" "}
                              <span className="font-normal text-gray-400">
                                (leave blank for default)
                              </span>
                            </label>
                          <div className="mt-1 flex gap-2">
                            <input
                              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.bgImage ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  bgImage: e.target.value,
                                }))
                              }
                              placeholder="https://..."
                            />
                            <label className="flex-none cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-white whitespace-nowrap">
                              {uploadingBgImage ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <PhotoIcon className="w-3.5 h-3.5" />
                                  <span>Upload</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadHeroBgImage(f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                          {heroForm.bgImage && (
                            <div className="mt-2 min-h-[160px] max-h-72 w-full rounded-xl overflow-hidden border border-gray-200 bg-neutral-950 relative group flex items-center justify-center p-2.5 shadow-inner">
                              <img
                                src={heroForm.bgImage}
                                alt=""
                                className="max-h-64 w-auto h-auto object-contain rounded-lg shadow-md"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeHeroBgImage();
                                }}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 transition-colors z-10 cursor-pointer"
                                title="Remove image"
                              >
                                <TrashIcon className="w-3 h-3" />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                      {key === "3" && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Accent Label{" "}
                              <span className="font-normal text-gray-400">
                                (small text above headline)
                              </span>
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.accentText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  accentText: e.target.value,
                                }))
                              }
                              placeholder="New Season"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Collage Images{" "}
                              <span className="font-normal text-gray-400">
                                (4 slots — first spans full width)
                              </span>
                            </label>
                            <p className="text-[11px] text-gray-400 mb-2">
                              Leave empty to use built-in sample images.
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {Array.from({ length: 4 }).map((_, i) => {
                                const imgUrl = heroForm.images?.[i] ?? "";
                                const uploading = uploadingHeroImage === i;
                                return (
                                  <label
                                    key={i}
                                    className={`relative overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors bg-gray-50 flex items-center justify-center group rounded-lg ${i === 0 ? "col-span-2" : ""}`}
                                    style={{
                                      aspectRatio: i === 0 ? "3/1" : "1/1",
                                    }}
                                  >
                                    {imgUrl ? (
                                      <>
                                        <img
                                          src={imgUrl}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-white text-[9px] font-bold">
                                            Replace
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            removeHeroImage(i);
                                          }}
                                          className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center z-10 leading-none"
                                        >
                                          ×
                                        </button>
                                      </>
                                    ) : uploading ? (
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-[8px] text-indigo-600 font-bold tracking-wide">
                                          Uploading
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <PhotoIcon className="w-4 h-4 text-gray-300 mx-auto" />
                                        <span className="text-[9px] text-gray-400 mt-0.5 block">
                                          {i === 0
                                            ? "Wide image"
                                            : `Slot ${i + 1}`}
                                        </span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="sr-only"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) uploadHeroImage(f, i);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                      {key === "4" && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Accent Label{" "}
                              <span className="font-normal text-gray-400">
                                (small text above headline)
                              </span>
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.accentText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  accentText: e.target.value,
                                }))
                              }
                              placeholder="Trendy Collections"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Highlighted Word
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={heroForm.highlightText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  highlightText: e.target.value,
                                }))
                              }
                              placeholder="Create"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              This exact word in the title will be rendered in
                              rose/pink color.
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Product / Model Image{" "}
                              <span className="font-normal text-gray-400">
                                (leave blank for default)
                              </span>
                            </label>
                            <div className="mt-1 flex gap-2">
                              <input
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={heroForm.bgImage ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    bgImage: e.target.value,
                                  }))
                                }
                                placeholder="https://..."
                              />
                              <label className="flex-none cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-white whitespace-nowrap">
                                {uploadingBgImage ? (
                                  <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <PhotoIcon className="w-3.5 h-3.5" />
                                    <span>Upload</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadHeroBgImage(f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                              <span>⚠️</span> For best results, use a PNG image with a transparent background.
                            </p>
                            {heroForm.bgImage && (
                              <div className="mt-2 min-h-[160px] max-h-72 w-full rounded-xl overflow-hidden border border-gray-200 bg-neutral-950 relative group flex items-center justify-center p-2.5 shadow-inner">
                                <img
                                  src={heroForm.bgImage}
                                  alt=""
                                  className="max-h-64 w-auto h-auto object-contain rounded-lg shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeHeroBgImage();
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 transition-colors z-10 cursor-pointer"
                                  title="Remove image"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Floating Badge Text{" "}
                              <span className="font-normal text-gray-400">
                                (optional)
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
                              value={heroForm.badgeText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  badgeText: e.target.value,
                                }))
                              }
                              placeholder={"25%\nDiscount on Everything"}
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              First line = big text (e.g. &quot;25%&quot;),
                              second line = subtitle. Leave blank to hide the
                              badge.
                            </p>
                          </div>
                        </>
                      )}
                      {key === "5" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block">
                              Top Accent Title{" "}
                              <span className="font-normal text-gray-400">
                                (small text above headline)
                              </span>
                            </label>
                            <input
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              value={heroForm.accentText ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  accentText: e.target.value,
                                }))
                              }
                              placeholder="e.g., New Season"
                            />
                          </div>
                          <label className="text-xs font-semibold text-gray-600 block">
                            Collage Images{" "}
                            <span className="font-normal text-gray-400">
                              (7 slots — matching the Fashion Gallery layout)
                            </span>
                          </label>
                          <p className="text-[11px] text-gray-400">
                            Leave empty to use built-in sample images.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { label: "Col 1 - Top (Orange Suit)", desc: "Aspect 3:4" },
                              { label: "Col 1 - Bottom (Kid)", desc: "Aspect 4:3" },
                              { label: "Col 2 (Green Coat Woman)", desc: "Aspect 1:2" },
                              { label: "Col 3 (Yellow Hat)", desc: "Aspect Square" },
                              { label: "Col 4 (White Cargo Suit)", desc: "Aspect 1:2" },
                              { label: "Col 5 - Top (Red Glasses)", desc: "Aspect 4:3" },
                              { label: "Col 5 - Bottom (Green Suit)", desc: "Aspect 4:3" },
                            ].map((slot, i) => {
                              const imgUrl = heroForm.images?.[i] ?? "";
                              const uploading = uploadingHeroImage === i;
                              return (
                                <label
                                  key={i}
                                  className="relative rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors bg-white flex flex-col items-center justify-center p-2 text-center group min-h-[90px]"
                                >
                                  {imgUrl ? (
                                    <>
                                      <img
                                        src={imgUrl}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-[9px] font-bold">
                                          Replace
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          removeHeroImage(i);
                                        }}
                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center z-10 leading-none"
                                      >
                                        ×
                                      </button>
                                    </>
                                  ) : uploading ? (
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span className="text-[8px] text-indigo-600 font-bold tracking-wide">
                                        Uploading
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="z-10">
                                      <PhotoIcon className="w-4 h-4 text-gray-300 mx-auto mb-1" />
                                      <span className="text-[9px] font-semibold text-gray-600 block leading-tight">
                                        {slot.label}
                                      </span>
                                      <span className="text-[8px] text-gray-400 block mt-0.5">
                                        {slot.desc}
                                      </span>
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) uploadHeroImage(f, i);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {key === "6" && (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-gray-700">
                                3 Editorial Columns &amp; Labels
                              </label>
                              <span className="text-[10px] text-gray-400">
                                3 Split Banners
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Configure photo, title text link, destination URL, and bottom tag for each column.
                            </p>

                            <div className="space-y-3.5">
                              {[0, 1, 2].map((idx) => {
                                const imgUrl = heroForm.images?.[idx] ?? "";
                                const uploading = uploadingHeroImage === idx;
                                const colTitle = idx === 0 ? "Column 1 (Left)" : idx === 1 ? "Column 2 (Center)" : "Column 3 (Right)";

                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3 transition-all hover:border-gray-300"
                                  >
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[11px] flex items-center justify-center border border-indigo-100">
                                          {idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-gray-800">
                                          {colTitle}
                                        </span>
                                      </div>
                                      {imgUrl ? (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                          Photo Loaded
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 font-normal">
                                          Default Photo
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                                      {/* Image Upload Box */}
                                      <div className="w-full sm:w-28 flex-shrink-0">
                                        <label className="relative block aspect-[4/3] sm:aspect-square sm:w-28 sm:h-28 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-all bg-gray-50/80 hover:bg-indigo-50/20 flex items-center justify-center group shadow-xs">
                                          {imgUrl ? (
                                            <>
                                              <img
                                                src={imgUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold px-2 py-1 rounded bg-black/60 backdrop-blur-xs">
                                                  Replace
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  removeHeroImage(idx);
                                                }}
                                                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center z-10 leading-none shadow transition-transform hover:scale-110 cursor-pointer"
                                                title="Remove photo"
                                              >
                                                ×
                                              </button>
                                            </>
                                          ) : uploading ? (
                                            <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                                              <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                              </svg>
                                              <span className="text-[10px] text-indigo-600 font-bold">Uploading...</span>
                                            </div>
                                          ) : (
                                            <div className="text-center p-2">
                                              <HeroPhotoIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                                              <span className="text-[10px] font-semibold text-gray-500 group-hover:text-indigo-600 mt-1 block">
                                                Upload Photo
                                              </span>
                                              <span className="text-[8px] text-gray-400 block mt-0.5">JPG, PNG, WEBP</span>
                                            </div>
                                          )}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadHeroImage(f, idx);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      </div>

                                      {/* Inputs Stack (Full Width, Spacious) */}
                                      <div className="flex-1 w-full space-y-2 min-w-0">
                                        {/* Title input */}
                                        <div>
                                          <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                            Title / Text Link
                                          </label>
                                          <input
                                            type="text"
                                            value={heroForm.imageTitles?.[idx] ?? ""}
                                            onChange={(e) => {
                                              const titles = [...(heroForm.imageTitles ?? ["", "", ""])];
                                              titles[idx] = e.target.value;
                                              setHeroForm((p) => ({ ...p, imageTitles: titles }));
                                            }}
                                            placeholder={idx === 0 ? "Shop Chains" : idx === 1 ? "Shop Rings" : "SS26 Campaign: Out Now"}
                                            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                          />
                                        </div>

                                        {/* Link input */}
                                        <div>
                                          <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                            Destination Link
                                          </label>
                                          <input
                                            type="text"
                                            value={heroForm.imageLinks?.[idx] ?? ""}
                                            onChange={(e) => {
                                              const links = [...(heroForm.imageLinks ?? ["", "", ""])];
                                              links[idx] = e.target.value;
                                              setHeroForm((p) => ({ ...p, imageLinks: links }));
                                            }}
                                            placeholder="/products"
                                            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-mono text-[11px]"
                                          />
                                        </div>

                                        {/* Subtitle input */}
                                        <div>
                                          <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                            Bottom Tag / Caption
                                          </label>
                                          <input
                                            type="text"
                                            value={heroForm.imageSubtitles?.[idx] ?? ""}
                                            onChange={(e) => {
                                              const subs = [...(heroForm.imageSubtitles ?? ["", "", ""])];
                                              subs[idx] = e.target.value;
                                              setHeroForm((p) => ({ ...p, imageSubtitles: subs }));
                                            }}
                                            placeholder={idx === 2 ? "SOURCE MATERIAL" : "Optional (e.g. NEW DROP)"}
                                            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      {key === "7" && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Accent Label{" "}
                            <span className="font-normal text-gray-400">
                              (small text above headline)
                            </span>
                          </label>
                          <input
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={heroForm.accentText ?? ""}
                            onChange={(e) => setHeroForm((p) => ({ ...p, accentText: e.target.value }))}
                            placeholder="The Collection"
                          />
                        </div>
                      )}
                      {key === "8" && (
                        <div className="space-y-3.5">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-gray-700">
                                Gallery Arc Images
                              </label>
                              <span className="text-[10px] text-gray-400">
                                7 Slots • 3D Curved Ribbon
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Upload photos for the 7 arc positions. Slot 4 sits in the front center. Leave empty to use defaults.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                                const imgUrl = heroForm.images?.[i] ?? "";
                                const uploading = uploadingHeroImage === i;
                                const isCenter = i === 3;
                                const slotLabels = [
                                  "Far Left",
                                  "Left",
                                  "Mid-Left",
                                  "Center (Hero)",
                                  "Mid-Right",
                                  "Right",
                                  "Far Right",
                                ];

                                return (
                                  <div
                                    key={i}
                                    className={`relative flex flex-col bg-white rounded-xl border p-2.5 shadow-xs transition-all ${
                                      isCenter
                                        ? "border-indigo-400 ring-2 ring-indigo-50 bg-indigo-50/20"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className={`w-4 h-4 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                            isCenter
                                              ? "bg-indigo-600 text-white"
                                              : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {i + 1}
                                        </span>
                                        <span
                                          className={`text-[11px] font-bold truncate ${
                                            isCenter ? "text-indigo-700" : "text-gray-800"
                                          }`}
                                        >
                                          {slotLabels[i]}
                                        </span>
                                      </div>
                                      {isCenter && (
                                        <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                                          Center
                                        </span>
                                      )}
                                    </div>

                                    <label className="relative aspect-[3/4] w-full rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-all bg-gray-50/80 hover:bg-indigo-50/20 flex items-center justify-center group shadow-2xs">
                                      {imgUrl ? (
                                        <>
                                          <img
                                            src={imgUrl}
                                            alt={slotLabels[i]}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold px-2 py-1 rounded bg-black/60 backdrop-blur-xs">
                                              Replace
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              removeHeroImage(i);
                                            }}
                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center z-10 leading-none shadow transition-transform hover:scale-110 cursor-pointer"
                                            title="Remove photo"
                                          >
                                            ×
                                          </button>
                                        </>
                                      ) : uploading ? (
                                        <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                                          <svg
                                            className="animate-spin h-5 w-5 text-indigo-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            />
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                          </svg>
                                          <span className="text-[9px] text-indigo-600 font-bold">
                                            Uploading
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-center p-2">
                                          <HeroPhotoIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                                          <span className="text-[10px] font-semibold text-gray-500 group-hover:text-indigo-600 mt-1 block">
                                            Upload
                                          </span>
                                        </div>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) uploadHeroImage(f, i);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Direct Image URL input dropdown */}
                          <details className="mt-2 text-xs text-gray-500">
                            <summary className="cursor-pointer hover:text-indigo-600 font-medium select-none text-[11px] py-1">
                              Or paste direct image URLs...
                            </summary>
                            <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-gray-100">
                              {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-gray-400 w-14 shrink-0">
                                    Slot {idx + 1}:
                                  </span>
                                  <input
                                    type="text"
                                    value={heroForm.images?.[idx] ?? ""}
                                    onChange={(e) => {
                                      const imgs = [
                                        ...(heroForm.images ?? ["", "", "", "", "", "", ""]),
                                      ];
                                      imgs[idx] = e.target.value;
                                      setHeroForm((p) => ({ ...p, images: imgs }));
                                    }}
                                    placeholder="https://..."
                                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                  />
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                      {key === "9" && (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-bold text-gray-700">
                                5 Carousel Banner Images
                              </label>
                              <span className="text-[10px] text-gray-400">
                                Auto-rotates (5s)
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Upload or paste image URLs for all 5 banner slides. Any empty slots will fall back to curated default banners.
                            </p>

                            <div className="space-y-3.5">
                              {[0, 1, 2, 3, 4].map((idx) => {
                                const imgUrl = heroForm.images?.[idx] ?? "";
                                const uploading = uploadingHeroImage === idx;

                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3 transition-all hover:border-gray-300"
                                  >
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[11px] flex items-center justify-center border border-indigo-100">
                                          {idx + 1}
                                        </span>
                                        <span className="text-xs font-bold text-gray-800">
                                          Banner Slide {idx + 1}
                                        </span>
                                      </div>
                                      {imgUrl ? (
                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                          Custom Photo
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-400 font-normal">
                                          Default Fallback
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                                      {/* Image Upload / Preview Box */}
                                      <div className="w-full sm:w-36 flex-shrink-0">
                                        <label className="relative block aspect-[16/9] sm:w-36 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-all bg-gray-50/80 hover:bg-indigo-50/20 flex items-center justify-center group shadow-xs">
                                          {imgUrl ? (
                                            <>
                                              <img
                                                src={imgUrl}
                                                alt={`Banner ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold px-2 py-1 rounded bg-black/60 backdrop-blur-xs">
                                                  Replace
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  removeHeroImage(idx);
                                                }}
                                                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center z-10 leading-none shadow transition-transform hover:scale-110 cursor-pointer"
                                                title="Remove banner"
                                              >
                                                ×
                                              </button>
                                            </>
                                          ) : uploading ? (
                                            <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                                              <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                              </svg>
                                              <span className="text-[10px] text-indigo-600 font-bold">Uploading...</span>
                                            </div>
                                          ) : (
                                            <div className="text-center p-2">
                                              <PhotoIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                                              <span className="text-[10px] font-semibold text-gray-500 group-hover:text-indigo-600 mt-1 block">
                                                Upload Banner
                                              </span>
                                              <span className="text-[8px] text-gray-400 block mt-0.5">16:9 • Max 1 MB</span>
                                            </div>
                                          )}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) uploadHeroImage(f, idx);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      </div>

                                      {/* Direct Image URL input (Full Width) */}
                                      <div className="flex-1 w-full space-y-1.5 min-w-0">
                                        <label className="text-[11px] font-semibold text-gray-700 block">
                                          Or Direct Image URL
                                        </label>
                                        <input
                                          type="text"
                                          value={heroForm.images?.[idx] ?? ""}
                                          onChange={(e) => {
                                            const imgs = [...(heroForm.images ?? ["", "", "", "", ""])];
                                            imgs[idx] = e.target.value;
                                            setHeroForm((p) => ({ ...p, images: imgs }));
                                          }}
                                          placeholder="https://... (or upload photo above)"
                                          className="w-full border border-gray-300 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-mono text-[11px]"
                                        />
                                        <p className="text-[10px] text-gray-400">
                                          Upload a file above or paste an external image link.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      {key === "10" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-600">
                                Main Headline (Serif Font)
                              </label>
                              <input
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={heroForm.title ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="Festive"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-600">
                                Script Accent Word (Cursive Font)
                              </label>
                              <input
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-serif italic"
                                value={heroForm.highlightText ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    highlightText: e.target.value,
                                  }))
                                }
                                placeholder="Sale"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">
                              Offer Subtitle Lines{" "}
                              <span className="font-normal text-gray-400">
                                (press enter for new line)
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-serif"
                              value={heroForm.subtitle ?? ""}
                              onChange={(e) =>
                                setHeroForm((p) => ({
                                  ...p,
                                  subtitle: e.target.value,
                                }))
                              }
                              placeholder={"Flat 50% OFF +\nExtra Rs.1000/- OFF"}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-600">
                                Button Text
                              </label>
                              <input
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase text-xs tracking-wider"
                                value={heroForm.ctaText ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    ctaText: e.target.value,
                                  }))
                                }
                                placeholder="Explore More"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-600">
                                Button Destination Link
                              </label>
                              <input
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={heroForm.ctaLink ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    ctaLink: e.target.value,
                                  }))
                                }
                                placeholder="/products"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">
                              Background Banner Photo
                            </label>
                            <p className="text-[11px] text-gray-400 mb-2">
                              Upload a background image or paste an image URL.
                            </p>
                            <div className="flex gap-2">
                              <input
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={heroForm.bgImage ?? ""}
                                onChange={(e) =>
                                  setHeroForm((p) => ({
                                    ...p,
                                    bgImage: e.target.value,
                                  }))
                                }
                                placeholder="https://..."
                              />
                              <label className="flex-none cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-white whitespace-nowrap">
                                {uploadingBgImage ? (
                                  <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <PhotoIcon className="w-3.5 h-3.5" />
                                    <span>Upload</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadHeroBgImage(f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            {heroForm.bgImage && (
                              <div className="mt-2 w-full rounded-xl overflow-hidden border border-gray-200 bg-neutral-950 relative group p-2 shadow-inner">
                                <img
                                  src={heroForm.bgImage}
                                  alt=""
                                  className="w-full h-auto max-h-64 object-contain rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeHeroBgImage();
                                  }}
                                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 transition-colors z-10 cursor-pointer"
                                  title="Remove image"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => saveHeroTemplate()}
                        disabled={savingHero}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingHero ? "Saving..." : "Save Template"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HEADER TAB ─────────────────────────────────────────────────── */}
      {activeTab === "HEADER" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-700 font-medium">
              Choose one of 6 Navbar designs paired directly with each Footer UI combination. Each navbar UI is crafted with unique aesthetics and butter-smooth transitions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(["1", "2", "3", "4", "5", "6"] as const).map((key) => {
              const label = NAVBAR_TEMPLATE_LABELS[key];
              const isActive = String(navbarConfig.activeTemplate) === key;
              return (
                <div
                  key={key}
                  className={`border-2 rounded-xl overflow-hidden transition-all duration-300 flex flex-col ${
                    isActive
                      ? "border-indigo-500 shadow-lg shadow-indigo-100 bg-white"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  }`}
                >
                  {/* Visual Preview Strip */}
                  <div className="h-28 flex flex-col justify-center px-4 relative overflow-hidden select-none border-b border-gray-100">
                    {key === "1" && (
                      <div className="w-full bg-[#0a0a0a] text-white rounded-lg p-2.5 border border-white/10 shadow-xs flex items-center justify-between h-20">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-[var(--theme-primary,#C9A227)] text-[8px] font-black text-[var(--theme-primary-ink,#0B0B0C)] flex items-center justify-center">
                            A
                          </div>
                          <div className="h-2 w-8 bg-white rounded-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-[var(--theme-primary,#C9A227)] text-[8px] text-[var(--theme-primary-ink,#0B0B0C)] font-bold rounded-md shadow-xs">
                            Home
                          </span>
                          <span className="px-1.5 py-0.5 text-[8px] text-zinc-400">
                            Products
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center" />
                          <div className="w-3.5 h-3.5 rounded-full bg-[var(--theme-primary,#C9A227)] text-[var(--theme-primary-ink,#0B0B0C)]" />
                        </div>
                      </div>
                    )}

                    {key === "2" && (
                      <div className="w-full bg-gray-50 rounded-lg p-2.5 border border-gray-200 shadow-xs flex items-center justify-between h-20 text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-gray-900 text-[8px] font-bold text-white flex items-center justify-center">
                            A
                          </div>
                          <div className="h-2.5 w-10 bg-gray-900 rounded-xs" />
                        </div>
                        <div className="flex items-center gap-2 text-[8px] uppercase tracking-wider font-semibold">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-gray-900">
                              Home
                            </span>
                            <span className="w-2.5 h-[2px] bg-[var(--theme-primary,#C9A227)] rounded-full mt-0.5" />
                          </div>
                          <span className="text-gray-400">Shop</span>
                          <span className="text-gray-400">Story</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 border border-gray-300 rounded-md" />
                          <div className="px-2 py-0.5 bg-[var(--theme-primary,#C9A227)] text-[var(--theme-primary-ink,#0B0B0C)] text-[7px] font-bold rounded-md uppercase shadow-xs">
                            Sign In
                          </div>
                        </div>
                      </div>
                    )}

                    {key === "3" && (
                      <div className="w-full bg-gradient-to-r from-indigo-950 via-slate-900 to-gray-950 text-white rounded-lg p-2.5 border border-indigo-500/30 shadow-xs flex items-center justify-between h-20">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-indigo-500 text-[8px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                            A
                          </div>
                          <div className="h-2 w-8 bg-indigo-200 rounded-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-[8px] text-white font-bold rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                            Home
                          </span>
                          <span className="px-1.5 py-0.5 text-[8px] text-indigo-300">
                            Explore
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-8 bg-white/10 border border-white/20 rounded-full" />
                          <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/80" />
                        </div>
                      </div>
                    )}

                    {key === "4" && (
                      <div className="w-full bg-white rounded-lg p-2.5 border border-gray-100 shadow-xs flex items-center justify-between h-20 text-gray-900">
                        <div className="flex items-center gap-1.5 text-[7px] uppercase tracking-widest font-medium text-gray-400">
                          <span className="text-black font-bold">Home</span>
                          <span>Shop</span>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-black tracking-widest uppercase font-serif text-gray-900">
                            AMORE
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-gray-100" />
                          <div className="w-3 h-3 rounded-full bg-black" />
                        </div>
                      </div>
                    )}

                    {key === "5" && (
                      <div className="w-full bg-indigo-600 text-white rounded-lg p-2.5 border border-indigo-700 shadow-xs flex items-center justify-between h-20">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-white text-[8px] font-bold text-indigo-700 flex items-center justify-center">
                            A
                          </div>
                          <div className="h-2 w-8 bg-white/90 rounded-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-white text-[8px] text-indigo-900 font-bold rounded-md shadow-xs">
                            Home
                          </span>
                          <span className="px-1.5 py-0.5 text-[8px] text-white/80">
                            Festive
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-8 bg-white/20 rounded-full" />
                          <div className="w-3.5 h-3.5 rounded-full bg-white text-indigo-900" />
                        </div>
                      </div>
                    )}

                    {key === "6" && (
                      <div className="w-full bg-white rounded-lg p-2.5 border border-black/10 shadow-xs flex items-center justify-between h-20 text-gray-900">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-xl bg-black text-[8px] font-black text-white flex items-center justify-center">
                            A
                          </div>
                          <div className="h-2.5 w-7 bg-black rounded-xs" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-black text-[7px] text-white font-black rounded-xl">
                            HOME
                          </span>
                          <span className="px-1.5 py-1 bg-gray-100 text-[7px] font-bold text-gray-700 rounded-xl">
                            SHOP
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-xl bg-gray-100" />
                          <div className="w-4 h-4 rounded-xl bg-black" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content & Action */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-bold text-gray-900">
                          {label.name}
                        </p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 font-semibold text-indigo-700 whitespace-nowrap">
                          {label.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 leading-snug">
                        {label.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isActive || savingNavbar}
                      onClick={() => handleNavbarTemplateSelect(Number(key))}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700 cursor-default"
                          : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircleIcon className="w-3.5 h-3.5 text-indigo-600" />
                          Active
                        </>
                      ) : (
                        "Set Active"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOOTER TAB ─────────────────────────────────────────────────── */}
      {activeTab === "FOOTER" && (
        <div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-700 font-medium">
              Choose one of 6 footer templates. The active template renders on
              every page. Each template's content (tagline, etc.) can be edited
              independently.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6"].map((key) => {
              const label = FOOTER_TEMPLATE_LABELS[key];
              const isActive = String(footerConfig.activeTemplate) === key;
              const isEditing = editingFooterTemplate === key;
              const isLightStrip = key === "2" || key === "4" || key === "6";
              return (
                <div
                  key={key}
                  className={`border-2 rounded-xl overflow-hidden transition-all ${isActive
                    ? "border-indigo-500 shadow-md shadow-indigo-100"
                    : "border-gray-200"
                    }`}
                >
                  {/* Preview strip */}
                  <div
                    className={`h-24 flex items-center justify-center ${key === "1"
                      ? "bg-[#0a0a0a]"
                      : key === "2"
                        ? "bg-gray-50 border-b border-gray-200"
                        : key === "3"
                          ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-gray-950"
                          : key === "4"
                            ? "bg-white border-b border-gray-100"
                            : key === "5"
                              ? "bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)]"
                              : "bg-gray-50 border-b border-gray-200"
                      }`}
                  >
                    <div className="text-center">
                      <p
                        className={`text-base font-black tracking-tight mb-0.5 ${isLightStrip ? "text-gray-900" : "text-white"}`}
                      >
                        {label.name}
                      </p>
                      <p
                        className={`text-[10px] ${isLightStrip ? "text-gray-400" : "text-white/50"}`}
                      >
                        Template {key}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <p className="text-xs text-gray-500 mb-3 leading-snug">
                      {label.desc}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFooterTemplateSelect(Number(key))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                          ? "bg-indigo-100 text-indigo-700 cursor-default"
                          : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                          }`}
                      >
                        {isActive ? "Active" : "Set Active"}
                      </button>
                      <button
                        onClick={() =>
                          isEditing
                            ? setEditingFooterTemplate(null)
                            : openFooterEdit(key)
                        }
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">
                          Tagline / Description
                        </label>
                        <textarea
                          rows={3}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                          value={footerForm.tagline}
                          onChange={(e) =>
                            setFooterForm((p) => ({
                              ...p,
                              tagline: e.target.value,
                            }))
                          }
                          placeholder="Short brand description shown in the footer"
                        />
                      </div>

                      {/* Social Media Links section */}
                      <div className="border-t border-gray-200 pt-3 mt-3 space-y-3">
                        <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Social Links</p>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Instagram Link
                          </label>
                          <input
                            type="url"
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={footerForm.instagramLink ?? ""}
                            onChange={(e) =>
                              setFooterForm((p) => ({
                                ...p,
                                instagramLink: e.target.value,
                              }))
                            }
                            placeholder="https://instagram.com/yourbrand"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Facebook Link
                          </label>
                          <input
                            type="url"
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={footerForm.facebookLink ?? ""}
                            onChange={(e) =>
                              setFooterForm((p) => ({
                                ...p,
                                facebookLink: e.target.value,
                              }))
                            }
                            placeholder="https://facebook.com/yourbrand"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Twitter / X Link
                          </label>
                          <input
                            type="url"
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={footerForm.twitterLink ?? ""}
                            onChange={(e) =>
                              setFooterForm((p) => ({
                                ...p,
                                twitterLink: e.target.value,
                              }))
                            }
                            placeholder="https://twitter.com/yourbrand"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">
                            Contact Email / Mail Link
                          </label>
                          <input
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={footerForm.mailLink ?? ""}
                            onChange={(e) =>
                              setFooterForm((p) => ({
                                ...p,
                                mailLink: e.target.value,
                              }))
                            }
                            placeholder="info@yourbrand.com"
                          />
                        </div>
                      </div>

                      {/* Footer link grid — templates 1/2/3/5/6 render this 3-column
                          "Shop / Company / Support" block; Template 4 is deliberately a
                          single centered column with no link grid, so it's skipped here. */}
                      {key !== "4" && (
                        <div className="border-t border-gray-200 pt-3 mt-3 space-y-4">
                          <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Footer Navigation Links</p>
                          {(footerForm.linkColumns ?? DEFAULT_LINK_COLUMNS).map((col, colIdx) => (
                            <div key={colIdx} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                              <input
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={col.heading}
                                onChange={(e) => updateLinkColumnHeading(colIdx, e.target.value)}
                                placeholder="Column heading"
                              />
                              {col.links.map((link, linkIdx) => (
                                <div key={linkIdx} className="flex gap-2">
                                  <input
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={link.label}
                                    onChange={(e) => updateLinkItem(colIdx, linkIdx, { label: e.target.value })}
                                    placeholder="Link text"
                                  />
                                  <input
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={link.url}
                                    onChange={(e) => updateLinkItem(colIdx, linkIdx, { url: e.target.value })}
                                    placeholder="/page or https://…"
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => saveFooterTemplate()}
                        disabled={savingFooter}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingFooter ? "Saving..." : "Save Template"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- NAVIGATION TAB --------------------------------------------------- */}
      {activeTab === "NAVIGATION" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Category Browse Bar</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Controls the site-wide category menu shown under the navbar on every page.
                Subcategories are pulled in automatically from Catalog Management — pick which
                top-level categories appear here, and in what order.
              </p>
            </div>
            <button
              onClick={saveNavSettings}
              disabled={!navDirty || navSaving}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {navSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {navLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading categories...</div>
          ) : navCategories.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No top-level categories yet — add one in Catalog Management first.
            </div>
          ) : (
            <div className="space-y-2">
              {navCategories.map((cat, index) => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    cat.showInNav
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50/60"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveNavCategory(cat.id, "up")}
                      disabled={index === 0}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUpIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNavCategory(cat.id, "down")}
                      disabled={index === navCategories.length - 1}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-900 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span
                    className={`flex-1 text-sm font-semibold ${
                      cat.showInNav ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {cat.name}
                  </span>

                  <span className="text-xs text-gray-400 font-mono w-6 text-right">
                    #{index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleNavVisibility(cat.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      cat.showInNav ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        cat.showInNav ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── THEME TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "THEME" && (
        <div className="animate-fadeIn">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Storefront Theme</h3>
              <p className="text-xs text-gray-400 mt-1">
                Pick a visual theme for the whole customer-facing storefront — colors, accent, and
                typography apply consistently from the header through checkout. Click a swatch to
                preview it instantly on the right before saving.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEMES.map((theme) => {
                const isDraft = draftThemeId === theme.id;
                const isLive = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraftThemeId(theme.id)}
                    className={`text-left rounded-xl border-2 p-3 transition-all cursor-pointer ${
                      isDraft
                        ? "border-indigo-600 ring-2 ring-indigo-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex gap-1.5 mb-2">
                      <span
                        className="h-6 w-6 rounded-full border border-black/10 shrink-0"
                        style={{ background: theme.primary }}
                      />
                      <span
                        className="h-6 w-6 rounded-full border border-black/10 shrink-0"
                        style={{ background: theme.accent }}
                      />
                      <span
                        className="h-6 w-6 rounded-full border border-black/10 shrink-0"
                        style={{ background: theme.surfaceAlt }}
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{theme.name}</p>
                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{theme.vibe}</p>
                    {isLive && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
              {draftThemeId !== themeId ? (
                <span className="text-xs font-semibold text-amber-600">Unsaved — click Save to apply</span>
              ) : (
                <span className="text-xs text-gray-400">Matches what's live on the storefront</span>
              )}
              <button
                onClick={saveTheme}
                disabled={draftThemeId === themeId || savingTheme}
                className="shrink-0 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide uppercase hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTheme ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ BANNER TABS (DISCOUNT / CAROUSEL / PROMO) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(activeTab === "DISCOUNT_PANEL" ||
        activeTab === "CAROUSEL_ITEM" ||
        activeTab === "PROMO_BANNER") && (
          <>
            {/* Section header editor */}
            {(() => {
              const sectionKey: "DISCOUNT" | "CAROUSEL" | "PROMO" =
                activeTab === "DISCOUNT_PANEL"
                  ? "DISCOUNT"
                  : activeTab === "CAROUSEL_ITEM"
                    ? "CAROUSEL"
                    : "PROMO";
              const current =
                sectionKey === "DISCOUNT"
                  ? discountSection
                  : sectionKey === "CAROUSEL"
                    ? carouselSection
                    : promoSection;
              const isEditing = editingSection === sectionKey;
              return (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                              Section Title
                            </label>
                            <input
                              className="mt-1 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={sectionForm.title}
                              onChange={(e) =>
                                setSectionForm((p) => ({
                                  ...p,
                                  title: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                              Subtitle
                            </label>
                            <input
                              className="mt-1 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              value={sectionForm.subtitle}
                              onChange={(e) =>
                                setSectionForm((p) => ({
                                  ...p,
                                  subtitle: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => saveHeader()}
                              disabled={savingSection}
                              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {savingSection ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingSection(null)}
                              className="px-4 py-1.5 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                            Section Header
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {current.title}
                          </p>
                          {current.subtitle && (
                            <p className="text-sm text-gray-500">
                              {current.subtitle}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => openHeaderEdit(sectionKey)}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit Header
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Layout — Discount Panels and Banner Carousel have their own layout choice;
                Curated Carousel (CAROUSEL_ITEM) isn't part of this template library yet. */}
            {activeTab === "DISCOUNT_PANEL" && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Layout</h3>
                <SectionTemplatePicker
                  labels={DISCOUNT_TEMPLATE_LABELS}
                  activeTemplate={discountTemplate}
                  onSelect={handleDiscountTemplateSelect}
                  disabled={!canBannerEdit}
                />
              </div>
            )}
            {activeTab === "PROMO_BANNER" && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Layout</h3>
                <SectionTemplatePicker
                  labels={CAROUSEL_TEMPLATE_LABELS}
                  activeTemplate={carouselTemplate}
                  onSelect={handleCarouselTemplateSelect}
                  disabled={!canBannerEdit}
                />
              </div>
            )}

            {/* Action bar */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
                {filtered.filter((b) => !b.isActive).length > 0 && (
                  <span className="text-gray-400">
                    {" "}
                    ({filtered.filter((b) => !b.isActive).length} hidden)
                  </span>
                )}
              </p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                <PlusIcon className="w-4 h-4" />
                Add{" "}
                {activeTab === "DISCOUNT_PANEL"
                  ? "Discount Panel"
                  : activeTab === "CAROUSEL_ITEM"
                    ? "Carousel Item"
                    : "Promo Banner"}
              </button>
            </div>

            {/* Grid */}
            {/* Grid */}
            {/* Grid */}
            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No items yet. Click "Add" to create one.
              </div>
            ) : activeTab === "CAROUSEL_ITEM" ? (
              /* ── NEW VERTICAL PRESENTATION FOR CURATED CAROUSEL ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filtered.map((banner) => (
                  <div
                    key={banner.id}
                    className={`relative flex flex-col bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${banner.isActive ? "border-gray-200/80" : "border-gray-300 opacity-60"
                      }`}
                  >
                    {/* Tall Portrait Image Block */}
                    <div className="relative aspect-[3/4] w-full bg-slate-100 overflow-hidden group">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ArrowsUpDownIcon className="w-3 h-3 text-indigo-400" />
                          {banner.sortOrder}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${banner.isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                          }`}>
                          {banner.isActive ? "Active" : "Hidden"}
                        </span>
                      </div>
                    </div>

                    {/* Text Details Area */}
                    <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                      <div className="mb-3">
                        <h4 className="font-bold text-gray-950 text-sm tracking-tight truncate">
                          {banner.title}
                        </h4>
                        {banner.description && (
                          <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2 mt-0.5">
                            {banner.description}
                          </p>
                        )}
                      </div>

                      {/* Compact Operations Bar */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleToggle(banner)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {banner.isActive ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => openEdit(banner)}
                          className="flex-1 py-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner)}
                          disabled={deletingId === banner.id}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── RESTORED PREMIUM WIDE LAYOUT FOR DISCOUNT PANELS & CAROUSEL BANNERS ── */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filtered.map((banner) => (
                  <div
                    key={banner.id}
                    className={`relative flex flex-col sm:flex-row bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${banner.isActive
                      ? "border-gray-200/80"
                      : "border-gray-300 bg-gray-50/40 opacity-70"
                      }`}
                  >
                    {/* Aspect Filled Image Block */}
                    <div className="relative w-full sm:w-2/5 min-h-[220px] sm:min-h-full bg-slate-100 flex-shrink-0">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                        <ArrowsUpDownIcon className="w-3.5 h-3.5 text-indigo-400" />
                        {banner.sortOrder}
                      </span>
                    </div>

                    {/* Operational Controls & Info Canvas */}
                    <div className="flex-1 flex flex-col justify-between p-5">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1${banner.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-600 border border-rose-200"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${banner.isActive ? "bg-emerald-500" : "bg-rose-400"}`} />
                            {banner.isActive ? "Active" : "Hidden"}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-950 text-base tracking-tight line-clamp-1 mb-1">
                          {banner.title}
                        </h4>

                        {banner.discount && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-100/80 mb-2">
                            {formatDiscountBadge(banner.discount)}
                          </span>
                        )}

                        {banner.description && (
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
                            {banner.description}
                          </p>
                        )}
                      </div>

                      {/* Integrated Action Bar Baseline */}
                      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100/70">
                        <button
                          onClick={() => handleToggle(banner)}
                          className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                        {banner.isActive ? "Hide" : "Show"}
                        </button>

                        <button
                          onClick={() => openEdit(banner)}
                          className="flex-1 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(banner)}
                          disabled={deletingId === banner.id}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-40"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      {/* ── FEATURED TAB ────────────────────────────────────────────────────────────────────────── */}
    
    

    {activeTab === "FEATURED" && (
      <div className="space-y-6 w-full max-w-full overflow-hidden animate-fadeIn">
        {/* Layout */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Layout</h3>
          <SectionTemplatePicker
            labels={FEATURED_TEMPLATE_LABELS}
            activeTemplate={featuredTemplate}
            onSelect={handleFeaturedTemplateSelect}
            disabled={!canBannerEdit}
          />
        </div>

        {/* Section Header Card */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 w-full">
              {editingSection === "FEATURED" ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      Section Title
                    </label>
                    <input
                      className="mt-1 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      value={sectionForm.title}
                      onChange={(e) =>
                        setSectionForm((p) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g. Featured Collections"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      Subtitle
                    </label>
                    <input
                      className="mt-1 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      value={sectionForm.subtitle}
                      onChange={(e) =>
                        setSectionForm((p) => ({
                          ...p,
                          subtitle: e.target.value,
                        }))
                      }
                      placeholder="Optional subtitle for homepage"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveHeader()}
                      disabled={savingSection}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingSection ? "Saving..." : "Save Header"}
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="px-4 py-1.5 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                    Section Header
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 break-words">
                    {featuredSection.title || "Featured Collections"}
                  </p>
                  {featuredSection.subtitle && (
                    <p className="text-xs sm:text-sm text-gray-500 break-words">
                      {featuredSection.subtitle}
                    </p>
                  )}
                </>
              )}
            </div>
            {editingSection !== "FEATURED" && (
              <button
                onClick={() => openHeaderEdit("FEATURED")}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium pt-1 sm:pt-0"
              >
                <PencilSquareIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="whitespace-nowrap">Edit Header</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <form onSubmit={handleFeaturedSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={featuredSearch}
                  onChange={(e) => setFeaturedSearch(e.target.value)}
                  placeholder="Search products by title or code..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {featuredSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeaturedSearch("");
                      setFeaturedPage(1);
                      fetchFeaturedProducts("", 1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm whitespace-nowrap"
              >
                Search
              </button>
            </form>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setFeaturedFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  featuredFilter === "ALL"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Products ({featuredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setFeaturedFilter("FEATURED_ONLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  featuredFilter === "FEATURED_ONLY"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <StarSolidIcon className="w-3.5 h-3.5 text-amber-500" />
                Featured ({featuredProducts.filter((p) => p.isFeatured).length})
              </button>
              <button
                type="button"
                onClick={() => setFeaturedFilter("UNFEATURED_ONLY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  featuredFilter === "UNFEATURED_ONLY"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Disabled ({featuredProducts.filter((p) => !p.isFeatured).length})
              </button>
            </div>
          </div>
        </div>

        {/* Products Table Card */}
        {featuredLoading ? (
          <div className="bg-white border border-gray-200/80 rounded-2xl py-20 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3 animate-spin">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700">Loading catalog items...</p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200/80 rounded-2xl py-16 text-center shadow-sm">
            <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-base font-bold text-gray-800">No products found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or clear the filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Product Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Price</th>
                    <th className="py-3.5 px-6 text-center">Featured Status</th>
                    <th className="py-3.5 px-6 text-center">Display Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {(() => {
                    const activeFeaturedList = featuredProducts.filter((p) => p.isFeatured);

                    return featuredProducts
                      .filter((p) => {
                        if (featuredFilter === "FEATURED_ONLY") return p.isFeatured;
                        if (featuredFilter === "UNFEATURED_ONLY") return !p.isFeatured;
                        return true;
                      })
                      .map((product) => {
                        const isToggling = togglingId === product.id;
                        const isSavingOrder = orderSavingId === product.id;
                        const isEditingThisOrder = orderEditId === product.id;
                        const featuredRankIndex = product.isFeatured
                          ? activeFeaturedList.findIndex((p) => p.id === product.id)
                          : -1;
                        const displayRank = featuredRankIndex >= 0 ? featuredRankIndex + 1 : 0;

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              product.isFeatured ? "bg-amber-50/20" : ""
                            }`}
                          >
                            {/* Product details */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3.5">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-sm shrink-0"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <PhotoIcon className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 truncate max-w-[220px]" title={product.name}>
                                    {product.name}
                                  </p>
                                  {product.code && (
                                    <span className="inline-block text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                                      {product.code}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4">
                              {product.category?.name ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  {product.category.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Uncategorized</span>
                              )}
                            </td>

                            {/* Price */}
                            <td className="py-3.5 px-4 text-right font-black text-gray-900 whitespace-nowrap">
                              ₹{product.price.toLocaleString("en-IN")}
                            </td>

                            {/* Featured Status Toggle Switch */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center justify-center gap-2.5">
                                {/* Clean Toggle Switch */}
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleToggleFeatured(product)}
                                  title={product.isFeatured ? "Click to Disable" : "Click to Enable"}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 ${
                                    product.isFeatured
                                      ? "bg-emerald-500 hover:bg-emerald-600"
                                      : "bg-slate-300 hover:bg-slate-400"
                                  }`}
                                >
                                  <span className="sr-only">Toggle Featured</span>
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                      product.isFeatured ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  >
                                    {isToggling && (
                                      <svg className="w-3 h-3 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    )}
                                  </span>
                                </button>

                                {/* Status Badge Pill */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    product.isFeatured
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      product.isFeatured ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                    }`}
                                  />
                                  {product.isFeatured ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </td>

                            {/* Display Order Position */}
                            <td className="py-3.5 px-6 text-center">
                              {product.isFeatured ? (
                                <div className="inline-flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                                  {/* Sequence Badge */}
                                  <span className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black min-w-[28px] text-center shadow-xs">
                                    #{displayRank}
                                  </span>

                                  {/* Move Up (-) Button */}
                                  <button
                                    type="button"
                                    disabled={isSavingOrder || featuredRankIndex <= 0}
                                    onClick={() => handleSwapFeaturedOrder(product, "UP")}
                                    title="Move Up (Show Earlier)"
                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center text-gray-600 font-bold transition-all disabled:opacity-30 disabled:hover:bg-white"
                                  >
                                    -
                                  </button>

                                  {/* Move Down (+) Button */}
                                  <button
                                    type="button"
                                    disabled={isSavingOrder || featuredRankIndex >= activeFeaturedList.length - 1}
                                    onClick={() => handleSwapFeaturedOrder(product, "DOWN")}
                                    title="Move Down (Show Later)"
                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center text-gray-600 font-bold transition-all disabled:opacity-30 disabled:hover:bg-white"
                                  >
                                    +
                                  </button>

                                  {/* Direct Edit Button or Direct Input Form */}
                                  {isEditingThisOrder ? (
                                    <div className="flex items-center gap-1 pl-1">
                                      <input
                                        type="number"
                                        min="1"
                                        className="w-14 bg-white border border-indigo-400 rounded-lg px-1.5 py-1 text-xs text-center font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        value={orderInput}
                                        onChange={(e) => setOrderInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleSaveOrder(product);
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        disabled={isSavingOrder}
                                        onClick={() => handleSaveOrder(product)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                                      >
                                        {isSavingOrder ? "..." : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setOrderEditId(null)}
                                        className="px-1 text-gray-400 hover:text-gray-600 text-xs font-bold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOrderEditId(product.id);
                                        setOrderInput(String(displayRank));
                                      }}
                                      title="Set specific order position number"
                                      className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:bg-indigo-50 rounded-lg transition-all ml-0.5"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-xs text-slate-400 italic">Enable to order</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {featuredTotalPages > 1 && (
          <div className="flex justify-between items-center bg-white border border-gray-200/80 rounded-2xl px-5 py-3 shadow-sm">
            <span className="text-xs font-medium text-gray-500">
              Showing page <span className="font-bold text-gray-900">{featuredPage}</span> of{" "}
              <span className="font-bold text-gray-900">{featuredTotalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={featuredPage <= 1}
                onClick={() => {
                  const p = featuredPage - 1;
                  setFeaturedPage(p);
                  fetchFeaturedProducts(featuredSearch, p);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-slate-50 border border-gray-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                ← Previous
              </button>
              <button
                disabled={featuredPage >= featuredTotalPages}
                onClick={() => {
                  const p = featuredPage + 1;
                  setFeaturedPage(p);
                  fetchFeaturedProducts(featuredSearch, p);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-slate-50 border border-gray-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    )}

        </div>

        {/* Single persistent storefront preview — shared across every tab instead
            of each tab mounting its own iframe (see the comment above the grid). */}
        <div className="xl:sticky xl:top-6">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 border-b border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Live Preview
              </span>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white text-gray-900 shadow-sm">
                  <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                  Mobile
                </span>
                <button
                  type="button"
                  onClick={() => setDesktopPreviewOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ComputerDesktopIcon className="w-3.5 h-3.5" />
                  Desktop
                </button>
              </div>
            </div>
            {/* Capped to a real phone width rather than stretched to the sidebar's own
                width — this column is narrow enough that responsive breakpoints inside
                the iframe were already rendering mobile layouts, just without ever
                saying so; this makes that explicit and consistent regardless of how
                wide the sidebar itself happens to be. */}
            <div className="bg-gray-100 py-4 flex justify-center">
              <div className="w-[375px] max-w-full rounded-2xl border-4 border-gray-900 overflow-hidden shadow-md bg-white">
                <StorefrontPreviewFrame
                  anchor={previewAnchor}
                  previewThemeId={activeTab === "THEME" ? draftThemeId : undefined}
                  reloadToken={previewReloadToken}
                  className="w-full h-[640px] border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP PREVIEW MODAL ───────────────────────────────────────────────
          Own iframe instance, mounted only while open — the sidebar's persistent
          preview above is completely unaffected by opening/closing this. */}
      {desktopPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[1400px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0 bg-gray-50/70">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <ComputerDesktopIcon className="w-4 h-4" />
                Desktop Preview — {activeTab === "THEME" ? "Full Page" : "Full Storefront"}
              </span>
              <button
                type="button"
                onClick={() => setDesktopPreviewOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Close desktop preview"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-gray-100">
              <StorefrontPreviewFrame
                anchor={previewAnchor}
                previewThemeId={activeTab === "THEME" ? draftThemeId : undefined}
                reloadToken={previewReloadToken}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ BANNER MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editBanner ? "Edit" : "Add"}{" "}
                {form.type === "DISCOUNT_PANEL"
                  ? "Discount Panel"
                  : form.type === "CAROUSEL_ITEM"
                    ? "Carousel Item"
                    : "Promo Banner"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image{" "}
                  {editBanner && (
                    <span className="text-gray-400 font-normal">
                      (leave blank to keep current)
                    </span>
                  )}
                </label>
                <div
                  className="relative border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center h-48 cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden bg-slate-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-contain p-1.5 rounded-xl"
                    />
                  ) : (
                    <>
                      <PhotoIcon className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-400 mt-2">
                        Click to upload
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Panel title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              {/* Discount (DISCOUNT_PANEL only) */}
              {form.type === "DISCOUNT_PANEL" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Label
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="e.g. 20% OFF"
                    value={form.discount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, discount: e.target.value }))
                    }
                  />
                </div>
              )}

              {/* Description (DISCOUNT_PANEL + PROMO_BANNER) */}
              {(form.type === "DISCOUNT_PANEL" ||
                form.type === "PROMO_BANNER") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      placeholder="Short description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, description: e.target.value }))
                      }
                    />
                  </div>
                )}

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sortOrder: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Lower numbers appear first.
                </p>
              </div>

              {/* Active */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-indigo-600"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isActive: e.target.checked }))
                  }
                />
                <span className="text-sm text-gray-700">
                  Show on home page (active)
                </span>
              </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editBanner ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE BANNER CONFIRMATION MODAL ── */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4 shadow-xs">
                <TrashIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Are you sure?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Do you really want to delete this banner? This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50/70 border-t border-gray-100">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setBannerToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm shadow-rose-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingId === bannerToDelete.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
