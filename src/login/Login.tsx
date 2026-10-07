// src/login/Login.tsx
// Pure presentational shell — all state/logic lives in useLoginFlow.
//
// Colors/fonts/radius come from the storefront theme system (utils/themes.ts,
// ThemeContext.tsx) via the --theme-* CSS custom properties ThemeProvider already
// injects onto <html> for the whole app — this page just reads them, same as any
// storefront component (`var(--theme-primary)` etc.), so it always matches whatever
// theme is currently selected in Homepage Manager instead of a hardcoded brand color.

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowLeft, ArrowRight, KeyRound, BarChart3, Package, Users, Bell } from "lucide-react";
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
      className="group w-full h-[50px] mt-1 font-semibold text-sm
                 shadow-lg shadow-black/15 transition-all duration-200 flex items-center justify-center gap-2
                 hover:brightness-110 hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]
                 disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100 cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%)`,
        color: PRIMARY_INK,
        borderRadius: RADIUS,
      }}
    >
      {loading ? (
        <ClipLoader color="currentColor" size={18} />
      ) : (
        <>
          {label}
          {icon ?? <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
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
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
        style={{ borderRadius: RADIUS }}
        className={`border border-gray-200 bg-gray-50 py-3 text-sm w-full ${icon ? "pl-11 pr-4" : "px-4"}
                   text-gray-800 placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent focus:bg-white
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
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
        style={{ borderRadius: RADIUS }}
        className="border border-gray-200 bg-gray-50 pl-11 pr-11 py-3 text-sm w-full
                   text-gray-800 placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-transparent focus:bg-white
                   transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((p) => !p)}
        tabIndex={-1}
        disabled={disabled}
        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="!w-11 sm:!w-12 !h-13 border-2 border-gray-200 text-center text-xl font-bold
                       text-gray-900 bg-gray-50 focus:outline-none focus:border-[var(--theme-primary-hover)] focus:bg-white
                       focus:ring-[var(--theme-accent)]/25 focus:ring-4 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
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
    <p className="text-sm text-gray-500 text-center">
      Didn't receive the code?{" "}
      <button
        type="button"
        onClick={onClick}
        disabled={timer > 0 || loading}
        className="ml-1 font-semibold underline decoration-2 underline-offset-2 disabled:opacity-50 disabled:no-underline transition-opacity"
        style={{ color: PRIMARY, textDecorationColor: ACCENT }}
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
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 self-center mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-4" aria-hidden="true">
      {sequence.map((s, i) => (
        <span
          key={s}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === currentIndex ? "20px" : "6px",
            background: i <= currentIndex ? PRIMARY : "#e5e7eb",
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
      className="flex flex-col gap-4 mt-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
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
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Password
          </label>
          <button
            type="button"
            className="text-xs font-semibold transition-colors hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
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
          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
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
          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
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
  credentials: "Welcome back",
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
    credentials: "Sign in to continue to your dashboard",
    otp: <>We sent a 6-digit code to <span className="font-semibold text-gray-600">{email}</span></>,
    "forgot-email": "Enter your email and we'll send a reset code",
    "forgot-otp": <>Enter the code sent to <span className="font-semibold text-gray-600">{resetEmail}</span></>,
    "forgot-reset": "Choose a strong password for your account",
  };
  return <p className="text-sm text-gray-400 text-center mt-1.5 leading-relaxed">{map[step]}</p>;
}

// ── Decorative left panel ────────────────────────────────────────────────────

const FEATURES = [
  { label: "Real-time analytics", Icon: BarChart3 },
  { label: "Order management", Icon: Package },
  { label: "Customer insights", Icon: Users },
  { label: "Inventory alerts", Icon: Bell },
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
  const tagline =
    companyTagline || "Welcome to our store";

  return (
    <div
      className="hidden lg:flex w-[52%] relative flex-col items-start justify-between p-12 overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${PRIMARY} 0%, ${PRIMARY_HOVER} 100%)`,
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${PRIMARY_INK} 0px, ${PRIMARY_INK} 1px, transparent 1px, transparent 64px)`,
        }}
      />

      {/* Decorative blurred circles */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 animate-pulse"
        style={{
          background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`,
          animationDuration: "6s",
        }}
      />
      <div
        className="absolute bottom-0 -left-20 w-80 h-80 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, ${PRIMARY_INK}, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`,
        }}
      />

      {/* Top: logo + name */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 z-10"
      >
        <div
          className="w-11 h-11 rounded-2xl backdrop-blur flex items-center justify-center shadow-lg"
          style={{ background: "color-mix(in srgb, var(--theme-primary-ink) 10%, transparent)", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={name} className="w-7 h-7 object-contain" />
          ) : (
            <img src={logo} alt={name} className="w-7 h-7 object-contain" />
          )}
        </div>
        <span className="font-bold text-lg tracking-tight" style={{ color: PRIMARY_INK }}>
          {name}
        </span>
      </motion.div>

      {/* Middle: tagline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="z-10 max-w-sm"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2"
          style={{ color: ACCENT }}
        >
          <span className="h-px w-6" style={{ background: ACCENT }} />
          Admin Portal
        </p>
        <h2
          className="text-4xl font-extrabold leading-tight text-balance"
          style={{ color: PRIMARY_INK, fontFamily: FONT_HEADING }}
        >
          {tagline}
        </h2>
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--theme-primary-ink) 50%, transparent)" }}
        >
          Manage your store, track orders, and grow your business — all from one
          place.
        </p>
      </motion.div>

      {/* Bottom: capability list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="z-10 grid grid-cols-2 gap-2.5 w-full max-w-sm"
      >
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-2 px-3 py-2.5 backdrop-blur-sm"
            style={{
              borderRadius: RADIUS,
              border: "1px solid color-mix(in srgb, var(--theme-primary-ink) 12%, transparent)",
              background: "color-mix(in srgb, var(--theme-primary-ink) 6%, transparent)",
            }}
          >
            <f.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--theme-accent)" }} />
            <span
              className="text-xs font-medium"
              style={{ color: "color-mix(in srgb, var(--theme-primary-ink) 78%, transparent)" }}
            >
              {f.label}
            </span>
          </div>
        ))}
      </motion.div>
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
  const stepIcon = STEP_ICON[flow.step];

  return (
    <div className="flex min-h-screen bg-[#f4f6f3] overflow-hidden">
      <PageSeo title="Admin Login" path="/login" noIndex />
      {/* ── Left decorative panel ── */}
      <LeftPanel
        companyName={branding.companyName}
        companyTagline={branding.companyTagline}
        logoSrc={logoSrc}
      />

      {/* ── Right form panel ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Subtle background tints */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 20%, color-mix(in srgb, ${ACCENT} 30%, transparent) 0%, transparent 50%),
                              radial-gradient(circle at 10% 80%, color-mix(in srgb, ${PRIMARY} 15%, transparent) 0%, transparent 40%)`,
          }}
        />

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8 z-10">
          <img
            src={displayLogo}
            alt={branding.companyName || "Logo"}
            className="w-9 h-9 object-contain"
          />
          {branding.companyName && (
            <span className="font-bold text-gray-800 text-lg">
              {branding.companyName}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={flow.step}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ borderRadius: `calc(${RADIUS} + 8px)` }}
            className="relative z-10 bg-white shadow-xl shadow-gray-200/80 w-full max-w-[400px] p-8 sm:p-9 border border-gray-100 overflow-hidden"
          >
            {/* Top accent hairline */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }}
            />

            {/* Logo + brand name inside card */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-16 h-16 flex items-center justify-center mb-3 shadow-md relative"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${PRIMARY} 18%, white) 0%, color-mix(in srgb, ${ACCENT} 40%, white) 100%)`,
                  borderRadius: RADIUS,
                }}
              >
                {stepIcon ? (
                  stepIcon
                ) : (
                  <img
                    src={displayLogo}
                    alt={branding.companyName || "Logo"}
                    className="w-10 h-10 object-contain"
                  />
                )}
              </div>
              {branding.companyName && (
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                  {branding.companyName}
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              className="text-2xl font-extrabold text-center text-balance"
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

            {/* Divider */}
            <div className="mt-5 mb-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

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

        <p className="mt-6 text-xs text-gray-400 z-10">
          © {new Date().getFullYear()}{" "}
          {branding.companyName || "Store"}. All rights reserved.
        </p>
      </main>
    </div>
  );
}
