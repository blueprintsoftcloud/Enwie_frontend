import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useNavigate, useSearchParams } from "react-router-dom";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import ShipOrderModal, { ShipOrderPayload } from "./ShipOrderModal";

import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  TruckIcon,
} from "@heroicons/react/20/solid";

import {
  ChevronRightIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  PhotoIcon,
  QrCodeIcon,
  ArrowUturnLeftIcon,
  BuildingStorefrontIcon,
  FunnelIcon,
  UserCircleIcon,
  ChevronDownIcon,
  CheckIcon,
  PrinterIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import BulkInvoiceModal from "./BulkInvoiceModal";
import DatePicker from "../components/DatePicker";

// --- API Endpoints ---
const ADMIN_ALL_ORDERS_ENDPOINT = '/order/all';

interface AdminStaffUser {
  id: string;
  username: string;
  email?: string | null;
  role: string;
}

interface OrderItem {
  product: { id: string; name: string; image?: string } | null;
  quantity: number;
  price: number;
  /** e.g. { Storage: "128GB", Color: "Black" } — the specific option this line item
   * was purchased in, if the product has variants (see mongoose.ts's ProductVariant).
   * null for a plain single-SKU product. */
  variant?: { options: Record<string, string> } | null;
}

interface Order {
  id: string;
  user?: { username?: string; email?: string; phone?: string };
  placedByAdminId?: string | null;
  placedByAdmin?: AdminStaffUser | null;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  shippingCharge: number;
  finalAmount: number;
  orderStatus: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  paymentScreenshot?: string;
  items?: OrderItem[];
  shippingAddress?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null;
  deliveryPartnerName?: string;
  trackingId?: string;
  trackingLink?: string;
  shippingNote?: string;
  invoicePrinted?: boolean;
  invoicePrintedAt?: string | null;
}

interface OrderStats {
  totalOrders: number;
  /** Realized revenue — PAID orders only, not the face value of every order. */
  paidRevenue: number;
  /** Face value of every order regardless of payment status — the denominator for
   * "% of order value actually collected". */
  totalOrderValue: number;
  processing: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned?: number;
  unprintedInvoices?: number;
}

const ADMIN_ORDER_STATS_ENDPOINT = '/order/stats';
const ADMIN_UPDATE_STATUS_ENDPOINT = '/order/update';

// Helper: Status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "PROCESSING":
    case "CONFIRMED":
      return <ClockIcon className="size-3.5" aria-hidden="true" />;
    case "SHIPPED":
      return <TruckIcon className="size-3.5" aria-hidden="true" />;
    case "DELIVERED":
      return <CheckCircleIcon className="size-3.5" aria-hidden="true" />;
    case "CANCELLED":
      return <XCircleIcon className="size-3.5" aria-hidden="true" />;
    case "RETURNED":
      return <ArrowUturnLeftIcon className="size-3.5" aria-hidden="true" />;
    default:
      return <ClockIcon className="size-3.5" aria-hidden="true" />;
  }
};

// Helper: Status badge styles & colors
const getStatusClasses = (status: string) => {
  switch (status) {
    case "PROCESSING":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-800",
        dot: "size-1.5 rounded-full bg-amber-500 animate-pulse",
        chipActive: "bg-amber-500 text-white border-amber-500 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    case "CONFIRMED":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200/80 px-2.5 py-1 text-xs font-semibold text-orange-800",
        dot: "size-1.5 rounded-full bg-orange-500 animate-pulse",
        chipActive: "bg-orange-500 text-white border-orange-500 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    case "SHIPPED":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-2.5 py-1 text-xs font-semibold text-sky-800",
        dot: "size-1.5 rounded-full bg-sky-500 animate-pulse",
        chipActive: "bg-sky-600 text-white border-sky-600 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    case "DELIVERED":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-800",
        dot: "size-1.5 rounded-full bg-emerald-500",
        chipActive: "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    case "CANCELLED":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs font-semibold text-rose-800",
        dot: "size-1.5 rounded-full bg-rose-500",
        chipActive: "bg-rose-600 text-white border-rose-600 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    case "RETURNED":
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-xs font-semibold text-purple-800",
        dot: "size-1.5 rounded-full bg-purple-500",
        chipActive: "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      };
    default:
      return {
        container: "inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800",
        dot: "size-1.5 rounded-full bg-slate-500",
        chipActive: "bg-slate-800 text-white border-slate-800 font-bold",
        chipInactive: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
      };
  }
};

const statusOptions = ["PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// DELIVERED, CANCELLED, and RETURNED are terminal states — once an order lands there, no
// further status change is offered. Also, the active status chip is disabled (cannot re-select itself).
const isStatusChipDisabled = (currentStatus: string, targetStatus: string, canUpdateOrder: boolean): boolean => {
  if (!canUpdateOrder) return true;
  if (currentStatus === targetStatus) return true;
  if (currentStatus === "CANCELLED" || currentStatus === "DELIVERED" || currentStatus === "RETURNED") return true;
  return false;
};

// DELIVERED can only be reached from SHIPPED — but the chip itself stays visible and
// normally styled rather than greyed out; clicking it early just explains why instead
// of silently doing nothing.
const blockedStatusMessage = (currentStatus: string, targetStatus: string): string | null => {
  if (targetStatus === "DELIVERED" && currentStatus !== "SHIPPED" && currentStatus !== "DELIVERED") {
    return "Mark the order as Shipped before marking it Delivered.";
  }
  return null;
};

const formatDateTime = (value: string | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

interface OrderSourceFilterDropdownProps {
  value: "ALL" | "CUSTOMER" | "ADMIN";
  onChange: (value: "ALL" | "CUSTOMER" | "ADMIN") => void;
}

const ORDER_SOURCE_OPTIONS: {
  id: "ALL" | "CUSTOMER" | "ADMIN";
  label: string;
}[] = [
  {
    id: "ALL",
    label: "All Orders",
  },
  {
    id: "CUSTOMER",
    label: "Customers",
  },
  {
    id: "ADMIN",
    label: "By Admin / Staff",
  },
];

function OrderSourceFilterDropdown({ value, onChange }: OrderSourceFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = ORDER_SOURCE_OPTIONS.find((opt) => opt.id === value) || ORDER_SOURCE_OPTIONS[0];
  const isFiltered = value !== "ALL";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${
          isOpen
            ? "border-slate-400 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-400/15"
            : isFiltered
              ? value === "CUSTOMER"
                ? "border-emerald-300 bg-emerald-50/90 text-emerald-950 font-bold"
                : "border-indigo-300 bg-indigo-50/90 text-indigo-950 font-bold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{currentOption.label}</span>
        <ChevronDownIcon
          className={`size-3.5 transition-transform duration-200 ${
            isFiltered ? "text-slate-700" : "text-slate-400"
          } ${isOpen ? "rotate-180 text-slate-700" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          role="listbox"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Order Source
          </div>

          <div className="space-y-0.5">
            {ORDER_SOURCE_OPTIONS.map((opt) => {
              const isSelected = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface InvoiceFilterDropdownProps {
  value: "ALL" | "UNPRINTED" | "PRINTED";
  unprintedCount: number;
  onChange: (value: "ALL" | "UNPRINTED" | "PRINTED") => void;
}

const INVOICE_FILTER_OPTIONS: {
  id: "ALL" | "UNPRINTED" | "PRINTED";
  label: string;
}[] = [
  { id: "ALL", label: "All Invoices" },
  { id: "UNPRINTED", label: "Unprinted" },
  { id: "PRINTED", label: "Printed" },
];

function InvoiceFilterDropdown({ value, unprintedCount, onChange }: InvoiceFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = INVOICE_FILTER_OPTIONS.find((opt) => opt.id === value) || INVOICE_FILTER_OPTIONS[0];
  const isFiltered = value !== "ALL";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${
          isOpen
            ? "border-slate-400 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-400/15"
            : isFiltered
              ? value === "UNPRINTED"
                ? "border-amber-300 bg-amber-50/90 text-amber-950 font-bold"
                : "border-slate-400 bg-slate-100 text-slate-900 font-bold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          <span>{currentOption.label}</span>
          {value === "UNPRINTED" && unprintedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              {unprintedCount}
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`size-3.5 transition-transform duration-200 ${
            isFiltered ? "text-slate-700" : "text-slate-400"
          } ${isOpen ? "rotate-180 text-slate-700" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          role="listbox"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Invoice Status
          </div>

          <div className="space-y-0.5">
            {INVOICE_FILTER_OPTIONS.map((opt) => {
              const isSelected = value === opt.id;
              const isUnprinted = opt.id === "UNPRINTED";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckIcon className="size-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{opt.label}</span>
                  </div>

                  {isUnprinted && unprintedCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                    }`}>
                      {unprintedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusFilterDropdownProps {
  value: string;
  onChange: (newStatus: string) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const getDotClass = (status: string) => {
    switch (status) {
      case "PROCESSING":
      case "CONFIRMED":
        return "bg-amber-500 animate-pulse";
      case "SHIPPED":
        return "bg-sky-500 animate-pulse";
      case "DELIVERED":
        return "bg-emerald-500";
      case "CANCELLED":
        return "bg-rose-500";
      case "RETURNED":
        return "bg-purple-500";
      default:
        return "bg-slate-400";
    }
  };

  const currentLabel = value ? statusLabel(value) : "Status (All)";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${
          isOpen
            ? "border-slate-400 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-400/15"
            : value
              ? "border-slate-400 bg-slate-100 text-slate-900"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`inline-block size-2 rounded-full ${getDotClass(value)}`} />
        <span>{currentLabel}</span>
        <ChevronDownIcon
          className={`size-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          role="listbox"
        >
          {/* Status (All) option */}
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              !value
                ? "bg-slate-100 text-slate-900 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            role="option"
            aria-selected={!value}
          >
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-slate-400" />
              <span>Status (All)</span>
            </div>
            {!value && <CheckIcon className="size-3.5 text-slate-800 stroke-[2.5]" />}
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* Status Options */}
          <div className="space-y-0.5">
            {statusOptions.map((st) => {
              const isSelected = value === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    onChange(st);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`size-2 rounded-full ${getDotClass(st)}`} />
                    <span>{statusLabel(st)}</span>
                  </div>
                  {isSelected && (
                    <CheckIcon
                      className={`size-3.5 stroke-[2.5] ${
                        st === "RETURNED" ? "text-purple-600" : "text-slate-800"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Date Filter Helpers & Component ──────────────────────────────────────────
const padZero = (n: number) => String(n).padStart(2, "0");
const formatToYMD = (d: Date) => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;

const parseYMD = (str: string | undefined): Date | null => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const getPresetDates = (presetId: string): { startDate: string; endDate: string } => {
  const now = new Date();
  switch (presetId) {
    case "TODAY": {
      const s = formatToYMD(now);
      return { startDate: s, endDate: s };
    }
    case "YESTERDAY": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = formatToYMD(y);
      return { startDate: s, endDate: s };
    }
    case "LAST_7_DAYS": {
      const p7 = new Date(now);
      p7.setDate(p7.getDate() - 6);
      return { startDate: formatToYMD(p7), endDate: formatToYMD(now) };
    }
    case "LAST_30_DAYS": {
      const p30 = new Date(now);
      p30.setDate(p30.getDate() - 29);
      return { startDate: formatToYMD(p30), endDate: formatToYMD(now) };
    }
    case "THIS_MONTH": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatToYMD(first), endDate: formatToYMD(now) };
    }
    case "LAST_MONTH": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatToYMD(first), endDate: formatToYMD(last) };
    }
    case "ALL":
    default:
      return { startDate: "", endDate: "" };
  }
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const d = parseYMD(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return "";
  const d = parseYMD(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const getDateFilterLabel = (preset: string, startDate: string, endDate: string) => {
  if (preset === "ALL" && !startDate && !endDate) return "Date (All)";
  if (preset === "TODAY") return "Today";
  if (preset === "YESTERDAY") return "Yesterday";
  if (preset === "LAST_7_DAYS") return "Last 7 Days";
  if (preset === "LAST_30_DAYS") return "Last 30 Days";
  if (preset === "THIS_MONTH") return "This Month";
  if (preset === "LAST_MONTH") return "Last Month";

  if (startDate && endDate) {
    if (startDate === endDate) return formatDateDisplay(startDate);
    return `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`;
  }
  if (startDate) return `From ${formatDateShort(startDate)}`;
  if (endDate) return `Until ${formatDateShort(endDate)}`;
  return "Date";
};

const QUICK_PRESETS = [
  { id: "ALL", label: "All Time" },
  { id: "TODAY", label: "Today" },
  { id: "YESTERDAY", label: "Yesterday" },
  { id: "LAST_7_DAYS", label: "Last 7 Days" },
  { id: "THIS_MONTH", label: "This Month" },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateFilterDropdownProps {
  preset: string;
  startDate: string;
  endDate: string;
  onPresetSelect: (presetId: string) => void;
  onCustomDateChange: (start: string, end: string) => void;
  onClear: () => void;
}

function DateFilterDropdown({
  preset,
  startDate,
  endDate,
  onPresetSelect,
  onCustomDateChange,
  onClear,
}: DateFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState<Date>(() => parseYMD(startDate) || new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayStr = formatToYMD(now);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsSelectingRange(false);
    setHoverDate(null);
    if (startDate) {
      const d = parseYMD(startDate);
      if (d) setViewDate(d);
    }
  }, [startDate, endDate, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const isFiltered = preset !== "ALL" || Boolean(startDate || endDate);
  const label = getDateFilterLabel(preset, startDate, endDate);

  // Month calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const isCurrentOrFutureMonth =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const cells: { dateStr: string; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    cells.push({ inMonth: false, dateStr: formatToYMD(d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    cells.push({ inMonth: true, dateStr: formatToYMD(dObj) });
  }
  let nextDay = 1;
  while (cells.length < 35 || cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, nextDay);
    cells.push({ inMonth: false, dateStr: formatToYMD(d) });
    nextDay += 1;
  }

  const handleDayClick = (dateStr: string) => {
    if (dateStr > todayStr) return; // Future dates not allowed

    if (!isSelectingRange) {
      // Step 1: User starts picking a range or single date
      setTempStart(dateStr);
      setTempEnd("");
      setIsSelectingRange(true);
      setHoverDate(null);
    } else {
      // Step 2: User completes or adjusts the selection
      if (dateStr < tempStart) {
        // Clicked an earlier date -> update start date and continue awaiting end date
        setTempStart(dateStr);
        setTempEnd("");
        setIsSelectingRange(true);
        setHoverDate(null);
      } else if (dateStr === tempStart) {
        // Clicked the same date again -> select single day
        setTempStart(dateStr);
        setTempEnd(dateStr);
        setIsSelectingRange(false);
        setHoverDate(null);
      } else {
        // Clicked a date after start date -> complete range
        setTempEnd(dateStr);
        setIsSelectingRange(false);
        setHoverDate(null);
      }
    }
  };

  const handleApply = () => {
    if (!tempStart) {
      onClear();
      setIsOpen(false);
      return;
    }
    const finalStart = tempStart;
    const finalEnd = tempEnd || tempStart;
    onCustomDateChange(finalStart, finalEnd);
    setIsOpen(false);
  };

  const handleQuickPreset = (presetId: string) => {
    onPresetSelect(presetId);
    setIsOpen(false);
  };

  const getDaysCount = (start: string, end: string) => {
    const d1 = parseYMD(start);
    const d2 = parseYMD(end);
    if (!d1 || !d2) return 0;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const activeRangeStart = tempStart;
  const activeRangeEnd = isSelectingRange
    ? (hoverDate && hoverDate >= tempStart ? hoverDate : null)
    : (tempEnd || (tempStart ? tempStart : null));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${
            isOpen
              ? "border-slate-400 bg-slate-100 text-slate-900 shadow-sm ring-2 ring-slate-400/15"
              : isFiltered
                ? "border-indigo-300 bg-indigo-50/90 text-indigo-950 font-bold"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <CalendarIcon className={`size-3.5 ${isFiltered ? "text-indigo-600" : "text-slate-400"}`} />
          <span>{label}</span>
          <ChevronDownIcon
            className={`size-3.5 transition-transform duration-200 ${
              isFiltered ? "text-indigo-600" : "text-slate-400"
            } ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            title="Clear date filter"
            className="ml-1 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <XMarkIcon className="size-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Mobile backdrop for tap outside on mobile */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed inset-x-3 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-auto sm:absolute sm:left-0 sm:top-full sm:mt-2 max-w-[340px] mx-auto sm:mx-0 w-auto sm:w-[330px] rounded-2xl border border-slate-200/95 bg-white p-3.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-3"
            role="dialog"
            aria-label="Calendar Date Filter"
          >
            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-slate-100">
              {QUICK_PRESETS.map((p) => {
                const isSelected = p.id === preset && !tempStart;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPreset(p.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Selection Status Bar (Normal UI Flow Indicator) */}
            <div className="p-2 rounded-xl border border-indigo-100/90 bg-indigo-50/60 text-xs">
              {isSelectingRange ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">From:</span>
                    <span className="font-bold text-indigo-950 truncate text-[11px]">
                      {formatDateDisplay(tempStart)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse shrink-0">
                    Select end date
                  </span>
                </div>
              ) : tempStart ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Selected:</span>
                    <span className="font-bold text-indigo-950 truncate text-[11px]">
                      {tempEnd && tempEnd !== tempStart
                        ? `${formatDateDisplay(tempStart)} – ${formatDateDisplay(tempEnd)}`
                        : formatDateDisplay(tempStart)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                    {tempEnd && tempEnd !== tempStart ? `${getDaysCount(tempStart, tempEnd)} days` : "Single Day"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Click a date to select range</span>
                  <span className="text-[10px] font-bold text-slate-400">All Time</span>
                </div>
              )}
            </div>

            {/* Month / Year Header */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronRightIcon className="size-4 rotate-180" />
              </button>
              <span className="text-xs font-bold text-slate-900">{monthLabel}</span>
              <button
                type="button"
                disabled={isCurrentOrFutureMonth}
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className={`p-1 rounded-lg transition ${
                  isCurrentOrFutureMonth
                    ? "opacity-30 cursor-not-allowed text-slate-300"
                    : "hover:bg-slate-100 text-slate-600 cursor-pointer"
                }`}
                aria-label="Next month"
                title={isCurrentOrFutureMonth ? "Future dates not available" : "Next month"}
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-[10px] font-bold uppercase text-slate-400">
                  {w}
                </span>
              ))}
            </div>

            {/* Calendar Day Grid */}
            <div
              className="grid grid-cols-7 gap-1"
              onMouseLeave={() => {
                if (isSelectingRange) setHoverDate(null);
              }}
            >
              {cells.map(({ dateStr, inMonth }, idx) => {
                const dayNum = parseYMD(dateStr)?.getDate();
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;

                const isStart = Boolean(activeRangeStart && dateStr === activeRangeStart);
                const isEnd = Boolean(activeRangeEnd && dateStr === activeRangeEnd);
                const isSingleDay = Boolean(
                  (isStart && (activeRangeEnd === activeRangeStart || (!activeRangeEnd && !isSelectingRange))) ||
                  (isStart && isEnd)
                );

                const inRange = Boolean(
                  activeRangeStart &&
                  activeRangeEnd &&
                  activeRangeStart !== activeRangeEnd &&
                  dateStr > activeRangeStart &&
                  dateStr < activeRangeEnd
                );

                const isEndpoint = (isStart || isEnd) && !isFuture;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleDayClick(dateStr)}
                    onMouseEnter={() => {
                      if (isSelectingRange && tempStart && !isFuture && dateStr >= tempStart) {
                        setHoverDate(dateStr);
                      }
                    }}
                    className={`h-8 text-xs font-semibold flex items-center justify-center transition-all relative ${
                      isFuture
                        ? "text-slate-300 opacity-25 cursor-not-allowed pointer-events-none bg-slate-50/30 rounded-lg"
                        : !inMonth
                          ? "text-slate-300 hover:text-slate-500 cursor-pointer rounded-lg"
                          : "text-slate-700 hover:bg-slate-100 cursor-pointer rounded-lg"
                    } ${
                      inRange && !isFuture
                        ? "!bg-indigo-50 !text-indigo-900 !rounded-none font-bold"
                        : ""
                    } ${
                      isSingleDay && !isFuture
                        ? "!bg-indigo-600 !text-white !rounded-lg font-black shadow-xs z-10 hover:!bg-indigo-700"
                        : isStart && !isFuture
                          ? "!bg-indigo-600 !text-white !rounded-l-lg !rounded-r-none font-black shadow-xs z-10 hover:!bg-indigo-700"
                          : isEnd && !isFuture
                            ? "!bg-indigo-600 !text-white !rounded-r-lg !rounded-l-none font-black shadow-xs z-10 hover:!bg-indigo-700"
                            : ""
                    } ${
                      isToday && !isEndpoint && !inRange
                        ? "ring-1 ring-slate-300 font-bold text-indigo-600"
                        : ""
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer Selection Summary & Action Buttons */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] text-slate-600 flex items-center justify-between px-0.5">
                <span className="font-medium text-slate-400">Selected:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {isSelectingRange ? (
                    `${formatDateShort(tempStart)} → picking end date`
                  ) : tempStart ? (
                    tempEnd && tempEnd !== tempStart ? (
                      `${formatDateShort(tempStart)} – ${formatDateShort(tempEnd)}`
                    ) : (
                      formatDateDisplay(tempStart)
                    )
                  ) : (
                    "All Time"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTempStart("");
                    setTempEnd("");
                    setIsSelectingRange(false);
                    setHoverDate(null);
                    onClear();
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Apply Date
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Cancel Order & Refund Prompt Modal ──────────────────────────────────────
interface CancelOrderModalProps {
  order: Order;
  onConfirm: (refundPayment: boolean, note?: string) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

function CancelOrderModal({ order, onConfirm, onClose, isSubmitting }: CancelOrderModalProps) {
  useBodyScrollLock(true);
  const [note, setNote] = useState("");
  const isPaid = order.paymentStatus === "PAID";
  const isOnlineOrQr = order.paymentMethod === "ONLINE" || order.paymentMethod === "QR";
  const shortId = `#${order.id.slice(-8)}`;
  const total = (order.finalAmount ?? order.totalAmount)?.toFixed(2) ?? "0.00";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <XCircleIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cancel Order {shortId}
              </h3>
              <p className="text-xs text-slate-500">
                Customer: <span className="font-semibold text-slate-700">{order.user?.username || "N/A"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Order Info Summary */}
        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Total Order Amount:</span>
            <span className="font-bold text-slate-900 text-sm">₹{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Payment Method:</span>
            <span className="font-semibold text-slate-800">
              {order.paymentMethod === "QR"
                ? "Pay with QR"
                : order.paymentMethod === "ONLINE"
                ? "Online (Razorpay / UPI)"
                : order.paymentMethod === "CASH"
                ? "Cash"
                : "Cash on Delivery (COD)"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Current Payment Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
              isPaid
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}>
              {order.paymentStatus || "PENDING"}
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span>Stock for all ordered items will be automatically restored to inventory.</span>
          </div>
        </div>

        {/* Question & Actions */}
        {isPaid || isOnlineOrQr ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1.5">
              <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <InformationCircleIcon className="size-4 text-amber-600 shrink-0" />
                Has the payment of ₹{total} been refunded to the customer?
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If you have already processed the refund outside the system (via Razorpay or bank transfer), select <strong>Yes, Mark as Refunded</strong>. If not, select <strong>No, Refund Later</strong> — you can record the refund at any time later.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Optional Cancellation / Refund Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason or reference (e.g., Customer requested refund via UPI)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer order-3 sm:order-1"
              >
                Keep Order Active
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false, note)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 rounded-xl transition cursor-pointer shadow-xs order-2"
              >
                {isSubmitting ? "Cancelling..." : "No, Cancel & Refund Later"}
              </button>
              <button
                type="button"
                onClick={() => onConfirm(true, note)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-sm order-1 sm:order-3"
              >
                {isSubmitting ? "Processing..." : "Yes, Mark as Refunded"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this order? Since this is a Pay on Delivery (COD) order with no payment collected, the order status will be updated to <strong>Cancelled</strong> and items returned to stock.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => onConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-sm"
              >
                {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Record Refund Confirmation Modal ──────────────────────────────────────
interface RecordRefundModalProps {
  order: Order;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

function RecordRefundModal({ order, onConfirm, onClose, isSubmitting }: RecordRefundModalProps) {
  useBodyScrollLock(true);
  const shortId = `#${order.id.slice(-8)}`;
  const total = (order.finalAmount ?? order.totalAmount)?.toFixed(2) ?? "0.00";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
              <CurrencyRupeeIcon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm Refund
              </h3>
              <p className="text-xs text-slate-500">
                Order {shortId} • {order.user?.username || "Customer"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/70 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Refund Amount:</span>
            <span className="font-extrabold text-slate-900 text-sm">₹{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Payment Method:</span>
            <span className="font-semibold text-slate-800">
              {order.paymentMethod === "QR"
                ? "Pay with QR"
                : order.paymentMethod === "ONLINE"
                ? "Online (Razorpay / UPI)"
                : order.paymentMethod === "CASH"
                ? "Cash"
                : "Cash on Delivery (COD)"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Current Status:</span>
            <span className="font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
              Refund Pending
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11.5px] text-amber-900 leading-relaxed flex items-start gap-2">
          <InformationCircleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Have you transferred the refund of <strong>₹{total}</strong> to the customer outside the system (via UPI / Razorpay / bank transfer)? Confirming will update the payment status to <strong>Refunded</strong>.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Keep Pending
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Recording..." : "Yes, Mark as Refunded"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminOrderManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();

  const isStaff = user.role === "STAFF";
  const canUpdateOrder = !isStaff || hasPermission("ORDER_UPDATE");

  const [orders, setOrders] = useState<Order[]>([]);
  const [adminStaffList, setAdminStaffList] = useState<AdminStaffUser[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  // getOrdersForAdmin (order.controller.ts) is already paginated server-side
  // (default limit=20, capped at 100) — previously this page always requested page 1
  // with no way to see anything past the first 20 orders. Page-forward controls below.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ORDERS_PAGE_SIZE = 20;

  // Filter & Search states
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "CUSTOMER" | "ADMIN">("ALL");
  const [placedByFilter, setPlacedByFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | "UNPRINTED" | "PRINTED">("ALL");
  const [datePreset, setDatePreset] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState<{ orderIds?: string[]; unprintedOnly?: boolean }>({});

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [shipModalOrder, setShipModalOrder] = useState<Order | null>(null);
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const fetchAllOrders = useCallback(async (
    targetPage: number,
    filters?: {
      source?: "ALL" | "CUSTOMER" | "ADMIN";
      placedBy?: string;
      status?: string;
      invoiceFilter?: "ALL" | "UNPRINTED" | "PRINTED";
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ) => {
    setTableLoading(true);
    setError(null);
    try {
      const activeSource = filters?.source !== undefined ? filters.source : sourceFilter;
      const activePlacedBy = filters?.placedBy !== undefined ? filters.placedBy : placedByFilter;
      const activeStatus = filters?.status !== undefined ? filters.status : statusFilter;
      const activeInvoice = filters?.invoiceFilter !== undefined ? filters.invoiceFilter : invoiceFilter;
      const activeStartDate = filters?.startDate !== undefined ? filters.startDate : startDate;
      const activeEndDate = filters?.endDate !== undefined ? filters.endDate : endDate;
      const activeSearch = filters?.search !== undefined ? filters.search : searchQueryRef.current;

      const params: Record<string, any> = {
        page: targetPage,
        limit: ORDERS_PAGE_SIZE,
      };

      if (activeSource && activeSource !== "ALL") params.source = activeSource;
      if (activePlacedBy) params.placedBy = activePlacedBy;
      if (activeStatus) params.status = activeStatus;
      if (activeInvoice === "UNPRINTED") params.invoicePrinted = "false";
      if (activeInvoice === "PRINTED") params.invoicePrinted = "true";
      if (activeStartDate) params.startDate = activeStartDate;
      if (activeEndDate) params.endDate = activeEndDate;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get(ADMIN_ALL_ORDERS_ENDPOINT, { params });
      setOrders(res.data.order || []);
      if (res.data.adminStaffList) {
        setAdminStaffList(res.data.adminStaffList);
      }
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalOrders(res.data.pagination?.total ?? (res.data.order || []).length);
    } catch (err) {
      const _e = err as any;
      console.error("Error fetching all orders:", err);
      const status = _e.response?.status;
      if (status === 403) {
        setError("Failed to fetch orders: You do not have Admin permissions.");
      } else {
        setError("Failed to fetch orders. Please check backend connection and API endpoint.");
      }
    } finally {
      setTableLoading(false);
      setInitialLoading(false);
    }
  }, [sourceFilter, placedByFilter, statusFilter, invoiceFilter, startDate, endDate]);

  const handleSourceChange = (newSource: "ALL" | "CUSTOMER" | "ADMIN") => {
    setSourceFilter(newSource);
    setPage(1);
    fetchAllOrders(1, { source: newSource });
    fetchOrderStats({ source: newSource });
  };

  const handleStatusFilterChange = (st: string) => {
    setStatusFilter(st);
    setPage(1);
    fetchAllOrders(1, { status: st });
    fetchOrderStats({ status: st });
  };

  const handleInvoiceFilterChange = (newInvFilter: "ALL" | "UNPRINTED" | "PRINTED") => {
    setInvoiceFilter(newInvFilter);
    setSelectedOrderIds([]);
    setPage(1);
    fetchAllOrders(1, { invoiceFilter: newInvFilter });
    fetchOrderStats({ invoiceFilter: newInvFilter });
  };

  const handleDatePresetSelect = (presetId: string) => {
    setDatePreset(presetId);
    if (presetId === "CUSTOM") {
      return;
    }
    const { startDate: s, endDate: e } = getPresetDates(presetId);
    setStartDate(s);
    setEndDate(e);
    setPage(1);
    fetchAllOrders(1, { startDate: s, endDate: e });
    fetchOrderStats({ startDate: s, endDate: e });
  };

  const handleCustomDateApply = (start: string, end: string) => {
    setDatePreset("CUSTOM");
    setStartDate(start);
    setEndDate(end);
    setPage(1);
    fetchAllOrders(1, { startDate: start, endDate: end });
    fetchOrderStats({ startDate: start, endDate: end });
  };

  const handleClearDateFilter = () => {
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
    fetchAllOrders(1, { startDate: "", endDate: "" });
    fetchOrderStats({ startDate: "", endDate: "" });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    searchDebounceTimer.current = setTimeout(() => {
      setPage(1);
      fetchAllOrders(1, { search: q });
    }, 300);
  };

  const handleClearFilters = () => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    setSourceFilter("ALL");
    setPlacedByFilter("");
    setStatusFilter("");
    setInvoiceFilter("ALL");
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setSelectedOrderIds([]);
    setPage(1);
    fetchAllOrders(1, { source: "ALL", placedBy: "", status: "", invoiceFilter: "ALL", startDate: "", endDate: "", search: "" });
    fetchOrderStats({ source: "ALL", placedBy: "", status: "", invoiceFilter: "ALL", startDate: "", endDate: "" });
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOnPage = () => {
    if (orders.length === 0) return;
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.id));
    }
  };

  const handleBatchMarkPrinted = async (orderIds: string[], printed: boolean) => {
    try {
      await api.post("/order/mark-invoices-printed", { orderIds, printed });
      toast.success(`Marked ${orderIds.length} order(s) as ${printed ? "printed" : "unprinted"}`);
      setSelectedOrderIds([]);
      fetchAllOrders(page);
      fetchOrderStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update print status");
    }
  };

  // Header metric cards are computed server-side and dynamically scoped to active filters
  // (source, placedBy, status, invoicePrinted, startDate, endDate) so volumes, income, and fulfillment progress
  // accurately reflect whatever segment of the pipeline is currently being viewed.
  const fetchOrderStats = useCallback(async (filters?: {
    source?: "ALL" | "CUSTOMER" | "ADMIN";
    placedBy?: string;
    status?: string;
    invoiceFilter?: "ALL" | "UNPRINTED" | "PRINTED";
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const activeSource = filters?.source !== undefined ? filters.source : sourceFilter;
      const activePlacedBy = filters?.placedBy !== undefined ? filters.placedBy : placedByFilter;
      const activeStatus = filters?.status !== undefined ? filters.status : statusFilter;
      const activeInvoice = filters?.invoiceFilter !== undefined ? filters.invoiceFilter : invoiceFilter;
      const activeStartDate = filters?.startDate !== undefined ? filters.startDate : startDate;
      const activeEndDate = filters?.endDate !== undefined ? filters.endDate : endDate;

      const params: Record<string, any> = {};
      if (activeSource && activeSource !== "ALL") params.source = activeSource;
      if (activePlacedBy) params.placedBy = activePlacedBy;
      if (activeStatus) params.status = activeStatus;
      if (activeInvoice === "UNPRINTED") params.invoicePrinted = "false";
      if (activeInvoice === "PRINTED") params.invoicePrinted = "true";
      if (activeStartDate) params.startDate = activeStartDate;
      if (activeEndDate) params.endDate = activeEndDate;

      const res = await api.get(ADMIN_ORDER_STATS_ENDPOINT, { params });
      setOrderStats(res.data);
    } catch (err) {
      console.error("Error fetching order stats:", err);
    }
  }, [sourceFilter, placedByFilter, statusFilter, invoiceFilter, startDate, endDate]);

  useEffect(() => {
    fetchAllOrders(page);
    fetchOrderStats();
  }, [fetchAllOrders, fetchOrderStats, page]);

  // Deep-link support: a notification about a specific order (NEW_ORDER, status
  // change, payment) lands here via ?orderId= instead of just the bare list — the
  // order it's about might not even be on the first page of `orders` (capped/paginated,
  // see fetchAllOrders), so this fetches it directly rather than searching the loaded
  // page. Removes the param once handled so a later manual refresh doesn't re-open it.
  useEffect(() => {
    const targetId = searchParams.get("orderId");
    if (!targetId) return;
    api
      .get(`/order/${targetId}`)
      .then((res) => {
        if (res.data?.order) {
          setSelectedOrder(res.data.order);
          setDrawerOpen(true);
        }
      })
      .catch(() => {
        console.error("Failed to load linked order", targetId);
      })
      .finally(() => {
        searchParams.delete("orderId");
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locks body scrolling while the order drawer, ship modal, cancel modal, or refund modal is open
  useBodyScrollLock(drawerOpen || !!shipModalOrder || !!cancelModalOrder || !!refundModalOrder || !!blockedMessage);

  const handleConfirmCancel = async (refundPayment: boolean, note?: string) => {
    const orderId = cancelModalOrder?.id;
    if (!orderId) return;

    setCancelSubmitting(true);
    try {
      const { data } = await api.put(`${ADMIN_UPDATE_STATUS_ENDPOINT}/${orderId}`, {
        orderStatus: "CANCELLED",
        refundPayment,
        refundNote: note,
      });

      const updatedOrder = data?.order;
      const finalPaymentStatus = refundPayment ? "REFUNDED" : (updatedOrder?.paymentStatus ?? cancelModalOrder.paymentStatus);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                orderStatus: "CANCELLED",
                paymentStatus: finalPaymentStatus,
              }
            : o
        )
      );

      setSelectedOrder((prev) =>
        prev && prev.id === orderId
          ? {
              ...prev,
              orderStatus: "CANCELLED",
              paymentStatus: finalPaymentStatus,
            }
          : prev
      );

      toast.success(
        refundPayment
          ? `Order #${orderId.slice(-8)} cancelled and marked as refunded.`
          : `Order #${orderId.slice(-8)} cancelled.`
      );
      setCancelModalOrder(null);
      fetchOrderStats();
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      toast.error(err?.response?.data?.message ?? `Failed to cancel order #${orderId.slice(-8)}.`);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder || currentOrder.orderStatus === newStatus) return;

    const willBePaidOnDelivery = newStatus === "DELIVERED" && currentOrder.paymentStatus === "PENDING";
    const originalOrders = [...orders];
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              orderStatus: newStatus,
              ...(willBePaidOnDelivery ? { paymentStatus: "PAID" } : {}),
            }
          : order
      )
    );

    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            orderStatus: newStatus,
            ...(willBePaidOnDelivery ? { paymentStatus: "PAID" } : {}),
          }
        : prev
    );

    try {
      const { data } = await api.put(
        `${ADMIN_UPDATE_STATUS_ENDPOINT}/${orderId}`,
        { orderStatus: newStatus }
      );
      if (data?.order) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, ...data.order } : order
          )
        );
        setSelectedOrder((prev) =>
          prev && prev.id === orderId ? { ...prev, ...data.order } : prev
        );
      }
      fetchOrderStats();
    } catch (err) {
      const _e = err as any;
      console.error("Failed to update order status:", err);
      alert(`Failed to update status for order #${orderId.slice(-8)}. Reverting change.`);
      setOrders(originalOrders);
      const revertOrder = originalOrders.find((o) => o.id === orderId);
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? (revertOrder ?? null) : prev
      );
    }
  };

  // Ship transition requires courier + tracking info first — the modal collects it,
  // then this actually performs the same status-update call handleUpdateStatus does,
  // just with the extra fields included in the request body.
  const handleShipOrder = async (payload: ShipOrderPayload) => {
    const orderId = shipModalOrder?.id;
    if (!orderId) return;

    setShipSubmitting(true);
    try {
      const { data } = await api.put(`${ADMIN_UPDATE_STATUS_ENDPOINT}/${orderId}`, {
        orderStatus: "SHIPPED",
        ...payload,
      });
      const updatedOrder = data.order;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                orderStatus: "SHIPPED",
                deliveryPartnerName: updatedOrder?.deliveryPartnerName,
                trackingId: updatedOrder?.trackingId,
                trackingLink: updatedOrder?.trackingLink,
                shippingNote: updatedOrder?.shippingNote,
              }
            : o
        )
      );
      setSelectedOrder((prev) =>
        prev && prev.id === orderId
          ? {
              ...prev,
              orderStatus: "SHIPPED",
              deliveryPartnerName: updatedOrder?.deliveryPartnerName,
              trackingId: updatedOrder?.trackingId,
              trackingLink: updatedOrder?.trackingLink,
              shippingNote: updatedOrder?.shippingNote,
            }
          : prev
      );
      setShipModalOrder(null);
      fetchOrderStats();
    } catch (err) {
      const _e = err as any;
      console.error("Failed to ship order:", err);
      alert(_e?.response?.data?.message ?? `Failed to ship order #${orderId.slice(-8)}.`);
    } finally {
      setShipSubmitting(false);
    }
  };

  const handleConfirmRecordRefund = async () => {
    const orderId = refundModalOrder?.id;
    if (!orderId) return;

    if (!canUpdateOrder) {
      toast.error("You don't have permission to record refunds.");
      return;
    }

    setRefundSubmitting(true);
    try {
      await api.patch(`/order/${orderId}/refund`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: "REFUNDED" } : o))
      );
      setSelectedOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, paymentStatus: "REFUNDED" } : prev
      );
      toast.success(`Order #${orderId.slice(-8)} marked as refunded.`);
      setRefundModalOrder(null);
      fetchOrderStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to record refund");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleViewInvoice = (orderId: string) => {
    navigate(`/invoice/${orderId}`);
  };

  // Sourced from getOrderStats (unbounded aggregation over every order), not reduced
  // from the paginated `orders` list — see fetchOrderStats above for why.
  const metrics = useMemo(() => {
    const s = orderStats;
    const processing = s?.processing ?? 0;
    const confirmed = s?.confirmed ?? 0;
    const shipped = s?.shipped ?? 0;
    const delivered = s?.delivered ?? 0;
    const cancelled = s?.cancelled ?? 0;
    const returned = s?.returned ?? 0;
    const totalOrders = s?.totalOrders ?? 0;
    return {
      totalOrders,
      paidRevenue: s?.paidRevenue ?? 0,
      totalOrderValue: s?.totalOrderValue ?? 0,
      pureProcessing: processing,
      confirmed,
      shipped,
      delivered,
      cancelled,
      returned,
      processing: processing + confirmed,
      // "Dispatched & Done" is two states by its own name — shipped (dispatched) and
      // delivered (done) — not delivered alone.
      dispatchedAndDone: shipped + delivered,
      // Orders that can still move through the pipeline. Cancelled and returned orders are excluded
      // from the funnel-progress percentages below so they don't
      // silently deflate every other bar — cancellation/return gets its own signal elsewhere.
      activeOrders: totalOrders - cancelled - returned,
      unprintedInvoices: s?.unprintedInvoices ?? 0,
    };
  }, [orderStats]);

  // Bar widths for the fulfillment-progress cards, as a % of active (non-cancelled) orders.
  const graphPercentages = useMemo(() => {
    if (!metrics.activeOrders) return { processing: 0, confirmed: 0, shipped: 0, delivered: 0, dispatchedAndDone: 0, cancelled: 0 };
    const calc = (val: number) => (val / metrics.activeOrders) * 100;
    return {
      processing: calc(metrics.pureProcessing),
      confirmed: calc(metrics.confirmed),
      shipped: calc(metrics.shipped),
      delivered: calc(metrics.delivered),
      dispatchedAndDone: calc(metrics.dispatchedAndDone),
      cancelled: metrics.totalOrders ? (metrics.cancelled / metrics.totalOrders) * 100 : 0,
    };
  }, [metrics]);

  // % of total order value that's actually been collected (PAID) — replaces the card's
  // previous hardcoded 78% "Target Pace Achieved" bar, which never reflected real data.
  const collectedPct = metrics.totalOrderValue > 0 ? (metrics.paidRevenue / metrics.totalOrderValue) * 100 : 0;

  // Per-status distribution segments for the "Total Volumes" progress bar
  const volumeSegments = useMemo(() => {
    if (!metrics.totalOrders) return [];
    return [
      { key: "Processing", count: metrics.pureProcessing, color: "bg-amber-400", pct: (metrics.pureProcessing / metrics.totalOrders) * 100 },
      { key: "Confirmed", count: metrics.confirmed, color: "bg-orange-400", pct: (metrics.confirmed / metrics.totalOrders) * 100 },
      { key: "Shipped", count: metrics.shipped, color: "bg-sky-400", pct: (metrics.shipped / metrics.totalOrders) * 100 },
      { key: "Delivered", count: metrics.delivered, color: "bg-emerald-500", pct: (metrics.delivered / metrics.totalOrders) * 100 },
      { key: "Cancelled", count: metrics.cancelled, color: "bg-rose-400", pct: (metrics.cancelled / metrics.totalOrders) * 100 },
    ].filter((s) => s.count > 0);
  }, [metrics]);

  const openDrawer = (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
  };

  const isFiltered =
    sourceFilter !== "ALL" ||
    Boolean(placedByFilter) ||
    Boolean(statusFilter) ||
    invoiceFilter !== "ALL" ||
    datePreset !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery.trim());

  if (initialLoading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 md:p-10">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex justify-between items-center animate-pulse">
            <div className="space-y-2">
              <div className="h-8 w-56 rounded-xl bg-slate-200" />
              <div className="h-4 w-80 rounded-lg bg-slate-200" />
            </div>
            <div className="h-10 w-32 rounded-xl bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100">
            <XCircleIcon className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Operations Error</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => fetchAllOrders(page)}
            className="w-full inline-flex justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/60 min-h-screen font-sans antialiased text-slate-900">
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-6">

        {/* Page Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">
                Order Management
              </h1>
              {metrics.totalOrders > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                  {metrics.totalOrders} {metrics.totalOrders === 1 ? "order" : "orders"}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Track pipeline fulfillment, manage status lifecycles, and generate printable invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchAllOrders(page);
                fetchOrderStats();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
            >
              <ArrowPathIcon className="size-3.5 text-slate-500" />
              <span>Sync Orders</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

          {/* Card 1: Total Volumes */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-200 flex flex-col justify-between h-36">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Volumes</p>
                <p className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-slate-950">
                  {metrics.totalOrders}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                <ShoppingBagIcon className="size-4" />
              </div>
            </div>
            <div className="w-full pt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                {volumeSegments.map((seg) => (
                  <div
                    key={seg.key}
                    className={`h-full ${seg.color} transition-all duration-500`}
                    style={{ width: `${seg.pct}%` }}
                    title={`${seg.key}: ${seg.count} (${seg.pct.toFixed(0)}%)`}
                  />
                ))}
                {volumeSegments.length === 0 && <div className="h-full bg-slate-200 w-full" />}
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Active ({metrics.activeOrders})
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Delivered ({metrics.delivered})
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Gross Income */}
          <div className="rounded-2xl border border-emerald-100/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between h-36">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Gross Income</p>
                <p className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-emerald-950">
                  ₹{metrics.paidRevenue.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700">
                <CurrencyRupeeIcon className="size-4" />
              </div>
            </div>
            <div className="w-full pt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-2xs"
                  style={{ width: `${Math.min(collectedPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
                <span>₹{metrics.totalOrderValue.toLocaleString("en-IN")} ordered</span>
                <span className="text-emerald-700 font-bold">{collectedPct.toFixed(0)}% Collected</span>
              </div>
            </div>
          </div>

          {/* Card 3: In Processing */}
          <div className="rounded-2xl border border-amber-100/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-amber-200 transition-all duration-200 flex flex-col justify-between h-36">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">In Processing</p>
                <p className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-amber-950">
                  {metrics.processing}
                </p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-700">
                <ClockIcon className="size-4" />
              </div>
            </div>
            <div className="w-full pt-2">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${graphPercentages.processing}%` }} className="h-full bg-amber-400 transition-all duration-500" />
                <div style={{ width: `${graphPercentages.confirmed}%` }} className="h-full bg-orange-400 transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Proc ({metrics.pureProcessing})
                </span>
                <span className="flex items-center gap-1 text-orange-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  Conf ({metrics.confirmed})
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Dispatched & Done */}
          <div className="rounded-2xl border border-indigo-100/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between h-36">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Dispatched & Done</p>
                <p className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-indigo-950">
                  {metrics.dispatchedAndDone}
                </p>
              </div>
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700">
                <CheckCircleIcon className="size-4" />
              </div>
            </div>
            <div className="w-full pt-2">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${graphPercentages.shipped}%` }} className="h-full bg-sky-400 transition-all duration-500" />
                <div style={{ width: `${graphPercentages.delivered}%` }} className="h-full bg-indigo-600 transition-all duration-500" />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Shipped ({metrics.shipped})
                </span>
                <span className="flex items-center gap-1 text-indigo-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  Delivered ({metrics.delivered})
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Master Table Area */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-visible relative">
          <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col gap-3.5 bg-slate-50/60 rounded-t-2xl relative z-20 overflow-visible">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Orders Pipeline</h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time checkout listings. Update order progress and print customer invoices.</p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setBulkModalParams({ unprintedOnly: true });
                    setBulkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                  title="Print all invoices for unprinted orders at once"
                >
                  <Printer className="size-3.5" />
                  <span>Print Unprinted Invoices</span>
                  {(metrics.unprintedInvoices ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-800/90 text-indigo-100 text-[10px] font-black">
                      {metrics.unprintedInvoices}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Bar Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-0.5">
                  <FunnelIcon className="size-3.5 text-slate-400" /> Filter:
                </span>

                {/* Order Source Filter Dropdown with Checkbox Options */}
                <OrderSourceFilterDropdown
                  value={sourceFilter}
                  onChange={handleSourceChange}
                />

                {/* Invoice Printed Filter Dropdown */}
                <InvoiceFilterDropdown
                  value={invoiceFilter}
                  unprintedCount={metrics.unprintedInvoices ?? 0}
                  onChange={handleInvoiceFilterChange}
                />

                {/* Order Status Filter */}
                <StatusFilterDropdown
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                />

                {/* Date Filter Dropdown */}
                <DateFilterDropdown
                  preset={datePreset}
                  startDate={startDate}
                  endDate={endDate}
                  onPresetSelect={handleDatePresetSelect}
                  onCustomDateChange={handleCustomDateApply}
                  onClear={handleClearDateFilter}
                />
              </div>

              {/* Right side: Search Box & Reset Filters Button */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  {tableLoading ? (
                    <ArrowPathIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-indigo-600 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search orders..."
                    className="h-9 w-full sm:w-56 rounded-xl border border-slate-200/90 bg-white pl-8 pr-7 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 transition shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        if (searchDebounceTimer.current) {
                          clearTimeout(searchDebounceTimer.current);
                        }
                        setSearchQuery("");
                        setPage(1);
                        fetchAllOrders(1, { search: "" });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  )}
                </div>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 transition cursor-pointer shadow-2xs shrink-0"
                  >
                    <XMarkIcon className="size-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

          </div>

          <div className={`overflow-x-auto rounded-b-2xl min-h-[380px] relative z-10 transition-opacity duration-150 ${tableLoading ? "opacity-60" : "opacity-100"}`}>
            <table className="w-full min-w-[960px] text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <th className="pl-6 pr-3 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                      onChange={toggleSelectAllOnPage}
                      className="size-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Update Status</th>
                  <th className="px-6 py-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      onClick={() => openDrawer(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* 1. Checkbox Column */}
                      <td
                        className="pl-6 pr-3 py-5 w-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="size-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* 2. Date Column */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </span>
                          <span className="text-xs font-medium text-slate-500 mt-1">
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : ""}
                          </span>
                        </div>
                      </td>

                      {/* 3. Customer Name Column */}
                      <td className="px-6 py-5">
                        <div className="max-w-[280px] truncate">
                          <p className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                            {order.user?.username || "N/A"}
                          </p>
                          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                            {order.user?.email || "No email"}
                          </p>
                          {order.user?.phone && (
                            <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
                              {order.user.phone}
                            </p>
                          )}

                          {/* Order Origin / Placed By Tag */}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {order.placedByAdminId ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                                title={`Placed internally by ${order.placedByAdmin?.username ? `${order.placedByAdmin.username} (${order.placedByAdmin.role})` : "Admin/Staff"}`}
                              >
                                <span>
                                  {order.placedByAdmin?.role === "STAFF" ? "Staff" : "Admin"}:{" "}
                                  <strong className="font-bold text-indigo-900">{order.placedByAdmin?.username ?? "Our Side"}</strong>
                                </span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs"
                                title="Customer placed directly via storefront online checkout"
                              >
                                <span>Customer Order</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Amount Column */}
                      <td className="px-6 py-5">
                        <div>
                          <span className={order.orderStatus === "CANCELLED" ? "line-through text-slate-400 font-medium text-base" : "text-slate-950 font-black text-lg tracking-tight"}>
                            ₹{(order.finalAmount ?? order.totalAmount)?.toFixed(2) ?? "0.00"}
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {order.paymentMethod === "QR" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                                <QrCodeIcon className="size-3.5 text-purple-600" /> Pay with QR
                              </span>
                            ) : order.paymentMethod === "ONLINE" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                Online
                              </span>
                            ) : order.paymentMethod === "CASH" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
                                Cash
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                COD
                              </span>
                            )}

                            {/* Small, clean Refund Pending status & Mark Refunded action */}
                            {order.orderStatus === "CANCELLED" && order.paymentStatus === "PAID" && (
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                  title="Order cancelled but payment refund is pending"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Refund Pending
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRefundModalOrder(order);
                                  }}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                                  title="Record refund for this order"
                                >
                                  Mark Refunded
                                </button>
                              </div>
                            )}

                            {order.paymentStatus === "REFUNDED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                Refunded
                              </span>
                            )}

                            {/* Cancelled COD/unpaid order - No payment collected */}
                            {order.orderStatus === "CANCELLED" && (!order.paymentStatus || order.paymentStatus === "PENDING") && (order.paymentMethod === "POD" || order.paymentMethod === "COD" || order.paymentMethod === "CASH") && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                No Payment Made
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Update Status Column */}
                      <td className="px-6 py-5">
                        <div className="relative inline-flex flex-wrap gap-1.5 items-center bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/70 shadow-2xs">
                          {statusOptions.map((status) => {
                            const isCurrent = order.orderStatus === status;
                            const targetClasses = getStatusClasses(status);
                            const chipDisabled = isStatusChipDisabled(order.orderStatus, status, canUpdateOrder);

                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={chipDisabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (order.orderStatus === status) return;
                                  if (order.orderStatus === "CANCELLED" || order.orderStatus === "DELIVERED" || order.orderStatus === "RETURNED") return;
                                  const blocked = blockedStatusMessage(order.orderStatus, status);
                                  if (blocked) {
                                    setBlockedMessage(blocked);
                                    return;
                                  }
                                  if (status === "SHIPPED") {
                                    setShipModalOrder(order);
                                  } else if (status === "CANCELLED") {
                                    setCancelModalOrder(order);
                                  } else {
                                    handleUpdateStatus(order.id, status);
                                  }
                                }}
                                className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border transition-all duration-150 ${
                                  isCurrent
                                    ? `${targetClasses.chipActive} cursor-default opacity-100`
                                    : chipDisabled
                                      ? "bg-transparent text-slate-300 border-transparent cursor-not-allowed opacity-40"
                                      : "bg-white text-slate-700 border-slate-200/90 hover:text-slate-950 hover:border-slate-300 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                                }`}
                              >
                                {statusLabel(status)}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* 6. Invoice Column */}
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoice(order.id);
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-all shrink-0 whitespace-nowrap cursor-pointer active:scale-95 ${
                            order.invoicePrinted
                              ? "border-slate-200 bg-slate-100/90 text-slate-800 hover:bg-slate-200/80 hover:border-slate-300"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                          title={order.invoicePrinted ? "Invoice Printed (Click to view/reprint)" : "Invoice Unprinted (Click to print)"}
                        >
                          <DocumentTextIcon className="size-4 shrink-0 text-slate-500" />
                          <span>Invoice</span>
                          {order.invoicePrinted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                              <CheckIcon className="size-3.5 stroke-[2.5] text-slate-600" />
                              Printed
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              Unprinted
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && !tableLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 border border-slate-200/60 shadow-2xs">
                        <ShoppingBagIcon className="size-7 text-slate-400" />
                      </div>
                      <p className="text-base font-bold text-slate-800">No orders found</p>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                        {isFiltered
                          ? "No orders match your active filter criteria (date range, status, origin, or search query)."
                          : "There are currently no orders registered in the pipeline."}
                      </p>
                      {isFiltered && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-4 py-2 text-xs font-bold text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 rounded-xl border border-indigo-200 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <XMarkIcon className="size-4" /> Reset All Filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalOrders > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {totalOrders === 0
                    ? 0
                    : `${(page - 1) * ORDERS_PAGE_SIZE + 1}–${Math.min(page * ORDERS_PAGE_SIZE, totalOrders)}`}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{totalOrders}</span> orders
                {totalPages > 1 && (
                  <span className="text-slate-400"> — page {page} of {totalPages}</span>
                )}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || tableLoading}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
                  >
                    <ChevronRightIcon className="size-3.5 rotate-180" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || tableLoading}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit Registry Flow Control Drawer Panel */}
        {drawerOpen && selectedOrder && createPortal(
          <>
            <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xl transition-opacity" onClick={closeDrawer} />
            <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-100">
              <div className="flex h-full flex-col bg-white">

                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Details</p>
                      {selectedOrder.invoicePrinted ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-white shadow-2xs"
                          title={selectedOrder.invoicePrintedAt ? `Printed on ${new Date(selectedOrder.invoicePrintedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Invoice already printed"}
                        >
                          <CheckIcon className="size-2.5 stroke-[3]" />
                          Printed
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 shadow-2xs border border-slate-200"
                          title="Invoice not yet printed"
                        >
                          Unprinted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-base font-black text-slate-900 tracking-tight">#{selectedOrder.id.slice(-8).toUpperCase()}</p>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {selectedOrder.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewInvoice(selectedOrder.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                    >
                      <DocumentTextIcon className="size-4" />
                      Invoice
                    </button>
                    <button type="button" onClick={closeDrawer} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                      <XMarkIcon className="size-4.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Account Metadata profile */}
                  <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm font-bold">
                        <UserIcon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {selectedOrder.user?.username || "N/A"}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {selectedOrder.user?.email || "No email provided"}
                        </p>
                        {selectedOrder.user?.phone && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {selectedOrder.user.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <hr className="border-slate-200/60" />

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Settled On</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {formatDateTime(selectedOrder.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Aggregate Net</p>
                        <p className="mt-1 font-extrabold text-slate-900 text-sm">
                          ₹{(selectedOrder.finalAmount ?? selectedOrder.totalAmount)?.toFixed(2) ?? "0.00"}
                        </p>
                        {selectedOrder.discountAmount > 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            Markdown Savings ₹{selectedOrder.discountAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Order Source / Origin Card */}
                  <section className={`rounded-2xl border p-4 text-xs ${
                    selectedOrder.placedByAdminId
                      ? "border-indigo-200 bg-indigo-50/40 text-indigo-950"
                      : "border-emerald-200 bg-emerald-50/30 text-emerald-950"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                        selectedOrder.placedByAdminId
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                          : "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      }`}>
                        {selectedOrder.placedByAdminId ? (
                          <BuildingStorefrontIcon className="size-5" />
                        ) : (
                          <ShoppingBagIcon className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-bold text-xs uppercase tracking-wider">
                            {selectedOrder.placedByAdminId
                              ? "Internal Order (Our Side)"
                              : "Direct Customer Order"}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                            selectedOrder.placedByAdminId
                              ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}>
                            {selectedOrder.placedByAdminId
                              ? (selectedOrder.placedByAdmin?.role === "STAFF" ? "Staff Order" : "Admin Order")
                              : "Online Storefront"}
                          </span>
                        </div>

                        {selectedOrder.placedByAdminId ? (
                          <div className="mt-2 pt-2 border-t border-indigo-200/60 space-y-1 text-slate-700">
                            <p className="text-xs">
                              <span className="font-semibold text-slate-500 mr-1.5">Created By:</span>
                              <strong className="text-indigo-900 font-bold">
                                {selectedOrder.placedByAdmin?.username ?? "Admin / Staff"}
                              </strong>
                              {selectedOrder.placedByAdmin?.role && (
                                <span className="ml-1.5 text-[11px] text-slate-500 font-mono">
                                  ({selectedOrder.placedByAdmin.role})
                                </span>
                              )}
                            </p>
                            {selectedOrder.placedByAdmin?.email && (
                              <p className="text-[11px] text-slate-500">
                                <span className="font-semibold mr-1.5">Email:</span>
                                {selectedOrder.placedByAdmin.email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-slate-600">
                            This order was placed directly by the customer through the online store checkout.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Drawer Level Action Chips */}
                  <section className="space-y-3 rounded-2xl border border-slate-200/80 p-5 bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Routing Segment</p>
                    <div className="flex flex-col gap-3 pt-1">
                      <div className="relative inline-flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                        {statusOptions.map((status) => {
                          const isCurrent = selectedOrder.orderStatus === status;
                          const targetClasses = getStatusClasses(status);
                          const chipDisabled = isStatusChipDisabled(selectedOrder.orderStatus, status, canUpdateOrder);

                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={chipDisabled}
                              onClick={() => {
                                if (selectedOrder.orderStatus === status) return;
                                if (selectedOrder.orderStatus === "CANCELLED" || selectedOrder.orderStatus === "DELIVERED" || selectedOrder.orderStatus === "RETURNED") return;
                                const blocked = blockedStatusMessage(selectedOrder.orderStatus, status);
                                if (blocked) {
                                  setBlockedMessage(blocked);
                                  return;
                                }
                                if (status === "SHIPPED") {
                                  setShipModalOrder(selectedOrder);
                                } else if (status === "CANCELLED") {
                                  setCancelModalOrder(selectedOrder);
                                } else {
                                  handleUpdateStatus(selectedOrder.id, status);
                                }
                              }}
                              className={`flex-1 text-center px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all duration-200 ${isCurrent
                                ? `${targetClasses.chipActive} cursor-default opacity-100`
                                : chipDisabled
                                  ? "bg-slate-50 text-slate-300 border-transparent cursor-not-allowed opacity-40"
                                  : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-xs cursor-pointer"
                                }`}
                            >
                              {statusLabel(status)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Payment & Verification Section */}
                  <section className="space-y-3 rounded-2xl border border-slate-200/80 p-5 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Information</p>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${
                        selectedOrder.paymentMethod === "QR"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : selectedOrder.paymentMethod === "ONLINE"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : selectedOrder.paymentMethod === "CASH"
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {selectedOrder.paymentMethod === "QR" && <QrCodeIcon className="size-3 text-purple-600" />}
                        {selectedOrder.paymentMethod === "QR"
                          ? "Pay with QR"
                          : selectedOrder.paymentMethod === "ONLINE"
                          ? "Online"
                          : selectedOrder.paymentMethod === "CASH"
                          ? "Cash"
                          : "Pay on Delivery"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Payment Status</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {selectedOrder.orderStatus === "CANCELLED" && (!selectedOrder.paymentStatus || selectedOrder.paymentStatus === "PENDING") && (selectedOrder.paymentMethod === "POD" || selectedOrder.paymentMethod === "COD" || selectedOrder.paymentMethod === "CASH")
                            ? "No Payment Made"
                            : selectedOrder.paymentStatus || "PENDING"}
                        </p>
                      </div>

                      {selectedOrder.transactionId && (
                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Transaction ID / UTR</p>
                          <p className="mt-1 font-mono font-bold text-purple-700 break-all text-xs bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                            {selectedOrder.transactionId}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Direct refund action if payment was collected on a cancelled or returned order */}
                    {selectedOrder.paymentStatus === "PAID" &&
                      (selectedOrder.orderStatus === "CANCELLED" || selectedOrder.orderStatus === "RETURNED") && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                        <div className="flex items-start gap-2">
                          <InformationCircleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-amber-900">
                              Payment collected on {selectedOrder.orderStatus.toLowerCase()} order
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                              Once you have refunded ₹{(selectedOrder.finalAmount ?? selectedOrder.totalAmount).toFixed(2)} to the customer via Razorpay or bank transfer, record it here.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRefundModalOrder(selectedOrder)}
                          className="w-full mt-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                        >
                          Record Refund
                        </button>
                      </div>
                    )}

                    {selectedOrder.paymentScreenshot && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2">Customer Payment Screenshot</p>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setPreviewImage(selectedOrder.paymentScreenshot!)}
                            className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-200 bg-slate-50 cursor-pointer relative group shrink-0 shadow-xs"
                            title="Click to view full screenshot"
                          >
                            <img
                              src={selectedOrder.paymentScreenshot}
                              alt="Receipt Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                              View
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800">Proof Screenshot Attached</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Customer uploaded this receipt as verification.</p>
                            <button
                              type="button"
                              onClick={() => setPreviewImage(selectedOrder.paymentScreenshot!)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 underline"
                            >
                              <PhotoIcon className="size-3.5" /> Open Full Image
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Summary item listing items mapping */}
                  <section className="space-y-4 rounded-2xl border border-slate-200/80 p-5 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manifest Summary</p>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        {selectedOrder.items?.length || 0} Products
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item: OrderItem, index: number) => {
                        const isProductUnavailable = !item.product;
                        const subtotal = (item.price || 0) * (item.quantity || 0);

                        return (
                          <div key={index} className="flex gap-4 py-3 first:pt-0 last:pb-0 group/item">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {isProductUnavailable ? (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-rose-50/50 text-[9px] font-black tracking-tight text-rose-700 text-center leading-none">
                                  <XCircleIcon className="mb-0.5 size-4 text-rose-500" />
                                  <span>VOID</span>
                                </div>
                              ) : (
                                <img
                                  src={item.product!.image || "https://placehold.co/96x96/f3f4f6/6b7280?text=No+Image"}
                                  alt={item.product!.name}
                                  className="h-full w-full object-cover object-center transition-transform group-hover/item:scale-105 duration-300"
                                />
                              )}
                            </div>

                            <div className="flex flex-1 flex-col justify-center text-xs">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-bold text-slate-900 leading-snug">
                                    {isProductUnavailable ? "Product Terminated" : item.product!.name}
                                  </p>
                                  {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                                    <p className="text-xs font-semibold text-indigo-600">
                                      {Object.entries(item.variant.options)
                                        .map(([axis, value]) => `${axis}: ${value}`)
                                        .join(" · ")}
                                    </p>
                                  )}
                                  <p className="text-xs font-medium text-slate-400">
                                    ₹{(item.price || 0).toFixed(2)} × {item.quantity}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                                  ₹{subtotal.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Delivery Address Section */}
                  {selectedOrder.shippingAddress && (
                    <section className="space-y-3 rounded-2xl border border-slate-200/80 p-5 bg-white">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Address</p>
                      {selectedOrder.shippingAddress.fullAddress && (
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                          {selectedOrder.shippingAddress.fullAddress}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                        {selectedOrder.shippingAddress.city && (
                          <span><span className="text-slate-400">City: </span>{selectedOrder.shippingAddress.city}</span>
                        )}
                        {selectedOrder.shippingAddress.state && (
                          <span><span className="text-slate-400">State: </span>{selectedOrder.shippingAddress.state}</span>
                        )}
                        {selectedOrder.shippingAddress.zipCode && (
                          <span><span className="text-slate-400">PIN: </span>{selectedOrder.shippingAddress.zipCode}</span>
                        )}
                        {selectedOrder.shippingAddress.country && (
                          <span><span className="text-slate-400">Country: </span>{selectedOrder.shippingAddress.country}</span>
                        )}
                      </div>
                      {selectedOrder.shippingAddress.lat && selectedOrder.shippingAddress.lng && (
                        <a
                          href={`https://maps.google.com/?q=${selectedOrder.shippingAddress.lat},${selectedOrder.shippingAddress.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:underline mt-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          View on Google Maps
                        </a>
                      )}
                    </section>
                  )}

                  {(selectedOrder.deliveryPartnerName || selectedOrder.trackingId || selectedOrder.shippingNote) && (
                    <section className="px-5 py-4 border-b border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Shipment Tracking</h3>
                      <div className="space-y-1 text-xs text-slate-600">
                        {selectedOrder.deliveryPartnerName && (
                          <p><span className="text-slate-400">Courier: </span>{selectedOrder.deliveryPartnerName}</p>
                        )}
                        {selectedOrder.trackingId && (
                          <p><span className="text-slate-400">Tracking ID: </span>{selectedOrder.trackingId}</p>
                        )}
                        {selectedOrder.shippingNote && (
                          <p><span className="text-slate-400">Note: </span>{selectedOrder.shippingNote}</p>
                        )}
                        {selectedOrder.trackingLink && (
                          <a
                            href={selectedOrder.trackingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:underline mt-1"
                          >
                            Track Package
                          </a>
                        )}
                      </div>
                    </section>
                  )}

                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        <ShipOrderModal
          order={shipModalOrder}
          submitting={shipSubmitting}
          onClose={() => setShipModalOrder(null)}
          onConfirm={handleShipOrder}
        />

        {cancelModalOrder && (
          <CancelOrderModal
            order={cancelModalOrder}
            onConfirm={handleConfirmCancel}
            onClose={() => setCancelModalOrder(null)}
            isSubmitting={cancelSubmitting}
          />
        )}

        {refundModalOrder && (
          <RecordRefundModal
            order={refundModalOrder}
            onConfirm={handleConfirmRecordRefund}
            onClose={() => setRefundModalOrder(null)}
            isSubmitting={refundSubmitting}
          />
        )}

        {blockedMessage && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                    <InformationCircleIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">Can't skip ahead</h3>
                    <p className="text-xs text-gray-500 mt-1">{blockedMessage}</p>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setBlockedMessage(null)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Lightbox Payment Screenshot Modal */}
        {previewImage && createPortal(
          <div
            className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-white rounded-2xl p-5 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Customer Payment Screenshot</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-auto max-h-[70vh] flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                <img src={previewImage} alt="Payment receipt full preview" className="max-w-full h-auto rounded-lg object-contain" />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Verify against your UPI app statement</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={previewImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Open in New Tab
                  </a>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bulk Invoice Printing Modal */}
        {bulkModalOpen && (
          <BulkInvoiceModal
            orderIds={bulkModalParams.orderIds}
            unprintedOnly={bulkModalParams.unprintedOnly}
            onClose={() => setBulkModalOpen(false)}
            onSuccess={() => {
              setSelectedOrderIds([]);
              fetchAllOrders(page);
              fetchOrderStats();
            }}
          />
        )}

        {/* Floating Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md animate-slideUp">
            <span className="text-xs font-bold whitespace-nowrap">
              {selectedOrderIds.length} {selectedOrderIds.length === 1 ? "order" : "orders"} selected
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <button
              type="button"
              onClick={() => {
                setBulkModalParams({ orderIds: selectedOrderIds });
                setBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Printer className="size-3.5" />
              Print Invoices ({selectedOrderIds.length})
            </button>
            <button
              type="button"
              onClick={() => handleBatchMarkPrinted(selectedOrderIds, true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Mark Printed
            </button>
            <button
              type="button"
              onClick={() => handleBatchMarkPrinted(selectedOrderIds, false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Mark Unprinted
            </button>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Deselect all"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}