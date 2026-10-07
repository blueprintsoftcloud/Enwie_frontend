// src/utils/themes.ts
//
// The 10 selectable storefront visual themes. Each theme is a flat set of CSS custom
// property values — ThemeContext.tsx injects the active one onto document.documentElement,
// and every theme-aware storefront component reads them via Tailwind arbitrary-value
// syntax (e.g. bg-[var(--theme-primary)]) rather than a hardcoded color class.
//
// Deliberately data-only (no runtime contrast computation) — *-ink colors are chosen by
// hand per theme for legibility, kept in one flat auditable object per theme rather than
// derived, so a bad contrast pairing is visible here in review rather than computed away.
//
// Scope: these tokens retint what makes a storefront read as a distinct brand (CTA/accent
// color, section background alternation, heading/body typography, corner radius). They do
// NOT touch neutral grays or the semantic success/error/warning colors used for order
// status, stock alerts, form validation, etc. — those stay identical across every theme.

export interface ThemeTokens {
  id: string;
  name: string;
  vibe: string;
  primary: string;
  primaryHover: string;
  primaryInk: string;
  accent: string;
  accentInk: string;
  ink: string;
  body: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  fontHeading: string;
  fontBody: string;
  /** Google Fonts family names actually requested in the <link> — may differ in
   * spacing/casing from fontHeading/fontBody's CSS font-family value. */
  googleFontFamilies: string[];
  radius: string;
}

export const THEMES: ThemeTokens[] = [
  {
    id: "studio-minimal",
    name: "Studio Minimal",
    vibe: "Monochrome boutique",
    primary: "#14110F",
    primaryHover: "#2A2521",
    primaryInk: "#FFFFFF",
    accent: "#B08968",
    accentInk: "#FFFFFF",
    ink: "#14110F",
    body: "#5C5751",
    surface: "#FFFFFF",
    surfaceAlt: "#F5F3EF",
    border: "#E7E3DC",
    fontHeading: "'General Sans', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontFamilies: ["General+Sans:wght@500;700", "Inter:wght@400;500;600"],
    radius: "4px",
  },
  {
    id: "vermillion-utsav",
    name: "Vermillion Utsav",
    vibe: "Festive Indian retail",
    primary: "#D62828",
    primaryHover: "#B01F1F",
    primaryInk: "#FFFFFF",
    accent: "#F4A300",
    accentInk: "#2B0A0A",
    ink: "#2B0A0A",
    body: "#6B4A3A",
    surface: "#FFF9F0",
    surfaceAlt: "#FDEEDC",
    border: "#F2DCC2",
    fontHeading: "'Baloo 2', sans-serif",
    fontBody: "'Mukta', sans-serif",
    googleFontFamilies: ["Baloo+2:wght@600;700", "Mukta:wght@400;500;600"],
    radius: "16px",
  },
  {
    id: "midnight-atelier",
    name: "Midnight Atelier",
    vibe: "Dark luxury",
    primary: "#C9A227",
    primaryHover: "#A6841D",
    primaryInk: "#0B0B0C",
    accent: "#6E1423",
    accentInk: "#F5F1E6",
    ink: "#F5F1E6",
    body: "#B8B3A8",
    surface: "#0B0B0C",
    surfaceAlt: "#17171A",
    border: "#2B2A26",
    fontHeading: "'Cormorant Garamond', serif",
    fontBody: "'Inter', sans-serif",
    googleFontFamilies: ["Cormorant+Garamond:wght@500;600;700", "Inter:wght@400;500"],
    radius: "8px",
  },
  {
    id: "terra-loom",
    name: "Terra & Loom",
    vibe: "Earthy artisan textile",
    primary: "#6B4226",
    primaryHover: "#543319",
    primaryInk: "#FFFFFF",
    accent: "#7D8C5C",
    accentInk: "#FFFFFF",
    ink: "#3B2A1E",
    body: "#6E5C4C",
    surface: "#FBF6EE",
    surfaceAlt: "#EFE6D6",
    border: "#DED0B8",
    fontHeading: "'Lora', serif",
    fontBody: "'Karla', sans-serif",
    googleFontFamilies: ["Lora:wght@500;600;700", "Karla:wght@400;500;600"],
    radius: "8px",
  },
  {
    id: "cobalt-edge",
    name: "Cobalt Edge",
    vibe: "Modern tech-forward",
    primary: "#2547F4",
    primaryHover: "#1B37C4",
    primaryInk: "#FFFFFF",
    accent: "#00D1B2",
    accentInk: "#0B0F19",
    ink: "#0B0F19",
    body: "#4B5165",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F3FB",
    border: "#DDE2F2",
    fontHeading: "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontFamilies: ["Space+Grotesk:wght@500;600;700", "Inter:wght@400;500;600"],
    radius: "4px",
  },
  {
    id: "emerald-heritage",
    name: "Emerald Heritage",
    vibe: "Heritage textile & jewelry",
    primary: "#0B5D45",
    primaryHover: "#084733",
    primaryInk: "#FFFFFF",
    accent: "#C99A3B",
    accentInk: "#0F2620",
    ink: "#0F2620",
    body: "#4C5E58",
    surface: "#F6FAF8",
    surfaceAlt: "#E7F0EB",
    border: "#D3E4DB",
    fontHeading: "'Playfair Display', serif",
    fontBody: "'Source Sans 3', sans-serif",
    googleFontFamilies: ["Playfair+Display:wght@600;700", "Source+Sans+3:wght@400;500;600"],
    radius: "8px",
  },
  {
    id: "blush-atelier",
    name: "Blush Atelier",
    vibe: "Soft pastel boutique",
    primary: "#A6425B",
    primaryHover: "#8A3349",
    primaryInk: "#FFFFFF",
    accent: "#D8B4A0",
    accentInk: "#3A2530",
    ink: "#3A2530",
    body: "#7A6470",
    surface: "#FFF7F8",
    surfaceAlt: "#F7E9EC",
    border: "#EFD6DC",
    fontHeading: "'Prata', serif",
    fontBody: "'Nunito Sans', sans-serif",
    googleFontFamilies: ["Prata", "Nunito+Sans:wght@400;500;600"],
    radius: "16px",
  },
  {
    id: "indigo-mustard",
    name: "Indigo & Mustard",
    vibe: "Artisan craft",
    primary: "#2B2E83",
    primaryHover: "#1F2262",
    primaryInk: "#FFFFFF",
    accent: "#E0A526",
    accentInk: "#1B1B33",
    ink: "#1B1B33",
    body: "#52536B",
    surface: "#FBFAF6",
    surfaceAlt: "#EDEAF6",
    border: "#DCD9EC",
    fontHeading: "'DM Serif Display', serif",
    fontBody: "'DM Sans', sans-serif",
    googleFontFamilies: ["DM+Serif+Display", "DM+Sans:wght@400;500;600"],
    radius: "8px",
  },
  {
    id: "coral-tide",
    name: "Coral Tide",
    vibe: "Coastal resort summer",
    primary: "#FF6F59",
    primaryHover: "#E85641",
    primaryInk: "#FFFFFF",
    accent: "#1C9099",
    accentInk: "#FFFFFF",
    ink: "#1E2B2B",
    body: "#52706E",
    surface: "#F7FDFC",
    surfaceAlt: "#E3F4F1",
    border: "#CDEBE6",
    fontHeading: "'Josefin Sans', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontFamilies: ["Josefin+Sans:wght@500;600;700", "Inter:wght@400;500"],
    radius: "16px",
  },
  {
    id: "charcoal-form",
    name: "Charcoal Form",
    vibe: "Monochrome streetwear",
    primary: "#111111",
    primaryHover: "#000000",
    primaryInk: "#FFFFFF",
    accent: "#D4FF3D",
    accentInk: "#111111",
    ink: "#111111",
    body: "#55565B",
    surface: "#F4F4F2",
    surfaceAlt: "#E6E6E2",
    border: "#D2D2CD",
    fontHeading: "'Archivo Black', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontFamilies: ["Archivo+Black", "Inter:wght@400;500;600"],
    radius: "4px",
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export const getThemeById = (id: string | undefined | null): ThemeTokens =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Maps each ThemeTokens field to the CSS custom property it drives — single source of
 * truth shared by ThemeContext's injection loop and anything that needs to read it back. */
export const THEME_CSS_VARS: Record<keyof Omit<ThemeTokens, "id" | "name" | "vibe" | "googleFontFamilies">, string> = {
  primary: "--theme-primary",
  primaryHover: "--theme-primary-hover",
  primaryInk: "--theme-primary-ink",
  accent: "--theme-accent",
  accentInk: "--theme-accent-ink",
  ink: "--theme-ink",
  body: "--theme-body",
  surface: "--theme-surface",
  surfaceAlt: "--theme-surface-alt",
  border: "--theme-border",
  fontHeading: "--theme-font-heading",
  fontBody: "--theme-font-body",
  radius: "--theme-radius",
};
