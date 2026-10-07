import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  BarChart,
  Bar,
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
  Users,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Activity,
  CreditCard,
  Banknote,
  MoreHorizontal,
  X,
  Eye,
  Info,
  RotateCcw,
  ChevronRight,
  Search,
  ExternalLink,
} from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardSummary {
  revenue: { total: number; thisMonth: number; today: number; growthPct: number };
  orders: {
    total: number;
    thisMonth: number;
    today: number;
    pending: number;
    growthPct: number;
  };
  customers: { total: number; thisMonth: number; growthPct: number };
  products: { total: number };
}

interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}
interface OrderStatusPoint extends Record<string, string | number> {
  status: string;
  count: number;
}
interface CategoryPoint {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
}
interface TopProduct {
  product: {
    id?: string;
    _id?: string;
    name?: string;
    price?: number;
    image?: string;
  } | null;
  totalRevenue: number;
  totalQuantitySold: number;
}
interface LowStockProduct {
  id?: string;
  _id?: string;
  name?: string;
  stock: number;
  image?: string;
  category?: { name?: string } | null;
  categoryId?: { name?: string } | null;
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
  summary: DashboardSummary;
  salesChart: SalesPoint[];
  orderStatus: OrderStatusPoint[];
  topCategories: CategoryPoint[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  recentOrders: RecentOrder[];
  paymentMethods: PaymentMethod[];
}

// ── Mock Fallback / Demo Data for Premium Offline Exploration ───────────────
const MOCK_DASHBOARD_DATA: DashboardData = {
  summary: {
    revenue: { total: 4825900, thisMonth: 1250300, today: 42500, growthPct: 18.4 },
    orders: { total: 1256, thisMonth: 342, today: 9, pending: 24, growthPct: 12.8 },
    customers: { total: 842, thisMonth: 112, growthPct: 15.6 },
    products: { total: 245 }
  },
  salesChart: [
    { date: "2026-05-19", revenue: 150000, orders: 40 },
    { date: "2026-05-20", revenue: 210000, orders: 55 },
    { date: "2026-05-21", revenue: 180000, orders: 48 },
    { date: "2026-05-22", revenue: 280000, orders: 70 },
    { date: "2026-05-23", revenue: 240000, orders: 62 },
    { date: "2026-05-24", revenue: 320000, orders: 85 },
    { date: "2026-05-25", revenue: 290000, orders: 75 }
  ],
  orderStatus: [
    { status: "PROCESSING", count: 24 },
    { status: "CONFIRMED", count: 48 },
    { status: "SHIPPED", count: 112 },
    { status: "DELIVERED", count: 1042 },
    { status: "CANCELLED", count: 30 }
  ],
  topCategories: [
    { id: "cat1", name: "Sarees & Lehengas", revenue: 2450000, unitsSold: 420 },
    { id: "cat2", name: "Designer Salwars", revenue: 1250000, unitsSold: 280 },
    { id: "cat3", name: "Anarkali Suits", revenue: 840000, unitsSold: 180 },
    { id: "cat4", name: "Fusion Wear", revenue: 285900, unitsSold: 85 }
  ],
  topProducts: [
    {
      product: { id: "p1", name: "Royal Kanchipuram Silk Saree", price: 15000, image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150" },
      totalRevenue: 450000,
      totalQuantitySold: 30
    },
    {
      product: { id: "p2", name: "Embellished Georgette Lehenga", price: 25000, image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=150" },
      totalRevenue: 375000,
      totalQuantitySold: 15
    }
  ],
  lowStockProducts: [
    { id: "p3", name: "Floral Banarasi Dupatta", stock: 2, image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=150", category: { name: "Dupattas" } },
    { id: "p4", name: "Embroidered Kurta Set", stock: 0, image: "", category: { name: "Kurtas" } }
  ],
  recentOrders: [
    {
      id: "ord101",
      finalAmount: 18500,
      orderStatus: "PROCESSING",
      paymentStatus: "SUCCESS",
      paymentMethod: "ONLINE",
      createdAt: new Date().toISOString(),
      user: { username: "Priya Sharma", email: "priya@example.com" }
    },
    {
      id: "ord102",
      finalAmount: 25000,
      orderStatus: "DELIVERED",
      paymentStatus: "SUCCESS",
      paymentMethod: "ONLINE",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      user: { username: "Anjali Menon", email: "anjali.m@example.com" }
    },
    {
      id: "ord103",
      finalAmount: 9500,
      orderStatus: "CONFIRMED",
      paymentStatus: "PENDING",
      paymentMethod: "COD",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      user: { username: "Meera Nair", email: "meera.nair@example.com" }
    },
    {
      id: "ord104",
      finalAmount: 12000,
      orderStatus: "SHIPPED",
      paymentStatus: "SUCCESS",
      paymentMethod: "ONLINE",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      user: { username: "Kiran Patel", email: "kiran.patel@example.com" }
    },
    {
      id: "ord105",
      finalAmount: 15000,
      orderStatus: "CANCELLED",
      paymentStatus: "REFUNDED",
      paymentMethod: "ONLINE",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      user: { username: "Ritu Verma", email: "ritu.v@example.com" }
    }
  ],
  paymentMethods: [
    { method: "ONLINE", count: 942, revenue: 3825900 },
    { method: "COD", count: 314, revenue: 1000000 }
  ]
};

// ── Bulletproof Formatting Helpers ───────────────────────────────────────────
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
  return isNaN(d.getTime()) ? "---" : d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const asId = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : "";

const shortId = (value: unknown) => {
  const id = asId(value);
  return id ? id.slice(-6).toUpperCase() : "------";
};

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "#ff9f43",
  CONFIRMED: "#7367f0",
  SHIPPED: "#00cfe8",
  DELIVERED: "#28c76f",
  CANCELLED: "#ea5455",
  RETURNED: "#8b5cf6",
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    PROCESSING: { label: "Waiting", cls: "bg-amber-50 text-amber-600 border-amber-100" },
    CONFIRMED: { label: "Confirmed", cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    SHIPPED: { label: "Shipped", cls: "bg-cyan-50 text-cyan-600 border-cyan-100" },
    DELIVERED: { label: "Succeed", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    CANCELLED: { label: "Canceled", cls: "bg-rose-50 text-rose-600 border-rose-100" },
    RETURNED: { label: "Returned", cls: "bg-purple-50 text-purple-600 border-purple-100" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border tracking-wide ${c.cls}`}>
      {c.label}
    </span>
  );
};

const MicroSparkline = ({ color = "#10b981", points = [30, 40, 35, 50, 45, 60, 55] }) => (
  <div className="h-8 w-24 flex items-end gap-0.5 opacity-80 pt-2">
    {points.map((p, i) => (
      <div
        key={i}
        className="w-full rounded-t-sm transition-all duration-300"
        style={{ height: `${p}%`, backgroundColor: color }}
      />
    ))}
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = location.pathname.startsWith("/super-admin-dashboard")
    ? "/super-admin-dashboard"
    : location.pathname.startsWith("/staff-dashboard")
      ? "/staff-dashboard"
      : "/admin-dashboard";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [isDemoMode, setIsDemoMode] = useState(false);

  // States for Premium Enhancements
  const [filterRange, setFilterRange] = useState<"all" | "7d" | "30d" | "today">("all");
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);
  const [showTopSellerInventoryModal, setShowTopSellerInventoryModal] = useState(false);
  const [topSellerInventoryTab, setTopSellerInventoryTab] = useState<"top-sellers" | "stock-alerts">("top-sellers");
  const [topSellerSearch, setTopSellerSearch] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  useBodyScrollLock(!!selectedOrder || showTopSellerInventoryModal || showCategoryModal || showGatewayModal);

  // Fetch admin profile for Dynamic Greetings
  const fetchAdminProfile = async () => {
    try {
      const res = await api.get("/admin/adminProfile");
      const name = res.data?.adminData?.username || res.data?.adminData?.name || "Administrator";
      setAdminName(name);
    } catch {
      // Non-critical fallback
    }
  };

  const fetchDashboard = useCallback(async (range: "all" | "7d" | "30d" | "today") => {
    try {
      const res = await api.get(`/admin/dashboard?range=${range}`);
      setData(res.data);
      setIsDemoMode(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(filterRange);
    fetchAdminProfile();
    const timer = setInterval(() => {
      // Only auto-refresh if we are not in mock Demo Mode
      if (!isDemoMode) {
        fetchDashboard(filterRange);
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [fetchDashboard, filterRange, isDemoMode]);

  // Dynamic range filter calculations for Sales Timeline
  const filteredSalesChart = useMemo(() => {
    if (!data?.salesChart) return [];
    const now = new Date();
    return data.salesChart.filter(point => {
      const pDate = new Date(point.date);
      if (isNaN(pDate.getTime())) return true;
      
      const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24);
      if (filterRange === "today") {
        return pDate.toDateString() === now.toDateString();
      }
      if (filterRange === "7d") {
        return diffDays <= 7;
      }
      if (filterRange === "30d") {
        return diffDays <= 30;
      }
      return true;
    });
  }, [data?.salesChart, filterRange]);

  // Real summary for the selected range, straight from the backend — no client-side
  // faking. The backend already returns range-appropriate numbers for "total"/"thisMonth"
  // (see admin.controller.ts getDashboardData: for range="all" these two intentionally
  // differ — all-time total vs. trailing-30-day figure — for every other range they're
  // the same windowed value, which is why some cards visually mirror each other).
  const summary: DashboardSummary = data?.summary ?? {
    revenue: { total: 0, thisMonth: 0, today: 0, growthPct: 0 },
    orders: { total: 0, thisMonth: 0, today: 0, pending: 0, growthPct: 0 },
    customers: { total: 0, thisMonth: 0, growthPct: 0 },
    products: { total: 0 },
  };

  // Loading state with Premium Shimmer Skeletons
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 w-full font-sans antialiased animate-pulse">
        <div className="w-full mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded-xl" />
              <div className="h-4 w-64 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl" />
          </div>

          {/* Core metrics row skeletons (6 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-6 w-24 bg-slate-200 rounded-lg" />
                  </div>
                  <div className="h-4 w-4 bg-slate-200 rounded" />
                </div>
                <div className="flex items-end justify-between pt-2">
                  <div className="h-8 w-8 bg-slate-200 rounded-xl animate-pulse" />
                  <div className="h-6 w-16 bg-slate-200 rounded-md" />
                </div>
              </div>
            ))}
          </div>

          {/* Mid section timeline skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-[420px] space-y-4">
              <div className="h-6 w-32 bg-slate-200 rounded" />
              <div className="space-y-2 pt-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-32 bg-slate-200 rounded flex-1" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-[420px] space-y-4">
              <div className="h-6 w-28 bg-slate-200 rounded" />
              <div className="h-[300px] bg-slate-200 rounded-xl w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error boundary with high-fidelity "Demo Mode" fallback trigger
  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500 bg-slate-50/50 w-full p-6">
        <AlertTriangle className="h-12 w-12 text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800">Operational Connectivity Offline</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">Failed to sync live storefront database indicators. You can retry the connection or view the dashboard in offline Demo Mode.</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={fetchDashboard}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
          >
            Retry Connection
          </button>
          <button
            onClick={() => {
              setData(MOCK_DASHBOARD_DATA);
              setIsDemoMode(true);
              setLastUpdated(new Date());
              toast.success("Boutique Demo Mode active!");
            }}
            className="px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold uppercase tracking-wider rounded-xl active:scale-95 transition-all shadow-sm"
          >
            Activate Demo Mode
          </button>
        </div>
      </div>
    );
  }

  const {
    salesChart = [],
    orderStatus = [],
    topCategories = [],
    topProducts = [],
    lowStockProducts = [],
    recentOrders = [],
    paymentMethods = [],
  } = data;

  const totalPaymentOrders = paymentMethods.reduce((a, b) => a + b.count, 0) || 1;

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold text-gray-700 mb-2">{fmtDate(label)}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-gray-500 capitalize">{p.name || p.dataKey}:</span>
            <span className="font-semibold" style={{ color: p.color }}>
              {p.dataKey === "orders" ? p.value : `${RUP}${INR(p.value)}`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 w-full font-sans antialiased relative">
      <div className="w-full mx-auto space-y-6">
        
        {/* ── Dashboard Header Block ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {adminName}!
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Real-time operational distribution logs matrix {isDemoMode && "(Demo Mode)"}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Range Selector Tab Group */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-xs">
              {[
                { id: "all", label: "All Time" },
                { id: "30d", label: "30 Days" },
                { id: "7d", label: "7 Days" },
                { id: "today", label: "Today" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterRange(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                    filterRange === tab.id
                      ? "bg-[var(--primary-color)] text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-xs">
              {lastUpdated && (
                <span className="text-xs text-slate-400 font-mono font-medium">
                  Sync: {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => { setLoading(true); fetchDashboard(filterRange); }}
                className="p-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg shadow-2xs transition-all active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 1. Top Core Stat Cards Row (Fully restored to 6 cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 animate-scaleUp">
          {[
            {
              label: "Total Sells",
              value: summary.orders.total.toLocaleString(),
              subLabel: "Total checkout queue dispatches",
              color: "#00cfe8",
              icon: ShoppingCart,
              points: [25, 45, 30, 65, 50, 80, 95],
              accentBg: "bg-cyan-50",
              accentCls: "text-cyan-600",
            },
            {
              label: "Orders Value",
              value: `${RUP}${INR(summary.revenue.total)}`,
              subLabel: "Accumulated gross volume",
              color: "#7367f0",
              icon: IndianRupee,
              points: [40, 35, 55, 45, 70, 60, 85],
              accentBg: "bg-indigo-50",
              accentCls: "text-indigo-600",
            },
            {
              label: "Daily Orders",
              value: summary.orders.today.toLocaleString(),
              subLabel: `${summary.orders.pending} pending execution`,
              color: "#ff9f43",
              icon: Activity,
              points: [30, 50, 40, 60, 45, 70, 65],
              accentBg: "bg-amber-50",
              accentCls: "text-amber-600",
            },
            {
              label: "Daily Revenue",
              value: `${RUP}${INR(summary.revenue.today)}`,
              subLabel: "Current cycle's collections",
              color: "#28c76f",
              icon: TrendingUp,
              points: [20, 40, 35, 55, 50, 75, 90],
              accentBg: "bg-emerald-50",
              accentCls: "text-emerald-600",
            },
            {
              label: "Active Customers",
              value: summary.customers.total.toLocaleString(),
              subLabel: `+${summary.customers.thisMonth} new this month`,
              color: "#a3c4a0",
              icon: Users,
              points: [15, 30, 25, 40, 35, 50, 60],
              accentBg: "bg-green-50/50",
              accentCls: "text-[#5e785a]",
            },
            {
              label: "Catalog Products",
              value: summary.products.total.toLocaleString(),
              subLabel: `${lowStockProducts.length} items low stock alert`,
              color: "#ea5455",
              icon: Package,
              points: [50, 50, 50, 50, 50, 50, 50],
              accentBg: "bg-rose-50",
              accentCls: "text-rose-600",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-0.5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{card.value}</p>
                </div>
              </div>
              
              <div className="flex items-end justify-between pt-4">
                <div className="space-y-0.5">
                  <div className={`p-2 rounded-xl inline-block ${card.accentBg} ${card.accentCls}`}>
                    <card.icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5 block">{card.subLabel}</p>
                </div>
                <MicroSparkline color={card.color} points={card.points} />
              </div>
            </div>
          ))}
        </div>

        {/* ── 2. Middle Grid Block Area (Recent Orders Table + Sales Chart) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* RECENT ORDERS TABLE LIST (Left Side - 7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between min-h-[420px] transition-all duration-300">
            <div>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Recent Orders Queue</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Click on any entry to inspect transactional details</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-light)]/10 px-2 py-0.5 rounded border border-[var(--primary-color)]/20">Live Feed</span>
                  <button
                    type="button"
                    onClick={() => navigate("/admin-dashboard/order-management")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Order Profile</th>
                      <th className="px-4 py-3">Order Date</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No recent orders retrieved.</td>
                      </tr>
                    ) : (
                      recentOrders.slice(0, 6).map((order, idx) => {
                        const orderId = asId(order.id) || asId(order._id);
                        const customer = order.user ?? order.userId;
                        return (
                          <tr 
                            key={orderId || idx} 
                            onClick={() => setSelectedOrder(order)}
                            className="hover:bg-slate-50/60 transition-colors duration-150 cursor-pointer group"
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 font-bold text-[10px] text-slate-700 flex items-center justify-center font-mono border border-slate-200/60 group-hover:bg-[var(--primary-light)]/10 group-hover:text-[var(--primary-color)] group-hover:border-[var(--primary-color)]/20 transition-all">
                                  {shortId(orderId)}
                                </div>
                                <div className="truncate max-w-[140px]">
                                  <p className="font-bold text-slate-900 truncate">{customer?.username ?? "Anonymous"}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{customer?.email ?? "No address metadata"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap font-mono text-[11px]">
                              {fmtDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString("en-IN", {hour: "2-digit", minute: "2-digit"})}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900 font-mono text-[13px]">
                              {RUP}{INR(order.finalAmount)}
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <StatusBadge status={order.orderStatus} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="text-slate-400 group-hover:text-[var(--primary-color)] bg-transparent group-hover:bg-[var(--primary-light)]/10 p-1.5 rounded-lg transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" />
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
            {/* Table structural footer */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500 font-medium">
              <span>Showing {Math.min(6, recentOrders.length)} of {recentOrders.length} recent orders</span>
              <button
                type="button"
                onClick={() => navigate("/admin-dashboard/order-management")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                Open Order Management Pipeline &rarr;
              </button>
            </div>
          </div>

          {/* MAIN SALES OVERVIEW CHART WIDGET (Right Side - 5 Columns) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between min-h-[420px] transition-all duration-300">
            <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-start">
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Sales timeline</h2>
                <p className="text-[11px] text-slate-400 font-medium">Visualizing operational yield distribution</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="inline-flex items-center gap-1 text-indigo-600"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Revenue</span>
                <span className="inline-flex items-center gap-1 text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sells</span>
              </div>
            </div>

            <div className="flex-grow w-full h-[280px]">
              {filteredSalesChart.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 italic gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Info className="h-6 w-6 text-slate-300 animate-pulse" />
                  <span>No data points found. Live charts will populate as checkout orders are placed.</span>
                  <span className="text-[10px] text-[var(--primary-color)] font-bold hover:underline cursor-pointer" onClick={() => {
                    setData(MOCK_DASHBOARD_DATA);
                    setIsDemoMode(true);
                    setLastUpdated(new Date());
                    toast.success("Boutique Demo Mode active!");
                  }}>Activate Demo Mode to inspect sample metrics</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
                  <BarChart data={filteredSalesChart} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="rev" orientation="left" tickFormatter={shortINR} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="ord" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar yAxisId="rev" dataKey="revenue" fill="#7367f0" radius={[3, 3, 0, 0]} name="Revenue" maxBarSize={16} />
                    <Bar yAxisId="ord" dataKey="orders" fill="#28c76f" radius={[3, 3, 0, 0]} name="Orders" maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Bottom Layer Section (Category Ratios + Settlement Channels) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* REVENUE BY CATEGORY RADIAL TILE (Spans 4 columns) */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 min-h-[350px] flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Revenue By Category</h2>
                <p className="text-[11px] text-slate-400 font-medium">Fulfillment categories distribution ratio</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {topCategories.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">No breakdown logs.</div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row md:flex-col items-center justify-center gap-6 mt-2">
                <div className="relative h-36 w-36 flex items-center justify-center flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        dataKey="revenue"
                        paddingAngle={3}
                      >
                        {topCategories.map((entry, index) => (
                          <Cell key={entry.id} fill={["#7367f0", "#ff9f43", "#28c76f", "#00cfe8", "#ea5455"][index % 5]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <p className="text-sm font-black text-slate-900 truncate max-w-[80px]">{topCategories[0]?.name || "Catalog"}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">{INR(topCategories[0]?.revenue || 0)}</p>
                  </div>
                </div>

                {/* Legend details row syncing with radial array colors */}
                <div className="flex-1 w-full space-y-1.5 overflow-y-auto max-h-32 pr-1 custom-scrollbar">
                  {topCategories.slice(0, 4).map((cat, index) => (
                    <div key={cat.id} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: ["#7367f0", "#ff9f43", "#28c76f", "#00cfe8", "#ea5455"][index % 5] }} />
                        <span className="text-slate-600 font-medium truncate max-w-[100px]">{cat.name}</span>
                      </div>
                      <span className="text-slate-900 font-mono text-[11px] font-bold">{INR(cat.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SETTLEMENT GATEWAY SECTOR CARD (Spans 4 columns) */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 min-h-[350px] flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Settlement Gateways</h2>
                <p className="text-[11px] text-slate-400 font-medium">Gateway performance split analytics</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-4 mt-2">
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center">No payment gateway stats found.</p>
              ) : (
                paymentMethods.map((pm) => {
                  const pct = Math.round((pm.count / totalPaymentOrders) * 100);
                  const isOnline = pm.method === "ONLINE";
                  return (
                    <div key={pm.method} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2 text-slate-800">
                          {isOnline ? <CreditCard className="h-4 w-4 text-indigo-500" /> : <Banknote className="h-4 w-4 text-emerald-500" />}
                          <span className="truncate">{isOnline ? "Online Platform" : "Cash on Delivery"}</span>
                        </div>
                        <span className="font-mono text-slate-900">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${isOnline ? "from-indigo-600 to-indigo-400" : "from-emerald-600 to-emerald-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-0.5 font-mono">
                        <span>Total Yield</span>
                        <span className="text-slate-900 font-black">{RUP}{INR(pm.revenue)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* TOP SELLER & INVENTORY ALERT LOGS PANEL (Spans 4 columns) */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 min-h-[350px] flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Top Seller &amp; Inventory</h2>
                <p className="text-[11px] text-slate-400 font-medium">High performers vs replenishment markers</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTopSellerInventoryModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-72 custom-scrollbar pr-1 space-y-2.5 mt-3">
              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No top selling product analytics yet.</p>
              ) : (
                topProducts.slice(0, 4).map((tp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2 truncate">
                      {tp.product?.image ? (
                        <img src={tp.product.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0"><Package className="h-3 w-3 text-slate-400" /></div>
                      )}
                      <div className="truncate text-xs">
                        <p className="font-bold text-slate-900 truncate max-w-[130px]">{tp.product?.name ?? "Catalog Item"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{tp.totalQuantitySold} dispatches</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-600 font-mono">{RUP}{INR(tp.totalRevenue)}</span>
                  </div>
                ))
              )}

              {/* Low stock notifications row header wrapper */}
              {lowStockProducts.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-dashed border-slate-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Stock Threshold Alert</span>
                </div>
              )}

              {/* Low stock products segment mapping array */}
              {lowStockProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 gap-1 text-[11px] text-[#5e785a] font-bold bg-green-50/40 border border-dashed border-[#5e785a]/25 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-[#5e785a]" />
                  All inventory stocks are healthy
                </div>
              ) : (
                lowStockProducts.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-amber-100 bg-amber-50/20">
                    <div className="flex items-center gap-2 truncate">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0"><Package className="h-3 w-3 text-slate-400" /></div>
                      )}
                      <div className="truncate text-xs">
                        <p className="font-bold text-amber-950 truncate max-w-[130px]">{p.name ?? "Unnamed"}</p>
                        <p className="text-[10px] text-amber-500 font-semibold">{p.category?.name ?? p.categoryId?.name ?? "Taxonomy matrix"}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${p.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                      {p.stock === 0 ? "OOS" : `${p.stock} Unit`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Order Detailed Inspection Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-light)]/10 px-2.5 py-1 rounded-md border border-[var(--primary-color)]/20 uppercase tracking-wide">
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Stepper Timeline Tracker */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Fulfillment Sequence Tracker</h4>
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
                  {/* Background Progress Line */}
                  <div className="absolute top-[18px] left-[15%] right-[15%] h-0.5 bg-slate-200/80 -z-10" />

                  {[
                    { key: "PROCESSING", label: "Waiting", color: "amber" },
                    { key: "CONFIRMED", label: "Confirmed", color: "indigo" },
                    { key: "SHIPPED", label: "Shipped", color: "cyan" },
                    { key: "DELIVERED", label: "Succeed", color: "emerald" },
                  ].map((step, sIdx) => {
                    const isCompleted = ["CONFIRMED", "SHIPPED", "DELIVERED"].indexOf(selectedOrder.orderStatus) >= ["CONFIRMED", "SHIPPED", "DELIVERED"].indexOf(step.key);
                    const isActive = selectedOrder.orderStatus === step.key;

                    return (
                      <div key={step.key} className="flex flex-col items-center space-y-2 z-10 flex-1">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          isActive
                            ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] ring-4 ring-[var(--primary-light)]/10 shadow-md"
                            : isCompleted
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {isCompleted && !isActive ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            sIdx + 1
                          )}
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

              {/* Client Card */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex gap-4 items-center">
                <div className="h-12 w-12 rounded-2xl bg-[var(--primary-light)]/10 text-[var(--primary-color)] flex items-center justify-center font-black text-lg shadow-sm border border-[var(--primary-color)]/10">
                  {(selectedOrder.user?.username || selectedOrder.userId?.username || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Client Identity</p>
                  <p className="font-bold text-slate-900 truncate">{selectedOrder.user?.username || selectedOrder.userId?.username || "Anonymous Customer"}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{selectedOrder.user?.email || selectedOrder.userId?.email || "No email metadata"}</p>
                </div>
              </div>

              {/* Financial Status split grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/20">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settlement Value</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{RUP}{INR(selectedOrder.finalAmount)}</p>
                  <div className="text-[10px] text-emerald-600 font-bold mt-1.5 inline-flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Fully Cleared
                  </div>
                </div>
                
                <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/20">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settlement Channel</p>
                  <p className="text-sm font-bold text-slate-900 mt-2.5 inline-flex items-center gap-1.5 capitalize">
                    {selectedOrder.paymentMethod === "ONLINE" ? (
                      <>
                        <CreditCard className="h-4 w-4 text-indigo-500" />
                        Online Gateway
                      </>
                    ) : (
                      <>
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        Cash on Delivery (COD)
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Direct payout routing</p>
                </div>
              </div>

              {/* DateTime Log Details */}
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
                    <Truck className="h-3.5 w-3.5 text-[var(--primary-color)]" />
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

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const email = selectedOrder.user?.email || selectedOrder.userId?.email || "";
                  if (email) {
                    navigator.clipboard.writeText(email);
                    toast.success("Client email copied to clipboard!");
                  } else {
                    toast.error("No email to copy!");
                  }
                }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                Copy Client Email
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Seller & Inventory Watchlist Modal ── */}
      {showTopSellerInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wide">
                  Catalog Performance Intelligence
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Top Sellers &amp; Inventory Watchlist</h3>
              </div>
              <button
                onClick={() => {
                  setShowTopSellerInventoryModal(false);
                  setTopSellerSearch("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-header with Tabs and Search */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTopSellerInventoryTab("top-sellers")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    topSellerInventoryTab === "top-sellers"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Top Sellers ({topProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTopSellerInventoryTab("stock-alerts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    topSellerInventoryTab === "stock-alerts"
                      ? "bg-white text-amber-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Stock Alerts ({lowStockProducts.length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={topSellerSearch}
                  onChange={(e) => setTopSellerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-56"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {topSellerInventoryTab === "top-sellers" ? (
                (() => {
                  const filtered = topProducts.filter((tp) =>
                    (tp.product?.name ?? "").toLowerCase().includes(topSellerSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No top-selling products match your filter.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-3 pr-2">Rank</th>
                            <th className="pb-3 px-2">Product</th>
                            <th className="pb-3 px-2 text-right">Dispatches</th>
                            <th className="pb-3 pl-2 text-right">Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map((tp, idx) => (
                            <tr key={tp.product?.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 pr-2 font-mono font-bold text-slate-400">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-3">
                                  {tp.product?.image ? (
                                    <img
                                      src={tp.product.image}
                                      alt=""
                                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                                      <Package className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate max-w-[240px]">
                                      {tp.product?.name ?? "Catalog Item"}
                                    </p>
                                    {tp.product?.price && (
                                      <p className="text-[11px] text-slate-400 font-mono">
                                        Price: {RUP}{INR(tp.product.price)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-slate-700">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-800">
                                  {tp.totalQuantitySold} units
                                </span>
                              </td>
                              <td className="py-3 pl-2 text-right font-black text-indigo-600 font-mono text-sm">
                                {RUP}{INR(tp.totalRevenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const filtered = lowStockProducts.filter((p) =>
                    (p.name ?? "").toLowerCase().includes(topSellerSearch.toLowerCase()) ||
                    (p.category?.name ?? p.categoryId?.name ?? "").toLowerCase().includes(topSellerSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No inventory threshold alerts match your filter.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-3 pr-2">Product</th>
                            <th className="pb-3 px-2">Category</th>
                            <th className="pb-3 px-2 text-center">Remaining Stock</th>
                            <th className="pb-3 px-2 text-center">Status</th>
                            <th className="pb-3 pl-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map((p, idx) => (
                            <tr key={p.id ?? idx} className="hover:bg-amber-50/20 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="flex items-center gap-3">
                                  {p.image ? (
                                    <img
                                      src={p.image}
                                      alt=""
                                      className="w-9 h-9 rounded-xl object-cover border border-amber-200/60 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                                      <Package className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate max-w-[200px]">
                                      {p.name ?? "Catalog Product"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-slate-500 font-medium">
                                {p.category?.name ?? p.categoryId?.name ?? "General"}
                              </td>
                              <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                                {p.stock} units
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                  p.stock === 0
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : p.stock <= 3
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>
                                  {p.stock === 0 ? "Out of Stock" : p.stock <= 3 ? "Critical Stock" : "Low Stock"}
                                </span>
                              </td>
                              <td className="py-3 pl-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowTopSellerInventoryModal(false);
                                    const folderId =
                                      (p as any).categoryId?._id ??
                                      (p as any).categoryId?.id ??
                                      (p as any).categoryId ??
                                      (p as any).category?.id;
                                    const target = folderId
                                      ? `${dashboardBase}/manage-catalog?folder=${folderId}`
                                      : `${dashboardBase}/manage-catalog`;
                                    navigate(target);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  Restock / Edit
                                  <ExternalLink className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Realtime catalog synchronization from inventory registers</span>
              <button
                type="button"
                onClick={() => {
                  setShowTopSellerInventoryModal(false);
                  setTopSellerSearch("");
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Revenue Breakdown Modal ── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 uppercase tracking-wide">
                  Revenue Distribution Analysis
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Category Performance Matrix</h3>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategorySearch("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                {topCategories.length} Categories Tracked
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-52"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {(() => {
                const totalCategoryRev = topCategories.reduce((acc, c) => acc + (c.revenue || 0), 0);
                const filtered = topCategories.filter((c) =>
                  c.name.toLowerCase().includes(categorySearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return <div className="py-12 text-center text-slate-400 text-xs italic">No matching categories found.</div>;
                }
                return (
                  <div className="space-y-3">
                    {filtered.map((cat, idx) => {
                      const pct = totalCategoryRev > 0 ? Math.round((cat.revenue / totalCategoryRev) * 100) : 0;
                      const color = ["#7367f0", "#ff9f43", "#28c76f", "#00cfe8", "#ea5455", "#9333ea", "#06b6d4"][idx % 7];
                      return (
                        <div key={cat.id || idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span>{cat.name}</span>
                              {cat.unitsSold !== undefined && (
                                <span className="text-[11px] font-normal text-slate-400">({cat.unitsSold} units sold)</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-slate-900 text-sm">{RUP}{INR(cat.revenue)}</span>
                              <span className="ml-2 text-xs font-bold text-indigo-600 font-mono">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Gross fulfilled value aggregated per taxonomy classification</span>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategorySearch("");
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settlement Gateways Detail Modal ── */}
      {showGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 uppercase tracking-wide">
                  Channel Financial Audit
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Settlement Gateways Overview</h3>
              </div>
              <button
                onClick={() => setShowGatewayModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {paymentMethods.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">No payment gateway stats found.</div>
              ) : (
                paymentMethods.map((pm) => {
                  const pct = totalPaymentOrders > 0 ? Math.round((pm.count / totalPaymentOrders) * 100) : 0;
                  const isOnline = pm.method === "ONLINE";
                  const avgTicket = pm.count > 0 ? pm.revenue / pm.count : 0;
                  return (
                    <div key={pm.method} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${isOnline ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                            {isOnline ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">
                              {isOnline ? "Online Platform (UPI, Cards, NetBanking)" : "Cash on Delivery (Doorstep Settlement)"}
                            </h4>
                            <p className="text-xs text-slate-500">{pm.count} transactions completed</p>
                          </div>
                        </div>
                        <span className="text-lg font-black font-mono text-slate-900">{pct}%</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cleared Volume</p>
                          <p className="mt-0.5 text-base font-black font-mono text-slate-900">{RUP}{INR(pm.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Order Value</p>
                          <p className="mt-0.5 text-base font-black font-mono text-slate-700">{RUP}{INR(avgTicket)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGatewayModal(false);
                    navigate("/admin-dashboard/customer-transactions");
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Inspect Full Customer Transactions Log
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGatewayModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Inject */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.18s ease-out forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Home;