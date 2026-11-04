import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import {
  Bars3Icon,
  UserIcon,
  XMarkIcon,
  HeartIcon as HeartOutline,
  BellIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  HomeIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolid,
  ShoppingBagIcon as ShoppingBagSolid,
  BellIcon as BellSolid,
} from "@heroicons/react/24/solid";
import logo123 from "../assets/logo.png";
import profileLightningDark from "../assets/profile-lightning.png";
import profileLightningWhite from "../assets/profile-lightning-white.png";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useUserNotifications } from "../context/UserNotificationContext";
import { useNotifications } from "../context/NotificationContext";
import CustomerAuthModal from "./CustomerAuthModal";
import TrackShippingModal from "./TrackShippingModal";
import AnnouncementBar from "./AnnouncementBar";
import toast from "react-hot-toast";
import api from "../utils/api";
import { domainUrl } from "../utils/constant";
import { getCustomerNotificationTarget } from "../utils/notificationRoute";
import FestiveNavbarHangingMotif from "./festive/FestiveNavbarHangingMotif";
import { useTheme } from "../context/ThemeContext";

interface NavbarTemplateData {
  bgColor?: string;
  textColor?: string;
}

interface NavbarConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6;
  templates?: Record<string, NavbarTemplateData>;
}

const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  activeTemplate: 1,
  templates: {
    "1": {},
    "2": {},
    "3": {},
    "4": {},
    "5": {},
    "6": {},
  },
};

const NAVBAR_CACHE_KEY = "crm_navbar_cache";

const Navbar = ({
  user,
  role,
  cartItemCount = 0,
  handleLogout,
}: {
  user?: { isAuthenticated?: boolean; role?: string | null };
  role?: string | null;
  cartItemCount?: number;
  handleLogout?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user: authUser } = useAuth();
  const { branding } = useBranding();
  const logoSrc = branding.companyLogo
    ? branding.companyLogo.startsWith("http")
      ? branding.companyLogo
      : `${domainUrl}/${branding.companyLogo}`
    : logo123;
  const { wishlistCount } = useWishlist();
  const {
    notifications: userNotifications,
    unreadCount: userUnreadCount,
    markAsRead,
    markAllRead: markAllUserRead,
    deleteNotification: deleteUserNotification,
    clearAllNotifications: clearAllUserNotifications,
  } = useUserNotifications();
  const { unreadCount: adminUnreadCount } = useNotifications();
  const { activeOccasion } = useTheme();
  const isDiwali = activeOccasion?.id === "diwali";

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const adminDashboardPath =
    role === "SUPER_ADMIN" ? "/super-admin-dashboard" : "/admin-dashboard";
  const unreadCount = isAdmin ? adminUnreadCount : userUnreadCount;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [trackShippingOpen, setTrackShippingOpen] = useState(false);
  const [trackingNavConfig, setTrackingNavConfig] = useState<{
    enabled: boolean;
    enabledPartners: string[];
  }>(() => {
    try {
      const cached = localStorage.getItem("CACHED_TRACKING_CONFIG");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          enabled: parsed?.enabled !== false,
          enabledPartners: Array.isArray(parsed?.enabledPartners) ? parsed.enabledPartners : [],
        };
      }
    } catch {}
    return {
      enabled: true,
      enabledPartners: [],
    };
  });
  const headerRef = useRef<HTMLElement>(null);

  // --- NAVBAR TEMPLATE CONFIG ---
  const [navbarConfig, setNavbarConfig] = useState<NavbarConfig>(() => {
    try {
      const cached = localStorage.getItem(NAVBAR_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          typeof parsed?.activeTemplate === "number" &&
          parsed.activeTemplate >= 1 &&
          parsed.activeTemplate <= 6
        ) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_NAVBAR_CONFIG;
  });

  const activeTemplate = (navbarConfig?.activeTemplate || 1) as 1 | 2 | 3 | 4 | 5 | 6;

  // Fetch active tracking partners configuration
  useEffect(() => {
    api
      .get("/settings/tracking-partners")
      .then(({ data }) => {
        if (data) {
          const config = {
            enabled: data.enabled !== false,
            enabledPartners: Array.isArray(data.enabledPartners) ? data.enabledPartners : [],
          };
          setTrackingNavConfig(config);
          try {
            localStorage.setItem("CACHED_TRACKING_CONFIG", JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Fetch active navbar template from backend
  useEffect(() => {
    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (
          data?.navbarConfig &&
          typeof data.navbarConfig.activeTemplate === "number"
        ) {
          setNavbarConfig(data.navbarConfig);
          try {
            localStorage.setItem(
              NAVBAR_CACHE_KEY,
              JSON.stringify(data.navbarConfig)
            );
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Listen for real-time preview template updates from Homepage Manager
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "STORRA_PREVIEW_NAVBAR") {
        if (event.data.config) {
          setNavbarConfig(event.data.config);
        } else if (event.data.template) {
          const tmpl = (Number(event.data.template) || 1) as 1 | 2 | 3 | 4 | 5 | 6;
          setNavbarConfig((prev) => ({ ...prev, activeTemplate: tmpl }));
        }
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === NAVBAR_CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (
            typeof parsed?.activeTemplate === "number" &&
            parsed.activeTemplate >= 1 &&
            parsed.activeTemplate <= 6
          ) {
            setNavbarConfig(parsed);
          }
        } catch {}
      }
    };
    const handleCustomUpdate = () => {
      try {
        const cached = localStorage.getItem(NAVBAR_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (typeof parsed?.activeTemplate === "number") {
            setNavbarConfig(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("crm_navbar_cache_updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("crm_navbar_cache_updated", handleCustomUpdate);
    };
  }, []);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    categories: Array<{ id: string; name: string; image?: string }>;
    products: Array<{
      id: string;
      name: string;
      price: number;
      image?: string;
      category?: { id: string; name: string };
    }>;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<"products" | "collections">("products");
  const [initialProducts, setInitialProducts] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // --- ACKNOWLEDGED COUNT STATE (Persisted) ---
  const [ackCartCount, setAckCartCount] = useState(() => {
    return parseInt(localStorage.getItem("ack_cart_count") || "0", 10);
  });

  const [ackWishlistCount, setAckWishlistCount] = useState(() => {
    return parseInt(localStorage.getItem("ack_wishlist_count") || "0", 10);
  });

  // --- MATCHING LOGIC ---
  const currentPath = location.pathname.toLowerCase();
  const isCartPage = currentPath.includes("cart");
  const isWishlistPage = currentPath.includes("wishlist");

  // --- SYNC LOGIC ---
  useEffect(() => {
    if (isCartPage) {
      setAckCartCount(cartItemCount);
      localStorage.setItem("ack_cart_count", String(cartItemCount));
    }
  }, [isCartPage, cartItemCount]);

  useEffect(() => {
    if (!isWishlistPage) return;
    setAckWishlistCount((prev) => {
      const next = Math.max(prev, wishlistCount);
      localStorage.setItem("ack_wishlist_count", String(next));
      return next;
    });
  }, [isWishlistPage, wishlistCount]);

  // Scroll effect (captures window and nested scroll containers like CustomerLayout)
  useEffect(() => {
    const handleScroll = (e?: Event) => {
      const target = e?.target as HTMLElement | Document | null;
      const scrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        (target && "scrollTop" in target ? (target as HTMLElement).scrollTop : 0) ||
        0;
      setScrolled(scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Header dynamic height publication
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const applyHeight = () => {
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${el.offsetHeight}px`
      );
    };
    applyHeight();
    const observer = new ResizeObserver(applyHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Open auth modal from anywhere via window event
  useEffect(() => {
    const handler = () => setCustomerAuthOpen(true);
    window.addEventListener("openCustomerAuth", handler);
    return () => window.removeEventListener("openCustomerAuth", handler);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
        setIsSearchOpen(false);
      }
    };
    if (searchFocused || isSearchOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchFocused, isSearchOpen]);

  // Close search & dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsCategoriesDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search API call
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(
          `/user/shop/global-search?q=${encodeURIComponent(
            searchQuery.trim()
          )}`
        );
        setSearchResults(res.data);
      } catch {
        setSearchResults({ categories: [], products: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load initial products when search overlay is opened (100% dynamic from database)
  useEffect(() => {
    if (isSearchOpen && initialProducts.length === 0) {
      api
        .get("/user/shop/products?limit=8")
        .then(({ data }) => {
          if (Array.isArray(data?.products)) {
            setInitialProducts(data.products);
          }
        })
        .catch(() => {});
    }
  }, [isSearchOpen, initialProducts.length]);

  const handleCategoryClick = (categoryId: string) => {
    setSearchFocused(false);
    setSearchQuery("");
    setSearchResults(null);
    navigate(`/categories/${categoryId}`);
  };

  const handleProductClick = (productId: string) => {
    setSearchFocused(false);
    setSearchQuery("");
    setSearchResults(null);
    navigate(`/products/${productId}`);
  };

  const isAuthenticated = Boolean(user?.isAuthenticated ?? authUser?.isAuthenticated);

  // --- BADGE VISIBILITY LOGIC ---
  const showCartBadge = cartItemCount > ackCartCount;
  const showWishlistBadge = wishlistCount > 0;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    if (isAuthenticated) {
      setAckCartCount(cartItemCount);
      localStorage.setItem("ack_cart_count", String(cartItemCount));
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    handleGatedNavigation(e, "/WishlistPage", true);
    if (isAuthenticated) {
      setAckWishlistCount((prev) => {
        const next = Math.max(prev, wishlistCount);
        localStorage.setItem("ack_wishlist_count", String(next));
        return next;
      });
    }
  };

  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      setCustomerAuthOpen(true);
    } else if (!isAdmin) {
      window.dispatchEvent(new CustomEvent("open-profile-drawer"));
    } else {
      setIsUserDropdownOpen(!isUserDropdownOpen);
    }
  };

  // --- CATEGORIES DROPDOWN STATE & FULL-WIDTH LUXURY MEGA MENU ---
  interface FlatCategory {
    id: string;
    name: string;
    parentId: string | null;
    showInNav?: boolean;
    image?: string;
    code?: string;
  }

  const DEFAULT_NAV_CATEGORIES: FlatCategory[] = [
    { id: "sarees", name: "Sarees", parentId: null, showInNav: true },
    { id: "drapes", name: "Drapes", parentId: null, showInNav: true },
    { id: "churidar", name: "Churidar", parentId: null, showInNav: true },
    { id: "necklaces", name: "Necklaces", parentId: null, showInNav: true },
    { id: "earrings", name: "Earrings", parentId: null, showInNav: true },
    { id: "new-arrivals", name: "New Arrivals", parentId: null, showInNav: true },
  ];

  const [categories, setCategories] = useState<FlatCategory[]>(DEFAULT_NAV_CATEGORIES);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);
  const [activeMegaCatId, setActiveMegaCatId] = useState<string | null>(null);
  const [megaCategorySearch, setMegaCategorySearch] = useState("");
  const categoriesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);
  const categoriesButtonRef = useRef<HTMLButtonElement>(null);

  const cancelCategoriesClose = () => {
    if (categoriesCloseTimer.current) {
      clearTimeout(categoriesCloseTimer.current);
      categoriesCloseTimer.current = null;
    }
  };

  const scheduleCategoriesClose = () => {
    cancelCategoriesClose();
    categoriesCloseTimer.current = setTimeout(() => {
      setIsCategoriesDropdownOpen(false);
    }, 200);
  };

  // Close categories dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isCategoriesDropdownOpen &&
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(e.target as Node)
      ) {
        if (categoriesButtonRef.current?.contains(e.target as Node)) {
          return;
        }
        setIsCategoriesDropdownOpen(false);
      }
    };
    if (isCategoriesDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isCategoriesDropdownOpen]);

  // Fetch shop categories for navbar dropdown integration
  useEffect(() => {
    const normalizeCats = (raw: any[]) =>
      raw.map((c: any) => {
        let parentIdVal: string | null = null;
        if (c.parentId) {
          if (typeof c.parentId === "object") {
            parentIdVal = String(c.parentId._id ?? c.parentId.id ?? "");
          } else {
            parentIdVal = String(c.parentId);
          }
          if (parentIdVal === "null" || parentIdVal === "undefined" || parentIdVal === "") {
            parentIdVal = null;
          }
        }
        return {
          id: String(c.id ?? c._id),
          name: c.name,
          parentId: parentIdVal,
          showInNav: c.showInNav !== false,
          image: c.image || "",
          code: c.code || "",
        };
      });

    api
      .get("/user/shop/categories")
      .then((res) => {
        const raw = res.data?.categories || [];
        if (raw.length > 0) {
          setCategories(normalizeCats(raw));
        } else {
          // Fallback to /category/list if public route is empty
          api
            .get("/category/list")
            .then((listRes) => {
              const listRaw = listRes.data?.list || [];
              if (listRaw.length > 0) setCategories(normalizeCats(listRaw));
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        // Fallback to /category/list on error
        api
          .get("/category/list")
          .then((listRes) => {
            const listRaw = listRes.data?.list || [];
            if (listRaw.length > 0) setCategories(normalizeCats(listRaw));
          })
          .catch(() => {});
      });
  }, []);

  const topLevelCategories = React.useMemo(() => {
    // 1. Root categories that are not explicitly hidden (showInNav defaults to true)
    const activeNavCats = categories.filter((c) => !c.parentId && c.showInNav !== false);
    if (activeNavCats.length > 0) return activeNavCats;

    // 2. Fallback: all root categories
    const rootCats = categories.filter((c) => !c.parentId);
    if (rootCats.length > 0) return rootCats;

    // 3. Ultimate fallback: all categories
    return categories;
  }, [categories]);

  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  // Auto-select "ALL" when mega menu opens
  useEffect(() => {
    if (isCategoriesDropdownOpen && !activeMegaCatId) {
      setActiveMegaCatId("ALL");
    }
  }, [isCategoriesDropdownOpen, activeMegaCatId]);

  // Scalable category search filter: instantly handles 1,000+ categories
  const filteredMegaCategories = React.useMemo(() => {
    const q = megaCategorySearch.trim().toLowerCase();
    if (!q) return topLevelCategories;
    return topLevelCategories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [megaCategorySearch, topLevelCategories]);

  // Currently active parent category (null when "ALL" is selected)
  const currentActiveCat = React.useMemo(() => {
    if (!activeMegaCatId || activeMegaCatId === "ALL") return null;
    const found = topLevelCategories.find((c) => c.id === activeMegaCatId);
    if (found) return found;
    return categories.find((c) => c.id === activeMegaCatId) || null;
  }, [activeMegaCatId, topLevelCategories, categories]);

  // Subcategories of active category
  const activeSubcategories = React.useMemo(() => {
    if (!currentActiveCat) return [];
    return categories.filter((c) => c.parentId === currentActiveCat.id);
  }, [currentActiveCat, categories]);

  // Dynamic suggestions list: 100% data-driven from store database
  const suggestionsList = React.useMemo(() => {
    // When typing: suggest matching categories and products from the search API
    if (searchQuery.trim().length >= 1 && searchResults) {
      const items: string[] = [];
      searchResults.categories?.forEach((c) => {
        if (!items.includes(c.name)) items.push(c.name);
      });
      searchResults.products?.forEach((p) => {
        if (!items.includes(p.name)) items.push(p.name);
      });
      return items.slice(0, 10);
    }

    // Default when input is empty: show the store's real categories and products from the database
    const items: string[] = [];
    topLevelCategories.forEach((c) => {
      if (!items.includes(c.name)) items.push(c.name);
    });
    initialProducts.forEach((p) => {
      if (!items.includes(p.name)) items.push(p.name);
    });
    return items.slice(0, 10);
  }, [searchQuery, searchResults, topLevelCategories, initialProducts]);

  const hasSearched = searchQuery.trim().length > 0;

  const displayProducts =
    hasSearched
      ? searchResults?.products || []
      : [];

  const displayCategories =
    hasSearched
      ? searchResults?.categories || []
      : [];

  const handleGatedNavigation = (
    e: React.MouseEvent,
    path: string,
    isProtected: boolean
  ) => {
    e.preventDefault();

    if (isProtected && !isAuthenticated) {
      setCustomerAuthOpen(true);
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    navigate(path);
  };

  interface NavItem {
    name: string;
    href: string;
    protected: boolean;
    icon: any;
    isAction?: boolean;
    isDropdown?: boolean;
    onClick?: (e: React.MouseEvent) => void;
  }

  const navigation: NavItem[] = [
    { name: "Home", href: "/", protected: false, icon: HomeIcon },
    {
      name: "Categories",
      href: "/products",
      protected: false,
      icon: Squares2X2Icon,
      isDropdown: true,
    },
    { name: "Products", href: "/products", protected: false, icon: CubeIcon },
    ...(trackingNavConfig.enabled !== false
      ? [
          {
            name: "Shipment Tracking",
            href: "#track-shipping",
            protected: false,
            icon: TruckIcon,
            isAction: true,
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              setTrackShippingOpen(true);
            },
          },
        ]
      : []),
    ...(isAuthenticated
      ? [
          {
            name: "My Orders",
            href: "/myorders",
            protected: true,
            icon: ClipboardDocumentListIcon,
          },
          {
            name: "Transactions",
            href: "/transactions",
            protected: true,
            icon: CreditCardIcon,
          },
        ]
      : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };
  const isCategoriesActive = location.pathname.startsWith("/categories");

  // --- TEMPLATE-SPECIFIC STYLING (Templates 1 to 6) ---
  const sanitizeSolidHex = (val?: string): string | undefined => {
    if (!val) return undefined;
    let s = val.trim();
    if (s.toLowerCase() === "white") return "#ffffff";
    if (s.toLowerCase() === "black") return "#000000";
    if (!s.startsWith("#") && /^[0-9A-Fa-f]{3,6}$/.test(s)) s = "#" + s;
    // Strictly accept 3 or 6 hex digits only (reject #0000 or other 4/8-digit transparent alpha hex)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s)) return s;
    return undefined;
  };

  const currentNavbarTemplateData = navbarConfig?.templates?.[String(activeTemplate)];
  const customBg = sanitizeSolidHex(currentNavbarTemplateData?.bgColor);
  const customText = sanitizeSolidHex(currentNavbarTemplateData?.textColor);

  // Resolve solid default background colors if no custom background is chosen
  const templateDefaultBg =
    activeTemplate === 1
      ? "#0a0a0a"
      : activeTemplate === 2
        ? "#fcfbf9"
        : activeTemplate === 3
          ? undefined // Template 3 uses the Aurora CSS gradient
          : "#ffffff"; // Templates 4, 5, 6 are pure solid white

  const effectiveBg = customBg || templateDefaultBg;

  const isHexDark = (hex?: string) => {
    if (!hex || !hex.startsWith("#")) return false;
    const c = hex.substring(1);
    const rgb = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
    if (isNaN(rgb)) return false;
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  };

  const isDark = customText
    ? isHexDark(effectiveBg)
    : customBg
      ? isHexDark(customBg)
      : (activeTemplate === 1 || activeTemplate === 3);
  const isCenteredLogo = activeTemplate === 4 || activeTemplate === 5;
  const isThemeBand = false;

  const getNavContainerClass = () => {
    const isElevated = scrolled || isCategoriesDropdownOpen;

    if (customBg) {
      const borderClass = isElevated
        ? "border-b-0 border-transparent"
        : (customText ? "" : "border-b border-gray-200/80");
      return `py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${borderClass} ${
        isElevated ? "shadow-sm" : ""
      }`;
    }

    switch (activeTemplate) {
      case 1: // Dark Professional: Obsidian noir background
        return `bg-[#0a0a0a] py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-lg shadow-black/40"
            : "border-b border-white/10"
        } text-white`;
      case 2: // Light Editorial: Refined off-white magazine canvas
        return `bg-[#fcfbf9] py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-xs"
            : "border-b border-stone-200"
        } text-stone-900`;
      case 3: // Gradient with Aurora: Deep indigo & slate glowing backdrop
        return `bg-gradient-to-r from-indigo-950 via-slate-900 to-gray-950 py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-[0_4px_25px_rgba(79,70,229,0.25)]"
            : "border-b border-indigo-500/25 shadow-[0_4px_20px_rgba(79,70,229,0.15)]"
        } text-white`;
      case 4: // Minimal Centered: Pure white balanced layout with centered brand mark
        return `bg-white py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-xs"
            : "border-b border-gray-100"
        } text-gray-900`;
      case 5: // Sleek Boutique Slim: Ultra-slim luxury boutique single-row header (Referral style)
        return `bg-white py-2 sm:py-2.5 min-h-[56px] sm:min-h-[60px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-xs"
            : "border-b border-gray-100"
        } text-gray-900`;
      case 6: // Split Statement: Bold modern asymmetric high-fashion design with sculpted tabs
        return `bg-white py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-sm"
            : "border-b border-gray-100"
        } text-gray-900`;
      default:
        return `bg-white py-2.5 sm:py-3 min-h-[58px] sm:min-h-[62px] ${
          isElevated
            ? "border-b-0 border-transparent shadow-xs"
            : "border-b border-gray-100"
        } text-gray-900`;
    }
  };

  const getHamburgerClass = () => {
    if (customText) {
      return "hover:opacity-80 transition-opacity";
    }
    if (isDark) {
      return "text-white/80 hover:text-white hover:bg-white/10";
    }
    return "text-gray-800 hover:text-black hover:bg-black/5";
  };

  const getActionButtonClass = (active: boolean = false) => {
    if (customText || customBg) {
      return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full transition-all duration-200 group cursor-pointer shrink-0 border border-current/20 ${
        active ? "bg-current/15" : "hover:bg-current/10"
      }`;
    }
    switch (activeTemplate) {
      case 1: // Dark Professional
        return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full ${
          active ? "bg-white/20 text-white" : "bg-white/5 hover:bg-white/15 text-white"
        } border border-white/10 transition-all duration-200 group cursor-pointer shrink-0`;
      case 2: // Light Editorial
        return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full ${
          active ? "bg-stone-200 text-black" : "hover:bg-stone-200/60 text-stone-800 hover:text-black"
        } transition-all duration-200 group cursor-pointer shrink-0`;
      case 3: // Gradient with Aurora
        return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full ${
          active ? "bg-indigo-600/50 text-white" : "bg-white/10 hover:bg-indigo-600/40 text-indigo-100 hover:text-white"
        } border border-white/15 backdrop-blur-md shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all duration-200 group cursor-pointer shrink-0`;
      case 6: // Split Statement
        return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl ${
          active
            ? "bg-gray-200 text-gray-950 shadow-xs"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800 hover:text-black"
        } transition-all duration-200 shadow-xs group cursor-pointer shrink-0`;
      case 4: // Minimal Centered
      case 5: // Sleek Boutique Slim
      default:
        return `relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full ${
          active ? "bg-gray-200 text-black" : "hover:bg-gray-100 text-gray-700 hover:text-black"
        } transition-all duration-200 group cursor-pointer shrink-0`;
    }
  };

  const renderDesktopNavLink = (item: (typeof navigation)[number]) => {
    const isDropdown = item.isDropdown;
    const active = isDropdown
      ? isCategoriesActive || isCategoriesDropdownOpen
      : !item.isAction && isActive(item.href);

    const handleClick = (e: React.MouseEvent) => {
      if (item.isAction && item.onClick) {
        item.onClick(e);
        return;
      }
      if (item.protected && !isAuthenticated) {
        handleGatedNavigation(e, item.href, true);
      }
    };

    // Styling variants for each of the 6 templates
    let linkClasses = "";
    let indicator: React.ReactNode = null;

    switch (activeTemplate) {
      case 1: // Dark Professional: Micro-lift pill with gold accent for active
        linkClasses = `relative flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? "bg-[var(--theme-primary,#C9A227)] text-[var(--theme-primary-ink,#0B0B0C)] shadow-sm"
            : customText
              ? "hover:bg-black/10"
              : "text-zinc-300 hover:text-white hover:bg-white/10"
        }`;
        break;

      case 2: // Light Editorial: Serif uppercase with baseline indicator
        linkClasses = `relative flex flex-col items-center justify-center text-[11px] lg:text-[12px] font-serif uppercase tracking-widest px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? customText
              ? "font-bold"
              : "text-stone-950 font-bold"
            : customText
              ? "hover:opacity-100 font-medium opacity-80"
              : "text-stone-500 hover:text-stone-950 font-medium"
        }`;
        indicator = active ? (
          <span
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-[2px] bg-[var(--theme-primary,#C9A227)] rounded-full"
            style={customText ? { backgroundColor: customText } : undefined}
          />
        ) : null;
        break;

      case 3: // Gradient with Aurora: Luminous tech pills
        linkClasses = `relative flex items-center justify-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)] border-indigo-400/40"
            : customText
              ? "border-transparent hover:bg-black/10"
              : "text-indigo-200 border-transparent hover:text-white hover:bg-white/10"
        }`;
        break;

      case 4: // Minimal Centered: Airy spacing with subtle micro-dot indicator
        linkClasses = `relative flex flex-col items-center justify-center text-xs uppercase tracking-[0.18em] px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? customText
              ? "font-semibold"
              : "text-black font-semibold"
            : customText
              ? "hover:opacity-100 font-medium opacity-70"
              : "text-gray-400 hover:text-black font-medium"
        }`;
        indicator = active ? (
          <span
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full"
            style={customText ? { backgroundColor: customText } : undefined}
          />
        ) : null;
        break;

      case 6: // Split Statement: Sculpted squircle tabs
        linkClasses = `relative flex items-center justify-center gap-1 text-xs font-bold tracking-wider rounded-xl px-3.5 py-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? "bg-[var(--theme-primary,#111)] text-[var(--theme-primary-ink,#fff)] shadow-xs"
            : customText
              ? "hover:bg-black/10 font-semibold"
              : "bg-gray-100 text-gray-700 hover:text-black hover:bg-gray-200 font-semibold"
        }`;
        break;

      case 5: // Sleek Boutique Slim (Referral style): Centered line indicator
      default:
        linkClasses = `relative flex flex-col items-center justify-center text-xs lg:text-[13px] xl:text-[13.5px] font-normal tracking-wide px-2.5 lg:px-3 py-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          active
            ? customText
              ? "font-semibold"
              : "text-black font-semibold"
            : customText
              ? "hover:opacity-100 font-normal opacity-80"
              : "text-gray-700 hover:text-black font-normal"
        }`;
        indicator = active ? (
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 sm:w-6 h-[2px] bg-black rounded-full"
            style={customText ? { backgroundColor: customText } : undefined}
          />
        ) : null;
        break;
    }

    if (isDropdown) {
      return (
        <div
          key={item.name}
          className="relative group shrink-0"
          onMouseEnter={() => {
            cancelCategoriesClose();
            setIsCategoriesDropdownOpen(true);
          }}
          onMouseLeave={scheduleCategoriesClose}
        >
          <button
            ref={categoriesButtonRef}
            type="button"
            onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
            className={linkClasses}
            style={customText && !active ? { color: customText } : undefined}
          >
            <span className="flex items-center gap-1">
              <span>{item.name}</span>
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isCategoriesDropdownOpen ? "rotate-180" : ""
                } ${isDark ? "text-white/60" : "text-gray-500"}`}
                style={customText ? { color: customText } : undefined}
              />
            </span>
            {indicator}
          </button>
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={handleClick}
        className={linkClasses}
        style={customText && !active ? { color: customText } : undefined}
      >
        <span>{item.name}</span>
        {indicator}
      </Link>
    );
  };

  const renderBrandLogo = (isCentered: boolean = false) => {
    return (
      <Link
        to="/"
        className={`flex-shrink-0 flex items-center group cursor-pointer transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99] self-center ${
          isCentered ? "justify-center" : ""
        }`}
      >
        <div className={`inline-flex items-center justify-center transition-all duration-300 ${
          activeTemplate === 6
            ? "p-1 rounded-xl bg-gray-100"
            : activeTemplate === 3
            ? "p-1 rounded-xl bg-white/10 ring-1 ring-white/20"
            : ""
        }`}>
          <img
            src={logoSrc}
            alt={branding.companyName || "Logo"}
            className="h-7.5 sm:h-8.5 lg:h-9.5 w-auto max-w-[135px] sm:max-w-[165px] object-contain transition-all duration-300"
          />
        </div>
        {(branding.showCompanyName || branding.showCompanyTagline) && (
          <div className="hidden sm:flex items-center pl-1.5 self-center">
            <div
              className={`h-4 sm:h-4.5 mx-2 w-[1px] transition-colors duration-300 shrink-0 ${
                customText ? "" : isDark ? "bg-white/20" : "bg-slate-200"
              }`}
              style={customText ? { backgroundColor: `${customText}33` } : undefined}
            />
            <div className="flex flex-col justify-center text-left min-w-0">
              {branding.showCompanyName && branding.companyName && (
                <span
                  className={`text-xs sm:text-sm font-semibold tracking-wide uppercase leading-none transition-colors duration-300 truncate font-sans ${
                    customText
                      ? ""
                      : isDark
                        ? activeTemplate === 3
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 font-bold"
                          : "text-white"
                        : activeTemplate === 2
                        ? "text-stone-950 font-serif font-bold"
                        : "text-gray-950 font-bold"
                  }`}
                  style={customText ? { color: customText } : undefined}
                >
                  {branding.companyName}
                </span>
              )}
              {branding.showCompanyTagline && branding.companyTagline && (
                <span
                  className={`text-[8px] sm:text-[9px] tracking-widest uppercase font-normal leading-tight mt-0.5 transition-colors duration-300 truncate font-sans ${
                    customText
                      ? ""
                      : isDark
                        ? activeTemplate === 3
                          ? "text-indigo-300/80"
                          : "text-zinc-400"
                        : activeTemplate === 2
                        ? "text-stone-500 font-serif italic"
                        : "text-gray-400"
                  }`}
                  style={customText ? { color: customText, opacity: 0.7 } : undefined}
                >
                  {branding.companyTagline}
                </span>
              )}
            </div>
          </div>
        )}
      </Link>
    );
  };

  const getBadgeStyle = () => {
    // When custom navbar colors are configured (or admin edited navbar background/text)
    if (customText || customBg) {
      const badgeBg = customText || (isDark ? "#ffffff" : "#000000");
      const badgeText = isHexDark(badgeBg)
        ? "#ffffff"
        : effectiveBg && isHexDark(effectiveBg)
          ? effectiveBg
          : "#000000";
      const ringColor = effectiveBg || (isDark ? "#0a0a0a" : "#ffffff");
      return {
        backgroundColor: badgeBg,
        color: badgeText,
        boxShadow: `0 0 0 2px ${ringColor}`,
      };
    }

    // Default template handling
    switch (activeTemplate) {
      case 1: // Dark Professional
        return {
          backgroundColor: "var(--theme-primary, #C9A227)",
          color: "var(--theme-primary-ink, #0B0B0C)",
          boxShadow: "0 0 0 2px #0a0a0a",
        };
      case 2: // Light Editorial
        return {
          backgroundColor: "#1c1917",
          color: "#ffffff",
          boxShadow: "0 0 0 2px #fcfbf9",
        };
      case 3: // Aurora Gradient
        return {
          backgroundColor: "#6366f1",
          color: "#ffffff",
          boxShadow: "0 0 0 2px #0f172a, 0 0 8px rgba(99,102,241,0.8)",
        };
      default: // Templates 4, 5, 6
        return {
          backgroundColor: "#000000",
          color: "#ffffff",
          boxShadow: "0 0 0 2px #ffffff",
        };
    }
  };

  const renderActionIcons = () => {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 z-10">
        {/* Editorial "SIGN IN" pill for Template 2 when unauthenticated */}
        {activeTemplate === 2 && !isAuthenticated && (
          <button
            type="button"
            onClick={() => setCustomerAuthOpen(true)}
            className="hidden sm:inline-flex items-center justify-center px-3 py-1 bg-[var(--theme-primary,#C9A227)] text-[var(--theme-primary-ink,#0B0B0C)] hover:opacity-90 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs transition-opacity cursor-pointer shrink-0 mr-1"
          >
            Sign In
          </button>
        )}

        {/* 1. USER WITH LIGHTNING BOLT (Account / Sign In) */}
        <div className="relative">
          <button
            type="button"
            onClick={handleUserIconClick}
            className={getActionButtonClass(isUserDropdownOpen)}
            aria-label={isAuthenticated ? (isAdmin ? "Admin Account" : "My Account") : "Sign In"}
          >
            <img
              src={isDark ? profileLightningWhite : profileLightningDark}
              alt={isAuthenticated ? (isAdmin ? "Admin Account" : "My Account") : "Sign In"}
              className="h-5.5 w-5.5 object-contain transition-transform duration-200 group-hover:scale-110 pointer-events-none"
            />
          </button>

          {/* Authenticated User Dropdown */}
          {isAuthenticated && isUserDropdownOpen && (
            <div
              className={`absolute top-full right-0 mt-2.5 w-56 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 ${
                isDark
                  ? "bg-[#141414] border border-white/15 text-white shadow-black/50"
                  : "bg-white border border-gray-200/90 text-gray-900 shadow-black/15"
              }`}
            >
              <div
                className={`px-3 py-2 mb-1 rounded-xl border ${
                  isDark
                    ? "bg-white/5 border-white/10 text-zinc-300"
                    : "bg-slate-50 border-slate-100 text-slate-700"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Signed in as
                </p>
                <p className="text-xs font-bold truncate">
                  {isAdmin ? "Administrator" : "Customer Account"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  window.dispatchEvent(new CustomEvent("open-profile-drawer"));
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 text-left cursor-pointer ${
                  isDark
                    ? "text-zinc-200 hover:text-white hover:bg-white/10"
                    : "text-gray-700 hover:text-black hover:bg-slate-100"
                }`}
              >
                <UserIcon className="h-4 w-4 opacity-70" />
                My Profile
              </button>
              <Link
                to="/myorders"
                onClick={() => setIsUserDropdownOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                  isDark
                    ? "text-zinc-200 hover:text-white hover:bg-white/10"
                    : "text-gray-700 hover:text-black hover:bg-slate-100"
                }`}
              >
                <ClipboardDocumentListIcon className="h-4 w-4 opacity-70" />
                My Orders
              </Link>
              {isAdmin && (
                <Link
                  to={adminDashboardPath}
                  onClick={() => setIsUserDropdownOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                    isDark
                      ? "text-zinc-200 hover:text-white hover:bg-white/10"
                      : "text-gray-700 hover:text-black hover:bg-slate-100"
                  }`}
                >
                  <Squares2X2Icon className="h-4 w-4 opacity-70" />
                  Admin Dashboard
                </Link>
              )}
              <div className={`border-t my-1 ${isDark ? "border-white/10" : "border-slate-100"}`} />
              <button
                onClick={() => {
                  if (handleLogout) handleLogout();
                  else logout();
                  setIsUserDropdownOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>

        {/* 2. SEARCH ICON BUTTON */}
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen((prev) => {
              const next = !prev;
              if (next) setTimeout(() => searchInputRef.current?.focus(), 80);
              return next;
            });
          }}
          className={getActionButtonClass(isSearchOpen)}
          aria-label="Search"
        >
          <MagnifyingGlassIcon
            className={`h-5 w-5 transition-colors ${isDark ? "text-white" : "text-gray-800 group-hover:text-black"}`}
            style={customText ? { color: customText } : undefined}
            strokeWidth={1.5}
          />
        </button>

        {/* 3. CART ICON (Shopping Bag with badge) - Only shown when logged in */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleCartClick}
            className={getActionButtonClass(false)}
            aria-label="Cart"
          >
            <ShoppingBagIcon
              className={`h-5 w-5 transition-colors ${isDark ? "text-white" : "text-gray-800 group-hover:text-black"}`}
              style={customText ? { color: customText } : undefined}
              strokeWidth={1.5}
            />
            {cartItemCount > 0 ? (
              <span
                className="absolute -top-1 -right-1 z-10 min-w-[17px] h-[17px] px-1 text-[9.5px] font-bold rounded-full flex items-center justify-center shadow-xs transition-colors"
                style={getBadgeStyle()}
              >
                {cartItemCount}
              </span>
            ) : (
              showCartBadge && (
                <span
                  className="absolute top-0.5 right-0.5 z-10 w-2.5 h-2.5 rounded-full shadow-xs transition-colors"
                  style={getBadgeStyle()}
                />
              )
            )}
          </button>
        )}

        {/* 4. WISHLIST ICON (Heart with red badge) - Only shown when logged in */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleWishlistClick}
            className={getActionButtonClass(isActive("/WishlistPage") || isActive("/wishlist"))}
            aria-label="Wishlist"
          >
            {isActive("/WishlistPage") || isActive("/wishlist") ? (
              <HeartSolid className="h-5 w-5 text-rose-500" />
            ) : (
              <HeartOutline
                className={`h-5 w-5 transition-colors ${isDark ? "text-white" : "text-gray-800 group-hover:text-black"}`}
                style={customText ? { color: customText } : undefined}
                strokeWidth={1.5}
              />
            )}
            {wishlistCount > 0 && (
              <span
                className="absolute -top-1 -right-1 z-10 min-w-[17px] h-[17px] px-1 bg-[#d9383a] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center shadow-xs transition-colors"
                style={{
                  boxShadow: `0 0 0 2px ${effectiveBg || (isDark ? "#0a0a0a" : "#ffffff")}`,
                }}
              >
                {wishlistCount}
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 w-full z-40 font-sans transition-colors duration-200"
      >
        <div id="announcement">
          <AnnouncementBar />
        </div>

        <nav
          className={`relative z-30 w-full transition-[background-color,border-color,box-shadow] duration-200 ${getNavContainerClass()}`}
          style={{
            backgroundColor: effectiveBg || undefined,
            color: customText || undefined,
            borderColor: (scrolled || isCategoriesDropdownOpen)
              ? "transparent"
              : customText
              ? `${customText}25`
              : undefined,
          }}
        >
          {/* 🪔 Festive Hanging Motif (Left Side) — Adaptive for each festive theme */}
          {activeOccasion && (
            <FestiveNavbarHangingMotif occasionId={activeOccasion.id} />
          )}

          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            {/* If Centered Logo (Templates 4 and 5) */}
            {isCenteredLogo ? (
              <div className="relative flex items-center justify-between min-h-[42px] sm:min-h-[46px] lg:min-h-[50px] gap-2 lg:gap-4">
                {/* LEFT: Mobile Menu (mobile) & Desktop Nav Links (desktop) */}
                <div
                  className={`flex flex-1 items-center justify-start min-w-0 overflow-visible relative z-30 transition-all duration-300 ${
                    activeOccasion ? "pl-9 sm:pl-11 lg:pl-16 xl:pl-20" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`lg:hidden p-1.5 rounded-lg transition-all duration-200 group my-auto cursor-pointer shrink-0 ${getHamburgerClass()}`}
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open menu"
                    style={customText ? { color: customText } : undefined}
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>

                  <div className="hidden lg:flex items-center gap-1 xl:gap-2 py-0.5 overflow-visible">
                    {navigation.map((item) => renderDesktopNavLink(item))}
                  </div>
                </div>

                {/* CENTER: Mobile & Desktop Centered Logo (Dead Center) */}
                <div className="flex items-center justify-center flex-shrink-0 px-2 sm:px-4 xl:px-8 z-10 self-center">
                  {renderBrandLogo(true)}
                </div>

                {/* RIGHT: Action Icons */}
                <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 z-10">
                  {renderActionIcons()}
                </div>
              </div>
            ) : (
              /* If Left Logo (Templates 1, 2, 3, 6) */
              <div className="relative flex items-center justify-between min-h-[42px] sm:min-h-[46px] lg:min-h-[50px] gap-2 lg:gap-4">
                {/* LEFT: Mobile Hamburger & Brand Logo */}
                <div
                  className={`flex items-center justify-start gap-2 min-w-0 shrink-0 transition-all duration-300 ${
                    activeOccasion ? "pl-9 sm:pl-11 lg:pl-14 xl:pl-16" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`lg:hidden p-1.5 rounded-lg transition-all duration-200 group my-auto cursor-pointer shrink-0 ${getHamburgerClass()}`}
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open menu"
                    style={customText ? { color: customText } : undefined}
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>
                  {renderBrandLogo(false)}
                </div>

                {/* CENTER: Centered Desktop Navigation Links */}
                <div className="hidden lg:flex flex-1 items-center justify-center px-4 min-w-0 overflow-visible relative z-30">
                  <div className="flex items-center gap-1.5 xl:gap-2.5 py-0.5 overflow-visible">
                    {navigation.map((item) => renderDesktopNavLink(item))}
                  </div>
                </div>

                {/* RIGHT: Action Icons */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 z-10">
                  {renderActionIcons()}
                </div>
              </div>
            )}
          </div>

          {/* ELEGANT MULTI-COLUMN CATEGORIES DROPDOWN (Matches Reference Image) */}
          {isCategoriesDropdownOpen && (
            <div
              ref={categoriesDropdownRef}
              onMouseEnter={cancelCategoriesClose}
              onMouseLeave={scheduleCategoriesClose}
              className={`hidden lg:block absolute top-full left-0 w-full z-50 border-b animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-auto before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 ${
                activeTemplate === 3 && !customBg
                  ? "bg-gradient-to-b from-indigo-950 via-slate-900 to-gray-950 border-indigo-500/25 text-white shadow-2xl"
                  : isDark
                    ? "border-white/10 text-white shadow-2xl"
                    : "border-gray-200 text-gray-900 shadow-xl"
              }`}
              style={{
                backgroundColor: effectiveBg || (isDark ? "#0a0a0a" : "#ffffff"),
                borderColor: customText ? `${customText}25` : undefined,
              }}
            >
              <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 py-8 max-h-[75vh] overflow-y-auto [scrollbar-width:thin]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 lg:gap-x-12 gap-y-8 items-start">
                  {topLevelCategories.map((cat) => {
                    const subcats = childrenOf(cat.id);
                    return (
                      <div key={cat.id} className="min-w-0 space-y-2.5">
                        {/* Main Category Heading */}
                        <Link
                          to={`/categories/${cat.id}`}
                          onClick={() => setIsCategoriesDropdownOpen(false)}
                          className={`font-bold text-[13px] sm:text-[14px] hover:underline transition-all block truncate tracking-tight ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                          style={customText ? { color: customText } : undefined}
                          title={cat.name}
                        >
                          {cat.name}
                        </Link>

                        {/* Subcategories List */}
                        {subcats.length > 0 && (
                          <div className="space-y-2 text-[12px] sm:text-[13px]">
                            {subcats.map((sub) => {
                              const grandCats = childrenOf(sub.id);
                              return (
                                <div key={sub.id} className="space-y-1">
                                  <Link
                                    to={`/categories/${sub.id}`}
                                    onClick={() => setIsCategoriesDropdownOpen(false)}
                                    className={`hover:underline transition-colors block truncate font-normal ${
                                      isDark
                                        ? "text-white/80 hover:text-white"
                                        : "text-gray-600 hover:text-black"
                                    }`}
                                    style={customText ? { color: customText, opacity: 0.85 } : undefined}
                                    title={sub.name}
                                  >
                                    {sub.name}
                                  </Link>
                                  {grandCats.length > 0 && (
                                    <div
                                      className={`pl-2 space-y-1 border-l my-1 ${
                                        isDark ? "border-white/15" : "border-gray-200"
                                      }`}
                                      style={customText ? { borderColor: `${customText}33` } : undefined}
                                    >
                                      {grandCats.map((grand) => (
                                        <Link
                                          key={grand.id}
                                          to={`/categories/${grand.id}`}
                                          onClick={() => setIsCategoriesDropdownOpen(false)}
                                          className={`text-[11px] hover:underline transition-colors block truncate font-normal ${
                                            isDark
                                              ? "text-white/60 hover:text-white"
                                              : "text-gray-500 hover:text-black"
                                          }`}
                                          style={customText ? { color: customText, opacity: 0.65 } : undefined}
                                          title={grand.name}
                                        >
                                          {grand.name}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Shyle-Style Full Luxury Search Overlay (Matches Referral Image) */}
        {isSearchOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-xs z-30 transition-opacity animate-in fade-in duration-200"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchFocused(false);
              }}
            />

            {/* Search Panel Container */}
            <div
              ref={searchRef}
              className={`relative z-40 w-full border-b shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 font-sans ${
                activeTemplate === 3 && !customBg
                  ? "bg-gradient-to-b from-indigo-950 via-slate-900 to-gray-950 border-indigo-500/25 text-white"
                  : isDark
                    ? "border-white/10 text-white"
                    : "border-gray-200 text-gray-900"
              }`}
              style={{
                backgroundColor: effectiveBg || (isDark ? "#0a0a0a" : "#ffffff"),
                borderColor: customText ? `${customText}25` : undefined,
              }}
            >
              <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
                {/* Search Input Bar (Matches Image: [🔍] [input] [✕]) */}
                <div
                  className={`flex items-center gap-3 py-4 border-b ${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                >
                  <MagnifyingGlassIcon
                    className={`h-5 w-5 shrink-0 ${
                      isDark ? "text-zinc-400" : "text-gray-500"
                    }`}
                    strokeWidth={1.8}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search products & collections..."
                    className={`flex-1 bg-transparent border-none text-base sm:text-lg lg:text-xl font-normal focus:outline-none ${
                      isDark
                        ? "text-white placeholder-zinc-500"
                        : "text-gray-900 placeholder-gray-400"
                    }`}
                    autoFocus
                  />
                  {searchLoading && (
                    <svg className="animate-spin h-5 w-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                      setSearchResults(null);
                    }}
                    className={`p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                      isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/10"
                        : "text-gray-500 hover:text-black hover:bg-gray-100"
                    }`}
                    aria-label="Close search"
                  >
                    <XMarkIcon className="h-6 w-6" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Main Content Area (2-column layout: Suggestions on left, Products/Collections on right) */}
                <div className="py-6 max-h-[75vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    
                    {/* LEFT COLUMN: Suggestions */}
                    <div className="w-full md:w-56 lg:w-64 shrink-0">
                      <h4
                        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                          isDark ? "text-zinc-400" : "text-gray-500"
                        }`}
                      >
                        Suggestions
                      </h4>
                      <div className="space-y-1">
                        {suggestionsList.length > 0 ? (
                          suggestionsList.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSearchQuery(suggestion);
                              }}
                              className={`w-full text-left text-xs sm:text-[13px] hover:underline transition-colors py-1 block cursor-pointer truncate ${
                                isDark
                                  ? "text-zinc-300 hover:text-white"
                                  : "text-gray-700 hover:text-black"
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 italic">Type to see suggestions...</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Products / Collections */}
                    <div className="flex-1 min-w-0">
                      {!hasSearched ? (
                        <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center px-4">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                              isDark ? "bg-white/5 text-zinc-400" : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <MagnifyingGlassIcon className="w-7 h-7" strokeWidth={1.5} />
                          </div>
                          <h3
                            className={`text-base sm:text-lg font-bold tracking-tight mb-1.5 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Search your products
                          </h3>
                          <p
                            className={`text-xs sm:text-sm max-w-sm leading-relaxed ${
                              isDark ? "text-zinc-400" : "text-gray-500"
                            }`}
                          >
                            Type what you're looking for or pick a suggestion from the left to start searching.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {/* Tabs Header */}
                          <div
                            className={`flex items-center gap-6 border-b pb-2 mb-5 ${
                              isDark ? "border-white/10" : "border-gray-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSearchTab("products")}
                              className={`text-xs sm:text-[13px] font-semibold tracking-wide transition-colors cursor-pointer pb-2 -mb-2 border-b-2 ${
                                searchTab === "products"
                                  ? isDark
                                    ? "text-white border-white"
                                    : "text-black border-black"
                                  : isDark
                                  ? "text-zinc-500 hover:text-zinc-300 border-transparent"
                                  : "text-gray-400 hover:text-gray-700 border-transparent"
                              }`}
                            >
                              Products {displayProducts.length > 0 ? `(${displayProducts.length})` : ""}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSearchTab("collections")}
                              className={`text-xs sm:text-[13px] font-semibold tracking-wide transition-colors cursor-pointer pb-2 -mb-2 border-b-2 ${
                                searchTab === "collections"
                                  ? isDark
                                    ? "text-white border-white"
                                    : "text-black border-black"
                                  : isDark
                                  ? "text-zinc-500 hover:text-zinc-300 border-transparent"
                                  : "text-gray-400 hover:text-gray-700 border-transparent"
                              }`}
                            >
                              Collections {displayCategories.length > 0 ? `(${displayCategories.length})` : ""}
                            </button>
                          </div>

                          {/* Loading state while searching */}
                          {searchLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                              <svg className="animate-spin h-8 w-8 text-[#8b263e] mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-gray-500"}`}>
                                Searching products & collections...
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Products Tab Grid */}
                              {searchTab === "products" && (
                                <div>
                                  {displayProducts.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                                      {displayProducts.map((prod) => {
                                        const imgSrc = prod.image
                                          ? prod.image.startsWith("http")
                                            ? prod.image
                                            : `${domainUrl}/${prod.image}`
                                          : null;
                                        return (
                                          <div
                                            key={prod.id}
                                            onClick={() => handleProductClick(prod.id)}
                                            className="group cursor-pointer flex flex-col"
                                          >
                                            <div
                                              className={`w-full aspect-square rounded-2xl overflow-hidden relative ${
                                                isDark
                                                  ? "bg-zinc-900 border border-white/10"
                                                  : "bg-[#f5f5f5]"
                                              }`}
                                            >
                                              {imgSrc ? (
                                                <img
                                                  src={imgSrc}
                                                  alt={prod.name}
                                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                  loading="lazy"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                  <ShoppingBagIcon className="w-10 h-10" />
                                                </div>
                                              )}
                                            </div>
                                            <h5
                                              className={`mt-2.5 text-xs sm:text-[13px] font-normal line-clamp-1 transition-colors ${
                                                isDark
                                                  ? "text-zinc-200 group-hover:text-white"
                                                  : "text-gray-900 group-hover:text-black"
                                              }`}
                                            >
                                              {prod.name}
                                            </h5>
                                            <p
                                              className={`mt-0.5 text-xs sm:text-[13px] font-semibold ${
                                                isDark ? "text-white" : "text-gray-900"
                                              }`}
                                            >
                                              ₹{Number(prod.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="py-16 text-center text-xs text-gray-400">
                                      No products found for "{searchQuery}"
                                    </div>
                                  )}

                                  {/* "VIEW ALL RESULTS" Pill Button */}
                                  {displayProducts.length > 0 && (
                                    <div className="flex justify-center mt-8 pb-4">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsSearchOpen(false);
                                          navigate(
                                            `/products?search=${encodeURIComponent(searchQuery)}`
                                          );
                                        }}
                                        className="px-8 py-3 bg-[#8b263e] hover:bg-[#721f32] text-white text-xs font-semibold uppercase tracking-widest rounded-full transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-98"
                                      >
                                        View All Results
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Collections Tab Grid */}
                              {searchTab === "collections" && (
                                <div>
                                  {displayCategories.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                                      {displayCategories.map((cat) => {
                                        const catImg = cat.image
                                          ? cat.image.startsWith("http")
                                            ? cat.image
                                            : `${domainUrl}/${cat.image}`
                                          : null;
                                        return (
                                          <div
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className="group cursor-pointer flex flex-col"
                                          >
                                            <div
                                              className={`w-full aspect-square rounded-2xl overflow-hidden relative ${
                                                isDark
                                                  ? "bg-zinc-900 border border-white/10"
                                                  : "bg-[#f5f5f5]"
                                              }`}
                                            >
                                              {catImg ? (
                                                <img
                                                  src={catImg}
                                                  alt={cat.name}
                                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                  loading="lazy"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                  <CubeIcon className="w-10 h-10" />
                                                </div>
                                              )}
                                            </div>
                                            <h5
                                              className={`mt-2.5 text-xs sm:text-[13px] font-semibold line-clamp-1 transition-colors text-center ${
                                                isDark
                                                  ? "text-zinc-200 group-hover:text-white"
                                                  : "text-gray-900 group-hover:text-black"
                                              }`}
                                            >
                                              {cat.name}
                                            </h5>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="py-16 text-center text-xs text-gray-400">
                                      No collections found for "{searchQuery}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MOBILE MENU DRAWER */}
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="relative z-[100] lg:hidden"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 z-[100]" />
          <div className="fixed inset-0 z-[100] flex">
            <DialogPanel
              className={`relative mr-auto flex h-full w-[300px] max-w-[85vw] flex-col overflow-y-auto shadow-2xl transition-transform duration-300 border-r ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                  isDark ? "border-zinc-800" : "border-gray-100"
                }`}
              >
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center group cursor-pointer"
                >
                  <div
                    className={`inline-flex items-center justify-center transition-all duration-300 ${
                      isDark || isThemeBand
                        ? "bg-white rounded-xl p-1 shadow-sm ring-1 ring-black/5"
                        : ""
                    }`}
                  >
                    <img
                      src={logoSrc}
                      alt={branding.companyName || "Logo"}
                      className="h-8 sm:h-9 w-auto max-w-[140px] object-contain"
                    />
                  </div>
                  {(branding.showCompanyName || branding.showCompanyTagline) && (
                    <div className="flex items-center pl-1">
                      <div className={`h-6 w-[1px] mx-2.5 shrink-0 ${isDark ? "bg-white/20" : "bg-slate-200"}`} />
                      <div className="flex flex-col justify-center text-left min-w-0">
                        {branding.showCompanyName && branding.companyName && (
                          <span
                            className={`text-xs font-bold uppercase tracking-wider leading-none truncate ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {branding.companyName}
                          </span>
                        )}
                        {branding.showCompanyTagline && branding.companyTagline && (
                          <span
                            className={`text-[9px] tracking-wider uppercase font-medium leading-tight mt-1 truncate ${
                              isDark ? "text-zinc-400" : "text-gray-500"
                            }`}
                          >
                            {branding.companyTagline}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDark
                      ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 px-2 py-4">
                {/* Mobile Search */}
                <div className="mx-2 mb-3">
                  <div className="relative">
                    <MagnifyingGlassIcon
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
                        isDark ? "text-zinc-400" : "text-gray-400"
                      }`}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Search products & categories..."
                      className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                        isDark
                          ? "bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-white/30"
                          : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-gray-400"
                      }`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        <XMarkIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Mobile search results */}
                  {searchQuery.trim().length >= 2 &&
                    (searchLoading || searchResults) && (
                      <div
                        className={`mt-2 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                          isDark
                            ? "bg-zinc-900 border border-zinc-800 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                      >
                        {searchLoading && (
                          <div className="p-3 text-center text-gray-400 text-xs">
                            Searching...
                          </div>
                        )}
                        {!searchLoading && searchResults && (
                          <>
                            {[
                              ...searchResults.categories.map((c) => ({
                                type: "category" as const,
                                ...c,
                              })),
                              ...searchResults.products.map((p) => ({
                                type: "product" as const,
                                ...p,
                              })),
                            ].length === 0 ? (
                              <div className="p-4 text-center text-gray-400 text-xs">
                                No results found
                              </div>
                            ) : (
                              <>
                                {searchResults.categories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    onClick={() => {
                                      handleCategoryClick(cat.id);
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                                      isDark
                                        ? "hover:bg-white/10 text-zinc-100"
                                        : "hover:bg-gray-100 text-gray-900"
                                    }`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${
                                        isDark ? "bg-zinc-800" : "bg-gray-100"
                                      }`}
                                    >
                                      {cat.image ? (
                                        <img
                                          src={
                                            cat.image.startsWith("http")
                                              ? cat.image
                                              : `${domainUrl}/${cat.image}`
                                          }
                                          alt={cat.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <CubeIcon className="h-4 w-4 text-gray-400 m-auto mt-2" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold">
                                        {cat.name}
                                      </div>
                                      <div className="text-[10px] text-gray-400">
                                        Category
                                      </div>
                                    </div>
                                  </button>
                                ))}
                                {searchResults.products.map((prod) => (
                                  <button
                                    key={prod.id}
                                    onClick={() => {
                                      handleProductClick(prod.id);
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                                      isDark
                                        ? "hover:bg-white/10 text-zinc-100"
                                        : "hover:bg-gray-100 text-gray-900"
                                    }`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${
                                        isDark ? "bg-zinc-800" : "bg-gray-100"
                                      }`}
                                    >
                                      {prod.image ? (
                                        <img
                                          src={
                                            prod.image.startsWith("http")
                                              ? prod.image
                                              : `${domainUrl}/${prod.image}`
                                          }
                                          alt={prod.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <ShoppingBagIcon className="h-4 w-4 text-gray-400 m-auto mt-2" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold truncate">
                                        {prod.name}
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        ₹{prod.price?.toLocaleString()}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                </div>

                <div className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = !item.isAction && isActive(item.href);

                    if (item.isDropdown) {
                      return (
                        <div key={item.name} className="mx-2">
                          <button
                            type="button"
                            onClick={() => setMobileCategoriesExpanded((prev) => !prev)}
                            className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer ${
                              isCategoriesActive
                                ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-md shadow-[var(--theme-primary)]/20"
                                : isDark
                                ? "text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-white/10"
                                : "text-gray-700 hover:text-[var(--theme-primary)] hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                className={`h-4 w-4 ${
                                  isCategoriesActive
                                    ? "text-[var(--theme-primary-ink)]"
                                    : isDark
                                    ? "text-zinc-400"
                                    : "text-gray-500"
                                }`}
                              />
                              <span>{item.name}</span>
                            </div>
                            <ChevronDownIcon
                              className={`h-4 w-4 transition-transform duration-200 ${
                                mobileCategoriesExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {mobileCategoriesExpanded && (
                            <div className="pl-4 pr-2 py-1 space-y-1 mt-1 border-l-2 border-gray-200 dark:border-zinc-800 ml-5 max-h-[50vh] overflow-y-auto">
                              {topLevelCategories.map((top) => {
                                const subcats = childrenOf(top.id);
                                return (
                                  <div key={top.id} className="space-y-0.5">
                                    <Link
                                      to={`/categories/${top.id}`}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-colors"
                                    >
                                      <span>{top.name}</span>
                                      <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                                    </Link>
                                    {subcats.length > 0 && (
                                      <div className="pl-3 ml-2 border-l border-purple-200 dark:border-white/10 space-y-0.5 py-0.5">
                                        {subcats.map((sub) => (
                                          <Link
                                            key={sub.id}
                                            to={`/categories/${sub.id}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block text-[11px] font-medium py-1 px-2 text-gray-500 dark:text-zinc-400 hover:text-[var(--theme-primary)]"
                                          >
                                            {sub.name}
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <Link
                                to="/categories"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-bold text-[var(--theme-primary)] hover:underline transition-colors"
                              >
                                <span>All Categories</span>
                                <span>→</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={(e) => {
                          if (item.isAction && item.onClick) {
                            item.onClick(e);
                          } else if (item.protected && !isAuthenticated) {
                            handleGatedNavigation(e, item.href, true);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 mx-2 text-xs font-bold ${
                          active
                            ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-bold shadow-md shadow-[var(--theme-primary)]/20"
                            : isDark
                            ? "text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-white/10"
                            : "text-gray-700 hover:text-[var(--theme-primary)] hover:bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            active
                              ? "text-[var(--theme-primary-ink)]"
                              : isDark
                              ? "text-zinc-400"
                              : "text-gray-500"
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}

                  {/* Wishlist item in mobile drawer - Only shown when logged in */}
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        handleWishlistClick(e);
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl transition-all duration-200 mx-2 text-xs font-bold cursor-pointer ${
                        isActive("/WishlistPage") || isActive("/wishlist")
                          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-bold shadow-md shadow-[var(--theme-primary)]/20"
                          : isDark
                          ? "text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-white/10"
                          : "text-gray-700 hover:text-[var(--theme-primary)] hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <HeartOutline className="h-4 w-4 text-gray-500" />
                        <span>Wishlist</span>
                      </div>
                      {wishlistCount > 0 && (
                        <span className="text-[10px] bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-bold rounded-full px-2 py-0.5">
                          {wishlistCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Notifications item in mobile drawer - Only shown when logged in */}
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (isAdmin) {
                          navigate(`${adminDashboardPath}/notifications`);
                        } else {
                          setNotifOpen(true);
                        }
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl transition-all duration-200 mx-2 text-xs font-bold cursor-pointer ${
                        isDark
                          ? "text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-white/10"
                          : "text-gray-700 hover:text-[var(--theme-primary)] hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BellIcon className="h-4 w-4 text-gray-500" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-rose-500 text-white font-bold rounded-full px-2 py-0.5 shadow-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Auth Section */}
              <div
                className={`px-4 py-4 border-t ${
                  isDark ? "border-zinc-800" : "border-gray-100"
                }`}
              >
                {!isAuthenticated ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setCustomerAuthOpen(true);
                      }}
                      className={`block w-full text-center py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer ${
                        isDark
                          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)]"
                          : isThemeBand
                          ? "bg-white text-gray-900 hover:bg-gray-100"
                          : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)]"
                      }`}
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.dispatchEvent(new CustomEvent("open-profile-drawer"));
                      }}
                      className={`flex items-center justify-center gap-2 w-full text-center py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isDark
                          ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      }`}
                    >
                      <img
                        src={isDark ? profileLightningWhite : profileLightningDark}
                        alt="Profile"
                        className="h-4.5 w-4.5 object-contain"
                      />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        if (handleLogout) {
                          handleLogout();
                        } else {
                          logout();
                        }
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 w-full text-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </header>

      <TrackShippingModal
        isOpen={trackShippingOpen}
        onClose={() => setTrackShippingOpen(false)}
        initialPartners={trackingNavConfig.enabledPartners}
      />

      <CustomerAuthModal
        open={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
      />
    </>
  );
};

export default Navbar;