// src/pages/static/PrivacyPage.tsx
// Admin-editable via Content Pages (StaticPagesManager.tsx) → PAGE_PRIVACY AppSetting key.

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import { BreadcrumbJsonLd } from "../../components/seo/JsonLd";
import { useStaticPageContent } from "../../utils/staticPagesCache";

export default function PrivacyPage() {
  const content = useStaticPageContent("privacy");
  const paragraphs = content.body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo title={content.title || "Privacy Policy"} description={paragraphs[0]?.slice(0, 160)} path="/privacy" noIndex />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: content.title || "Privacy Policy", path: "/privacy" }]} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 mt-[var(--app-header-h,5rem)] w-full flex-1">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">{content.title || "Privacy Policy"}</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-gray-100 pb-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            {content.title || "Privacy Policy"}
          </h1>
        </div>

        {/* Page Content Body */}
        <div className="prose prose-slate max-w-none space-y-6 text-gray-700 text-base sm:text-lg leading-relaxed">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed">
                {p}
              </p>
            ))
          ) : (
            <p className="text-gray-400 italic">Content coming soon.</p>
          )}
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

