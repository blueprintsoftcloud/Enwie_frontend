// src/login/Login.tsx
// Pure presentational shell — all state/logic lives in useLoginFlow.
//
// Colors/fonts/radius come from the storefront theme system (utils/themes.ts,
// ThemeContext.tsx) via the --theme-* CSS custom properties ThemeProvider already
// injects onto <html> for the whole app — this page just reads them, same as any
// storefront component (`var(--theme-primary)` etc.), so it always matches whatever
// theme is currently selected in Homepage Manager instead of a hardcoded brand color.

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  BarChart3,
  Package,
  Users,
  Bell,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import OtpInput from "react-otp-input";

import logo from "../assets/logo.png";
import {
  useLoginFlow,
  type LoginStep,
  type LoginFlowState,
} from "./useLoginFlow";
import { useBranding } from "../context/BrandingContext";
import PageSeo from "../components/seo/PageSeo";

// ── Theme tokens (CSS custom properties set globally by ThemeProvider) ────────
const PRIMARY = "var(--theme-primary)";
const PRIMARY_HOVER = "var(--theme-primary-hover)";
const PRIMARY_INK = "var(--theme-primary-ink)";
const ACCENT = "var(--theme-accent)";
const RADIUS = "var(--theme-radius)";
const FONT_HEADING = "var(--theme-font-heading)";

// ── Shared atoms ──────────────────────────────────────────────────────────────

function ActionButton({
  label,
  loading,
  onClick,
  type = "submit",
  disabled,
  icon,
}: {
  label: string;
  loading: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%)`,
        borderRadius: RADIUS,
      }}
      className="w-full h-11 mt-4 font-bold text-sm text-white
                 active:scale-[0.99] shadow-sm transition-all duration-150 flex items-center justify-center gap-2
                 disabled:opacity-60 cursor-pointer hover:opacity-95"
    >
      {loading ? (
        <ClipLoader color="white" size={18} />
      ) : (
        <>
          {label}
          {icon ?? <ArrowRight className="w-4 h-4" />}
        </>
      )}
    </button>
  );
}

function TextInput({
  id,
  type = "text",
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  icon,
}: {
  id?: string;
  type?: string;
  name: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        id={id}
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{ borderRadius: RADIUS, colorScheme: "light" }}
        className={`border border-slate-200 bg-slate-50/70 py-2.5 text-sm w-full ${icon ? "pl-10 pr-4" : "px-4"}
                   text-slate-800 placeholder:text-slate-400
                   focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:bg-white
                   transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed`}
      />
    </div>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Lock className="w-4 h-4" />
      </span>
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        disabled={disabled}
        style={{ borderRadius: RADIUS, colorScheme: "light" }}
        className="border border-slate-200 bg-slate-50/70 pl-10 pr-10 py-2.5 text-sm w-full
                   text-slate-800 placeholder:text-slate-400
                   focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:bg-white
                   transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((p) => !p)}
        tabIndex={-1}
        disabled={disabled}
        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function OtpWidget({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <OtpInput
        value={value}
        onChange={onChange}
        numInputs={6}
        shouldAutoFocus
        renderInput={(props) => (
          <input
            {...props}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={disabled}
            style={{ borderRadius: RADIUS }}
            className="!w-10 sm:!w-11 !h-12 border border-slate-300 rounded-xl text-center text-xl font-bold
                       text-slate-900 bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]
                       transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        )}
        containerStyle={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "8px",
        }}
      />
    </div>
  );
}

function ResendControl({
  timer,
  formatTimer,
  onClick,
  loading,
}: {
  timer: number;
  formatTimer: (s: number) => string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <p className="text-xs text-slate-500 text-center">
      Didn't receive the code?{" "}
      <button
        type="button"
        onClick={onClick}
        disabled={timer > 0 || loading}
        style={{ color: PRIMARY }}
        className="ml-1 font-bold hover:underline disabled:opacity-50 disabled:no-underline transition-opacity cursor-pointer"
      >
        {timer > 0 ? `Resend in ${formatTimer(timer)}` : "Resend OTP"}
      </button>
    </p>
  );
}

function BackButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 self-center mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Step progress dots — only shown where the step genuinely belongs to a
// multi-step sequence, so it encodes real position, not decoration. ─────────────

const LOGIN_SEQUENCE: LoginStep[] = ["credentials", "otp"];
const RESET_SEQUENCE: LoginStep[] = ["forgot-email", "forgot-otp", "forgot-reset"];

function StepProgress({ step }: { step: LoginStep }) {
  const sequence = RESET_SEQUENCE.includes(step) ? RESET_SEQUENCE : LOGIN_SEQUENCE;
  const currentIndex = sequence.indexOf(step);
  if (currentIndex === -1 || step === "credentials") return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-3" aria-hidden="true">
      {sequence.map((s, i) => (
        <span
          key={s}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === currentIndex ? "20px" : "6px",
            background: i <= currentIndex ? PRIMARY : "#e2e8f0",
          }}
        />
      ))}
    </div>
  );
}

// ── Step views ────────────────────────────────────────────────────────────────

function CredentialsForm({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleLoginSubmit();
      }}
      className="flex flex-col gap-4 mt-2"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="text-[10px] font-bold text-slate-600 uppercase tracking-wider"
        >
          Email address
        </label>
        <TextInput
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={flow.email}
          onChange={(v) => flow.setEmail(v.toLowerCase())}
          placeholder="name@example.com"
          required
          disabled={flow.loading}
          icon={<Mail className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="text-[10px] font-bold text-slate-600 uppercase tracking-wider"
          >
            Password
          </label>
          <button
            type="button"
            className="text-xs font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ color: PRIMARY }}
            onClick={() => flow.setStep("forgot-email")}
            disabled={flow.loading}
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          value={flow.password}
          onChange={flow.setPassword}
          placeholder="Enter your password"
          disabled={flow.loading}
        />
      </div>

      <ActionButton label="Sign In" loading={flow.loading} />
    </form>
  );
}

function LoginOtpPanel({ flow }: { flow: LoginFlowState }) {
  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    flow.setOtp(digits);
    if (digits.length === 6 && !flow.loading) {
      setTimeout(() => flow.handleVerifyOtp(digits), 50);
    }
  };

  return (
    <div
      className="flex flex-col w-full gap-5 mt-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !flow.loading && flow.otp.length === 6) flow.handleVerifyOtp();
      }}
    >
      <OtpWidget value={flow.otp} onChange={handleOtpChange} disabled={flow.loading} />
      <div className="flex flex-col gap-4">
        <ActionButton
          type="button"
          label="Verify & Sign In"
          loading={flow.loading}
          onClick={() => flow.handleVerifyOtp()}
        />
        <ResendControl
          timer={flow.timer}
          formatTimer={flow.formatTimer}
          onClick={flow.handleResendOtp}
          loading={flow.loading}
        />
        <BackButton
          label="Back to sign in"
          disabled={flow.loading}
          onClick={() => {
            flow.setStep("credentials");
            flow.setOtp("");
          }}
        />
      </div>
    </div>
  );
}

function ForgotEmailPanel({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleForgotSubmit();
      }}
      className="flex flex-col gap-4 mt-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reset-email"
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
        >
          Registered email address
        </label>
        <TextInput
          id="reset-email"
          type="email"
          name="email"
          autoComplete="email"
          value={flow.resetEmail}
          onChange={(v) => flow.setResetEmail(v.toLowerCase())}
          placeholder="name@example.com"
          required
          disabled={flow.loading}
          icon={<Mail className="w-4 h-4" />}
        />
      </div>
      <ActionButton label="Send OTP" loading={flow.loading} />
      <BackButton
        label="Back to sign in"
        disabled={flow.loading}
        onClick={() => flow.setStep("credentials")}
      />
    </form>
  );
}

function ForgotOtpPanel({ flow }: { flow: LoginFlowState }) {
  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    flow.setOtp(digits);
    if (digits.length === 6 && !flow.loading) {
      setTimeout(() => flow.handleVerifyResetOtp(digits), 50);
    }
  };

  return (
    <div
      className="flex flex-col w-full gap-5 mt-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !flow.loading && flow.otp.length === 6) flow.handleVerifyResetOtp();
      }}
    >
      <OtpWidget value={flow.otp} onChange={handleOtpChange} disabled={flow.loading} />
      <div className="flex flex-col gap-4">
        <ActionButton
          type="button"
          label="Verify OTP"
          loading={flow.loading}
          onClick={() => flow.handleVerifyResetOtp()}
        />
        <ResendControl
          timer={flow.timer}
          formatTimer={flow.formatTimer}
          onClick={flow.handleResendResetOtp}
          loading={flow.loading}
        />
        <BackButton
          label="Back"
          disabled={flow.loading}
          onClick={() => {
            flow.setStep("forgot-email");
            flow.setOtp("");
          }}
        />
      </div>
    </div>
  );
}

function ResetPasswordPanel({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleResetPassword();
      }}
      className="flex flex-col gap-4 mt-6"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="new-password"
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
        >
          New password
        </label>
        <PasswordInput
          id="new-password"
          name="new-password"
          autoComplete="new-password"
          value={flow.newPassword}
          onChange={flow.setNewPassword}
          placeholder="Minimum 8 characters"
          disabled={flow.loading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirm-password"
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
        >
          Confirm password
        </label>
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          value={flow.confirmPassword}
          onChange={flow.setConfirmPassword}
          placeholder="Repeat your password"
          disabled={flow.loading}
        />
      </div>
      <ActionButton label="Reset Password" loading={flow.loading} icon={<KeyRound className="w-4 h-4" />} />
    </form>
  );
}

// ── Step metadata ─────────────────────────────────────────────────────────────

const STEP_TITLE: Record<LoginStep, string> = {
  credentials: "Welcome Back",
  otp: "Verify your identity",
  "forgot-email": "Reset your password",
  "forgot-otp": "Check your inbox",
  "forgot-reset": "Set a new password",
};

const STEP_ICON: Partial<Record<LoginStep, React.ReactNode>> = {
  otp: <ShieldCheck className="w-6 h-6" style={{ color: PRIMARY }} />,
  "forgot-otp": <ShieldCheck className="w-6 h-6" style={{ color: PRIMARY }} />,
};

function StepSubtitle({
  step,
  email,
  resetEmail,
}: {
  step: LoginStep;
  email: string;
  resetEmail: string;
}) {
  const map: Record<LoginStep, React.ReactNode> = {
    credentials: "Sign in to manage your account, orders and store portal",
    otp: <>We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span></>,
    "forgot-email": "Enter your email and we'll send a reset code",
    "forgot-otp": <>Enter the code sent to <span className="font-semibold text-slate-700">{resetEmail}</span></>,
    "forgot-reset": "Choose a strong password for your account",
  };
  return <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed max-w-xs mx-auto">{map[step]}</p>;
}

// ── Decorative left panel ────────────────────────────────────────────────────

const FEATURES = [
  {
    title: "Real-time Analytics",
    desc: "Live tracking, revenue trends & performance metrics.",
    Icon: BarChart3,
  },
  {
    title: "Order Management",
    desc: "Process, dispatch, and fulfill store orders efficiently.",
    Icon: Package,
  },
  {
    title: "Customer Insights",
    desc: "Understand buyer behavior, loyalty, and purchase history.",
    Icon: Users,
  },
  {
    title: "Inventory Alerts",
    desc: "Automated stock monitoring and low inventory updates.",
    Icon: Bell,
  },
];

function LeftPanel({
  companyName,
  companyTagline,
  logoSrc,
}: {
  companyName: string;
  companyTagline: string;
  logoSrc: string;
}) {
  const name = companyName || "Store";
  const tagline = companyTagline || "Admin Portal";
  const displayLogo = logoSrc || logo;

  return (
    <div
      className="hidden lg:flex w-[48%] xl:w-[50%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden select-none"
      style={{
        background: `linear-gradient(145deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%)`,
      }}
    >
      {/* Texture overlays */}
      <div
        className="absolute bottom-0 -left-20 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${PRIMARY_INK}, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`,
        }}
      />

      {/* Top Brand Pill Card */}
      <div className="z-10">
        <div
          className="inline-flex items-center gap-3 bg-white px-4 py-2 shadow-md border border-slate-100"
          style={{ borderRadius: `calc(${RADIUS} + 6px)` }}
        >
          <div
            className="w-8 h-8 rounded-full p-0.5 bg-white flex items-center justify-center shrink-0 overflow-hidden"
            style={{ border: `1px solid color-mix(in srgb, ${ACCENT} 45%, #e2e8f0)` }}
          >
            <img src={displayLogo} alt={name} className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs tracking-tight text-slate-900 leading-tight">
              {name}
            </span>
            <span
              className="text-[8px] font-bold tracking-widest uppercase leading-none mt-0.5"
              style={{ color: PRIMARY }}
            >
              {tagline}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Headline & Description */}
      <div className="max-w-xl my-auto py-8 z-10">
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
          style={{ color: ACCENT }}
        >
          Admin Portal
        </p>
        <h1
          className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight"
          style={{ color: PRIMARY_INK, fontFamily: FONT_HEADING }}
        >
          {name}
        </h1>
        <p
          className="mt-4 text-sm xl:text-base leading-relaxed font-normal"
          style={{ color: "color-mix(in srgb, var(--theme-primary-ink) 78%, transparent)" }}
        >
          Manage your store, track orders, and grow your business all from one place.
        </p>
      </div>

      {/* Bottom 4 Feature Cards (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-3.5 w-full z-10">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="p-3.5 backdrop-blur-md"
            style={{
              borderRadius: RADIUS,
              border: "1px solid color-mix(in srgb, var(--theme-primary-ink) 14%, transparent)",
              background: "color-mix(in srgb, var(--theme-primary-ink) 8%, transparent)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <f.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
              <h4 className="font-bold text-xs" style={{ color: PRIMARY_INK }}>
                {f.title}
              </h4>
            </div>
            <p
              className="text-[11px] leading-snug"
              style={{ color: "color-mix(in srgb, var(--theme-primary-ink) 72%, transparent)" }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function Login() {
  const flow = useLoginFlow();
  const { branding } = useBranding();

  if (flow.isInitialLoad) return null;

  const logoSrc = branding.companyLogo || "";
  const displayLogo = logoSrc || logo;
  const companyDisplayName = branding.companyName?.trim() || "Admin Portal";

  return (
    <div className="flex min-h-screen bg-slate-50/60 overflow-x-hidden">
      <PageSeo title="Admin Login" path="/login" noIndex />

      {/* ── Left decorative panel ── */}
      <LeftPanel
        companyName={branding.companyName}
        companyTagline={branding.companyTagline}
        logoSrc={logoSrc}
      />

      {/* ── Right form panel ── */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 relative min-h-screen">
        {/* Top bar: Back to Store button */}
        <div className="w-full flex justify-start">
          <Link
            to="/"
            style={{ borderRadius: RADIUS }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            Back to Store
          </Link>
        </div>

        {/* Center Card */}
        <div className="w-full flex items-center justify-center my-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={flow.step}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ borderRadius: `calc(${RADIUS} + 12px)` }}
              className="w-full max-w-[420px] bg-white shadow-xl shadow-slate-200/70 border border-slate-100 p-8 sm:p-10 relative overflow-hidden"
            >
              {/* Logo Badge in rounded container */}
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-14 h-14 border border-slate-200/90 bg-white p-2 shadow-xs flex items-center justify-center overflow-hidden mb-3"
                  style={{ borderRadius: RADIUS }}
                >
                  <div
                    className="w-full h-full rounded-full p-0.5 flex items-center justify-center"
                    style={{ border: `1px solid color-mix(in srgb, ${ACCENT} 40%, #e2e8f0)` }}
                  >
                    <img
                      src={displayLogo}
                      alt={companyDisplayName}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                  {companyDisplayName}
                </span>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-center mt-2 tracking-tight"
                  style={{ color: PRIMARY, fontFamily: FONT_HEADING }}
                >
                  {STEP_TITLE[flow.step]}
                </h1>
                <StepSubtitle
                  step={flow.step}
                  email={flow.email}
                  resetEmail={flow.resetEmail}
                />
                <StepProgress step={flow.step} />
              </div>

              {/* Step content */}
              {flow.step === "credentials" && <CredentialsForm flow={flow} />}
              {flow.step === "otp" && <LoginOtpPanel flow={flow} />}
              {flow.step === "forgot-email" && <ForgotEmailPanel flow={flow} />}
              {flow.step === "forgot-otp" && <ForgotOtpPanel flow={flow} />}
              {flow.step === "forgot-reset" && (
                <ResetPasswordPanel flow={flow} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom copyright */}
        <p className="text-[11px] text-slate-400 text-center py-2 select-none">
          © {new Date().getFullYear()} {companyDisplayName}. All rights reserved.
        </p>
      </main>
    </div>
  );
}
