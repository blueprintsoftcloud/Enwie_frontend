import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  LucideProps,
  Send,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";
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
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "2": {
      tagline: "Crafting timeless Indian fashion for the modern world.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "3": {
      tagline: "From our looms to your wardrobe — authentically Indian.",
      newsletterTitle: "Stay in the loop",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "4": {
      tagline: "Thank you for being part of our story.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "5": {
      tagline: "Celebrate the season with us.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
      mailLink: "info@yourbrand.com",
    },
    "6": {
      tagline: "Designed with care, worn with pride.",
      instagramLink: "https://instagram.com",
      facebookLink: "https://facebook.com",
      twitterLink: "https://twitter.com",
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

const SocialIcon = ({ Icon, href, dark }: { Icon: React.FC<LucideProps>; href?: string; dark?: boolean }) => {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
        dark
          ? "border-white/20 text-white hover:bg-white hover:text-black"
          : "border-gray-300 text-gray-600 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] hover:border-[var(--theme-primary)]"
      }`}
    >
      <Icon className="w-5 h-5" />
    </a>
  );
};

// ─── Template 1: Dark Professional ────────────────────────────────────────────

function Template1({
  companyName, logoSrc, tagline, currentYear,
  instagramLink, facebookLink, twitterLink, mailLink, linkColumns,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
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
              <h4 className="text-3xl font-bold tracking-tighter uppercase">{companyName}</h4>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">{tagline}</p>
            <div className="flex gap-4">
              <SocialIcon Icon={Instagram} href={instagramLink} dark />
              <SocialIcon Icon={Facebook} href={facebookLink} dark />
              <SocialIcon Icon={Twitter} href={twitterLink} dark />
              <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} dark />
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
  instagramLink, facebookLink, twitterLink, mailLink, linkColumns,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
}) {
  return (
    <footer className="bg-gray-50 text-gray-800 border-t border-gray-200">
      <div className="border-b border-gray-200 py-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoSrc && <img src={logoSrc} alt={companyName} className="h-12 w-auto object-contain" />}
            <div>
              <h4 className="text-2xl font-black tracking-tight text-gray-900 uppercase">{companyName}</h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Authentic Indian Fashion</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm text-center md:text-right">{tagline}</p>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <LinkColumns columns={linkColumns} headingClassName="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5" linkClassName="space-y-3 text-sm text-gray-700" />
          <div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Follow</h5>
            <div className="flex flex-wrap gap-2">
              <SocialIcon Icon={Instagram} href={instagramLink} />
              <SocialIcon Icon={Facebook} href={facebookLink} />
              <SocialIcon Icon={Twitter} href={twitterLink} />
              <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} />
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
  instagramLink, facebookLink, twitterLink, mailLink, linkColumns,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  newsletterTitle?: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
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
              <h4 className="text-2xl font-black tracking-tighter uppercase text-white">{companyName}</h4>
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-sm">{tagline}</p>
            <div className="flex gap-3">
              <SocialIcon Icon={Instagram} href={instagramLink} dark />
              <SocialIcon Icon={Facebook} href={facebookLink} dark />
              <SocialIcon Icon={Twitter} href={twitterLink} dark />
              <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} dark />
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
  instagramLink, facebookLink, twitterLink, mailLink,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
}) {
  return (
    <footer className="bg-white text-gray-800 border-t border-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 lg:py-20 flex flex-col items-center text-center">
        {logoSrc && <img src={logoSrc} alt={companyName} className="h-10 w-auto object-contain mb-4" />}
        <h4 className="text-xl font-bold tracking-tight text-gray-900 uppercase mb-3">{companyName}</h4>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mb-8">{tagline}</p>
        <div className="flex gap-3 mb-10">
          <SocialIcon Icon={Instagram} href={instagramLink} />
          <SocialIcon Icon={Facebook} href={facebookLink} />
          <SocialIcon Icon={Twitter} href={twitterLink} />
          <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} />
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
  instagramLink, facebookLink, twitterLink, mailLink, linkColumns,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
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
            <h4 className="text-2xl font-black tracking-tighter uppercase mb-3">{companyName}</h4>
            <p className="text-[var(--theme-primary-ink)]/75 text-sm leading-relaxed max-w-sm">{tagline}</p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-center md:text-left">
            <LinkColumns columns={linkColumns} headingClassName="text-xs font-bold uppercase tracking-widest text-[var(--theme-primary-ink)]/60 mb-4" linkClassName="space-y-3 text-sm text-[var(--theme-primary-ink)]/85" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-[var(--theme-primary-ink)]/15">
          <div className="flex gap-3">
            <SocialIcon Icon={Instagram} href={instagramLink} dark />
            <SocialIcon Icon={Facebook} href={facebookLink} dark />
            <SocialIcon Icon={Twitter} href={twitterLink} dark />
            <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} dark />
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
  instagramLink, facebookLink, twitterLink, mailLink, linkColumns,
}: {
  companyName: string;
  logoSrc: string | null;
  tagline: string;
  currentYear: number;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
  mailLink?: string;
  linkColumns?: FooterLinkColumn[];
}) {
  return (
    <footer className="bg-white text-gray-800 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              {logoSrc && <img src={logoSrc} alt={companyName} className="h-10 w-auto object-contain" />}
              {companyName && (
                <span className="text-xl font-black uppercase tracking-tight text-gray-900">
                  {companyName}
                </span>
              )}
            </div>
            <h4 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 leading-tight max-w-lg">
              {tagline}
            </h4>
            <div className="flex gap-3 pt-2">
              <SocialIcon Icon={Instagram} href={instagramLink} />
              <SocialIcon Icon={Facebook} href={facebookLink} />
              <SocialIcon Icon={Twitter} href={twitterLink} />
              <SocialIcon Icon={Mail} href={mailLink ? (mailLink.startsWith("mailto:") ? mailLink : `mailto:${mailLink}`) : undefined} />
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

  if (footerConfig.activeTemplate === 2)
    return (
      <Template2
        companyName={companyName}
        logoSrc={logoSrc}
        tagline={tagline}
        currentYear={currentYear}
        instagramLink={templateData.instagramLink}
        facebookLink={templateData.facebookLink}
        twitterLink={templateData.twitterLink}
        mailLink={templateData.mailLink}
        linkColumns={templateData.linkColumns}
      />
    );
  if (footerConfig.activeTemplate === 3)
    return (
      <Template3
        companyName={companyName}
        logoSrc={logoSrc}
        tagline={tagline}
        currentYear={currentYear}
        instagramLink={templateData.instagramLink}
        facebookLink={templateData.facebookLink}
        twitterLink={templateData.twitterLink}
        mailLink={templateData.mailLink}
        linkColumns={templateData.linkColumns}
      />
    );
  if (footerConfig.activeTemplate === 4)
    return (
      <Template4
        companyName={companyName}
        logoSrc={logoSrc}
        tagline={tagline}
        currentYear={currentYear}
        instagramLink={templateData.instagramLink}
        facebookLink={templateData.facebookLink}
        twitterLink={templateData.twitterLink}
        mailLink={templateData.mailLink}
      />
    );
  if (footerConfig.activeTemplate === 5)
    return (
      <Template5
        companyName={companyName}
        logoSrc={logoSrc}
        tagline={tagline}
        currentYear={currentYear}
        instagramLink={templateData.instagramLink}
        facebookLink={templateData.facebookLink}
        twitterLink={templateData.twitterLink}
        mailLink={templateData.mailLink}
        linkColumns={templateData.linkColumns}
      />
    );
  if (footerConfig.activeTemplate === 6)
    return (
      <Template6
        companyName={companyName}
        logoSrc={logoSrc}
        tagline={tagline}
        currentYear={currentYear}
        instagramLink={templateData.instagramLink}
        facebookLink={templateData.facebookLink}
        twitterLink={templateData.twitterLink}
        mailLink={templateData.mailLink}
        linkColumns={templateData.linkColumns}
      />
    );
  return (
    <Template1
      companyName={companyName}
      logoSrc={logoSrc}
      tagline={tagline}
      currentYear={currentYear}
      instagramLink={templateData.instagramLink}
      facebookLink={templateData.facebookLink}
      twitterLink={templateData.twitterLink}
      mailLink={templateData.mailLink}
      linkColumns={templateData.linkColumns}
    />
  );
};

export default FooterSection;
