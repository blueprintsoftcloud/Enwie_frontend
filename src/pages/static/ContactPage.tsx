// src/pages/static/ContactPage.tsx
// Display-only — deliberately no submission form (see the plan this was built from).
// Reads address/phone/email from Company Settings → SEO → Business info (SEO_ORG_*),
// so an admin never fills the same details in twice.

import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, ChevronRight, MessageSquare } from "lucide-react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import { BreadcrumbJsonLd } from "../../components/seo/JsonLd";
import { useSeoSettings } from "../../context/SeoContext";
import { useBranding } from "../../context/BrandingContext";

export default function ContactPage() {
  const { seo } = useSeoSettings();
  const { branding } = useBranding();
  const hasAnyDetail = seo.orgAddress || seo.orgPhone || seo.orgEmail;

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo
        title="Contact Us"
        description={seo.pageContactIntro || `Get in touch with ${branding.companyName || "us"}.`}
        path="/contact"
      />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Contact Us", path: "/contact" }]} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 mt-[var(--app-header-h,5rem)] w-full flex-1">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900">Contact Us</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-gray-100 pb-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
           
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Contact Us
            </h1>
          </div>
          <p className="text-base text-gray-600 mt-2 max-w-2xl leading-relaxed">
            {seo.pageContactIntro || `We would love to hear from you. Reach out to our team with any questions, inquiries, or feedback.`}
          </p>
        </div>

        {/* Contact Info Cards */}
        {hasAnyDetail ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {seo.orgAddress && (
              <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0 mb-4 text-[var(--theme-primary)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Our Address</p>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line flex-1">{seo.orgAddress}</p>
              </div>
            )}

            {seo.orgPhone && (
              <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0 mb-4 text-[var(--theme-primary)]">
                  <Phone className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Call Us</p>
                <a
                  href={`tel:${seo.orgPhone}`}
                  className="text-gray-800 text-sm font-semibold hover:text-[var(--theme-primary)] transition-colors mt-auto"
                >
                  {seo.orgPhone}
                </a>
              </div>
            )}

            {seo.orgEmail && (
              <div className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0 mb-4 text-[var(--theme-primary)]">
                  <Mail className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Support</p>
                <a
                  href={`mailto:${seo.orgEmail}`}
                  className="text-gray-800 text-sm font-semibold hover:text-[var(--theme-primary)] transition-colors mt-auto break-all"
                >
                  {seo.orgEmail}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500">Contact information will be available soon.</p>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
}
