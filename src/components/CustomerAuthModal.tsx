// src/components/CustomerAuthModal.tsx
// Modal for customer auth with two modes:
//   Sign In:  phone → OTP → login  (404 = offer to create account)
//   Register: name + email + phone → OTP → register → auto-login

import { useState, useEffect, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  XMarkIcon,
  ShieldExclamationIcon,
  ArrowLeftIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import OtpInput from "react-otp-input";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import logo123 from "../assets/logo.png";

// ── Brand tokens ─────────────────────────────────────────────────────────────
const DEEP_GREEN = "#0c6b5e";

// ── MSG91 Widget Configuration (Fetched dynamically from backend at runtime) ───
let cachedMsg91Config: { widgetId: string; tokenAuth: string } | null = null;
let pendingConfigPromise: Promise<{ widgetId: string; tokenAuth: string }> | null = null;

const fetchMsg91Config = async (): Promise<{ widgetId: string; tokenAuth: string }> => {
  if (cachedMsg91Config && cachedMsg91Config.widgetId && cachedMsg91Config.tokenAuth) {
    return cachedMsg91Config;
  }
  if (pendingConfigPromise) {
    return pendingConfigPromise;
  }
  pendingConfigPromise = api
    .get("/auth/mobile/widget-config")
    .then((res) => {
      cachedMsg91Config = {
        widgetId: res.data?.widgetId || (import.meta.env.VITE_MSG91_WIDGET_ID as string) || "",
        tokenAuth: res.data?.tokenAuth || (import.meta.env.VITE_MSG91_TOKEN_AUTH as string) || "",
      };
      return cachedMsg91Config;
    })
    .catch((err) => {
      console.warn("Could not fetch MSG91 config from backend, using env fallback", err);
      return {
        widgetId: (import.meta.env.VITE_MSG91_WIDGET_ID as string) || "",
        tokenAuth: (import.meta.env.VITE_MSG91_TOKEN_AUTH as string) || "",
      };
    })
    .finally(() => {
      pendingConfigPromise = null;
    });

  return pendingConfigPromise;
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "sign-in" | "register";
type Step = "form" | "otp";

// ── OTP input style ───────────────────────────────────────────────────────────
const OTP_CLASS =
  "!w-11 !h-12 sm:!w-12 sm:!h-13 border border-slate-300 rounded-2xl text-center " +
  "text-xl font-bold text-slate-800 bg-white focus:outline-none " +
  "focus:border-[#0c6b5e] focus:ring-1 focus:ring-[#0c6b5e] transition-all duration-150";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CustomerAuthModal({ open, onClose }: Props) {
  const { checkAuthStatus } = useAuth();
  const { branding } = useBranding();
  const domainUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const logoSrc = branding.companyLogo
    ? branding.companyLogo.startsWith("http")
      ? branding.companyLogo
      : `${domainUrl}/${branding.companyLogo}`
    : logo123;
  const companyDisplayName = branding.companyName?.trim() || "Panakkal Ayurveda";

  useBodyScrollLock(open);

  const [mode, setMode] = useState<Mode>("sign-in");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [takingLong, setTakingLong] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Form fields
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Inline phone validation error
  const [phoneError, setPhoneError] = useState("");

  // Blocked state — set when the entered phone belongs to an admin account
  const [adminBlocked, setAdminBlocked] = useState(false);

  // OTP
  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState("");
  const [timer, setTimer] = useState(0);

  // Refs for request cancellation & Enter key focus navigation
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVerifyingRef = useRef(false);
  const takingLongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTakingLongTimer = () => {
    if (takingLongTimerRef.current) {
      clearTimeout(takingLongTimerRef.current);
      takingLongTimerRef.current = null;
    }
  };

  // Pre-fetch MSG91 configuration from backend on modal open
  useEffect(() => {
    if (open) {
      fetchMsg91Config();
    }
  }, [open]);

  // Clean up timers & abort requests on unmount
  useEffect(() => {
    return () => {
      clearTakingLongTimer();
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Reset state ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTakingLongTimer();
    setStep("form");
    setPhone("");
    setName("");
    setEmail("");
    setOtp("");
    setReqId("");
    setTimer(0);
    setPhoneError("");
    setVerifyError("");
    setTakingLong(false);
    setAdminBlocked(false);
    isVerifyingRef.current = false;
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const switchMode = (m: Mode) => { reset(); setMode(m); };

  // ── Cancel ongoing verification ────────────────────────────────────────────
  const handleCancelVerification = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTakingLongTimer();
    setLoading(false);
    setTakingLong(false);
    isVerifyingRef.current = false;
    setVerifyError("Verification cancelled. Please enter the OTP again or click Resend.");
    toast("Verification stopped. You can retry.", { icon: "ℹ️", id: "verify-cancelled" });
  }, []);

  // ── Phone validation helper ─────────────────────────────────────────────────
  const validatePhone = (value: string): boolean => {
    if (value.trim().length === 0) {
      setPhoneError("Mobile number is required");
      return false;
    }
    if (value.trim().length !== 10) {
      setPhoneError("Mobile number must be exactly 10 digits");
      return false;
    }
    if (!/^[6-9][0-9]{9}$/.test(value.trim())) {
      setPhoneError("Enter a valid Indian mobile number (starts with 6–9)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    // Clear error live once user has a valid 10-digit number
    if (phoneError) {
      if (digits.length === 10 && /^[6-9][0-9]{9}$/.test(digits)) {
        setPhoneError("");
      } else if (digits.length < 10) {
        setPhoneError("");
      }
    }
  };

  // ── MSG91 browser call with timeout protection ──────────────────────────────
  const callMsg91 = async (
    endpoint: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    timeoutMs = 15000,
  ) => {
    const config = await fetchMsg91Config();
    const internalController = new AbortController();
    const timerId = setTimeout(() => {
      internalController.abort();
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timerId);
        return { type: "error", message: "Request cancelled." };
      }
      signal.addEventListener("abort", () => internalController.abort(), { once: true });
    }

    try {
      const r = await fetch(`https://control.msg91.com/api/v5/widget/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAuth: config.tokenAuth, widgetId: config.widgetId, ...body }),
        signal: internalController.signal,
      });
      clearTimeout(timerId);
      const text = await r.text();
      try {
        return JSON.parse(text) as { type: string; message?: string; [k: string]: unknown };
      } catch {
        return { type: "error", message: text };
      }
    } catch (err: unknown) {
      clearTimeout(timerId);
      const e = err as Error;
      if (e?.name === "AbortError" || internalController.signal.aborted || signal?.aborted) {
        return {
          type: "error",
          message: "Verification timed out due to slow network. Please try again or request a new OTP.",
        };
      }
      return { type: "error", message: e?.message || "Network error. Please try again." };
    }
  };

  // ── Step 1: Validate form + send OTP ──────────────────────────────────────
  const handleSendOtp = async () => {
    if (!validatePhone(phone)) return;
    if (mode === "register") {
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Enter your full name (at least 2 characters)", { id: "name-invalid" });
        return;
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast.error("Enter a valid email address", { id: "email-invalid" });
        return;
      }
    }
    try {
      setLoading(true);

      // For sign-in: verify the phone exists in the DB BEFORE wasting an OTP
      if (mode === "sign-in") {
        try {
          await api.post("/auth/mobile/check-phone", { phone: phone.trim() }, { timeout: 12000 });
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string; code?: string } } };
          const code = e?.response?.data?.code;
          if (code === "ADMIN_ROLE") {
            // Admin/superadmin accounts must use the Admin Portal — block silently
            setAdminBlocked(true);
          } else if (code === "NO_ACCOUNT") {
            toast.error("No account found with this number. Please create an account.", {
              id: "no-account",
              duration: 4000,
            });
            const savedPhone = phone;
            reset();
            setMode("register");
            setPhone(savedPhone);
          } else {
            toast.error(e?.response?.data?.message ?? "Could not verify number. Try again.", { id: "check-fail" });
          }
          return;
        }
      }

      const data = await callMsg91("sendOtp", { identifier: `91${phone.trim()}` }, undefined, 15000);
      if (data.type !== "success") {
        toast.error(data.message ?? "Failed to send OTP", { id: "otp-fail" });
        return;
      }
      // MSG91 sendOtp returns the reqId in data.message
      setReqId((data.message ?? "") as string);
      toast.success("OTP sent to your mobile!", { id: "otp-sent" });
      setOtp("");
      setVerifyError("");
      setStep("otp");
      setTimer(120); // 2 minutes resend cooldown
    } catch {
      toast.error("Failed to send OTP. Check your connection.", { id: "otp-fail" });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP → call backend login or register ───────────────────
  const handleVerifyOtp = async (customOtp?: string) => {
    const targetOtp = (customOtp ?? otp).trim();
    if (targetOtp.length !== 4) {
      toast.error("Enter the complete 4-digit OTP", { id: "otp-incomplete" });
      return;
    }

    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    // Cancel prior pending verification if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setVerifyError("");
    setLoading(true);
    setTakingLong(false);

    // If verification takes longer than 4.5s, surface helpful feedback + cancel option
    clearTakingLongTimer();
    takingLongTimerRef.current = setTimeout(() => {
      setTakingLong(true);
    }, 4500);

    try {
      // Browser verifies OTP with MSG91 → gets JWT access token (15s timeout)
      const verifyData = await callMsg91("verifyOtp", { reqId, otp: targetOtp }, controller.signal, 15000);
      
      if (controller.signal.aborted) return;

      if (verifyData.type !== "success") {
        const errorMsg = verifyData.message ?? "Invalid or expired OTP";
        setVerifyError(errorMsg);
        toast.error(errorMsg, { id: "otp-verify-fail" });
        return;
      }
      const accessToken = (verifyData.message ?? "") as string;
      if (!accessToken) {
        const missingTokenMsg = "Verification token missing. Please request a new OTP.";
        setVerifyError(missingTokenMsg);
        toast.error(missingTokenMsg, { id: "otp-no-token" });
        return;
      }

      if (mode === "sign-in") {
        const res = await api.post(
          "/auth/mobile/login",
          { phone: phone.trim(), accessToken },
          { signal: controller.signal, timeout: 15000 }
        );
        toast.success(res.data.message ?? "Welcome back!", { id: "login-ok" });
        await checkAuthStatus();
        handleClose();
      } else {
        const res = await api.post(
          "/auth/mobile/register",
          {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim(),
            accessToken,
          },
          { signal: controller.signal, timeout: 15000 }
        );
        toast.success(res.data.message ?? "Account created! Welcome.", { id: "register-ok" });
        await checkAuthStatus();
        handleClose();
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
        code?: string;
        message?: string;
      };
      const msg = e?.response?.data?.message;
      const code = e?.response?.data?.code;

      if (code === "NO_ACCOUNT") {
        const savedPhone = phone;
        toast.error("No account found. Please create an account.", { id: "no-account", duration: 4000 });
        reset();
        setMode("register");
        setPhone(savedPhone);
      } else if (code === "DUPLICATE") {
        toast.error("Account already exists. Please sign in instead.", { id: "duplicate", duration: 4000 });
        const savedPhone = phone;
        reset();
        setMode("sign-in");
        setPhone(savedPhone);
      } else if (e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        const timeoutMsg = "Verification timed out. Please check your connection and try again.";
        setVerifyError(timeoutMsg);
        toast.error(timeoutMsg, { id: "otp-verify-timeout" });
      } else {
        const fallbackMsg = msg ?? "Something went wrong. Please try again.";
        setVerifyError(fallbackMsg);
        toast.error(fallbackMsg, { id: "otp-verify-fail" });
      }
    } finally {
      clearTakingLongTimer();
      setTakingLong(false);
      setLoading(false);
      isVerifyingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (timer > 0) return;
    try {
      setLoading(true);
      setVerifyError("");
      const data = await callMsg91("retryOtp", { reqId }, undefined, 10000);
      if (data.type !== "success") {
        toast.error(data.message ?? "Failed to resend OTP", { id: "resend-fail" });
        return;
      }
      if (data.message) setReqId(data.message as string);
      toast.success("OTP resent!", { id: "otp-resent" });
      setOtp("");
      setTimer(120); // 2 minutes resend cooldown
    } catch {
      toast.error("Failed to resend OTP.", { id: "resend-fail" });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle OTP input change with auto-submit ──────────────────────────────
  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setOtp(digits);
    if (verifyError) setVerifyError("");

    // Auto-verify when all 4 digits are completed
    if (digits.length === 4 && !loading && !isVerifyingRef.current) {
      setTimeout(() => {
        handleVerifyOtp(digits);
      }, 50);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const title = step === "otp"
    ? "Verify OTP"
    : mode === "sign-in" ? "Sign In" : "Create Account";

  const subtitle = step === "otp"
    ? `Enter the 4-digit code sent to +91 ${phone}`
    : mode === "sign-in"
      ? "Enter your registered mobile number to proceed"
      : "Sign up with your details to start shopping";

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-[100]">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" />

      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
        <DialogPanel className="w-full max-w-[620px] bg-white rounded-[26px] shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col sm:flex-row items-stretch min-h-[300px]">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 text-slate-400 hover:text-slate-600 transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2.2} />
          </button>

          {/* Left Column: Branding Logo & Name */}
          <div className="w-full sm:w-[210px] md:w-[230px] bg-[#f8faff] flex flex-col items-center justify-center p-6 sm:p-7 text-center select-none sm:border-r border-slate-100 shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-white ring-2 ring-[#eedc9e] shadow-xs flex items-center justify-center overflow-hidden">
              <img
                src={logoSrc}
                alt={companyDisplayName}
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = logo123;
                }}
              />
            </div>
            <h3 className="mt-4 font-serif font-bold text-slate-800 text-base sm:text-lg leading-tight px-2">
              {companyDisplayName}
            </h3>
          </div>

          {/* Right Column: Auth Content */}
          <div className="flex-1 min-w-0 p-6 sm:p-7 md:p-8 flex flex-col justify-center bg-white relative">
            {/* ── Admin account blocked screen ──────────────────────────────── */}
            {adminBlocked ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-inner">
                  <ShieldExclamationIcon className="w-7 h-7 text-rose-500" strokeWidth={1.8} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Access Restricted</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                    This mobile number belongs to an administrative profile. Please log in through the{" "}
                    <span className="font-bold text-slate-900">Admin Portal</span>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAdminBlocked(false);
                    setPhone("");
                  }}
                  className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" strokeWidth={2.2} />
                  Try a different number
                </button>
              </div>
            ) : step === "form" ? (
              <div>
                {/* Tabs: SIGN IN | CREATE ACCOUNT */}
                <div className="flex items-center gap-6 mb-5">
                  <button
                    type="button"
                    onClick={() => switchMode("sign-in")}
                    className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer ${
                      mode === "sign-in"
                        ? "text-[#0c6b5e] border-b-2 border-[#0c6b5e]"
                        : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer ${
                      mode === "register"
                        ? "text-[#0c6b5e] border-b-2 border-[#0c6b5e]"
                        : "text-slate-400 hover:text-slate-600 border-b-2 border-transparent"
                    }`}
                  >
                    CREATE ACCOUNT
                  </button>
                </div>

                {/* SIGN IN Mode Form */}
                {mode === "sign-in" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-14 sm:w-16 h-12 flex items-center justify-center rounded-2xl border border-slate-300 text-slate-700 font-semibold text-sm bg-white shrink-0">
                          +91
                        </div>
                        <input
                          ref={phoneRef}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={() => phone.length > 0 && validatePhone(phone)}
                          placeholder="Enter Mobile Number"
                          className={`flex-1 min-w-0 h-12 px-4 rounded-2xl border transition-all text-sm outline-none bg-white text-slate-800 placeholder:text-slate-400 font-normal ${
                            phoneError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                              : "border-[#0c6b5e] focus:border-[#0c6b5e] focus:ring-1 focus:ring-[#0c6b5e]"
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendOtp();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5 pl-1 animate-fadeIn">
                          <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                          {phoneError}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full h-12 bg-[#0c6b5e] hover:bg-[#09574c] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 shadow-none mt-2"
                    >
                      {loading ? <ClipLoader color="white" size={18} /> : "Submit"}
                    </button>
                  </div>
                )}

                {/* CREATE ACCOUNT Mode Form */}
                {mode === "register" && (
                  <div className="space-y-3 sm:space-y-3.5">
                    {/* Full Name */}
                    <div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            emailRef.current?.focus();
                          }
                        }}
                        placeholder="Enter Full Name *"
                        className="w-full h-12 px-4 rounded-2xl border border-[#0c6b5e] focus:border-[#0c6b5e] focus:ring-1 focus:ring-[#0c6b5e] transition-all text-sm outline-none bg-white text-slate-800 placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            phoneRef.current?.focus();
                          }
                        }}
                        placeholder="Enter Email Address (optional)"
                        className="w-full h-12 px-4 rounded-2xl border border-slate-300 focus:border-[#0c6b5e] focus:ring-1 focus:ring-[#0c6b5e] transition-all text-sm outline-none bg-white text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Mobile Number */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-14 sm:w-16 h-12 flex items-center justify-center rounded-2xl border border-slate-300 text-slate-700 font-semibold text-sm bg-white shrink-0">
                          +91
                        </div>
                        <input
                          ref={phoneRef}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={() => phone.length > 0 && validatePhone(phone)}
                          placeholder="Enter Mobile Number"
                          className={`flex-1 min-w-0 h-12 px-4 rounded-2xl border transition-all text-sm outline-none bg-white text-slate-800 placeholder:text-slate-400 font-normal ${
                            phoneError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                              : "border-slate-300 focus:border-[#0c6b5e] focus:ring-1 focus:ring-[#0c6b5e]"
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendOtp();
                            }
                          }}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5 pl-1 animate-fadeIn">
                          <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                          {phoneError}
                        </p>
                      )}
                    </div>

                    {/* Submit button */}
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full h-12 bg-[#0c6b5e] hover:bg-[#09574c] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 shadow-none mt-1"
                    >
                      {loading ? <ClipLoader color="white" size={18} /> : "Submit"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Step 2: OTP Step ── */
              <div className="space-y-4">
                <div className="flex items-center gap-6 mb-2">
                  <span className="text-[#0c6b5e] font-bold text-xs uppercase tracking-wider pb-1 border-b-2 border-[#0c6b5e]">
                    VERIFY OTP
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  Enter the 4-digit code sent to +91 <span className="font-bold text-slate-800">{phone}</span>
                </p>

                <OtpInput
                  value={otp}
                  onChange={handleOtpChange}
                  numInputs={4}
                  shouldAutoFocus
                  renderInput={(props) => (
                    <input
                      {...props}
                      disabled={loading}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className={`${OTP_CLASS} ${loading ? "opacity-60 bg-slate-50 cursor-not-allowed" : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 4 && !loading) {
                          e.preventDefault();
                          handleVerifyOtp(otp);
                        }
                        if (props.onKeyDown) props.onKeyDown(e);
                      }}
                    />
                  )}
                  containerStyle={{ width: "100%", display: "flex", justifyContent: "center", gap: "10px" }}
                />

                {/* Inline error alert */}
                {verifyError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                    <ShieldExclamationIcon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="font-semibold leading-relaxed">{verifyError}</p>
                  </div>
                )}

                {/* Taking long warning */}
                {loading && takingLong && (
                  <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between gap-2 text-xs text-amber-900 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ClockIcon className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" strokeWidth={2} />
                      <span className="font-medium truncate text-[11px]">Taking longer than usual...</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelVerification}
                      className="font-bold text-amber-900 underline hover:text-amber-950 whitespace-nowrap cursor-pointer text-[11px]"
                    >
                      Cancel & Retry
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={loading || otp.length !== 4}
                    className="w-full h-12 bg-[#0c6b5e] hover:bg-[#09574c] active:scale-[0.99] text-white font-bold text-sm rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 shadow-none"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <ClipLoader color="white" size={16} />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Submit"
                    )}
                  </button>

                  {loading && (
                    <button
                      type="button"
                      onClick={handleCancelVerification}
                      className="w-full py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition text-center cursor-pointer"
                    >
                      Stop & Edit OTP
                    </button>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2 pt-1 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={timer > 0 || loading}
                      className="font-bold text-[#0c6b5e] hover:underline disabled:opacity-50 transition cursor-pointer inline-flex items-center gap-1"
                    >
                      {timer > 0 ? (
                        `Resend in ${formatTimer(timer)}`
                      ) : (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5 inline" strokeWidth={2.2} />
                          Resend OTP
                        </>
                      )}
                    </button>
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      handleCancelVerification();
                      setStep("form");
                      setOtp("");
                      setVerifyError("");
                    }}
                    disabled={loading}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {mode === "register" ? "Edit details" : "Change mobile number"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
