import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  PERMISSION_GROUPS,
  StaffPermission,
} from "../context/StaffPermissionContext";
import { useAuth } from "../context/AuthContext";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import {
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  KeyIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";


// All available permission keys — used when permission customization is disabled
const ALL_PERMISSIONS: StaffPermission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

// ── Types ─────────────────────────────────────────────────────────────────
interface StaffMember {
  id: string;
  isActive: boolean;
  permissions: StaffPermission[];
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    phone: string;
    createdAt: string;
    avatar?: string;
  };
}

const emptyForm = {
  username: "",
  email: "",
  phone: "",
  password: "",
  notes: "",
  permissions: [] as StaffPermission[],
};

// ── Permission Checkbox Group ──────────────────────────────────────────────
function PermissionSelector({
  selected,
  onChange,
  disabled = false,
}: {
  selected: StaffPermission[];
  onChange: (perms: StaffPermission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (perm: StaffPermission) => {
    if (disabled) return;
    if (selected.includes(perm)) {
      onChange(selected.filter((p) => p !== perm));
    } else {
      onChange([...selected, perm]);
    }
  };

  const toggleGroup = (groupPerms: readonly StaffPermission[]) => {
    if (disabled) return;
    const allSelected = groupPerms.every((p) => selected.includes(p));
    if (allSelected) {
      onChange(selected.filter((p) => !groupPerms.includes(p)));
    } else {
      const toAdd = groupPerms.filter((p) => !selected.includes(p));
      onChange([...selected, ...toAdd]);
    }
  };

  return (
    <div className={`space-y-3.5 ${disabled ? "opacity-60 select-none" : ""}`}>
      {PERMISSION_GROUPS.map((group) => {
        const groupKeys = group.permissions.map((p) => p.key);
        const allChecked = groupKeys.every((k) => selected.includes(k));
        const someChecked = groupKeys.some((k) => selected.includes(k));

        return (
          <div
            key={group.label}
            className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 transition-all duration-200 hover:border-slate-300 shadow-sm hover:shadow"
          >
            <label
              className={`flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-slate-800 mb-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked;
                }}
                onChange={() => toggleGroup(groupKeys)}
                disabled={disabled}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-slate-500" />
                {group.label}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 pl-6">
              {group.permissions.map(({ key, label }) => {
                const isChecked = selected.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-all duration-150 ${
                      isChecked
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100/80 hover:border-slate-300"
                    } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(key)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PERMISSION_LABEL_MAP: Record<string, string> = {
  CATEGORY_VIEW: "View Categories",
  CATEGORY_ADD: "Add Category",
  CATEGORY_EDIT: "Edit Category",
  CATEGORY_DELETE: "Delete Category",
  PRODUCT_VIEW: "View Products",
  PRODUCT_ADD: "Add Product",
  PRODUCT_EDIT: "Edit Product",
  PRODUCT_DELETE: "Delete Product",
  ORDER_VIEW: "View Orders",
  ORDER_UPDATE: "Update Orders",
};

const formatPermissionLabel = (perm: string): string => {
  if (PERMISSION_LABEL_MAP[perm]) return PERMISSION_LABEL_MAP[perm];
  return perm
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function StaffManagement() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredStaff = Array.isArray(staffList) ? staffList : [];
  const { user: currentUser } = useAuth();
  const permEnabled = true;

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit modal
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editBasicForm, setEditBasicForm] = useState({
    username: "",
    email: "",
    phone: "",
    notes: "",
    newPassword: "",
  });
  const [editPermsForEdit, setEditPermsForEdit] = useState<StaffPermission[]>(
    [],
  );
  const [savingEdit, setSavingEdit] = useState(false);

  // Stand-alone permission editor (kept for backwards compat; now opened from Edit modal)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<StaffPermission[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Delete modal state
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<Record<string, boolean>>({});

  const toggleExpandedPerms = (staffId: string) => {
    setExpandedPerms((prev) => ({
      ...prev,
      [staffId]: !prev[staffId],
    }));
  };

  // Check if any modal is active to lock the body element scrolling
  const isAnyModalOpen = Boolean(
    showCreate || editingStaff || editingId || staffToDelete || showSubscriptionModal
  );
  useBodyScrollLock(isAnyModalOpen);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch.trim() || undefined
      };
      const res = await api.get("/staff", { params });
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load staff");
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Create staff ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const username = createForm.username.trim();
    const email = createForm.email.trim();
    const phone = createForm.phone.trim();
    const password = createForm.password;

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.", {
        id: "staff-validate",
      });
      return;
    }
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.", {
        id: "staff-validate",
      });
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      toast.error("Phone must be a valid 10-digit Indian mobile number.", {
        id: "staff-validate",
      });
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.", {
        id: "staff-validate",
      });
      return;
    }

    setSaving(true);
    try {
      // When permission customization is disabled, grant all permissions automatically
      const payload = permEnabled
        ? { ...createForm, username, email, phone }
        : {
            ...createForm,
            username,
            email,
            phone,
            permissions: ALL_PERMISSIONS,
          };
      await api.post("/staff", payload);
      toast.success("Staff account created");
      setShowCreate(false);
      setCreateForm(emptyForm);
      fetchStaff();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create staff";
      toast.error(msg, { id: "staff-error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ───────────────────────────────────────────────────────
  const handleToggle = async (s: StaffMember) => {
    try {
      const res = await api.patch(`/staff/${s.id}/toggle`);
      const newActive: boolean = res.data.isActive;
      setStaffList((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, isActive: newActive } : x)),
      );
      toast.success(
        newActive ? "Staff account activated" : "Staff account deactivated",
      );
    } catch {
      toast.error("Failed to toggle staff status");
    }
  };

  const confirmDelete = async (staff: StaffMember) => {
    setDeletingStaffId(staff.id);
    try {
      await api.delete(`/staff/${staff.id}`);
      setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
      toast.success(`Staff account for ${staff.user?.username || "member"} deleted successfully`, { id: "delete-staff-success" });
      setStaffToDelete(null);
    } catch {
      toast.error("Failed to delete staff account", { id: "delete-staff-error" });
    } finally {
      setDeletingStaffId(null);
    }
  };
  // ── Open edit modal ──────────────────────────────────────────────────
  const openEditModal = (s: StaffMember) => {
    setEditingStaff(s);
    setEditBasicForm({
      username: s.user?.username || "",
      email: s.user?.email || "",
      phone: s.user?.phone || "",
      notes: s.notes ?? "",
      newPassword: "",
    });
    setEditPermsForEdit(s.permissions || []);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const username = editBasicForm.username.trim();
    const email = editBasicForm.email.trim();
    const phone = editBasicForm.phone.trim();

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.", {
        id: "staff-edit-validate",
      });
      return;
    }
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.", {
        id: "staff-edit-validate",
      });
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      toast.error("Phone must be a valid 10-digit Indian mobile number.", {
        id: "staff-edit-validate",
      });
      return;
    }

    setSavingEdit(true);
    try {
      // Always update basic details
      const basicRes = await api.patch(`/staff/${editingStaff.id}`, {
        ...editBasicForm,
        username,
        email,
        phone,
        ...(editBasicForm.newPassword.trim()
          ? { newPassword: editBasicForm.newPassword }
          : {}),
      });

      // Update permissions only when customization is enabled
      if (permEnabled) {
        await api.patch(`/staff/${editingStaff.id}/permissions`, {
          permissions: editPermsForEdit,
        });
      }

      // Merge updates back into local list
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                notes: basicRes.data.notes,
                permissions: permEnabled ? editPermsForEdit : (s.permissions || []),
                user: { ...s.user, ...basicRes.data.user },
              }
            : s,
        ),
      );

      toast.success("Staff details updated");
      setEditingStaff(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update staff";
      toast.error(msg, { id: "staff-edit-error" });
    } finally {
      setSavingEdit(false);
    }
  };
  // ── Open permission editor ─────────────────────────────────────────────
  const openPermEditor = (s: StaffMember) => {
    setEditingId(s.id);
    setEditPerms(s.permissions || []);
  };

  const handleSavePerms = async () => {
    if (!editingId) return;
    setSavingPerms(true);
    try {
      await api.patch(`/staff/${editingId}/permissions`, {
        permissions: editPerms,
      });
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingId ? { ...s, permissions: editPerms } : s,
        ),
      );
      toast.success("Permissions updated");
      setEditingId(null);
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create staff accounts and control their permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition cursor-pointer"
        >
          + Add Staff
        </button>
      </div>

      {/* Staff table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full">
        {/* Toolbar */}
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50/60">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Staff Members</h2>
            <p className="text-xs text-gray-500">
              Search, view, and manage your team and permissions.
            </p>
          </div>
          {(staffList.length > 0 || searchTerm.trim() !== "") && (
            <div className="w-full sm:w-72 relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, notes..."
                className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading staff…</div>
        ) : staffList.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No staff yet. Create one to delegate tasks.
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No staff members found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Staff Member", "Permissions", "Status", "Joined", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center flex-shrink-0">
                          {s.user?.avatar ? (
                            <img
                              src={s.user.avatar}
                              alt={s.user?.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-white">
                              {(s.user?.username ?? "?")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {s.user?.username ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.user?.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {!s.permissions || s.permissions.length === 0 ? (
                          <span className="text-slate-400 text-xs font-medium italic">
                            No permissions
                          </span>
                        ) : (
                          <>
                            {(expandedPerms[s.id] ? s.permissions : (s.permissions || []).slice(0, 3)).map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center bg-indigo-50/80 text-indigo-700 border border-indigo-100/80 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-2xs"
                              >
                                {formatPermissionLabel(String(p))}
                              </span>
                            ))}
                            {s.permissions && s.permissions.length > 3 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandedPerms(s.id)}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                              >
                                {expandedPerms[s.id] ? "Show less" : `+${s.permissions.length - 3} more`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.user?.createdAt
                        ? new Date(s.user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openPermEditor(s)}
                          className="inline-flex items-center text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all shadow-sm cursor-pointer bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/80 hover:text-indigo-800"
                        >
                          Permissions
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all shadow-sm cursor-pointer ${
                            s.isActive
                              ? "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/80 hover:text-amber-800"
                              : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/80 hover:text-emerald-800"
                          }`}
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => setStaffToDelete(s)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/80 hover:text-rose-700 transition-all shadow-sm cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ── Create Staff Modal ─────────────────────────────────────────────── */}
      {showCreate && (
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
                    Add Staff Member
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure staff profile and dashboard permission rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 md:px-8 py-5 space-y-4.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, username: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                      value={createForm.phone}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setCreateForm({ ...createForm, phone: digits });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    placeholder="staff@boutique.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value.toLowerCase() })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-slate-600" />
                  Staff Permissions
                </p>
                {permEnabled ? (
                  <PermissionSelector
                    selected={createForm.permissions}
                    onChange={(perms) =>
                      setCreateForm({ ...createForm, permissions: perms })
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3.5">
                      <LockClosedIcon className="h-5 w-5 text-amber-600 shrink-0" />
                      <p className="text-xs font-medium text-amber-900">
                        Permission customization is disabled — staff will be
                        granted <strong>all permissions</strong> automatically.
                      </p>
                    </div>
                    <PermissionSelector
                      selected={ALL_PERMISSIONS}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                )}
              </div>
              </div>

              <div className="flex items-center gap-3 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {creating ? "Creating Staff..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ──────────────────────────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shrink-0 shadow-md">
                  {editingStaff.user.avatar ? (
                    <img
                      src={editingStaff.user.avatar}
                      alt={editingStaff.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {editingStaff.user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Edit Staff Member
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingStaff.user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 md:px-8 py-5 space-y-4.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                      value={editBasicForm.username}
                      onChange={(e) =>
                        setEditBasicForm({
                          ...editBasicForm,
                          username: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                      value={editBasicForm.phone}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setEditBasicForm({ ...editBasicForm, phone: digits });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                    value={editBasicForm.email}
                    onChange={(e) =>
                      setEditBasicForm({
                        ...editBasicForm,
                        email: e.target.value.toLowerCase(),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes
                </label>
                <div className="relative">
                  <DocumentTextIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                    placeholder="Optional internal note"
                    value={editBasicForm.notes}
                    onChange={(e) =>
                      setEditBasicForm({
                        ...editBasicForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password
                  <span className="ml-1 font-normal text-slate-400">
                    (leave blank to keep unchanged)
                  </span>
                </label>
                <div className="relative">
                  <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
                    value={editBasicForm.newPassword}
                    onChange={(e) =>
                      setEditBasicForm({
                        ...editBasicForm,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-slate-600" />
                  Permissions
                </p>
                {permEnabled ? (
                  <PermissionSelector
                    selected={editPermsForEdit}
                    onChange={setEditPermsForEdit}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3.5">
                      <LockClosedIcon className="h-5 w-5 text-amber-600 shrink-0" />
                      <p className="text-xs font-medium text-amber-900">
                        Permission customization is disabled — this staff member
                        has <strong>all permissions</strong> granted.
                      </p>
                    </div>
                    <PermissionSelector
                      selected={ALL_PERMISSIONS}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                )}
              </div>
              </div>

              <div className="flex items-center gap-3 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Permission Editor Modal ────────────────────────────────────────── */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Edit Permissions
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {staffList.find((s) => s.id === editingId)?.user.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {permEnabled ? (
                <PermissionSelector
                  selected={editPerms}
                  onChange={setEditPerms}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3.5">
                    <LockClosedIcon className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-xs font-medium text-amber-900">
                      Permission customization is disabled — this staff member has{" "}
                      <strong>all permissions</strong> granted.
                    </p>
                  </div>
                  <PermissionSelector
                    selected={ALL_PERMISSIONS}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 md:px-8 py-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-100/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                disabled={savingPerms}
                className="flex-1 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {savingPerms ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4 py-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Remove Staff Account
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure you want to permanently remove <strong>{staffToDelete.user?.username || staffToDelete.user?.email || "this staff member"}</strong>? They will immediately lose all administrative dashboard permissions and access.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                disabled={!!deletingStaffId}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(staffToDelete)}
                disabled={!!deletingStaffId}
                className="inline-flex justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
              >
                {deletingStaffId ? "Removing..." : "Remove Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}