// src/dashboard/StaticPagesManager.tsx
//
// Admin editor for the four standalone content pages (About Us / Terms & Conditions /
// Help Center / Contact Us) — see backend/src/controllers/staticPages.controller.ts.
// Deliberately a standalone page rather than a new Homepage Manager tab: that file
// already covers a distinct concern (homepage *section layout*), this covers
// standalone *page content*. Contact Us has no fields of its own here — it reuses the
// SEO business-info fields (Company Settings → SEO → Business info), linked below,
// so an admin never enters the same address/phone/email in two places.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DocumentTextIcon, PlusIcon, TrashIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import { useStaffPermissions } from "../context/StaffPermissionContext";

interface TextPageContent {
  title: string;
  body: string;
}
interface Faq {
  question: string;
  answer: string;
}
interface HelpContent {
  title: string;
  faqs: Faq[];
}

const NO_PERMISSION_MSG = "You don't have permission to make changes here — ask an admin to grant it.";

const emptyText: TextPageContent = { title: "", body: "" };
const emptyHelp: HelpContent = { title: "", faqs: [] };

export default function StaticPagesManager() {
  const { hasPermission } = useStaffPermissions();
  const canEdit = hasPermission("BANNER_EDIT");

  const [loading, setLoading] = useState(true);
  const [about, setAbout] = useState<TextPageContent>(emptyText);
  const [terms, setTerms] = useState<TextPageContent>(emptyText);
  const [help, setHelp] = useState<HelpContent>(emptyHelp);
  const [savingPage, setSavingPage] = useState<string | null>(null);

  useEffect(() => {
    api.get("/pages")
      .then(({ data }) => {
        setAbout(data.about ?? emptyText);
        setTerms(data.terms ?? emptyText);
        setHelp(data.help ?? emptyHelp);
      })
      .catch(() => toast.error("Failed to load content pages"))
      .finally(() => setLoading(false));
  }, []);

  const savePage = async (page: "about" | "terms" | "help", content: object) => {
    if (!canEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      setSavingPage(page);
      await api.put(`/pages/${page}`, content);
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSavingPage(null);
    }
  };

  const addFaq = () => setHelp((p) => ({ ...p, faqs: [...p.faqs, { question: "", answer: "" }] }));
  const removeFaq = (i: number) => setHelp((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }));
  const updateFaq = (i: number, patch: Partial<Faq>) =>
    setHelp((p) => ({ ...p, faqs: p.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono text-center select-none">
          Loading pages...
        </p>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Content Pages</h1>
        <p className="text-sm text-slate-500 mt-1">Edit the storefront's About Us, Terms &amp; Conditions, and Help Center pages — these are what your footer's "Company"/"Support" links point to.</p>
      </div>

      {/* About Us */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl"><DocumentTextIcon className="w-3.5 h-3.5 text-white" /></div>
            <h2 className="font-black text-slate-900 text-sm tracking-tight">About Us</h2>
          </div>
          <Link to="/about" target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
            View page <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Page Title</label>
            <input className={inputCls} value={about.title} onChange={(e) => setAbout((p) => ({ ...p, title: e.target.value }))} placeholder="About Us" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Body</label>
            <textarea className={`${inputCls} resize-none`} rows={8} value={about.body} onChange={(e) => setAbout((p) => ({ ...p, body: e.target.value }))} placeholder="Tell your story. Leave a blank line between paragraphs." />
          </div>
          <button onClick={() => savePage("about", about)} disabled={savingPage === "about"} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50">
            {savingPage === "about" ? "Saving…" : "Save About Us"}
          </button>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl"><DocumentTextIcon className="w-3.5 h-3.5 text-white" /></div>
            <h2 className="font-black text-slate-900 text-sm tracking-tight">Terms &amp; Conditions</h2>
          </div>
          <Link to="/terms" target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
            View page <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Page Title</label>
            <input className={inputCls} value={terms.title} onChange={(e) => setTerms((p) => ({ ...p, title: e.target.value }))} placeholder="Terms & Conditions" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Body</label>
            <textarea className={`${inputCls} resize-none`} rows={10} value={terms.body} onChange={(e) => setTerms((p) => ({ ...p, body: e.target.value }))} placeholder="Shipping, returns, usage policy, etc. Leave a blank line between paragraphs." />
          </div>
          <button onClick={() => savePage("terms", terms)} disabled={savingPage === "terms"} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50">
            {savingPage === "terms" ? "Saving…" : "Save Terms & Conditions"}
          </button>
        </div>
      </div>

      {/* Help Center */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl"><DocumentTextIcon className="w-3.5 h-3.5 text-white" /></div>
            <h2 className="font-black text-slate-900 text-sm tracking-tight">Help Center</h2>
          </div>
          <Link to="/help" target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
            View page <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Page Title</label>
            <input className={inputCls} value={help.title} onChange={(e) => setHelp((p) => ({ ...p, title: e.target.value }))} placeholder="Help Center" />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Questions &amp; Answers</label>
            {help.faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-start gap-2">
                  <input className={inputCls} value={faq.question} onChange={(e) => updateFaq(i, { question: e.target.value })} placeholder="Question" />
                  <button onClick={() => removeFaq(i)} className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0" aria-label="Remove question">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <textarea className={`${inputCls} resize-none`} rows={2} value={faq.answer} onChange={(e) => updateFaq(i, { answer: e.target.value })} placeholder="Answer" />
              </div>
            ))}
            <button onClick={addFaq} className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 text-xs font-bold rounded-xl transition-colors">
              <PlusIcon className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          <button onClick={() => savePage("help", help)} disabled={savingPage === "help"} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50">
            {savingPage === "help" ? "Saving…" : "Save Help Center"}
          </button>
        </div>
      </div>

      {/* Contact Us — no fields here, reuses SEO business info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl"><DocumentTextIcon className="w-3.5 h-3.5 text-white" /></div>
            <h2 className="font-black text-slate-900 text-sm tracking-tight">Contact Us</h2>
          </div>
          <Link to="/contact" target="_blank" className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors">
            View page <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500">
            This page shows your business address, phone, and email, and an intro line — all set from{" "}
            <Link to="../profile" className="font-bold text-slate-900 underline underline-offset-2">Company Settings → SEO &amp; Discoverability → Business info</Link>, so you only enter them once. (Admin access only — ask an admin if you can't reach that page.)
          </p>
        </div>
      </div>
    </div>
  );
}
