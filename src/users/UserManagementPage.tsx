// src/users/UserManagementPage.tsx
// Combined User Management + Staff Management page with tabs.

import React, { useState, Component, ErrorInfo, ReactNode } from "react";
import {
  UsersIcon,
  UserGroupIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import StaffManagement from "../dashboard/StaffManagement";
import Listusers from "./Listusers";
import AddAdminModal from "./AddAdminModal";

type ActiveTab = "users" | "staff";

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("UserManagement error boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center bg-white rounded-2xl border border-red-100 shadow-sm my-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">
              Something went wrong loading this section
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-slate-50/50 w-full font-sans antialiased">
      {/* ── Premium Dashboard Header Section ── */}
      <div className="px-8 pt-8 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 bg-white shadow-xs">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            Admin &amp; Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Coordinate secure administrative credentials, structure modular workforce teams, authorize discrete staff role keys, and inspect execution permissions logs.
          </p>
        </div>

        {/* "Add User" button — only shown on the Users tab */}
        {activeTab === "users" && (
          <button
            onClick={() => setShowAddAdmin(true)}
            className="self-start md:self-center bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition active:scale-[0.98] duration-150 shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
            Add Admin
          </button>
        )}
      </div>

      {/* ── Enhanced Glass Navigation Tab Strips ── */}
      <div className="px-8 mt-6">
        <div className="bg-slate-200/60 p-1 rounded-xl w-fit flex gap-1 border border-slate-300/40 shadow-xs">
          {/* User Accounts tab */}
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "users"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UsersIcon className="h-4 w-4" strokeWidth={2.2} />
            Admin Accounts
          </button>

          {/* Staff Management tab */}
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "staff"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserGroupIcon className="h-4 w-4" strokeWidth={2.2} />
            Staff Management
          </button>
        </div>
      </div>

      {/* ── Tab Content Rendering Stack with ErrorBoundary ── */}
      <div className="px-8 py-6 w-full">
        <ErrorBoundary>
          {activeTab === "users" && (
            <Listusers roleFilter="ADMIN" key={usersRefreshKey} />
          )}

          {activeTab === "staff" && <StaffManagement />}
        </ErrorBoundary>
      </div>

      <AddAdminModal
        isOpen={showAddAdmin}
        onClose={() => setShowAddAdmin(false)}
        onSuccess={() => {
          setShowAddAdmin(false);
          setUsersRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}