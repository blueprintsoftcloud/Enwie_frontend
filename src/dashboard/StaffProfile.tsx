// src/dashboard/StaffProfile.tsx
// Profile settings page for STAFF users.
// Premium redesign — full-width, bg-[#f3f4f9] layout matching admin dashboard.
// Functionality: view profile, update username, view assigned permissions.

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Shield,
  Mail,
  User,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Lock,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions, PERMISSION_GROUPS } from "../context/StaffPermissionContext";
import Loader from "../components/Loader";

interface StaffProfileData {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  permissions: string[];
}

const StaffProfile = () => {
  const { checkAuthStatus } = useAuth();
  const { refresh } = useStaffPermissions();

  const [profile, setProfile] = useState<StaffProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  // ── Fetch profile ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get<StaffProfileData>("/staff/profile");
        setProfile(res.data);
        setNewUsername(res.data.username);
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to load profile.", { id: "profile-load" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Save username ────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      toast.error("Username must be at least 3 characters.", { id: "username-val" });
      return;
    }
    if (newUsername.trim() === profile?.username) {
      toast("No changes detected.", { id: "no-change" });
      return;
    }
    try {
      setSaving(true);
      const res = await api.patch("/staff/me", { username: newUsername.trim() });
      setProfile((prev) => prev ? { ...prev, username: res.data.user.username } : prev);
      toast.success("Profile updated successfully!", { id: "profile-save" });
      await checkAuthStatus();
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update profile.", { id: "profile-save-err" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Failed to load profile.</h2>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none";
  const grantedCount = profile.permissions.length;
  const totalCount = PERMISSION_GROUPS.reduce((a, g) => a + g.permissions.length, 0);

  return (
    <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 font-sans antialiased">
      <div className="w-full space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-600 uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Staff Portal
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage your staff account details</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${profile.isActive ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            <span className={`w-2 h-2 rounded-full ${profile.isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            {profile.isActive ? "Active Account" : "Inactive Account"}
          </div>
        </div>

        {/* ── Main 2-col layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ── Left: Identity Card ── */}
          <div className="xl:col-span-4 space-y-5">

            {/* Profile card — clean flat design */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
              {/* Initial circle */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 flex items-center justify-center shadow-lg mb-4">
                  <span className="text-3xl font-black text-white select-none">
                    {(profile.username ?? "S").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <h2 className="text-lg font-black text-slate-900">{profile.username}</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                    <Shield className="w-3 h-3" />{profile.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="break-all">{profile.email}</span>
                </p>
                <div className={`flex items-center gap-1.5 mt-3 px-3 py-1 rounded-lg text-[11px] font-bold border ${profile.isActive ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.isActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  {profile.isActive ? "Active Account" : "Inactive Account"}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 my-5" />

              {/* Info tiles */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Info</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Username</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{profile.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Email</p>
                    <p className="text-sm font-bold text-slate-900 break-all">{profile.email}</p>
                  </div>
                </div>

                {/* Permission count pill */}
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Permissions</span>
                  </div>
                  <span className="text-xs font-black text-emerald-900 font-mono">{grantedCount} / {totalCount}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right: Edit + Permissions ── */}
          <div className="xl:col-span-8 space-y-6">

            {/* Edit Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Edit Display Name</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Update your public username. Email can only be changed by your admin.</p>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">New Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inputCls} placeholder="Enter new username" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="email" value={profile.email} readOnly className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed text-sm" />
                      </div>
                      <p className="text-[11px] text-slate-400">Contact your admin to change your email.</p>
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><CheckCircle className="w-3.5 h-3.5" /> Save Changes</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Permissions Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Assigned Permissions</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Read-only. Contact your admin to change access levels.</p>
                </div>
              </div>
              <div className="p-6 space-y-7">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1 h-3 rounded-full bg-slate-300" />
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {group.permissions.map((perm) => {
                        const granted = profile.permissions.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              granted
                                ? "bg-emerald-50 border-emerald-100"
                                : "bg-slate-50 border-slate-100 opacity-50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${granted ? "bg-emerald-500" : "bg-slate-300"}`}>
                              {granted ? (
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Lock className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className={`text-xs font-semibold ${granted ? "text-slate-900" : "text-slate-400"}`}>
                              {perm.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
