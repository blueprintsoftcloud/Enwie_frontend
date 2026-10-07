// src/login/useLoginFlow.ts
// Encapsulates all login/OTP/forgot-password state and async handlers.
// The Login component is kept as a pure presentational shell.

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

// ── Step type ─────────────────────────────────────────────────────────────────
export type LoginStep =
  | "credentials" // email + password form
  | "otp" // OTP verification after login
  | "forgot-email" // enter registered email to reset password
  | "forgot-otp" // OTP verification for password reset
  | "forgot-reset"; // enter + confirm new password

// ── Error helper (removes all `any` casts from handlers) ─────────────────────
interface ApiError {
  response?: { data?: { message?: string } };
}
function getErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.message ?? fallback;
}

// ── Email validator ───────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLoginFlow() {
  const navigate = useNavigate();
  const { user, checkAuthStatus } = useAuth();

  // ── UI step ──────────────────────────────────────────────────────
  const [step, setStep] = useState<LoginStep>("credentials");
  const [loading, setLoading] = useState(false);

  // ── Credentials ───────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── OTP (shared for login-OTP and forgot-OTP steps) ───────────────
  const [otp, setOtp] = useState("");

  // ── Forgot-password fields ────────────────────────────────────────
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Resend countdown (seconds) ────────────────────────────────────
  const [timer, setTimer] = useState(0);

  // ── Redirect once the user is authenticated ───────────────────────
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current || user.isInitialLoad || !user.isAuthenticated)
      return;
    redirectedRef.current = true;

    const role = user.role?.toUpperCase() ?? "";
    navigate(
      role === "STAFF"
        ? "/staff-dashboard"
        : role === "SUPER_ADMIN"
          ? "/super-admin-dashboard"
          : role === "ADMIN"
            ? "/admin-dashboard"
            : "/",
      { replace: true },
    );
  }, [user, navigate]);

  // ── Timer countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // ── Helpers ───────────────────────────────────────────────────────
  const startTimer = () => setTimer(120); // 2 minutes resend cooldown
  const clearOtp = () => setOtp("");

  /** Format seconds as MM:SS */
  const formatTimer = (s: number): string =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Step 1 — submit credentials, get OTP ─────────────────────────
  const handleLoginSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password", { id: "validation" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast.error("Please enter a valid email address", { id: "email-format" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post<{ step: string }>("/auth/login", {
        email,
        password,
      });

      if (res.data.step === "VERIFY_OTP") {
        toast.success("OTP sent to your email", { id: "otp-sent" });
        clearOtp();
        setStep("otp");
        startTimer();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Login failed"), { id: "login-failed" });
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  // ── Step 2 — verify login OTP ─────────────────────────────────────
  const handleVerifyOtp = useCallback(async (customOtp?: string) => {
    const targetOtp = (customOtp ?? otp).trim();
    if (targetOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit code", {
        id: "otp-incomplete",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post<{ message: string; role?: string }>(
        "/auth/login/verify",
        { email, otp: targetOtp },
        { timeout: 15000 }
      );
      toast.success("Login successful!", { id: "login-success" });

      // checkAuthStatus updates the AuthContext with the new session
      await checkAuthStatus();

      // Immediately redirect to the matching dashboard without waiting for effect cycle
      const role = (res.data?.role || user.role || "").toUpperCase();
      redirectedRef.current = true;
      navigate(
        role === "STAFF"
          ? "/staff-dashboard"
          : role === "SUPER_ADMIN"
            ? "/super-admin-dashboard"
            : role === "ADMIN"
              ? "/admin-dashboard"
              : "/",
        { replace: true },
      );
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; response?: { status?: number; data?: { message?: string } } };
      const status = e?.response?.status;
      if (status === 403) {
        toast.error(
          "No active subscription found. Please contact your administrator to proceed.",
          { id: "otp-no-subscription", duration: 6000 },
        );
      } else if (e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        toast.error("Verification timed out. Please check your connection and try again.", {
          id: "otp-timeout",
        });
      } else {
        toast.error(getErrorMessage(err, "OTP verification failed"), {
          id: "otp-failed",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [email, otp, checkAuthStatus, navigate, user.role]);

  // ── Resend OTP (login flow) ───────────────────────────────────────
  const handleResendOtp = useCallback(async () => {
    if (timer > 0) return;

    try {
      setLoading(true);
      await api.post("/auth/resend-otp", { email }, { timeout: 15000 });
      toast.success("OTP resent to your email", { id: "otp-resent" });
      clearOtp();
      startTimer();
    } catch (err) {
      toast.error(getErrorMessage(err, "Resend failed"), {
        id: "otp-resend-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [email, timer]);

  // ── Forgot step 1 — send reset OTP ───────────────────────────────
  const handleForgotSubmit = useCallback(async () => {
    if (!resetEmail.trim() || !EMAIL_RE.test(resetEmail)) {
      toast.error("Please enter a valid email address", {
        id: "forgot-email-invalid",
      });
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email: resetEmail }, { timeout: 15000 });
      toast.success("OTP sent to your email", { id: "forgot-otp-sent" });
      clearOtp();
      setStep("forgot-otp");
      startTimer();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send OTP"), {
        id: "forgot-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [resetEmail]);

  // ── Forgot step 2 — verify reset OTP ─────────────────────────────
  const handleVerifyResetOtp = useCallback(async (customOtp?: string) => {
    const targetOtp = (customOtp ?? otp).trim();
    if (targetOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit code", {
        id: "reset-otp-incomplete",
      });
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/verify-reset-otp", { email: resetEmail, otp: targetOtp }, { timeout: 15000 });
      toast.success("OTP verified — set your new password", {
        id: "reset-otp-verified",
      });
      setStep("forgot-reset");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        toast.error("Verification timed out. Please check your connection and try again.", {
          id: "reset-otp-timeout",
        });
      } else {
        toast.error(getErrorMessage(err, "Invalid or expired OTP"), {
          id: "reset-otp-fail",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [resetEmail, otp]);

  // ── Resend OTP (forgot-password flow) ────────────────────────────
  const handleResendResetOtp = useCallback(async () => {
    if (timer > 0) return;

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email: resetEmail });
      toast.success("OTP resent to your email", { id: "reset-resent" });
      clearOtp();
      startTimer();
    } catch (err) {
      toast.error(getErrorMessage(err, "Resend failed"), {
        id: "reset-resend-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [resetEmail, timer]);

  // ── Forgot step 3 — save new password ────────────────────────────
  const handleResetPassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields", { id: "reset-empty" });
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters", {
        id: "reset-length",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", { id: "reset-mismatch" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", { newPassword });
      toast.success("Password reset — please sign in", { id: "reset-success" });
      // Reset all state back to the login screen
      setEmail("");
      setPassword("");
      setResetEmail("");
      setNewPassword("");
      setConfirmPassword("");
      clearOtp();
      setStep("credentials");
    } catch (err) {
      toast.error(getErrorMessage(err, "Reset failed"), { id: "reset-fail" });
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword]);

  return {
    // ── State ────────────────────────────
    step,
    setStep,
    loading,
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtp,
    resetEmail,
    setResetEmail,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    timer,
    formatTimer,
    // ── Handlers ─────────────────────────
    handleLoginSubmit,
    handleVerifyOtp,
    handleResendOtp,
    handleForgotSubmit,
    handleVerifyResetOtp,
    handleResendResetOtp,
    handleResetPassword,
    // ── Auth ─────────────────────────────
    isInitialLoad: user.isInitialLoad,
  };
}

export type LoginFlowState = ReturnType<typeof useLoginFlow>;
