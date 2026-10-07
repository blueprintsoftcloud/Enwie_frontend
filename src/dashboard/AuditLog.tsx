import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { AlertTriangle, Plus, Pencil, Trash2, ToggleLeft, Info } from "lucide-react";
import toast from "react-hot-toast";

interface AuditLogEntry {
  id?: string;
  _id?: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id?: string;
    username?: string;
    email?: string | null;
    role?: string;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Colored/iconed by the action's own verb prefix rather than a hardcoded per-action
// map — the backend has ~40 distinct action strings across a dozen controllers (and
// grows every time a new admin action gets audited), so a fixed lookup table always
// drifts out of date and falls back to a flat gray badge for anything new. Matching
// on the prefix scales automatically instead.
const ACTION_STYLES: { test: (a: string) => boolean; cls: string; icon: typeof Plus }[] = [
  { test: (a) => a.startsWith("CREATE_") || a.startsWith("ADD_") || a === "ADMIN_PLACE_ORDER", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/10", icon: Plus },
  { test: (a) => a.startsWith("DELETE_"), cls: "bg-red-50 text-red-700 ring-red-600/10", icon: Trash2 },
  { test: (a) => a.startsWith("TOGGLE_") || a.startsWith("ACTIVATE_") || a.startsWith("DEACTIVATE_"), cls: "bg-amber-50 text-amber-700 ring-amber-600/10", icon: ToggleLeft },
  { test: (a) => a.startsWith("UPDATE_") || a.startsWith("SYNC_") || a.startsWith("GENERATE_"), cls: "bg-blue-50 text-blue-700 ring-blue-600/10", icon: Pencil },
];
const DEFAULT_STYLE = { cls: "bg-gray-100 text-gray-700 ring-gray-500/10", icon: Info };

const actionStyle = (action: string) => ACTION_STYLES.find((s) => s.test(action)) ?? DEFAULT_STYLE;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AuditLog() {
  const { user } = useAuth();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [detailsLog, setDetailsLog] = useState<AuditLogEntry | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity", filterEntity);
      if (filterUser) params.set("userId", filterUser);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity, filterUser]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearAll = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    try {
      await api.delete("/audit-logs");
      toast.success("Audit logs cleared");
      setLogs([]);
      setPagination({ total: 0, page: 1, limit: 30, totalPages: 1 });
    } catch {
      toast.error("Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilterAction("");
    setFilterEntity("");
    setFilterUser("");
    setPage(1);
  };

  const hasFilter = Boolean(filterAction || filterEntity || filterUser);
  const isSystemEmpty = !loading && logs.length === 0 && !hasFilter;

  return (
    <div className="px-8 py-8 w-full bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-sm shadow-slate-300">
            <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-950">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Review immutable system event entries, track operational administrative changes, trace execution details, and manage authorization logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {pagination.total > 0 && (
            <span className="hidden lg:inline-flex items-center px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500 tabular-nums">
              {pagination.total.toLocaleString("en-IN")} entries
            </span>
          )}
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing || logs.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
            >
              <TrashIcon className="h-4 w-4" />
              {clearing ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {/* Filters - only render if logs exist or an active filter is present */}
      {!isSystemEmpty && (
        <form
          onSubmit={handleFilterSubmit}
          className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 mb-6 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
        >
          <div className="relative lg:col-span-5">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by action (e.g. DELETE_USER)"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-slate-50/50"
            />
          </div>

          <div className="relative lg:col-span-5">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by entity (e.g. Coupon)"
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-slate-50/50"
            />
          </div>

          <button
            type="submit"
            className="lg:col-span-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition active:scale-[0.98] duration-150 shadow-sm cursor-pointer"
          >
            <MagnifyingGlassIcon className="h-4 w-4" strokeWidth={2.5} />
            Search
          </button>

          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="lg:col-span-12 justify-self-start inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 mb-4">
              <ClipboardDocumentListIcon className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {hasFilter ? "No entries match these filters" : "No audit log entries yet"}
            </p>
            {hasFilter && (
              <button onClick={clearFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-2 cursor-pointer">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const userName = log.user?.username ?? "System";
                  const userRole = log.user?.role ?? "SYSTEM";
                  const logKey = log.id ?? log._id ?? `${log.entity}-${log.createdAt}`;
                  const style = actionStyle(log.action);
                  const ActionIcon = style.icon;

                  return (
                    <tr key={logKey} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white text-[10px] font-bold">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{userName}</div>
                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{userRole}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ring-inset ${style.cls}`}>
                          <ActionIcon className="h-3 w-3" />
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700 font-medium">{log.entity}</span>
                        {log.entityId && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{log.entityId.slice(-8)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.details ? (
                          <button
                            onClick={() => setDetailsLog(log)}
                            className="text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg px-2 py-1 font-mono truncate max-w-[220px] transition-colors cursor-pointer block"
                            title="View full details"
                          >
                            {JSON.stringify(log.details)}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{log.ipAddress ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total.toLocaleString("en-IN")} entries)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition cursor-pointer"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition cursor-pointer"
            >
              Next
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Details modal — full pretty-printed JSON instead of the truncated inline snippet */}
      {detailsLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{detailsLog.action.replace(/_/g, " ")}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {detailsLog.entity}
                  {detailsLog.entityId && ` · #${detailsLog.entityId.slice(-8)}`} · {formatDate(detailsLog.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setDetailsLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <pre className="p-5 text-xs font-mono text-gray-700 bg-gray-50 max-h-96 overflow-auto whitespace-pre-wrap break-words">
              {JSON.stringify(detailsLog.details, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Clear-all confirm — replaces window.confirm so it matches the app's styling */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">Clear all audit logs?</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    This permanently deletes every audit log entry, including this action's own record.
                    This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
