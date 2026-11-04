// src/dashboard/StaffDashboardHome.tsx
// Staff dashboard home — matches Admin Home.tsx design exactly.
// Permission-aware: only renders sections the staff member can access.

import React, { useEffect, useState, useCallback } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  MoreHorizontal,
  X,
  Eye,
  Info,
  RotateCcw,
  Clock,
  ArrowRight,
} from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useStaffPermissions } from "../context/StaffPermissionContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashSummary {
  orders: { total: number; thisMonth: number; processing: number; growthPct: number };
  revenue: { total: number; thisMonth: number; growthPct: number };
  products: { total: number };
  categories: { total: number };
}
interface RevenuePoint { date: string; revenue: number; orders: number }
interface StatusPoint extends Record<string, string | number> { status: string; count: number }
interface TopProduct {
  product: { id: string; name: string; image: string; price: number } | null;
  totalRevenue: number;
  totalQuantitySold: number;
  orderCount: number;
}
interface RecentOrder {
  id?: string;
  _id?: string;
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  user?: { username?: string; email?: string } | null;
  userId?: { username?: string; email?: string } | null;
  shippingAddress?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null;
}
interface PaymentMethod {
  method: string;
  count: number;
  revenue: number;
}

interface DashboardData {
  summary: DashSummary;
  revenueChart: RevenuePoint[];
  orderStatus: StatusPoint[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  paymentMethods: PaymentMethod[];
}

// ── Formatting helpers ───────────────────────────────────────────────────────
const RUP = "\u20B9";

const INR = (v: number | string | undefined | null) => {
  if (v === undefined || v === null || isNaN(Number(v))) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v));
};

const shortINR = (v: number | string | undefined | null) => {
  if (v === undefined || v === null || isNaN(Number(v))) return "0";
  const num = Number(v);
  if (num >= 1_00_000) return `${(num / 1_00_000).toFixed(1)}L`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-IN").format(Math.round(num));
};

const fmtDate = (s: string | undefined | null) => {
  if (!s) return "---";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "---" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const fmtDateTime = (s: string | undefined | null) => {
  if (!s) return "---";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "---"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const asId = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : "";

const shortId = (value: unknown) => {
  const id = asId(value);
  return id ? id.slice(-6).toUpperCase() : "------";
};

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "#ff9f43",
  CONFIRMED: "#7367f0",
  SHIPPED: "#00cfe8",
  DELIVERED: "#28c76f",
  CANCELLED: "#ea5455",
  RETURNED: "#8b5cf6",
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string; dot: string }> = {
    PROCESSING: { label: "Waiting", cls: "bg-amber-50 text-amber-700 border-amber-200/60", dot: "bg-amber-500" },
    CONFIRMED: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500" },
    SHIPPED: { label: "Shipped", cls: "bg-sky-50 text-sky-700 border-sky-200/60", dot: "bg-sky-500" },
    DELIVERED: { label: "Succeed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500" },
    CANCELLED: { label: "Canceled", cls: "bg-rose-50 text-rose-700 border-rose-200/60", dot: "bg-rose-500" },
    RETURNED: { label: "Returned", cls: "bg-purple-50 text-purple-700 border-purple-200/60", dot: "bg-purple-500" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-slate-50 text-slate-700 border-slate-200/60", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border tracking-tight shadow-2xs ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// Sleek SVG Wave Sparkline with gradient area fill
const SvgSparkline = ({
  color = "#6366f1",
  points = [30, 40, 35, 50, 45, 60, 55],
}: {
  color?: string;
  points?: number[];
}) => {
  const width = 84;
  const height = 30;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - 2 * pad);
    const y = height - pad - ((p - min) / range) * (height - 2 * pad);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });

  let pathD = `M ${coords[0][0]},${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const mx = Number(((x0 + x1) / 2).toFixed(1));
    pathD += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const areaD = `${pathD} L ${coords[coords.length - 1][0]},${height} L ${coords[0][0]},${height} Z`;
  const gradId = `staff-spark-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const last = coords[coords.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 select-none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
};

const MicroSparkline = SvgSparkline;

// ── Main Component ────────────────────────────────────────────────────────────
export default function StaffDashboardHome() {
  const { permissions, username, hasPermission } = useStaffPermissions();

  const canViewOrders   = hasPermission("ORDER_VIEW");
  const canViewProducts = hasPermission("PRODUCT_VIEW");

  const [data, setData]           = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);
  useBodyScrollLock(!!selectedOrder);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get("/staff/dashboard");
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load staff dashboard", err);
      toast.error("Failed to load dashboard data", { id: "staff-dash" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 60_000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 w-full font-sans antialiased animate-pulse">
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-xl" />
              <div className="h-4 w-64 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-6 w-24 bg-slate-200 rounded-lg" />
                  </div>
                  <div className="h-4 w-4 bg-slate-200 rounded" />
                </div>
                <div className="flex items-end justify-between pt-2">
                  <div className="h-8 w-8 bg-slate-200 rounded-xl" />
                  <div className="h-6 w-16 bg-slate-200 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-[420px]">
              <div className="h-6 w-32 bg-slate-200 rounded" />
            </div>
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-[420px]">
              <div className="h-6 w-28 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / no-data state ───────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500 bg-slate-50/50 w-full p-6">
        <AlertTriangle className="h-12 w-12 text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800">Dashboard Offline</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Failed to load dashboard data. Please check your connection and try again.
        </p>
        <button
          onClick={() => { setLoading(true); fetchDashboard(); }}
          className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    summary,
    revenueChart = [],
    orderStatus = [],
    topProducts = [],
    recentOrders = [],
    paymentMethods = [],
  } = data;

  const activeOrderStatuses = orderStatus.filter((s) => s.count > 0);
  const totalPaymentOrders = paymentMethods.reduce((a, b) => a + b.count, 0) || 1;

  // ── Custom bar chart tooltip ─────────────────────────────────────────────────
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const revItem = payload.find((p: any) => p.dataKey === "revenue");
    const ordItem = payload.find((p: any) => p.dataKey === "orders");
    const revVal = revItem ? Number(revItem.value || 0) : 0;
    const ordVal = ordItem ? Number(ordItem.value || 0) : 0;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[170px] animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800/80 text-[11px] font-bold text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{fmtDate(label)}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Revenue:
            </span>
            <span className="font-extrabold text-white font-mono text-[12px]">
              {RUP}{shortINR(revVal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Orders:
            </span>
            <span className="font-extrabold text-emerald-400 font-mono text-[12px]">
              {ordVal} {ordVal === 1 ? "order" : "orders"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 w-full font-sans antialiased relative">
      <div className="w-full space-y-6">

        {/* ── Header Block ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {username || "Staff"}!
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Real-time store activity overview
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-xs">
            {lastUpdated && (
              <span className="text-xs text-slate-400 font-mono font-medium">
                Sync: {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => { setLoading(true); fetchDashboard(); }}
              className="p-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg shadow-2xs transition-all active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── 1. Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-5 animate-scaleUp">
          {[
            ...(canViewOrders
              ? [
                  {
                    label: "Total Orders",
                    value: summary.orders.total.toLocaleString(),
                    subLabel: `${summary.orders.processing} processing`,
                    color: "#00cfe8",
                    icon: ShoppingCart,
                    points: [25, 45, 30, 65, 50, 80, 95],
                    accentBg: "bg-cyan-50",
                    accentCls: "text-cyan-600",
                  },
                  {
                    label: "Total Revenue",
                    value: `${RUP}${shortINR(summary.revenue.total)}`,
                    subLabel: `${RUP}${shortINR(summary.revenue.thisMonth)} this month`,
                    color: "#7367f0",
                    icon: IndianRupee,
                    points: [40, 35, 55, 45, 70, 60, 85],
                    accentBg: "bg-indigo-50",
                    accentCls: "text-indigo-600",
                  },
                  {
                    label: "Orders This Month",
                    value: summary.orders.thisMonth.toLocaleString(),
                    subLabel: "vs last 30 days",
                    color: "#ff9f43",
                    icon: Activity,
                    points: [30, 50, 40, 60, 45, 70, 65],
                    accentBg: "bg-amber-50",
                    accentCls: "text-amber-600",
                  },
                ]
              : []),
            ...(canViewProducts
              ? [
                  {
                    label: "Catalog Products",
                    value: summary.products.total.toLocaleString(),
                    subLabel: `${summary.categories.total} categories`,
                    color: "#28c76f",
                    icon: Package,
                    points: [50, 60, 55, 70, 65, 75, 80],
                    accentBg: "bg-emerald-50",
                    accentCls: "text-emerald-600",
                  },
                ]
              : []),
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-0.5"
            >
              {/* Subtle top accent line on hover */}
              <div
                className="absolute top-0 inset-x-0 h-1 transition-opacity opacity-0 group-hover:opacity-100 duration-200"
                style={{ backgroundColor: card.color }}
              />

              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.accentBg} ${card.accentCls} ring-1 ring-black/5 shadow-2xs transition-transform duration-200 group-hover:scale-105`}>
                  <card.icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
              </div>

              <div className="flex items-end justify-between pt-4">
                <p className="text-[10.5px] text-slate-400 font-semibold max-w-[110px] leading-snug">{card.subLabel}</p>
                <SvgSparkline color={card.color} points={card.points} />
              </div>
            </div>
          ))}
        </div>

        {/* ── No permissions empty state ── */}
        {!canViewOrders && !canViewProducts && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-slate-100">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-900 font-bold">Limited Access</p>
              <p className="text-slate-500 text-sm max-w-sm">
                Your current permissions don't include order or product access.
                Contact your admin to get analytics access.
              </p>
            </div>
          </div>
        )}

        {/* ── 2. Middle Grid (Recent Orders + Sales Chart) ── */}
        {canViewOrders && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Recent Orders Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between min-h-[420px] transition-all duration-300">
              <div>
                {/* Card Header: Pure white, airy & clean matching referral image */}
                <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div>
                    <h2 className="font-bold text-slate-900 text-[15px] tracking-tight">Recent Orders Queue</h2>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">Click on any entry to inspect transactional details</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Feed
                  </span>
                </div>

                {/* Table List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-medium text-slate-400 bg-white">
                        <th className="px-6 py-3.5 font-medium">Customer</th>
                        <th className="px-4 py-3.5 font-medium">Date</th>
                        <th className="px-4 py-3.5 font-medium text-center">Order ID</th>
                        <th className="px-4 py-3.5 font-medium">Amount</th>
                        <th className="px-4 py-3.5 font-medium text-center">Status</th>
                        <th className="px-6 py-3.5 font-medium text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 text-xs">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                            No recent orders retrieved.
                          </td>
                        </tr>
                      ) : (
                        recentOrders.slice(0, 5).map((order, idx) => {
                          const orderId = asId(order.id) || asId(order._id);
                          const customer = order.user ?? order.userId;
                          const initialLetter = (customer?.username?.charAt(0) || "U").toUpperCase();

                          // Pastel avatar background matching referral row style
                          const avatarColor =
                            order.orderStatus === "CONFIRMED" || order.orderStatus === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100/70"
                              : order.orderStatus === "CANCELLED"
                              ? "bg-rose-50 text-rose-600 border-rose-100/70"
                              : order.orderStatus === "PROCESSING"
                              ? "bg-amber-50 text-amber-600 border-amber-100/70"
                              : "bg-indigo-50 text-indigo-600 border-indigo-100/70";

                          return (
                            <tr
                              key={orderId || idx}
                              onClick={() => setSelectedOrder(order)}
                              className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer group"
                            >
                              {/* 1. Customer Profile */}
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs ${avatarColor}`}>
                                    {initialLetter}
                                  </div>
                                  <div className="truncate max-w-[155px]">
                                    <p className="font-semibold text-slate-900 text-sm truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                      {customer?.username ?? "Anonymous"}
                                    </p>
                                    <p className="text-[11.5px] text-slate-400 truncate mt-0.5 font-normal">
                                      {customer?.email ?? "No address metadata"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Order Date */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <p className="text-[13px] font-medium text-slate-700">
                                  {fmtDate(order.createdAt)}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-normal">
                                  {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </td>

                              {/* 3. Order ID Pill */}
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-100/80 text-slate-600 border border-slate-200/60 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                  #{shortId(orderId)}
                                </span>
                              </td>

                              {/* 4. Amount */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className="text-sm font-bold text-slate-900 tracking-tight font-sans">
                                  {RUP}{INR(order.finalAmount)}
                                </span>
                              </td>

                              {/* 5. Status Badge */}
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <StatusBadge status={order.orderStatus} />
                              </td>

                              {/* 6. Details Inspection Action */}
                              <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrder(order);
                                  }}
                                  className="text-slate-400 group-hover:text-indigo-600 hover:bg-indigo-50/80 p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Inspect order details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                <span>Showing 1 to {Math.min(5, recentOrders.length)} of {recentOrders.length} entries</span>
                <div className="flex items-center gap-1.5 font-bold">
                  <button className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs disabled:opacity-40" disabled>Previous</button>
                  <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs">1</span>
                  <button className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs disabled:opacity-40" disabled>Next</button>
                </div>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between min-h-[420px] transition-all duration-300">
              <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-start">
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Sales Timeline</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Revenue & orders – last 7 days</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1 text-indigo-600"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Revenue</span>
                  <span className="inline-flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Orders</span>
                </div>
              </div>

              <div className="flex-grow w-full h-[280px]">
                {revenueChart.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 italic gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Info className="h-6 w-6 text-slate-300 animate-pulse" />
                    <span>No data points found. Charts populate as orders are placed.</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={revenueChart} barGap={6}>
                      <defs>
                        <linearGradient id="staffRevGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="90%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="staffOrdGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <YAxis yAxisId="rev" orientation="left" tickFormatter={shortINR} tick={{ fontSize: 10, fill: "#6366f1", fontWeight: 700 }} axisLine={false} tickLine={false} width={42} />
                      <YAxis yAxisId="ord" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#10b981", fontWeight: 700 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area yAxisId="rev" type="monotone" dataKey="revenue" fill="url(#staffRevGradient)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", stroke: "#ffffff", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }} name="Revenue" />
                      <Bar yAxisId="ord" dataKey="orders" fill="url(#staffOrdGradient)" radius={[6, 6, 0, 0]} maxBarSize={22} name="Orders" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Bottom Section (Order Status Pie + Payment Methods + Top Products) ── */}
        {(canViewOrders || canViewProducts) && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

            {/* Order Status Pie */}
            {canViewOrders && (
              <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-5 min-h-[350px] flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Order Status</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Fulfillment distribution ratio</p>
                </div>

                {activeOrderStatuses.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">No orders yet.</div>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row md:flex-col items-center justify-center gap-5 mt-2">
                    <div className="relative h-38 w-38 flex items-center justify-center shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activeOrderStatuses}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            dataKey="count"
                            paddingAngle={4}
                            cornerRadius={4}
                            stroke="#ffffff"
                            strokeWidth={2}
                          >
                            {activeOrderStatuses.map((entry) => (
                              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#9CA3AF"} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <p className="text-base font-black text-slate-900 font-mono leading-none">{activeOrderStatuses.reduce((a, b) => a + b.count, 0)}</p>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-mono mt-0.5">Total Orders</p>
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-2 overflow-y-auto max-h-36 pr-1 custom-scrollbar">
                      {activeOrderStatuses.map((s) => {
                        const totalOrdersCount = activeOrderStatuses.reduce((a, b) => a + b.count, 0) || 1;
                        const pct = Math.round((s.count / totalOrdersCount) * 100);
                        const sliceColor = STATUS_COLORS[s.status] ?? "#9CA3AF";
                        return (
                          <div key={s.status} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100/90 hover:bg-slate-100/60 transition-all">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs" style={{ backgroundColor: sliceColor }} />
                                <span className="text-slate-800 font-bold truncate max-w-[100px] capitalize">
                                  {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200/70">{pct}%</span>
                                <span className="text-slate-900 text-[11px] font-black">{s.count}</span>
                              </div>
                            </div>
                            <div className="h-1 w-full rounded-full bg-slate-200/70 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: sliceColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods */}
            {canViewOrders && (
              <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-5 min-h-[350px] flex flex-col justify-between">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Settlement Gateways</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Gateway performance split analytics</p>
                </div>

                {paymentMethods.length > 0 && (
                  <div className="mt-2.5 mb-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <span>Channel Ratio</span>
                      <span>{paymentMethods.length} Methods</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-1 border border-slate-200/50">
                      {paymentMethods.map((pm) => {
                        const pct = Math.round((pm.count / totalPaymentOrders) * 100);
                        const isOnline = pm.method === "ONLINE";
                        return (
                          <div
                            key={pm.method}
                            style={{ width: `${Math.max(pct, 5)}%` }}
                            className={`h-full rounded-full ${
                              isOnline
                                ? "bg-gradient-to-r from-indigo-500 to-indigo-600"
                                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            } transition-all duration-500`}
                            title={`${pm.method}: ${pct}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center gap-3 mt-1">
                  {paymentMethods.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center">No payment gateway stats found.</p>
                  ) : (
                    paymentMethods.map((pm) => {
                      const pct = Math.round((pm.count / totalPaymentOrders) * 100);
                      const isOnline = pm.method === "ONLINE";
                      return (
                        <div key={pm.method} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2 hover:bg-white hover:shadow-xs transition-all">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2.5 text-slate-800">
                              <div className={`p-1.5 rounded-lg ${isOnline ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"}`}>
                                {isOnline ? <CreditCard className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block leading-tight">{isOnline ? "Online Platform" : "Cash on Delivery"}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{pm.count} dispatches</span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${isOnline ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60" : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${isOnline ? "from-indigo-600 to-indigo-400" : "from-emerald-600 to-emerald-400"} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-0.5 font-mono">
                            <span>Total Yield</span>
                            <span className="text-slate-900 font-black text-[12px]">{RUP}{shortINR(pm.revenue)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Top Products */}
            {canViewProducts && (
              <div className={`${canViewOrders ? "md:col-span-4" : "md:col-span-8"} bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-5 min-h-[350px] flex flex-col justify-between`}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Top Seller &amp; Inventory</h2>
                  <p className="text-[11px] text-slate-400 font-medium">High performers by revenue</p>
                </div>

                <div className="flex-1 overflow-y-auto max-h-64 custom-scrollbar pr-1 space-y-2 mt-2.5">
                  {topProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No top selling product analytics yet.</p>
                  ) : (
                    topProducts.slice(0, 5).map((tp, idx) => {
                      const rankBadges = [
                        "bg-amber-500 text-white shadow-2xs",
                        "bg-slate-400 text-white shadow-2xs",
                        "bg-amber-700 text-white shadow-2xs",
                        "bg-slate-200 text-slate-600",
                        "bg-slate-200 text-slate-600",
                      ];
                      return (
                        <div key={tp.product?.id ?? idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${rankBadges[idx] || rankBadges[3]}`}>
                              #{idx + 1}
                            </span>
                            {tp.product?.image ? (
                              <img src={tp.product.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Package className="h-3 w-3 text-slate-400" />
                              </div>
                            )}
                            <div className="truncate text-xs">
                              <p className="font-bold text-slate-900 truncate max-w-[125px] leading-tight">{tp.product?.name ?? "Catalog Item"}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{tp.totalQuantitySold} dispatches · {tp.orderCount} orders</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-indigo-600 font-mono shrink-0">{RUP}{shortINR(tp.totalRevenue)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">

            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-1 rounded-md border border-[var(--primary-color)]/20 uppercase tracking-wide">
                  Order ID: #{shortId(selectedOrder.id || selectedOrder._id)}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Inspecting Transaction</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Order Status Timeline */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Fulfillment Sequence</h4>
                {selectedOrder.orderStatus === "CANCELLED" ? (
                  // The linear 4-step tracker below has no representation for "cancelled" —
                  // every comparison against it fell through to -1 >= -1, which is true,
                  // so step 1 rendered as a false "completed" checkmark instead of showing
                  // the order never progressed at all. A cancelled order gets its own
                  // banner instead of a stepper that can't express this state.
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                    <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-rose-700 uppercase tracking-wide">Order Cancelled</p>
                      <p className="text-xs text-rose-600 mt-0.5">This order was cancelled and did not proceed through fulfillment.</p>
                    </div>
                  </div>
                ) : selectedOrder.orderStatus === "RETURNED" ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3.5">
                    <RotateCcw className="h-6 w-6 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-purple-700 uppercase tracking-wide">Order Returned</p>
                      <p className="text-xs text-purple-600 mt-0.5">This shipment was returned by courier and stock has been restored to inventory.</p>
                    </div>
                  </div>
                ) : (
                <div className="flex items-center justify-between w-full relative px-6">
                  <div className="absolute top-[18px] left-[15%] right-[15%] h-0.5 bg-slate-200/80 -z-10" />
                  {[
                    { key: "PROCESSING", label: "Waiting" },
                    { key: "CONFIRMED", label: "Confirmed" },
                    { key: "SHIPPED", label: "Shipped" },
                    { key: "DELIVERED", label: "Succeed" },
                  ].map((step, sIdx) => {
                    const isCompleted = ["CONFIRMED", "SHIPPED", "DELIVERED"].indexOf(selectedOrder.orderStatus) >= ["CONFIRMED", "SHIPPED", "DELIVERED"].indexOf(step.key);
                    const isActive = selectedOrder.orderStatus === step.key;
                    return (
                      <div key={step.key} className="flex flex-col items-center space-y-2 z-10 flex-1">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          isActive
                            ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] ring-4 ring-[var(--primary-color)]/10 shadow-md"
                            : isCompleted
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {isCompleted && !isActive ? <CheckCircle className="h-4 w-4" /> : sIdx + 1}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-[var(--primary-color)]" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Customer card */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex gap-4 items-center">
                <div className="h-12 w-12 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center font-black text-lg shadow-sm border border-[var(--primary-color)]/10">
                  {((selectedOrder.user?.username || selectedOrder.userId?.username) ?? "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Client Identity</p>
                  <p className="font-bold text-slate-900 truncate">{selectedOrder.user?.username || selectedOrder.userId?.username || "Anonymous Customer"}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{selectedOrder.user?.email || selectedOrder.userId?.email || "No email metadata"}</p>
                </div>
              </div>

              {/* Financial grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/20">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settlement Value</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{RUP}{INR(selectedOrder.finalAmount)}</p>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1.5 inline-flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Recorded
                  </div>
                </div>
                <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/20">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment Channel</p>
                  <p className="text-sm font-bold text-slate-900 mt-2.5 inline-flex items-center gap-1.5">
                    {selectedOrder.paymentMethod === "ONLINE" ? (
                      <><CreditCard className="h-4 w-4 text-indigo-500" /> Online Gateway</>
                    ) : (
                      <><Banknote className="h-4 w-4 text-emerald-500" /> Cash on Delivery</>
                    )}
                  </p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="p-4 border border-slate-100 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between font-semibold border-b border-slate-100/50 pb-2">
                  <span className="text-slate-400">Transaction Date</span>
                  <span className="text-slate-700 font-mono">{fmtDateTime(selectedOrder.createdAt)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1">
                  <span className="text-slate-400">Fulfillment Status</span>
                  <span className="font-mono"><StatusBadge status={selectedOrder.orderStatus} /></span>
                </div>
              </div>

              {/* Shipping / Delivery Address */}
              {selectedOrder.shippingAddress && (
                <div className="p-4 border border-slate-100 rounded-2xl space-y-3 bg-slate-50/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5 text-[var(--primary-color)]" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delivery Address</p>
                  </div>
                  {selectedOrder.shippingAddress.fullAddress && (
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                      {selectedOrder.shippingAddress.fullAddress}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                    {selectedOrder.shippingAddress.city && (
                      <span><span className="text-slate-400">City: </span>{selectedOrder.shippingAddress.city}</span>
                    )}
                    {selectedOrder.shippingAddress.state && (
                      <span><span className="text-slate-400">State: </span>{selectedOrder.shippingAddress.state}</span>
                    )}
                    {selectedOrder.shippingAddress.zipCode && (
                      <span><span className="text-slate-400">PIN: </span>{selectedOrder.shippingAddress.zipCode}</span>
                    )}
                    {selectedOrder.shippingAddress.country && (
                      <span><span className="text-slate-400">Country: </span>{selectedOrder.shippingAddress.country}</span>
                    )}
                  </div>
                  {selectedOrder.shippingAddress.lat && selectedOrder.shippingAddress.lng && (
                    <a
                      href={`https://maps.google.com/?q=${selectedOrder.shippingAddress.lat},${selectedOrder.shippingAddress.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--primary-color)] hover:underline mt-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      View on Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const email = selectedOrder.user?.email || selectedOrder.userId?.email || "";
                  if (email) { navigator.clipboard.writeText(email); toast.success("Client email copied!"); }
                  else toast.error("No email to copy!");
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                Copy Client Email
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover,#4a6346)] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
