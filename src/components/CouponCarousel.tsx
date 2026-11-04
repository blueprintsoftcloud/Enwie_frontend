import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { Copy, Check, ChevronLeft, ChevronRight, Sparkles, Clock, Tag } from "lucide-react";

export interface PublicCoupon {
  id: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrderAmount?: number;
  expiresAt?: string | null;
  colorTheme?: string | null;
}

interface CouponCarouselProps {
  /** Optional callback if used at checkout or cart to apply the coupon directly */
  onApplyCoupon?: (code: string) => void;
  /** Custom container className */
  className?: string;
  /** Minimal variant for checkout or drawers */
  variant?: "storefront" | "compact";
}

// Vibrant, luminous, professional color themes for each coupon
interface ThemeConfig {
  id: string;
  name: string;
  cardBg: string;
  cardBorder: string;
  glow1: string;
  glow2: string;
  pillBg: string;
  sparkle: string;
  perforation: string;
  codeBox: string;
  copyBtn: string;
  copyBtnText: string;
  dotActive: string;
  // Compact styling
  compactBg: string;
  compactBorder: string;
  compactText: string;
  compactBadge: string;
  compactBtn: string;
}

const THEMES: Record<string, ThemeConfig> = {
  rose: {
    id: "rose",
    name: "Rose Luxury",
    cardBg: "from-rose-500 via-pink-500 to-rose-600",
    cardBorder: "border-pink-300/40",
    glow1: "bg-pink-300/25",
    glow2: "bg-rose-300/25",
    pillBg: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    sparkle: "text-amber-200",
    perforation: "border-white/40",
    codeBox: "bg-black/15 border-white/30 text-white",
    copyBtn: "bg-white hover:bg-rose-50 active:scale-95 shadow-lg",
    copyBtnText: "text-rose-700",
    dotActive: "bg-rose-500",
    compactBg: "from-rose-50 via-pink-50 to-orange-50",
    compactBorder: "border-rose-200/80",
    compactText: "text-rose-900",
    compactBadge: "bg-rose-200/70 text-rose-800 border-rose-300",
    compactBtn: "bg-rose-600 hover:bg-rose-700",
  },
  indigo: {
    id: "indigo",
    name: "Royal Violet",
    cardBg: "from-indigo-600 via-purple-600 to-indigo-700",
    cardBorder: "border-purple-300/40",
    glow1: "bg-purple-300/25",
    glow2: "bg-indigo-300/25",
    pillBg: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    sparkle: "text-amber-300",
    perforation: "border-white/40",
    codeBox: "bg-black/15 border-white/30 text-white",
    copyBtn: "bg-white hover:bg-purple-50 active:scale-95 shadow-lg",
    copyBtnText: "text-purple-700",
    dotActive: "bg-purple-600",
    compactBg: "from-purple-50 via-indigo-50 to-pink-50",
    compactBorder: "border-purple-200/80",
    compactText: "text-purple-900",
    compactBadge: "bg-purple-200/70 text-purple-800 border-purple-300",
    compactBtn: "bg-purple-600 hover:bg-purple-700",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Mint",
    cardBg: "from-emerald-600 via-teal-600 to-emerald-700",
    cardBorder: "border-teal-300/40",
    glow1: "bg-teal-300/25",
    glow2: "bg-emerald-300/25",
    pillBg: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    sparkle: "text-amber-200",
    perforation: "border-white/40",
    codeBox: "bg-black/15 border-white/30 text-white",
    copyBtn: "bg-white hover:bg-emerald-50 active:scale-95 shadow-lg",
    copyBtnText: "text-emerald-800",
    dotActive: "bg-emerald-600",
    compactBg: "from-emerald-50 via-teal-50 to-green-50",
    compactBorder: "border-emerald-200/80",
    compactText: "text-emerald-900",
    compactBadge: "bg-emerald-200/70 text-emerald-800 border-emerald-300",
    compactBtn: "bg-emerald-600 hover:bg-emerald-700",
  },
  sapphire: {
    id: "sapphire",
    name: "Ocean Sapphire",
    cardBg: "from-blue-600 via-cyan-600 to-blue-700",
    cardBorder: "border-cyan-300/40",
    glow1: "bg-cyan-300/25",
    glow2: "bg-blue-300/25",
    pillBg: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    sparkle: "text-amber-200",
    perforation: "border-white/40",
    codeBox: "bg-black/15 border-white/30 text-white",
    copyBtn: "bg-white hover:bg-blue-50 active:scale-95 shadow-lg",
    copyBtnText: "text-blue-800",
    dotActive: "bg-blue-600",
    compactBg: "from-sky-50 via-cyan-50 to-blue-50",
    compactBorder: "border-cyan-200/80",
    compactText: "text-cyan-900",
    compactBadge: "bg-cyan-200/70 text-cyan-800 border-cyan-300",
    compactBtn: "bg-sky-600 hover:bg-sky-700",
  },
  amber: {
    id: "amber",
    name: "Sunset Coral",
    cardBg: "from-amber-500 via-orange-500 to-amber-600",
    cardBorder: "border-amber-300/40",
    glow1: "bg-amber-300/25",
    glow2: "bg-orange-300/25",
    pillBg: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
    sparkle: "text-yellow-200",
    perforation: "border-white/40",
    codeBox: "bg-black/15 border-white/30 text-white",
    copyBtn: "bg-white hover:bg-orange-50 active:scale-95 shadow-lg",
    copyBtnText: "text-orange-800",
    dotActive: "bg-orange-600",
    compactBg: "from-amber-50 via-orange-50 to-yellow-50",
    compactBorder: "border-amber-200/80",
    compactText: "text-amber-900",
    compactBadge: "bg-amber-200/70 text-amber-800 border-amber-300",
    compactBtn: "bg-amber-600 hover:bg-amber-700",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Gold",
    cardBg: "from-slate-900 via-slate-800 to-slate-900",
    cardBorder: "border-amber-400/40",
    glow1: "bg-amber-400/20",
    glow2: "bg-yellow-400/15",
    pillBg: "bg-amber-400/20 text-amber-300 border-amber-400/40",
    sparkle: "text-amber-300",
    perforation: "border-amber-400/40",
    codeBox: "bg-black/40 border-amber-400/30 text-amber-300",
    copyBtn: "bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-105 active:scale-95 shadow-lg",
    copyBtnText: "text-slate-950 font-black",
    dotActive: "bg-amber-500",
    compactBg: "from-slate-100 via-amber-50 to-slate-50",
    compactBorder: "border-amber-300/80",
    compactText: "text-slate-900",
    compactBadge: "bg-amber-200/80 text-amber-900 border-amber-300",
    compactBtn: "bg-amber-500 hover:bg-amber-600",
  },
};

const THEME_KEYS = Object.keys(THEMES);

function getCouponTheme(coupon: PublicCoupon, index: number): ThemeConfig {
  if (coupon.colorTheme && THEMES[coupon.colorTheme]) {
    return THEMES[coupon.colorTheme];
  }
  const key = THEME_KEYS[index % THEME_KEYS.length];
  return THEMES[key];
}

export default function CouponCarousel({
  onApplyCoupon,
  className = "",
  variant = "storefront",
}: CouponCarouselProps) {
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPublicCoupons = async () => {
      try {
        const res = await api.get("/coupon/public");
        if (isMounted) {
          setCoupons(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Failed to load public coupons:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPublicCoupons();
    return () => {
      isMounted = false;
    };
  }, []);

  const nextSlide = useCallback(() => {
    if (coupons.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % coupons.length);
  }, [coupons.length]);

  const prevSlide = useCallback(() => {
    if (coupons.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + coupons.length) % coupons.length);
  }, [coupons.length]);

  // Auto-advance every 5 seconds if not hovered and multiple coupons exist
  useEffect(() => {
    if (coupons.length <= 1 || isHovered) return;
    timerRef.current = setInterval(nextSlide, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [coupons.length, isHovered, nextSlide]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon "${code}" copied to clipboard!`, {
      id: `copy-${code}`,
      icon: "🎉",
    });
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2500);

    if (onApplyCoupon) {
      onApplyCoupon(code);
    }
  };

  const formatExpiry = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return null;
    }
  };

  // If no public coupons exist, render nothing
  if (loading || coupons.length === 0) {
    return null;
  }

  // Active coupon and its specific theme
  const current = coupons[currentIndex] || coupons[0];
  const theme = getCouponTheme(current, currentIndex);
  const isMultiple = coupons.length > 1;

  // COMPACT VARIANT (for Checkout & Cart Drawer)
  if (variant === "compact") {
    return (
      <div className={`w-full space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
            
            Available Offers ({coupons.length})
          </p>
          {isMultiple && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
                aria-label="Previous offer"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                {currentIndex + 1}/{coupons.length}
              </span>
              <button
                type="button"
                onClick={nextSlide}
                className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
                aria-label="Next offer"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Compact Voucher Ticket with current coupon theme */}
        <div
          className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${theme.compactBg} border ${theme.compactBorder} p-3 shadow-2xs transition-all duration-300`}
        >
          {/* Perforated ticket cutout circles */}
          <div className="absolute top-1/2 -left-2 w-4 h-4 -translate-y-1/2 rounded-full bg-white border-r border-gray-300" />
          <div className="absolute top-1/2 -right-2 w-4 h-4 -translate-y-1/2 rounded-full bg-white border-l border-gray-300" />

          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-extrabold text-sm ${theme.compactText} tracking-tight`}>
                  {current.discountType === "PERCENTAGE"
                    ? `${current.discountValue}% OFF`
                    : `₹${current.discountValue} OFF`}
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${theme.compactBadge}`}>
                  {current.code}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 truncate mt-0.5">
                {current.minOrderAmount && current.minOrderAmount > 0
                  ? `Min. order ₹${current.minOrderAmount}`
                  : "No minimum purchase"}
                {current.expiresAt && ` • Till ${formatExpiry(current.expiresAt)}`}
              </p>
            </div>

            {onApplyCoupon && (
              <button
                type="button"
                onClick={() => onApplyCoupon(current.code)}
                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${theme.compactBtn} active:scale-95 text-white text-xs font-bold transition shadow-xs`}
              >
                <span>Apply</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STOREFRONT PROMOTIONAL VOUCHER BANNER
  // Sized substantially with bold typography & vibrant gradient inspired by reference design
  return (
    <section
      className={`w-full py-4 sm:py-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Promotional Vouchers"
    >
      {/* Voucher Container */}
      <div className="relative w-full">
        {/* Center: Grand Voucher Card */}
        <div
          className="relative w-full"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (diff > 45) nextSlide();
            else if (diff < -45) prevSlide();
          }}
        >
          {/* Card with Smooth Rounded Corners & Luxurious Gradient */}
          <div
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.cardBg} text-white shadow-xl sm:shadow-2xl border ${theme.cardBorder} transition-all duration-500`}
          >
            {/* Ambient Lighting & Decorative Watermark Rings */}
            <div
              className={`absolute -top-32 -right-32 w-80 h-80 ${theme.glow1} rounded-full blur-3xl pointer-events-none`}
            />
            <div
              className={`absolute -bottom-32 -left-32 w-80 h-80 ${theme.glow2} rounded-full blur-3xl pointer-events-none`}
            />
            {/* Subtle decorative concentric rings background */}
            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full pointer-events-none" />
            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-96 h-96 border border-white/5 rounded-full pointer-events-none" />

            {/* Voucher Card Body: Substantial height & balanced layout */}
            <div className="relative flex flex-col md:flex-row items-stretch justify-between min-h-[125px] sm:min-h-[145px] lg:min-h-[160px]">
              {/* Left / Main Section: Big Bold Discount & Headline */}
              <div className="flex-1 min-w-0 flex flex-col justify-center px-6 py-4 sm:px-8 sm:py-5 lg:px-10 lg:py-6 pl-6 sm:pl-10">
                {/* Top Offer Badge & Countdown Info */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1 sm:mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider ${theme.pillBg}`}
                  >
                    
                    
                    Limited Offer
                  </span>
                  {current.expiresAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-white/80 font-medium">
                      <Clock className="w-3 h-3 text-white/80" />
                      Valid till {formatExpiry(current.expiresAt)}
                    </span>
                  )}
                </div>

                {/* Massive Bold Headline (Inspired by reference FLAT 10% OFF) */}
                <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white tracking-tight uppercase leading-none drop-shadow-sm">
                  {current.discountType === "PERCENTAGE"
                    ? `FLAT ${current.discountValue}% OFF`
                    : `FLAT ₹${current.discountValue} OFF`}
                </h2>

                {/* Subtitle / Description & Order Terms */}
                <p className="text-xs sm:text-base lg:text-lg font-bold text-white/95 mt-1 sm:mt-1.5 truncate drop-shadow-xs">
                  {current.description || "On Bestsellers & Featured Products"}
                </p>

                <p className="text-[11px] sm:text-xs text-white/75 font-medium mt-0.5 truncate">
                  {current.minOrderAmount && current.minOrderAmount > 0
                    ? `On all orders above ₹${current.minOrderAmount} • Apply code at checkout`
                    : "No minimum purchase required • Apply code at checkout"}
                </p>
              </div>

              {/* Vertical Perforation Divider with Top & Bottom Cutout Notches */}
              <div className="relative hidden md:flex flex-col items-center justify-between w-0 shrink-0 z-10">
                {/* Top Notch */}
                <div className="w-6 h-6 rounded-full bg-white -mt-3 border-b border-slate-200/90 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)]" />
                {/* Dashed vertical line */}
                <div className={`w-px h-full border-r-2 border-dashed ${theme.perforation} my-1`} />
                {/* Bottom Notch */}
                <div className="w-6 h-6 rounded-full bg-white -mb-3 border-t border-slate-200/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)]" />
              </div>

              {/* Mobile Horizontal Divider */}
              <div className="relative md:hidden flex items-center justify-between w-full h-0 shrink-0 px-4">
                <div className="w-4 h-4 rounded-full bg-white -ml-2 border-r border-slate-200/90 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.12)]" />
                <div className={`flex-1 border-t-2 border-dashed ${theme.perforation} mx-1`} />
                <div className="w-4 h-4 rounded-full bg-white -mr-2 border-l border-slate-200/90 shadow-[inset_2px_0_4px_rgba(0,0,0,0.12)]" />
              </div>

              {/* Right / Stub Section: Clean Coupon Code Presentation */}
              <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-6 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-6 pr-6 sm:pr-10 bg-black/10 md:bg-transparent min-w-[170px] sm:min-w-[210px]">
                <span className="block text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-widest text-center">
                  Use Code
                </span>
                <span className={`inline-block font-mono text-base sm:text-2xl font-black tracking-widest select-all px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl ${theme.codeBox} mt-0.5 shadow-sm text-center`}>
                  {current.code}
                </span>
                {current.expiresAt && (
                  <span className="text-[11px] font-semibold text-white/80 tracking-wide text-center mt-1">
                    Valid till {formatExpiry(current.expiresAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dot Pagination Indicators */}
      {isMultiple && (
        <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
          {coupons.map((c, idx) => {
            const dotTheme = getCouponTheme(c, idx);
            return (
              <button
                key={c.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? `w-8 ${dotTheme.dotActive}`
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
