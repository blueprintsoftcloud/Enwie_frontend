// src/components/seo/JsonLd.tsx
//
// schema.org structured data — this is what unlocks Google rich results (price/
// availability snippets on Product, breadcrumb trails in search results). None of
// this existed before (see the SEO audit): zero JSON-LD anywhere in the app.
// Render these as SIBLINGS of <PageSeo>, not children — react-helmet-async's <Helmet>
// only accepts raw DOM tag children (title/meta/script/...), not React components, so
// each of these wraps its own <script> in its own <Helmet> instance. Multiple Helmet
// instances anywhere in the tree merge into one <head> automatically.

import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "../../context/SeoContext";
import { useBranding } from "../../context/BrandingContext";

const jsonLdScript = (data: object) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(data)}</script>
  </Helmet>
);

/** Render once, on the homepage — establishes the store as an Organization/WebSite for search engines. */
export function OrganizationJsonLd() {
  const { seo } = useSeoSettings();
  const { branding } = useBranding();
  if (typeof window === "undefined" || !branding.companyName) return null;

  const origin = window.location.origin;
  const orgData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": seo.orgType || "Organization",
    name: branding.companyName,
    url: origin,
  };
  if (branding.companyLogo) orgData.logo = branding.companyLogo;
  if (seo.orgAddress) orgData.address = seo.orgAddress;
  if (seo.orgPhone) orgData.telephone = seo.orgPhone;
  if (seo.orgEmail) orgData.email = seo.orgEmail;
  if (seo.socialLinks.length) orgData.sameAs = seo.socialLinks;

  const websiteData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.companyName || "Storra",
    alternateName: [branding.companyName || "Storra"],
    url: origin,
  };

  return (
    <>
      {jsonLdScript(orgData)}
      {jsonLdScript(websiteData)}
    </>
  );
}

interface ProductJsonLdProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    brand?: string | null;
    code: string;
    price: number;
    image?: string | null;
    images?: string[];
    inStock?: boolean;
    rating?: number;
    numReviews?: number;
  };
}

/** Render on the product detail page — drives Google's price/availability/rating rich results. */
export function ProductJsonLd({ product }: ProductJsonLdProps) {
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;
  const images = [product.image, ...(product.images ?? [])].filter(Boolean);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code,
    url: `${origin}/products/${product.id}`,
  };
  if (product.description) data.description = product.description;
  if (product.brand) data.brand = { "@type": "Brand", name: product.brand };
  if (images.length) data.image = images;
  data.offers = {
    "@type": "Offer",
    priceCurrency: "INR",
    price: product.price,
    availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    url: `${origin}/products/${product.id}`,
  };
  if (product.rating && product.numReviews) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.numReviews,
    };
  }

  return jsonLdScript(data);
}

/** Render on product/category pages so search results can show the page's position in site navigation. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  if (typeof window === "undefined" || items.length === 0) return null;
  const origin = window.location.origin;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };

  return jsonLdScript(data);
}

/** Render on the Help Center page — drives Google's FAQ rich results (expandable Q&A
 * directly in search results). */
export function FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (faqs.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return jsonLdScript(data);
}
