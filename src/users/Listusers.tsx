// src/users/Listusers.tsx
// Reusable user list table with edit and delete actions.
// Accepts an optional roleFilter prop to show only ADMIN or CUSTOMER users.

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  UsersIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ClipLoader } from "react-spinners";

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id?: string;
  _id?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

export interface ListUsersProps {
  roleFilter?: "ADMIN" | "CUSTOMER";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getUserId = (user: User) => {
  const id = user.id ?? user._id;
  if (id === undefined || id === null) return undefined;
  const normalized = String(id);
  return normalized === "undefined" || normalized === "null"
    ? undefined
    : normalized;
};

const normalizeUser = (user: User): User => ({
  ...user,
  id: getUserId(user),
});

const isValidUserId = (id?: string): id is string => {
  return Boolean(id && id !== "undefined" && id !== "null");
};

const getInitials = (user: User) => {
  const src = (user.username || user.email || "").trim();
  if (!src) return "?";
  const parts = src.split(" ");
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
};

const RoleBadge = ({ role }: { role?: string }) => {
  const n = (role || "").toLowerCase();
  let cls = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border";
  if (n === "admin") cls += " bg-rose-50 text-rose-700 border-rose-200/80";
  else if (n === "customer") cls += " bg-emerald-50 text-emerald-700 border-emerald-200/80";
  else if (n === "staff") cls += " bg-indigo-50 text-indigo-700 border-indigo-200/80";
  else cls += " bg-slate-100 text-slate-700 border-slate-200";
  return <span className={cls}>{role || "N/A"}</span>;
};

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}

const PaginationControls = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) => {
  const hasResults = totalItems > 0;
  const start = hasResults ? (currentPage - 1) * pageSize + 1 : 0;
  const end = hasResults ? Math.min(currentPage * pageSize, totalItems) : 0;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 rounded-b-3xl">
      <p className="text-xs text-slate-500 font-medium mb-3 sm:mb-0">
        {hasResults ? (
          <>
            Showing <span className="font-bold text-slate-900">{start}</span> to{" "}
            <span className="font-bold text-slate-900">{end}</span> of{" "}
            <span className="font-bold text-slate-900">{totalItems}</span> accounts
          </>
        ) : (
          "No accounts found"
        )}
      </p>
      <nav className="flex items-center space-x-1.5">
        <button
          onClick={() => {
            onPageChange(currentPage - 1);
          }}
          disabled={currentPage === 1 || totalPages === 0}
          className="flex items-center justify-center rounded-xl p-2 text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="hidden md:flex items-center gap-1">
          {Array.from({ length: totalPages || 0 }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                onPageChange(p);
              }}
              className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                p === currentPage
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            onPageChange(currentPage + 1);
          }}
          disabled={currentPage === totalPages || totalPages === 0}
          className="flex items-center justify-center rounded-xl p-2 text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all cursor-pointer"
        >
          <ChevronRightIcon className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </nav>
    </div>
  );
};

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}) {
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);

  // This component only exists while a user is being edited, so the lock is
  // unconditional here — always true for the component's whole lifetime.
  useBodyScrollLock(true);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 3) {
      toast.error("Name must be at least 3 characters.", {
        id: "edit-user-validate",
      });
      return;
    }
    if (
      !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}$/.test(trimmedEmail)
    ) {
      toast.error("Please enter a valid email address.", {
        id: "edit-user-validate",
      });
      return;
    }
    if (phone && !/^[6-9][0-9]{9}$/.test(phone)) {
      toast.error("Phone must be a valid 10-digit Indian mobile number.", {
        id: "edit-user-validate",
      });
      return;
    }

    const userId = getUserId(user);
    if (!isValidUserId(userId)) {
      toast.error("Unable to identify user for update.", {
        id: "edit-user-error",
      });
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch(`/admin/users/${userId}`, {
        username: trimmedName,
        email: trimmedEmail,
        phone,
      });
      const roleStr = (res.data.user?.role || user.role || "").toUpperCase() === "ADMIN" ? "Admin" : "Customer";
      toast.success(`${roleStr} account updated successfully`, { id: "edit-user-success" });
      onSaved(res.data.user);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user", {
        id: "edit-user-error",
      });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (user.role || "").toUpperCase() === "ADMIN" ? "Admin" : "Customer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/80 w-full max-w-md p-7 md:p-8 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Glow Decor */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 z-10 cursor-pointer"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 flex-shrink-0">
            <PencilSquareIcon className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-0.5">
              {roleLabel} Profile
            </div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight">Edit {roleLabel} Account</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Full Name *
            </label>
            <div className="relative group">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" strokeWidth={2} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter full name"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Email Address *
            </label>
            <div className="relative group">
              <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" strokeWidth={2} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="Enter email address"
                className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all"
              />
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Mobile Number
            </label>
            <div className="relative group">
              <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none" strokeWidth={2} />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="10-digit mobile number"
                className="w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all"
              />
              {phone.length > 0 && (
                <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold select-none ${
                  phone.length === 10 ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {phone.length}/10
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-60 cursor-pointer flex items-center justify-center"
            >
              {saving ? <ClipLoader color="white" size={16} /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const ListUsers = ({ roleFilter }: ListUsersProps) => {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const USERS_PER_PAGE = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {
      page: currentPage,
      limit: USERS_PER_PAGE,
      search: debouncedSearch.trim() || undefined,
    };
    if (roleFilter) params.role = roleFilter;
    api
      .get("/admin/users", { params })
      .then((res) => {
        setAllUsers((res.data.users || []).map(normalizeUser));
        setTotalItems(res.data.pagination?.total ?? (res.data.users || []).length);
        setError("");
      })
      .catch(() => {
        setError(
          "Failed to load users. Please check your network or try again.",
        );
        setAllUsers([]);
        setTotalItems(0);
      })
      .finally(() => setLoading(false));
  }, [roleFilter, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when search or roleFilter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, debouncedSearch]);

  const totalPages = Math.ceil(totalItems / USERS_PER_PAGE) || 0;
  const usersOnCurrentPage = allUsers;

  const confirmDelete = async (user: User) => {
    const id = getUserId(user);
    if (!isValidUserId(id)) {
      toast.error("Unable to identify user for deletion.");
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      const roleStr = (user.role || "").toUpperCase() === "ADMIN" ? "Admin" : "Customer";
      toast.success(`${roleStr} account deleted successfully`, { id: "delete-user-success" });
      setAllUsers((prev) => prev.filter((u) => getUserId(u) !== id));
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user", { id: "delete-user-error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUserSaved = (updated: User) => {
    const normalized = normalizeUser(updated);
    const updatedId = getUserId(normalized);
    setAllUsers((prev) =>
      prev.map((u) =>
        getUserId(u) === updatedId ? { ...u, ...normalized } : u,
      ),
    );
    setEditingUser(null);
  };

  const totalAdmins = allUsers.filter(
    (u) => (u.role || "").toUpperCase() === "ADMIN",
  ).length;
  const totalCustomers = allUsers.filter(
    (u) => (u.role || "").toUpperCase() === "CUSTOMER",
  ).length;

  // Rule: If total base items is 0 AND user hasn't typed a search term, hide search input
  const showSearchInput = totalItems > 0 || searchTerm.trim() !== "";

  return (
    <div className="w-full pb-12 font-sans text-slate-900">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}

      {/* Stats Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Accounts
          </p>
          <p className="mt-1.5 text-2xl font-black text-slate-950 tracking-tight">
            {totalItems}
          </p>
        </div>
        {!roleFilter && (
          <>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Admins
              </p>
              <p className="mt-1.5 text-2xl font-black text-slate-950 tracking-tight">
                {totalAdmins}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Customers
              </p>
              <p className="mt-1.5 text-2xl font-black text-slate-950 tracking-tight">
                {totalCustomers}
              </p>
            </div>
          </>
        )}
        {roleFilter === "ADMIN" && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Admin Accounts
            </p>
            <p className="mt-1.5 text-2xl font-black text-slate-950 tracking-tight">
              {totalAdmins}
            </p>
          </div>
        )}
        {roleFilter === "CUSTOMER" && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Customer Accounts
            </p>
            <p className="mt-1.5 text-2xl font-black text-slate-950 tracking-tight">
              {totalCustomers}
            </p>
          </div>
        )}
      </div>

      {/* Main Table Card Container */}
      <div className="bg-white shadow-sm rounded-3xl border border-slate-200/80 overflow-hidden">
        {/* Toolbar Header */}
        <div className="border-b border-slate-100 px-6 py-4.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-black text-slate-950 tracking-tight">
              {roleFilter === "ADMIN" ? "Admin Directory" : roleFilter === "CUSTOMER" ? "Customer Directory" : "All Users"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Browse, search, and manage registered profiles.
            </p>
          </div>

          {/* Search bar — only rendered if showSearchInput is true */}
          {showSearchInput && (
            <div className="w-full sm:w-72 relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" strokeWidth={2} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="block w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <ClipLoader color="#0f172a" size={28} />
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mt-3">Loading directory...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="p-8 text-center text-xs font-semibold text-rose-500 bg-rose-50/50">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {usersOnCurrentPage.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <UsersIcon className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-bold text-slate-800">No user accounts found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm.trim() ? "Try modifying your search term to locate user records." : "There are currently no registered profiles in this section."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Account Profile
                        </th>
                        <th className="px-6 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Email Address
                        </th>
                        <th className="px-6 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Phone Number
                        </th>
                        <th className="px-6 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Role
                        </th>
                        <th className="px-6 py-3.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {usersOnCurrentPage.map((user) => {
                        const userId = getUserId(user);
                        return (
                          <tr
                            key={userId}
                            className="hover:bg-slate-50/70 transition-colors duration-150"
                          >
                            <td className="px-6 py-4 text-xs font-semibold text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider flex-shrink-0 shadow-xs">
                                  {getInitials(user)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-950 text-xs">
                                    {user.username || "Unnamed User"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {userId?.slice(-6)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                              {user.phone || "—"}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              <RoleBadge role={user.role} />
                            </td>
                            <td className="px-6 py-4 text-xs text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition cursor-pointer"
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                  }}
                                  disabled={deletingId === userId}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 cursor-pointer"
                                >
                                  <TrashIcon className="h-3.5 w-3.5 text-rose-500" strokeWidth={2} />
                                  {deletingId === userId ? "..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                  {usersOnCurrentPage.map((user) => {
                    const userId = getUserId(user);
                    return (
                      <div
                        key={userId}
                        className="border border-slate-200/80 rounded-2xl p-4 shadow-xs bg-white space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white text-xs font-black">
                            {getInitials(user)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950 text-sm">
                              {user.username || "Unnamed User"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {userId?.slice(-6)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                          <p><span className="font-semibold text-slate-400">Email:</span> <span>{user.email}</span></p>
                          <p><span className="font-semibold text-slate-400">Phone:</span> <span>{user.phone || "—"}</span></p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="font-semibold text-slate-400">Role:</span>
                            <RoleBadge role={user.role} />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                            }}
                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5 text-slate-400" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                            }}
                            disabled={deletingId === userId}
                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50 cursor-pointer"
                          >
                            <TrashIcon className="h-3.5 w-3.5 text-rose-500" />
                            {deletingId === userId ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={USERS_PER_PAGE}
                  totalItems={totalItems}
                  onPageChange={(p) => {
                    if (p >= 1 && p <= totalPages) setCurrentPage(p);
                  }}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <DeleteUserConfirmationModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={() => confirmDelete(userToDelete)}
          deleting={deletingId === getUserId(userToDelete)}
        />
      )}

    </div>
  );
};

interface DeleteUserConfirmationModalProps {
  user: User;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

const DeleteUserConfirmationModal = ({
  user,
  onClose,
  onConfirm,
  deleting,
}: DeleteUserConfirmationModalProps) => {
  // Only exists while a delete is pending, so the lock is unconditional here — always
  // true for the component's whole lifetime.
  useBodyScrollLock(true);
  const roleStr = (user.role || "").toUpperCase() === "ADMIN" ? "Admin" : "Customer";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/80 w-full max-w-md p-7 relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
            <TrashIcon className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-950 tracking-tight">
              Delete {roleStr} Account
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{user.username || user.email}</strong>? This action cannot be undone and all associated credentials will be revoked.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 h-11 rounded-2xl border border-slate-200 px-4 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center"
          >
            {deleting ? <ClipLoader color="white" size={16} /> : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListUsers;
