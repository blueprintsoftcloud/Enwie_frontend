// src/users/AddAdminModal.tsx
// Modal version of the former standalone "Add New Admin" page — same form,
// validation, and API call, just rendered over the Admin & Staff Management page
// instead of navigating away to /manage-user/add-user.

import React, { useEffect, useState } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  XMarkIcon,
  UserPlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../utils/api";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the admin is created successfully — use it to close the modal and refresh the list. */
  onSuccess: () => void;
}

const EMPTY_FORM = {
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "ADMIN",
};

export default function AddAdminModal({ isOpen, onClose, onSuccess }: AddAdminModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset form state whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM);
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): Record<string, string> | null => {
    const { username, email, phone, password } = formData;
    const tempErrors: Record<string, string> = {};

    if (!username.trim()) {
      tempErrors.username = "Full name is required.";
    } else if (username.trim().length < 2) {
      tempErrors.username = "Full name must be at least 2 characters long.";
    } else if (!/^[a-zA-Z\s]+$/.test(username)) {
      tempErrors.username = "Name should contain only letters and spaces.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = "Email address is required.";
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = "Enter a valid email address.";
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.trim()) {
      tempErrors.phone = "Phone number is required.";
    } else if (!phoneRegex.test(phone.trim())) {
      tempErrors.phone = "Enter a valid 10-digit phone number.";
    }

    if (!password.trim()) {
      tempErrors.password = "Password is required.";
    } else if (password.length < 8) {
      tempErrors.password = "Password must be at least 8 characters long.";
    }

    return Object.keys(tempErrors).length > 0 ? tempErrors : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (validationErrors) {
      setErrors(validationErrors);
      toast.dismiss();
      toast.error(Object.values(validationErrors)[0], { id: "validation-error" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/admin/users", formData, {
        headers: { "Content-Type": "application/json" },
      });

      toast.dismiss();
      toast.success("Admin account created successfully!", {
        id: "add-user-success",
      });

      onSuccess();
    } catch (err) {
      const _e = err as any;
      const msg =
        _e.response?.data?.Error ||
        _e.response?.data?.message ||
        "Failed to add user. Please try again.";
      toast.dismiss();
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/20">
              <UserPlusIcon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Add New Admin
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Create a secure account for a new Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col" autoComplete="off">
          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-5 space-y-4.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="username"
                placeholder="Enter Your Name"
                value={formData.username}
                onChange={handleChange}
                className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.username
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-900"
                }`}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.username}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <EnvelopeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    errors.email
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-900"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="phone"
                  placeholder="Mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData((prev) => ({ ...prev, phone: value }));
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    errors.phone
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-900"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 Characters"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.password
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-900"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              Share this once and ask the user to change it after first login.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <ShieldCheckIcon className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="text-xs text-slate-600">
              This account is created with the <strong>Admin</strong> role and extended dashboard access.
            </p>
          </div>
          </div>

          <div className="flex items-center gap-3 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? "Adding user…" : "Add user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
