import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import { stripHtml } from "../utils/sanitizeHtml";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  MinusIcon,
  DocumentTextIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  TicketIcon,
  HomeIcon,
  BuildingOffice2Icon,
  MapIcon,
  HashtagIcon,
  GlobeAmericasIcon,
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import ShipOrderModal, { ShipOrderPayload } from "./ShipOrderModal";

interface Customer {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  recentAddress?: Address | null;
}

interface ProductVariant {
  id: string;
  options: Record<string, string>;
  stock: number;
  priceOverride: number | null;
  discountOverride?: number | null;
  image?: string | null;
  secondaryImage?: string | null;
  images?: string[];
}

interface Product {
  id: string;
  name: string;
  code: string;
  image?: string;
  description?: string;
  price: number;
  stock: number;
  category?: { id: string; name: string };
  /** Active option combinations (Storage/Color, Weight, ...) this product is sold
   * in — see backend's ProductVariant. Empty for a plain single-SKU product. A
   * product with any entries here can't be added without picking one, same rule
   * the storefront's own add-to-cart already enforces (cart.controller.ts's cartAdd). */
  variants?: ProductVariant[];
}

interface CartItem {
  product: Product;
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
  /** Snapshot of the effective unit price at the moment this line was added —
   * either the picked variant's priceOverride or the product's own price. Stored
   * here (not recomputed from `products`) because the product list can page/search
   * away from what's already in the cart. */
  unitPrice: number;
  /** Stock ceiling for the quantity stepper — the variant's own stock once one is
   * picked (Product.stock is meaningless for a variant product), else the product's. */
  maxStock: number;
  quantity: number;
}

interface Address {
  fullAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface AppliedCoupon {
  couponId: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  discountAmount: number;
}

type PaymentMethod = "CASH" | "POD";

type Step = "customer" | "products" | "address" | "payment" | "confirm";

const STEPS: { id: Step; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "customer", label: "Customer", icon: UserCircleIcon },
  { id: "products", label: "Products", icon: ShoppingCartIcon },
  { id: "address", label: "Address", icon: MapPinIcon },
  { id: "payment", label: "Payment", icon: CreditCardIcon },
  { id: "confirm", label: "Confirm", icon: CheckCircleIcon },
];

const STEP_ORDER: Step[] = ["customer", "products", "address", "payment", "confirm"];

// ─── Customer avatar / match-highlight helpers ──────────────────────────────
const AVATAR_PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];

const avatarClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const CustomerAvatar = ({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) => (
  <div
    className={`shrink-0 rounded-full flex items-center justify-center font-bold ${avatarClass(name)} ${
      size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"
    }`}
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </div>
);

const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 text-indigo-700 rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};



const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

// ─── Custom Product Variant Dropdown ────────────────────────────────────────
interface ProductVariantDropdownProps {
  variants: ProductVariant[];
  basePrice: number;
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
}

function ProductVariantDropdown({
  variants,
  basePrice,
  selectedVariantId,
  onSelect,
}: ProductVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const formatVariantLabel = (options: Record<string, string>) => {
    const entries = Object.entries(options);
    if (entries.length === 0) return "Default Option";
    return entries.map(([k, val]) => `${k}: ${val}`).join(" / ");
  };

  return (
    <div className="relative mt-1 max-w-sm" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 text-left ${
          isOpen
            ? "border-indigo-500 bg-white ring-4 ring-indigo-500/15 shadow-sm"
            : "bg-gray-50/70 hover:bg-white hover:border-gray-300 border-gray-200 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedVariant ? (
            <>
              <span className="font-semibold text-gray-800 truncate">
                {formatVariantLabel(selectedVariant.options)}
              </span>
              <span className="text-indigo-600 font-bold shrink-0">
                ₹{(selectedVariant.priceOverride ?? basePrice).toLocaleString("en-IN")}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                  selectedVariant.stock > 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-rose-50 text-rose-600 border border-rose-200/60"
                }`}
              >
                {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "out of stock"}
              </span>
            </>
          ) : (
            <span className="text-gray-400 font-normal">Select option…</span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-full min-w-[280px] bg-white border border-gray-100 rounded-2xl shadow-xl shadow-indigo-950/10 p-1.5 space-y-1 animate-fadeIn">
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {variants.map(v => {
              const isSelected = v.id === selectedVariantId;
              const isOutOfStock = v.stock <= 0;
              const price = v.priceOverride ?? basePrice;

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    onSelect(v.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left group ${
                    isSelected
                      ? "bg-indigo-50/80 text-indigo-950 font-semibold border border-indigo-200/80 shadow-2xs"
                      : isOutOfStock
                      ? "opacity-45 cursor-not-allowed bg-gray-50/40 text-gray-400 border border-transparent"
                      : "text-gray-700 hover:bg-gray-50/80 hover:text-indigo-600 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "border border-gray-300 group-hover:border-indigo-400 bg-white"
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{formatVariantLabel(v.options)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold ${isSelected ? "text-indigo-700" : "text-gray-900"}`}>
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                        v.stock > 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : "bg-rose-50 text-rose-600 border border-rose-200/60"
                      }`}
                    >
                      {v.stock > 0 ? `${v.stock} in stock` : "out of stock"}
                    </span>
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminOrderPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("customer");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNumber?: string } | null>(null);

  // ── Post-order actions (invoice / ship) ──
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [shippedInfo, setShippedInfo] = useState<{ deliveryPartnerName?: string; trackingId?: string } | null>(null);

  // ── Customer state ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ username: "", phone: "", email: "" });

  // ── Duplicate customer detection & conflict modal state ──
  const [conflictCustomer, setConflictCustomer] = useState<Customer | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictSubmitting, setConflictSubmitting] = useState(false);
  const [conflictReason, setConflictReason] = useState("");
  const [conflictTriggerSource, setConflictTriggerSource] = useState<"step1_next" | "place_order">("place_order");
  const [inlineMatchedCustomer, setInlineMatchedCustomer] = useState<Customer | null>(null);
  const checkNewCustomerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Products state ──
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Which variant is currently picked in each variant product's row — a draft choice
  // in the picker, separate from what's actually in the cart (see CartItem above).
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const productSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // ── Address state ──
  const [address, setAddress] = useState<Address>({
    fullAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
  });
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const pincodeLookupAbortRef = useRef<AbortController | null>(null);

  const handlePincodeChange = async (val: string) => {
    const cleanPincode = val.replace(/\D/g, "").slice(0, 6);
    setAddress(prev => ({ ...prev, zipCode: cleanPincode }));

    if (pincodeLookupAbortRef.current) {
      pincodeLookupAbortRef.current.abort();
    }

    if (cleanPincode.length === 6) {
      const abortController = new AbortController();
      pincodeLookupAbortRef.current = abortController;
      setPincodeLoading(true);

      try {
        // 1. Primary: Query through backend lookup endpoint (uses Nominatim + fallbacks with User-Agent)
        const { data } = await api.get(`/order/admin-order/lookup-pincode/${cleanPincode}`, {
          signal: abortController.signal,
          timeout: 6000,
        });

        if (data && data.success) {
          const fetchedCity = data.city || data.district || "";
          const rawState = data.state || "";
          const matchedState = INDIAN_STATES.find(
            s => s.toLowerCase() === rawState.trim().toLowerCase()
          ) || INDIAN_STATES.find(
            s => s.toLowerCase().includes(rawState.trim().toLowerCase()) || rawState.trim().toLowerCase().includes(s.toLowerCase())
          ) || rawState;

          setAddress(prev => ({
            ...prev,
            city: fetchedCity || prev.city,
            state: matchedState || prev.state,
          }));
          toast.success(`Location detected: ${fetchedCity}${matchedState ? `, ${matchedState}` : ""}`);
        } else {
          toast.error("Location not found for this PIN code");
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError" || err?.code === "ERR_CANCELED") {
          return;
        }

        // Secondary: Quick fallback to zippopotam if backend route failed
        try {
          const zipRes = await fetch(`https://api.zippopotam.us/in/${cleanPincode}`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
          });
          if (zipRes.ok) {
            const zipData = await zipRes.json();
            if (zipData?.places?.[0]) {
              const place = zipData.places[0];
              const fetchedCity = place["place name"] || "";
              const rawState = place.state || "";
              const matchedState = INDIAN_STATES.find(
                s => s.toLowerCase() === rawState.trim().toLowerCase()
              ) || rawState;
              setAddress(prev => ({
                ...prev,
                city: fetchedCity || prev.city,
                state: matchedState || prev.state,
              }));
              toast.success(`Location detected: ${fetchedCity}${matchedState ? `, ${matchedState}` : ""}`);
              return;
            }
          }
        } catch {
          // ignore fallback error
        }

        toast.error(err?.response?.data?.message ?? "Unable to auto-detect location. Please enter manually.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleClearPincode = () => {
    if (pincodeLookupAbortRef.current) {
      pincodeLookupAbortRef.current.abort();
    }
    setPincodeLoading(false);
    setAddress(p => ({ ...p, zipCode: "" }));
  };

  // ── Payment state ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("POD");
  const [paymentNote, setPaymentNote] = useState("");

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setNewCustomer({ username: "", phone: "", email: "" });
    setInlineMatchedCustomer(null);

    // Auto-fill recent ordered address if available
    if (c.recentAddress && c.recentAddress.fullAddress) {
      setAddress({
        fullAddress: c.recentAddress.fullAddress || "",
        city: c.recentAddress.city || "",
        state: c.recentAddress.state || "",
        zipCode: c.recentAddress.zipCode || "",
        country: c.recentAddress.country || "India",
      });
      toast.success(`Auto-filled address from ${c.username}'s previous order!`, { id: "customer-address-autofill" });
    }
  };

  // ── Auto-check if entered phone or email matches an existing customer ──
  useEffect(() => {
    if (selectedCustomer) {
      setInlineMatchedCustomer(null);
      return;
    }
    const cleanPhone = newCustomer.phone.trim();
    const cleanEmail = newCustomer.email.trim();

    if (cleanPhone.length < 5 && (!cleanEmail || !cleanEmail.includes("@"))) {
      setInlineMatchedCustomer(null);
      return;
    }

    if (checkNewCustomerDebounce.current) {
      clearTimeout(checkNewCustomerDebounce.current);
    }

    checkNewCustomerDebounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/order/admin-order/check-customer", {
          params: {
            ...(cleanPhone.length >= 5 ? { phone: cleanPhone } : {}),
            ...(cleanEmail.includes("@") ? { email: cleanEmail } : {}),
          },
        });
        if (data && data.exists && data.customer) {
          setInlineMatchedCustomer(data.customer);
        } else {
          setInlineMatchedCustomer(null);
        }
      } catch {
        // silent
      }
    }, 350);

    return () => {
      if (checkNewCustomerDebounce.current) clearTimeout(checkNewCustomerDebounce.current);
    };
  }, [selectedCustomer, newCustomer.phone, newCustomer.email]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ─── Product fetch ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (search: string, page: number) => {
    setProductsLoading(true);
    try {
      const { data } = await api.get("/order/admin-order/products", { params: { search, page, limit: 10 } });
      setProducts(data.products ?? []);
      setProductTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentStep === "products") fetchProducts(productSearch, productPage);
  }, [currentStep, productPage]);

  const handleProductSearch = (val: string) => {
    setProductSearch(val);
    if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    productSearchDebounce.current = setTimeout(() => {
      setProductPage(1);
      fetchProducts(val, 1);
    }, 350);
  };

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  // A cart line is identified by (productId, variantId) — two different options of
  // the same product (e.g. 128GB vs 256GB) are separate lines, not merged into one,
  // same rule the storefront cart already follows (CartContext.tsx).
  const findCartLine = (productId: string, variantId?: string | null) =>
    cart.find(c => c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? ""));

  const addToCart = (product: Product, variantId?: string | null) => {
    const hasVariants = (product.variants?.length ?? 0) > 0;
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined;
    if (hasVariants && !variant) {
      toast.error(`Select an option for "${product.name}" first`, { id: "admin-order-pick-variant" });
      return;
    }
    const unitPrice = variant?.priceOverride ?? product.price;
    const maxStock = variant ? variant.stock : product.stock;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && String(c.variantId ?? "") === String(variantId ?? ""));
      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, quantity: Math.min(c.quantity + 1, maxStock) } : c,
        );
      }
      return [
        ...prev,
        { product, variantId: variant?.id ?? null, variantOptions: variant?.options ?? null, unitPrice, maxStock, quantity: 1 },
      ];
    });
  };

  const updateQty = (productId: string, variantId: string | null | undefined, qty: number, maxStock: number) => {
    if (qty < 1) { removeFromCart(productId, variantId); return; }
    setCart(prev =>
      prev.map(c =>
        c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? "")
          ? { ...c, quantity: Math.min(qty, maxStock) }
          : c,
      ),
    );
  };

  const removeFromCart = (productId: string, variantId?: string | null) => {
    setCart(prev => prev.filter(c => !(c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? ""))));
    setSelectedVariantByProduct(prev => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return prev;
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const orderTotal = Math.max(cartTotal - (appliedCoupon?.discountAmount ?? 0), 0);

  // A coupon's discount was computed against the subtotal at the moment it was applied —
  // if the cart changes afterwards that preview is stale, so drop it and make the admin
  // re-apply. The backend re-validates independently at final submission regardless.
  useEffect(() => {
    setAppliedCoupon(null);
  }, [cart]);

  // ─── Coupon ───────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post("/coupon/validate", { code, orderAmount: cartTotal });
      setAppliedCoupon({
        couponId: data.couponId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      toast.success(
        data.discountType === "PERCENTAGE"
          ? `Coupon applied: ${data.discountValue}% off`
          : `Coupon applied: ₹${data.discountAmount.toLocaleString("en-IN")} off`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid or expired coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // ─── Validation helpers ───────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (currentStep === "customer") {
      if (selectedCustomer) return true;
      return !!(newCustomer.username.trim() && newCustomer.phone.trim());
    }
    if (currentStep === "products") return cart.length > 0;
    if (currentStep === "address") {
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep === "customer" && !selectedCustomer && inlineMatchedCustomer) {
      setConflictCustomer(inlineMatchedCustomer);
      setConflictReason("This phone number or email is already registered to an existing customer.");
      setConflictTriggerSource("step1_next");
      setConflictModalOpen(true);
      return;
    }
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1]);
  };

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
  };

  // ─── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const body: Record<string, unknown> = {
        items: cart.map(c => ({ productId: c.product.id, variantId: c.variantId ?? undefined, quantity: c.quantity })),
        address,
        paymentMethod,
        ...(paymentNote.trim() ? { paymentNote: paymentNote.trim() } : {}),
        ...(appliedCoupon ? { couponId: appliedCoupon.couponId } : {}),
      };
      if (selectedCustomer) {
        body.customerId = selectedCustomer.id;
      } else {
        body.newCustomer = {
          username: newCustomer.username.trim(),
          phone: newCustomer.phone.trim(),
          ...(newCustomer.email.trim() ? { email: newCustomer.email.trim() } : {}),
        };
      }
      const { data } = await api.post("/order/admin-order/place", body);
      toast.success("Order placed successfully!");
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setPlacedOrder({ id: data.order?.id ?? data.orderId ?? "—" });
    } catch (err: any) {
      if (
        (err?.response?.data?.code === "CUSTOMER_ALREADY_EXISTS" || err?.response?.status === 409) &&
        err?.response?.data?.existingCustomer
      ) {
        setConflictCustomer(err.response.data.existingCustomer);
        setConflictReason(err.response.data.message || "A customer with this phone number or email already exists.");
        setConflictTriggerSource("place_order");
        setConflictModalOpen(true);
        return;
      }
      toast.error(err?.response?.data?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // ─── Action when admin confirms using the existing customer inside the conflict modal ───
  const handleSelectConflictCustomerAction = async () => {
    if (!conflictCustomer) return;

    setSelectedCustomer(conflictCustomer);
    setNewCustomer({ username: "", phone: "", email: "" });
    setInlineMatchedCustomer(null);

    if (conflictTriggerSource === "step1_next" || currentStep === "customer") {
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setCurrentStep("products");
      toast.success(`Selected customer: ${conflictCustomer.username}`);
      return;
    }

    // Direct place order from Confirm step
    setConflictSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        customerId: conflictCustomer.id,
        items: cart.map(c => ({ productId: c.product.id, variantId: c.variantId ?? undefined, quantity: c.quantity })),
        address,
        paymentMethod,
        ...(paymentNote.trim() ? { paymentNote: paymentNote.trim() } : {}),
        ...(appliedCoupon ? { couponId: appliedCoupon.couponId } : {}),
      };
      const { data } = await api.post("/order/admin-order/place", body);
      toast.success(`Order placed successfully for ${conflictCustomer.username}!`);
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setPlacedOrder({ id: data.order?.id ?? data.orderId ?? "—" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to place order");
    } finally {
      setConflictSubmitting(false);
    }
  };

  // ─── Ship order (optional, right after placement) ────────────────────────
  const handleShipOrder = async (payload: ShipOrderPayload) => {
    if (!placedOrder) return;
    setShipSubmitting(true);
    try {
      const { data } = await api.put(`/order/update/${placedOrder.id}`, {
        orderStatus: "SHIPPED",
        ...payload,
      });
      setShippedInfo({
        deliveryPartnerName: data.order?.deliveryPartnerName,
        trackingId: data.order?.trackingId,
      });
      toast.success("Order shipped and customer notified!");
      setShipModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to ship order");
    } finally {
      setShipSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  // ─ Success screen ─
  if (placedOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-lg p-10">
          <CheckCircleSolid className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
          <p className="text-gray-500 text-sm mb-1">Order ID:</p>
          <p className="font-mono text-indigo-600 font-semibold text-sm break-all mb-6">{placedOrder.id}</p>

          {shippedInfo ? (
            <div className="flex items-center gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-left">
              <TruckIcon className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Order shipped</p>
                <p className="text-xs text-blue-600">
                  {shippedInfo.deliveryPartnerName ?? "Handled without a courier"}
                  {shippedInfo.trackingId ? ` · ${shippedInfo.trackingId}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                type="button"
                onClick={() => navigate(`/invoice/${placedOrder.id}`)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <DocumentTextIcon className="w-4 h-4" />
                View Invoice
              </button>
              <button
                type="button"
                onClick={() => setShipModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <TruckIcon className="w-4 h-4" />
                Ship Order
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setPlacedOrder(null);
              setShippedInfo(null);
              setShipModalOpen(false);
              setConflictCustomer(null);
              setConflictModalOpen(false);
              setConflictSubmitting(false);
              setConflictReason("");
              setInlineMatchedCustomer(null);
              setCurrentStep("customer");
              setSelectedCustomer(null);
              setNewCustomer({ username: "", phone: "", email: "" });
              setCart([]);
              setSelectedVariantByProduct({});
              setCouponCode("");
              setAppliedCoupon(null);
              if (pincodeLookupAbortRef.current) pincodeLookupAbortRef.current.abort();
              setPincodeLoading(false);
              setAddress({ fullAddress: "", city: "", state: "", zipCode: "", country: "India" });
              setPaymentMethod("POD");
              setPaymentNote("");
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Order
          </button>
        </div>

        <ShipOrderModal
          order={shipModalOpen ? placedOrder : null}
          submitting={shipSubmitting}
          onClose={() => setShipModalOpen(false)}
          onConfirm={handleShipOrder}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 tracking-tight">
        <h1 className="text-3xl font-bold text-gray-900">Place Order on Behalf of Customer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Walk-in / cash counter order entry</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4">
        <ol className="flex items-center gap-0 overflow-x-auto">
          {STEPS.map((step, i) => {
            const done = STEP_ORDER.indexOf(step.id) < stepIndex;
            const active = step.id === currentStep;
            return (
              <li key={step.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (done) setCurrentStep(step.id);
                  }}
                  disabled={!done && !active}
                  className={`flex flex-col sm:flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${active ? "text-indigo-700 bg-indigo-50" : done ? "text-green-700 cursor-pointer hover:bg-green-50" : "text-gray-400 cursor-default"}`}
                >
                  {done ? (
                    <CheckCircleSolid className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <step.icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`} />
                  )}
                  {step.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRightIcon className="w-4 h-4 text-gray-300 mx-1 shrink-0" />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Body */}
      <div className="w-full px-8 py-8 space-y-6">

        {/* ── STEP 1: Customer ── */}
        {currentStep === "customer" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Customer Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter customer name, phone number, and optional email for this order</p>
            </div>

            {selectedCustomer ? (
              /* Selected Customer Card */
              <div className="max-w-lg flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <CustomerAvatar name={selectedCustomer.username} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-emerald-900 truncate">{selectedCustomer.username}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Existing Customer
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {selectedCustomer.phone ?? "No phone"} {selectedCustomer.email ? `· ${selectedCustomer.email}` : ""}
                    </p>
                    {selectedCustomer.recentAddress?.fullAddress && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                        <MapPinIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Address auto-filled ({selectedCustomer.recentAddress.city}, {selectedCustomer.recentAddress.state})</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setNewCustomer({ username: "", phone: "", email: "" });
                    setInlineMatchedCustomer(null);
                    setAddress({ fullAddress: "", city: "", state: "", zipCode: "", country: "India" });
                  }}
                  className="shrink-0 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-white transition px-2.5 py-1.5 rounded-lg border border-gray-200/80 bg-white/60 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Customer Form */
              <div className="max-w-lg space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <UserCircleIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Full Name <span className="text-rose-500 font-bold normal-case">*</span>
                    </label>
                    {newCustomer.username.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <UserCircleIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Customer name"
                      value={newCustomer.username}
                      onChange={e => setNewCustomer(p => ({ ...p, username: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {newCustomer.username && (
                      <button
                        type="button"
                        onClick={() => setNewCustomer(p => ({ ...p, username: "" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear name"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <PhoneIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Phone <span className="text-rose-500 font-bold normal-case">*</span>
                      </label>
                      {newCustomer.phone.trim() && (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                          <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                      <PhoneIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                      <input
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                        className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                      />
                      {newCustomer.phone && (
                        <button
                          type="button"
                          onClick={() => setNewCustomer(p => ({ ...p, phone: "" }))}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                          title="Clear phone"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <EnvelopeIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Email <span className="normal-case text-gray-400 font-medium">(optional)</span>
                      </label>
                      {newCustomer.email.trim() && (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                          <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                      <EnvelopeIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={newCustomer.email}
                        onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value.toLowerCase() }))}
                        className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                      />
                      {newCustomer.email && (
                        <button
                          type="button"
                          onClick={() => setNewCustomer(p => ({ ...p, email: "" }))}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                          title="Clear email"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline banner when matching customer is detected */}
                {inlineMatchedCustomer && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomerAvatar name={inlineMatchedCustomer.username} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                            Customer Already Exists
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
                          {inlineMatchedCustomer.username}
                        </p>
                        <p className="text-[11px] text-gray-600 truncate">
                          {inlineMatchedCustomer.phone ?? "No phone"} {inlineMatchedCustomer.email ? `· ${inlineMatchedCustomer.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        selectCustomer(inlineMatchedCustomer);
                        setInlineMatchedCustomer(null);
                        toast.success(`Selected customer: ${inlineMatchedCustomer.username}`);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      Use This Customer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Products ── */}
        {currentStep === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product picker */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Add Products</h2>
              <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                <MagnifyingGlassIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU, or category…"
                  value={productSearch}
                  onChange={e => handleProductSearch(e.target.value)}
                  className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => handleProductSearch("")}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                    title="Clear search"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {products.map(p => {
                    const hasVariants = (p.variants?.length ?? 0) > 0;
                    const selectedVid = selectedVariantByProduct[p.id] ?? "";
                    const selectedVariant = hasVariants ? p.variants!.find(v => v.id === selectedVid) : undefined;
                    const inCart = hasVariants
                      ? (selectedVariant ? findCartLine(p.id, selectedVariant.id) : undefined)
                      : findCartLine(p.id, null);
                    const rowMaxStock = selectedVariant ? selectedVariant.stock : p.stock;
                    const displayImg = selectedVariant?.image || p.image;
                    const isRowClickable = !hasVariants && !inCart && p.stock > 0;

                    return (
                      <li
                        key={p.id}
                        onClick={() => {
                          if (isRowClickable) {
                            addToCart(p, null);
                          }
                        }}
                        className={`group flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-150 border ${
                          inCart
                            ? "bg-indigo-50/50 border-indigo-200/80 shadow-2xs"
                            : isRowClickable
                              ? "cursor-pointer hover:bg-slate-50 hover:border-slate-200 border-transparent"
                              : "border-transparent"
                        }`}
                      >
                        {displayImg ? (
                          <img src={displayImg} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <ShoppingCartIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                            {inCart && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0">
                                In Cart ({inCart.quantity})
                              </span>
                            )}
                          </div>
                          {p.description && stripHtml(p.description) && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5" title={stripHtml(p.description)}>
                              {stripHtml(p.description)}
                            </p>
                          )}
                          {hasVariants ? (
                            <div className="mt-1" onClick={e => e.stopPropagation()}>
                              <ProductVariantDropdown
                                variants={p.variants!}
                                basePrice={p.price}
                                selectedVariantId={selectedVid}
                                onSelect={vid => {
                                  setSelectedVariantByProduct(prev => ({ ...prev, [p.id]: vid }));
                                  const existing = findCartLine(p.id, vid);
                                  if (!existing) {
                                    addToCart(p, vid);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              ₹{p.price.toLocaleString("en-IN")} · Stock: {p.stock}
                              {p.stock <= 0 && <span className="text-rose-600 font-semibold ml-1.5">(Out of stock)</span>}
                            </p>
                          )}
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-indigo-200 shadow-2xs" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateQty(p.id, inCart.variantId, inCart.quantity - 1, rowMaxStock)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              title="Decrease quantity"
                            >
                              <MinusIcon className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-indigo-900">{inCart.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(p.id, inCart.variantId, inCart.quantity + 1, rowMaxStock)}
                              disabled={inCart.quantity >= rowMaxStock}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                              title="Increase quantity"
                            >
                              <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : hasVariants ? null : p.stock > 0 ? (
                          <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 bg-indigo-50/60 group-hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all pointer-events-none">
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Select</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 shrink-0">Out of Stock</span>
                        )}
                      </li>
                    );
                  })}
                  {products.length === 0 && !productsLoading && (
                    <li className="py-10 text-center text-gray-400 text-sm">No products found</li>
                  )}
                </ul>
              )}

              {/* Pagination */}
              {productTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button type="button" disabled={productPage <= 1} onClick={() => setProductPage(p => p - 1)}
                    className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 hover:text-indigo-600 transition-colors">
                    <ChevronLeftIcon className="w-4 h-4" /> Prev
                  </button>
                  <span className="text-xs text-gray-500">Page {productPage} / {productTotalPages}</span>
                  <button type="button" disabled={productPage >= productTotalPages} onClick={() => setProductPage(p => p + 1)}
                    className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 hover:text-indigo-600 transition-colors">
                    Next <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Cart summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit">
              <h2 className="text-base font-bold text-gray-800">Cart ({cart.length})</h2>
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No items yet</p>
              ) : (
                <ul className="divide-y divide-gray-100 space-y-0">
                  {cart.map(item => (
                    <li key={`${item.product.id}-${item.variantId ?? "base"}`} className="flex items-center gap-2 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{item.product.name}</p>
                        {item.variantOptions && (
                          <p className="text-[11px] text-gray-400 truncate">
                            {Object.entries(item.variantOptions).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">₹{item.unitPrice.toLocaleString("en-IN")} × {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-indigo-600 shrink-0">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</p>
                      <button type="button" onClick={() => removeFromCart(item.product.id, item.variantId)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {cart.length > 0 && (
                <>
                  {/* Coupon */}
                  <div className="pt-3 border-t border-gray-100">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
                        <div className="flex items-center gap-2 min-w-0">
                          <TicketIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-900 truncate">{appliedCoupon.code}</p>
                            <p className="text-[11px] text-emerald-600">
                              {appliedCoupon.discountType === "PERCENTAGE"
                                ? `${appliedCoupon.discountValue}% off`
                                : `₹${appliedCoupon.discountAmount.toLocaleString("en-IN")} off`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={handleRemoveCoupon}
                          className="shrink-0 text-emerald-700 hover:text-red-600 transition-colors">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <TicketIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Coupon code"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                            className="w-full pl-8 pr-2 py-2 text-xs font-semibold uppercase tracking-wide border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || couponLoading}
                          className="shrink-0 px-3 py-2 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {couponLoading ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 space-y-1.5">
                    {appliedCoupon && (
                      <>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Subtotal</span>
                          <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                          <span>Discount</span>
                          <span>−₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-800">
                      <span>Total</span>
                      <span>₹{orderTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Address ── */}
        {currentStep === "address" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs shrink-0">
                  <MapPinIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Enter shipping address for delivery, or leave blank for store / counter pickup</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {selectedCustomer?.recentAddress?.fullAddress && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 animate-fadeIn">
                    <CheckCircleSolid className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-filled from previous order
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Standard Domestic Delivery
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Zip / PIN & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Zip / PIN Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <HashtagIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Zip / PIN Code <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {pincodeLoading ? (
                      <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5 animate-fadeIn">
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        Detecting…
                      </span>
                    ) : address.zipCode.trim().length === 6 ? (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : null}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <HashtagIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      placeholder="600001"
                      maxLength={6}
                      value={address.zipCode}
                      onChange={e => handlePincodeChange(e.target.value)}
                      className="w-full pl-3 pr-9 h-11 text-sm font-semibold tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal bg-transparent focus:outline-none"
                    />
                    {pincodeLoading ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : address.zipCode ? (
                      <button
                        type="button"
                        onClick={handleClearPincode}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                        title="Clear PIN code"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Enter 6-digit PIN code to auto-detect City / District and State, or enter details manually below.
                  </p>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <GlobeAmericasIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Country <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/60">
                      Domestic
                    </span>
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <span className="ml-3.5 text-base leading-none select-none pointer-events-none">🇮🇳</span>
                    <input
                      type="text"
                      placeholder="India"
                      value={address.country}
                      onChange={e => setAddress(p => ({ ...p, country: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {address.country && address.country !== "India" && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, country: "India" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                        title="Reset to India"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* City */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <BuildingOffice2Icon className="w-3.5 h-3.5 text-indigo-600" />
                      City / District <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.city.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <BuildingOffice2Icon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Bengaluru, Delhi"
                      value={address.city}
                      onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {address.city && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, city: "" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                        title="Clear city"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* State */}
                <div className="space-y-1.5" ref={stateDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <MapIcon className="w-3.5 h-3.5 text-indigo-600" />
                      State <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.state.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setStateDropdownOpen(prev => !prev);
                        setStateFilter("");
                      }}
                      className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                        stateDropdownOpen
                          ? "border-indigo-500 bg-white ring-4 ring-indigo-500/15 shadow-md"
                          : "bg-gray-50/60 hover:bg-gray-50/20 hover:border-gray-300 border-gray-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapIcon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            stateDropdownOpen || address.state ? "text-indigo-600" : "text-gray-400"
                          }`}
                        />
                        <span className={`truncate ${address.state ? "text-gray-900 font-semibold" : "text-gray-400 font-normal"}`}>
                          {address.state || "Select State"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {address.state && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddress(p => ({ ...p, state: "" }));
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Clear state"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDownIcon
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            stateDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Matching Custom Dropdown Menu */}
                    {stateDropdownOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-indigo-950/10 p-2 animate-fadeIn">
                        {/* Search filter inside dropdown */}
                        <div className="relative mb-2">
                          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type to search state…"
                            value={stateFilter}
                            onChange={e => setStateFilter(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>

                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                          {INDIAN_STATES.filter(st =>
                            st.toLowerCase().includes(stateFilter.trim().toLowerCase())
                          ).map(st => {
                            const isSelected = address.state === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  setAddress(p => ({ ...p, state: st }));
                                  setStateDropdownOpen(false);
                                  setStateFilter("");
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors text-left ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-700 font-bold"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                                }`}
                              >
                                <span>{st}</span>
                                {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })}
                          {INDIAN_STATES.filter(st =>
                            st.toLowerCase().includes(stateFilter.trim().toLowerCase())
                          ).length === 0 && (
                            <div className="py-4 text-center">
                              <p className="text-xs text-gray-400 mb-2">No matching state</p>
                              {stateFilter.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddress(p => ({ ...p, state: stateFilter.trim() }));
                                    setStateDropdownOpen(false);
                                    setStateFilter("");
                                  }}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
                                >
                                  Use "{stateFilter.trim()}"
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <HomeIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Full Address <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                  </label>
                  {address.fullAddress.trim() && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                      <CheckCircleSolid className="w-3.5 h-3.5" /> Filled
                    </span>
                  )}
                </div>
                <div className="relative flex bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                  <div className="pl-3.5 pt-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                    <HomeIcon className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="House / Flat no., Building name, Street, Locality, Landmark…"
                    value={address.fullAddress}
                    onChange={e => setAddress(p => ({ ...p, fullAddress: e.target.value }))}
                    className="w-full pl-3 pr-9 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none resize-none leading-relaxed"
                  />
                  {address.fullAddress && (
                    <button
                      type="button"
                      onClick={() => setAddress(p => ({ ...p, fullAddress: "" }))}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                      title="Clear address"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">Include door number, street, and nearby landmark for seamless delivery.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {currentStep === "payment" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("POD")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors
                  ${paymentMethod === "POD" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 bg-white"}`}
              >
                <MapPinIcon className={`w-8 h-8 ${paymentMethod === "POD" ? "text-indigo-600" : "text-gray-400"}`} />
                <span className={`font-bold text-sm ${paymentMethod === "POD" ? "text-indigo-700" : "text-gray-600"}`}>Pay on Delivery</span>
                <span className="text-xs text-gray-500 text-center">Payment will be collected at delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors
                  ${paymentMethod === "CASH" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 bg-white"}`}
              >
                <CreditCardIcon className={`w-8 h-8 ${paymentMethod === "CASH" ? "text-indigo-600" : "text-gray-400"}`} />
                <span className={`font-bold text-sm ${paymentMethod === "CASH" ? "text-indigo-700" : "text-gray-600"}`}>Cash Collected</span>
                <span className="text-xs text-gray-500 text-center">Customer paid in cash at the counter</span>
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5 text-indigo-600" />
                Payment Note <span className="text-gray-400 font-normal lowercase tracking-normal">(receipt no, UPI ref, etc.)</span>
              </label>
              <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group max-w-xl">
                <DocumentTextIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Receipt #1234, UPI ref: abc123xyz"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                />
                {paymentNote && (
                  <button
                    type="button"
                    onClick={() => setPaymentNote("")}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                    title="Clear note"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Confirm ── */}
        {currentStep === "confirm" && (
          <div className="space-y-4">
            {/* Customer summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Customer</h3>
              {selectedCustomer ? (
                <div>
                  <p className="font-semibold text-gray-800">{selectedCustomer.username}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.phone ?? "—"} · {selectedCustomer.email ?? "No email"}</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-gray-800">{newCustomer.username} <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">New</span></p>
                  <p className="text-sm text-gray-500">{newCustomer.phone} {newCustomer.email ? `· ${newCustomer.email}` : ""}</p>
                </div>
              )}
            </div>

            {/* Items summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Items ({cart.length})</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold">Product</th>
                    <th className="pb-2 text-center font-semibold">Qty</th>
                    <th className="pb-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cart.map(item => (
                    <tr key={`${item.product.id}-${item.variantId ?? "base"}`}>
                      <td className="py-2 text-gray-700">
                        {item.product.name}
                        {item.variantOptions && (
                          <span className="block text-xs text-gray-400">
                            {Object.entries(item.variantOptions).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-right font-semibold text-gray-800">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {appliedCoupon && (
                    <>
                      <tr>
                        <td colSpan={2} className="pt-3 text-gray-500">Subtotal</td>
                        <td className="pt-3 text-right text-gray-600">₹{cartTotal.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-emerald-600 font-semibold flex items-center gap-1.5 pt-1">
                          <TicketIcon className="w-3.5 h-3.5" /> {appliedCoupon.code}
                        </td>
                        <td className="text-right text-emerald-600 font-semibold pt-1">−₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-gray-200">
                    <td colSpan={2} className="pt-3 font-bold text-gray-800">Total</td>
                    <td className="pt-3 text-right font-bold text-indigo-700 text-base">₹{orderTotal.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Address summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Delivery Address</h3>
                {!(address.fullAddress.trim() || address.city.trim() || address.state.trim() || address.zipCode.trim()) && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                    Store / Counter Pickup
                  </span>
                )}
              </div>
              {address.fullAddress.trim() || address.city.trim() || address.state.trim() || address.zipCode.trim() ? (
                <div>
                  {address.fullAddress.trim() && <p className="text-sm font-medium text-gray-800">{address.fullAddress}</p>}
                  <p className="text-sm text-gray-500">
                    {[address.city, address.state].filter(Boolean).join(", ")}
                    {address.zipCode ? ` ${address.zipCode}` : ""}
                    {address.country ? `, ${address.country}` : ""}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-gray-500 py-1">
                  <BuildingStorefrontIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>No delivery address specified (Handled as Store / Counter Pickup)</span>
                </div>
              )}
            </div>

            {/* Payment summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Payment</h3>
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${paymentMethod === "CASH" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {paymentMethod === "CASH" ? "Cash Collected" : "Pay on Delivery"}
                </span>
                {paymentNote && <span className="text-sm text-gray-500">Ref: {paymentNote}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Back
          </button>

          {currentStep !== "confirm" ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placing}
              className="flex items-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {placing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing…</>
              ) : (
                <><CheckCircleIcon className="w-4 h-4" /> Place Order</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Duplicate Customer Conflict Modal ── */}
      {conflictModalOpen && conflictCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/20 max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-5 bg-gradient-to-br from-indigo-50/80 via-white to-white border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950 tracking-tight">Customer Already Exists</h2>
                  <span className="inline-block mt-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-full">
                    Existing Customer Found
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {conflictReason || "A customer with this phone number or email is already registered."}{" "}
                {conflictTriggerSource === "step1_next" || currentStep === "customer"
                  ? "Would you like to select this existing customer and continue to product selection?"
                  : "Would you like to select this customer to complete and place the order immediately?"}
              </p>

              {/* Matched Customer Profile Card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3 text-indigo-600" />
                    Matched Customer Account
                  </span>
                  <span className="text-xs font-semibold text-gray-400 font-mono">ID: #{conflictCustomer.id.slice(-6)}</span>
                </div>

                <div className="flex items-center gap-3.5 pt-0.5">
                  <CustomerAvatar name={conflictCustomer.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-gray-900 truncate">
                      {conflictCustomer.username}
                    </h4>
                    {newCustomer.username.trim() && newCustomer.username.trim().toLowerCase() !== conflictCustomer.username.toLowerCase() && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Entered name: <span className="font-medium text-gray-600">"{newCustomer.username}"</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                        {conflictCustomer.phone ?? "No phone"}
                      </span>
                      {conflictCustomer.email && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                          {conflictCustomer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConflictModalOpen(false);
                    setCurrentStep("customer");
                    setCustomerMode("new");
                  }}
                  disabled={conflictSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition text-center disabled:opacity-50"
                >
                  Edit Customer Details
                </button>
                <button
                  type="button"
                  onClick={handleSelectConflictCustomerAction}
                  disabled={conflictSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
                >
                  {conflictSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order…
                    </>
                  ) : conflictTriggerSource === "step1_next" || currentStep === "customer" ? (
                    <>
                      Select & Continue <ArrowRightIcon className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Select & Place Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
