// src/pages/static/HelpPage.tsx
// Admin-editable via Content Pages (StaticPagesManager.tsx) → PAGE_HELP AppSetting key.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import { BreadcrumbJsonLd, FaqJsonLd } from "../../components/seo/JsonLd";
import { useStaticPageContent } from "../../utils/staticPagesCache";

export default function HelpPage() {
  const content = useStaticPageContent("help");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo title={content.title || "Help Center"} description="Frequently asked questions and customer support." path="/help" />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: content.title || "Help Center", path: "/help" }]} />
      <FaqJsonLd faqs={content.faqs} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 mt-[var(--app-header-h,5rem)] w-full flex-1">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">{content.title || "Help Center"}</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-gray-100 pb-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
           
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              {content.title || "Help Center"}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Find quick answers to common questions about orders, shipping, and policies.
          </p>
        </div>

        {/* FAQ Accordion List */}
        {content.faqs.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500">No questions added yet. Please check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
            {content.faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={i} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left group cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-gray-900 text-base sm:text-lg group-hover:text-[var(--theme-primary)] transition-colors">
                      {faq.question}
                    </span>
                    <span className={`p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-500 transition-all duration-200 shrink-0 ${isOpen ? "rotate-180 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]" : ""}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-6 pt-1 text-gray-600 text-sm sm:text-base leading-relaxed animate-in fade-in duration-200">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Still have questions prompt */}
        <div className="mt-14 p-6 sm:p-8 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900 text-base">Still need assistance?</h4>
            <p className="text-sm text-gray-600 mt-1">Our support team is always ready to help you with your inquiries.</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm bg-[var(--theme-primary)] text-[var(--theme-primary-ink,#ffffff)] hover:opacity-90 transition-opacity shadow-sm shrink-0"
          >
            Contact Us
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
