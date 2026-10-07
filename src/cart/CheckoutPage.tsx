import React, { useEffect, useState, useRef, Fragment } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { createPortal } from "react-dom";
import { Popover, Transition } from "@headlessui/react";
import {
  ChevronUpIcon,
  MapPinIcon,
  TruckIcon,
  CreditCardIcon,
  BanknotesIcon,
  TagIcon,
  XCircleIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeft, CheckCircle, Package, QrCode, UploadCloud, Copy, Trash2, X, Sparkles, AlertCircle } from "lucide-react";
import QRCode from "qrcode";

const validateTransactionId = (val: string) => {
  const cleaned = val.trim().replace(/[\s-]/g, "");
  if (!cleaned) return { isValid: false, message: "", type: "EMPTY" };

  // Pure digits: standard NPCI 12-digit UTR
  if (/^\d+$/.test(cleaned)) {
    if (cleaned.length === 12) {
      return { isValid: true, message: "Valid 12-digit UPI UTR", type: "UTR" };
    }
    return {
      isValid: false,
      message: "UTR must be exactly 12 digits",
      type: "INCOMPLETE_UTR",
    };
  }

  // Alphanumeric UPI Reference ID (10 to 12 chars)
  if (/^[a-zA-Z0-9_-]{10,12}$/.test(cleaned)) {
    return { isValid: true, message: "Valid UPI Reference ID", type: "REF_ID" };
  }

  if (cleaned.length < 10) {
    return {
      isValid: false,
      message: "Min 10 characters or 12-digit UTR required",
      type: "TOO_SHORT",
    };
  }

  return {
    isValid: false,
    message: "Only numbers, letters, hyphens, and underscores allowed",
    type: "INVALID_CHARS",
  };
};
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import CancellationFeedbackModal, { SurveyItemSnapshot } from "../components/CancellationFeedbackModal";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast, { Toaster } from "react-hot-toast";
import { trackMetaInitiateCheckout, trackMetaPurchase } from "../utils/metaPixel";

import { motion, AnimatePresence } from "framer-motion";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


interface AddressState {
  house: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
}

interface Suggestion {
  lat: string;
  lon: string;
  display_name: string;
}

const DEFAULT_MAP_CENTER: [number, number] = [20.5937, 78.9629];

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [37.5, 97.5],
];

const isWithinIndiaBoundingBox = (lat: number, lng: number): boolean => {
  return lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0;
};

function MapRecenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);

  return null;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

const CheckoutPage = () => {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { cartItems, cartTotal, clearCart, fetchCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTriggerSource, setFeedbackTriggerSource] = useState("CHECKOUT_CANCELLED");
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<{
    username?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const prefill = location.state as {
    addressPrefill?: {
      fullAddress: string;
      detectedArea?: string;
      city: string;
      state: string;
      zipCode: string;
      lat: number | null;
      lng: number | null;
      isGpsLocked?: boolean;
    };
    shippingCharge?: number;
    buyNowProductId?: string;
    buyNowVariantId?: string | null;
  } | null;
  const buyNowProductId = prefill?.buyNowProductId ?? null;
  const buyNowVariantId = prefill?.buyNowVariantId ?? null;
  const isPaymentSuccess = useRef(false);

  // For Buy Now: only process the specific product, not the entire cart
  const checkoutItems = buyNowProductId
    ? cartItems.filter(
        (i) =>
          i.productId === buyNowProductId &&
          (!buyNowVariantId || (i.variantId ?? null) === buyNowVariantId),
      )
    : cartItems;
  const checkoutSubtotal = checkoutItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );

  // --- NEW STATE FOR BLUR EFFECT ---
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  const [address, setAddress] = useState<AddressState>({
    house: prefill?.addressPrefill?.fullAddress ?? "",
    city: prefill?.addressPrefill?.city ?? "",
    state: prefill?.addressPrefill?.state ?? "",
    pincode: prefill?.addressPrefill?.zipCode ?? "",
    lat: prefill?.addressPrefill?.lat ?? null,
    lng: prefill?.addressPrefill?.lng ?? null,
  });

  const [detectedArea, setDetectedArea] = useState<string>(
    prefill?.addressPrefill?.detectedArea ?? ""
  );

  const [isGpsLocked, setIsGpsLocked] = useState<boolean>(
    !!prefill?.addressPrefill?.isGpsLocked || (!!prefill?.addressPrefill?.lat && !!prefill?.addressPrefill?.lng),
  );

  const [shippingCharge, setShippingCharge] = useState(
    prefill?.shippingCharge ?? 0,
  );
  const [shippingToggles, setShippingToggles] = useState<{
    calculateShippingForCOD: boolean;
    calculateShippingForOnline: boolean;
    calculateShippingForQR: boolean;
  }>({
    calculateShippingForCOD: true,
    calculateShippingForOnline: true,
    calculateShippingForQR: true,
  });
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(
    prefill?.addressPrefill?.lat && prefill?.addressPrefill?.lng
      ? [prefill.addressPrefill.lat, prefill.addressPrefill.lng]
      : null,
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  useBodyScrollLock(showSuccessModal);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string;
    code: string;
    discountAmount: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Dismiss any lingering toasts from previous pages on mount
  useEffect(() => {
    toast.dismiss();
  }, []);

  // Track Meta Pixel InitiateCheckout event when checkout loads with items
  useEffect(() => {
    if (checkoutItems.length > 0) {
      trackMetaInitiateCheckout({
        content_ids: checkoutItems.map((i) => String(i.productId)),
        num_items: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
        value: checkoutSubtotal,
        currency: "INR",
      });
    }
  }, [checkoutItems.length]);

  // Pay with QR state
  const [qrConfig, setQrConfig] = useState<{
    enabled: boolean;
    qrCode: string;
    upiId?: string;
    accountName?: string;
    instructions?: string;
  }>({ enabled: false, qrCode: "" });
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalStep, setQrModalStep] = useState<"SCAN" | "SUBMIT">("SCAN");
  useBodyScrollLock(showQrModal);
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string | null>(null);
  const [qrTransactionId, setQrTransactionId] = useState("");
  const [qrScreenshotFile, setQrScreenshotFile] = useState<File | null>(null);
  const [qrScreenshotPreview, setQrScreenshotPreview] = useState<string | null>(null);
  const [qrSubmitting, setQrSubmitting] = useState(false);

  useEffect(() => {
    api.get("/admin/company-settings")
      .then((res) => {
        const s = res.data?.settings;
        if (s) {
          setQrConfig({
            enabled: s.PAYMENT_QR_ENABLED === "true" || s.PAYMENT_QR_ENABLED === "1" || s.PAYMENT_QR_ENABLED === true,
            qrCode: s.PAYMENT_QR_CODE || "",
            upiId: s.PAYMENT_QR_UPI_ID || "",
            accountName: s.PAYMENT_QR_ACCOUNT_NAME || "",
            instructions: s.PAYMENT_QR_INSTRUCTIONS || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch logged in customer profile details for accurate activity tracking
  useEffect(() => {
    if (user?.isAuthenticated) {
      api
        .get("/user/profile")
        .then((res) => {
          if (res.data?.users) {
            setUserProfile(res.data.users);
          }
        })
        .catch(() => {});
    }
  }, [user?.isAuthenticated]);

  // Fetch default saved address if no prefill address was provided (e.g. direct checkout from cart)
  useEffect(() => {
    if (!prefill?.addressPrefill && user?.isAuthenticated) {
      api
        .get("/address/default")
        .then((res) => {
          const addr = res.data?.address;
          if (addr) {
            setAddress({
              house: addr.fullAddress || "",
              city: addr.city || "",
              state: addr.state || "",
              pincode: addr.zipCode || "",
              lat: addr.latitude ?? null,
              lng: addr.longitude ?? null,
            });
            if (addr.latitude && addr.longitude) {
              setPosition([addr.latitude, addr.longitude]);
              setIsGpsLocked(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.isAuthenticated, prefill?.addressPrefill]);

  // Fetch shipping toggles so checkout knows if COD, Online, or QR have free shipping configured
  useEffect(() => {
    api.get("/order/shipping-toggles")
      .then((res) => {
        if (res.data?.toggles) {
          setShippingToggles({
            calculateShippingForCOD: res.data.toggles.calculateShippingForCOD !== false,
            calculateShippingForOnline: res.data.toggles.calculateShippingForOnline !== false,
            calculateShippingForQR: res.data.toggles.calculateShippingForQR !== false,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load shipping toggles", err);
      });
  }, []);

  // Protect route: Redirect to cart if there are no items to checkout
  useEffect(() => {
    if (!showSuccessModal) {
      if (!buyNowProductId && (!cartItems || cartItems.length === 0)) {
        navigate("/cart", { replace: true });
      }
    }
  }, [cartItems, buyNowProductId, showSuccessModal, navigate]);

  // Update shipping charge when state, city, or pincode changes (manual mode)
  useEffect(() => {
    if (isGpsLocked) return;

    if (!address.state.trim() && !address.pincode.trim()) {
      setShippingCharge(0);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await api.post("/address/preview-shipping", {
          manual: true,
          state: address.state.trim(),
          city: address.city.trim(),
          zipCode: address.pincode.trim(),
        });
        setShippingCharge(res.data.shippingCharge);
        if (typeof res.data?.calculateShippingForCOD === "boolean") {
          setShippingToggles({
            calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
            calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
            calculateShippingForQR: res.data.calculateShippingForQR !== false,
          });
        }
      } catch (err) {
        console.error("Error updating shipping charge", err);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [address.state, address.city, address.pincode, isGpsLocked]);

  // Re-verify shipping charge when GPS is locked to ensure rates from DB are fresh
  useEffect(() => {
    if (isGpsLocked && address.lat !== null && address.lng !== null) {
      api.post("/address/preview-shipping", {
        latitude: address.lat,
        longitude: address.lng,
        state: address.state,
        city: address.city,
        zipCode: address.pincode,
      }).then((res) => {
        if (typeof res.data?.shippingCharge === "number") {
          setShippingCharge(res.data.shippingCharge);
        }
        if (typeof res.data?.calculateShippingForCOD === "boolean") {
          setShippingToggles({
            calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
            calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
            calculateShippingForQR: res.data.calculateShippingForQR !== false,
          });
        }
      }).catch((err) => {
        console.error("Error refreshing GPS shipping charge", err);
      });
    }
  }, [isGpsLocked, address.lat, address.lng, address.city, address.state]);


  const handleResetGpsLock = () => {
    setAddress({
      house: "",
      city: "",
      state: "",
      pincode: "",
      lat: null,
      lng: null,
    });
    setShippingCharge(0);
    setPosition(null);
    setIsGpsLocked(false);
    toast.success("Location lock cleared. You can now enter address manually.");
  };

  const handleManualSelect = async (
    lat: number,
    lng: number,
    displayName: string,
  ) => {
    const toastId = toast.loading("Calculating shipping...");

    try {
      const res = await api.post("/address/save-geo", {
        latitude: lat,
        longitude: lng,
      });

      const { address: addr, shippingCharge } = res.data;

      setAddress({
        house: "",
        city: addr.city || "",
        state: addr.state || "",
        pincode: addr.zipCode || "",
        lat,
        lng,
      });
      setDetectedArea(addr.fullAddress || "");

      setShippingCharge(shippingCharge);
      if (typeof res.data?.calculateShippingForCOD === "boolean") {
        setShippingToggles({
          calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
          calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
          calculateShippingForQR: res.data.calculateShippingForQR !== false,
        });
      }
      setPosition([lat, lng]);
      setSuggestions([]);
      setQuery("");
      setIsGpsLocked(true);
      toast.dismiss(toastId);
      toast.success(`Shipping ₹${shippingCharge}`);
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || "Failed to calculate shipping for this location.";
      toast.error(msg);
    }
  };

  const handleMapPick = (lat: number, lng: number) => {
    handleManualSelect(lat, lng, "Selected location from map");
  };

  // --- COUPON APPLY ---
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post("/coupon/validate", {
        code: couponCode.trim(),
        orderAmount: Number(checkoutSubtotal),
      });
      setAppliedCoupon(res.data);
      toast.success(
        `Coupon "${res.data.code}" applied! You save ₹${res.data.discountAmount}`,
      );
      setCouponCode("");
    } catch (err: any) {
      console.error("Coupon validation error:", err);
      const message = err.response?.data?.message || err.message || "Invalid coupon code";
      toast.dismiss();
      toast.error(message, { id: "coupon-apply-error" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // --- SCRIPT LOADER ---
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // --- ONLINE PAYMENT LOGIC ---
  const startOnlinePayment = async () => {
    setLoading(true);
    isPaymentSuccess.current = false;

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error("Razorpay SDK failed to load.");
        setLoading(false);
        return;
      }

      const shippingAddressPayload = getFinalShippingAddress();
      const res = await api.post("/order/place", {
        couponId: appliedCoupon?.couponId,
        shippingAddress: shippingAddressPayload,
        ...(buyNowProductId
          ? {
              buyNowProductId,
              ...(buyNowVariantId ? { buyNowVariantId } : {}),
            }
          : {}),
      });

      if (!res.data || !res.data.rzpOrder) {
        throw new Error("Invalid response from server");
      }

      const razorpayKey = res.data.razorpay_key_id;
      if (!razorpayKey) {
        toast.error("Payment configuration error. Please contact support.");
        setLoading(false);
        return;
      }

      let orderClosed = false;
      const cancelPendingOrder = async () => {
        if (orderClosed || isPaymentSuccess.current) return;
        orderClosed = true;
        try {
          await api.post(`/order/cancel/${res.data.order.id}`);
        } catch (err) {
          console.error("Cancel failed", err);
        }
      };

      console.log(' razorpayKey',razorpayKey)
      console.log(' responseee',res)
 

      const options = {
        key: razorpayKey,
        amount: res.data.rzpOrder.amount,
        currency: "INR",
        name: branding.companyName || "Store",
        description: "Order payment",
        order_id: res.data.rzpOrder.id,
        method: {
          card: true,
          netbanking: true,
          wallet: true,
          paylater: true,
          upi: true,
        },
        retry: {
          enabled: false,
        },
        timeout: 300,
        handler: async (response: any) => {
          setIsRazorpayOpen(false);
          isPaymentSuccess.current = true;
          toast.success("Payment Successful! Processing...");

          try {
            await api.post("/order/verifyPayment", {
              ...response,
              ...(buyNowProductId
                ? {
                    buyNowProductId,
                    ...(buyNowVariantId ? { buyNowVariantId } : {}),
                  }
                : {}),
            });
          } catch (err) {
            console.error("Verification API Error:", err);
            toast.error(
              "Payment was captured, but verification failed. Please contact support.",
            );
            setLoading(false);
            return;
          }

          if (buyNowProductId) {
            if (fetchCart) await fetchCart();
          } else {
            if (clearCart) clearCart();
          }

          setAddress({
            house: "",
            city: "",
            state: "",
            pincode: "",
            lat: null,
            lng: null,
          });
          setShippingCharge(0);
          setPosition(null);
          setLoading(false);

          trackMetaPurchase({
            content_ids: checkoutItems.map((i) => String(i.productId)),
            num_items: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
            value: Number(totalAmount),
            currency: "INR",
          });

          setShowSuccessModal(true);
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: async function () {
            setIsRazorpayOpen(false);
            setLoading(false);

            if (isPaymentSuccess.current) return;
            await cancelPendingOrder();
            toast.error("Payment cancelled.");
            setTimeout(() => {
              setFeedbackTriggerSource("RAZORPAY_CANCELLED");
              setFeedbackOrderId(res.data.order?.id);
              setFeedbackModalOpen(true);
            }, 300);
          },
        },
      };

      console.log(' optionsssss',options)

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", async function (response: any) {
        setIsRazorpayOpen(false);
        setLoading(false);

        toast.error("Payment Failed");
        if (!isPaymentSuccess.current) {
          await cancelPendingOrder();
        }
        setTimeout(() => {
          setFeedbackTriggerSource("PAYMENT_FAILED");
          setFeedbackOrderId(res.data.order?.id);
          setFeedbackModalOpen(true);
        }, 300);
      });

      setIsRazorpayOpen(true);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Payment initialization failed");
      setLoading(false);
    }
  };

  // --- GEOLOCATION LOGIC ---
  const handleGetLocation = () => {
    const fallbackToIPGeolocation = async (message: string) => {
      const toastId = toast.loading(message);
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("IP lookup failed");
        const data = await response.json();
        const { latitude, longitude } = data;
        if (latitude === undefined || longitude === undefined) throw new Error("Invalid coordinates");

        if (!isWithinIndiaBoundingBox(latitude, longitude)) {
          toast.dismiss(toastId);
          toast.error("Detected location is outside India. Delivery is only available within India.");
          return;
        }

        setPosition([latitude, longitude]);

        const res = await api.post("/address/save-geo", {
          latitude,
          longitude,
        });
        const { address: addr, shippingCharge } = res.data;

        setAddress({
          house: "",
          city: addr.city || addr.town || addr.village || addr.county || "",
          state: addr.state || "",
          pincode: addr.zipCode || addr.postcode || "",
          lat: latitude,
          lng: longitude,
        });
        setDetectedArea(addr.fullAddress || "");

        setShippingCharge(shippingCharge);
        if (typeof res.data?.calculateShippingForCOD === "boolean") {
          setShippingToggles({
            calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
            calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
            calculateShippingForQR: res.data.calculateShippingForQR !== false,
          });
        }
        setIsGpsLocked(true);
        toast.dismiss(toastId);
        toast.success(`Location estimated via IP! Shipping: ₹${shippingCharge}`);
      } catch (err: any) {
        toast.dismiss(toastId);
        const msg = err.response?.data?.message || "Could not estimate location. Please enter manually.";
        toast.error(msg);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIPGeolocation("GPS unavailable (requires HTTPS). Estimating location via IP...");
      return;
    }

    const toastId = toast.loading("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      async (geoPosition) => {
        const { latitude, longitude } = geoPosition.coords;
        if (!isWithinIndiaBoundingBox(latitude, longitude)) {
          toast.dismiss(toastId);
          toast.error("Detected location is outside India. Delivery is only available within India.");
          return;
        }

        try {
          setPosition([latitude, longitude]);

          const res = await api.post("/address/save-geo", {
            latitude,
            longitude,
          });
          const { address: addr, shippingCharge } = res.data;

          setAddress({
            house: "",
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            pincode: addr.zipCode || addr.postcode || "",
            lat: latitude,
            lng: longitude,
          });
          setDetectedArea(addr.fullAddress || "");

          setShippingCharge(shippingCharge);
          if (typeof res.data?.calculateShippingForCOD === "boolean") {
            setShippingToggles({
              calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
              calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
              calculateShippingForQR: res.data.calculateShippingForQR !== false,
            });
          }
          setIsGpsLocked(true);
          toast.dismiss(toastId);
          toast.success(`Location set! Shipping: ₹${shippingCharge}`);
        } catch (err: any) {
          toast.dismiss(toastId);
          const msg = err.response?.data?.message || "Failed to get address details.";
          toast.error(msg);
        }
      },
      (err) => {
        toast.dismiss(toastId);
        if (err.code === err.PERMISSION_DENIED) {
          fallbackToIPGeolocation("GPS permission denied. Estimating location via IP...");
        } else {
          fallbackToIPGeolocation("GPS signal weak. Estimating location via IP...");
        }
      },
      { enableHighAccuracy: false },
    );
  };

  const getFinalShippingAddress = () => {
    const enteredStreet = address.house.trim();
    const area = detectedArea.trim();
    let finalFullAddress = enteredStreet;
    if (area && !enteredStreet.toLowerCase().includes(area.toLowerCase())) {
      finalFullAddress = `${enteredStreet}, ${area}`;
    }
    return {
      fullAddress: finalFullAddress,
      city: address.city.trim(),
      state: address.state.trim(),
      zipCode: address.pincode.trim(),
      country: "India",
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
    };
  };

  // --- PLACE ORDER HANDLER ---
  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0 || Number(checkoutSubtotal) <= 0) {
      toast.error("Your cart is empty. Please add products to continue.", { id: "checkout-empty" });
      navigate("/cart", { replace: true });
      return;
    }

    if (!address.house.trim()) {
      toast.error("Please enter your street address.", { id: "checkout-validate" });
      return;
    }
    if (!address.city.trim()) {
      toast.error("Please enter your city.", { id: "checkout-validate" });
      return;
    }
    if (!address.state.trim()) {
      toast.error("Please enter your state.", { id: "checkout-validate" });
      return;
    }
    if (!address.pincode.trim()) {
      toast.error("Please enter your pincode.", { id: "checkout-validate" });
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(address.pincode.trim())) {
      toast.error("Please enter a valid 6-digit pincode.", { id: "checkout-validate" });
      return;
    }

    const shippingAddressPayload = getFinalShippingAddress();

    // Persist full shipping address with GPS coordinates to user's address record
    try {
      await api.post("/address/save-manual", {
        fullAddress: shippingAddressPayload.fullAddress,
        city: shippingAddressPayload.city,
        state: shippingAddressPayload.state,
        zipCode: shippingAddressPayload.zipCode,
        latitude: shippingAddressPayload.lat,
        longitude: shippingAddressPayload.lng,
      });
    } catch (saveErr) {
      console.error("Failed to save address before order:", saveErr);
    }

    if (paymentMethod === "POD") {
      let toastId;
      try {
        setLoading(true);
        toastId = toast.loading("Processing your order...");

        await api.post("/order/placeOrderPOD", {
          couponId: appliedCoupon?.couponId,
          shippingAddress: shippingAddressPayload,
          ...(buyNowProductId
            ? {
                buyNowProductId,
                ...(buyNowVariantId ? { buyNowVariantId } : {}),
              }
            : {}),
        });

        isPaymentSuccess.current = true;
        if (buyNowProductId) {
          if (fetchCart) await fetchCart();
        } else {
          if (clearCart) clearCart();
        }
        toast.dismiss(toastId);
        toast.success("Order placed successfully!");

        trackMetaPurchase({
          content_ids: checkoutItems.map((i) => String(i.productId)),
          num_items: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
          value: Number(totalAmount),
          currency: "INR",
        });

        setShowSuccessModal(true);
      } catch (e) {
        if (toastId) toast.dismiss(toastId);
        toast.error("Order failed. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (paymentMethod === "QR") {
      setQrModalStep("SCAN");
      setShowQrModal(true);
    } else {
      await startOnlinePayment();
    }
  };

  const handleConfirmQrPayment = async () => {
    const cleanTxId = qrTransactionId.trim().replace(/[\s-]/g, "");
    const txValidation = validateTransactionId(qrTransactionId);

    if (qrTransactionId.trim() && !txValidation.isValid) {
      toast.error(txValidation.message);
      return;
    }

    if (!cleanTxId && !qrScreenshotFile) {
      toast.error("Please enter a valid 12-digit UTR or upload a payment screenshot.");
      return;
    }

    setQrSubmitting(true);
    const toastId = toast.loading("Submitting your order...");

    try {
      const shippingAddressPayload = getFinalShippingAddress();
      const fd = new FormData();
      if (appliedCoupon?.couponId) fd.append("couponId", appliedCoupon.couponId);
      if (buyNowProductId) fd.append("buyNowProductId", buyNowProductId);
      if (buyNowVariantId) fd.append("buyNowVariantId", buyNowVariantId);
      if (cleanTxId) fd.append("transactionId", cleanTxId);
      if (qrScreenshotFile) fd.append("screenshot", qrScreenshotFile);
      fd.append("shippingAddress", JSON.stringify(shippingAddressPayload));

      await api.post("/order/placeOrderQR", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      isPaymentSuccess.current = true;
      if (buyNowProductId) {
        if (fetchCart) await fetchCart();
      } else {
        if (clearCart) clearCart();
      }

      toast.dismiss(toastId);
      toast.success("Order placed successfully with QR payment!");
      setShowQrModal(false);
      setQrModalStep("SCAN");
      setQrTransactionId("");
      setQrScreenshotFile(null);
      setQrScreenshotPreview(null);

      trackMetaPurchase({
        content_ids: checkoutItems.map((i) => String(i.productId)),
        num_items: checkoutItems.reduce((sum, i) => sum + i.quantity, 0),
        value: Number(totalAmount),
        currency: "INR",
      });

      setShowSuccessModal(true);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setQrSubmitting(false);
    }
  };

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const isShippingDisabledForPayment =
    (paymentMethod === "POD" && !shippingToggles.calculateShippingForCOD) ||
    (paymentMethod === "Online" && !shippingToggles.calculateShippingForOnline) ||
    (paymentMethod === "QR" && !shippingToggles.calculateShippingForQR);
  const effectiveShippingCharge = checkoutItems.length === 0
    ? 0
    : isShippingDisabledForPayment
    ? 0
    : Number(shippingCharge || 0);
  const totalAmount = checkoutItems.length === 0
    ? "0.00"
    : Math.max(
        checkoutSubtotal + effectiveShippingCharge - discountAmount,
        0,
      ).toFixed(2);

  // Generate dynamic amount-embedded UPI QR code on the fly
  useEffect(() => {
    if (qrConfig.upiId && totalAmount) {
      const payeeName = qrConfig.accountName?.trim() || "Store";
      const upiUri = `upi://pay?pa=${encodeURIComponent(qrConfig.upiId.trim())}&pn=${encodeURIComponent(
        payeeName
      )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Order Payment - ${payeeName}`)}`;

      QRCode.toDataURL(upiUri, {
        width: 340,
        margin: 1.5,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      })
        .then((url: string) => setDynamicQrUrl(url))
        .catch((err: unknown) => {
          console.error("Failed to generate dynamic UPI QR", err);
          setDynamicQrUrl(null);
        });
    } else {
      setDynamicQrUrl(null);
    }
  }, [qrConfig.upiId, qrConfig.accountName, totalAmount]);


  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pt-24 pb-24 md:pb-12 relative overflow-x-hidden">
      <style>{`
        .leaflet-container {
          cursor: pointer !important;
        }
      `}</style>
      {/* MAIN WRAPPER DIV */}
      <div
        className={`mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-12 transition-opacity duration-300 ${
          isRazorpayOpen
            ? "pointer-events-none opacity-40"
            : "opacity-100"
        }`}
      >
        {/* --- Header & Back Button --- */}
        <div className="mb-8 mt-10">
          <button
            type="button"
            onClick={() => {
              setFeedbackTriggerSource(paymentMethod === "POD" ? "COD_CHECKOUT_EXIT" : "CHECKOUT_EXIT");
              setFeedbackModalOpen(true);
            }}
            className="group inline-flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 hover:text-slate-800 transition-colors duration-200 uppercase cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
            Go Back
          </button>
        </div>

        <div className="md:grid md:grid-cols-12 md:gap-x-8 lg:gap-x-16 xl:gap-x-28 items-start">
          
          {/* ================= LEFT SIDE: FORM ================= */}
          <div className="md:col-span-7 bg-white rounded-3xl md:rounded-[2rem] shadow-sm border border-gray-100 p-4 sm:p-6 md:p-10 mb-8 md:mb-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-4xl mb-2">
                Checkout
              </h1>
              <p className="text-gray-500">Complete your purchase securely.</p>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              {/* Shipping Address */}
              <div className="border-b border-gray-100 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-base font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-slate-600" /> Shipping Address
                  </h2>
                  {isGpsLocked ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50/50 text-emerald-700 border border-emerald-100/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        GPS Locked
                      </span>
                      <button
                        type="button"
                        onClick={handleResetGpsLock}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/30 text-xs font-semibold transition"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition active:scale-98"
                    >
                      <MapPinIcon className="h-3.5 w-3.5 text-slate-500" />
                      Use Current Location
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Pincode
                    </label>
                    <div className="relative w-full sm:w-1/2">
                      <input
                        type="text"
                        value={address.pincode}
                        onChange={async (e) => {
                          if (isGpsLocked) return;
                          const val = e.target.value;
                          const cleanPincode = val.replace(/\D/g, "").slice(0, 6);
                          setAddress((prev) => ({ ...prev, pincode: cleanPincode }));

                          if (cleanPincode.length === 6) {
                            try {
                              const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`);
                              if (res.ok) {
                                const data = await res.json();
                                if (data && data[0] && data[0].Status === "Success") {
                                  const postOffice = data[0].PostOffice[0];
                                  const fetchedState = postOffice.State;
                                  const fetchedCity = postOffice.District || postOffice.Block || postOffice.Name;
                                  setAddress((prev) => ({
                                    ...prev,
                                    state: fetchedState || prev.state,
                                    city: fetchedCity || prev.city,
                                  }));
                                  toast.success(`Pincode resolved to ${fetchedCity}, ${fetchedState}`);
                                }
                              }
                            } catch (err) {
                              console.error("Failed to fetch state/city from pincode", err);
                            }
                          }
                        }}
                        readOnly={isGpsLocked}
                        placeholder="Enter 6-digit Pincode"
                        className={`block w-full rounded-xl border px-4 py-2.5 shadow-sm sm:text-sm transition focus:outline-none pr-10 ${
                          isGpsLocked
                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed select-none"
                            : "bg-white border-slate-200 focus:border-black focus:ring-1 focus:ring-black"
                        }`}
                      />
                      {isGpsLocked && (
                        <LockClosedIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2 relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Street Address
                    </label>

                    <input
                      type="text"
                      value={address.house}
                      onChange={(e) => {
                        if (isGpsLocked) {
                          setAddress((prev) => ({ ...prev, house: e.target.value }));
                        } else {
                          setAddress({
                            ...address,
                            house: e.target.value,
                            lat: null,
                            lng: null,
                          });
                          setQuery(e.target.value);
                        }
                      }}
                      className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black sm:text-sm transition bg-white"
                      placeholder="e.g. Flat 402, Skyline Apartments"
                    />

                    {suggestions.length > 0 && !isGpsLocked && (
                      <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                        {suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="px-4 py-3 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                            onClick={() =>
                                handleManualSelect(
                                  parseFloat(s.lat),
                                  parseFloat(s.lon),
                                  s.display_name,
                                )
                            }
                          >
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      City
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={address.city}
                        readOnly={true}
                        placeholder="Auto-filled from Pincode"
                        className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm bg-slate-50 text-slate-400 cursor-not-allowed select-none sm:text-sm transition pr-10"
                      />
                      <LockClosedIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      State
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={address.state}
                        readOnly={true}
                        placeholder="Auto-filled from Pincode"
                        className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm bg-slate-50 text-slate-400 cursor-not-allowed select-none sm:text-sm transition pr-10"
                      />
                      <LockClosedIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                </div>

                 {/* Map Block Container Wrapper */}
                 <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 shadow-md isolation-auto">
                   <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-5 py-4 border-b border-slate-100">
                     <div>
                       <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                         Pick delivery point on map
                       </p>
                       <p className="text-[11px] text-slate-400 mt-0.5">
                         Click anywhere on the map to set your address and shipping.
                       </p>
                     </div>
                   </div>
                   <div className="h-48 sm:h-64 w-full relative z-10 overflow-hidden">
                      <div className="h-full w-full">
                        <MapContainer
                          center={position ?? DEFAULT_MAP_CENTER}
                          zoom={position ? 16 : 5}
                          minZoom={4}
                          maxBounds={INDIA_BOUNDS}
                          maxBoundsViscosity={1.0}
                          className="h-full w-full"
                          scrollWheelZoom={true}
                          dragging={true}
                          doubleClickZoom={true}
                          zoomControl={false}
                          style={{ cursor: "pointer" }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                          <MapRecenter
                            center={position ?? DEFAULT_MAP_CENTER}
                            zoom={position ? 16 : 5}
                          />
                          <MapClickHandler onPick={handleMapPick} />
                          {position && <Marker position={position} icon={customIcon} />}
                          <ZoomControl position="topleft" />
                        </MapContainer>
                      </div>
                   </div>
                  <div className="bg-slate-50/70 px-5 py-2 text-[11px] text-slate-400 font-mono border-t border-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {position
                      ? `Pinned: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                      : "No map point selected yet"}
                  </div>
                </div>
              </div>

              {/* Payment Method Option Frame */}
              <div className="pt-10">
                <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5" /> Payment Method
                </h2>

                <div className={`grid grid-cols-1 gap-4 ${qrConfig.enabled && (qrConfig.upiId || qrConfig.qrCode) ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  <div
                    onClick={() => setPaymentMethod("Online")}
                    className={`relative cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
                      paymentMethod === "Online"
                        ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] ring-2 ring-[var(--theme-primary)] ring-offset-2"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm uppercase tracking-wide">
                        Pay Online
                      </span>
                      <CreditCardIcon
                        className={`h-6 w-6 ${
                          paymentMethod === "Online" ? "text-gray-300" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <p className={`text-xs ${paymentMethod === "Online" ? "text-gray-400" : "text-gray-500"}`}>
                      Credit Card, UPI, Netbanking
                    </p>
                    {!shippingToggles.calculateShippingForOnline && (
                      <div className="mt-2.5">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          paymentMethod === "Online" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          Free Shipping
                        </span>
                      </div>
                    )}
                  </div>

                  {qrConfig.enabled && (qrConfig.upiId || qrConfig.qrCode) && (
                    <div
                      onClick={() => setPaymentMethod("QR")}
                      className={`relative cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
                        paymentMethod === "QR"
                          ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] ring-2 ring-[var(--theme-primary)] ring-offset-2"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm uppercase tracking-wide flex items-center gap-1.5">
                          Pay with QR
                        </span>
                        <QrCode
                          className={`h-6 w-6 ${
                            paymentMethod === "QR" ? "text-gray-300" : "text-gray-400"
                          }`}
                        />
                      </div>
                      <p className={`text-xs ${paymentMethod === "QR" ? "text-gray-400" : "text-gray-500"}`}>
                        Scan QR &amp; Pay via UPI
                      </p>
                      {!shippingToggles.calculateShippingForQR && (
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            paymentMethod === "QR" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            Free Shipping
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    onClick={() => setPaymentMethod("POD")}
                    className={`relative cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
                      paymentMethod === "POD"
                        ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] ring-2 ring-[var(--theme-primary)] ring-offset-2"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm uppercase tracking-wide">
                        Cash on Delivery
                      </span>
                      <BanknotesIcon
                        className={`h-6 w-6 ${
                          paymentMethod === "POD" ? "text-gray-300" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <p className={`text-xs ${paymentMethod === "POD" ? "text-gray-400" : "text-gray-500"}`}>
                      Pay cash upon delivery
                    </p>
                    {!shippingToggles.calculateShippingForCOD && (
                      <div className="mt-2.5">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          paymentMethod === "POD" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          Free Shipping
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button (Desktop/Tablet layout contexts only) */}
              <div className="mt-10 hidden pt-6 md:block">
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={loading || checkoutItems.length === 0}
                  className="w-full rounded-full bg-[var(--theme-primary)] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[var(--theme-primary-ink)] shadow-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                >
                  {loading
                    ? "Processing..."
                    : checkoutItems.length === 0
                      ? "Cart is Empty"
                      : paymentMethod === "POD"
                        ? `Place Order — ₹${totalAmount}`
                        : paymentMethod === "QR"
                          ? `Pay with QR — ₹${totalAmount}`
                          : `Pay Now — ₹${totalAmount}`}
                </button>
              </div>
            </form>
          </div>

          {/* ================= RIGHT SIDE: SUMMARY (Desktop View Only) ================= */}
          <div className="hidden md:block md:col-span-5">
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:sticky md:top-24">
              <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 mb-6 flex items-center gap-2">
                <Package className="h-5 w-5" /> Order Summary
              </h2>

              {checkoutItems.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mb-6">
                  <p className="font-semibold text-gray-600">Your cart is empty</p>
                  <button
                    type="button"
                    onClick={() => navigate("/products")}
                    className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)] hover:underline cursor-pointer"
                  >
                    Start Shopping →
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {checkoutItems.map((item) => (
                    <li key={item._id} className="flex py-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="ml-4 flex flex-1 flex-col justify-center">
                        <div className="flex justify-between text-sm font-medium text-gray-900">
                          <h3 className="line-clamp-1">{item.name}</h3>
                          <p className="ml-4 font-bold">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <p
                            className="mt-0.5 text-xs text-gray-500 font-medium line-clamp-2 break-words leading-relaxed cursor-help"
                            title={Object.entries(item.selectedOptions)
                              .map(([axis, value]) => `${axis}: ${value}`)
                              .join(" · ")}
                          >
                            {Object.entries(item.selectedOptions)
                              .map(([axis, value]) => `${axis}: ${value}`)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Qty {item.quantity}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 pt-6 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{checkoutSubtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span className="flex items-center gap-1">
                    Shipping <TruckIcon className="h-3 w-3" />
                  </span>
                  <span className="font-medium text-gray-900">
                    {!isGpsLocked && !address.state.trim() && !address.pincode.trim() ? (
                      <span className="text-gray-400 italic">Enter address to calculate</span>
                    ) : effectiveShippingCharge === 0 ? (
                      <span className="text-green-600 font-medium flex items-center gap-1.5">
                        <span>Free</span>
                        {isShippingDisabledForPayment && (
                          <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded-full">
                            Free for {paymentMethod === "POD" ? "COD" : paymentMethod === "QR" ? "QR" : "Online"}
                          </span>
                        )}
                      </span>
                    ) : (
                      `₹${effectiveShippingCharge}`
                    )}
                  </span>
                </div>

                {/* Coupon Module Wrapper */}
                <div className="pt-2">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) =>
                            setCouponCode(e.target.value.toUpperCase())
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="Coupon code"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-black transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-[var(--theme-primary-hover)] transition"
                      >
                        {couponLoading ? "..." : "Apply"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs font-bold text-green-700">
                            {appliedCoupon.code}
                          </p>
                          <p className="text-xs text-green-600">
                            {appliedCoupon.discountType === "PERCENTAGE"
                              ? `${appliedCoupon.discountValue}% off`
                              : `₹${appliedCoupon.discountValue} off`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">−₹{discountAmount}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-100 pt-4">
                  <span className="text-base font-bold text-gray-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-[var(--theme-primary)]">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= INLINE BOTTOM CONTAINER (For Mobile Viewports Only) ================= */}
        {/* Removed 'fixed bottom-0' so it stacks cleanly under the form fields and map naturally */}
        <div
          className={`mt-8 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm md:hidden transition-all duration-300 ${
            isRazorpayOpen ? "blur-md pointer-events-none" : ""
          }`}
        >
          {/* Coupon Input — Mobile (Always Visible) */}
          <div className="mb-4 pt-1">
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="Coupon code"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-black transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-[var(--theme-primary-hover)] transition"
                >
                  {couponLoading ? "..." : "Apply"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-green-700">
                      {appliedCoupon.code}
                    </p>
                    <p className="text-xs text-green-600">
                      {appliedCoupon.discountType === "PERCENTAGE"
                        ? `${appliedCoupon.discountValue}% off`
                        : `₹${appliedCoupon.discountValue} off`}
                    </p>
                  </div>
                </div>
                <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500 transition">
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {discountAmount > 0 && (
            <div className="mb-2 flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span className="font-medium">−₹{discountAmount}</span>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-xl text-[var(--theme-primary)]">₹{totalAmount}</span>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={loading || checkoutItems.length === 0}
            className="w-full rounded-full bg-[var(--theme-primary)] px-4 py-4 text-sm font-bold uppercase tracking-widest text-[var(--theme-primary-ink)] shadow-md hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? "Processing..."
              : checkoutItems.length === 0
                ? "Cart is Empty"
                : paymentMethod === "POD"
                  ? "Place Order"
                  : paymentMethod === "QR"
                    ? "Pay with QR"
                    : "Pay Now"}
          </button>

          <Popover className="mt-4 flex justify-center relative">
            {({ open }) => (
              <Fragment>
                <Popover.Button className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide outline-none">
                  {open ? "Hide Details" : "View Details"}
                  <ChevronUpIcon
                    className={`h-3 w-3 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-10"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-10"
                >
                  <Popover.Panel className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[calc(100vw-2rem)] sm:w-full max-w-md bg-white border border-gray-200 px-6 py-6 shadow-2xl max-h-[60vh] overflow-y-auto rounded-3xl z-50">
                    <h3 className="text-sm font-bold uppercase text-gray-900 mb-4">
                      Order Summary
                    </h3>
                    <ul className="divide-y divide-gray-100 mb-4">
                      {checkoutItems.map((item) => (
                        <li key={item._id} className="flex py-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {item.name}
                            </p>
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <p
                                className="text-xs text-gray-500 font-medium line-clamp-2 break-words leading-relaxed cursor-help"
                                title={Object.entries(item.selectedOptions)
                                  .map(([axis, value]) => `${axis}: ${value}`)
                                  .join(" · ")}
                              >
                                {Object.entries(item.selectedOptions)
                                  .map(([axis, value]) => `${axis}: ${value}`)
                                  .join(" · ")}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 ml-2">
                            ₹{item.price * item.quantity}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>₹{checkoutSubtotal}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span className="flex items-center gap-1">
                          Shipping <TruckIcon className="h-3 w-3" />
                        </span>
                        <span>
                          {!isGpsLocked && !address.state.trim() && !address.pincode.trim() ? (
                            <span className="text-gray-400 italic">Enter address to calculate</span>
                          ) : effectiveShippingCharge === 0 ? (
                            <span className="text-green-600 font-medium flex items-center gap-1.5">
                              <span>Free</span>
                              {isShippingDisabledForPayment && (
                                <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded-full">
                                  Free for {paymentMethod === "POD" ? "COD" : paymentMethod === "QR" ? "QR" : "Online"}
                                </span>
                              )}
                            </span>
                          ) : (
                            `₹${effectiveShippingCharge}`
                          )}
                        </span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span className="font-medium">−₹{discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-100 pt-3">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="text-base font-bold text-[var(--theme-primary)]">
                          ₹{totalAmount}
                        </span>
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </Fragment>
            )}
          </Popover>
        </div>

      </div>

      {/* ================= PAY WITH QR MODAL ================= */}
      {createPortal(
        <AnimatePresence>
          {showQrModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!qrSubmitting) {
                    setShowQrModal(false);
                    setQrModalStep("SCAN");
                  }
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    {qrModalStep === "SUBMIT" ? (
                      <button
                        type="button"
                        onClick={() => setQrModalStep("SCAN")}
                        className="p-1.5 -ml-1 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Back to QR scanner"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                        <QrCode className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        {qrModalStep === "SCAN" ? "Scan QR to Pay" : "Verify Payment"}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {qrModalStep === "SCAN"
                          ? "Step 1: Scan with any UPI app"
                          : "Step 2: Enter transaction proof"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={qrSubmitting}
                    onClick={() => {
                      setShowQrModal(false);
                      setQrModalStep("SCAN");
                    }}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Amount Pill */}
                <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/80 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Total Payable Amount</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">₹{totalAmount}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-purple-700 text-xs font-bold border border-purple-200/60 shadow-xs">
                    UPI Accepted
                  </span>
                </div>

                {/* STEP 1: SCANNER IN THE CENTER */}
                {qrModalStep === "SCAN" && (
                  <div className="mt-4 flex flex-col items-center">
                    {/* Centered QR Frame with decorative scanner corner accents */}
                    <div className="relative p-2.5 bg-white rounded-2xl border border-purple-100 shadow-sm my-1">
                      <span className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-purple-600 rounded-tl-md pointer-events-none" />
                      <span className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-purple-600 rounded-tr-md pointer-events-none" />
                      <span className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-purple-600 rounded-bl-md pointer-events-none" />
                      <span className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-purple-600 rounded-br-md pointer-events-none" />

                      <img
                        src={dynamicQrUrl || qrConfig.qrCode}
                        alt="Payment QR Code"
                        className="w-52 h-52 object-contain rounded-xl"
                      />
                    </div>

                    {/* Pre-filled amount pill */}
                    {dynamicQrUrl && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Exact amount ₹{totalAmount} pre-filled in QR
                      </div>
                    )}

                    {qrConfig.accountName && (
                      <p className="mt-2 text-xs font-bold text-gray-800">
                        Payee: <span className="text-purple-700">{qrConfig.accountName}</span>
                      </p>
                    )}

                    {qrConfig.upiId && (
                      <div className="mt-2 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                        <span className="text-xs font-mono font-semibold text-gray-700">{qrConfig.upiId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(qrConfig.upiId!);
                            toast.success("UPI ID copied!");
                          }}
                          className="text-purple-600 hover:text-purple-800 transition-colors p-0.5"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="mt-2 text-[11px] text-gray-500 text-center max-w-xs">
                      {dynamicQrUrl
                        ? `Scan with GPay, PhonePe, or Paytm — ₹${totalAmount} is automatically locked in.`
                        : qrConfig.instructions || "Scan with any UPI app (GPay, PhonePe, Paytm) and complete payment."}
                    </p>

                    {/* Button to advance to Step 2 */}
                    <button
                      type="button"
                      onClick={() => setQrModalStep("SUBMIT")}
                      className="mt-5 w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>I Have Scanned &amp; Paid</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                {/* STEP 2: ENTER TRANSACTION ID OR UPLOAD SCREENSHOT */}
                {qrModalStep === "SUBMIT" && (() => {
                  const txStatus = validateTransactionId(qrTransactionId);
                  const isTxIdProvided = qrTransactionId.trim().length > 0;
                  const canSubmitQr = (isTxIdProvided && txStatus.isValid) || (!isTxIdProvided && !!qrScreenshotFile) || (isTxIdProvided && txStatus.isValid && !!qrScreenshotFile);

                  return (
                    <div className="mt-4 space-y-4">
                      <p className="text-xs text-gray-500 font-medium">
                        Enter your UPI Transaction ID (UTR) or attach the payment screenshot:
                      </p>

                      {/* Transaction ID input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Transaction ID / UTR Number
                        </label>

                        <div className="relative">
                          <input
                            type="text"
                            autoFocus
                            maxLength={12}
                            value={qrTransactionId}
                            onChange={(e) => setQrTransactionId(e.target.value.slice(0, 12))}
                            placeholder="e.g. 12-digit UTR (4239XXXXXXXX)"
                            className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-xs font-mono outline-none transition-all ${
                              !isTxIdProvided
                                ? "border-gray-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10"
                                : txStatus.isValid
                                ? "border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 text-emerald-950"
                                : "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 text-red-950"
                            }`}
                          />
                          {isTxIdProvided && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              {txStatus.isValid ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Helper or validation message */}
                        {isTxIdProvided ? (
                          <p
                            className={`text-[11px] font-medium flex items-center gap-1 ${
                              txStatus.isValid ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {txStatus.isValid ? "✓ " : "⚠ "}
                            {txStatus.message}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-400">
                            Standard UPI UTR is 12 digits (found on GPay, PhonePe, Paytm, or bank receipt).
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-px bg-gray-200 flex-1" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">OR / AND</span>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>

                      {/* Screenshot upload */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Payment Screenshot
                        </label>
                        {qrScreenshotPreview ? (
                          <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-3">
                            <img
                              src={qrScreenshotPreview}
                              alt="Screenshot preview"
                              className="w-14 h-14 object-cover rounded-xl border border-gray-200 bg-white shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">
                                {qrScreenshotFile?.name || "Screenshot"}
                              </p>
                              <p className="text-[10px] text-green-600 font-semibold mt-0.5">
                                ✓ Ready to upload
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setQrScreenshotFile(null);
                                setQrScreenshotPreview(null);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-all">
                            <UploadCloud className="w-7 h-7 text-purple-400 mb-1" />
                            <span className="text-xs font-bold text-gray-700">Upload payment screenshot</span>
                            <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG or WebP (Max 5MB)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.type.startsWith("image/")) {
                                  toast.error("Please upload an image file");
                                  return;
                                }
                                setQrScreenshotFile(file);
                                setQrScreenshotPreview(URL.createObjectURL(file));
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQrModalStep("SCAN")}
                          className="py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={qrSubmitting || !canSubmitQr}
                          onClick={handleConfirmQrPayment}
                          className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {qrSubmitting ? (
                            <>Submitting Order…</>
                          ) : (
                            <>Confirm &amp; Place Order</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {createPortal(
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl z-10"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500">
                  <CheckCircle className="h-10 w-10" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Order Confirmed!
                </h2>
                <p className="text-gray-500 mb-8">
                  We've received your order and will begin processing it right away.
                </p>

                <button
                  onClick={() => navigate("/myorders", { replace: true })}
                  className="w-full rounded-full bg-[var(--theme-primary)] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                >
                  Track Order
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Purchase Cancellation / Exit Intent Feedback Modal */}
      <CancellationFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          if (
            feedbackTriggerSource === "CHECKOUT_EXIT" ||
            feedbackTriggerSource === "COD_CHECKOUT_EXIT"
          ) {
            navigate("/cart", { replace: true });
          }
        }}
        customerName={userProfile?.username || (address.house ? address.house : "")}
        customerEmail={userProfile?.email || ""}
        customerPhone={userProfile?.phone || ""}
        paymentMethod={paymentMethod.toUpperCase()}
        triggerSource={feedbackTriggerSource}
        orderId={feedbackOrderId}
        items={checkoutItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variant: item.selectedOptions && Object.keys(item.selectedOptions).length > 0
            ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" / ")
            : undefined,
        }))}
        totalAmount={checkoutSubtotal + shippingCharge}
        onSubmitted={() => {
          if (
            feedbackTriggerSource === "CHECKOUT_EXIT" ||
            feedbackTriggerSource === "COD_CHECKOUT_EXIT"
          ) {
            navigate("/cart", { replace: true });
          }
        }}
      />
    </div>
  );
};

export default CheckoutPage;











