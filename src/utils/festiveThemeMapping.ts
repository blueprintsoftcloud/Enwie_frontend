// src/utils/festiveThemeMapping.ts
//
// Maps each celebratory occasion preset to its announcement bar color scheme,
// synchronizing the footer, buttons, and divider line colors across the storefront
// whenever an occasion is active.

export interface FestiveThemeColors {
  primary: string;        // Used for primary action buttons & CTAs
  primaryHover: string;   // Hover state for buttons
  primaryInk: string;     // Text color on primary buttons
  accent: string;         // Accent tags, highlights, and subtle icons
  accentInk: string;      // Text on accent
  border: string;         // Line colors, borders, and dividers
  gradient: string;       // Exact festive announcement bar gradient applied to the footer
  textColor: string;      // Announcement bar text color applied to the footer
  borderColor: string;    // Announcement bar border line color
}

export const FESTIVE_THEME_COLORS: Record<string, FestiveThemeColors> = {
  diwali: {
    primary: "#800e13",
    primaryHover: "#580c14",
    primaryInk: "#fef3c7",
    accent: "#fbbf24",
    accentInk: "#2b0408",
    border: "rgba(245, 158, 11, 0.55)",
    gradient: "linear-gradient(90deg, #2b0408 0%, #580c14 22%, #3d1004 50%, #580c14 78%, #2b0408 100%)",
    textColor: "#fef3c7",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  holi: {
    primary: "#831843",
    primaryHover: "#701a75",
    primaryInk: "#ffffff",
    accent: "#f472b6",
    accentInk: "#4c0519",
    border: "rgba(244, 63, 94, 0.55)",
    gradient: "linear-gradient(90deg, #4c0519 0%, #831843 25%, #701a75 50%, #831843 75%, #4c0519 100%)",
    textColor: "#fdf2f8",
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  eid: {
    primary: "#065f46",
    primaryHover: "#064e3b",
    primaryInk: "#ffffff",
    accent: "#fbbf24",
    accentInk: "#022c22",
    border: "rgba(52, 211, 153, 0.55)",
    gradient: "linear-gradient(90deg, #022c22 0%, #064e3b 25%, #065f46 50%, #064e3b 75%, #022c22 100%)",
    textColor: "#ecfdf5",
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  onam: {
    primary: "#78350f",
    primaryHover: "#542d0c",
    primaryInk: "#ffffff",
    accent: "#facc15",
    accentInk: "#2e1605",
    border: "rgba(245, 158, 11, 0.55)",
    gradient: "linear-gradient(90deg, #2e1605 0%, #542d0c 25%, #78350f 50%, #542d0c 75%, #2e1605 100%)",
    textColor: "#fef3c7",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  "christmas-new-year": {
    primary: "#991b1b",
    primaryHover: "#7f1d1d",
    primaryInk: "#ffffff",
    accent: "#fde047",
    accentInk: "#0f2316",
    border: "rgba(239, 68, 68, 0.55)",
    gradient: "linear-gradient(90deg, #0f2316 0%, #164e2a 25%, #450a0a 50%, #164e2a 75%, #0f2316 100%)",
    textColor: "#fef2f2",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  "wedding-season": {
    primary: "#831843",
    primaryHover: "#6b1446",
    primaryInk: "#ffffff",
    accent: "#fde047",
    accentInk: "#3b0724",
    border: "rgba(251, 113, 133, 0.55)",
    gradient: "linear-gradient(90deg, #3b0724 0%, #6b1446 25%, #4a0d31 50%, #6b1446 75%, #3b0724 100%)",
    textColor: "#fff1f2",
    borderColor: "rgba(251, 113, 133, 0.4)",
  },
  "republic-day": {
    primary: "#1e3a8a",
    primaryHover: "#172554",
    primaryInk: "#ffffff",
    accent: "#fbbf24",
    accentInk: "#1e1b4b",
    border: "rgba(96, 165, 250, 0.55)",
    gradient: "linear-gradient(90deg, #1e1b4b 0%, #1e3a8a 25%, #172554 50%, #1e3a8a 75%, #1e1b4b 100%)",
    textColor: "#eff6ff",
    borderColor: "rgba(96, 165, 250, 0.4)",
  },
  valentines: {
    primary: "#9f1239",
    primaryHover: "#881337",
    primaryInk: "#ffffff",
    accent: "#fda4af",
    accentInk: "#4c0519",
    border: "rgba(244, 63, 94, 0.55)",
    gradient: "linear-gradient(90deg, #4c0519 0%, #881337 25%, #9f1239 50%, #881337 75%, #4c0519 100%)",
    textColor: "#ffffff",
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  "sale-event": {
    primary: "#0f172a",
    primaryHover: "#1e293b",
    primaryInk: "#f8fafc",
    accent: "#f59e0b",
    accentInk: "#0f172a",
    border: "rgba(251, 191, 36, 0.55)",
    gradient: "linear-gradient(90deg, #0f172a 0%, #1e293b 25%, #334155 50%, #1e293b 75%, #0f172a 100%)",
    textColor: "#f8fafc",
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  "summer-coastal": {
    primary: "#0e7490",
    primaryHover: "#083344",
    primaryInk: "#ffffff",
    accent: "#38bdf8",
    accentInk: "#083344",
    border: "rgba(34, 211, 238, 0.55)",
    gradient: "linear-gradient(90deg, #083344 0%, #0e7490 25%, #155e75 50%, #0e7490 75%, #083344 100%)",
    textColor: "#ecfeff",
    borderColor: "rgba(34, 211, 238, 0.4)",
  },
};

export const getFestiveOccasionColors = (occasionId?: string | null): FestiveThemeColors | null => {
  if (!occasionId) return null;
  return FESTIVE_THEME_COLORS[occasionId] || null;
};
