import React from "react";
import diwaliLampImg from "../../assets/festive/diwali-lamp.png";
import holiBowlImg from "../../assets/festive/holi-bowl.png";
import eidCrescentImg from "../../assets/festive/eid-crescent.png";
import onamMahabaliImg from "../../assets/festive/onam-mahabali.png";
import christmasMerryImg from "../../assets/festive/christmas-merry.png";
import valentinesWreathImg from "../../assets/festive/valentines-wreath.png";

// ─── SVG Decorative Festive Hanging Motifs ─────────────────────────────────────

/**
 * 🌙 Eid: Hanging Brass Crescent Moon & Fanoos Lantern
 */
const EidHangingLantern: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(16,185,129,0.65)]"
  >
    <defs>
      <linearGradient id="eidGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="35%" stopColor="#FDE047" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="eidLanternGlass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#B45309" stopOpacity="0.95" />
      </linearGradient>
      <radialGradient id="eidGlassGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#FDE047" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Hanging Brass Chain */}
    <line x1="50" y1="0" x2="50" y2="28" stroke="url(#eidGold)" strokeWidth="2.5" strokeDasharray="3 2" />

    {/* Crescent Moon Finial */}
    <path
      d="M50 16 C42 16 38 22 40 30 C42 38 50 42 58 40 C52 38 50 32 50 26 C50 20 54 18 50 16 Z"
      fill="url(#eidGold)"
      stroke="#FDE047"
      strokeWidth="0.8"
    />
    {/* Small Star beside Crescent */}
    <polygon
      points="57,25 58.5,28 61.5,28 59,30 60,33 57,31 54,33 55,30 52.5,28 55.5,28"
      fill="#FFFBEB"
    />

    {/* Lantern Top Cap & Dome */}
    <path d="M30 42 L70 42 L62 52 L38 52 Z" fill="url(#eidGold)" stroke="#FBBF24" strokeWidth="1" />
    <path d="M38 52 L62 52 L68 62 L32 62 Z" fill="url(#eidGold)" />

    {/* Lantern Glowing Glass Chamber */}
    <polygon points="34,62 66,62 60,105 40,105" fill="url(#eidLanternGlass)" stroke="#FDE047" strokeWidth="1.5" />
    {/* Inner Glass Glow */}
    <polygon points="37,64 63,64 58,103 42,103" fill="url(#eidGlassGlow)" />

    {/* Islamic Lattice Filigree Windows */}
    <line x1="50" y1="62" x2="50" y2="105" stroke="#78350F" strokeWidth="1.5" />
    <line x1="34" y1="83" x2="66" y2="83" stroke="#78350F" strokeWidth="1" opacity="0.75" />
    <polygon points="50,72 56,83 50,94 44,83" stroke="url(#eidGold)" strokeWidth="1" fill="none" />

    {/* Lantern Bottom Base */}
    <path d="M40 105 L60 105 L65 114 L35 114 Z" fill="url(#eidGold)" stroke="#FBBF24" strokeWidth="1" />

    {/* Bottom Hanging Bell / Tassel */}
    <path d="M48 114 L52 114 L54 125 L46 125 Z" fill="url(#eidGold)" />
    <circle cx="50" cy="129" r="4" fill="url(#eidGold)" stroke="#FFFBEB" strokeWidth="0.8" />
  </svg>
);

/**
 * 🌼 Onam: Traditional Kerala Kasavu Umbrella, Nilavilakku & Marigold Garland
 */
const OnamHangingMotif: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.65)]"
  >
    <defs>
      <linearGradient id="onamKasavuGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="40%" stopColor="#FBBF24" />
        <stop offset="80%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
      <linearGradient id="marigoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>

    {/* Hanging Golden Chain */}
    <line x1="50" y1="0" x2="50" y2="24" stroke="url(#onamKasavuGold)" strokeWidth="2.5" strokeDasharray="3 2" />

    {/* Kerala Kasavu Royal Parasol (Olakuda / Umbrella) */}
    <path
      d="M20 46 C20 28 80 28 80 46 C75 48 70 47 65 46 C60 45 55 48 50 46 C45 48 40 45 35 46 C30 47 25 48 20 46 Z"
      fill="#FFFBEB"
      stroke="url(#onamKasavuGold)"
      strokeWidth="2"
    />
    {/* Golden Kasavu Border on Umbrella */}
    <path
      d="M20 46 C30 50 70 50 80 46"
      stroke="url(#onamKasavuGold)"
      strokeWidth="3.5"
    />
    {/* Parasol Finial Top */}
    <circle cx="50" cy="28" r="4" fill="url(#onamKasavuGold)" />

    {/* Umbrella Center Spindle */}
    <line x1="50" y1="46" x2="50" y2="68" stroke="url(#onamKasavuGold)" strokeWidth="3" />

    {/* Traditional Marigold Flower Garland (Pookkalam Drops) */}
    <g>
      {/* Flower 1 */}
      <circle cx="50" cy="74" r="7" fill="url(#marigoldGrad)" stroke="#B45309" strokeWidth="0.8" />
      <circle cx="50" cy="74" r="3" fill="#FFFBEB" />
      {/* Flower 2 */}
      <circle cx="50" cy="89" r="6.5" fill="url(#marigoldGrad)" stroke="#B45309" strokeWidth="0.8" />
      <circle cx="50" cy="89" r="2.8" fill="#FFFBEB" />
      {/* Flower 3 */}
      <circle cx="50" cy="103" r="6" fill="url(#marigoldGrad)" stroke="#B45309" strokeWidth="0.8" />
      <circle cx="50" cy="103" r="2.5" fill="#FFFBEB" />
      {/* Side flower petals */}
      <circle cx="36" cy="62" r="5" fill="url(#marigoldGrad)" />
      <circle cx="64" cy="62" r="5" fill="url(#marigoldGrad)" />
    </g>

    {/* Kerala Temple Brass Bell (Mani) at Bottom */}
    <path d="M42 112 L58 112 L64 126 L36 126 Z" fill="url(#onamKasavuGold)" stroke="#FEF08A" strokeWidth="1" />
    <circle cx="50" cy="129" r="3.5" fill="url(#onamKasavuGold)" />
  </svg>
);

/**
 * 🎨 Holi: Ornate Brass Pichkari (Water Gun) with Splashing Gulal Color Powder
 */
const HoliHangingMotif: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(236,72,153,0.65)]"
  >
    <defs>
      <linearGradient id="pichkariBrass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="30%" stopColor="#FDE047" />
        <stop offset="70%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <radialGradient id="pinkGulal" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="70%" stopColor="#DB2777" />
        <stop offset="100%" stopColor="#9D174D" />
      </radialGradient>
      <radialGradient id="cyanGulal" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="70%" stopColor="#06B6D4" />
        <stop offset="100%" stopColor="#0E7490" />
      </radialGradient>
    </defs>

    {/* Hanging Chain */}
    <line x1="50" y1="0" x2="50" y2="22" stroke="url(#pichkariBrass)" strokeWidth="2.5" strokeDasharray="3 2" />

    {/* Hanging Gulal Brass Pot (Matka) */}
    <ellipse cx="50" cy="38" rx="22" ry="16" fill="url(#pichkariBrass)" stroke="#FEF08A" strokeWidth="1.2" />
    <path d="M36 28 L64 28 L60 34 L40 34 Z" fill="url(#pichkariBrass)" />

    {/* Vibrant Pink Powder Mound in Pot */}
    <ellipse cx="50" cy="31" rx="14" ry="7" fill="url(#pinkGulal)" />

    {/* Traditional Brass Pichkari Syringe Crossing Through */}
    <rect x="46" y="44" width="8" height="52" rx="3" fill="url(#pichkariBrass)" stroke="#FEF08A" strokeWidth="1" />
    {/* Pichkari Rings */}
    <rect x="44" y="54" width="12" height="4" rx="1" fill="#FEF08A" />
    <rect x="44" y="70" width="12" height="4" rx="1" fill="#FEF08A" />
    <rect x="44" y="86" width="12" height="4" rx="1" fill="#FEF08A" />
    {/* Nozzle Cone */}
    <polygon points="50,110 44,96 56,96" fill="url(#pichkariBrass)" />
    {/* Handle Grip */}
    <circle cx="50" cy="44" r="5" fill="url(#pichkariBrass)" />

    {/* Splashing Gulal Color Drops */}
    <circle cx="34" cy="98" r="7" fill="url(#pinkGulal)" opacity="0.9" />
    <circle cx="66" cy="102" r="8" fill="url(#cyanGulal)" opacity="0.9" />
    <circle cx="50" cy="122" r="8" fill="#FACC15" opacity="0.95" />
    <circle cx="38" cy="118" r="4.5" fill="#A855F7" opacity="0.85" />
    <circle cx="62" cy="120" r="4.5" fill="#EC4899" opacity="0.85" />
  </svg>
);

/**
 * 🎄 Christmas & New Year: Hanging Golden Bells with Velvet Ribbon & Holly
 */
const ChristmasHangingBells: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(239,68,68,0.65)]"
  >
    <defs>
      <linearGradient id="bellGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="35%" stopColor="#FDE047" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="redVelvet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="60%" stopColor="#B91C1C" />
        <stop offset="100%" stopColor="#7F1D1D" />
      </linearGradient>
    </defs>

    {/* Hanging Red Silk Ribbon */}
    <line x1="50" y1="0" x2="50" y2="26" stroke="url(#redVelvet)" strokeWidth="3" />

    {/* Velvet Bow Knot */}
    <circle cx="50" cy="28" r="4" fill="url(#redVelvet)" stroke="#FEF08A" strokeWidth="0.8" />
    <path d="M50 28 Q 30 16 32 30 Q 34 38 50 30" fill="url(#redVelvet)" />
    <path d="M50 28 Q 70 16 68 30 Q 66 38 50 30" fill="url(#redVelvet)" />

    {/* Holly Leaves (Green) */}
    <path
      d="M50 32 C40 32 35 38 42 44 C45 41 48 40 50 42 C52 40 55 41 58 44 C65 38 60 32 50 32 Z"
      fill="#15803D"
      stroke="#14532D"
      strokeWidth="0.8"
    />
    {/* Holly Red Berries */}
    <circle cx="47" cy="38" r="2.8" fill="#EF4444" />
    <circle cx="53" cy="38" r="2.8" fill="#DC2626" />
    <circle cx="50" cy="42" r="2.8" fill="#B91C1C" />

    {/* Main Christmas Bell */}
    <path
      d="M38 52 C38 46 62 46 62 52 C62 66 74 86 76 96 L24 96 C26 86 38 66 38 52 Z"
      fill="url(#bellGold)"
      stroke="#FEF08A"
      strokeWidth="1.2"
    />
    {/* Bell Rim */}
    <ellipse cx="50" cy="96" rx="26" ry="6" fill="url(#bellGold)" stroke="#FEF08A" strokeWidth="1.2" />

    {/* Bell Clapper Ball */}
    <circle cx="50" cy="103" r="5" fill="url(#bellGold)" stroke="#78350F" strokeWidth="1" />

    {/* Star Engraving on Bell */}
    <polygon points="50,66 52,71 57,71 53,74 55,79 50,76 45,79 47,74 43,71 48,71" fill="#78350F" opacity="0.7" />
  </svg>
);

/**
 * 💍 Wedding Season: Royal Ceremonial Kalash with Mango Leaves, Coconut & Golden Pearls
 */
const WeddingHangingKalash: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(244,63,94,0.65)]"
  >
    <defs>
      <linearGradient id="weddingGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="35%" stopColor="#FDE047" />
        <stop offset="70%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
      <linearGradient id="coconutBrown" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A16207" />
        <stop offset="60%" stopColor="#78350F" />
        <stop offset="100%" stopColor="#451A03" />
      </linearGradient>
    </defs>

    {/* Hanging Golden Pearl String */}
    <line x1="50" y1="0" x2="50" y2="24" stroke="url(#weddingGold)" strokeWidth="2.5" strokeDasharray="3 2" />

    {/* Mango Leaves on Kalash (5 Green Leaves) */}
    <path d="M50 48 C40 36 34 26 36 20 C42 24 46 34 50 48 Z" fill="#15803D" stroke="#166534" strokeWidth="0.8" />
    <path d="M50 48 C60 36 66 26 64 20 C58 24 54 34 50 48 Z" fill="#15803D" stroke="#166534" strokeWidth="0.8" />
    <path d="M50 48 C44 38 48 24 50 16 C52 24 56 38 50 48 Z" fill="#22C55E" stroke="#15803D" strokeWidth="0.8" />

    {/* Sacred Coconut with Tilak */}
    <circle cx="50" cy="40" r="11" fill="url(#coconutBrown)" stroke="url(#weddingGold)" strokeWidth="1" />
    {/* Red Tilak on Coconut */}
    <ellipse cx="50" cy="38" rx="2.5" ry="4" fill="#DC2626" />

    {/* Ceremonial Brass Kalash Pot */}
    <path
      d="M36 50 L64 50 L60 56 L40 56 Z"
      fill="url(#weddingGold)"
      stroke="#FEF08A"
      strokeWidth="1"
    />
    <path
      d="M40 56 C30 62 26 76 30 90 C34 100 66 100 70 90 C74 76 70 62 60 56 Z"
      fill="url(#weddingGold)"
      stroke="#FEF08A"
      strokeWidth="1.2"
    />

    {/* Red Sacred Thread (Mauli) Wrapped around Kalash Neck */}
    <rect x="38" y="56" width="24" height="4" fill="#DC2626" rx="1" />

    {/* Swastika / Auspicious Emblem on Kalash */}
    <circle cx="50" cy="76" r="6" fill="#DC2626" opacity="0.85" />
    <polygon points="50,72 52,75 55,75 53,77 54,80 50,78 46,80 47,77 45,75 48,75" fill="#FFFBEB" />

    {/* Kalash Base Ring */}
    <rect x="42" y="96" width="16" height="4" rx="1" fill="url(#weddingGold)" />

    {/* Hanging Golden Pearl Tassels */}
    <line x1="44" y1="100" x2="44" y2="120" stroke="url(#weddingGold)" strokeWidth="1.5" strokeDasharray="2 2" />
    <circle cx="44" cy="122" r="3" fill="#FFFBEB" stroke="url(#weddingGold)" strokeWidth="0.8" />
    <line x1="56" y1="100" x2="56" y2="120" stroke="url(#weddingGold)" strokeWidth="1.5" strokeDasharray="2 2" />
    <circle cx="56" cy="122" r="3" fill="#FFFBEB" stroke="url(#weddingGold)" strokeWidth="0.8" />
    <line x1="50" y1="100" x2="50" y2="128" stroke="url(#weddingGold)" strokeWidth="2" strokeDasharray="2 2" />
    <circle cx="50" cy="130" r="3.5" fill="url(#weddingGold)" stroke="#FFFBEB" strokeWidth="0.8" />
  </svg>
);

/**
 * 🇮🇳 Republic Day: Tricolor Silk Ribbon Rosette with Golden Ashoka Chakra
 */
const RepublicDayHangingRosette: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(59,130,246,0.65)]"
  >
    {/* Hanging Saffron/Green Silk Ribbon */}
    <line x1="50" y1="0" x2="50" y2="24" stroke="#FF9933" strokeWidth="3" />

    {/* Outer Saffron Rosette Petals */}
    <circle cx="50" cy="50" r="26" fill="#FF9933" stroke="#F59E0B" strokeWidth="1" />

    {/* Middle White Rosette Layer */}
    <circle cx="50" cy="50" r="19" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />

    {/* Inner Green Rosette Layer */}
    <circle cx="50" cy="50" r="13" fill="#138808" />

    {/* Navy Blue Ashoka Chakra Center */}
    <circle cx="50" cy="50" r="11" fill="#FFFFFF" stroke="#000080" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="2.5" fill="#000080" />
    {/* 8 representative Chakra spokes */}
    <line x1="50" y1="40" x2="50" y2="60" stroke="#000080" strokeWidth="0.8" />
    <line x1="40" y1="50" x2="60" y2="50" stroke="#000080" strokeWidth="0.8" />
    <line x1="43" y1="43" x2="57" y2="57" stroke="#000080" strokeWidth="0.8" />
    <line x1="43" y1="57" x2="57" y2="43" stroke="#000080" strokeWidth="0.8" />

    {/* Flowing Tricolor Satin Streamers */}
    {/* Saffron Streamer (Left) */}
    <path d="M42 74 Q 36 95 38 126 L44 124 Q 42 95 48 74 Z" fill="#FF9933" />
    {/* White Streamer (Center) */}
    <path d="M48 76 Q 50 100 50 134 L52 134 Q 52 100 52 76 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.5" />
    {/* Green Streamer (Right) */}
    <path d="M52 74 Q 58 95 56 126 L62 124 Q 64 95 58 74 Z" fill="#138808" />
  </svg>
);

/**
 * 💝 Valentine's Day: Hanging Twin Crimson & Gold Hearts with Love Ribbon
 */
const ValentinesHangingHearts: React.FC = () => (
  <svg
    viewBox="0 0 100 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(244,63,94,0.65)]"
  >
    <defs>
      <linearGradient id="valHeartRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="45%" stopColor="#E11D48" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
      <linearGradient id="valHeartGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="50%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>

    {/* Hanging Silk Ribbon */}
    <line x1="50" y1="0" x2="50" y2="28" stroke="url(#valHeartRed)" strokeWidth="2.5" />

    {/* Ribbon Bow */}
    <circle cx="50" cy="28" r="3.5" fill="#FFE4E6" stroke="url(#valHeartRed)" strokeWidth="1" />
    <path d="M50 28 Q 36 18 38 28 Q 40 34 50 28" fill="url(#valHeartRed)" />
    <path d="M50 28 Q 64 18 62 28 Q 60 34 50 28" fill="url(#valHeartRed)" />

    {/* Primary Red Heart */}
    <path
      d="M50 56 C50 44 32 40 32 54 C32 68 50 82 50 82 C50 82 68 68 68 54 C68 40 50 44 50 56 Z"
      fill="url(#valHeartRed)"
      stroke="#FDA4AF"
      strokeWidth="1.2"
    />
    {/* Glossy Reflection Highlight */}
    <path d="M37 50 C37 46 43 45 46 47" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

    {/* Intertwined Golden Little Heart */}
    <path
      d="M62 76 C62 68 50 65 50 74 C50 84 62 93 62 93 C62 93 74 84 74 74 C74 65 62 68 62 76 Z"
      fill="url(#valHeartGold)"
      stroke="#FEF08A"
      strokeWidth="1"
    />

    {/* Hanging Sparkling Star Drops */}
    <line x1="50" y1="84" x2="50" y2="116" stroke="url(#valHeartGold)" strokeWidth="1.5" strokeDasharray="2 2" />
    <polygon points="50,116 52,121 57,121 53,124 55,129 50,126 45,129 47,124 43,121 48,121" fill="url(#valHeartGold)" />
  </svg>
);

// ─── Main Festive Hanging Motif Component ──────────────────────────────────────

interface FestiveNavbarHangingMotifProps {
  occasionId?: string | null;
}

export const FestiveNavbarHangingMotif: React.FC<FestiveNavbarHangingMotifProps> = ({
  occasionId,
}) => {
  if (!occasionId) return null;

  switch (occasionId) {
    case "diwali":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway"
          title="Happy Diwali"
        >
          {/* Flame warm radial glow behind lamp */}
          <div className="absolute top-[48%] left-[49%] w-8 h-8 sm:w-12 sm:h-12 bg-amber-400/45 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
          <img
            src={diwaliLampImg}
            alt="Diwali Hanging Deepam"
            className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.65)] relative z-10"
          />
        </div>
      );

    case "eid":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway flex flex-col items-center"
          title="Eid Mubarak"
        >
          {/* Subtle hanging brass chain */}
          <svg
            className="w-1.5 h-3 sm:h-4 text-amber-400 overflow-visible shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]"
            viewBox="0 0 6 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="3" y1="0" x2="3" y2="14" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="3" cy="14" r="2" fill="#FDE047" stroke="#B45309" strokeWidth="0.8" />
          </svg>
          <div className="relative -mt-1">
            {/* Emerald & golden warm radial glow behind Eid crescent */}
            <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-r from-emerald-400/40 via-amber-400/45 to-yellow-300/40 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
            <img
              src={eidCrescentImg}
              alt="Eid Mubarak Crescent Moon & Lanterns"
              className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_18px_rgba(245,158,11,0.7)] relative z-10"
            />
          </div>
        </div>
      );

    case "onam":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway flex flex-col items-center"
          title="Happy Onam - ഓണാശംസകൾ"
        >
          {/* Subtle hanging Kerala brass chain */}
          <svg
            className="w-1.5 h-3 sm:h-4 text-amber-400 overflow-visible shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]"
            viewBox="0 0 6 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="3" y1="0" x2="3" y2="14" stroke="#D97706" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="3" cy="14" r="2" fill="#FDE047" stroke="#78350F" strokeWidth="0.8" />
          </svg>
          <div className="relative -mt-1">
            {/* Kerala golden warm radial glow behind Maveli & Olakuda */}
            <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-400/45 via-yellow-400/45 to-orange-400/40 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
            <img
              src={onamMahabaliImg}
              alt="Happy Onam Mahabali"
              className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_18px_rgba(217,119,6,0.65)] relative z-10"
            />
          </div>
        </div>
      );

    case "holi":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway flex flex-col items-center"
          title="Happy Holi"
        >
          {/* Subtle hanging brass chain */}
          <svg
            className="w-1.5 h-3 sm:h-4 text-amber-400 overflow-visible shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]"
            viewBox="0 0 6 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="3" y1="0" x2="3" y2="14" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="3" cy="14" r="2" fill="#FDE047" stroke="#B45309" strokeWidth="0.8" />
          </svg>
          <div className="relative -mt-0.5">
            {/* Multi-colored festive radial glow behind Holi bowl */}
            <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-pink-500/45 via-amber-400/35 to-cyan-400/45 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
            <img
              src={holiBowlImg}
              alt="Happy Holi Colors"
              className="h-14 sm:h-18 md:h-22 lg:h-26 w-auto object-contain drop-shadow-[0_4px_16px_rgba(236,72,153,0.7)] relative z-10"
            />
          </div>
        </div>
      );

    case "christmas-new-year":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway flex flex-col items-center"
          title="Merry Christmas & Happy New Year"
        >
          {/* Subtle hanging holiday ribbon / golden string */}
          <svg
            className="w-1.5 h-3 sm:h-4 text-red-500 overflow-visible shrink-0 drop-shadow-[0_2px_4px_rgba(239,68,68,0.5)]"
            viewBox="0 0 6 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="3" y1="0" x2="3" y2="14" stroke="#DC2626" strokeWidth="2.5" />
            <circle cx="3" cy="14" r="2" fill="#FDE047" stroke="#7F1D1D" strokeWidth="0.8" />
          </svg>
          <div className="relative -mt-1">
            {/* Warm holiday crimson & golden star glow */}
            <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-18 sm:h-18 bg-gradient-to-r from-red-500/45 via-amber-400/45 to-yellow-300/45 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
            <img
              src={christmasMerryImg}
              alt="Merry Christmas Golden Star & Ornaments"
              className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_18px_rgba(239,68,68,0.7)] relative z-10"
            />
          </div>
        </div>
      );

    case "wedding-season":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway"
          title="Happy Wedding Season"
        >
          <div className="absolute top-[50%] left-[50%] w-8 h-8 sm:w-12 sm:h-12 bg-rose-400/40 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
          <div className="relative z-10">
            <WeddingHangingKalash />
          </div>
        </div>
      );

    case "republic-day":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway"
          title="Happy Republic Day"
        >
          <div className="absolute top-[46%] left-[50%] w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/35 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
          <div className="relative z-10">
            <RepublicDayHangingRosette />
          </div>
        </div>
      );

    case "valentines":
      return (
        <div
          className="absolute left-0 sm:left-1 lg:left-2 xl:left-3 -top-1 pointer-events-none z-30 select-none diwali-lamp-sway flex flex-col items-center"
          title="Happy Valentine's Day"
        >
          {/* Subtle hanging silk ribbon */}
          <svg
            className="w-1.5 h-3 sm:h-4 text-rose-500 overflow-visible shrink-0 drop-shadow-[0_2px_4px_rgba(244,63,94,0.5)]"
            viewBox="0 0 6 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="3" y1="0" x2="3" y2="14" stroke="#E11D48" strokeWidth="2.5" />
            <circle cx="3" cy="14" r="2" fill="#FFE4E6" stroke="#881337" strokeWidth="0.8" />
          </svg>
          <div className="relative -mt-1">
            {/* Romantic rose & crimson warm radial glow behind wreath */}
            <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-rose-500/40 via-pink-400/45 to-red-400/40 rounded-full blur-md diwali-flame-pulse pointer-events-none" />
            <img
              src={valentinesWreathImg}
              alt="Happy Valentine's Day Rose Wreath"
              className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_4px_18px_rgba(244,63,94,0.65)] relative z-10"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default FestiveNavbarHangingMotif;
