// src/dashboard/CustomerActivityTracker.tsx
// Admin page: real-time customer wishlist, cart, and purchase cancellation feedback tracker.
// - Three tabs: Wishlist | Cart | Cancellation Feedback
// - Dynamic survey configuration modal for adding/editing questions and reasons
// - Real-time updates via socket.io

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import api from "../utils/api";
import socket from "../utils/socket";
import toast from "react-hot-toast";
import {
  HeartIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TagIcon,
  PhoneIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  BanknotesIcon,
  SparklesIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { domainUrl } from "../utils/constant";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrackedCustomer {
  id: string;
  username: string;
  email: string | null;
  phone: string;
  avatar: string | null;
  createdAt: string;
  lastWishlistActivityAt: string | null;
  lastCartActivityAt: string | null;
  wishlistCount: number;
  cartCount: number;
}

interface ProductItem {
  id: string;
  productId?: string;
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  discount: number;
  sizes: string[];
  code: string;
  category?: { name: string } | null;
  addedAt?: string;
  quantity?: number;
}

interface FeedbackItemSnapshot {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

interface CancellationFeedbackDoc {
  _id: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: string;
  triggerSource: string;
  orderId?: string;
  items: FeedbackItemSnapshot[];
  totalAmount: number;
  selectedReasons: string[];
  customNote?: string;
  createdAt: string;
}

interface SurveyConfig {
  isEnabled: boolean;
  headerTitle: string;
  urgencyBanner: string;
  question: string;
  options: string[];
  allowCustomNote: boolean;
  customNotePlaceholder: string;
  skipButtonText: string;
  submitButtonText: string;
}

type Tab = "wishlist" | "cart" | "cancellation";

// ── Helpers ───────────────────────────────────────────────────────────────────
const imgSrc = (img: string | null | undefined) => {
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${domainUrl.replace("/api", "")}/${img}`;
};

const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(iso));
};

const formatDate = (d: string | undefined) => {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
};

// ── Customer Row (Wishlist / Cart) ──────────────────────────────────────────
const CustomerRow = ({
  customer,
  tab,
  isNew,
  onClick,
}: {
  customer: TrackedCustomer;
  tab: "wishlist" | "cart";
  isNew: boolean;
  onClick: () => void;
}) => {
  const count = tab === "wishlist" ? customer.wishlistCount : customer.cartCount;
  const lastActivityAt = tab === "wishlist" ? customer.lastWishlistActivityAt : customer.lastCartActivityAt;
  const avatar = imgSrc(customer.avatar);

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left cursor-pointer hover:shadow-md hover:-translate-y-px ${
        isNew ? "border-indigo-300 bg-indigo-50/70" : "border-gray-100 bg-white hover:border-indigo-200"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {avatar ? (
          <img src={avatar} alt={customer.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center ring-2 ring-white shadow-sm">
            <span className="text-white font-bold text-base">{customer.username.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {isNew && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-indigo-500 ring-2 ring-white" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{customer.username}</p>
        <p className="text-xs text-gray-500 truncate">{customer.email ?? "No email on file"}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {customer.phone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <PhoneIcon className="w-3 h-3" />
              {customer.phone}
            </span>
          )}
          {lastActivityAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <ClockIcon className="w-3 h-3" />
              {timeAgo(lastActivityAt)}
            </span>
          )}
        </div>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          tab === "wishlist" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
        }`}>
          {tab === "wishlist" ? <HeartIcon className="w-3.5 h-3.5" /> : <ShoppingCartIcon className="w-3.5 h-3.5" />}
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
    </button>
  );
};

// ── Detail Dialog (Wishlist / Cart) ──────────────────────────────────────────
const DetailDialog = ({
  customer,
  tab,
  onClose,
}: {
  customer: TrackedCustomer;
  tab: "wishlist" | "cart";
  onClose: () => void;
}) => {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [quickViewItem, setQuickViewItem] = useState<ProductItem | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/tracker/customers/${customer.id}/${tab}`);
        setItems(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      } catch {
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [customer.id, tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {customer.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 leading-tight">{customer.username}'s {tab === "wishlist" ? "Wishlist" : "Cart"}</h2>
              <p className="text-xs text-gray-400">{customer.email ?? "No email"} · {customer.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center text-gray-400 text-sm">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No items found</div>
          ) : (
            items.map((item) => {
              const src = imgSrc(item.image);
              const price = Number(item.price) || 0;
              const discount = Number(item.discount) || 0;
              const stock = Number(item.stock) || 0;
              const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;

              return (
                <div
                  key={item.id}
                  onClick={() => setQuickViewItem(item)}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                >
                  {src ? (
                    <img src={src} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0 flex items-center justify-center">
                      <ShoppingCartIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category?.name ?? ""} · {item.code}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-gray-900">₹{discountedPrice.toFixed(0)}</span>
                      {discount > 0 && (
                        <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">-{discount}%</span>
                      )}
                    </div>
                    {tab === "cart" && item.quantity && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">Qty: {item.quantity}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                    stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {stock > 0 ? `${stock} left` : "Out of stock"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {tab === "cart" && !loading && items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Cart Total</span>
            <span className="text-lg font-bold text-gray-900">₹{total}</span>
          </div>
        )}
      </div>

      {quickViewItem && (
        <ProductQuickViewModal item={quickViewItem} tab={tab} onClose={() => setQuickViewItem(null)} />
      )}
    </div>
  );
};

// ── Product Quick-View Modal ────────────────────────────────────────────────
const ProductQuickViewModal = ({
  item,
  tab,
  onClose,
}: {
  item: ProductItem;
  tab: "wishlist" | "cart";
  onClose: () => void;
}) => {
  const src = imgSrc(item.image);
  const price = Number(item.price) || 0;
  const discount = Number(item.discount) || 0;
  const stock = Number(item.stock) || 0;
  const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="relative">
          {src ? (
            <img src={src} alt={item.name} className="w-full h-56 object-cover" />
          ) : (
            <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-300">
              <ShoppingCartIcon className="w-12 h-12" />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-gray-600 hover:bg-white shadow-sm transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="font-bold text-gray-900 text-lg leading-snug">{item.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gray-900">₹{discountedPrice.toFixed(0)}</span>
            {discount > 0 && <span className="text-xs text-gray-400 line-through">₹{price.toFixed(0)}</span>}
          </div>
          <p className="text-xs text-gray-500">SKU: {item.code}</p>
        </div>
      </div>
    </div>
  );
};

// ── Survey Settings Modal (Admin Option Customizer) ─────────────────────────
const SurveySettingsModal = ({
  isOpen,
  onClose,
  config,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  config: SurveyConfig;
  onSaved: (updated: SurveyConfig) => void;
}) => {
  useBodyScrollLock(isOpen);

  const [form, setForm] = useState<SurveyConfig>(config);
  const [newOption, setNewOption] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (form.options.includes(trimmed)) {
      toast.error("Option already exists");
      return;
    }
    setForm((prev) => ({ ...prev, options: [...prev.options, trimmed] }));
    setNewOption("");
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (form.options.length <= 1) {
      toast.error("At least one option is required");
      return;
    }
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/purchase-feedback/config", form);
      toast.success("Survey questions & settings updated!");
      if (res.data?.config) {
        onSaved(res.data.config);
      }
      onClose();
    } catch {
      toast.error("Failed to update survey configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Cog6ToothIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Purchase Cancellation Survey Settings</h2>
              <p className="text-xs text-gray-500">Configure questions and choices shown when a customer cancels</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition cursor-pointer">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
            <div>
              <span className="text-sm font-bold text-gray-900">Enable Exit / Cancellation Survey</span>
              <p className="text-xs text-gray-500">Prompt customers when they cancel checkout or payment</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                form.isEnabled ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Modal Title & Banner */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Modal Title
              </label>
              <input
                type="text"
                value={form.headerTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, headerTitle: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Top Urgency Banner Message
              </label>
              <input
                type="text"
                value={form.urgencyBanner}
                onChange={(e) => setForm((prev) => ({ ...prev, urgencyBanner: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Main Question Text
              </label>
              <input
                type="text"
                value={form.question}
                onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          {/* Survey Options List */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Multiple Choice Reasons
            </label>

            <div className="space-y-2">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...form.options];
                      updated[idx] = e.target.value;
                      setForm((prev) => ({ ...prev, options: updated }));
                    }}
                    className="flex-1 text-xs font-medium text-gray-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Type a new cancellation reason..."
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Reason
              </button>
            </div>
          </div>

          {/* Custom Note Option */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50">
            <div>
              <span className="text-xs font-bold text-gray-800">Show "Others (please specify)" Text Area</span>
              <p className="text-[11px] text-gray-500">Allows customer to write freeform feedback</p>
            </div>
            <input
              type="checkbox"
              checked={form.allowCustomNote}
              onChange={(e) => setForm((prev) => ({ ...prev, allowCustomNote: e.target.checked }))}
              className="w-4 h-4 text-black rounded focus:ring-black cursor-pointer"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              {saving ? "Saving..." : "Save Survey Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Custom Dropdown Filter Component (Matches Dashboard Aesthetic) ───────────
interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

const CustomFilterDropdown = ({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-xs min-w-[170px] ${
          isOpen
            ? "border-slate-800 bg-white ring-2 ring-slate-800/10 text-slate-900"
            : value
            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon ? (
            selectedOption.icon
          ) : Icon ? (
            <Icon className={`w-3.5 h-3.5 shrink-0 ${value ? "text-white" : "text-slate-400"}`} />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : label}</span>
        </div>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            value ? "text-slate-300" : "text-slate-400"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-1.5 z-40 w-60 rounded-xl bg-white p-1 shadow-xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto space-y-0.5">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Cancellation Detail Dialog (Modal Popup) ───────────────────────────────
const CancellationDetailDialog = ({
  feedback,
  onClose,
}: {
  feedback: CancellationFeedbackDoc;
  onClose: () => void;
}) => {
  useBodyScrollLock(true);

  const isGuest =
    !feedback.userId &&
    (!feedback.customerName ||
      feedback.customerName.toLowerCase() === "guest customer" ||
      feedback.customerName.toLowerCase() === "guest");
  const isCOD =
    feedback.paymentMethod.toUpperCase().includes("POD") ||
    feedback.paymentMethod.toUpperCase().includes("COD");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-xs shrink-0 ${
                isGuest
                  ? "bg-slate-200 text-slate-600"
                  : "bg-gradient-to-tr from-slate-900 to-indigo-950 text-white"
              }`}
            >
              {feedback.customerName ? feedback.customerName.charAt(0).toUpperCase() : "G"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-gray-900 text-base leading-tight truncate">
                  {feedback.customerName || "Customer"}
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    isGuest
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}
                >
                  {isGuest ? "Guest" : "Customer"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isCOD
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {isCOD ? <BanknotesIcon className="w-3 h-3" /> : <CreditCardIcon className="w-3 h-3" />}
                  {feedback.paymentMethod}
                </span>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                  {feedback.triggerSource.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {feedback.customerPhone && (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                    <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                    {feedback.customerPhone}
                  </span>
                )}
                {feedback.customerEmail && (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                    <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                    {feedback.customerEmail}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0 ml-2"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Recorded Timestamp Info Box */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Recorded Date & Time</span>
            <div className="text-right">
              <span className="font-bold text-slate-800">{formatDate(feedback.createdAt)}</span>
              <span className="text-slate-400 ml-1.5 font-normal">({timeAgo(feedback.createdAt)})</span>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Reasons
            </span>
            <div className="flex flex-wrap gap-2">
              {feedback.selectedReasons && feedback.selectedReasons.length > 0 ? (
                feedback.selectedReasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50/70 text-indigo-900 text-xs font-semibold border border-indigo-100/80 shadow-2xs"
                  >
                    {reason}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No reasons selected</span>
              )}
            </div>
          </div>

          {/* Customer Note */}
          {feedback.customNote && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Customer Note
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border-l-4 border-indigo-500 text-xs text-slate-800 leading-relaxed shadow-2xs">
                <p className="italic font-medium">"{feedback.customNote}"</p>
              </div>
            </div>
          )}

          {/* Abandoned Cart Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Abandoned Items ({feedback.items?.length || 0})
              </span>
              <span className="text-xs font-bold text-slate-900">
                Cart Total: ₹{(feedback.totalAmount || 0).toLocaleString("en-IN")}
              </span>
            </div>

            {feedback.items && feedback.items.length > 0 ? (
              <div className="space-y-2">
                {feedback.items.map((item, idx) => {
                  const thumb = imgSrc(item.image);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white transition-all"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-200 shrink-0 flex items-center justify-center text-gray-400">
                          <ShoppingCartIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{item.name}</p>
                        {item.variant && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">Variant: {item.variant}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-gray-900">
                            ₹{item.price?.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[11px] text-gray-500">× {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-gray-900">
                          ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No items snapshot recorded for this feedback
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Cart Total</span>
          <span className="text-base font-bold text-gray-900">
            ₹{(feedback.totalAmount || 0).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Delete Feedback Confirmation Modal ──────────────────────────────────────
const DeleteFeedbackModal = ({
  feedback,
  loading,
  onConfirm,
  onCancel,
}: {
  feedback: CancellationFeedbackDoc | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  useBodyScrollLock(!!feedback);
  if (!feedback) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <TrashIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                Delete Feedback Record?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete this customer cancellation response? This record will be permanently deleted and survey statistics will update.
              </p>

              {/* Feedback Summary Box */}
              <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span className="truncate">{feedback.customerName || "Customer"}</span>
                  <span className="text-[11px] text-slate-500 font-normal px-2 py-0.5 bg-white rounded border border-slate-200">
                    {feedback.paymentMethod}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Reason: <span className="font-medium text-slate-800">{feedback.reason || feedback.selectedReasons?.[0] || "No reason given"}</span>
                </p>
                {feedback.customNote && (
                  <p className="text-slate-500 text-[11px] italic truncate">
                    Note: "{feedback.customNote}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete Feedback</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Cancellation Feedback Tab Content (Minimal & Modern UI) ─────────────────
const CancellationFeedbackSection = ({
  feedbacks,
  loading,
  analytics,
  onRefresh,
  onOpenSettings,
  onDeleteFeedback,
}: {
  feedbacks: CancellationFeedbackDoc[];
  loading: boolean;
  analytics: {
    totalFeedbacks: number;
    totalAbandonedAmount: number;
    reasonDistribution: { name: string; count: number; percentage: number }[];
  };
  onRefresh: () => void;
  onOpenSettings: () => void;
  onDeleteFeedback: (feedback: CancellationFeedbackDoc) => void;
}) => {
  const [selectedReasonFilter, setSelectedReasonFilter] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<CancellationFeedbackDoc | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedReasonFilter && !fb.selectedReasons.includes(selectedReasonFilter)) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredFeedbacks.length / PAGE_SIZE) || 1;
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedFeedbacks = filteredFeedbacks.slice(startIndex, startIndex + PAGE_SIZE);

  const handleReasonChange = (val: string) => {
    setSelectedReasonFilter(val);
    setPage(1);
  };

  const reasonOptions: DropdownOption[] = [
    { value: "", label: "All Reasons", icon: <FunnelIcon className="w-3.5 h-3.5" /> },
    ...analytics.reasonDistribution.map((r) => ({
      value: r.name,
      label: `${r.name} (${r.count})`,
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Header & Settings Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-indigo-600" />
            Purchase Cancellation & Exit Feedback
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time reasons customers abandon checkout or cancel orders
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            Survey Questions
          </button>
        </div>
      </div>

      {/* Minimal Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Surveys</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{analytics.totalFeedbacks}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Received from checkout exits</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Top Reason</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
            {analytics.reasonDistribution[0]?.name || "None yet"}
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
            {analytics.reasonDistribution[0] ? `${analytics.reasonDistribution[0].percentage}% of responses` : "No data"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cancellation Reasons Dropdown */}
          {analytics.reasonDistribution.length > 0 && (
            <CustomFilterDropdown
              label="Cancellation Reason"
              value={selectedReasonFilter}
              options={reasonOptions}
              onChange={handleReasonChange}
              icon={FunnelIcon}
            />
          )}

          {/* Reset Filters Trigger */}
          {selectedReasonFilter && (
            <button
              onClick={() => {
                setSelectedReasonFilter("");
                setPage(1);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 transition cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-700">{filteredFeedbacks.length}</span> of{" "}
          <span className="font-bold text-slate-700">{feedbacks.length}</span> responses
        </p>
      </div>

      {/* Response Rows List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white animate-pulse space-y-2.5">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-60 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center p-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-700">No feedback entries found</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
            {selectedReasonFilter
              ? "No responses match the active filter"
              : "When customers exit or cancel purchases, their feedback will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedFeedbacks.map((fb) => {
            const isGuest =
              !fb.userId &&
              (!fb.customerName ||
                fb.customerName.toLowerCase() === "guest customer" ||
                fb.customerName.toLowerCase() === "guest");
            const isCOD =
              fb.paymentMethod.toUpperCase().includes("POD") ||
              fb.paymentMethod.toUpperCase().includes("COD");

            return (
              <div
                key={fb._id}
                onClick={() => setSelectedFeedback(fb)}
                className="group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl border border-slate-100 bg-white shadow-xs hover:border-indigo-200 hover:shadow-md hover:-translate-y-px transition-all cursor-pointer text-left"
              >
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-xs shrink-0 ${
                      isGuest
                        ? "bg-slate-100 text-slate-500"
                        : "bg-gradient-to-tr from-slate-900 to-indigo-950 text-white"
                    }`}
                  >
                    {fb.customerName ? fb.customerName.charAt(0).toUpperCase() : "G"}
                  </div>

                  {/* Customer Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {fb.customerName || "Customer"}
                      </span>

                      {/* Customer Role */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isGuest
                            ? "bg-slate-100 text-slate-600 border border-slate-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}
                      >
                        {isGuest ? "Guest" : "Customer"}
                      </span>

                      {/* Payment Method Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          isCOD
                            ? "bg-amber-50 text-amber-800 border-amber-200/70"
                            : "bg-blue-50 text-blue-700 border-blue-200/70"
                        }`}
                      >
                        {isCOD ? <BanknotesIcon className="w-3 h-3" /> : <CreditCardIcon className="w-3 h-3" />}
                        {fb.paymentMethod}
                      </span>

                      {/* Trigger Source Badge */}
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md uppercase">
                        {fb.triggerSource.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Phone & Email Row */}
                    <div className="flex items-center gap-3.5 text-xs text-slate-500 mt-1 flex-wrap">
                      {fb.customerPhone ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                          {fb.customerPhone}
                        </span>
                      ) : null}
                      {fb.customerEmail ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                          {fb.customerEmail}
                        </span>
                      ) : null}
                      {!fb.customerPhone && !fb.customerEmail && (
                        <span className="text-slate-400 italic text-[11px]">No contact details</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Date, Time Ago & Delete */}
                <div className="flex items-center gap-3.5 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatDate(fb.createdAt)}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                      <ClockIcon className="w-3 h-3" />
                      {timeAgo(fb.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFeedback(fb);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete record"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Minimal Pagination Navigation Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-100 rounded-xl shadow-xs mt-2">
              <p className="text-xs text-slate-500 font-medium">
                Showing entries <span className="font-bold text-slate-800">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-800">{Math.min(filteredFeedbacks.length, startIndex + PAGE_SIZE)}</span> of{" "}
                <span className="font-bold text-slate-800">{filteredFeedbacks.length}</span>
              </p>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Previous
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                        page === pg
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  Next
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Detail Dialog */}
      {selectedFeedback && (
        <CancellationDetailDialog
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
        />
      )}
    </div>
  );
};

// ── Main Page Export ────────────────────────────────────────────────────────
export default function CustomerActivityTracker() {
  const [tab, setTab] = useState<Tab>("wishlist");
  const [customers, setCustomers] = useState<TrackedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState<TrackedCustomer | null>(null);
  useBodyScrollLock(!!selectedCustomer);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Cancellation Feedback State
  const [feedbacks, setFeedbacks] = useState<CancellationFeedbackDoc[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<CancellationFeedbackDoc | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState(false);
  const [cancellationAnalytics, setCancellationAnalytics] = useState<{
    totalFeedbacks: number;
    totalAbandonedAmount: number;
    reasonDistribution: { name: string; count: number; percentage: number }[];
  }>({
    totalFeedbacks: 0,
    totalAbandonedAmount: 0,
    reasonDistribution: [],
  });
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig>({
    isEnabled: true,
    headerTitle: "Sorry To See You Go..",
    urgencyBanner: " Products In huge demand might run Out of Stock",
    question: "What stopped you from completing your purchase?",
    options: [
      "Found a better deal elsewhere",
      "Technical issues with the website",
      "I changed my mind",
      "Have issues with coupons",
      "Shipping charge too high",
      "Delivery takes too long",
    ],
    allowCustomNote: true,
    customNotePlaceholder: "Others (please specify)",
    skipButtonText: "Skip and exit",
    submitButtonText: "Submit Feedback",
  });
  const [surveySettingsOpen, setSurveySettingsOpen] = useState(false);

  const realtimeRef = useRef(realtimeEnabled);
  realtimeRef.current = realtimeEnabled;

  // ── Fetch Customers (Wishlist / Cart) ─────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ customers: TrackedCustomer[] }>("/admin/tracker/customers");
      setCustomers(res.data.customers ?? []);
      setViewedIds(new Set());
    } catch {
      toast.error("Failed to load customer activity");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Cancellation Feedbacks ──────────────────────────────────────────
  const fetchFeedbacks = useCallback(async () => {
    try {
      setFeedbackLoading(true);
      const [feedbacksRes, configRes] = await Promise.all([
        api.get("/purchase-feedback/admin?limit=50"),
        api.get("/purchase-feedback/config"),
      ]);

      if (feedbacksRes.data?.feedbacks) {
        setFeedbacks(feedbacksRes.data.feedbacks);
      }
      if (feedbacksRes.data?.analytics) {
        setCancellationAnalytics(feedbacksRes.data.analytics);
      }
      if (configRes.data) {
        setSurveyConfig(configRes.data);
      }
    } catch {
      toast.error("Failed to load cancellation feedback");
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchFeedbacks();
  }, [fetchCustomers, fetchFeedbacks]);

  // ── Delete Feedback ───────────────────────────────────────────────────────
  const handleDeleteFeedback = (feedback: CancellationFeedbackDoc) => {
    setFeedbackToDelete(feedback);
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    try {
      setDeletingFeedback(true);
      await api.delete(`/purchase-feedback/${feedbackToDelete._id}`);
      setFeedbacks((prev) => prev.filter((f) => f._id !== feedbackToDelete._id));
      setCancellationAnalytics((prev) => ({
        ...prev,
        totalFeedbacks: Math.max(0, prev.totalFeedbacks - 1),
      }));
      toast.success("Feedback entry deleted");
      setFeedbackToDelete(null);
    } catch {
      toast.error("Failed to delete feedback entry");
    } finally {
      setDeletingFeedback(false);
    }
  };

  // ── Socket real-time updates ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleWishlistUpdate = (data: { userId: string; wishlistCount: number; lastWishlistActivityAt?: string }) => {
      if (!realtimeRef.current) return;
      setCustomers((prev) => {
        const existing = prev.find((c) => c.id === data.userId);
        if (existing) {
          return prev.map((c) =>
            c.id === data.userId
              ? { ...c, wishlistCount: data.wishlistCount, lastWishlistActivityAt: data.lastWishlistActivityAt ?? c.lastWishlistActivityAt }
              : c,
          );
        }
        fetchCustomers();
        return prev;
      });
      setNewActivityIds((prev) => new Set(prev).add(data.userId));
      setTimeout(() => {
        setNewActivityIds((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }, 8000);
    };

    const handleCartUpdate = (data: { userId: string; cartCount: number; lastCartActivityAt?: string }) => {
      if (!realtimeRef.current) return;
      setCustomers((prev) => {
        const existing = prev.find((c) => c.id === data.userId);
        if (existing) {
          return prev.map((c) =>
            c.id === data.userId
              ? { ...c, cartCount: data.cartCount, lastCartActivityAt: data.lastCartActivityAt ?? c.lastCartActivityAt }
              : c,
          );
        }
        fetchCustomers();
        return prev;
      });
      setNewActivityIds((prev) => new Set(prev).add(data.userId));
      setTimeout(() => {
        setNewActivityIds((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }, 8000);
    };

    const handleNewFeedback = (newFb: CancellationFeedbackDoc) => {
      if (!realtimeRef.current) return;
      setFeedbacks((prev) => [newFb, ...prev]);
      setCancellationAnalytics((prev) => ({
        ...prev,
        totalFeedbacks: prev.totalFeedbacks + 1,
        totalAbandonedAmount: prev.totalAbandonedAmount + (newFb.totalAmount || 0),
      }));
      toast(`New cancellation feedback from ${newFb.customerName || "Customer"}`, { icon: "📝" });
    };

    socket.on("WISHLIST_UPDATED", handleWishlistUpdate);
    socket.on("CART_UPDATED", handleCartUpdate);
    socket.on("NEW_CANCELLATION_FEEDBACK", handleNewFeedback);

    return () => {
      socket.off("WISHLIST_UPDATED", handleWishlistUpdate);
      socket.off("CART_UPDATED", handleCartUpdate);
      socket.off("NEW_CANCELLATION_FEEDBACK", handleNewFeedback);
    };
  }, [fetchCustomers]);

  // ── Filtered list by tab ─────────────────────────────────────────────────
  const filteredCustomers = customers.filter((c) =>
    tab === "wishlist" ? c.wishlistCount > 0 : c.cartCount > 0,
  );

  const wishlistTotal = customers.filter((c) => c.wishlistCount > 0 && !viewedIds.has(c.id)).length;
  const cartTotal = customers.filter((c) => c.cartCount > 0 && !viewedIds.has(c.id)).length;
  const cancellationTotal = feedbacks.length;
  const totalWishlistItems = customers.reduce((sum, c) => sum + c.wishlistCount, 0);
  const totalCartItems = customers.reduce((sum, c) => sum + c.cartCount, 0);
  const activeCustomerCount = new Set(
    customers.filter((c) => c.wishlistCount > 0 || c.cartCount > 0).map((c) => c.id),
  ).size;

  return (
    <div className="px-8 py-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-200">
            <UserCircleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-950">Customer Activity Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor customer wishlists, carts, and purchase cancellation feedback in real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time toggle */}
          <button
            onClick={() => {
              setRealtimeEnabled((v) => !v);
              toast(realtimeEnabled ? "Real-time updates paused" : "Real-time updates enabled", {
                icon: realtimeEnabled ? "⏸" : "▶️",
              });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
              realtimeEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
            }`}
            title={realtimeEnabled ? "Disable real-time updates" : "Enable real-time updates"}
          >
            <span className="relative flex h-2 w-2">
              {realtimeEnabled && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${realtimeEnabled ? "bg-emerald-500" : "bg-gray-400"}`} />
            </span>
            {realtimeEnabled ? "Live" : "Paused"}
          </button>

          {/* Refresh button */}
          <button
            onClick={() => {
              fetchCustomers();
              fetchFeedbacks();
            }}
            disabled={loading || feedbackLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all cursor-pointer"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading || feedbackLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <UserCircleIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gray-950 leading-none tabular-nums">{activeCustomerCount}</p>
              <p className="text-xs text-gray-500 font-medium mt-1 truncate">Active customers</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
              <HeartIcon className="h-5 w-5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gray-950 leading-none tabular-nums">{totalWishlistItems}</p>
              <p className="text-xs text-gray-500 font-medium mt-1 truncate">Wishlist items saved</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <ShoppingCartIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gray-950 leading-none tabular-nums">{totalCartItems}</p>
              <p className="text-xs text-gray-500 font-medium mt-1 truncate">Items in active carts</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black text-gray-950 leading-none tabular-nums">{cancellationAnalytics.totalFeedbacks}</p>
              <p className="text-xs text-gray-500 font-medium mt-1 truncate">Cancellation surveys</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6 w-fit flex-wrap">
        {[
          { id: "wishlist" as Tab, label: "Wishlist", icon: HeartIcon, count: wishlistTotal, color: "text-rose-500", badgeColor: "bg-rose-100 text-rose-600" },
          { id: "cart" as Tab, label: "Cart", icon: ShoppingCartIcon, count: cartTotal, color: "text-amber-500", badgeColor: "bg-amber-100 text-amber-600" },
          { id: "cancellation" as Tab, label: "Cancellation Feedback", icon: XCircleIcon, count: cancellationTotal, color: "text-purple-600", badgeColor: "bg-purple-100 text-purple-600" },
        ].map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className={`w-4 h-4 ${isActive ? t.color : ""}`} />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5 ${
                  isActive ? t.badgeColor : "bg-gray-200 text-gray-500"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1 & 2: Wishlist / Cart Customer List */}
      {tab !== "cancellation" ? (
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-100 bg-white animate-pulse">
                <div className="h-11 w-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-44 rounded bg-gray-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-gray-100 shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 ${
              tab === "wishlist" ? "bg-rose-50" : "bg-amber-50"
            }`}>
              {tab === "wishlist" ? (
                <HeartIcon className="w-7 h-7 text-rose-300" />
              ) : (
                <ShoppingCartIcon className="w-7 h-7 text-amber-300" />
              )}
            </div>
            <h3 className="text-base font-bold text-gray-700">No customers with {tab} items</h3>
            <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
              Customers will appear here as soon as they add products to their {tab}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                tab={tab as "wishlist" | "cart"}
                isNew={newActivityIds.has(customer.id)}
                onClick={() => {
                  setSelectedCustomer(customer);
                  setViewedIds((prev) => new Set(prev).add(customer.id));
                }}
              />
            ))}
          </div>
        )
      ) : (
        /* Tab 3: Cancellation Feedback Section */
        <CancellationFeedbackSection
          feedbacks={feedbacks}
          loading={feedbackLoading}
          analytics={cancellationAnalytics}
          onRefresh={fetchFeedbacks}
          onOpenSettings={() => setSurveySettingsOpen(true)}
          onDeleteFeedback={handleDeleteFeedback}
        />
      )}

      {/* Customer Detail Dialog (Wishlist / Cart) */}
      {selectedCustomer && tab !== "cancellation" && (
        <DetailDialog
          customer={selectedCustomer}
          tab={tab as "wishlist" | "cart"}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Survey Settings Modal */}
      <SurveySettingsModal
        isOpen={surveySettingsOpen}
        onClose={() => setSurveySettingsOpen(false)}
        config={surveyConfig}
        onSaved={(updated) => setSurveyConfig(updated)}
      />

      {/* Delete Feedback Confirmation Modal */}
      <DeleteFeedbackModal
        feedback={feedbackToDelete}
        loading={deletingFeedback}
        onConfirm={handleConfirmDeleteFeedback}
        onCancel={() => setFeedbackToDelete(null)}
      />
    </div>
  );
}
