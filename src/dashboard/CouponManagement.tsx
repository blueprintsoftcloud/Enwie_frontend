import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import DatePicker from "../components/DatePicker";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";

// Local-date (not UTC) "YYYY-MM-DD" for tomorrow — matches DatePicker's own internal
// toStr() convention. The save validation below rejects `new Date(expiresAt) <=
// new Date()`, and a date-only string parses as UTC midnight, so today's own date
// always fails that check too — the calendar's minimum has to start at tomorrow,
// not today, or picking "today" would still silently trip the same error.
const minExpiryStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FLAT",
  discountValue: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
};

export default function CouponManagement() {
  // Nav/route access to this page (see StaffDashboard.tsx's buildNav) is granted by ANY
  // of COUPON_VIEW/ADD/EDIT/DELETE, but each backend endpoint requires one specific
  // permission — a staff member with e.g. only COUPON_ADD (no VIEW) would previously
  // hit an unconditional list-fetch and every write button with no indication of what
  // they actually have rights to. hasPermission() already returns true unconditionally
  // for ADMIN/SUPER_ADMIN (see StaffPermissionContext.tsx).
  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();
  const isStaff = user.role === "STAFF";
  const canView = !isStaff || hasPermission("COUPON_VIEW");
  const canAdd = !isStaff || hasPermission("COUPON_ADD");
  const canEdit = !isStaff || hasPermission("COUPON_EDIT");
  const canDelete = !isStaff || hasPermission("COUPON_DELETE");
  const NO_PERMISSION_MSG = "You don't have permission to make changes here — ask an admin to grant it.";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  useBodyScrollLock(showModal || !!couponToDelete);

  const fetchCoupons = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/coupon/admin");
      setCoupons(res.data);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreate = () => {
    if (!canAdd) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setEditCoupon(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    if (!canEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setEditCoupon(c);
    setForm({
      code: c.code,
      description: c.description ?? "",
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editCoupon ? !canEdit : !canAdd) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }

    const code = form.code.toUpperCase().trim();
    const discountValue = parseFloat(form.discountValue);
    const minOrderAmount = form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0;
    const maxUses = form.maxUses ? parseInt(form.maxUses) : null;

    // --- Validation ---
    if (code.length < 3) {
      toast.error("Coupon code must be at least 3 characters.", { id: "coupon-validate" });
      return;
    }
    if (!/^[A-Z0-9_\-]+$/.test(code)) {
      toast.error("Coupon code can only contain letters, numbers, _ and -.", { id: "coupon-validate" });
      return;
    }
    if (isNaN(discountValue) || discountValue <= 0) {
      toast.error("Discount value must be greater than 0.", { id: "coupon-validate" });
      return;
    }
    if (form.discountType === "PERCENTAGE" && discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%.", { id: "coupon-validate" });
      return;
    }
    if (minOrderAmount < 0) {
      toast.error("Minimum order amount cannot be negative.", { id: "coupon-validate" });
      return;
    }
    if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
      toast.error("Max uses must be at least 1.", { id: "coupon-validate" });
      return;
    }
    if (form.expiresAt && new Date(form.expiresAt) <= new Date()) {
      toast.error("Expiry date must be in the future.", { id: "coupon-validate" });
      return;
    }

    setSaving(true);
    const payload = {
      code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      expiresAt: form.expiresAt || null,
    };
    try {
      if (editCoupon) {
        await api.patch(`/coupon/admin/${editCoupon.id}`, payload);
        toast.success("Coupon updated");
      } else {
        await api.post("/coupon/admin", payload);
        toast.success("Coupon created");
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: Coupon) => {
    if (!canEdit) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    try {
      const res = await api.patch(`/coupon/admin/${c.id}/toggle`);
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? res.data : x)));
    } catch {
      toast.error("Failed to toggle coupon");
    }
  };

  const handleDelete = (c: Coupon) => {
    if (!canDelete) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setCouponToDelete(c);
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    setDeletingId(couponToDelete.id);
    try {
      await api.delete(`/coupon/admin/${couponToDelete.id}`);
      setCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));
      toast.success("Coupon deleted");
      setCouponToDelete(null);
    } catch {
      toast.error("Failed to delete coupon");
    } finally {
      setDeletingId(null);
    }
  };



  const badgeClass = (active: boolean, expired: boolean) => {
    if (expired) return "bg-gray-100 text-gray-600";
    if (!active) return "bg-red-100 text-red-700";
    return "bg-green-100 text-green-700";
  };

  const isExpired = (c: Coupon) =>
    (c.expiresAt != null && new Date(c.expiresAt) < new Date()) ||
    (c.maxUses != null && c.usedCount >= c.maxUses);

//   return (
//     <div className="p-6 max-w-7xl mx-auto">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
//           <p className="text-sm text-gray-500 mt-1">Create and manage discount coupons</p>
//         </div>
//         <button
//           onClick={openCreate}
//           className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
//         >
//           + New Coupon
//         </button>
//       </div>

//       {/* Stats bar - fully visible real data */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
//         {[
//           { label: "Total Coupons", value: coupons.length },
//           {
//             label: "Active",
//             value: coupons.filter((c) => c.isActive && !isExpired(c)).length,
//           },
//           { label: "Expired", value: coupons.filter(isExpired).length },
//           {
//             label: "Total Uses",
//             value: coupons.reduce((s, c) => s + c.usedCount, 0),
//           },
//         ].map((s) => (
//           <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
//             <p className="text-xs text-gray-500">{s.label}</p>
//             <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
//           </div>
//         ))}
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
//         {loading ? (
//           <div className="p-10 text-center text-gray-400">Loading coupons…</div>
//         ) : coupons.length === 0 ? (
//           <div className="p-10 text-center text-gray-400">
//             No coupons yet. Create one to get started.
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200 text-sm">
//               <thead className="bg-gray-50">
//                 <tr>
//                   {["Code", "Discount", "Min Order", "Uses", "Expires", "Status", ""].map(
//                     (h) => (
//                       <th
//                         key={h}
//                         className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
//                       >
//                         {h}
//                       </th>
//                     ),
//                   )}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {coupons.map((c) => {
//                   const expired = isExpired(c);
//                   return (
//                     <tr key={c.id} className="hover:bg-gray-50 transition">
//                       <td className="px-4 py-3">
//                         <span className="font-mono font-semibold text-gray-900">
//                           {c.code}
//                         </span>
//                         {c.description && (
//                           <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
//                         )}
//                       </td>
//                       <td className="px-4 py-3 text-gray-700">
//                         {c.discountType === "PERCENTAGE"
//                           ? `${c.discountValue}%`
//                           : `₹${c.discountValue}`}
//                       </td>
//                       <td className="px-4 py-3 text-gray-600">
//                         {c.minOrderAmount > 0 ? `₹${c.minOrderAmount}` : "—"}
//                       </td>
//                       <td className="px-4 py-3 text-gray-600">
//                         {c.usedCount}
//                         {c.maxUses != null ? ` / ${c.maxUses}` : ""}
//                       </td>
//                       <td className="px-4 py-3 text-gray-600">
//                         {c.expiresAt
//                           ? new Date(c.expiresAt).toLocaleDateString()
//                           : "Never"}
//                       </td>
//                       <td className="px-4 py-3">
//                         <span
//                           className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass(
//                             c.isActive,
//                             expired
//                           )}`}
//                         >
//                           {expired ? "Expired" : c.isActive ? "Active" : "Inactive"}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center gap-2">
//                           <button
//                             onClick={() => handleToggle(c)}
//                             className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 transition"
//                           >
//                             {c.isActive ? "Disable" : "Enable"}
//                           </button>
//                           <button
//                             onClick={() => openEdit(c)}
//                             className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => handleDelete(c.id)}
//                             disabled={deletingId === c.id}
//                             className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Coupon Editor Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
//             <h2 className="text-lg font-bold text-gray-900 mb-4">
//               {editCoupon ? "Edit Coupon" : "Create Coupon"}
//             </h2>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-xs font-semibold text-gray-600 mb-1">
//                   Code *
//                 </label>
//                 <input
//                   required
//                   disabled={!!editCoupon}
//                   className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50"
//                   placeholder="e.g. SAVE20"
//                   value={form.code}
//                   onChange={(e) => setForm({ ...form, code: e.target.value })}
//                 />
//               </div>

//               <div>
//                 <label className="block text-xs font-semibold text-gray-600 mb-1">
//                   Description
//                 </label>
//                 <input
//                   className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                   placeholder="Optional description"
//                   value={form.description}
//                   onChange={(e) => setForm({ ...form, description: e.target.value })}
//                 />
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-600 mb-1">
//                     Discount Type *
//                   </label>
//                   <select
//                     required
//                     className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                     value={form.discountType}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         discountType: e.target.value as "PERCENTAGE" | "FLAT",
//                       })
//                     }
//                   >
//                     <option value="PERCENTAGE">Percentage (%)</option>
//                     <option value="FLAT">Flat (₹)</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-600 mb-1">
//                     Value *
//                   </label>
//                   <input
//                     required
//                     type="number"
//                     min="1"
//                     max={form.discountType === "PERCENTAGE" ? "100" : undefined}
//                     className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                     placeholder={form.discountType === "PERCENTAGE" ? "20" : "500"}
//                     value={form.discountValue}
//                     onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-600 mb-1">
//                     Min Order (₹)
//                   </label>
//                   <input
//                     type="number"
//                     min="0"
//                     className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                     placeholder="0"
//                     value={form.minOrderAmount}
//                     onChange={(e) =>
//                       setForm({ ...form, minOrderAmount: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-xs font-semibold text-gray-600 mb-1">
//                     Max Uses
//                   </label>
//                   <input
//                     type="number"
//                     min="1"
//                     className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                     placeholder="Unlimited"
//                     value={form.maxUses}
//                     onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-xs font-semibold text-gray-600 mb-1">
//                   Expires At
//                 </label>
//                 <input
//                   type="date"
//                   className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
//                   value={form.expiresAt}
//                   onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
//                 />
//               </div>

//               <div className="flex gap-3 pt-2">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={saving}
//                   className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
//                 >
//                   {!hasProAccess && (
//                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                     </svg>
//                   )}
//                   {saving ? "Saving…" : editCoupon ? "Update" : "Create"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





return (
    <div className="px-8 py-8 w-full bg-slate-50/50 min-h-screen">
      {/* Premium Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-600 uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Campaign Controls
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">
            Coupon Management
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Authorize new transactional promotional codes, modify state base thresholds, track usage distributions, and monitor dynamic validation flags.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start md:self-center bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition active:scale-[0.98] duration-150 shadow-sm"
        >
          + New Coupon
        </button>
      </div>

      {/* Stats bar - fully visible real data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Coupons", value: coupons.length },
          {
            label: "Active Campaigns",
            value: coupons.filter((c) => c.isActive && !isExpired(c)).length,
          },
          { label: "Expired Vault", value: coupons.filter(isExpired).length },
          {
            label: "Total Uses",
            value: coupons.reduce((s, c) => s + c.usedCount, 0),
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black text-gray-950 tracking-tight mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
        {!canView ? (
          <div className="p-16 text-center text-sm font-semibold text-gray-400">
            You don't have permission to view coupons — ask an admin to grant Coupon View access.
          </div>
        ) : loading ? (
          <div className="p-16 text-center text-sm font-semibold text-gray-400">Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div className="p-16 text-center text-sm font-semibold text-gray-400">
            No coupons yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50/70">
                <tr>
                  {["Code", "Discount", "Min Order", "Uses", "Expires", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition duration-150">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-gray-950 text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {c.code}
                        </span>
                        {c.description && (
                          <p className="text-xs text-gray-500 mt-1.5 max-w-xs truncate">{c.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountValue}%`
                          : `₹${c.discountValue}`}
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-medium">
                        {c.minOrderAmount > 0 ? `₹${c.minOrderAmount}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                        <span className="text-gray-900 font-bold">{c.usedCount}</span>
                        {c.maxUses != null ? ` / ${c.maxUses}` : " / \u221E"}
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs font-medium">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "Never"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass(
                            c.isActive,
                            expired
                          )}`}
                        >
                          {expired ? "Expired" : c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(c)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
                          >
                            {c.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coupon Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-100 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-950 tracking-tight px-6 pt-6 pb-4 shrink-0">
              {editCoupon ? "Edit Coupon" : "Create Coupon"}
            </h2>
            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Code *
                </label>
                <input
                  required
                  disabled={!!editCoupon}
                  className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm font-mono uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 disabled:bg-gray-50"
                  placeholder="e.g. SAVE20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Discount Type *
                  </label>
                  <select
                    required
                    className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountType: e.target.value as "PERCENTAGE" | "FLAT",
                      })
                    }
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Value *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                    className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    placeholder={form.discountType === "PERCENTAGE" ? "20" : "500"}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    placeholder="0"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm({ ...form, minOrderAmount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                    placeholder="Unlimited"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Expires At
                </label>
                <DatePicker
                  className="w-full border border-gray-200 bg-slate-50/50 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                  value={form.expiresAt}
                  onChange={(v) => setForm({ ...form, expiresAt: v })}
                  min={minExpiryStr()}
                />
              </div>

              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? "Saving…" : editCoupon ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-950 tracking-tight">
                  Delete Coupon
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure you want to delete coupon <strong className="font-mono text-gray-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{couponToDelete.code}</strong>? Orders using it will not be affected.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                disabled={deletingId === couponToDelete.id}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === couponToDelete.id}
                className="inline-flex justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
              >
                {deletingId === couponToDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}