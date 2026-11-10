// src/products/BarcodeDownloadModal.tsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  QrCodeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  getBarcodeDataUrl,
  printBarcodeLabelsPDF,
  downloadBarcodeLabelsPDF,
  BarcodeLayoutFormat,
  BarcodeLabelDetails,
} from "../utils/barcodeGenerator";

interface BarcodeDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id?: string;
    _id?: string;
    code: string;
    barcode?: string;
    name: string;
    price: number;
    categoryName?: string;
    variants?: Array<{
      id?: string;
      _id?: string;
      options?: Record<string, string>;
      priceOverride?: number | null;
      sku?: string;
      barcode?: string;
      stock?: number;
    }>;
  };
}

export const BarcodeDownloadModal: React.FC<BarcodeDownloadModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>("base");
  const [quantity, setQuantity] = useState<number>(20);
  const [format, setFormat] = useState<BarcodeLayoutFormat>("thermal_2up");
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const variants = product.variants || [];
  const selectedVariant = variants.find(
    (v) => String(v.id || v._id) === selectedVariantId
  );

  const formatVariantLabel = (options: Record<string, string>) => {
    const entries = Object.entries(options);
    if (entries.length === 0) return "Variant";
    return entries.map(([k, val]) => `${k}: ${val}`).join(" / ");
  };

  const activeBarcode = (
    selectedVariant
      ? selectedVariant.barcode ||
        selectedVariant.sku ||
        `${product.barcode || product.code}-${selectedVariant.sku || selectedVariant.id?.slice(-4) || "V"}`
      : product.barcode || product.code || "ENW-0000"
  ).trim();

  const activePrice = selectedVariant?.priceOverride ?? product.price;
  const activeName = selectedVariant?.options
    ? `${product.name} (${formatVariantLabel(selectedVariant.options)})`
    : product.name;
  const activeSku = selectedVariant?.sku || product.code;

  useEffect(() => {
    if (isOpen && activeBarcode) {
      try {
        const url = getBarcodeDataUrl(activeBarcode, {
          moduleWidth: 2,
          barHeight: 50,
          includeText: true,
          fontSize: 13,
        });
        setPreviewUrl(url);
      } catch {
        setPreviewUrl("");
      }
    }
  }, [isOpen, activeBarcode]);

  if (!isOpen) return null;

  const labelDetails: BarcodeLabelDetails = {
    barcode: activeBarcode,
    name: activeName,
    price: activePrice,
    sku: activeSku,
    categoryName: product.categoryName,
    storeName: "ENWIE",
  };

  const totalLines = Math.ceil(quantity / 2);

  // Directly redirect / open browser print window
  const handlePrint = async () => {
    if (quantity < 1) {
      toast.error("Please enter a valid quantity (at least 1)");
      return;
    }
    setPrinting(true);
    try {
      await printBarcodeLabelsPDF({
        label: labelDetails,
        quantity,
        format,
      });
      toast.success(`Opening print window for ${quantity} labels…`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to open print dialog");
    } finally {
      setPrinting(false);
    }
  };

  // Optional file download fallback
  const handleDownloadFile = async () => {
    if (quantity < 1) return;
    setDownloading(true);
    try {
      await downloadBarcodeLabelsPDF({
        label: labelDetails,
        quantity,
        format,
      });
      toast.success(`Downloaded ${quantity} barcode labels!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const getFormatSummary = () => {
    if (format === "thermal_2up") {
      return `${quantity} stickers (${totalLines} line${totalLines > 1 ? "s" : ""} · 2 in one line)`;
    }
    return `${quantity} thermal sticker${quantity > 1 ? "s" : ""} (1 per line)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <PrinterIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Print Barcode Labels</h2>
              <p className="text-xs text-slate-500">Choose quantity and print directly to thermal roll</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Target Variant Selection (if product has variants) */}
          {variants.length > 0 && (
            <div className="space-y-1.5 bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl">
              <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span>Select Target Option / Variant:</span>
                <span className="text-[10px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  {variants.length} options
                </span>
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="base">
                  Master Product (Base SKU: {product.code} · ₹{product.price.toLocaleString("en-IN")})
                </option>
                {variants.map((v, i) => {
                  const vid = String(v.id || v._id || `var-${i}`);
                  const price = v.priceOverride ?? product.price;
                  return (
                    <option key={vid} value={vid}>
                      {formatVariantLabel(v.options || {})} — ₹{price.toLocaleString("en-IN")}
                      {v.stock !== undefined ? ` (${v.stock} in stock)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Label Live Preview */}
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Label Preview
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {format === "thermal_2up" ? "2 in One Line Layout" : "1 in One Line Layout"}
              </span>
            </div>

            <div className="bg-white max-w-[280px] mx-auto p-3 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-black uppercase text-slate-800 tracking-wider">ENWIE</p>
              <p className="text-xs font-bold text-slate-700 truncate mt-0.5" title={activeName}>
                {activeName}
              </p>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={activeBarcode}
                  className="mx-auto my-2 max-h-24 object-contain"
                />
              ) : (
                <div className="h-16 flex items-center justify-center text-xs text-slate-400">
                  Barcode preview unavailable
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 font-mono text-[11px]">{activeBarcode}</span>
                <span className="text-indigo-600 font-black">₹{activePrice.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Paper Format Selector: ONLY Thermal Roll Formats (A4 removed) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Thermal Roll Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: 2 in 1 Line */}
              <button
                type="button"
                onClick={() => setFormat("thermal_2up")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  format === "thermal_2up"
                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">2 in 1 Line</span>
                    {format === "thermal_2up" && (
                      <CheckCircleIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-1.5">
                    Your Paper (2-Up Roll)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    2 stickers per row (50×25mm each, 102mm roll). Prints 2 labels per line.
                  </p>
                </div>
              </button>

              {/* Option 2: 1 in 1 Line */}
              <button
                type="button"
                onClick={() => setFormat("thermal")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  format === "thermal"
                    ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">1 in 1 Line</span>
                    {format === "thermal" && (
                      <CheckCircleIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded mb-1.5">
                    Single Roll
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    1 sticker per row (50×25mm). For single continuous sticker rolls.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">How many labels to print?</label>
              <span className="text-xs font-semibold text-indigo-600">
                {getFormatSummary()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="500"
                value={quantity || ""}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))
                }
                className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {/* Quick buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "2x (1 line)", val: 2 },
                  { label: "10x (5 lines)", val: 10 },
                  { label: "20x (10 lines)", val: 20 },
                  { label: "50x", val: 50 },
                  { label: "100x", val: 100 },
                ].map((btn) => (
                  <button
                    key={btn.val}
                    type="button"
                    onClick={() => setQuantity(btn.val)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      quantity === btn.val
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Optional Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadFile}
              disabled={downloading || printing}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Save as PDF file"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Save PDF</span>
            </button>

            {/* Direct Print Button - 1 click redirects to print window */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing || downloading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {printing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Opening Print…</span>
                </>
              ) : (
                <>
                  <PrinterIcon className="w-4 h-4" />
                  <span>
                    Print {quantity} Labels ({format === "thermal_2up" ? `${totalLines} Lines` : `${quantity} Stickers`})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
