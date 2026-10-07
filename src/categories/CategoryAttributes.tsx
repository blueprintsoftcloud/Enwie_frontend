import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import { normalizeCategory } from "../utils/category";
import { ATTRIBUTE_TYPES } from "../constants/attributeTypes";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ArrowLeft,
  Filter,
  Tag,
  CheckCircle,
  X,
  CircleDot,
  ListChecks,
  AlignLeft,
  Hash,
  Calendar,
  ToggleLeft,
  Sparkles,
  Star,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttributeValue {
  id: string;
  value: string;
  sortOrder: number;
}

interface Attribute {
  id: string;
  name: string;
  type: string;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  values: AttributeValue[];
}

const ATTR_TYPES = ATTRIBUTE_TYPES;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    SELECT: "bg-blue-100 text-blue-700",
    MULTISELECT: "bg-purple-100 text-purple-700",
    TEXT: "bg-green-100 text-green-700",
    NUMBER: "bg-amber-100 text-amber-700",
    BOOLEAN: "bg-slate-100 text-slate-700",
    RATING: "bg-yellow-100 text-yellow-700",
    PRICE: "bg-emerald-100 text-emerald-700",
  };
  return map[type] ?? "bg-gray-100 text-gray-600";
};

const typeIconBg = (type: string) => {
  const map: Record<string, string> = {
    SELECT: "bg-blue-50 text-blue-600",
    MULTISELECT: "bg-purple-50 text-purple-600",
    TEXT: "bg-green-50 text-green-600",
    NUMBER: "bg-amber-50 text-amber-600",
    DATE: "bg-sky-50 text-sky-600",
    BOOLEAN: "bg-slate-100 text-slate-600",
    RATING: "bg-yellow-50 text-yellow-600",
    PRICE: "bg-emerald-50 text-emerald-600",
  };
  return map[type] ?? "bg-gray-100 text-gray-600";
};

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  switch (type) {
    case "SELECT": return <CircleDot className={className} />;
    case "MULTISELECT": return <ListChecks className={className} />;
    case "NUMBER": return <Hash className={className} />;
    case "DATE": return <Calendar className={className} />;
    case "BOOLEAN": return <ToggleLeft className={className} />;
    case "RATING": return <Star className={className} />;
    case "PRICE": return <IndianRupee className={className} />;
    default: return <AlignLeft className={className} />;
  }
};

// Short, plain-language hint under the Type picker — helps an admin who's never used
// this form before pick the right shape without guessing what "Multi-Select" implies.
const typeHint = (type: string): string => {
  const map: Record<string, string> = {
    SELECT: "Customer/admin picks exactly one option, e.g. Size: M.",
    MULTISELECT: "Several options can apply at once, e.g. Color: Red + Blue.",
    TEXT: "Free-form text, entered per product. Not filterable.",
    NUMBER: "A plain number, entered per product. Not filterable.",
    DATE: "A calendar date, entered per product, e.g. expiry or manufacture date. Not filterable.",
    BOOLEAN: "A fixed Yes/No — no values to define, they're automatic.",
    RATING: "Informational only — every category page already shows a Customer Ratings filter; adding this doesn't change that.",
    PRICE: "Informational only — every category page already shows a Price filter; adding this doesn't change that.",
  };
  return map[type] ?? "";
};

const ToggleSwitch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="inline-flex items-center gap-2.5 text-sm text-slate-700"
  >
    <span
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </span>
    {label}
  </button>
);

interface AttrModalState {
  mode: "add" | "edit";
  id?: string;
  name: string;
  type: string;
  isFilterable: boolean;
  isRequired: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CategoryAttributes: React.FC<{
  categoryId?: string;
  inline?: boolean;
}> = ({ categoryId: propCategoryId, inline = false }) => {
  const params = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const categoryId = propCategoryId ?? params.categoryId;

  // Reachable via the same broad Catalog Management nav gate as Listcategory.tsx (ANY
  // of CATEGORY_VIEW/ADD/EDIT/DELETE/PRODUCT_VIEW/ADD/EDIT/DELETE) — every write here
  // (add/edit/delete a filter or its values) requires CATEGORY_EDIT specifically on the
  // backend (see category.routes.ts), regardless of which permission actually got a
  // staff member into this page.
  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();
  const canEditAttributes = user.role !== "STAFF" || hasPermission("CATEGORY_EDIT");
  const NO_PERMISSION_MSG = "You don't have permission to edit filters — ask an admin to grant Category Edit access.";

  const [categoryName, setCategoryName] = useState("");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttrId, setExpandedAttrId] = useState<string | null>(null);

  // Add AND Edit Filter share one modal instead of Add living in an always-expanded
  // inline card (pushing the actual filter list down every time it's open) while Edit
  // replaced a row's header in place (a different, cramped layout for the same fields).
  // One dialog, two modes, closes over the list instead of displacing it.
  const [attrModal, setAttrModal] = useState<AttrModalState | null>(null);
  const [attrSaving, setAttrSaving] = useState(false);

  // Add value form (per attribute)
  const [newValueText, setNewValueText] = useState<Record<string, string>>({});
  const [valueSaving, setValueSaving] = useState<Record<string, boolean>>({});

  // Edit value
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editValueText, setEditValueText] = useState("");

  // Confirm dialog (replaces window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadAttributes = useCallback(async () => {
    if (!categoryId) return;
    try {
      const res = await api.get(`/category/${categoryId}/attributes`);
      setAttributes(res.data.attributes ?? []);
    } catch {
      toast.error("Failed to load attributes");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (!inline) {
      api
        .get("/category/list")
        .then((res) => {
          const cat = (res.data.list ?? []).map(normalizeCategory).find(
            (c: { id?: string; _id?: string; name: string }) =>
              (c.id ?? c._id) === categoryId,
          );
          if (cat) setCategoryName(cat.name);
        })
        .catch(() => {});
    }
    loadAttributes();
  }, [categoryId, inline, loadAttributes]);

  // ── Attribute actions ──────────────────────────────────────────────────────

  const openAddModal = () => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setAttrModal({ mode: "add", name: "", type: "SELECT", isFilterable: true, isRequired: false });
  };

  const openEditModal = (attr: Attribute) => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setAttrModal({
      mode: "edit",
      id: attr.id,
      name: attr.name,
      type: attr.type,
      isFilterable: attr.isFilterable,
      isRequired: attr.isRequired,
    });
  };

  const closeAttrModal = () => setAttrModal(null);

  const handleSaveAttrModal = async () => {
    if (!attrModal) return;
    if (!categoryId) {
      toast.error("Category ID is missing. Please re-select or save category.");
      return;
    }
    if (!attrModal.name.trim()) {
      toast.error("Filter name is required");
      return;
    }
    setAttrSaving(true);
    try {
      const payload = {
        name: attrModal.name,
        type: attrModal.type,
        isFilterable: attrModal.isFilterable,
        isRequired: attrModal.isRequired,
      };
      if (attrModal.mode === "add") {
        await api.post(`/category/${categoryId}/attributes`, payload);
        toast.success("Filter added");
      } else {
        await api.put(`/category/${categoryId}/attributes/${attrModal.id}`, payload);
        toast.success("Filter updated");
      }
      setAttrModal(null);
      await loadAttributes();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? `Failed to ${attrModal.mode === "add" ? "add" : "update"} filter`,
      );
    } finally {
      setAttrSaving(false);
    }
  };

  const handleDeleteAttribute = (attrId: string, name: string) => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setConfirmDialog({
      title: `Delete filter "${name}" and all its values?`,
      message: "This will also remove it from all products.",
      confirmLabel: "Delete filter",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/category/${categoryId}/attributes/${attrId}`);
          toast.success("Filter deleted");
          await loadAttributes();
        } catch {
          toast.error("Failed to delete filter");
        }
      },
    });
  };

  // ── Value actions ──────────────────────────────────────────────────────────

  const handleAddValue = async (attrId: string) => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    const value = (newValueText[attrId] ?? "").trim();
    if (!value) return;
    setValueSaving((p) => ({ ...p, [attrId]: true }));
    try {
      await api.post(`/category/${categoryId}/attributes/${attrId}/values`, {
        value,
      });
      toast.success("Value added");
      setNewValueText((p) => ({ ...p, [attrId]: "" }));
      await loadAttributes();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to add value");
    } finally {
      setValueSaving((p) => ({ ...p, [attrId]: false }));
    }
  };

  const handleUpdateValue = async (attrId: string, valueId: string) => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    if (!editValueText.trim()) return;
    try {
      await api.put(
        `/category/${categoryId}/attributes/${attrId}/values/${valueId}`,
        { value: editValueText },
      );
      toast.success("Value updated");
      setEditingValueId(null);
      await loadAttributes();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update value");
    }
  };

  const handleDeleteValue = (
    attrId: string,
    valueId: string,
    value: string,
  ) => {
    if (!canEditAttributes) {
      toast.error(NO_PERMISSION_MSG);
      return;
    }
    setConfirmDialog({
      title: `Delete value "${value}"?`,
      confirmLabel: "Delete value",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(
            `/category/${categoryId}/attributes/${attrId}/values/${valueId}`,
          );
          toast.success("Value deleted");
          await loadAttributes();
        } catch {
          toast.error("Failed to delete value");
        }
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    if (inline) {
      return (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono w-full text-center select-none">Loading attributes…</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#f3f4f9] flex items-center justify-center font-sans antialiased">
        <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono w-full text-center select-none">Loading attributes…</p>
      </div>
    );
  }

  return (
    <>

      <div
        className={
          inline
            ? ""
            : "min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 sm:px-6 lg:px-8 py-8"
        }
      >
        <div className={inline ? "" : "max-w-4xl mx-auto"}>
          {/* Page header — hidden when panel is embedded inline */}
          {!inline && (
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Tag className="h-4 w-4" />
                  <span>{categoryName || categoryId}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Category Filters
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  Define the filterable specs for products in this category.
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition shadow"
              >
                <Plus className="h-4 w-4" />
                Add Filter
              </button>
            </div>
          )}

          {/* Inline mode: Add Filter button without full page header */}
          {inline && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-slate-400">
                {attributes.length === 0
                  ? "No filters defined yet"
                  : `${attributes.length} filter${attributes.length !== 1 ? "s" : ""} defined`}
              </p>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition shadow"
              >
                <Plus className="h-4 w-4" />
                Add Filter
              </button>
            </div>
          )}

          {/* Filter List */}
          {attributes.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-slate-200 bg-white">
              <Filter className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No filters yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Add filters to let customers narrow products in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {attributes.map((attr) => {
                const isExpanded = expandedAttrId === attr.id;
                const valueCount = (attr.values ?? []).length;

                return (
                  <div
                    key={attr.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Attribute Header — the whole middle area toggles the Values
                        panel; only Edit/Delete are separate actions, so there's one
                        clear thing each control on this row does. */}
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className={`p-2 rounded-xl shrink-0 ${typeIconBg(attr.type)}`}>
                        <TypeIcon type={attr.type} className="h-4 w-4" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedAttrId(isExpanded ? null : attr.id)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm truncate">
                              {attr.name}
                            </span>
                            <span
                              className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeBadge(attr.type)}`}
                            >
                              {attr.type}
                            </span>
                            {attr.isRequired && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {valueCount} value{valueCount !== 1 ? "s" : ""}
                            {" · "}
                            {attr.isFilterable ? "Shown in filters" : "Hidden from filters"}
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-300 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-100 ml-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(attr)}
                          title="Edit filter"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                          title="Delete filter"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Values Panel (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                        {attr.type === "SELECT" ||
                        attr.type === "MULTISELECT" ? (
                          <>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">
                              Values
                            </p>
                            {/* Existing values */}
                            {(attr.values ?? []).length === 0 && (
                              <p className="text-xs text-slate-400 mb-3">
                                No values yet — add the first one below (e.g. "Cotton", "Silk").
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {(attr.values ?? []).map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-sm text-slate-700"
                                >
                                  {editingValueId === v.id ? (
                                    <>
                                      <input
                                        value={editValueText}
                                        onChange={(e) =>
                                          setEditValueText(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          handleUpdateValue(attr.id, v.id)
                                        }
                                        className="w-24 text-xs border-b border-indigo-400 bg-transparent focus:outline-none"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() =>
                                          handleUpdateValue(attr.id, v.id)
                                        }
                                        className="text-emerald-600 hover:text-emerald-700 transition"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingValueId(null)}
                                        className="text-slate-400 hover:text-slate-600 transition"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span>{v.value}</span>
                                      {/* Always visible (not hover-only) — a hidden-until-hover
                                          edit/delete is easy to never discover, especially on
                                          touch devices where hover doesn't exist at all. */}
                                      <button
                                        onClick={() => {
                                          setEditingValueId(v.id);
                                          setEditValueText(v.value);
                                        }}
                                        title="Rename value"
                                        className="ml-1 text-slate-300 hover:text-slate-600 transition"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteValue(
                                            attr.id,
                                            v.id,
                                            v.value,
                                          )
                                        }
                                        title="Delete value"
                                        className="text-slate-300 hover:text-red-500 transition"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Add value input */}
                            <div className="flex gap-2">
                              <input
                                value={newValueText[attr.id] ?? ""}
                                onChange={(e) =>
                                  setNewValueText((p) => ({
                                    ...p,
                                    [attr.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleAddValue(attr.id)
                                }
                                placeholder="Add a value…"
                                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                              />
                              <button
                                onClick={() => handleAddValue(attr.id)}
                                disabled={valueSaving[attr.id]}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {valueSaving[attr.id] ? "…" : "Add"}
                              </button>
                            </div>
                          </>
                        ) : attr.type === "BOOLEAN" ? (
                          // The backend seeds these two rows automatically (see
                          // attribute.controller.ts's seedBooleanValues) — a boolean
                          // needs real id-backed values to be settable on a product and
                          // filterable at all, same as SELECT/MULTISELECT, so they're
                          // shown read-only here rather than editable/removable.
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {(attr.values ?? []).map((v) => (
                                <span
                                  key={v.id}
                                  className="px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50/70 text-sm font-medium text-indigo-700"
                                >
                                  {v.value}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2.5">
                              Fixed automatically — nothing to add or remove here.
                            </p>
                          </div>
                        ) : attr.type === "RATING" || attr.type === "PRICE" ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <TypeIcon type={attr.type} className="h-3.5 w-3.5 shrink-0" />
                            Built-in and global — already shown on every category page,
                            not just this one. This entry is a record only.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <AlignLeft className="h-3.5 w-3.5 shrink-0" />
                            This filter uses free-text input — no predefined values needed.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Filter — one dialog for both, overlaying the list instead of
          displacing it (Add used to live in an always-expanded inline card above the
          list; Edit used to replace a row's header in place). */}
      {attrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  {attrModal.mode === "add" ? "New Filter" : "Edit Filter"}
                </h3>
                <p className="text-xs text-slate-500">
                  Define a spec that products in this category can be tagged with.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAttrModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={attrModal.name}
                    onChange={(e) =>
                      setAttrModal((p) => (p ? { ...p, name: e.target.value } : p))
                    }
                    placeholder="e.g. Fabric, RAM, Color"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <TypeIcon
                      type={attrModal.type}
                      className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <select
                      value={attrModal.type}
                      onChange={(e) =>
                        setAttrModal((p) => (p ? { ...p, type: e.target.value } : p))
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all appearance-none"
                    >
                      {ATTR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 -mt-1.5">{typeHint(attrModal.type)}</p>

              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                <ToggleSwitch
                  checked={attrModal.isFilterable}
                  onChange={(v) => setAttrModal((p) => (p ? { ...p, isFilterable: v } : p))}
                  label="Show in filters"
                />
                {attrModal.type !== "RATING" && attrModal.type !== "PRICE" && (
                  <ToggleSwitch
                    checked={attrModal.isRequired}
                    onChange={(v) => setAttrModal((p) => (p ? { ...p, isRequired: v } : p))}
                    label="Required on product"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSaveAttrModal}
                  disabled={attrSaving}
                  className="flex-1 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
                >
                  {attrSaving ? "Saving…" : attrModal.mode === "add" ? "Save Filter" : "Save Changes"}
                </button>
                <button
                  onClick={closeAttrModal}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog — replaces window.confirm so it matches the app's styling */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {confirmDialog.title}
                  </h3>
                  {confirmDialog.message && (
                    <p className="text-xs text-slate-500 mt-1">
                      {confirmDialog.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
              >
                {confirmDialog.confirmLabel ?? "Delete"}
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryAttributes;
