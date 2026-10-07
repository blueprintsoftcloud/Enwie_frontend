import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import {
  User,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle,
  LogOut,
  ShoppingBag,
  Heart,
  Edit2,
  KeyRound,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  username: string;
  email: string;
  phone?: string;
  role?: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, checkAuthStatus, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({ newUsername: "", newEmail: "", newPhone: "" });
  const [isEditing, setIsEditing] = useState(false);

  // OTP States
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get("/user/profile");
        if (!res.data || !res.data.users) throw new Error("Invalid response");

        const data = res.data.users;
        setProfile(data);
        setFormData({
          newUsername: data.username || "",
          newEmail: data.email || "",
          newPhone: data.phone || "",
        });
      } catch (err) {
        const e = err as any;
        if (e.response?.status === 401) {
          toast("Please log in.");
          setTimeout(() => navigate("/"), 1500);
        } else {
          toast.error("Failed to load profile.");
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.toLowerCase().includes("email") ? value.toLowerCase() : value }));
  };

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { newUsername, newEmail, newPhone } = formData;

    if (!newUsername.trim() || !newEmail.trim())
      return void toast("Fill all fields.");
    if (
      profile &&
      newUsername === profile.username &&
      newEmail === profile.email &&
      (newPhone || "") === (profile.phone || "")
    )
      return void toast("No changes detected.");

    try {
      setRequestingOtp(true);
      const res = await api.post("/user/profile/request-update", {
        newEmail,
        newUsername,
        newPhone: newPhone.trim() || undefined,
      });
      toast.success(res.data?.message || `OTP sent to ${newEmail}`);
      setOtpRequested(true);
    } catch (err) {
      const e = err as any;
      toast.error(e.response?.data?.message || "Update failed.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return void toast("Enter OTP.");

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
    } catch (err) {
      const e = err as any;
      toast.error(e.response?.data?.message || "Invalid OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loadingProfile) return <Loader />;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Profile Unavailable
        </h2>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pt-(--app-header-h) pb-12 relative overflow-hidden">
      {/* Background Decor */}
      <div
        className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 35%, transparent)" }}
      ></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-7">
        {/* --- Header & Back Button --- */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors duration-300 mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            Go Back
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1
                className="text-4xl font-bold tracking-tighter text-black sm:text-5xl mb-2 py-0.5"
                style={{ fontFamily: "var(--theme-font-heading)" }}
              >
                My Profile
              </h1>
              <p className="text-gray-500 font-medium">
                Manage your account settings
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT: IDENTITY CARD ================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Profile Card */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-gray-100 to-gray-50 z-0"></div>

              <div className="relative z-10 pt-4">
                <div className="w-28 h-28 mx-auto rounded-full bg-white p-1 shadow-lg mb-4">
                  <div className="w-full h-full rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] flex items-center justify-center text-4xl font-bold uppercase tracking-wider">
                    {profile.username.charAt(0)}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.username}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  {profile.email}
                </p>
                {profile.phone && (
                  <p className="text-gray-400 text-sm font-medium mt-1">
                    📞 {profile.phone}
                  </p>
                )}

                <div className="flex justify-center gap-2 mt-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                    {profile.role || "Member"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Menu */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 px-2">
                Quick Menu
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/myorders")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-gray-500 group-hover:text-[var(--theme-primary-ink)]" />
                    <span className="font-bold text-sm">My Orders</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => navigate("/transactions")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-500 group-hover:text-[var(--theme-primary-ink)]" />
                    <span className="font-bold text-sm">Transaction History</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => navigate("/WishlistPage")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-[var(--theme-primary)] hover:text-[var(--theme-primary-ink)] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-gray-500 group-hover:text-[var(--theme-primary-ink)]" />
                    <span className="font-bold text-sm">Wishlist</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white transition-all duration-300 group text-red-600"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold text-sm">Sign Out</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT: EDIT FORM ================= */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100 h-full">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-full"
                    style={{ background: "color-mix(in srgb, var(--theme-primary) 10%, white)", color: "var(--theme-primary)" }}
                  >
                    <Edit2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                      {isEditing ? "Edit Details" : "My Details"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {isEditing ? "Update your personal information" : "Your account information"}
                    </p>
                  </div>
                </div>
                {/* {!otpRequested && (
                  <button
                    type="button"
                    onClick={() => setIsEditing((v) => !v)}
                    className={`p-2.5 rounded-full border transition-all ${
                      isEditing
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black"
                    }`}
                    title={isEditing ? "Cancel editing" : "Edit profile"}
                  >
                  </button>
                )} */}
              </div>

              {!otpRequested ? (
                !isEditing ? (
                  /* ── Read-only view ── */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Display Name</p>
                        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-transparent">
                          <User className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{profile.username}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Email Address</p>
                        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-transparent">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{profile.email}</span>
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Phone Number</p>
                        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-transparent">
                          <span className="text-gray-400 text-lg leading-none">📞</span>
                          <span className="font-semibold text-gray-900">{profile.phone || <span className="text-gray-400 font-normal">Not provided</span>}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] transition-all shadow-md hover:shadow-lg"
                      >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                    </div>
                  </div>
                ) : (
                <form onSubmit={handleRequestUpdate} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Username Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">
                        Display Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-[var(--theme-primary)] transition-colors" />
                        <input
                          name="newUsername"
                          type="text"
                          value={formData.newUsername}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-transparent text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[var(--theme-primary)] focus:ring-0 transition-all font-medium"
                          placeholder="Enter username"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">
                        Email Address
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-[var(--theme-primary)] transition-colors" />
                        <input
                          name="newEmail"
                          type="email"
                          value={formData.newEmail}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-transparent text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[var(--theme-primary)] focus:ring-0 transition-all font-medium"
                          placeholder="Enter email"
                        />
                      </div>
                    </div>

                    {/* Phone Input */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-gray-500 ml-1">
                        Phone Number
                      </label>
                      <div className="relative group">
                        <span className="absolute left-4 top-3.5 text-gray-400 text-base leading-none">📞</span>
                        <input
                          name="newPhone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={formData.newPhone}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-transparent text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[var(--theme-primary)] focus:ring-0 transition-all font-medium"
                          placeholder="10-digit mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setFormData({ newUsername: profile.username, newEmail: profile.email, newPhone: profile.phone || "" }); }}
                      className="px-6 py-3 border border-gray-200 rounded-full text-sm font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={requestingOtp}
                      className="px-8 py-4 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                    >
                      {requestingOtp ? "Sending OTP..." : "Save Changes"}
                    </button>
                  </div>
                </form>
                )
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto py-10 text-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: "color-mix(in srgb, var(--theme-primary) 10%, white)", color: "var(--theme-primary)" }}
                  >
                    <KeyRound className="w-10 h-10" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify Email
                  </h3>
                  <p className="text-gray-500 text-sm mb-8">
                    We sent a 6-digit code to{" "}
                    <span className="font-bold text-gray-900">
                      {formData.newEmail}
                    </span>
                  </p>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-2xl border-2 border-gray-200 focus:border-[var(--theme-primary)] focus:ring-0 transition-colors bg-white"
                      placeholder="000000"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="w-full px-8 py-4 bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] disabled:opacity-70 transition-all shadow-lg"
                    >
                      {verifyingOtp ? "Verifying..." : "Confirm & Update"}
                    </button>
                  </form>

                  <button
                    onClick={() => setOtpRequested(false)}
                    className="mt-6 text-xs font-bold text-gray-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                  >
                    Cancel Verification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
