import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  X,
  User,
  Mail,
  Phone,
  ShoppingBag,
  Heart,
  CreditCard,
  LogOut,
  Edit2,
  CheckCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface ProfileData {
  username: string;
  email: string;
  phone?: string;
  role?: string;
}

export default function ProfileDrawer() {
  const navigate = useNavigate();
  const { user, checkAuthStatus, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useBodyScrollLock(isOpen);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ newUsername: "", newEmail: "", newPhone: "" });

  // OTP state for profile edits
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Global event listener to open/close drawer from anywhere
  useEffect(() => {
    const handleOpen = () => {
      if (!user.isAuthenticated) {
        window.dispatchEvent(new CustomEvent("openCustomerAuth"));
        return;
      }
      setIsOpen(true);
    };
    const handleClose = () => setIsOpen(false);

    window.addEventListener("open-profile-drawer", handleOpen);
    window.addEventListener("openProfileDrawer", handleOpen);
    window.addEventListener("close-profile-drawer", handleClose);
    window.addEventListener("closeProfileDrawer", handleClose);

    return () => {
      window.removeEventListener("open-profile-drawer", handleOpen);
      window.removeEventListener("openProfileDrawer", handleOpen);
      window.removeEventListener("close-profile-drawer", handleClose);
      window.removeEventListener("closeProfileDrawer", handleClose);
    };
  }, [user.isAuthenticated]);

  // Fetch profile when opened
  const fetchProfile = useCallback(async () => {
    if (!user.isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get("/user/profile");
      if (res.data?.users) {
        const data = res.data.users;
        setProfile(data);
        setFormData({
          newUsername: data.username || "",
          newEmail: data.email || "",
          newPhone: data.phone || "",
        });
      }
    } catch {
      // Non-critical fallback to user context
      if (user) {
        setProfile({
          username: user.username || "Customer",
          email: user.email || "",
          role: user.role || "CUSTOMER",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      setIsEditing(false);
      setOtpRequested(false);
      setOtp("");
    }
  }, [isOpen, fetchProfile]);

  const handleClose = () => {
    setIsOpen(false);
    setIsEditing(false);
    setOtpRequested(false);
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.toLowerCase().includes("email") ? value.toLowerCase() : value,
    }));
  };

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { newUsername, newEmail, newPhone } = formData;

    if (!newUsername.trim() || !newEmail.trim()) {
      toast.error("Please fill in username and email.");
      return;
    }
    if (
      profile &&
      newUsername === profile.username &&
      newEmail === profile.email &&
      (newPhone || "") === (profile.phone || "")
    ) {
      toast("No changes detected.");
      setIsEditing(false);
      return;
    }

    try {
      setRequestingOtp(true);
      const res = await api.post("/user/profile/request-update", {
        newEmail: newEmail.trim(),
        newUsername: newUsername.trim(),
        newPhone: newPhone.trim() || undefined,
      });
      toast.success(res.data?.message || `OTP sent to ${newEmail}`);
      setOtpRequested(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update request failed.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the verification OTP.");
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await api.post("/user/profile/verify-update", {
        otp: otp.trim(),
      });
      toast.success("Profile updated successfully!");

      if (res.data?.user) {
        setProfile(res.data.user);
        setFormData({
          newUsername: res.data.user.username,
          newEmail: res.data.user.email,
          newPhone: res.data.user.phone || "",
        });
      }
      if (checkAuthStatus) checkAuthStatus();
      setOtp("");
      setOtpRequested(false);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (typeof document === "undefined") return null;

  const displayName = profile?.username || user.username || "Customer";
  const displayEmail = profile?.email || user.email || "";
  const displayPhone = profile?.phone || "";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            key="profile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              key="profile-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-screen max-w-md bg-white pointer-events-auto flex flex-col shadow-2xl overflow-hidden"
            >
              {/* ── 1. Drawer Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white z-10 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black font-semibold text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
                  <span>My Account</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close profile"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── 2. Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 [scrollbar-width:thin]">
                {/* Identity Summary Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 text-center relative overflow-hidden shadow-2xs">
                  <div className="w-20 h-20 mx-auto rounded-full p-1 bg-white shadow-md mb-3">
                    <div
                      style={{
                        background: "var(--theme-primary)",
                        color: "var(--theme-primary-ink)",
                      }}
                      className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold uppercase"
                    >
                      {initial}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-snug">
                    {displayName}
                  </h3>
                  {displayEmail && (
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {displayEmail}
                    </p>
                  )}
                  {displayPhone && (
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      📞 {displayPhone}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                      Member
                    </span>
                  </div>
                </div>

                {/* Quick Menu Links */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5 px-1">
                    Quick Navigation
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/myorders")}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/90 text-gray-800 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 group-hover:text-black">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">My Orders</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/transactions")}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/90 text-gray-800 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 group-hover:text-black">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">Transaction History</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/WishlistPage")}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/90 text-gray-800 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 group-hover:text-black">
                          <Heart className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">My Wishlist</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 rotate-180 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Profile Details & Quick Edit */}
                <div className="border border-gray-100 rounded-2xl p-4 bg-white shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Account Details
                    </p>
                    {!isEditing && !otpRequested && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-black cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {!isEditing ? (
                    /* Read-Only Details */
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-400 font-medium">Name</span>
                        <span className="font-semibold text-gray-900">{displayName}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-400 font-medium">Email</span>
                        <span className="font-semibold text-gray-900 truncate max-w-[190px]">
                          {displayEmail || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-400 font-medium">Phone</span>
                        <span className="font-semibold text-gray-900">
                          {displayPhone || "Not provided"}
                        </span>
                      </div>
                    </div>
                  ) : !otpRequested ? (
                    /* Edit Form */
                    <form onSubmit={handleRequestUpdate} className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="newUsername"
                          value={formData.newUsername}
                          onChange={handleChange}
                          required
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="newEmail"
                          value={formData.newEmail}
                          onChange={handleChange}
                          required
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="newPhone"
                          value={formData.newPhone}
                          onChange={handleChange}
                          placeholder="e.g. 9876543210"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-black focus:outline-hidden"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={requestingOtp}
                          style={{
                            background: "var(--theme-primary)",
                            color: "var(--theme-primary-ink)",
                          }}
                          className="flex-1 py-2 text-xs font-bold rounded-lg shadow-2xs hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {requestingOtp ? "Sending OTP..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* OTP Verification */
                    <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                        <p className="font-semibold">Enter OTP sent to:</p>
                        <p className="truncate font-mono">{formData.newEmail}</p>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          autoFocus
                          required
                          className="w-full text-center tracking-widest text-base font-mono font-bold px-3 py-2.5 rounded-lg border border-gray-300 focus:border-black focus:outline-hidden"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setOtpRequested(false)}
                          className="flex-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingOtp}
                          style={{
                            background: "var(--theme-primary)",
                            color: "var(--theme-primary-ink)",
                          }}
                          className="flex-1 py-2 text-xs font-bold rounded-lg shadow-2xs hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {verifyingOtp ? "Verifying..." : "Confirm & Save"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* ── 3. Bottom Sign Out ── */}
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs transition-all active:scale-98 cursor-pointer group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

