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

interface NavbarConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6;
}

const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  activeTemplate: 1,
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
  const { logout } = useAuth();
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
        const tmpl = (Number(event.data.template) || 1) as 1 | 2 | 3 | 4 | 5 | 6;
        setNavbarConfig({ activeTemplate: tmpl });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
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

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      }
    };
    if (searchFocused) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchFocused]);

  // Debounced search API call
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
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
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const isAuthenticated = user?.isAuthenticated;

  // --- BADGE VISIBILITY LOGIC ---
  const showCartBadge = cartItemCount > ackCartCount;
  const showWishlistBadge = wishlistCount > 0;

  const handleCartClick = () => {
    setAckCartCount(cartItemCount);
    localStorage.setItem("ack_cart_count", String(cartItemCount));
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    handleGatedNavigation(e, "/WishlistPage", true);
    setAckWishlistCount((prev) => {
      const next = Math.max(prev, wishlistCount);
      localStorage.setItem("ack_wishlist_count", String(next));
      return next;
    });
  };

  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      setCustomerAuthOpen(true);
    } else {
      setIsUserDropdownOpen(!isUserDropdownOpen);
    }
  };

  // --- CATEGORIES DROPDOWN STATE ---
  interface FlatCategory {
    id: string;
    name: string;
    parentId: string | null;
    showInNav?: boolean;
  }

  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [isCategoriesDropdownOpen, setIsCategoriesDropdownOpen] = useState(false);
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);
  const categoriesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Fetch shop categories for navbar dropdown integration
  useEffect(() => {
    api
      .get("/user/shop/categories")
      .then((res) => {
        const raw = res.data?.categories || [];
        const normalized: FlatCategory[] = raw.map((c: any) => ({
          id: String(c.id ?? c._id),
          name: c.name,
          parentId: c.parentId ? String(c.parentId) : null,
          showInNav: c.showInNav !== false,
        }));
        setCategories(normalized);
      })
      .catch(() => setCategories([]));
  }, []);

  const topLevelCategories = categories.filter(
    (c) => !c.parentId && c.showInNav !== false
  );
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const handleGatedNavigation = (
    e: React.MouseEvent,
    path: string,
    isProtected: boolean
  ) => {
    e.preventDefault();

    if (isProtected && !isAuthenticated) {
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
    ...(topLevelCategories.length > 0
      ? [
          {
            name: "Categories",
            href: "/products",
            protected: false,
            icon: Squares2X2Icon,
            isDropdown: true,
          },
        ]
      : []),
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

  // --- TEMPLATE VARIANT STYLING COMPUTATIONS (Pairs 1-to-1 with Footer 1-6) ---
  const isDark = activeTemplate === 1 || activeTemplate === 3;
  const isThemeBand = activeTemplate === 5;

  const getNavContainerClass = () => {
    switch (activeTemplate) {
      case 1: // Dark Professional (Matches Footer 1)
        return scrolled
          ? "bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-white/10"
          : "bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px]";

      case 2: // Light Editorial (Matches Footer 2)
        return scrolled
          ? "bg-gray-50/95 backdrop-blur-2xl shadow-md shadow-black/5 py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-gray-200"
          : "bg-gray-50/90 backdrop-blur-xl border-b border-gray-200 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px]";

      case 3: // Gradient with Aurora Accent (Matches Footer 3)
        return scrolled
          ? "bg-gradient-to-r from-indigo-950/98 via-slate-900/98 to-gray-950/98 backdrop-blur-2xl shadow-2xl shadow-indigo-950/50 py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-indigo-500/25"
          : "bg-gradient-to-r from-indigo-950/92 via-slate-900/92 to-gray-950/92 backdrop-blur-xl border-b border-indigo-500/20 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px]";

      case 4: // Minimal Centered (Matches Footer 4)
        return scrolled
          ? "bg-white/95 backdrop-blur-2xl shadow-xs py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-gray-100"
          : "bg-white/90 backdrop-blur-xl border-b border-gray-100 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px]";

      case 5: // Festive Accent Band (Matches Footer 5)
        return scrolled
          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-xl shadow-[var(--theme-primary)]/25 py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-black/10"
          : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-md shadow-[var(--theme-primary)]/15 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px] border-b border-black/5";

      case 6: // Split Statement / Modern Asymmetric (Matches Footer 6)
      default:
        return scrolled
          ? "bg-white/95 backdrop-blur-2xl shadow-xl shadow-black/10 py-3 sm:py-3.5 lg:py-4 min-h-[62px] sm:min-h-[68px] lg:min-h-[76px] border-b border-black/10"
          : "bg-white/90 backdrop-blur-xl border-b border-black/10 py-4 sm:py-5 lg:py-6 min-h-[72px] sm:min-h-[80px] lg:min-h-[90px]";
    }
  };

  const getBrandTitleClass = () => {
    if (isDark) return "text-white font-black tracking-wider uppercase";
    if (isThemeBand) return "text-[var(--theme-primary-ink)] font-black tracking-wider uppercase";
    if (activeTemplate === 2) return "text-gray-900 font-serif font-black tracking-wider uppercase";
    if (activeTemplate === 4) return "text-gray-950 font-serif font-black tracking-widest uppercase";
    return "text-gray-950 font-black tracking-tight uppercase";
  };

  const getBrandTaglineClass = () => {
    if (isDark) return "text-zinc-400";
    if (isThemeBand) return "text-[var(--theme-primary-ink)]/75";
    return "text-gray-500";
  };

  const getHamburgerClass = () => {
    if (isDark) return "text-zinc-200 hover:text-white hover:bg-white/10";
    if (isThemeBand) return "text-[var(--theme-primary-ink)] hover:bg-black/10";
    return "text-gray-800 hover:text-black hover:bg-black/5";
  };

  const getSearchInputClass = () => {
    switch (activeTemplate) {
      case 1: // Dark Professional
        return "w-36 lg:w-44 xl:w-56 focus:w-64 pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-xs xl:text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-white/10 focus:border-[var(--theme-primary)]/60 focus:ring-2 focus:ring-[var(--theme-primary)]/20 transition-all duration-300 ease-out";

      case 2: // Light Editorial
        return "w-36 lg:w-44 xl:w-56 focus:w-64 pl-9 pr-8 py-2 bg-white border border-gray-300/80 rounded-lg text-xs xl:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/25 transition-all duration-200";

      case 3: // Gradient with Aurora Accent
        return "w-36 lg:w-44 xl:w-56 focus:w-64 pl-9 pr-8 py-2 bg-white/10 border border-white/20 rounded-full text-xs xl:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:bg-white/15 transition-all duration-300 ease-out";

      case 4: // Minimal Centered
        return "w-32 lg:w-40 xl:w-52 focus:w-60 pl-8 pr-7 py-1.5 lg:py-2 bg-gray-50/90 hover:bg-gray-100/80 border-0 rounded-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]/40 focus:bg-white transition-all duration-300";

      case 5: // Festive Accent Band
        return "w-36 lg:w-44 xl:w-56 focus:w-64 pl-9 pr-8 py-2 bg-white/20 border border-white/25 rounded-xl text-xs xl:text-sm text-[var(--theme-primary-ink)] placeholder-[var(--theme-primary-ink)]/60 focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 transition-all duration-300";

      case 6: // Split Statement
      default:
        return "w-36 lg:w-44 xl:w-56 focus:w-64 pl-9 pr-8 py-2 bg-gray-100/90 hover:bg-gray-100 border-0 rounded-2xl text-xs xl:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/30 focus:bg-white transition-all duration-300 shadow-xs";
    }
  };

  const getActionButtonClass = () => {
    switch (activeTemplate) {
      case 1: // Dark Professional
        return "relative flex items-center justify-center p-2.5 lg:p-3 rounded-full border border-white/20 text-white hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-pointer";

      case 2: // Light Editorial
        return "relative flex items-center justify-center p-2.5 lg:p-3 rounded-lg border border-gray-200 hover:border-[var(--theme-primary)] hover:bg-white text-gray-700 hover:text-[var(--theme-primary)] hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer";

      case 3: // Gradient with Aurora Accent
        return "relative flex items-center justify-center p-2.5 lg:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hover:shadow-[0_0_12px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 group cursor-pointer";

      case 4: // Minimal Centered
        return "relative flex items-center justify-center p-2 sm:p-2.5 lg:p-3 rounded-full hover:bg-gray-100 text-gray-700 hover:text-[var(--theme-primary)] hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer";

      case 5: // Festive Accent Band
        return "relative flex items-center justify-center p-2.5 lg:p-3 rounded-full bg-white/15 hover:bg-white hover:text-gray-900 text-[var(--theme-primary-ink)] hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer";

      case 6: // Split Statement
      default:
        return "relative flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-gray-100/80 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] text-gray-900 hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer";
    }
  };

  const getSignInButtonClass = () => {
    switch (activeTemplate) {
      case 1: // Dark Professional
        return "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)] px-5 lg:px-6 py-2.5 lg:py-3 rounded-xl text-xs lg:text-sm font-black tracking-tight shadow-md shadow-[var(--theme-primary)]/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer";

      case 2: // Light Editorial
        return "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)] uppercase tracking-widest text-[11px] lg:text-xs font-bold px-5 lg:px-6 py-2.5 lg:py-3 rounded-lg shadow-sm hover:shadow-md hover:shadow-[var(--theme-primary)]/25 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer";

      case 3: // Gradient with Aurora Accent
        return "bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-ink)] rounded-full px-5.5 lg:px-6.5 py-2.5 lg:py-3 text-xs md:text-sm font-bold shadow-lg shadow-[var(--theme-primary)]/30 hover:shadow-[var(--theme-primary)]/50 transition-all duration-300 hover:scale-102 active:scale-95 cursor-pointer";

      case 4: // Minimal Centered
        return "bg-gray-950 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] text-white rounded-full px-5 lg:px-6 py-2.5 lg:py-3 text-xs lg:text-sm font-semibold tracking-wider transition-all duration-300 hover:shadow-xs active:scale-95 cursor-pointer";

      case 5: // Festive Accent Band
        return "bg-white text-gray-900 hover:bg-gray-100 rounded-xl px-5 lg:px-6 py-2.5 lg:py-3 font-black text-xs lg:text-sm shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer";

      case 6: // Split Statement
      default:
        return "bg-black hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] text-white rounded-2xl px-5.5 lg:px-6.5 py-2.5 lg:py-3 font-black text-xs lg:text-sm uppercase tracking-wider shadow-lg shadow-black/20 hover:shadow-[var(--theme-primary)]/30 transition-all duration-300 hover:scale-102 active:scale-95 cursor-pointer";
    }
  };

  const getAccountButtonClass = () => {
    const active = isUserDropdownOpen || isActive("/profile");
    switch (activeTemplate) {
      case 1:
        return active
          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] border-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/20 rounded-xl px-4 py-2"
          : "border border-white/20 bg-white/10 text-white hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] rounded-xl px-4 py-2";

      case 2:
        return active
          ? "bg-gray-900 text-white border-gray-900 rounded-lg px-3.5 py-2"
          : "border border-gray-300 bg-white text-gray-900 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] rounded-lg px-3.5 py-2";

      case 3:
        return active
          ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/40 rounded-full px-4.5 py-2"
          : "bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full px-4.5 py-2";

      case 4:
        return active
          ? "bg-black text-white rounded-full px-3.5 py-1.5"
          : "border border-gray-200 bg-white hover:border-[var(--theme-primary)] rounded-full px-3.5 py-1.5 text-gray-800";

      case 5:
        return active
          ? "bg-white text-gray-900 shadow-md rounded-xl px-4 py-2"
          : "bg-white/20 hover:bg-white/30 border border-white/30 text-[var(--theme-primary-ink)] rounded-xl px-4 py-2";

      case 6:
      default:
        return active
          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-md rounded-2xl px-4.5 py-2.5"
          : "bg-gray-100 text-gray-900 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] rounded-2xl px-4.5 py-2.5";
    }
  };

  const renderDesktopNavLink = (item: (typeof navigation)[number]) => {
    if (item.isDropdown) {
      const active = isCategoriesActive || isCategoriesDropdownOpen;
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
          {/* Dropdown Trigger Button matching current template */}
          {(() => {
            switch (activeTemplate) {
              case 1:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1.5 text-xs lg:text-sm tracking-tight transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-lg shadow-[var(--theme-primary)]/25 px-3.5 xl:px-4 py-1.5 lg:py-2 rounded-xl scale-100"
                        : "text-zinc-400 hover:text-[var(--theme-primary)] hover:bg-white/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-xl font-semibold hover:-translate-y-0.5 active:scale-95"
                    }`}
                  >
                    <span>{item.name}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );

              case 2:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex flex-col items-center justify-center uppercase tracking-wider text-[10px] lg:text-[11px] xl:text-xs px-2.5 lg:px-3.5 py-2 transition-all duration-300 cursor-pointer group whitespace-nowrap shrink-0 ${
                      active
                        ? "text-gray-950 font-bold"
                        : "text-gray-500 hover:text-[var(--theme-primary)] font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{item.name}</span>
                      <ChevronDownIcon
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isCategoriesDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {active ? (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 sm:w-5 h-[2.5px] bg-[var(--theme-primary)] rounded-full shadow-xs" />
                    ) : (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-3.5 h-[2px] bg-[var(--theme-primary)]/70 rounded-full transition-all duration-200" />
                    )}
                  </button>
                );

              case 3:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1.5 text-xs lg:text-sm tracking-tight transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-bold px-3.5 xl:px-4.5 py-1.5 lg:py-2 rounded-full shadow-lg shadow-[var(--theme-primary)]/30"
                        : "text-indigo-200/80 hover:text-white hover:bg-white/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-full font-semibold hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                    }`}
                  >
                    <span>{item.name}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );

              case 4:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1 uppercase tracking-wider text-[10px] lg:text-[11px] xl:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? "text-black font-bold relative after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-[var(--theme-primary)] after:rounded-full"
                        : "text-gray-400 hover:text-[var(--theme-primary)] font-medium"
                    }`}
                  >
                    <span>{item.name}</span>
                    <ChevronDownIcon
                      className={`h-3 w-3 transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );

              case 5:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1.5 text-xs lg:text-sm tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-white text-gray-900 font-black shadow-md rounded-xl px-3.5 xl:px-4 py-1.5 lg:py-2 scale-100"
                        : "text-[var(--theme-primary-ink)]/75 hover:text-[var(--theme-primary-ink)] hover:bg-black/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold"
                    }`}
                  >
                    <span>{item.name}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );

              case 6:
              default:
                return (
                  <button
                    type="button"
                    onClick={() => setIsCategoriesDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1.5 text-xs lg:text-sm tracking-tight transition-all duration-200 ease-out cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-lg shadow-[var(--theme-primary)]/20 px-3.5 xl:px-4 py-1.5 lg:py-2 rounded-2xl scale-100"
                        : "text-gray-600 hover:text-[var(--theme-primary)] hover:bg-gray-100/90 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-2xl font-black hover:scale-105 active:scale-95"
                    }`}
                  >
                    <span>{item.name}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCategoriesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );
            }
          })()}

          {/* Floating Mega Dropdown Panel */}
          {isCategoriesDropdownOpen && topLevelCategories.length > 0 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 z-50 transition-all duration-200 animate-in fade-in-50 zoom-in-95 pointer-events-auto"
              onMouseEnter={cancelCategoriesClose}
              onMouseLeave={scheduleCategoriesClose}
            >
              <div
                className={`rounded-2xl border border-gray-100/90 bg-white/98 shadow-[0_20px_50px_rgba(0,0,0,0.14)] p-5 backdrop-blur-2xl ring-1 ring-black/5 text-gray-900 ${
                  topLevelCategories.length <= 1
                    ? "w-[280px]"
                    : topLevelCategories.length <= 3
                    ? "w-[520px]"
                    : topLevelCategories.length <= 6
                    ? "w-[720px]"
                    : "w-[880px] max-w-[92vw]"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-gray-100">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    Categories ({topLevelCategories.length})
                  </span>
                  <Link
                    to="/products"
                    onClick={() => setIsCategoriesDropdownOpen(false)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>All Products</span>
                    <span>→</span>
                  </Link>
                </div>

                {/* Category Grid with Scroll container for large lists */}
                <div
                  className={`grid gap-3.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin ${
                    topLevelCategories.length === 1
                      ? "grid-cols-1"
                      : topLevelCategories.length === 2
                      ? "grid-cols-2"
                      : topLevelCategories.length <= 6
                      ? "grid-cols-2 sm:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {topLevelCategories.map((top) => {
                    const subcats = childrenOf(top.id);
                    return (
                      <div key={top.id} className="space-y-1 min-w-[150px]">
                        <Link
                          to={`/categories/${top.id}`}
                          onClick={() => setIsCategoriesDropdownOpen(false)}
                          className="group flex items-center font-bold text-xs text-gray-900 hover:text-indigo-600 hover:bg-indigo-50/80 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <span className="truncate">{top.name}</span>
                        </Link>
                        {subcats.length > 0 && (
                          <div className="pl-3 ml-2 border-l border-gray-100 space-y-0.5">
                            {subcats.map((sub) => (
                              <Link
                                key={sub.id}
                                to={`/categories/${sub.id}`}
                                onClick={() => setIsCategoriesDropdownOpen(false)}
                                className="block text-[11px] font-medium text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-all truncate"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    const active = !item.isAction && isActive(item.href);

    const handleClick = (e: React.MouseEvent) => {
      if (item.isAction && item.onClick) {
        item.onClick(e);
        return;
      }
      if (item.protected && !isAuthenticated) {
        handleGatedNavigation(e, item.href, true);
      }
    };

    switch (activeTemplate) {
      case 1: // Dark Professional (Floating pill with micro-lift)
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex items-center text-xs lg:text-sm tracking-tight transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-lg shadow-[var(--theme-primary)]/25 px-3.5 xl:px-4 py-1.5 lg:py-2 rounded-xl scale-100"
                : "text-zinc-400 hover:text-[var(--theme-primary)] hover:bg-white/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-xl font-semibold hover:-translate-y-0.5 active:scale-95"
            }`}
          >
            {item.name}
          </Link>
        );

      case 2: // Light Editorial (Centered small baseline indicator in theme primary)
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex flex-col items-center justify-center uppercase tracking-wider text-[10px] lg:text-[11px] xl:text-xs px-2.5 lg:px-3.5 py-2 transition-all duration-300 ease-out cursor-pointer group whitespace-nowrap shrink-0 ${
              active
                ? "text-gray-950 font-bold"
                : "text-gray-500 hover:text-[var(--theme-primary)] font-semibold"
            }`}
          >
            <span>{item.name}</span>
            {active ? (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 sm:w-5 h-[2.5px] bg-[var(--theme-primary)] rounded-full shadow-xs" />
            ) : (
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-3.5 h-[2px] bg-[var(--theme-primary)]/70 rounded-full transition-all duration-200" />
            )}
          </Link>
        );

      case 3: // Gradient with Aurora Accent (Glowing tech pill)
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex items-center text-xs lg:text-sm tracking-tight transition-all duration-300 ease-out cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-bold px-3.5 xl:px-4.5 py-1.5 lg:py-2 rounded-full shadow-lg shadow-[var(--theme-primary)]/30"
                : "text-indigo-200/80 hover:text-white hover:bg-white/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-full font-semibold hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]"
            }`}
          >
            {item.name}
          </Link>
        );

      case 4: // Minimal Centered (Symmetrical micro-dot indicator)
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex items-center uppercase tracking-wider text-[10px] lg:text-[11px] xl:text-xs px-2.5 lg:px-3.5 py-1.5 lg:py-2 transition-all duration-300 ease-out cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? "text-black font-bold relative after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-[var(--theme-primary)] after:rounded-full"
                : "text-gray-400 hover:text-[var(--theme-primary)] font-medium"
            }`}
          >
            {item.name}
          </Link>
        );

      case 5: // Festive Accent Band (Contrast white pill on theme primary)
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex items-center text-xs lg:text-sm tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? "bg-white text-gray-900 font-black shadow-md rounded-xl px-3.5 xl:px-4 py-1.5 lg:py-2 scale-100"
                : "text-[var(--theme-primary-ink)]/75 hover:text-[var(--theme-primary-ink)] hover:bg-black/10 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold"
            }`}
          >
            {item.name}
          </Link>
        );

      case 6: // Split Statement (Jet black modern squircle)
      default:
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={handleClick}
            className={`relative flex items-center text-xs lg:text-sm tracking-tight transition-all duration-200 ease-out cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-lg shadow-[var(--theme-primary)]/20 px-3.5 xl:px-4 py-1.5 lg:py-2 rounded-2xl scale-100"
                : "text-gray-600 hover:text-[var(--theme-primary)] hover:bg-gray-100/90 px-3 xl:px-3.5 py-1.5 lg:py-2 rounded-2xl font-black hover:scale-105 active:scale-95"
            }`}
          >
            {item.name}
          </Link>
        );
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 w-full z-40 font-sans transition-all duration-500"
      >
        <div id="announcement">
          <AnnouncementBar />
        </div>
        <nav
          className={`relative z-20 w-full transition-all duration-500 ${getNavContainerClass()}`}
        >
          <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="flex items-center justify-between min-h-[46px] sm:min-h-[52px] lg:min-h-[58px]">
              {/* LEFT: Logo & Mobile Menu */}
              <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 flex-shrink-0 my-auto lg:mr-8 xl:mr-12">
                <button
                  type="button"
                  className={`lg:hidden p-2.5 rounded-xl transition-all duration-300 group my-auto cursor-pointer ${getHamburgerClass()}`}
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>

                {/* Main Logo Brand */}
                <Link
                  to="/"
                  className="flex-shrink-0 flex items-center my-auto group cursor-pointer transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div
                    className={`inline-flex items-center justify-center transition-all duration-300 ${
                      isDark || isThemeBand
                        ? "bg-white rounded-2xl p-1.5 sm:p-2 shadow-sm ring-1 ring-black/5"
                        : ""
                    }`}
                  >
                    <img
                      src={logoSrc}
                      alt={branding.companyName || "Logo"}
                      className="h-9 sm:h-10 md:h-11 lg:h-12 w-auto max-w-[160px] sm:max-w-[180px] md:max-w-[220px] lg:max-w-[260px] object-contain transition-all duration-300 my-auto group-hover:scale-102"
                    />
                  </div>
                  {(branding.showCompanyName || branding.showCompanyTagline) && (
                    <div className="hidden sm:flex items-center pl-1.5">
                      <div
                        className={`h-7 sm:h-8 lg:h-9 w-[1.5px] mx-2.5 sm:mx-3 transition-colors duration-300 shrink-0 ${
                          isDark
                            ? "bg-white/20"
                            : isThemeBand
                            ? "bg-white/25"
                            : "bg-slate-300/80"
                        }`}
                      />
                      <div className="flex flex-col justify-center text-left min-w-0">
                        {branding.showCompanyName && branding.companyName && (
                          <span
                            className={`text-xs sm:text-sm lg:text-[15px] font-extrabold tracking-wider uppercase leading-none transition-colors duration-300 truncate ${getBrandTitleClass()}`}
                          >
                            {branding.companyName}
                          </span>
                        )}
                        {branding.showCompanyTagline && branding.companyTagline && (
                          <span
                            className={`text-[9px] sm:text-[10px] lg:text-[11px] tracking-widest uppercase font-semibold leading-tight mt-1 transition-colors duration-300 truncate ${getBrandTaglineClass()}`}
                          >
                            {branding.companyTagline}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              </div>

              {/* CENTER: Desktop Navigation Links */}
              <div className="hidden lg:flex items-center gap-1.5 xl:gap-3">
                {navigation.map((item) => renderDesktopNavLink(item))}
              </div>

              {/* RIGHT: Search, Actions & Auth */}
              <div className="flex items-center gap-2 sm:gap-3 xl:gap-4 flex-shrink-0">
                {/* Global Search Bar */}
                <div ref={searchRef} className="relative hidden md:block">
                  <div className="relative flex items-center">
                    <MagnifyingGlassIcon
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 pointer-events-none transition-colors duration-300 ${
                        isDark ? "text-white/60" : isThemeBand ? "text-[var(--theme-primary-ink)]/70" : "text-gray-400"
                      }`}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Search products & categories..."
                      className={getSearchInputClass()}
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className={`animate-spin h-3.5 w-3.5 ${
                            isDark ? "text-white" : isThemeBand ? "text-[var(--theme-primary-ink)]" : "text-gray-500"
                          }`}
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
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                      </div>
                    )}
                    {searchQuery && !searchLoading && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery("");
                          setSearchResults(null);
                        }}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors cursor-pointer ${
                          isDark
                            ? "hover:bg-white/10 text-zinc-300"
                            : "hover:bg-black/5 text-gray-500"
                        }`}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchFocused && searchQuery.trim().length >= 2 && (
                    <div
                      className={`absolute top-full right-0 mt-2.5 w-80 xl:w-96 rounded-2xl shadow-2xl z-50 max-h-[420px] overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-in fade-in zoom-in-95 duration-200 ${
                        isDark
                          ? "bg-zinc-900/98 backdrop-blur-2xl border border-zinc-800 text-white shadow-black/80"
                          : "bg-white/98 backdrop-blur-2xl border border-gray-200/90 text-gray-900 shadow-black/15"
                      }`}
                    >
                      {searchLoading && (
                        <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
                          <svg
                            className="animate-spin h-4 w-4"
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
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                          Searching...
                        </div>
                      )}
                      {!searchLoading && searchResults && (
                        <>
                          {searchResults.categories.length > 0 && (
                            <div className="mb-1">
                              <div
                                className={`px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest font-bold ${
                                  isDark ? "text-zinc-400" : "text-gray-400"
                                }`}
                              >
                                Categories
                              </div>
                              {searchResults.categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onMouseDown={() =>
                                    handleCategoryClick(cat.id)
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group/item cursor-pointer ${
                                    isDark
                                      ? "hover:bg-white/10 text-zinc-100"
                                      : "hover:bg-slate-100/90 text-gray-900"
                                  }`}
                                >
                                  <div
                                    className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ${
                                      isDark ? "bg-zinc-800" : "bg-slate-100"
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
                                      <div className="w-full h-full flex items-center justify-center">
                                        <CubeIcon className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate">
                                      {cat.name}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        isDark
                                          ? "text-zinc-400"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      Browse all {cat.name}
                                    </div>
                                  </div>
                                  <svg
                                    className="h-4 w-4 text-gray-400 group-hover/item:translate-x-0.5 transition-transform flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.products.length > 0 && (
                            <div>
                              <div
                                className={`px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest font-bold ${
                                  isDark ? "text-zinc-400" : "text-gray-400"
                                }`}
                              >
                                Products
                              </div>
                              {searchResults.products.map((prod) => (
                                <button
                                  key={prod.id}
                                  onMouseDown={() =>
                                    handleProductClick(prod.id)
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group/item cursor-pointer ${
                                    isDark
                                      ? "hover:bg-white/10 text-zinc-100"
                                      : "hover:bg-slate-100/90 text-gray-900"
                                  }`}
                                >
                                  <div
                                    className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ${
                                      isDark ? "bg-zinc-800" : "bg-slate-100"
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
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingBagIcon className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate">
                                      {prod.name}
                                    </div>
                                    <div
                                      className={`text-xs truncate ${
                                        isDark
                                          ? "text-zinc-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {prod.category?.name} · ₹
                                      {prod.price?.toLocaleString()}
                                    </div>
                                  </div>
                                  <svg
                                    className="h-4 w-4 text-gray-400 group-hover/item:translate-x-0.5 transition-transform flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.categories.length === 0 &&
                            searchResults.products.length === 0 && (
                              <div className="py-10 text-center">
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                <p
                                  className={`text-sm ${
                                    isDark ? "text-zinc-300" : "text-gray-500"
                                  }`}
                                >
                                  No results for{" "}
                                  <span
                                    className={`font-medium ${
                                      isDark ? "text-white" : "text-black"
                                    }`}
                                  >
                                    "{searchQuery}"
                                  </span>
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                  Try a different keyword
                                </p>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Icons & Auth */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                  {/* Action Icons — visible only when logged in */}
                  {isAuthenticated && (
                    <>
                      {/* Wishlist Icon */}
                      <button
                        onClick={handleWishlistClick}
                        className={getActionButtonClass()}
                        aria-label="Wishlist"
                      >
                        {isActive("/WishlistPage") || isActive("/wishlist") ? (
                          <HeartSolid
                            className={`h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors ${
                              isDark
                                ? "text-[var(--theme-primary)]"
                                : isThemeBand
                                ? "text-white"
                                : "text-[var(--theme-primary)]"
                            }`}
                          />
                        ) : (
                          <HeartOutline className="h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors" />
                        )}
                        {showWishlistBadge && (
                          <span
                            className={`absolute -top-1 -right-1 z-10 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-xs pointer-events-none ${
                              isThemeBand
                                ? "bg-white text-gray-900 shadow-md"
                                : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-[var(--theme-primary)]/30"
                            }`}
                          >
                            {wishlistCount}
                          </span>
                        )}
                      </button>

                      {/* Cart Icon */}
                      <Link
                        to="/cart"
                        onClick={(e) => {
                          if (!isAuthenticated) {
                            e.preventDefault();
                            toast.error("Please login to continue", {
                              id: "Navbar login to continue",
                            });
                            return;
                          }
                          handleCartClick();
                        }}
                        className={getActionButtonClass()}
                        aria-label="Cart"
                      >
                        {isActive("/cart") ? (
                          <ShoppingBagSolid
                            className={`h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors ${
                              isDark
                                ? "text-[var(--theme-primary)]"
                                : isThemeBand
                                ? "text-white"
                                : "text-[var(--theme-primary)]"
                            }`}
                          />
                        ) : (
                          <ShoppingBagIcon className="h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors" />
                        )}
                        {showCartBadge && (
                          <span
                            className={`absolute -top-1 -right-1 z-10 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-bounce shadow-xs pointer-events-none ${
                              isThemeBand
                                ? "bg-white text-gray-900 shadow-md"
                                : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] shadow-[var(--theme-primary)]/30"
                            }`}
                          >
                            {cartItemCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}

                  {/* Bell notification */}
                  {isAuthenticated && (
                    <div ref={notifRef} className="relative flex items-center">
                      {isAdmin ? (
                        <button
                          onClick={() =>
                            navigate(`${adminDashboardPath}/notifications`)
                          }
                          className={getActionButtonClass()}
                          aria-label="Notifications"
                        >
                          <BellIcon className="h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors" />
                          {unreadCount > 0 && (
                            <span
                              className={`absolute -top-1 -right-1 z-10 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse shadow-xs pointer-events-none ${
                                isThemeBand
                                  ? "bg-white text-gray-900 font-black"
                                  : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-[var(--theme-primary)]/30"
                              }`}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setNotifOpen((o) => !o)}
                            className={getActionButtonClass()}
                            aria-label="Notifications"
                          >
                            {notifOpen ? (
                              <BellSolid className="h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors" />
                            ) : (
                              <BellIcon className="h-5 w-5 lg:h-5.5 lg:w-5.5 transition-colors" />
                            )}
                            {unreadCount > 0 && (
                              <span
                                className={`absolute -top-1 -right-1 z-10 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse shadow-xs pointer-events-none ${
                                  isThemeBand
                                    ? "bg-white text-gray-900 font-black"
                                    : "bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] font-black shadow-[var(--theme-primary)]/30"
                                }`}
                              >
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </button>

                          {/* Dropdown panel */}
                          {notifOpen && (
                            <div
                              className={`absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                                isDark
                                  ? "bg-zinc-900/98 backdrop-blur-2xl border border-zinc-800 text-white shadow-black/80"
                                  : "bg-white/98 backdrop-blur-2xl border border-gray-200/90 text-gray-900 shadow-black/15"
                              }`}
                            >
                              <div
                                className={`flex items-center justify-between px-4 py-3 border-b ${
                                  isDark
                                    ? "border-zinc-800"
                                    : "border-gray-100"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-sm">
                                    Notifications
                                  </h3>
                                  {unreadCount > 0 && (
                                    <span className="text-xs bg-rose-500/10 text-rose-500 rounded-full px-2.5 py-0.5 font-semibold border border-rose-500/10">
                                      {unreadCount} new
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                  {unreadCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAllUserRead();
                                      }}
                                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
                                    >
                                      Mark all read
                                    </button>
                                  )}
                                  {userNotifications.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearAllUserNotifications();
                                      }}
                                      className="text-xs text-gray-400 hover:text-rose-500 hover:underline cursor-pointer transition-colors"
                                    >
                                      Clear all
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`max-h-80 overflow-y-auto divide-y ${
                                  isDark
                                    ? "divide-zinc-800/80"
                                    : "divide-gray-100"
                                }`}
                              >
                                {userNotifications.length === 0 ? (
                                  <p className="text-center text-sm text-gray-400 py-10">
                                    No notifications yet
                                  </p>
                                ) : (
                                  userNotifications.map((n) => {
                                      const id = n.id ?? n._id;
                                      return (
                                        <div
                                          key={id}
                                          className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-2 group cursor-pointer ${
                                            !n.isRead
                                              ? isDark
                                                ? "bg-white/5 hover:bg-white/10"
                                                : "bg-slate-50 hover:bg-slate-100"
                                              : isDark
                                              ? "hover:bg-white/5"
                                              : "hover:bg-slate-50"
                                          }`}
                                          onClick={() => {
                                            if (!n.isRead && id)
                                              markAsRead(id);
                                            setNotifOpen(false);
                                            navigate(
                                              getCustomerNotificationTarget(n)
                                            );
                                          }}
                                        >
                                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            {!n.isRead && (
                                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                                            )}
                                            <div
                                              className={
                                                n.isRead ? "pl-4" : ""
                                              }
                                            >
                                              <p
                                                className={`text-sm leading-snug line-clamp-2 ${
                                                  !n.isRead
                                                    ? "font-semibold"
                                                    : isDark
                                                    ? "text-zinc-400"
                                                    : "text-gray-600"
                                                }`}
                                              >
                                                {n.message}
                                              </p>
                                              {n.createdAt && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                  {new Date(
                                                    n.createdAt
                                                  ).toLocaleString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  })}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {id && (
                                            <button
                                              type="button"
                                              title="Delete notification"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteUserNotification(id);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 rounded transition-all shrink-0 cursor-pointer"
                                            >
                                              <XMarkIcon className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })
                                )}
                              </div>

                              {userNotifications.length > 0 && (
                                <div
                                  className={`border-t px-4 py-2.5 ${
                                    isDark
                                      ? "border-zinc-800 bg-zinc-950/40"
                                      : "border-gray-100 bg-gray-50/50"
                                  }`}
                                >
                                  <Link
                                    to="/myorders"
                                    onClick={() => setNotifOpen(false)}
                                    className={`text-xs transition-colors font-medium ${
                                      isDark
                                        ? "text-white hover:underline"
                                        : "text-gray-700 hover:text-black"
                                    }`}
                                  >
                                    View My Orders →
                                  </Link>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Auth Section */}
                  {!isAuthenticated ? (
                    <div className="hidden md:flex items-center gap-3 ml-2">
                      <button
                        onClick={() => setCustomerAuthOpen(true)}
                        className={getSignInButtonClass()}
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={handleUserIconClick}
                        className={`hidden md:flex items-center gap-2 ml-1 lg:ml-2 border transition-all duration-300 group cursor-pointer ${getAccountButtonClass()}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            isDark
                              ? "bg-white/20 text-white"
                              : isThemeBand
                              ? "bg-white text-gray-900"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold tracking-tight hidden lg:inline">
                          {isAdmin ? "Admin" : "Account"}
                        </span>
                        <ChevronDownIcon
                          className={`h-3.5 w-3.5 transition-transform duration-300 ${
                            isUserDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* User Dropdown */}
                      {isUserDropdownOpen && (
                        <div
                          className={`absolute top-full right-0 mt-2.5 w-56 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 ${
                            isDark
                              ? "bg-zinc-900/98 backdrop-blur-2xl border border-zinc-800 text-white shadow-black/70"
                              : "bg-white/98 backdrop-blur-2xl border border-gray-200/90 text-gray-900 shadow-black/15"
                          }`}
                        >
                          <div
                            className={`px-3 py-2 mb-1 rounded-xl border ${
                              isDark
                                ? "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
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
                          <Link
                            to="/profile"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                              isDark
                                ? "text-zinc-200 hover:text-white hover:bg-white/10"
                                : "text-gray-700 hover:text-black hover:bg-slate-100"
                            }`}
                          >
                            <UserIcon className="h-4 w-4 opacity-70" />
                            My Profile
                          </Link>
                          <div
                            className={`border-t my-1 ${
                              isDark ? "border-zinc-800" : "border-slate-100"
                            }`}
                          />
                          <button
                            onClick={() => {
                              if (handleLogout) {
                                handleLogout();
                              } else {
                                logout();
                              }
                              setIsUserDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* MOBILE MENU DRAWER */}
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="relative z-[100] lg:hidden"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 z-[100]" />
          <div className="fixed inset-0 z-[100] flex">
            <DialogPanel
              className={`relative mr-auto flex h-full w-[300px] max-w-[85vw] flex-col overflow-y-auto backdrop-blur-2xl shadow-2xl transition-transform duration-300 border-r ${
                isDark
                  ? "bg-zinc-950/98 border-zinc-800 text-white"
                  : "bg-white/98 border-gray-200 text-gray-900"
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
                            <div className="pl-6 pr-2 py-1 space-y-1 mt-1 border-l-2 border-gray-200 dark:border-zinc-800 ml-5">
                              {topLevelCategories.map((top) => (
                                <Link
                                  key={top.id}
                                  to={`/categories/${top.id}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-[var(--theme-primary)] hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-colors"
                                >
                                  <span>{top.name}</span>
                                  <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                                </Link>
                              ))}
                              <Link
                                to="/products"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-bold text-[var(--theme-primary)] hover:underline transition-colors"
                              >
                                <span>All Products</span>
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
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-center gap-2 w-full text-center py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isDark
                          ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      }`}
                    >
                      <UserIcon
                        className={`h-4 w-4 ${
                          isDark ? "text-zinc-300" : "text-gray-600"
                        }`}
                      />
                      My Profile
                    </Link>
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