import { resolveAssetUrl } from "./category";

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
};

const normalizeCategoryRef = (category: unknown) => {
  if (!category || typeof category !== "object") return category;

  const raw = category as Record<string, unknown>;
  const id = pickString(raw.id, raw._id);
  const name = pickString(raw.name, raw.title);

  return {
    ...raw,
    ...(id ? { id, _id: id } : {}),
    ...(name ? { name } : {}),
  };
};

export const normalizeProduct = <T extends Record<string, unknown>>(input: T) => {
  const raw = input ?? ({} as T);
  const nested =
    raw && typeof raw._doc === "object" && raw._doc !== null
      ? (raw._doc as Record<string, unknown>)
      : {};

  const id = pickString(raw.id, raw._id, nested.id, nested._id);
  const image = pickString(raw.image, nested.image);
  const images = [...(Array.isArray(raw.images) ? raw.images : []), ...(Array.isArray(nested.images) ? nested.images : [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => resolveAssetUrl(value) ?? value);

  const normalizedCategory = normalizeCategoryRef(raw.category ?? nested.category);

  return {
    ...raw,
    ...nested,
    ...(id ? { id, _id: id } : {}),
    name: pickString(raw.name, nested.name) ?? "",
    image: resolveAssetUrl(image),
    images,
    category: normalizedCategory,
    categoryName:
      pickString(
        raw.categoryName,
        nested.categoryName,
        typeof normalizedCategory === "object" && normalizedCategory !== null
          ? (normalizedCategory as Record<string, unknown>).name
          : undefined,
      ) ?? "",
  };
};

/**
 * Cleanly calculate discounted price and discount amount with smart rounding
 * to eliminate 1-paisa floating point / percentage rounding artifacts
 * (e.g. MRP ₹499 with 23.85% discount resolves to exact ₹119.00 discount and ₹380.00 customer price).
 */
export const calculateDiscountDetails = (price: number | string, discount: number | string) => {
  const p = typeof price === "number" ? price : parseFloat(String(price || 0));
  const d = typeof discount === "number" ? discount : parseFloat(String(discount || 0));

  if (!p || isNaN(p) || p <= 0) {
    return { finalPrice: 0, discountAmount: 0, discountPercent: 0 };
  }
  if (!d || isNaN(d) || d <= 0) {
    return { finalPrice: p, discountAmount: 0, discountPercent: 0 };
  }

  const rawDiscountAmount = (p * d) / 100;
  const rawFinalPrice = p - rawDiscountAmount;

  // If base price is an integer, percentage rounding to 2 decimals can cause an error up to p * 0.00006.
  // Snapping eliminates ugly .99 / .01 floating-point drift while preserving genuine paise.
  const roundFinal = Math.round(rawFinalPrice);
  const maxRoundingArtifact = Number.isInteger(p) ? Math.max(0.05, p * 0.00006) : 0.02;

  let finalPrice: number;
  let discountAmount: number;

  if (Math.abs(rawFinalPrice - roundFinal) <= maxRoundingArtifact) {
    finalPrice = roundFinal;
    discountAmount = Number.isInteger(p) ? Math.round(p - finalPrice) : Math.round((p - finalPrice) * 100) / 100;
  } else {
    finalPrice = Math.round(rawFinalPrice * 100) / 100;
    discountAmount = Math.round((p - finalPrice) * 100) / 100;
  }

  return {
    finalPrice,
    discountAmount,
    discountPercent: d,
  };
};

export const calculateDiscountedPrice = (price: number | string, discount: number | string): number => {
  return calculateDiscountDetails(price, discount).finalPrice;
};

export const calculateDiscountAmount = (price: number | string, discount: number | string): number => {
  return calculateDiscountDetails(price, discount).discountAmount;
};

/**
 * Formats any discount string or number into a standard, clean percentage badge text.
 * Examples:
 *   "20" -> "20% OFF"
 *   20 -> "20% OFF"
 *   "20%" -> "20% OFF"
 *   "20% OFF" -> "20% OFF"
 *   "50" -> "50% OFF"
 *   "FLAT 30%" -> "FLAT 30%"
 */
export const formatDiscountBadge = (discount: string | number | null | undefined): string => {
  if (discount === null || discount === undefined) return "";
  const raw = String(discount).trim();
  if (!raw) return "";

  // Pure numeric string (e.g. "20", "50", 20)
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return `${raw}% OFF`;
  }

  // Percentage without "OFF" (e.g. "20%", "50 %")
  if (/^\d+(\.\d+)?\s*%$/i.test(raw)) {
    return `${raw.replace(/\s*%/g, "")}% OFF`;
  }

  // Already has % OFF with extra spaces (e.g. "20 % off")
  if (/^\d+(\.\d+)?\s*%\s*off$/i.test(raw)) {
    const num = raw.match(/^\d+(\.\d+)?/)?.[0] || "";
    return `${num}% OFF`;
  }

  return raw;
};
