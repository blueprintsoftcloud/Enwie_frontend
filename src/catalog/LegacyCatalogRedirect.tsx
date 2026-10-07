// src/catalog/LegacyCatalogRedirect.tsx
// Category Management and Product Management merged into one unified "Catalog
// Management" browser (see categories/Listcategory.tsx) — this keeps the old
// /manage-categories/* and /manage-products/* URLs (bookmarks, muscle memory)
// working by redirecting them to their /manage-catalog/* equivalent.

import { Navigate, useLocation, useParams } from "react-router-dom";

interface LegacyCatalogRedirectProps {
  /** Path suffix (after the dashboard prefix) to redirect to, e.g. "manage-catalog"
   * or "manage-catalog/attributes/:categoryId" — ":categoryId" is substituted from
   * the current route's own :categoryId param, if present. */
  toSuffix: string;
}

export default function LegacyCatalogRedirect({ toSuffix }: LegacyCatalogRedirectProps) {
  const location = useLocation();
  const params = useParams<{ categoryId?: string }>();
  const dashPrefix = location.pathname.split("/").slice(0, 2).join("/");
  const resolvedSuffix = params.categoryId ? toSuffix.replace(":categoryId", params.categoryId) : toSuffix;
  return <Navigate to={`${dashPrefix}/${resolvedSuffix}`} replace state={location.state} />;
}
