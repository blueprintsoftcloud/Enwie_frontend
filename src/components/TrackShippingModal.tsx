import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import CourierLogo from "./CourierLogo";

interface PartnerInfo {
  name: string;
  trackingUrlTemplate: string;
}

interface TrackShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartners?: string[];
}

export const resolveCourierUrl = (
  partnerName: string,
  trackingNumber: string,
  customTemplate?: string
): { url: string; hasDirectQuery: boolean } => {
  const cleanNumber = trackingNumber.trim();
  const norm = partnerName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // If custom template is provided from admin backend and is not a google search
  if (customTemplate && !customTemplate.includes("google.com/search")) {
    const url = customTemplate.includes("{trackingNumber}")
      ? customTemplate.replace("{trackingNumber}", encodeURIComponent(cleanNumber))
      : customTemplate;
    return { url, hasDirectQuery: customTemplate.includes("{trackingNumber}") };
  }

  // DHL (Express / Global / eCommerce)
  if (norm.includes("dhl")) {
    return {
      url: `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanNumber)}&brand=DHL`,
      hasDirectQuery: true,
    };
  }

  // Delhivery
  if (norm.includes("delhivery")) {
    return {
      url: `https://www.delhivery.com/track/package/${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // DTDC / DTDC Express
  if (norm.includes("dtdc")) {
    return {
      url: `https://tracking.dtdc.com/ctapp/services?cType=awb&awbNo=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Blue Dart / Bluedart
  if (norm.includes("bluedart") || (norm.includes("blue") && norm.includes("dart"))) {
    return {
      url: `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // India Post / Speed Post / EMS
  if (norm.includes("indiapost") || norm.includes("speedpost") || norm.includes("post")) {
    return {
      url: `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`,
      hasDirectQuery: false,
    };
  }

  // Shadowfax
  if (norm.includes("shadowfax")) {
    return {
      url: `https://tracker.shadowfax.in/#/track/${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Ekart Logistics / Ekart
  if (norm.includes("ekart")) {
    return {
      url: `https://ekartlogistics.com/shipmenttrack/${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // XpressBees
  if (norm.includes("xpress") || norm.includes("xpressbees")) {
    return {
      url: `https://www.xpressbees.com/track?awb=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Ecom Express
  if (norm.includes("ecomexpress") || norm.includes("ecom")) {
    return {
      url: `https://ecomexpress.in/tracking/?awb=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // FedEx
  if (norm.includes("fedex")) {
    return {
      url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Amazon Shipping
  if (norm.includes("amazon")) {
    return {
      url: `https://track.amazon.in/tracking/${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Aramex
  if (norm.includes("aramex")) {
    return {
      url: `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // UPS
  if (norm.includes("ups")) {
    return {
      url: `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanNumber)}`,
      hasDirectQuery: true,
    };
  }

  // Gati / Gati-KWE / Allcargo Gati
  if (norm.includes("gati")) {
    return {
      url: `https://www.gati.com/`,
      hasDirectQuery: false,
    };
  }

  // Professional Couriers / TPC
  if (norm.includes("professional") || norm.includes("tpc")) {
    return {
      url: `https://www.tpcindia.com/`,
      hasDirectQuery: false,
    };
  }

  // ST Courier / ST Couriers
  if (norm.includes("stcourier") || (norm.includes("st") && norm.includes("courier"))) {
    return {
      url: `https://stcourier.com/`,
      hasDirectQuery: false,
    };
  }

  // Trackon Courier
  if (norm.includes("trackon")) {
    return {
      url: `https://trackon.in/`,
      hasDirectQuery: false,
    };
  }

  // VRL Logistics
  if (norm.includes("vrl")) {
    return {
      url: `https://www.vrlgroup.in/`,
      hasDirectQuery: false,
    };
  }

  // Maruti Courier / Shree Maruti Courier
  if (norm.includes("maruti")) {
    return {
      url: `https://shreemaruticourier.com/`,
      hasDirectQuery: false,
    };
  }

  // Nandan Couriers / Shree Nandan Courier
  if (norm.includes("nandan")) {
    return {
      url: `https://www.shreenandan.com/`,
      hasDirectQuery: false,
    };
  }

  // Overnite Express
  if (norm.includes("overnite")) {
    return {
      url: `https://www.overnite-express.com/`,
      hasDirectQuery: false,
    };
  }

  // Tirupati Courier / Shree Tirupati Courier
  if (norm.includes("tirupati")) {
    return {
      url: `https://www.shreetirupaticourier.net/`,
      hasDirectQuery: false,
    };
  }

  // Anjani Courier / Shree Anjani Courier
  if (norm.includes("anjani")) {
    return {
      url: `https://shreeanjanicourier.com/`,
      hasDirectQuery: false,
    };
  }

  return {
    url: `https://${encodeURIComponent(partnerName.toLowerCase().replace(/\s+/g, ""))}.com`,
    hasDirectQuery: false,
  };
};

export default function TrackShippingModal({
  isOpen,
  onClose,
  initialPartners,
}: TrackShippingModalProps) {
  useBodyScrollLock(isOpen);

  // Initialize partners without any hardcoded multi-partner default to prevent flash
  const [enabledPartners, setEnabledPartners] = useState<string[]>(() => {
    if (initialPartners && initialPartners.length > 0) return initialPartners;
    try {
      const cached = localStorage.getItem("CACHED_TRACKING_CONFIG");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.enabledPartners) && parsed.enabledPartners.length > 0) {
          return parsed.enabledPartners;
        }
      }
    } catch {}
    return [];
  });

  const [partnerDetails, setPartnerDetails] = useState<PartnerInfo[]>(() => {
    try {
      const cached = localStorage.getItem("CACHED_TRACKING_CONFIG");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.availablePartners)) {
          return parsed.availablePartners;
        }
      }
    } catch {}
    return [];
  });

  const [selectedPartner, setSelectedPartner] = useState<string>(() => {
    if (initialPartners && initialPartners.length > 0) return initialPartners[0];
    try {
      const cached = localStorage.getItem("CACHED_TRACKING_CONFIG");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.enabledPartners) && parsed.enabledPartners.length > 0) {
          return parsed.enabledPartners[0];
        }
      }
    } catch {}
    return "";
  });

  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever initialPartners prop changes
  useEffect(() => {
    if (initialPartners && initialPartners.length > 0) {
      setEnabledPartners(initialPartners);
      setSelectedPartner((prev) =>
        initialPartners.includes(prev) ? prev : initialPartners[0]
      );
    }
  }, [initialPartners]);

  // Fetch enabled tracking partners in the background when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    api
      .get("/settings/tracking-partners")
      .then(({ data }) => {
        if (!isMounted) return;
        try {
          localStorage.setItem("CACHED_TRACKING_CONFIG", JSON.stringify(data));
        } catch {}

        const partners: string[] =
          Array.isArray(data?.enabledPartners) && data.enabledPartners.length > 0
            ? data.enabledPartners
            : [];

        if (partners.length > 0) {
          setEnabledPartners(partners);
          setSelectedPartner((prev) => (partners.includes(prev) ? prev : partners[0]));
        }
        if (Array.isArray(data?.availablePartners)) {
          setPartnerDetails(data.availablePartners);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleTrack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanNumber = trackingNumber.trim();
    if (!cleanNumber) {
      toast.error("Please enter a tracking number");
      inputRef.current?.focus();
      return;
    }

    const partnerToUse = selectedPartner || (enabledPartners.length > 0 ? enabledPartners[0] : "");
    if (!partnerToUse) {
      toast.error("No delivery partner selected");
      return;
    }

    // Auto-copy tracking number to clipboard in background without awaiting (preserves user gesture)
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanNumber).catch(() => {});
    }

    const customTemplate = partnerDetails.find(
      (p) => p.name.toLowerCase() === partnerToUse.toLowerCase()
    )?.trackingUrlTemplate;

    const { url: targetUrl } = resolveCourierUrl(partnerToUse, cleanNumber, customTemplate);

    // Open courier tracking in a new tab without redirecting or replacing current site
    const link = document.createElement("a");
    link.href = targetUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  if (!isOpen) return null;

  const isMultiPartner = enabledPartners.length > 1;
  const isSinglePartner = enabledPartners.length === 1;
  const activePartnerName = selectedPartner || (enabledPartners.length > 0 ? enabledPartners[0] : "");

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150"
      />

      <div className="fixed inset-0 z-[101] w-screen overflow-y-auto p-4 flex min-h-full items-center justify-center">
        <DialogPanel
          transition
          className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-gray-100 transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-base font-bold text-gray-900">Track Shipment</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleTrack} className="space-y-4">
            {/* Single Partner Banner */}
            {isSinglePartner && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-700 font-medium">
                <CourierLogo name={enabledPartners[0]} size="xs" />
                <span>
                  Currently using{" "}
                  <strong className="font-semibold text-gray-900">
                    {enabledPartners[0]}
                  </strong>{" "}
                  as delivery partner
                </span>
              </div>
            )}

            {/* Courier Selection (if multiple) */}
            {isMultiPartner && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-500">
                  Select Courier Partner
                </label>
                <div className="flex flex-wrap gap-2">
                  {enabledPartners.map((partnerName) => {
                    const isSelected = (selectedPartner || enabledPartners[0]) === partnerName;
                    return (
                      <button
                        key={partnerName}
                        type="button"
                        onClick={() => {
                          setSelectedPartner(partnerName);
                          inputRef.current?.focus();
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "border-black bg-black text-white shadow-xs"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <CourierLogo name={partnerName} size="xs" />
                        <span>{partnerName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking Number Input */}
            <div>
              <input
                ref={inputRef}
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={
                  activePartnerName
                    ? `Enter ${activePartnerName} tracking number...`
                    : "Enter tracking number..."
                }
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* Actions */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="submit"
                disabled={!trackingNumber.trim()}
                className="flex-1 rounded-xl bg-black hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 text-sm font-semibold transition cursor-pointer"
              >
                Track
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
