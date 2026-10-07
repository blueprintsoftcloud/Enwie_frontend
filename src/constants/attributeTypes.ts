// src/constants/attributeTypes.ts
// Mirrors backend/src/models/mongoose.ts's AttributeTypeEnum — single source of
// truth for the frontend so CategoryAttributes.tsx (admin CRUD) and
// AttributeFilterPanel.tsx (storefront + admin filtering) don't each hardcode it.

// DATE was added alongside the original five so this stays useful across arbitrary
// business types, not just apparel/vehicle-parts style categorical specs — grocery/
// pharma expiry dates, electronics release/warranty dates, manufacture dates, etc. are
// common product-spec needs that TEXT/NUMBER don't model well (no calendar input, no
// date-shaped validation) even though they'd technically fit as free text.
// RATING and PRICE are informational-only entries (see CategoryAttributes.tsx's
// typeHint): the storefront's Customer Ratings / Price filters are global and always
// shown on every category page (CategoryProductPage.tsx), never per-category or
// per-product like the other types here. Picking one of these just lets an admin
// record "yes, this category has that filter" in the filter list — it doesn't create
// any CategoryAttributeValue rows, isn't tagged onto products (see AddProductModal.tsx
// / Listproducts.tsx's edit form, which filter these two out), and isn't returned by
// getProductFilters to AttributeFilterPanel.
export type AttributeType = "SELECT" | "MULTISELECT" | "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "RATING" | "PRICE";

export const ATTRIBUTE_TYPES: { value: AttributeType; label: string }[] = [
  { value: "SELECT", label: "Select (single pick)" },
  { value: "MULTISELECT", label: "Multi-Select (multiple picks)" },
  { value: "TEXT", label: "Text (free input)" },
  { value: "NUMBER", label: "Number (free input)" },
  { value: "DATE", label: "Date (e.g. expiry, manufactured)" },
  { value: "BOOLEAN", label: "Boolean (Yes / No)" },
  { value: "RATING", label: "Rating (built-in, global)" },
  { value: "PRICE", label: "Price Range (built-in, global)" },
];
