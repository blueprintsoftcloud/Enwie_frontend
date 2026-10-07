// src/dashboard/SuperAdminMonitoring.tsx
// Super-Admin-only system monitoring: live health, centralized logs.
// Not visible to Admin or Staff — this is platform-operator tooling, not tenant data.

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Clock,
  ScrollText,
  Info,
} from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemHealth {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
  database: { status: string; readyState: number };
  issues: string[];
}
interface SystemLogEntry {
  _id: string;
  level: string;
  message: string;
  stack?: string;
  createdAt: string;
}

const REFRESH_MS = 30_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// Compact "time ago" for the log stream — exact timestamp still lives in the
// title attribute for anyone who needs the precise moment.
const fmtRelativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const LOG_LEVEL_STYLES: Record<string, { badge: string; icon: React.ReactNode; rail: string }> = {
  error: { badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200", icon: <XCircle className="h-3.5 w-3.5" />, rail: "bg-red-400" },
  warn: { badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5" />, rail: "bg-amber-400" },
};
const defaultLogStyle = { badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200", icon: <Info className="h-3.5 w-3.5" />, rail: "bg-slate-300" };

const StatCard = ({
  icon,
  label,
  value,
  sub,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  ok: boolean;
}) => (
  <div
    className={`relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md border-l-4 ${
      ok ? "border-l-emerald-400" : "border-l-red-400"
    }`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{icon}</div>
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {ok ? "OK" : "Issue"}
      </span>
    </div>
    <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{value}</p>
    <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-slate-400 mt-1 font-mono">{sub}</p>}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
export default function SuperAdminMonitoring() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<"all" | "warn" | "error">("all");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.get<SystemHealth>("/super-admin/health");
      setHealth(res.data);
      setLastUpdated(new Date());
    } catch {
      toast.error("Failed to load system health");
    }
  }, []);

  const fetchLogs = useCallback(async (level: "all" | "warn" | "error") => {
    try {
      const res = await api.get<{ logs: SystemLogEntry[] }>(`/super-admin/logs?level=${level}&limit=25`);
      setLogs(res.data.logs);
    } catch {
      toast.error("Failed to load system logs");
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchHealth(), fetchLogs(levelFilter)]);
  }, [fetchHealth, fetchLogs, levelFilter]);

  useEffect(() => {
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
    const timer = setInterval(refreshAll, REFRESH_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter]);

  const isHealthy = health?.status === "healthy";
  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">System Monitoring</h1>
            <p className="text-sm text-slate-500">Live platform health &amp; centralized logs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); refreshAll().finally(() => setLoading(false)); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      {health && (
        <div
          className={`rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${
            isHealthy ? "bg-emerald-50/60 border-emerald-200" : "bg-red-50/60 border-red-200"
          }`}
        >
          <div className={`p-2.5 rounded-full ${isHealthy ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
            {isHealthy ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <p className={`font-semibold ${isHealthy ? "text-emerald-800" : "text-red-800"}`}>
              System is {health.status.toUpperCase()}
            </p>
            {health.issues.length > 0 ? (
              <ul className="mt-1.5 text-sm text-slate-600 space-y-1">
                {health.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-red-400 shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">Database and application are operating normally.</p>
            )}
          </div>
        </div>
      )}

      {/* Core stat cards */}
      {health && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Database className="h-5 w-5" />}
            label="Database"
            value={health.database.status === "connected" ? "Connected" : health.database.status}
            ok={health.database.status === "connected"}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Server Uptime"
            value={fmtUptime(health.uptimeSeconds)}
            ok
          />
          <StatCard
            icon={<Cpu className="h-5 w-5" />}
            label="Memory (RSS)"
            value={`${health.memory.rssMB} MB`}
            sub={`Heap: ${health.memory.heapUsedMB} / ${health.memory.heapTotalMB} MB`}
            ok={health.memory.rssMB < 1024}
          />
          <StatCard
            icon={<ScrollText className="h-5 w-5" />}
            label="Recent Warnings / Errors"
            value={`${warnCount + errorCount}`}
            sub={`${errorCount} error · ${warnCount} warn (last 25)`}
            ok={errorCount === 0}
          />
        </div>
      )}

      {/* Centralized logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Recent System Logs</h2>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["all", "warn", "error"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                  levelFilter === lvl ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-50">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <ScrollText className="h-8 w-8 text-slate-200" />
              <span className="text-sm">No log entries yet</span>
            </div>
          ) : (
            logs.map((log) => {
              const style = LOG_LEVEL_STYLES[log.level] ?? defaultLogStyle;
              return (
                <div key={log._id} className="group flex items-start gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                  <span className={`mt-1.5 h-8 w-1 rounded-full shrink-0 ${style.rail}`} />
                  <span
                    className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style.badge}`}
                  >
                    {style.icon}
                    {log.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 break-words leading-snug">{log.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono" title={new Date(log.createdAt).toLocaleString("en-IN")}>
                      {fmtRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
