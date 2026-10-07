// src/pages/static/HelpPage.tsx
// Admin-editable via Content Pages (StaticPagesManager.tsx) → PAGE_HELP AppSetting key.

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import { BreadcrumbJsonLd, FaqJsonLd } from "../../components/seo/JsonLd";
import api from "../../utils/api";

interface Faq {
  question: string;
  answer: string;
}

interface HelpContent {
  title: string;
  faqs: Faq[];
}

export default function HelpPage() {
  const [content, setContent] = useState<HelpContent | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    api.get("/pages")
      .then(({ data }) => setContent(data.help))
      .catch(() => setContent({ title: "Help Center", faqs: [] }));
  }, []);

  if (!content) {
    return (
      <div className="bg-white min-h-screen font-sans flex flex-col">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-(--app-header-h) w-full flex-1 flex items-center justify-center min-h-[calc(100vh-var(--app-header-h,80px))]">
          <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono text-center select-none">
            Loading...
          </p>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo title={content.title} description="Answers to common questions." path="/help" />
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: content.title, path: "/help" }]} />
      <FaqJsonLd faqs={content.faqs} />
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-16 sm:px-6 lg:px-8 mt-(--app-header-h) w-full flex-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-8">{content.title}</h1>
        {content.faqs.length === 0 ? (
          <p className="text-gray-400">No questions added yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
            {content.faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
