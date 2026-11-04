import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Copy, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

export interface ShareProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    image?: string;
    price?: number;
    brand?: string;
  };
  variantLabel?: string;
  shareUrl?: string;
}

export const ShareProductModal: React.FC<ShareProductModalProps> = ({
  isOpen,
  onClose,
  product,
  variantLabel,
  shareUrl: customShareUrl,
}) => {
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(isOpen);

  if (typeof document === "undefined") return null;

  const currentUrl =
    customShareUrl ||
    (typeof window !== "undefined"
      ? window.location.href
      : "");

  const shareText = `Check out ${product.name}${
    product.price ? ` (₹${product.price.toLocaleString("en-IN")})` : ""
  } on our store!`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${shareText}\n${currentUrl}`
  )}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }

      setCopied(true);
      toast.success("Link copied to clipboard!", { id: "share-link-copied" });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Failed to copy link", { id: "share-link-error" });
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="share-product-portal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          {/* Modal Card */}
          <motion.div
            key="share-product-portal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 text-neutral-800">
                  <Share2 className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-gray-900 font-sans">
                  Share this Product
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Product Summary Card */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-14 h-16 object-cover rounded-lg border border-gray-200 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-14 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                    <Share2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {product.brand && (
                    <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                      {product.brand}
                    </p>
                  )}
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {product.name}
                  </h3>
                  {variantLabel && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {variantLabel}
                    </p>
                  )}
                  {product.price !== undefined && (
                    <p className="text-sm font-bold text-neutral-900 mt-1">
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>

              {/* Prominent WhatsApp Share Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Share on WhatsApp</span>
              </a>

              {/* Copy Link Input Bar */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Or Copy Product Link
                </p>
                <div className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 bg-gray-50/60 focus-within:border-neutral-900 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-transparent px-2.5 text-xs text-gray-700 focus:outline-hidden truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-900 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareProductModal;
