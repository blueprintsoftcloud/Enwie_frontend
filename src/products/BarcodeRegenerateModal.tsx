// src/products/BarcodeRegenerateModal.tsx
import React, { useState } from "react";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../utils/api";

interface BarcodeRegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentBarcode: string;
  onSuccess: (newBarcode: string) => void;
}

export const BarcodeRegenerateModal: React.FC<BarcodeRegenerateModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  currentBarcode,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/product/${productId}/regenerate-barcode`);
      const newBarcode = res.data.barcode;
      toast.success(`New barcode generated: ${newBarcode}`);
      onSuccess(newBarcode);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to regenerate barcode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center shadow-xs">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">Regenerate Product Barcode?</h3>
            <p className="text-xs text-slate-500 font-medium">Product: {productName}</p>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1.5 leading-relaxed">
            <p className="font-bold">⚠️ Warning about printed labels:</p>
            <p>
              Current barcode <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">{currentBarcode}</strong> will be permanently replaced with a new code.
            </p>
            <p className="text-amber-800">
              Any stickers already printed with this barcode will <strong>no longer scan</strong> at the POS billing counter. You will need to print and attach new labels.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={loading}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                <span>Yes, Regenerate Barcode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

