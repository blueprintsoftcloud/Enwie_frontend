import { useState } from "react";
import { TruckIcon, XMarkIcon, HashtagIcon, LinkIcon, PaperAirplaneIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import DeliveryPartnerPicker, { DeliveryPartnerValue } from "./DeliveryPartnerPicker";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

export interface ShipOrderPayload {
  deliveryPartnerId?: string;
  newDeliveryPartnerName?: string;
  noDeliveryPartner?: boolean;
  trackingId?: string;
  trackingLink?: string;
  shippingNote?: string;
}

interface ShipOrderModalProps {
  order: { id: string } | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: ShipOrderPayload) => void;
}

export default function ShipOrderModal({ order, submitting, onClose, onConfirm }: ShipOrderModalProps) {
  const [partner, setPartner] = useState<DeliveryPartnerValue | null>(null);
  const [trackingId, setTrackingId] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [note, setNote] = useState("");
  useBodyScrollLock(!!order);

  if (!order) return null;

  const isManual = partner?.mode === "manual";
  const hasPartner = partner?.mode === "existing" || partner?.mode === "new" ? Boolean(partner.name.trim()) : isManual;
  // Manual/self-delivery has no courier to hand a tracking ID to — only require it
  // (and the partner picker) when an actual delivery partner is involved.
  const canConfirm = hasPartner && (isManual || trackingId.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm || !partner) return;
    onConfirm({
      deliveryPartnerId: partner.mode === "existing" ? partner.id : undefined,
      newDeliveryPartnerName: partner.mode === "new" ? partner.name.trim() : undefined,
      noDeliveryPartner: isManual || undefined,
      trackingId: isManual ? undefined : trackingId.trim() || undefined,
      trackingLink: isManual ? undefined : trackingLink.trim() || undefined,
      shippingNote: isManual ? note.trim() || undefined : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/20 w-full max-w-md max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 bg-gradient-to-br from-blue-50 via-white to-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <TruckIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950 tracking-tight">Ship Order</h2>
              <span className="inline-block mt-0.5 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                #{order.id.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg p-1.5 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <TruckIcon className="w-3.5 h-3.5" />
              Delivery Partner <span className="text-blue-500">*</span>
            </label>
            <DeliveryPartnerPicker value={partner} onChange={setPartner} />
          </div>

          {isManual ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 animate-fadeIn">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                <PencilSquareIcon className="w-3.5 h-3.5" />
                Note <span className="normal-case text-gray-400 font-medium">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Delivered by staff, or handed over for local pickup on Tuesday…"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <p className="mt-1 text-[11px] text-gray-400">Included in the customer's shipping email if filled in.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3.5 animate-fadeIn">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  <HashtagIcon className="w-3.5 h-3.5" />
                  Tracking ID <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  Tracking Link <span className="normal-case text-gray-400 font-medium">(optional)</span>
                </label>
                <input
                  type="url"
                  value={trackingLink}
                  onChange={(e) => setTrackingLink(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Shipping…
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                Confirm & Ship
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
