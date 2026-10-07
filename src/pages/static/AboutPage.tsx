// src/pages/static/AboutPage.tsx
// Admin-editable via Content Pages (StaticPagesManager.tsx) → PAGE_ABOUT AppSetting key.

import { useEffect, useState } from "react";
import FooterSection from "../../components/FooterSection";
import PageSeo from "../../components/seo/PageSeo";
import api from "../../utils/api";

interface AboutContent {
  title: string;
  body: string;
}

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent | null>(null);

  useEffect(() => {
    api.get("/pages")
      .then(({ data }) => setContent(data.about))
      .catch(() => setContent({ title: "About Us", body: "" }));
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

  const paragraphs = content.body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      <PageSeo title={content.title} description={paragraphs[0]?.slice(0, 160)} path="/about" />
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-16 sm:px-6 lg:px-8 mt-(--app-header-h) w-full flex-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-8">{content.title}</h1>
        <div className="space-y-4 text-gray-600 text-base leading-relaxed">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="text-gray-400">Content coming soon.</p>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
