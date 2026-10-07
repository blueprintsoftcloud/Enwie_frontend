// src/components/seo/PageSeo.tsx
//
// Drop this on every customer-facing page to get a correct per-page <title>,
// meta description, canonical link, and Open Graph/Twitter tags — the single
// biggest gap found in the SEO audit (every page previously shared one static
// title with no description/OG tags at all). Resolves through the store's own
// SEO settings (see SeoContext.tsx) so a brand-new customer gets sane defaults
// without configuring anything, while still being fully overridable per page.

import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "../../context/SeoContext";
import { useBranding } from "../../context/BrandingContext";

interface PageSeoProps {
  /** This page's own title — NOT pre-formatted with the site name; resolveTitle below does that. */
  title: string;
  description?: string;
  /** Absolute or root-relative image URL for social share previews. Falls back to SEO_DEFAULT_OG_IMAGE. */
  image?: string;
  /** Root-relative path for the canonical link, e.g. "/products/507f...". Defaults to the current URL path (no query string). */
  path?: string;
  /** Pages with no standalone SEO value (cart, checkout, account pages) should opt out of indexing. */
  noIndex?: boolean;
}

export default function PageSeo({ title, description, image, path, noIndex }: PageSeoProps) {
  const { seo } = useSeoSettings();
  const { branding } = useBranding();

  const siteName = branding.companyName?.trim() || "Storra";
  let resolvedTitle = title;
  if (seo.titleTemplate) {
    resolvedTitle = seo.titleTemplate.includes("%s")
      ? seo.titleTemplate.replace("%s", title)
      : `${title} | ${seo.titleTemplate}`;
  } else if (siteName) {
    if (title === siteName || title === "Home" || path === "/") {
      resolvedTitle = seo.homeTitle?.trim() || siteName;
    } else {
      resolvedTitle = `${title} | ${siteName}`;
    }
  }

  const resolvedDescription = description?.trim() || seo.defaultDescription || undefined;
  const resolvedImage = image || seo.defaultOgImage || undefined;
  const canonicalPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonicalUrl = typeof window !== "undefined" ? `${window.location.origin}${canonicalPath}` : undefined;
  const faviconHref = branding.companyFavicon?.trim() || "/vite.svg";

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      {faviconHref && (
        <link
          rel="icon"
          type={faviconHref.endsWith(".svg") ? "image/svg+xml" : "image/png"}
          href={faviconHref}
        />
      )}
      {resolvedDescription && <meta name="description" content={resolvedDescription} />}
      {seo.keywords && <meta name="keywords" content={seo.keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={resolvedTitle} />
      {resolvedDescription && <meta property="og:description" content={resolvedDescription} />}
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {siteName && <meta property="og:site_name" content={siteName} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={resolvedImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={resolvedTitle} />
      {resolvedDescription && <meta name="twitter:description" content={resolvedDescription} />}
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
    </Helmet>
  );
}
