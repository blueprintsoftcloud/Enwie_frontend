import React from "react";
import { Plus, Trash2, Layers, Sparkles, Check, Heading as HeadingIcon } from "lucide-react";

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface ProductCustomSection {
  heading: string;
  content: string;
}

interface ProductSpecificationsEditorProps {
  customSections?: ProductCustomSection[];
  onCustomSectionsChange?: (sections: ProductCustomSection[]) => void;
  materialCare?: string;
  onMaterialCareChange?: (val: string) => void;
  specifications: ProductSpecification[];
  onSpecificationsChange: (specs: ProductSpecification[]) => void;
}

// Common preset suggestions for custom headings
const SUGGESTED_HEADINGS = [
  "Material & Care",
  "Size & Fit",
  "Fabric & Care",
  "Style Note",
  "About the Brand",
  "Wash Care",
  "Features & Benefits",
  "Warranty & Support",
];

// Common preset suggestions for key-value specifications
const SUGGESTED_KEYS = [
  "Sport",
  "Fastening",
  "Ankle Height",
  "Outsole Type",
  "Cleats",
  "Pronation",
  "Material",
  "Fabric",
  "Fit",
  "Pattern",
  "Occasion",
  "Sleeve Length",
  "Neck / Collar",
  "Closure",
  "Sole Material",
  "Toe Shape",
  "Warranty",
  "Country of Origin",
];

export default function ProductSpecificationsEditor({
  customSections = [],
  onCustomSectionsChange,
  materialCare = "",
  onMaterialCareChange,
  specifications,
  onSpecificationsChange,
}: ProductSpecificationsEditorProps) {
  // Sync to parent customSections and optionally materialCare
  const updateSections = (newSections: ProductCustomSection[]) => {
    if (onCustomSectionsChange) {
      onCustomSectionsChange(newSections);
    }
    if (onMaterialCareChange) {
      // Find a section specifically named Material & Care or fall back to first section
      const matCareSec = newSections.find((s) => /material/i.test(s.heading));
      if (matCareSec) {
        onMaterialCareChange(matCareSec.content);
      } else if (newSections.length > 0) {
        onMaterialCareChange(newSections[0].content);
      } else {
        onMaterialCareChange("");
      }
    }
  };

  const handleAddSection = (defaultHeading = "") => {
    const updated = [...customSections, { heading: defaultHeading, content: "" }];
    updateSections(updated);
  };

  const handleUpdateSectionHeading = (index: number, newHeading: string) => {
    const updated = [...customSections];
    updated[index] = { ...updated[index], heading: newHeading };
    updateSections(updated);
  };

  const handleUpdateSectionContent = (index: number, newContent: string) => {
    const updated = [...customSections];
    updated[index] = { ...updated[index], content: newContent };
    updateSections(updated);
  };

  const handleRemoveSection = (index: number) => {
    const updated = customSections.filter((_, i) => i !== index);
    updateSections(updated);
  };

  const handleQuickAddSection = (headingName: string) => {
    const existingIndex = customSections.findIndex(
      (s) => s.heading.trim().toLowerCase() === headingName.toLowerCase()
    );
    if (existingIndex >= 0) {
      // Already present
      return;
    }
    handleAddSection(headingName);
  };

  // Specifications helpers
  const handleAddSpecification = (defaultKey = "") => {
    onSpecificationsChange([...specifications, { key: defaultKey, value: "" }]);
  };

  const handleUpdateKey = (index: number, newKey: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], key: newKey };
    onSpecificationsChange(updated);
  };

  const handleUpdateValue = (index: number, newValue: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], value: newValue };
    onSpecificationsChange(updated);
  };

  const handleRemoveSpecification = (index: number) => {
    const updated = specifications.filter((_, i) => i !== index);
    onSpecificationsChange(updated);
  };

  const handleQuickAddKey = (keyName: string) => {
    const exists = specifications.some(
      (s) => s.key.trim().toLowerCase() === keyName.toLowerCase()
    );
    if (exists) return;
    handleAddSpecification(keyName);
  };

  return (
    <div className="space-y-6 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Product Specifications & Details (optional)
            </h3>
            <p className="text-xs text-slate-500">
              Add custom sections with headings and key-value attributes for customer product view
            </p>
          </div>
        </div>
      </div>

      {/* 1. Dynamic Detail Sections with Custom Headings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Custom Detail Sections ({customSections.length})
            </label>
            <p className="text-[11px] text-slate-400">
              Each section has its own heading and content (e.g. Material & Care, Size & Fit, Style Note)
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddSection("")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section
          </button>
        </div>

        {/* Quick Suggestion Chips for Section Headings */}
        <div>
          <span className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
           
            Quick-add common section headings:
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED_HEADINGS.map((hName) => {
              const isAdded = customSections.some(
                (s) => s.heading.trim().toLowerCase() === hName.toLowerCase()
              );
              return (
                <button
                  key={hName}
                  type="button"
                  onClick={() => handleQuickAddSection(hName)}
                  disabled={isAdded}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isAdded
                      ? "bg-slate-200/80 text-slate-400 cursor-default"
                      : "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 active:scale-95 cursor-pointer"
                  }`}
                >
                  {isAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3" />}
                  {hName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections List */}
        {customSections.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-white/70">
            <p className="text-xs font-medium text-slate-500">
              No custom sections added yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any quick-add chip above or "+ Add Section" to add Material & Care, Size & Fit, Style Note, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {customSections.map((sec, index) => (
              <div
                key={index}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-2.5"
              >
                {/* Heading input and delete button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold shrink-0">
                      #{index + 1}
                    </span>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <HeadingIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => handleUpdateSectionHeading(index, e.target.value)}
                        placeholder="Heading (e.g. Material & Care, Size & Fit, Style Note)"
                        className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove this section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Content textarea */}
                <div>
                  <textarea
                    rows={2}
                    value={sec.content}
                    onChange={(e) => handleUpdateSectionContent(index, e.target.value)}
                    placeholder={`Enter text/details for "${sec.heading || "this section"}"...`}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Key-Value Specifications */}
      <div className="space-y-3 pt-2 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Key-Value Specifications ({specifications.length})
            </label>
            <p className="text-[11px] text-slate-400">
              Displayed in a neat 2-column grid on the customer product page
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddSpecification("")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide transition shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>

        {/* Quick Suggestion Chips for Specifications */}
        <div>
          <span className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
           
            Click to quick-add common attributes:
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED_KEYS.map((keyName) => {
              const isAdded = specifications.some(
                (s) => s.key.trim().toLowerCase() === keyName.toLowerCase()
              );
              return (
                <button
                  key={keyName}
                  type="button"
                  onClick={() => handleQuickAddKey(keyName)}
                  disabled={isAdded}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isAdded
                      ? "bg-slate-200/80 text-slate-400 cursor-default"
                      : "bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 active:scale-95 cursor-pointer"
                  }`}
                >
                  {isAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3" />}
                  {keyName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Specifications List */}
        {specifications.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-white/70">
            <p className="text-xs font-medium text-slate-500">
              No specifications added yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any quick-add chip above or "+ Add Row" to add Sport, Fastening, Ankle Height, Fit, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column labels */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_40px] gap-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Attribute / Key</span>
              <span>Value</span>
              <span className="text-right">Action</span>
            </div>

            {specifications.map((spec, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_40px] gap-2 sm:gap-3 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all"
              >
                <div>
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleUpdateKey(index, e.target.value)}
                    placeholder="e.g. Sport, Fastening, Fit"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleUpdateValue(index, e.target.value)}
                    placeholder="e.g. Training or Gym, Lace-Ups"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(index)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove specification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
