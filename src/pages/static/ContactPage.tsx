// src/pages/static/ContactPage.tsx
// Display-only — deliberately no submission form (see the plan this was built from).
// Reads address/phone/email from Company Settings → SEO → Business info (SEO_ORG_*),
// so an admin never fills the same details in twice.

import { MapPin, Phone, Mail } from "lucide-react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import { useSeoSettings } from "../../context/SeoContext";
import { useBranding } from "../../context/BrandingContext";

export default function ContactPage() {
  const { seo } = useSeoSettings();
  const { branding } = useBranding();
  const hasAnyDetail = seo.orgAddress || seo.orgPhone || seo.orgEmail;

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo title="Contact Us" description={seo.pageContactIntro || `Get in touch with ${branding.companyName || "us"}.`} path="/contact" />
      <main className="max-w-2xl mx-auto px-4 pt-8 pb-16 sm:px-6 lg:px-8 mt-(--app-header-h) w-full flex-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-4">Contact Us</h1>
        {seo.pageContactIntro && (
          <p className="text-gray-600 leading-relaxed mb-10">{seo.pageContactIntro}</p>
        )}

        {hasAnyDetail ? (
          <div className="space-y-6">
            {seo.orgAddress && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-gray-700">{seo.orgAddress}</p>
                </div>
              </div>
            )}
            {seo.orgPhone && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                  <a href={`tel:${seo.orgPhone}`} className="text-gray-700 hover:text-[var(--theme-primary)] transition-colors">{seo.orgPhone}</a>
                </div>
              </div>
            )}
            {seo.orgEmail && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                  <a href={`mailto:${seo.orgEmail}`} className="text-gray-700 hover:text-[var(--theme-primary)] transition-colors">{seo.orgEmail}</a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400">Contact details coming soon.</p>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
