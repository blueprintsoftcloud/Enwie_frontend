import { domainUrl } from "./constant";

const assetBaseUrl = domainUrl.replace(/\/api\/?$/, "");

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
};

export const resolveAssetUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }
  return `${assetBaseUrl}/${value.replace(/^\/+/, "")}`;
};

/**
 * A category may hold direct products OR subcategories, never both at once (enforced
 * server-side in category/product controllers on new writes). `conflict` covers
 * pre-existing categories grandfathered in from before the rule existed.
 */
export type CatalogNodeState = "empty" | "has-subcategories" | "has-products" | "conflict";

export const nodeStateOf = (cat: {
  directProductCount?: number;
  directSubcategoryCount?: number;
}): CatalogNodeState => {
  const hasSub = (cat.directSubcategoryCount ?? 0) > 0;
  const hasProd = (cat.directProductCount ?? 0) > 0;
  if (hasSub && hasProd) return "conflict";
  return hasSub ? "has-subcategories" : hasProd ? "has-products" : "empty";
};

export const normalizeCategory = <T extends Record<string, unknown>>(input: T) => {
  const raw = input ?? ({} as T);
  const nested =
    raw && typeof raw._doc === "object" && raw._doc !== null
      ? (raw._doc as Record<string, unknown>)
      : {};

  const id = pickString(raw.id, raw._id, nested.id, nested._id);
  const image = pickString(raw.image, nested.image);
  // Self-reference — normalized to a plain string id or null, same as `id` above,
  // rather than relying on the raw/nested spread order for a field this load-bearing.
  const parentId = pickString(raw.parentId, nested.parentId) ?? null;

  return {
    ...raw,
    ...nested,
    ...(id ? { id, _id: id } : {}),
    code: pickString(raw.code, nested.code, raw.categoryCode, nested.categoryCode) ?? "",
    name: pickString(raw.name, nested.name, raw.categoryName, nested.categoryName) ?? "",
    description: pickString(raw.description, nested.description) ?? "",
    image: resolveAssetUrl(image),
    parentId,
  };
};
