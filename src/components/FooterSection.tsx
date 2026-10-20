import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useBranding } from "../context/BrandingContext";
import { useTheme } from "../context/ThemeContext";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FooterLinkItem {
  label: string;
  url: string;
}

interface FooterLinkColumn {
  heading: string;
  links: FooterLinkItem[];
}

interface FooterTemplateData {
  tagline: string;
  showCompanyName?: boolean;
  newsletterTitle?: string;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  /** Templates 1/2/3/5/6's "Shop / Company / Support"-style link grid — always exactly
   * 3 columns to match those templates' fixed layouts. Template 4 has no link grid by
   * design and ignores this. Falls back to DEFAULT_LINK_COLUMNS when unset (a config
   * saved before this field existed), so nothing breaks for an existing store. */
  linkColumns?: FooterLinkColumn[];
}

const DEFAULT_LINK_COLUMNS: FooterLinkColumn[] = [
  { heading: "Shop", links: [{ label: "New Arrivals", url: "/products" }, { label: "Best Sellers", url: "/products" }] },
  { heading: "Company", links: [{ label: "Our Story", url: "/about" }, { label: "Terms & Conditions", url: "/terms" }] },
  { heading: "Support", links: [{ label: "Help Center", url: "/help" }, { label: "Contact Us", url: "/contact" }] },
];

interface FooterConfig {
  activeTemplate: 1 | 2 | 3 | 4 | 5 | 6;
  templates: {
    "1": FooterTemplateData;
    "2": FooterTemplateData;
    "3": FooterTemplateData;
    "4": FooterTemplateData;
    "5": FooterTemplateData;
    "6": FooterTemplateData;
  };
}

const DEFAULT_CONFIG: FooterConfig = {
  activeTemplate: 1,
  templates: {
    "1": {
      tagline: "We are a design house dedicated to the art of Indian textile. Our mission is to keep the loom alive while dressing the future.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
    "2": {
      tagline: "Crafting timeless Indian fashion for the modern world.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
    "3": {
      tagline: "From our looms to your wardrobe — authentically Indian.",
      newsletterTitle: "Stay in the loop",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
    "4": {
      tagline: "Thank you for being part of our story.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
    "5": {
      tagline: "Celebrate the season with us.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
    "6": {
      tagline: "Designed with care, worn with pride.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      mailLink: "info@yourbrand.com",
    },
  },
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const FOOTER_LINK_CLASS = "hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1 group w-fit";
const FooterLink = ({ href, children }: { href?: string; children: React.ReactNode }) => {
  const arrow = <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />;
  // Root-relative URLs (our own pages) use SPA navigation; anything else (external,
  // mailto:, "#" placeholder) stays a plain anchor.
  return (
    <li>
      {href && href.startsWith("/") ? (
        <Link to={href} className={FOOTER_LINK_CLASS}>{children}{arrow}</Link>
      ) : (
        <a href={href || "#"} className={FOOTER_LINK_CLASS}>{children}{arrow}</a>
      )}
    </li>
  );
};

// Shared 3-column link grid used by Templates 1/2/3/5/6 — each renders it with its own
// heading/link text styling classes, so this only owns the data-driven .map(), not markup.
const LinkColumns = ({
  columns,
  headingClassName,
  linkClassName,
}: {
  columns?: FooterLinkColumn[];
  headingClassName: string;
  linkClassName: string;
}) => {
  const cols = columns && columns.length > 0 ? columns : DEFAULT_LINK_COLUMNS;
  return (
    <>
      {cols.map((col, i) => (
        <div key={i}>
          <h5 className={headingClassName}>{col.heading}</h5>
          <ul className={linkClassName}>
            {col.links.map((link, j) => (
              <FooterLink key={j} href={link.url}>{link.label}</FooterLink>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
};

const InstagramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 448 512"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path
      fill="url(#igGradient)"
      d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"
    />
  </svg>
);

const FacebookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 320 512"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      fill="#0866FF"
      d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z"
    />
  </svg>
);

const GmailIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    viewBox="52 42 88 66"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
    <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
    <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
    <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
    <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
  </svg>
);

type SocialPlatform = "instagram" | "facebook" | "mail";

interface SocialIconProps {
  platform: SocialPlatform;
  href?: string;
}

const SocialIcon = ({ platform, href }: SocialIconProps) => {
  if (!href || !href.trim()) return null;

  const resolvedHref =
    platform === "mail"
      ? href.startsWith("mailto:")
        ? href
        : `mailto:${href}`
      : href;

  let iconElement: React.ReactNode = null;
  let label = "";

  switch (platform) {
    case "instagram":
      iconElement = (
        <InstagramIcon className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-120 group-hover:drop-shadow-[0_4px_12px_rgba(225,48,108,0.45)]" />
      );
      label = "Instagram";
      break;
    case "facebook":
      iconElement = (
        <FacebookIcon className="w-5 h-5.5 transition-transform duration-300 group-hover:scale-120 group-hover:drop-shadow-[0_4px_12px_rgba(8,102,255,0.45)]" />
      );
      label = "Facebook";
      break;
    case "mail":
      iconElement = (
        <GmailIcon className="w-6 h-auto transition-transform duration-300 group-hover:scale-120 group-hover:drop-shadow-[0_4px_12px_rgba(234,67,53,0.45)]" />
      );
      label = "Gmail";
      break;
  }

  return (
    <a
      href={resolvedHref}
      target={platform === "mail" ? undefined : "_blank"}
      rel={platform === "mail" ? undefined : "noopener noreferrer"}
      aria-label={label}
      className="group inline-flex items-center justify-center p-1.5 transition-all duration-200 active:scale-95"
    >
      {iconElement}
    </a>
  );
};

// ─── Template 1: Dark Professional ────────────────────────────────────────────

function Template1({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink, linkColumns,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-[#0a0a0a] text-white border-t border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3.5">
              {logoSrc && (
                <div className="bg-white rounded-xl p-2 shadow-sm inline-flex items-center justify-center shrink-0">
                  <img src={logoSrc} alt={companyName} className="h-8 w-auto max-w-[160px] object-contain" />
                </div>
              )}
              {(showCompanyName !== false || !logoSrc) && companyName && (
                <h4 className="text-3xl font-bold tracking-tighter uppercase">{companyName}</h4>
              )}
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">{tagline}</p>
            <div className="flex items-center gap-3">
              <SocialIcon platform="instagram" href={instagramLink} />
              <SocialIcon platform="facebook" href={facebookLink} />
              <SocialIcon platform="mail" href={mailLink} />
            </div>
          </div>
          <LinkColumns columns={linkColumns} headingClassName="font-bold mb-6 text-white" linkClassName="space-y-4 text-sm text-white/60" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-xs text-white/30">
          <p>© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Template 2: Light Editorial ──────────────────────────────────────────────

function Template2({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink, linkColumns,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-gray-50 text-gray-800 border-t border-gray-200">
      <div className="border-b border-gray-200 py-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoSrc && <img src={logoSrc} alt={companyName} className="h-12 w-auto object-contain" />}
            {(showCompanyName !== false || !logoSrc) && companyName && (
              <div>
                <h4 className="text-2xl font-black tracking-tight text-gray-900 uppercase">{companyName}</h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Authentic Indian Fashion</p>
              </div>
            )}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm text-center md:text-right">{tagline}</p>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <LinkColumns columns={linkColumns} headingClassName="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5" linkClassName="space-y-3 text-sm text-gray-700" />
          <div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Follow</h5>
            <div className="flex flex-wrap items-center gap-2.5">
              <SocialIcon platform="instagram" href={instagramLink} />
              <SocialIcon platform="facebook" href={facebookLink} />
              <SocialIcon platform="mail" href={mailLink} />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
          <p>© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
          <div className="flex gap-6 mt-3 sm:mt-0">
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Template 3: Gradient Accent with Newsletter ──────────────────────────────

function Template3({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink, linkColumns,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  newsletterTitle?: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-gradient-to-br from-indigo-950 via-slate-900 to-gray-950 text-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3.5">
              {logoSrc && (
                <div className="bg-white rounded-xl p-2 shadow-sm inline-flex items-center justify-center shrink-0">
                  <img src={logoSrc} alt={companyName} className="h-8 w-auto max-w-[160px] object-contain" />
                </div>
              )}
              {(showCompanyName !== false || !logoSrc) && companyName && (
                <h4 className="text-2xl font-black tracking-tighter uppercase text-white">{companyName}</h4>
              )}
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-sm">{tagline}</p>
            <div className="flex items-center gap-3">
              <SocialIcon platform="instagram" href={instagramLink} />
              <SocialIcon platform="facebook" href={facebookLink} />
              <SocialIcon platform="mail" href={mailLink} />
            </div>
          </div>
          <LinkColumns columns={linkColumns} headingClassName="text-xs font-bold uppercase tracking-widest text-[var(--theme-accent)] mb-6" linkClassName="space-y-4 text-sm text-white/55" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center text-xs text-white/30">
          <p>© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
          <div className="flex gap-6 mt-3 sm:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Template 4: Minimal Centered ──────────────────────────────────────────────
// Single centered column — logo, tagline, socials, copyright. No link columns at all,
// pairs naturally with Hero's Template 7 (Minimal Statement) for a stripped-down store.

function Template4({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-white text-gray-800 border-t border-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 lg:py-20 flex flex-col items-center text-center">
        {logoSrc && <img src={logoSrc} alt={companyName} className="h-10 w-auto object-contain mb-4" />}
        {(showCompanyName !== false || !logoSrc) && companyName && (
          <h4 className="text-xl font-bold tracking-tight text-gray-900 uppercase mb-3">{companyName}</h4>
        )}
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mb-8">{tagline}</p>
        <div className="flex items-center gap-3 mb-10">
          <SocialIcon platform="instagram" href={instagramLink} />
          <SocialIcon platform="facebook" href={facebookLink} />
          <SocialIcon platform="mail" href={mailLink} />
        </div>
        <div className="flex gap-6 text-xs text-gray-400 mb-6">
          <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Cookies</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Contact Us</a>
        </div>
        <p className="text-xs text-gray-400">© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ─── Template 5: Festive Accent Band ───────────────────────────────────────────
// A solid theme-primary band, bold centered branding — the footer equivalent of Hero's
// Template 6 (Diagonal Split), for occasion presets that want the brand color carried
// all the way to the bottom of the page.

function Template5({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink, linkColumns,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-[var(--theme-primary)] text-[var(--theme-primary-ink)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10 mb-12">
          <div className="text-center md:text-left">
            {logoSrc && (
              <div className="inline-flex items-center justify-center p-2.5 bg-white rounded-xl shadow-sm mb-4 mx-auto md:mx-0">
                <img src={logoSrc} alt={companyName} className="h-9 w-auto max-w-[180px] object-contain" />
              </div>
            )}
            {(showCompanyName !== false || !logoSrc) && companyName && (
              <h4 className="text-2xl font-black tracking-tighter uppercase mb-3">{companyName}</h4>
            )}
            <p className="text-[var(--theme-primary-ink)]/75 text-sm leading-relaxed max-w-sm">{tagline}</p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-center md:text-left">
            <LinkColumns columns={linkColumns} headingClassName="text-xs font-bold uppercase tracking-widest text-[var(--theme-primary-ink)]/60 mb-4" linkClassName="space-y-3 text-sm text-[var(--theme-primary-ink)]/85" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-[var(--theme-primary-ink)]/15">
          <div className="flex items-center gap-3">
            <SocialIcon platform="instagram" href={instagramLink} />
            <SocialIcon platform="facebook" href={facebookLink} />
            <SocialIcon platform="mail" href={mailLink} />
          </div>
          <p className="text-xs text-[var(--theme-primary-ink)]/60">© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Template 6: Split Statement ───────────────────────────────────────────────
// Large brand statement on the left, compact link columns + socials on the right —
// an asymmetric layout distinct from Template1/Template2's even grids.

function Template6({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, mailLink, linkColumns,
  showCompanyName = true,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
  showCompanyName?: boolean;
}) {
  return (
    <footer className="bg-white text-gray-800 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              {logoSrc && <img src={logoSrc} alt={companyName} className="h-10 w-auto object-contain" />}
              {(showCompanyName !== false || !logoSrc) && companyName && (
                <span className="text-xl font-black uppercase tracking-tight text-gray-900">
                  {companyName}
                </span>
              )}
            </div>
            <h4 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 leading-tight max-w-lg">
              {tagline}
            </h4>
            <div className="flex items-center gap-3 pt-2">
              <SocialIcon platform="instagram" href={instagramLink} />
              <SocialIcon platform="facebook" href={facebookLink} />
              <SocialIcon platform="mail" href={mailLink} />
            </div>
          </div>
          <div className="lg:col-span-6 grid grid-cols-3 gap-6 sm:gap-10">
            <LinkColumns
              columns={linkColumns}
              headingClassName="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4"
              linkClassName="space-y-3 text-sm text-gray-700"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
          <p>© {currentYear}{companyName ? ` ${companyName}` : ""}. All rights reserved.</p>
          <div className="flex gap-6 mt-3 sm:mt-0">
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main FooterSection ────────────────────────────────────────────────────────

const FooterSection = () => {
  const { branding } = useBranding();
  const { activeOccasion, activeFestiveColors } = useTheme();
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    api
      .get("/home-banners/homepage-config")
      .then(({ data }) => {
        if (data?.footerConfig) {
          setFooterConfig({
            activeTemplate: data.footerConfig.activeTemplate ?? DEFAULT_CONFIG.activeTemplate,
            templates: {
              "1": { ...DEFAULT_CONFIG.templates["1"], ...data.footerConfig.templates?.["1"] },
              "2": { ...DEFAULT_CONFIG.templates["2"], ...data.footerConfig.templates?.["2"] },
              "3": { ...DEFAULT_CONFIG.templates["3"], ...data.footerConfig.templates?.["3"] },
              "4": { ...DEFAULT_CONFIG.templates["4"], ...data.footerConfig.templates?.["4"] },
              "5": { ...DEFAULT_CONFIG.templates["5"], ...data.footerConfig.templates?.["5"] },
              "6": { ...DEFAULT_CONFIG.templates["6"], ...data.footerConfig.templates?.["6"] },
            },
          });
        }
      })
      .catch(() => {});
  }, []);

  const companyName = branding.companyName || "";
  const logoSrc = branding.companyLogo
    ? branding.companyLogo.startsWith("http")
      ? branding.companyLogo
      : `${domainUrl}/${branding.companyLogo}`
    : null;

  const active = String(footerConfig.activeTemplate) as "1" | "2" | "3" | "4" | "5" | "6";
  const templateData = footerConfig.templates[active] ?? footerConfig.templates["1"];
  const tagline = templateData.tagline || branding.companyTagline || "";
  const currentYear = new Date().getFullYear();

  // If the footer template has an explicit preference, use it;
  // otherwise respect the global branding.showCompanyName setting.
  const showCompanyName =
    templateData.showCompanyName !== undefined
      ? templateData.showCompanyName
      : branding.showCompanyName;

  const renderTemplate = () => {
    switch (footerConfig.activeTemplate) {
      case 2:
        return (
          <Template2
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            linkColumns={templateData.linkColumns}
            showCompanyName={showCompanyName}
          />
        );
      case 3:
        return (
          <Template3
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            linkColumns={templateData.linkColumns}
            showCompanyName={showCompanyName}
          />
        );
      case 4:
        return (
          <Template4
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            showCompanyName={showCompanyName}
          />
        );
      case 5:
        return (
          <Template5
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            linkColumns={templateData.linkColumns}
            showCompanyName={showCompanyName}
          />
        );
      case 6:
        return (
          <Template6
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            linkColumns={templateData.linkColumns}
            showCompanyName={showCompanyName}
          />
        );
      default:
        return (
          <Template1
            companyName={companyName}
            logoSrc={logoSrc}
            tagline={tagline}
            currentYear={currentYear}
            instagramLink={templateData.instagramLink}
            facebookLink={templateData.facebookLink}
            mailLink={templateData.mailLink}
            linkColumns={templateData.linkColumns}
            showCompanyName={showCompanyName}
          />
        );
    }
  };

  // If a celebratory occasion is active, style the footer with the announcement bar's
  // exact festive gradient, glowing border line, text, and accent styling.
  if (activeOccasion && activeFestiveColors) {
    return (
      <div
        className="festive-footer-wrapper relative overflow-hidden"
        style={{
          background: activeFestiveColors.gradient,
          borderTop: `2px solid ${activeFestiveColors.borderColor}`,
          color: activeFestiveColors.textColor,
        }}
      >
        {/* Subtle festive shimmer overlay matching the announcement bar */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          {renderTemplate()}
        </div>
      </div>
    );
  }

  return renderTemplate();
};

export default FooterSection;
