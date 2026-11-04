import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../utils/api";
import { CircularSpinner } from "./Loader";


// Fallback images (same pool as the original hero)
import image1 from "../assets/1000.jpeg";
import image2 from "../assets/1001.jpeg";
import image3 from "../assets/1002.jpeg";
import image4 from "../assets/1003.jpeg";
import image5 from "../assets/1004.jpeg";
import image6 from "../assets/1005.jpeg";
import image7 from "../assets/1006.jpeg";
import image8 from "../assets/1007.jpeg";
import image9 from "../assets/1008.jpeg";
import bg1 from "../assets/White and Teal Corporate Job Offer Letter A4.png"

const FALLBACK_IMAGES = [
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
  image7,
  image8,
  image9,
];

interface HeroTemplateData {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
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

const DEFAULT_CONFIG: HeroConfig = {
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
      title: "Curious What Else I've Created?",
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
      title: "",
      subtitle: "",
      ctaText: "",
      ctaLink: "",
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

// ─── Template 1: Editorial Split ──────────────────────────────────────────────
// Text left, asymmetric image grid right — modernised original

function Template1({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const gridImages = (() => {
    if (data.images && data.images.length > 0) {
      const filled = [...data.images, ...FALLBACK_IMAGES];
      return filled.filter(Boolean).slice(0, 9);
    }
    return FALLBACK_IMAGES.slice(0, 9);
  })();

  return (
    <div 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative overflow-hidden w-full bg-white"
    >
      {/* --- ADDED FULL SECTION BACKGROUND IMAGE HERE --- */}
      {/* <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(${data.images?.[0] || FALLBACK_IMAGES[0]})` }}
      /> */}
      
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-gray-100 via-transparent to-transparent opacity-70 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        {/* Vertically centers everything on desktop screens */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full lg:w-1/2 text-center lg:text-left z-20 mb-12 lg:mb-0"
          >
            {/* Changed font weight to font-black and bumped the size scale up */}
            {Boolean(data.title && data.title.trim()) && (
              <h1 className="text-3xl sm:text-6xl lg:text-5xl font-bold font-sans text-black spacing pb-3 uppercase">
                {data.title}
              </h1>
            )}
            {/* Enhanced body text size and font weight for visibility against the heavy heading */}
            {Boolean(data.subtitle && data.subtitle.trim()) && (
              <p className="mt-2 text-xs sm:text-lg font-semibold text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-serif line-clamp-2 sm:line-clamp-none">
                {data.subtitle}
              </p>
            )}
            {Boolean(data.ctaText && data.ctaText.trim()) && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(data.ctaLink || "/products")}
                className="mt-10 inline-flex items-center gap-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] px-8 py-4 rounded-xl text-base font-bold tracking-wide hover:opacity-90 transition-opacity shadow-lg"
              >
                {data.ctaText}
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </motion.button>
            )}
          </motion.div>

          {/* Right: Masonry image grid — 2 | 3 | 2 column layout */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full lg:w-1/2 relative"
          >
            <div className="flex gap-2 sm:gap-3">
              {/* Left column — 2 images */}
              <div className="flex flex-col gap-2 sm:gap-3 flex-1">
                {[gridImages[0], gridImages[1]].map((src, i) => (
                  <motion.div
                    key={i}
                    whileHover={{
                      scale: 1.03,
                      zIndex: 10,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden rounded-2xl"
                    style={{ aspectRatio: i === 0 ? "3/4" : "2/3" }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Center column — 3 images */}
              <div className="flex flex-col gap-2 sm:gap-3 flex-1">
                {[gridImages[2], gridImages[3], gridImages[4]].map((src, i) => (
                  <motion.div
                    key={i}
                    whileHover={{
                      scale: 1.03,
                      zIndex: 10,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden rounded-2xl"
                    style={{ aspectRatio: i === 1 ? "1/1" : "3/4" }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Right column — 2 images */}
              <div className="flex flex-col gap-2 sm:gap-3 flex-1">
                {[gridImages[5], gridImages[6]].map((src, i) => (
                  <motion.div
                    key={i}
                    whileHover={{
                      scale: 1.03,
                      zIndex: 10,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden rounded-2xl"
                    style={{ aspectRatio: i === 0 ? "2/3" : "3/4" }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}



// ─── Template 2: Cinematic Full-width ─────────────────────────────────────────
// Full-width immersive cinematic hero with gradient lighting, glassmorphic typography, and smooth entrance
const TEMPLATE2_FALLBACK_BG =
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=2000";

function Template2({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const bgSrc = data.bgImage || TEMPLATE2_FALLBACK_BG || image1;

  return (
    <div
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        height: "calc(100dvh - var(--app-header-h, 7rem))",
      }}
      className="relative w-full bg-neutral-950 min-h-[560px] max-h-[920px] flex items-center overflow-hidden select-none"
    >
      {/* Cinematic Full-Bleed Background Image with subtle Ken Burns zoom */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.img
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          src={bgSrc}
          alt={data.title || "Hero banner"}
          className="w-full h-full object-cover object-center lg:object-right-center"
        />
        {/* Multi-layer Cinematic Lighting Vignettes */}
        {/* Left-to-Right gradient on larger screens for perfect typography legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/75 sm:via-neutral-950/50 to-neutral-950/20 lg:to-transparent w-full lg:w-3/4" />
        {/* Bottom-to-Top gradient for mobile viewports */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/50 to-transparent sm:hidden" />
        {/* Subtle top header blending shadow */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-neutral-950/70 to-transparent" />
        {/* Subtle bottom edge blend */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-neutral-950/80 to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 w-full py-12 sm:py-16 lg:py-24 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl text-left space-y-4 sm:space-y-6"
        >
          {/* Accent Glassmorphism Badge */}
          {Boolean(data.accentText && data.accentText.trim()) && (
            <div>
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase shadow-lg transition-colors">
                {data.accentText}
              </span>
            </div>
          )}

          {/* Headline */}
          {Boolean(data.title && data.title.trim()) && (
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.06] drop-shadow-2xl">
              {data.title}
            </h1>
          )}

          {/* Subtitle */}
          {Boolean(data.subtitle && data.subtitle.trim()) && (
            <p className="text-white/80 text-sm sm:text-base lg:text-lg font-normal leading-relaxed max-w-xl drop-shadow-md">
              {data.subtitle}
            </p>
          )}

          {/* Action Button Row */}
          {Boolean(data.ctaText && data.ctaText.trim()) && (
            <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(data.ctaLink || "/products")}
                className="inline-flex items-center gap-3 bg-white text-neutral-950 hover:bg-neutral-100 px-7 sm:px-9 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base font-bold tracking-wide shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
              >
                <span>{data.ctaText}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-sm sm:text-base font-semibold transition-all cursor-pointer shadow-lg group"
              >
                <span>View All</span>
                <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Template 3: Dark Minimal Centered ────────────────────────────────────────



function Template3({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const accentImages = (() => {
    if (data.images && data.images.length > 0) {
      const filled = [...data.images, ...FALLBACK_IMAGES];
      return filled.filter(Boolean).slice(0, 4);
    }
    return FALLBACK_IMAGES.slice(0, 4);
  })();

  return (
    <div 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative w-full bg-[#0c0c0c] overflow-hidden"
    >
      {/* Background noise texture */}
      <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />




      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-20 lg:py-32">
        {/* Fully centered stacked layout container */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          
          {/* Text & CTA Block */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center"
          >
            {Boolean(data.accentText && data.accentText.trim()) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase text-[var(--theme-accent)] mb-6"
              >
                <span className="inline-block w-6 h-px bg-[var(--theme-accent)]" />
                {data.accentText}
                <span className="inline-block w-6 h-px bg-[var(--theme-accent)]" />
              </motion.span>
            )}

            {Boolean(data.title && data.title.trim()) && (
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-none tracking-tighter mb-8 max-w-4xl">
                {data.title!.split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 + 0.3 }}
                    className={`inline-block mx-2 ${i % 2 === 1 ? "text-[var(--theme-accent)]" : "text-white"}`}
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>
            )}

            {Boolean(data.subtitle && data.subtitle.trim()) && (
              <p className="text-white/50 text-sm sm:text-lg leading-relaxed mb-10 max-w-xl">
                {data.subtitle}
              </p>
            )}

            {Boolean(data.ctaText && data.ctaText.trim()) && (
              <motion.button
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(data.ctaLink || "/products")}
                className="inline-flex items-center gap-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] px-10 py-4 rounded-full text-base font-bold hover:opacity-95 transition shadow-lg mb-20"
              >
                {data.ctaText}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>

          {/* Perfectly Evenly-Aligned 4-Image Grid Strip */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {accentImages.map((src, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.04, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden rounded-2xl border border-white/10 aspect-square bg-neutral-900 shadow-xl"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// ─── Template 4: Modern Product Spotlight ────────────────────────────────────
// White bg, text left, single product image right with decorative circles + badge
// function Template4({ data }: { data: HeroTemplateData }) {
//   const navigate = useNavigate();
//   const bgSrc = data.bgImage || image1;

//   const titleParts = (() => {
//     if (data.highlightText && data.title.includes(data.highlightText)) {
//       const idx = data.title.indexOf(data.highlightText);
//       return {
//         before: data.title.slice(0, idx),
//         highlight: data.highlightText,
//         after: data.title.slice(idx + data.highlightText.length),
//       };
//     }
//     return { before: data.title, highlight: "", after: "" };
//   })();

//   const badgeParts = data.badgeText ? data.badgeText.split("\n") : [];

//   return (
//     <div className="relative overflow-hidden w-full bg-white mt-16 sm:mt-20 lg:mt-24">
//       <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
//         <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8">
//           {/* Left: Text */}
//           <motion.div
//             initial={{ opacity: 0, x: -40 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.7, ease: "easeOut" }}
//             className="w-full lg:w-1/2 text-center lg:text-left z-20 mb-12 lg:mb-0"
//           >
//             {data.accentText && (
//               <p className="text-sm text-gray-400 tracking-widest uppercase mb-4">
//                 {data.accentText}
//               </p>
//             )}
//             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-gray-900 mb-6">
//               {titleParts.before}
//               {titleParts.highlight && (
//                 <span className="text-rose-500">{titleParts.highlight}</span>
//               )}
//               {titleParts.after}
//             </h1>
//             <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto lg:mx-0 line-clamp-2 sm:line-clamp-none">
//               {data.subtitle}
//             </p>
//             <motion.button
//               whileHover={{ scale: 1.03 }}
//               whileTap={{ scale: 0.97 }}
//               onClick={() => navigate(data.ctaLink || "/products")}
//               className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-8 py-3.5 rounded-full text-base font-semibold transition-colors shadow-lg shadow-rose-200/50"
//             >
//               {data.ctaText || "Shop Now"}
//               <ArrowRight className="w-5 h-5" />
//             </motion.button>
//           </motion.div>

//           {/* Right: Product image with decorative shapes */}
//           <motion.div
//             initial={{ opacity: 0, x: 40 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
//             className="w-full lg:w-1/2 relative flex items-center justify-center min-h-[380px] sm:min-h-[480px]"
//           >
//             {/* Decorative circles */}
//             <div
//               className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-purple-100 opacity-70"
//               style={{ right: "8%", top: "50%", transform: "translateY(-50%)" }}
//             />
//             <div
//               className="absolute w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-pink-100 opacity-60"
//               style={{ right: "2%", top: "10%" }}
//             />
//             <div
//               className="absolute w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-purple-200/50"
//               style={{ left: "10%", bottom: "15%" }}
//             />
//             <div
//               className="absolute w-8 h-8 rounded-full bg-rose-300/40"
//               style={{ left: "20%", top: "20%" }}
//             />

//             {/* Product image */}
//             <div className="relative z-10 h-[360px] sm:h-[440px] flex items-end justify-center">
//               <img
//                 src={bgSrc}
//                 alt=""
//                 className="h-full w-auto object-contain object-bottom"
//                 style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.15))" }}
//               />
//               {/* Floating badge */}
//               {badgeParts.length > 0 && (
//                 <motion.div
//                   initial={{ opacity: 0, scale: 0.8, y: 10 }}
//                   animate={{ opacity: 1, scale: 1, y: 0 }}
//                   transition={{ delay: 0.7, duration: 0.5 }}
//                   className="absolute top-8 right-0 bg-white shadow-2xl rounded-2xl px-4 py-3 text-center min-w-[100px]"
//                   style={{
//                     boxShadow:
//                       "0 10px 40px rgba(244,63,94,0.15), 0 4px 20px rgba(0,0,0,0.1)",
//                   }}
//                 >
//                   <p className="text-2xl sm:text-3xl font-black text-rose-500 leading-none">
//                     {badgeParts[0]}
//                   </p>
//                   {badgeParts[1] && (
//                     <p className="text-[11px] text-gray-400 mt-1 leading-tight">
//                       {badgeParts[1]}
//                     </p>
//                   )}
//                 </motion.div>
//               )}
//             </div>
//           </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// }









function Template4({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const bgSrc = data.bgImage || image1;

  const titleParts = (() => {
    if (!data.title) return { before: "", highlight: "", after: "" };
    if (data.highlightText && data.title.includes(data.highlightText)) {
      const idx = data.title.indexOf(data.highlightText);
      return {
        before: data.title.slice(0, idx),
        highlight: data.highlightText,
        after: data.title.slice(idx + data.highlightText.length),
      };
    }
    return { before: data.title, highlight: "", after: "" };
  })();

  const badgeParts = data.badgeText ? data.badgeText.split("\n").filter((p) => p.trim()) : [];
  const hasAccent = Boolean(data.accentText && data.accentText.trim());
  const hasTitle = Boolean(data.title && data.title.trim());
  const hasSubtitle = Boolean(data.subtitle && data.subtitle.trim());
  const hasCta = Boolean(data.ctaText && data.ctaText.trim());

  return (
    <div 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative overflow-hidden w-full bg-[#fafafa] selection:bg-rose-500 selection:text-white"
    >
      {/* Soft elegant ambient illumination highlights */}
      <div className="absolute right-0 top-1/4 w-[600px] h-[400px] bg-rose-500/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute left-10 bottom-0 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 pt-24 pb-16 lg:pt-36 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Content Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start"
          >
            {/* NEW UI: Elegant inline announcement container */}
            {badgeParts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 text-[11px] font-bold tracking-wide text-[var(--theme-accent)] mb-6 shadow-sm"
              >
                {/* <Sparkles className="w-3.5 h-3.5 text-rose-500" /> */}
                <span>{badgeParts[0]}</span>
                {badgeParts[1] && (
                  <span className="text-[var(--theme-accent)]/70 font-normal border-l border-[var(--theme-accent)]/30 pl-2 ml-1">
                    {badgeParts[1]}
                  </span>
                )}
              </motion.div>
            )}

            {hasAccent && (
              <p className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400 mb-4">
                {data.accentText}
              </p>
            )}

            {hasTitle && (
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-neutral-900 mb-6">
                {titleParts.before}
                {titleParts.highlight && (
                  <span className="text-[var(--theme-accent)]">{titleParts.highlight}</span>
                )}
                {titleParts.after}
              </h1>
            )}

            {hasSubtitle && (
              <p className="text-neutral-500 text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
                {data.subtitle}
              </p>
            )}

            {hasCta && (
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(data.ctaLink || "/products")}
                className="group inline-flex items-center gap-2.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-ink)] px-8 py-4 rounded-xl text-sm font-semibold transition-all duration-200 shadow-xl shadow-neutral-950/10"
              >
                {data.ctaText}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>
            )}
          </motion.div>

          {/* Right: Clean, Unobstructed Product Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="w-full lg:col-span-5 relative flex items-center justify-center min-h-[380px] sm:min-h-[460px]"
          >
            <img
              src={bgSrc}
              alt=""
              className="max-h-[420px] w-auto object-contain transition-transform duration-500 hover:scale-[1.02]"
              style={{ filter: "drop-shadow(0 25px 35px rgba(0,0,0,0.06))" }}
            />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
// ─── Template 5: Fashion Collage Gallery ──────────────────────────────────────
const TEMPLATE5_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800"
];

function Template5({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const images = (() => {
    if (data.images && data.images.length > 0) {
      const filled = [...data.images];
      for (let i = 0; i < 7; i++) {
        if (!filled[i]) {
          filled[i] = TEMPLATE5_FALLBACK_IMAGES[i];
        }
      }
      return filled.slice(0, 7);
    }
    return TEMPLATE5_FALLBACK_IMAGES;
  })();

  return (
    <div
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative w-full bg-white font-sans px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20 flex flex-col items-center justify-center gap-10 md:gap-14 select-none"
    >
      {/* --- TOP HEADER SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full flex flex-col justify-center items-center text-center space-y-3 max-w-4xl mx-auto"
      >
        {/* Editorial Overline Label */}
        {data.accentText && (
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400 block">
            {data.accentText}
          </span>
        )}
        
        {/* Center Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-950 text-center leading-[1.08] mx-4">
          {data.title}
        </h1>

        {data.subtitle && (
          <p className="text-neutral-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed pt-1">
            {data.subtitle}
          </p>
        )}
      </motion.div>

      {/* --- GRID GALLERY SECTION --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-5 items-end max-w-[1500px] mx-auto w-full">
        
        {/* Column 1: Top & Bottom Image */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex flex-col gap-3 sm:gap-4 h-full justify-end"
        >
          <div className="group relative bg-neutral-100 rounded-3xl overflow-hidden h-[260px] sm:h-[320px] md:h-[360px] lg:h-[400px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[0]} alt="Fashion model" className="w-full h-full object-cover object-[center_15%] group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="group relative bg-neutral-100 rounded-2xl overflow-hidden h-[160px] sm:h-[190px] md:h-[210px] lg:h-[230px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[1]} alt="Fashion detail" className="w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-700" />
          </div>
        </motion.div>

        {/* Column 2: Tall Image */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="h-full flex flex-col justify-end"
        >
          <div className="group relative bg-neutral-100 rounded-t-[3rem] rounded-b-2xl overflow-hidden h-[440px] sm:h-[530px] md:h-[590px] lg:h-[650px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[2]} alt="Fashion look" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
          </div>
        </motion.div>

        {/* Column 3: Center Portrait & CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col gap-3 sm:gap-4 items-center justify-end h-full col-span-2 sm:col-span-1"
        >
          <div className="group relative bg-neutral-100 rounded-3xl overflow-hidden w-full h-[280px] sm:h-[340px] md:h-[380px] lg:h-[420px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[3]} alt="Fashion portrait" className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-700" />
          </div>
          {Boolean(data.ctaText && data.ctaText.trim()) && (
            <button
              onClick={() => navigate(data.ctaLink || "/products")}
              className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-ink)] py-4 px-6 rounded-full flex items-center justify-center gap-2 font-bold text-sm sm:text-base tracking-wide shadow-md hover:shadow-xl transition-all duration-200 group cursor-pointer"
            >
              <span>{data.ctaText}</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}
        </motion.div>

        {/* Column 4: Tall Image */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="h-full flex flex-col justify-end"
        >
          <div className="group relative bg-neutral-100 rounded-t-[3rem] rounded-b-2xl overflow-hidden h-[420px] sm:h-[500px] md:h-[560px] lg:h-[620px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[4]} alt="Fashion portrait" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
          </div>
        </motion.div>

        {/* Column 5: Two Stacked Images */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col gap-3 sm:gap-4 h-full justify-end"
        >
          <div className="group relative bg-neutral-100 rounded-t-[2.5rem] rounded-b-2xl overflow-hidden h-[260px] sm:h-[310px] md:h-[340px] lg:h-[370px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[5]} alt="Fashion style" className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="group relative bg-neutral-100 rounded-2xl overflow-hidden h-[180px] sm:h-[220px] md:h-[235px] lg:h-[260px] shadow-sm hover:shadow-lg transition-all duration-300 border border-neutral-200/50">
            <img src={images[6]} alt="Fashion aesthetic" className="w-full h-full object-cover object-[center_25%] group-hover:scale-105 transition-transform duration-700" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ─── Template 6: 3-Column Editorial Triptych ──────────────────────────────────
const TEMPLATE6_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000",
];
const TEMPLATE6_FALLBACK_TITLES = [
  "Shop Chains",
  "Shop Rings",
  "SS26 Campaign: Out Now",
];
const TEMPLATE6_FALLBACK_LINKS = [
  "/products",
  "/products",
  "/products",
];
const TEMPLATE6_FALLBACK_SUBTITLES = [
  "",
  "",
  "SOURCE MATERIAL",
];

function Template6({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();

  const items = Array.from({ length: 3 }).map((_, i) => ({
    image: data.images?.[i] || TEMPLATE6_FALLBACK_IMAGES[i],
    title: data.imageTitles?.[i] ?? TEMPLATE6_FALLBACK_TITLES[i],
    link: data.imageLinks?.[i] || data.ctaLink || TEMPLATE6_FALLBACK_LINKS[i],
    subtitle: data.imageSubtitles?.[i] ?? TEMPLATE6_FALLBACK_SUBTITLES[i],
  }));

  return (
    <div
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        height: "calc(100dvh - var(--app-header-h, 7rem))",
      }}
      className="relative w-full bg-neutral-950 font-sans px-0 py-0 select-none overflow-hidden min-h-[520px] flex flex-col"
    >
      {/* 3-Column Full-Bleed Edge-to-Edge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 w-full h-full flex-1 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            onClick={() => navigate(item.link || "/products")}
            className="group relative cursor-pointer overflow-hidden bg-neutral-900 h-[60vh] md:h-full w-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 pt-10 sm:pt-12 lg:pt-16 transition-all duration-500"
          >
            {/* Background Image - with relaxed framing and subtle hover scale */}
            <img
              src={item.image}
              alt={item.title || `Campaign look ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.025] transition-transform duration-700 ease-out"
            />

            {/* Gradient Scrim for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60 pointer-events-none transition-opacity duration-300 group-hover:opacity-85" />

            {/* Top Text Link */}
            <div className="relative z-10 flex items-center justify-between">
              {item.title && (
                <div className="inline-flex items-center gap-1.5 text-white">
                  <span className="text-base sm:text-lg md:text-xl font-medium tracking-wide underline underline-offset-4 decoration-white/70 group-hover:decoration-white transition-all">
                    {item.title}
                  </span>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              )}
            </div>

            {/* Bottom Tag / Subtitle */}
            <div className="relative z-10 flex items-end justify-between mt-auto pt-4">
              {item.subtitle ? (
                <span className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-white/90 drop-shadow-md">
                  {item.subtitle}
                </span>
              ) : <div />}

              <span className="text-xs font-medium uppercase tracking-widest text-white/70 group-hover:text-white transition-colors flex items-center gap-1">
                Explore <span>&rarr;</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Template 7: Minimal Statement ─────────────────────────────────────────────
// Oversized type-only hero, no imagery at all — the safest template for a store that
// doesn't have (or doesn't want to use) hero photography, and one that can never clash
// with any theme's palette since there's no image to color-match. bgImage is unused.
function Template7({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative overflow-hidden w-full bg-white flex items-center"
    >
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center py-24">
        {Boolean(data.accentText && data.accentText.trim()) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-bold tracking-[0.3em] uppercase mb-6"
            style={{ color: "var(--theme-primary)" }}
          >
            {data.accentText}
          </motion.p>
        )}
        {Boolean(data.title && data.title.trim()) && (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-neutral-900 mb-8"
            style={{ fontFamily: "var(--theme-font-heading)" }}
          >
            {data.title}
          </motion.h1>
        )}
        {Boolean(data.subtitle && data.subtitle.trim()) && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-neutral-500 text-base sm:text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          >
            {data.subtitle}
          </motion.p>
        )}
        {Boolean(data.ctaText && data.ctaText.trim()) && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(data.ctaLink || "/products")}
            className="inline-flex items-center gap-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] px-9 py-4 rounded-full text-base font-bold tracking-wide hover:bg-[var(--theme-primary-hover)] transition-colors shadow-lg"
          >
            {data.ctaText}
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── Template 8: 3D Curved Gallery Arc ──────────────────────────────────────────
const TEMPLATE8_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=800",
];

const ARC_3D_PARAMS = [
  {
    rotateY: 42,
    rotateZ: -6,
    translateY: -32,
    translateZ: 40,
    scale: 1.15,
    zIndex: 10,
    lighting: "from-black/35 via-black/10 to-transparent",
    sheen: "from-white/20 via-transparent to-transparent",
  },
  {
    rotateY: 28,
    rotateZ: -3.5,
    translateY: -16,
    translateZ: 20,
    scale: 1.07,
    zIndex: 12,
    lighting: "from-black/25 via-transparent to-transparent",
    sheen: "from-white/15 via-transparent to-transparent",
  },
  {
    rotateY: 14,
    rotateZ: -1.2,
    translateY: -4,
    translateZ: 8,
    scale: 1.01,
    zIndex: 14,
    lighting: "from-black/15 via-transparent to-transparent",
    sheen: "from-white/10 via-transparent to-transparent",
  },
  {
    rotateY: 0,
    rotateZ: 0,
    translateY: 8,
    translateZ: 0,
    scale: 0.96,
    zIndex: 16,
    lighting: "from-transparent to-transparent",
    sheen: "from-white/10 via-transparent to-transparent",
  },
  {
    rotateY: -14,
    rotateZ: 1.2,
    translateY: -4,
    translateZ: 8,
    scale: 1.01,
    zIndex: 14,
    lighting: "from-transparent via-transparent to-black/15",
    sheen: "from-transparent via-transparent to-white/10",
  },
  {
    rotateY: -28,
    rotateZ: 3.5,
    translateY: -16,
    translateZ: 20,
    scale: 1.07,
    zIndex: 12,
    lighting: "from-transparent via-transparent to-black/25",
    sheen: "from-transparent via-transparent to-white/15",
  },
  {
    rotateY: -42,
    rotateZ: 6,
    translateY: -32,
    translateZ: 40,
    scale: 1.15,
    zIndex: 10,
    lighting: "from-transparent via-black/10 to-black/35",
    sheen: "from-transparent via-transparent to-white/20",
  },
];

function Template8({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const title = data.title;
  const accent = data.accentText;
  const subtitle = data.subtitle;
  const ctaLink = data.ctaLink || "/products";

  const images = (() => {
    const raw = data.images && data.images.length > 0 ? data.images.filter(Boolean) : [];
    const filled: string[] = [];
    for (let i = 0; i < 7; i++) {
      filled.push(raw[i] || TEMPLATE8_FALLBACK_IMAGES[i]);
    }
    return filled;
  })();

  return (
    <section 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc(100vh - var(--app-header-h, 7rem))",
      }}
      className="relative overflow-hidden w-full bg-[#fdfbf7] pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-28 select-none flex flex-col justify-center min-h-[580px] sm:min-h-[640px] lg:min-h-[720px]"
    >
      {/* Background ambient subtle gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-neutral-200/30 via-amber-50/10 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Header Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Main Headline */}
        {Boolean(title && title.trim()) && (
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 leading-[1.12] mb-4"
          >
            {title}
          </motion.h1>
        )}

        {/* Subtitle */}
        {Boolean(subtitle && subtitle.trim()) && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-neutral-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* 3D Curved Arc Gallery (Desktop / Tablet) */}
      <div className="hidden sm:block w-full max-w-[1400px] mx-auto px-4 overflow-visible py-4">
        <div
          style={{
            perspective: "850px",
            perspectiveOrigin: "center 45%",
            transformStyle: "preserve-3d",
          }}
          className="relative flex items-center justify-center -space-x-1 md:gap-2 lg:gap-3 py-6"
        >
          {images.map((src, idx) => {
            const param = ARC_3D_PARAMS[idx] || ARC_3D_PARAMS[3];
            const isHovered = hoveredIndex === idx;
            const anyHovered = hoveredIndex !== null;

            return (
              <motion.div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => navigate(ctaLink)}
                animate={{
                  rotateY: isHovered ? 0 : param.rotateY,
                  rotateZ: isHovered ? 0 : param.rotateZ,
                  y: isHovered ? -38 : param.translateY,
                  z: isHovered ? 90 : param.translateZ,
                  scale: isHovered ? 1.2 : anyHovered ? 0.94 : param.scale,
                  zIndex: isHovered ? 60 : param.zIndex,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                }}
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "center center",
                }}
                className={`group relative cursor-pointer rounded-2xl md:rounded-3xl overflow-hidden w-28 sm:w-36 md:w-44 lg:w-48 xl:w-56 aspect-[3/4.2] transition-all duration-300 ${
                  isHovered
                    ? "shadow-[0_30px_60px_-12px_rgba(0,0,0,0.38)]"
                    : "shadow-[0_20px_45px_-12px_rgba(0,0,0,0.22)]"
                }`}
              >
                <img
                  src={src}
                  alt={`Showcase item ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105"
                />

                {/* 3D Realistic Cylindrical Ambient Shadow/Lighting */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${param.lighting} pointer-events-none transition-opacity duration-300 ${
                    isHovered ? "opacity-0" : "opacity-100"
                  }`}
                />

                {/* Specular Rim Lighting Sheen */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${param.sheen} pointer-events-none`}
                />

                {/* Subtle dark vignette on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Horizontal Snap-scroll Carousel */}
      <div className="sm:hidden w-full overflow-x-auto flex gap-3 px-6 py-4 snap-x snap-mandatory scrollbar-none">
        {images.map((src, idx) => (
          <div
            key={idx}
            onClick={() => navigate(ctaLink)}
            className="snap-center shrink-0 w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border border-neutral-200 bg-neutral-100 active:scale-95 transition-transform cursor-pointer"
          >
            <img
              src={src}
              alt={`Showcase item ${idx + 1}`}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Template 9: Full-Screen 5-Banner Auto Carousel (5-second transition) ────
const TEMPLATE9_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=85&w=1920",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=85&w=1920",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=85&w=1920",
  "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=85&w=1920",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=85&w=1920",
];

function Template9({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Collect configured images. If admin configured images (e.g. 1 or 3), show ONLY those images.
  // Never pad removed/empty slots with default fallback images.
  const slides = (() => {
    const configured: { image: string; link?: string }[] = [];
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach((img, idx) => {
        if (img && typeof img === "string" && img.trim().length > 0) {
          configured.push({
            image: img.trim(),
            link: data.imageLinks?.[idx] || data.ctaLink || "",
          });
        }
      });
    }

    if (configured.length > 0) {
      return configured;
    }

    return TEMPLATE9_FALLBACK_IMAGES.map((img) => ({
      image: img,
      link: data.ctaLink || "",
    }));
  })();

  const totalSlides = slides.length;

  // Clamp currentIndex if slides count reduces (e.g. admin removed images)
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  // Auto-advance every 5 seconds, pauses when user hovers or interacts
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalSlides, isPaused]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartXRef.current = null;
  };

  const activeSlide = slides[currentIndex] || slides[0];
  const currentLink = activeSlide?.link || data.ctaLink || "";

  const handleSlideClick = () => {
    if (!currentLink) return;
    if (currentLink.startsWith("http://") || currentLink.startsWith("https://")) {
      window.open(currentLink, "_blank", "noopener,noreferrer");
    } else {
      navigate(currentLink);
    }
  };

  return (
    <div 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
      }}
      className="w-full bg-white select-none pt-2 sm:pt-3 pb-3 sm:pb-4"
    >
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6">
        {/* Banner Card Frame with Referral Aspect Ratio (2.65:1 on desktop / 1920x720) */}
        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleSlideClick}
          className={`relative w-full aspect-[16/9] sm:aspect-[2.2/1] md:aspect-[2.65/1] overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl bg-neutral-900 border border-neutral-200/60 shadow-xs group ${
            currentLink ? "cursor-pointer" : ""
          }`}
        >
          {/* Slide Images with smooth crossfade */}
          <AnimatePresence initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={activeSlide?.image}
                alt={`Banner slide ${currentIndex + 1}`}
                className="w-full h-full object-cover object-center pointer-events-none"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Left / Right Frosted Circular Navigation Arrows (Same as referral image) */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Slide"
                className="absolute left-2.5 sm:left-4 md:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/65 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 active:scale-95 cursor-pointer opacity-85 hover:opacity-100"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Slide"
                className="absolute right-2.5 sm:right-4 md:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/65 text-white backdrop-blur-xs flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 active:scale-95 cursor-pointer opacity-85 hover:opacity-100"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Referral-Style Controls: Counter Pill ("1/3" or "1/5") + Indicator Dots */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2 sm:mt-2.5 select-none">
            {/* Slide Counter Pill Badge (e.g. "1/3" or "1/5") */}
            <div className="bg-neutral-900 text-white text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs tabular-nums tracking-wider">
              {currentIndex + 1}/{totalSlides}
            </div>

            {/* Indicator Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    currentIndex === idx
                      ? "w-2 h-2 bg-neutral-900 scale-110"
                      : "w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template 10: Luxury Editorial Festive Banner (Half-Height Compact Edition) ──
const TEMPLATE10_FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=85&w=2400";

function Template10({ data }: { data: HeroTemplateData }) {
  const navigate = useNavigate();
  const bannerSrc = data.bgImage || TEMPLATE10_FALLBACK_BANNER;
  const title = data.title;
  const scriptAccent = data.highlightText ?? data.accentText;
  const subtitle = data.subtitle;
  const ctaText = data.ctaText;
  const ctaLink = data.ctaLink || "/products";

  const hasTitle = Boolean(title && title.trim());
  const hasScriptAccent = Boolean(scriptAccent && scriptAccent.trim());
  const hasSubtitle = Boolean(subtitle && subtitle.trim());
  const hasCta = Boolean(ctaText && ctaText.trim());

  return (
    <section 
      style={{
        marginTop: "var(--app-header-h, 7rem)",
        minHeight: "calc((100vh - var(--app-header-h, 7rem)) * 0.5)",
      }}
      className="relative w-full overflow-hidden bg-neutral-950 select-none min-h-[260px] sm:min-h-[310px] lg:min-h-[360px] max-h-[440px] flex items-center"
    >
      {/* Full-bleed Background Image */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img
          src={bannerSrc}
          alt="Hero Banner"
          className="w-full h-full object-cover object-center lg:object-right"
        />
        {/* Cinematic Left Gradient Vignette for perfect text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent w-full sm:w-3/4 lg:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent sm:hidden" />
      </div>

      {/* Luxury Editorial Text Overlay (Proportionate for Half-Height Hero) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 w-full py-6 sm:py-8 lg:py-10 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-left space-y-2.5 sm:space-y-3.5"
        >
          {/* Main Headline with Serif + Script Accent Intertwined */}
          {(hasTitle || hasScriptAccent) && (
            <div className="relative flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
              {hasTitle && (
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight leading-none drop-shadow-2xl"
                >
                  {title}
                </h1>
              )}
              {hasScriptAccent && (
                <span
                  style={{ fontFamily: "'Alex Brush', 'Great Vibes', cursive" }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-normal leading-none -ml-1 drop-shadow-2xl"
                >
                  {scriptAccent}
                </span>
              )}
            </div>
          )}

          {/* Subtitle / Multiline Discount Offer */}
          {hasSubtitle && (
            <div
              style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
              className="text-white/95 text-sm sm:text-base md:text-lg lg:text-xl font-normal leading-snug tracking-wide drop-shadow-md whitespace-pre-line"
            >
              {subtitle}
            </div>
          )}

          {/* Luxury Minimalist Outline CTA Button */}
          {hasCta && (
            <div className="pt-1.5 sm:pt-2">
              <motion.button
                whileHover={{ scale: 1.04, backgroundColor: "rgba(255, 255, 255, 1)", color: "#0a0a0a" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(ctaLink)}
                className="inline-flex items-center justify-center border border-white/70 hover:border-white text-white px-5 sm:px-7 py-2 sm:py-2.5 text-xs font-medium uppercase tracking-[0.2em] transition-colors duration-300 cursor-pointer shadow-lg backdrop-blur-sm"
              >
                {ctaText}
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

const HERO_CACHE_KEY = "crm_hero_config_cache";
const HERO_UPDATE_EVENT = "crm_hero_config_updated";

function readHeroCache(): HeroConfig | null {
  try {
    const raw = localStorage.getItem(HERO_CACHE_KEY);
    return raw ? (JSON.parse(raw) as HeroConfig) : null;
  } catch {
    return null;
  }
}

// ─── Main HeroSection component ───────────────────────────────────────────────
export default function HeroSection({ onReady }: { onReady?: () => void }) {
  const cached = readHeroCache();
  const [config, setConfig] = useState<HeroConfig>(cached ?? DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isMounted = true;
    const handleUpdate = () => {
      const freshCached = readHeroCache();
      if (freshCached) setConfig(freshCached);
    };
    window.addEventListener(HERO_UPDATE_EVENT, handleUpdate);

    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (!isMounted) return;
        let fresh: HeroConfig = config;
        if (data?.heroConfig) {
          fresh = {
            activeTemplate:
              data.heroConfig.activeTemplate ?? DEFAULT_CONFIG.activeTemplate,
            templates: {
              "1": {
                ...DEFAULT_CONFIG.templates["1"],
                ...data.heroConfig.templates?.["1"],
              },
              "2": {
                ...DEFAULT_CONFIG.templates["2"],
                ...data.heroConfig.templates?.["2"],
              },
              "3": {
                ...DEFAULT_CONFIG.templates["3"],
                ...data.heroConfig.templates?.["3"],
              },
              "4": {
                ...DEFAULT_CONFIG.templates["4"],
                ...data.heroConfig.templates?.["4"],
              },
              "5": {
                ...DEFAULT_CONFIG.templates["5"],
                ...data.heroConfig.templates?.["5"],
              },
              "6": {
                ...DEFAULT_CONFIG.templates["6"],
                ...data.heroConfig.templates?.["6"],
              },
              "7": {
                ...DEFAULT_CONFIG.templates["7"],
                ...data.heroConfig.templates?.["7"],
              },
              "8": {
                ...DEFAULT_CONFIG.templates["8"],
                ...data.heroConfig.templates?.["8"],
              },
              "9": {
                ...DEFAULT_CONFIG.templates["9"],
                ...data.heroConfig.templates?.["9"],
              },
              "10": {
                ...DEFAULT_CONFIG.templates["10"],
                ...data.heroConfig.templates?.["10"],
              },
            },
          };
          setConfig(fresh);
          try {
            localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(fresh));
          } catch {
            // ignore
          }
        }

        const activeTpl = fresh.activeTemplate;
        if (activeTpl === 2 || activeTpl === 4 || activeTpl === 5 || activeTpl === 6 || activeTpl === 9) {
          const templateData = fresh.templates[String(activeTpl)];
          const bgSrc = activeTpl === 5
            ? (templateData?.images?.[0] || TEMPLATE5_FALLBACK_IMAGES[0])
            : (templateData?.bgImage || image1);
          if (bgSrc && typeof bgSrc === "string") {
            const img = new Image();
            img.src = bgSrc;
            img.onload = () => {
              if (!isMounted) return;
              setReady(true);
              if (onReadyRef.current) onReadyRef.current();
            };
            img.onerror = () => {
              if (!isMounted) return;
              setReady(true);
              if (onReadyRef.current) onReadyRef.current();
            };
          } else {
            setReady(true);
            if (onReadyRef.current) onReadyRef.current();
          }
        } else {
          setReady(true);
          if (onReadyRef.current) onReadyRef.current();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const activeTpl = config.activeTemplate;
        if (activeTpl === 2 || activeTpl === 4 || activeTpl === 5 || activeTpl === 6 || activeTpl === 9) {
          const templateData = config.templates[String(activeTpl)];
          const bgSrc = activeTpl === 5
            ? (templateData?.images?.[0] || TEMPLATE5_FALLBACK_IMAGES[0])
            : (templateData?.bgImage || image1);
          if (bgSrc && typeof bgSrc === "string") {
            const img = new Image();
            img.src = bgSrc;
            img.onload = () => {
              if (!isMounted) return;
              setReady(true);
              if (onReadyRef.current) onReadyRef.current();
            };
            img.onerror = () => {
              if (!isMounted) return;
              setReady(true);
              if (onReadyRef.current) onReadyRef.current();
            };
          } else {
            setReady(true);
            if (onReadyRef.current) onReadyRef.current();
          }
        } else {
          setReady(true);
          if (onReadyRef.current) onReadyRef.current();
        }
      });

    return () => {
      isMounted = false;
      window.removeEventListener(HERO_UPDATE_EVENT, handleUpdate);
    };
  }, []);


  const active = String(config.activeTemplate);
  const templateData = config.templates[active] ?? config.templates["1"];

  // ── Determine skeleton styles that EXACTLY match the target template ──────
  // This prevents any height/background jump when transitioning loading → template.
  const skeletonBg =
    config.activeTemplate === 2 || config.activeTemplate === 9 || config.activeTemplate === 10
      ? "bg-neutral-950"
      : config.activeTemplate === 8
      ? "bg-[#fdfbf7]"
      : config.activeTemplate === 4
      ? "bg-[#fafafa]"
      : config.activeTemplate === 6
      ? "bg-white"
      : "bg-white";

  const skeletonStyle: React.CSSProperties = {
    marginTop: "var(--app-header-h, 7rem)",
    minHeight: "calc(100vh - var(--app-header-h, 7rem))",
  };

  // ── Render skeleton overlay if not ready ─────────────────────────────────
  if (!ready)
    return (
      <div
        style={skeletonStyle}
        className={`w-full ${skeletonBg} flex items-center justify-center`}
      >
        <CircularSpinner
          size="md"
          dark={skeletonBg.includes("neutral-950") || config.activeTemplate === 3}
        />
      </div>
    );

  if (config.activeTemplate === 2) return <Template2 data={templateData} />;
  if (config.activeTemplate === 3) return <Template3 data={templateData} />;
  if (config.activeTemplate === 4) return <Template4 data={templateData} />;
  if (config.activeTemplate === 5) return <Template5 data={templateData} />;
  if (config.activeTemplate === 6) return <Template6 data={templateData} />;
  if (config.activeTemplate === 7) return <Template7 data={templateData} />;
  if (config.activeTemplate === 8) return <Template8 data={templateData} />;
  if (config.activeTemplate === 9) return <Template9 data={templateData} />;
  if (config.activeTemplate === 10) return <Template10 data={templateData} />;
  return <Template1 data={templateData} />;
}
