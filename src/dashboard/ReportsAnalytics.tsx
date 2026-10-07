import { useState, useEffect, useCallback, useMemo } from "react";
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
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  RefreshCw,
  Calendar,
  Layers,
  CreditCard,
  Target,
  AlertCircle,
  Receipt,
  XCircle,
  UserCheck,
  MapPin,
  Ticket,
  ChevronRight,
  Search,
  X,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import ExcelJS from "exceljs";
import api from "../utils/api";
import toast from "react-hot-toast";
import DatePicker from "../components/DatePicker";

// ── Types ──────────────────────────────────────────────────────────────────

interface RangeSummary {
  revenue: { total: number; growthPct: number };
  orders: { total: number; processing: number; growthPct: number };
  customers: { total: number; growthPct: number };
  products: { total: number };
}

interface ProfitSummary {
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPct: number;
  orderCount: number;
  coveragePct: number;
  growth: { revenue: number; profit: number };
}

interface ProfitPoint {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

interface StatusPoint extends Record<string, string | number> {
  status: string;
  count: number;
}

interface TopProductProfit {
  product: { id: string; name: string; price: number; purchasePrice?: number | null; image?: string } | null;
  totalRevenue: number;
  totalQuantitySold: number;
  orderCount: number;
  totalCost: number | null;
  grossProfit: number | null;
  marginPct: number | null;
}

interface PaymentBreakdown {
  method: string;
  count: number;
  revenue: number;
}

interface CategoryData {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
}

interface TopCustomer {
  id: string | null;
  username: string;
  email: string;
  orders: number;
  totalSpent: number;
  isReturning: boolean;
}

interface CustomerInsights {
  newCount: number;
  returningCount: number;
  topCustomers: TopCustomer[];
}

interface LocationSales {
  state: string;
  revenue: number;
  orders: number;
}

interface CouponPerformance {
  totalDiscountGiven: number;
  totalRedemptions: number;
  topCoupons: { code: string; discountGiven: number; redemptions: number }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const INR = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const shortINR = (v: number) => {
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${Math.round(v)}`;
};

const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "#F59E0B",
  CONFIRMED: "#6366F1",
  SHIPPED: "#3B82F6",
  DELIVERED: "#10B981",
  CANCELLED: "#EF4444",
  RETURNED: "#8B5CF6",
};

const PAYMENT_COLORS = ["#6366F1", "#10B981"];

// `.toISOString().split("T")[0]` converts to UTC first — for IST (UTC+5:30) that rolls
// any local midnight (or any "now" before 5:30am) back to the previous calendar day.
// Format from the Date's own local fields instead, so it never round-trips through UTC.
const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayStr = () => toLocalDateStr(new Date());
const nDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
};

// ── Sub-components ─────────────────────────────────────────────────────────

const GrowthBadge = ({ pct }: { pct: number }) => (
  <span
    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
      pct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
    }`}
  >
    {pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {Math.abs(pct)}%
  </span>
);

const StatCard = ({
  label,
  value,
  sub,
  growth,
  icon: Icon,
  iconBg,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  growth?: number;
  icon: React.ElementType;
  iconBg: string;
  accent: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      {growth != null && <GrowthBadge pct={growth} />}
    </div>
    <p className={`text-2xl font-bold ${accent} mb-1`}>{value}</p>
    <p className="text-sm font-medium text-gray-600">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const SectionCard = ({ title, subtitle, children, action }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.dataKey === "orders" ? p.value : INR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Date Presets ───────────────────────────────────────────────────────────

const buildPresets = () => [
  { label: "Today", from: todayStr(), to: todayStr() },
  { label: "7D", from: nDaysAgo(7), to: todayStr() },
  { label: "30D", from: nDaysAgo(30), to: todayStr() },
  { label: "90D", from: nDaysAgo(90), to: todayStr() },
  {
    label: "This Month",
    from: toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: todayStr(),
  },
  {
    label: "This Year",
    from: toLocalDateStr(new Date(new Date().getFullYear(), 0, 1)),
    to: todayStr(),
  },
];

// ── Skeleton Loader ─────────────────────────────────────────────────────────
const ReportsSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 md:p-6 space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="h-4 w-80 bg-slate-100 rounded mt-2" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-28 bg-slate-200 rounded-xl" />
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>
    </div>

    {/* Date Filter Card Skeleton */}
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="h-5 w-24 bg-slate-200 rounded" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto w-full lg:w-auto">
          <div className="h-9 w-36 bg-slate-100 rounded-lg" />
          <div className="h-5 w-4 bg-slate-100 rounded" />
          <div className="h-9 w-36 bg-slate-100 rounded-lg" />
          <div className="h-9 w-20 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </div>

    {/* KPI Summary Grid Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-slate-100 rounded-xl" />
            <div className="h-5 w-12 bg-slate-100 rounded-full" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-28 bg-slate-100/60 rounded" />
        </div>
      ))}
    </div>

    {/* Profit/Margin Summary Grid Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded" />
        </div>
      ))}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 bg-slate-100 rounded-xl" />
          <div className="h-4 w-32 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-20 bg-slate-200 rounded-lg" />
        <div className="h-2.5 w-full bg-gray-100 rounded-full animate-pulse" />
      </div>
    </div>

    {/* Chart Card Skeleton */}
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-3.5 w-64 bg-slate-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          <div className="h-8 w-16 bg-slate-100 rounded-lg" />
        </div>
      </div>
      <div className="h-72 w-full bg-slate-50/50 rounded-xl border border-slate-100/55 flex items-end justify-between p-4 pt-10">
        {Array.from({ length: 12 }).map((_, i) => {
          const height = [40, 60, 35, 75, 50, 90, 65, 45, 80, 55, 70, 85][i];
          return (
            <div key={i} className="w-[6%] bg-slate-200/60 rounded-t-md animate-pulse" style={{ height: `${height}%` }} />
          );
        })}
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────

export default function ReportsAnalytics() {
  const presets = buildPresets();
  const [from, setFrom] = useState(nDaysAgo(30));
  const [to, setTo] = useState(todayStr());
  const [activePreset, setActivePreset] = useState("30D");

  const [summary, setSummary] = useState<RangeSummary | null>(null);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [profitByDay, setProfitByDay] = useState<ProfitPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductProfit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentBreakdown[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [salesByLocation, setSalesByLocation] = useState<LocationSales[]>([]);
  const [couponPerformance, setCouponPerformance] = useState<CouponPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"revenue" | "profit">("revenue");

  // Modal inspection states
  const [showTopProductsModal, setShowTopProductsModal] = useState(false);
  const [topProductsSearch, setTopProductsSearch] = useState("");
  const [topProductsSort, setTopProductsSort] = useState<"revenue" | "profit" | "margin" | "sold">("revenue");

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [showCouponModal, setShowCouponModal] = useState(false);

  useBodyScrollLock(showTopProductsModal || showCustomerModal || showCategoryModal || showLocationModal || showCouponModal);

  const fetchAll = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const [sumRes, profitRes, profitDayRes, statusRes, topRes, payRes, catRes, custRes, locRes, couponRes] = await Promise.all([
        api.get(`/analytics/summary-range?from=${f}&to=${t}`),
        api.get(`/analytics/profit?from=${f}&to=${t}`),
        api.get(`/analytics/profit-by-day?from=${f}&to=${t}`),
        api.get(`/analytics/order-status?from=${f}&to=${t}`),
        api.get(`/analytics/top-products-profit?limit=50&from=${f}&to=${t}`),
        api.get(`/analytics/payment-methods?from=${f}&to=${t}`),
        api.get(`/analytics/top-categories?from=${f}&to=${t}`),
        api.get(`/analytics/customer-insights?from=${f}&to=${t}`),
        api.get(`/analytics/sales-by-location?from=${f}&to=${t}`),
        api.get(`/analytics/coupon-performance?from=${f}&to=${t}`),
      ]);
      setSummary(sumRes.data);
      setProfit(profitRes.data);
      setProfitByDay(profitDayRes.data);
      setStatusData(statusRes.data.filter((s: StatusPoint) => s.count > 0));
      setTopProducts(topRes.data);
      setPaymentMethods(payRes.data);
      setCategories(catRes.data);
      setCustomerInsights(custRes.data);
      setSalesByLocation(locRes.data);
      setCouponPerformance(couponRes.data);
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = () => {
    setActivePreset("");
    fetchAll(from, to);
  };

  // Every report fetch requires a from/to pair (see fetchAll) — there's no "all time,
  // no filter" mode — so "clear" resets the custom range back to the default 30D
  // window rather than emptying the inputs outright, which would leave nothing valid
  // to Apply.
  const clearRange = () => {
    const defaultFrom = nDaysAgo(30);
    const defaultTo = todayStr();
    setFrom(defaultFrom);
    setTo(defaultTo);
    setActivePreset("30D");
    fetchAll(defaultFrom, defaultTo);
  };

  const applyPreset = (p: (typeof presets)[0]) => {
    setActivePreset(p.label);
    setFrom(p.from);
    setTo(p.to);
    fetchAll(p.from, p.to);
  };

  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const exportToExcel = async () => {
    try {
      console.log("[export-debug] profitByDay:", profitByDay, "length:", profitByDay?.length, "from/to:", from, to);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Storra";
      workbook.created = new Date();

      // ── Shared styling — mirrors the on-screen report's slate/emerald/rose palette ──
      const NAVY = "FF0F172A"; // slate-900 — title band
      const SLATE = "FF334155"; // slate-700 — table header rows
      const ZEBRA = "FFF8FAFC"; // slate-50 — alternating row fill
      const BORDER = "FFE2E8F0"; // slate-200
      const POSITIVE = "FF059669"; // emerald-600
      const NEGATIVE = "FFE11D48"; // rose-600
      const MUTED = "FF64748B"; // slate-500
      const WHITE = "FFFFFFFF";

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };

      /** Merged, dark title band across the sheet's full column span — every sheet opens
       * with this instead of a plain text row, since that's most of what "looks unstyled"
       * about a raw CSV dump. */
      const addTitleBand = (ws: ExcelJS.Worksheet, title: string, span: number) => {
        ws.mergeCells(1, 1, 1, span);
        const cell = ws.getCell(1, 1);
        cell.value = title;
        cell.font = { bold: true, size: 14, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        ws.getRow(1).height = 26;
      };

      const addSubtitle = (ws: ExcelJS.Worksheet, rowNum: number, text: string, span: number) => {
        ws.mergeCells(rowNum, 1, rowNum, span);
        const cell = ws.getCell(rowNum, 1);
        cell.value = text;
        cell.font = { italic: true, size: 10, color: { argb: MUTED } };
        cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      };

      const styleHeaderRow = (row: ExcelJS.Row) => {
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SLATE } };
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.border = thinBorder;
        });
        row.height = 20;
      };

      const styleDataRow = (row: ExcelJS.Row, isEven: boolean) => {
        row.eachCell((cell) => {
          cell.border = thinBorder;
          cell.alignment = { vertical: "middle" };
          if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        });
      };

      const colorBySign = (cell: ExcelJS.Cell, value: number) => {
        cell.font = { ...cell.font, color: { argb: value >= 0 ? POSITIVE : NEGATIVE }, bold: true };
      };

      const RUPEE_FMT = '"₹"#,##0';

      // ── 1. Summary sheet ────────────────────────────────────────────────────
      if (summary) {
        const ws = workbook.addWorksheet("Summary");
        ws.columns = [{ width: 26 }, { width: 18 }, { width: 20 }, { width: 32 }];
        addTitleBand(ws, "BUSINESS PERFORMANCE REPORT", 4);
        addSubtitle(ws, 2, `Date range: ${from} to ${to}`, 4);
        addSubtitle(ws, 3, `Generated: ${new Date().toLocaleString("en-IN")}`, 4);
        ws.addRow([]);

        const headerRow = ws.addRow(["Metric", "Value", "Growth vs Prev Period", "Details"]);
        styleHeaderRow(headerRow);

        type SummaryRow = { metric: string; value: number; isCurrency: boolean; growth?: number | null; details: string };
        const rows: SummaryRow[] = [
          { metric: "Total Revenue", value: summary.revenue.total, isCurrency: true, growth: summary.revenue.growthPct, details: "" },
          { metric: "Total Orders", value: summary.orders.total, isCurrency: false, growth: summary.orders.growthPct, details: `${summary.orders.processing} processing` },
          { metric: "New Customers", value: summary.customers.total, isCurrency: false, growth: summary.customers.growthPct, details: "" },
          { metric: "Total Products", value: summary.products.total, isCurrency: false, details: "" },
        ];
        if (profit) {
          rows.push({ metric: "Gross Profit", value: profit.grossProfit, isCurrency: true, growth: profit.growth.profit, details: `${profit.marginPct}% margin` });
          rows.push({ metric: "Total Cost", value: profit.cost, isCurrency: true, details: `${profit.coveragePct}% coverage` });
        }

        rows.forEach((r, i) => {
          const row = ws.addRow([r.metric, r.value, r.growth != null ? `${r.growth}%` : "—", r.details]);
          styleDataRow(row, i % 2 === 1);
          if (r.isCurrency) row.getCell(2).numFmt = RUPEE_FMT;
          row.getCell(2).font = { bold: true };
          if (r.growth != null) colorBySign(row.getCell(3), r.growth);
        });
      }

      // ── 2. Daily Breakdown sheet ────────────────────────────────────────────
      if (profitByDay && profitByDay.length > 0) {
        const ws = workbook.addWorksheet("Daily Breakdown");
        ws.columns = [{ width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 12 }];
        addTitleBand(ws, "DAILY BREAKDOWN", 5);
        ws.addRow([]);

        const headerRow = ws.addRow(["Date", "Revenue (INR)", "Cost (INR)", "Profit (INR)", "Orders"]);
        styleHeaderRow(headerRow);

        let totalRevenue = 0, totalCost = 0, totalProfit = 0, totalOrders = 0;
        profitByDay.forEach((day, i) => {
          const parsedDate = new Date(day.date);
          const row = ws.addRow([
            isNaN(parsedDate.getTime()) ? day.date : parsedDate,
            day.revenue,
            day.cost,
            day.profit,
            day.orders,
          ]);
          styleDataRow(row, i % 2 === 1);
          if (!isNaN(parsedDate.getTime())) row.getCell(1).numFmt = "dd mmm yyyy";
          row.getCell(2).numFmt = RUPEE_FMT;
          row.getCell(3).numFmt = RUPEE_FMT;
          row.getCell(4).numFmt = RUPEE_FMT;
          colorBySign(row.getCell(4), day.profit);
          totalRevenue += day.revenue;
          totalCost += day.cost;
          totalProfit += day.profit;
          totalOrders += day.orders;
        });

        const totalRow = ws.addRow(["Total", totalRevenue, totalCost, totalProfit, totalOrders]);
        totalRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.border = { top: { style: "medium", color: { argb: NAVY } } };
        });
        totalRow.getCell(2).numFmt = RUPEE_FMT;
        totalRow.getCell(3).numFmt = RUPEE_FMT;
        totalRow.getCell(4).numFmt = RUPEE_FMT;
        colorBySign(totalRow.getCell(4), totalProfit);

        ws.views = [{ state: "frozen", ySplit: 3 }];
      }

      // ── 3. Top Products sheet ───────────────────────────────────────────────
      if (topProducts && topProducts.length > 0) {
        const ws = workbook.addWorksheet("Top Products");
        ws.columns = [{ width: 8 }, { width: 32 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 12 }];
        addTitleBand(ws, "TOP PRODUCTS BY PROFIT", 7);
        ws.addRow([]);

        const headerRow = ws.addRow(["Rank", "Product Name", "Qty Sold", "Revenue (INR)", "Cost (INR)", "Gross Profit (INR)", "Margin %"]);
        styleHeaderRow(headerRow);

        topProducts.forEach((item, i) => {
          const row = ws.addRow([
            i + 1,
            item.product?.name ?? "—",
            item.totalQuantitySold,
            item.totalRevenue,
            item.totalCost ?? 0,
            item.grossProfit ?? 0,
            item.marginPct != null ? `${item.marginPct}%` : "—",
          ]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
          row.getCell(4).numFmt = RUPEE_FMT;
          row.getCell(5).numFmt = RUPEE_FMT;
          row.getCell(6).numFmt = RUPEE_FMT;
          if (item.grossProfit != null) colorBySign(row.getCell(6), item.grossProfit);
        });
      }

      // ── 4. Payment Methods sheet ────────────────────────────────────────────
      if (paymentMethods && paymentMethods.length > 0) {
        const ws = workbook.addWorksheet("Payment Methods");
        ws.columns = [{ width: 22 }, { width: 16 }, { width: 12 }, { width: 18 }];
        addTitleBand(ws, "PAYMENT METHODS SPLIT", 4);
        ws.addRow([]);

        const headerRow = ws.addRow(["Payment Method", "Revenue (INR)", "Orders", "% of Revenue"]);
        styleHeaderRow(headerRow);

        const totalPayRev = paymentMethods.reduce((a, b) => a + b.revenue, 0);
        paymentMethods.forEach((pm, i) => {
          const pct = totalPayRev > 0 ? (pm.revenue / totalPayRev) * 100 : 0;
          const row = ws.addRow([
            pm.method === "ONLINE" ? "Online Payment" : "Cash on Delivery",
            pm.revenue,
            pm.count,
            `${pct.toFixed(1)}%`,
          ]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(2).numFmt = RUPEE_FMT;
        });

        ws.addConditionalFormatting({
          ref: `B${ws.rowCount - paymentMethods.length + 1}:B${ws.rowCount}`,
          rules: [
            {
              type: "dataBar",
              priority: 1,
              gradient: false,
              minLength: 0,
              maxLength: 100,
              cfvo: [{ type: "min" }, { type: "max" }],
              color: { argb: "FF6366F1" },
            } as any,
          ],
        });
      }

      // ── 5. Categories sheet ─────────────────────────────────────────────────
      if (categories && categories.length > 0) {
        const ws = workbook.addWorksheet("Categories");
        ws.columns = [{ width: 30 }, { width: 18 }];
        addTitleBand(ws, "TOP CATEGORIES", 2);
        ws.addRow([]);

        const headerRow = ws.addRow(["Category Name", "Revenue (INR)"]);
        styleHeaderRow(headerRow);

        categories.forEach((cat, i) => {
          const row = ws.addRow([cat.name, cat.revenue]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(2).numFmt = RUPEE_FMT;
        });

        ws.addConditionalFormatting({
          ref: `B${ws.rowCount - categories.length + 1}:B${ws.rowCount}`,
          rules: [
            {
              type: "dataBar",
              priority: 1,
              gradient: false,
              minLength: 0,
              maxLength: 100,
              cfvo: [{ type: "min" }, { type: "max" }],
              color: { argb: "FF10B981" },
            } as any,
          ],
        });
      }

      // ── 6. Customer Insights sheet ──────────────────────────────────────────
      if (customerInsights && customerInsights.topCustomers.length > 0) {
        const ws = workbook.addWorksheet("Customer Insights");
        ws.columns = [{ width: 8 }, { width: 28 }, { width: 28 }, { width: 12 }, { width: 16 }, { width: 12 }];
        addTitleBand(ws, "CUSTOMER INSIGHTS", 6);
        addSubtitle(ws, 2, `${customerInsights.newCount} new · ${customerInsights.returningCount} returning in this period`, 6);
        ws.addRow([]);

        const headerRow = ws.addRow(["Rank", "Customer", "Email", "Orders", "Total Spent (INR)", "Type"]);
        styleHeaderRow(headerRow);

        customerInsights.topCustomers.forEach((c, i) => {
          const row = ws.addRow([i + 1, c.username, c.email, c.orders, c.totalSpent, c.isReturning ? "Returning" : "New"]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
          row.getCell(5).numFmt = RUPEE_FMT;
        });
      }

      // ── 7. Sales by Location sheet ──────────────────────────────────────────
      if (salesByLocation && salesByLocation.length > 0) {
        const ws = workbook.addWorksheet("Sales by Location");
        ws.columns = [{ width: 24 }, { width: 18 }, { width: 12 }];
        addTitleBand(ws, "SALES BY LOCATION", 3);
        ws.addRow([]);

        const headerRow = ws.addRow(["State", "Revenue (INR)", "Orders"]);
        styleHeaderRow(headerRow);

        salesByLocation.forEach((loc, i) => {
          const row = ws.addRow([loc.state, loc.revenue, loc.orders]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(2).numFmt = RUPEE_FMT;
        });

        ws.addConditionalFormatting({
          ref: `B${ws.rowCount - salesByLocation.length + 1}:B${ws.rowCount}`,
          rules: [
            {
              type: "dataBar",
              priority: 1,
              gradient: false,
              minLength: 0,
              maxLength: 100,
              cfvo: [{ type: "min" }, { type: "max" }],
              color: { argb: "FF00D1B2" },
            } as any,
          ],
        });
      }

      // ── 8. Coupon Performance sheet ─────────────────────────────────────────
      if (couponPerformance && couponPerformance.topCoupons.length > 0) {
        const ws = workbook.addWorksheet("Coupon Performance");
        ws.columns = [{ width: 22 }, { width: 16 }, { width: 18 }];
        addTitleBand(ws, "COUPON PERFORMANCE", 3);
        addSubtitle(ws, 2, `${couponPerformance.totalRedemptions} redemptions · ${INR(couponPerformance.totalDiscountGiven)} total discount given`, 3);
        ws.addRow([]);

        const headerRow = ws.addRow(["Coupon Code", "Redemptions", "Discount Given (INR)"]);
        styleHeaderRow(headerRow);

        couponPerformance.topCoupons.forEach((c, i) => {
          const row = ws.addRow([c.code, c.redemptions, c.discountGiven]);
          styleDataRow(row, i % 2 === 1);
          row.getCell(3).numFmt = RUPEE_FMT;
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `business_report_${from}_to_${to}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  if (loading) {
    return <ReportsSkeleton />;
  }

  const totalPaymentRevenue = paymentMethods.reduce((a, b) => a + b.revenue, 0);
  const hasData = Boolean(
    summary && (summary.orders.total > 0 || summary.revenue.total > 0)
  );
  const avgOrderValue = summary && summary.orders.total > 0 ? summary.revenue.total / summary.orders.total : 0;
  // Matches the backend's own 90-day cap on the daily-breakdown chart (see
  // getProfitByDay) — surfaced here so a long range doesn't silently look
  // inconsistent with the "Business performance overview" date label above it.
  const chartRangeDays = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
  const chartWindowTruncated = chartRangeDays > 90;
  const totalOrdersAllStatuses = statusData.reduce((a, s) => a + s.count, 0);
  const cancelledCount = statusData.find((s) => s.status === "CANCELLED")?.count ?? 0;
  const cancellationRate = totalOrdersAllStatuses > 0 ? (cancelledCount / totalOrdersAllStatuses) * 100 : 0;
  const totalCustomersInsight = (customerInsights?.newCount ?? 0) + (customerInsights?.returningCount ?? 0);
  const returningPct = totalCustomersInsight > 0 ? Math.round(((customerInsights?.returningCount ?? 0) / totalCustomersInsight) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-gray-700" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Business performance overview · {new Date(from).toLocaleDateString("en-IN")} – {new Date(to).toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll(from, to)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => exportToExcel()}
            disabled={!hasData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-950 text-sm text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Date Range Filter ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Date Range</span>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activePreset === p.label
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <DatePicker
              value={from}
              max={to}
              onChange={(v) => { setFrom(v); setActivePreset(""); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
            />
            <span className="text-gray-400 text-sm">to</span>
            <DatePicker
              value={to}
              min={from}
              max={todayStr()}
              onChange={(v) => { setTo(v); setActivePreset(""); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
              align="right"
            />
            <button
              onClick={applyRange}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            <button
              onClick={clearRange}
              title="Reset to the last 30 days"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            label="Revenue"
            value={<span>{INR(summary.revenue.total)}</span>}
            growth={summary.revenue.growthPct}
            sub="vs previous period"
            icon={IndianRupee}
            iconBg="bg-emerald-50"
            accent="text-emerald-600"
          />
          <StatCard
            label="Orders"
            value={summary.orders.total.toLocaleString()}
            sub={`${summary.orders.processing} processing`}
            growth={summary.orders.growthPct}
            icon={ShoppingCart}
            iconBg="bg-blue-50"
            accent="text-blue-600"
          />
          <StatCard
            label="New Customers"
            value={summary.customers.total.toLocaleString()}
            growth={summary.customers.growthPct}
            sub="in selected period"
            icon={Users}
            iconBg="bg-purple-50"
            accent="text-purple-600"
          />
          <StatCard
            label="Total Products"
            value={summary.products.total.toLocaleString()}
            icon={Package}
            iconBg="bg-orange-50"
            accent="text-orange-600"
          />
          <StatCard
            label="Avg Order Value"
            value={<span>{INR(Math.round(avgOrderValue))}</span>}
            sub="revenue ÷ orders"
            icon={Receipt}
            iconBg="bg-cyan-50"
            accent="text-cyan-600"
          />
          <StatCard
            label="Cancellation Rate"
            value={`${cancellationRate.toFixed(1)}%`}
            sub={`${cancelledCount} of ${totalOrdersAllStatuses} orders`}
            icon={XCircle}
            iconBg="bg-rose-50"
            accent={cancellationRate > 15 ? "text-red-600" : "text-rose-500"}
          />
        </div>
      )}

      {/* ── Profit / Margin Summary Cards ── */}
      {profit && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Gross Profit"
            value={<span>{INR(profit.grossProfit)}</span>}
            sub={`${profit.marginPct}% margin`}
            growth={profit.growth.profit}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            accent={profit.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <StatCard
            label="Total Cost"
            value={<span>{INR(profit.cost)}</span>}
            sub={profit.coveragePct < 100 ? `~${profit.coveragePct}% items have cost data` : "Full cost coverage"}
            icon={Target}
            iconBg="bg-amber-50"
            accent="text-amber-600"
          />
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm col-span-2">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-50">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-xs text-gray-400">Overall Profit Margin</span>
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className={`text-3xl font-bold ${profit.marginPct >= 20 ? "text-emerald-600" : profit.marginPct >= 10 ? "text-amber-500" : "text-red-500"}`}>
                {`${profit.marginPct}%`}
              </span>
              <span className="text-sm text-gray-500 mb-1">gross margin</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${
                  profit.marginPct >= 20 ? "bg-emerald-500" : profit.marginPct >= 10 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(Math.max(profit.marginPct, 0), 100)}%` }}
              />
            </div>
            {profit.coveragePct < 100 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {profit.coveragePct}% of order items have purchase price — add cost data for full accuracy
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Revenue / Profit Trend Chart ── */}
      <SectionCard
        title="Revenue & Profit Trend"
        subtitle={chartWindowTruncated ? "Daily breakdown · showing the most recent 90 days of this range" : "Daily breakdown over selected period"}
        action={
          <div className="flex gap-1">
            {(["revenue", "profit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  chartMode === m ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "revenue" ? "Revenue vs Cost" : "Profit"}
              </button>
            ))}
          </div>
        }
      >
        <div>
          <ResponsiveContainer width="100%" height={280}>
          {chartMode === "revenue" ? (
            <AreaChart data={profitByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={shortINR} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
              <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fill="url(#revGrad)" dot={false} name="revenue" />
              <Area type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={2} fill="url(#costGrad)" dot={false} name="cost" />
            </AreaChart>
          ) : (
            <AreaChart data={profitByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={shortINR} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} fill="url(#profitGrad)" dot={false} name="profit" />
            </AreaChart>
          )}
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ── Row: Order Status + Payment Methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Order Status */}
        <SectionCard title="Orders by Status" subtitle="Status distribution for selected period">
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} orders`]} />
                <Legend formatter={(v) => (
                  <span className="text-xs capitalize">{v.toLowerCase().replace("_", " ")}</span>
                )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Payment Methods + Category bar */}
        <SectionCard title="Payment Methods & Categories" subtitle="Revenue split by payment type">
          <div className="space-y-4 mb-5">
            {paymentMethods.map((pm, i) => (
              <div key={pm.method}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {pm.method === "ONLINE" ? "Online Payment" : "Cash on Delivery"}
                    </span>
                  </div>
                    <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900"><span>{INR(pm.revenue)}</span></p>
                    <p className="text-xs text-gray-400">{`${pm.count} orders`}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: totalPaymentRevenue > 0 ? `${(pm.revenue / totalPaymentRevenue) * 100}%` : "0%",
                      background: PAYMENT_COLORS[i],
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totalPaymentRevenue > 0 ? ((pm.revenue / totalPaymentRevenue) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-400" />
                  Top Categories
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  View Details
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={categories.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={shortINR} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} width={80} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [INR(Number(value ?? 0)), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row: Customer Insights + Sales by Location ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Customer Insights */}
        <SectionCard
          title="Customer Insights"
          subtitle="New vs. returning buyers in the selected period"
          action={
            customerInsights && customerInsights.topCustomers.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null
          }
        >
          {!customerInsights || totalCustomersInsight === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No customer activity yet</div>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-sm text-gray-600">New</span>
                  <span className="text-sm font-bold text-gray-900">{customerInsights.newCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">Returning</span>
                  <span className="text-sm font-bold text-gray-900">{customerInsights.returningCount}</span>
                </div>
                <span className="ml-auto text-xs text-gray-400">{returningPct}% repeat buyers</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden flex mb-5">
                <div className="h-full bg-indigo-500" style={{ width: `${100 - returningPct}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${returningPct}%` }} />
              </div>

              {customerInsights.topCustomers.length > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-4 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    Top Customers by Spend
                  </h4>
                  <div className="space-y-2.5">
                    {customerInsights.topCustomers.slice(0, 5).map((c, i) => (
                      <div key={c.id ?? i} className="flex items-center justify-between text-sm">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate max-w-[160px]">{c.username}</p>
                            <p className="text-xs text-gray-400">{c.orders} order{c.orders === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900 shrink-0">{INR(c.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Sales by Location */}
        <SectionCard
          title="Sales by Location"
          subtitle="Revenue by shipping state"
          action={
            salesByLocation.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null
          }
        >
          {salesByLocation.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No shipping data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesByLocation} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={shortINR} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 10, fill: "#6B7280" }} width={90} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name, item) => [`${INR(Number(value ?? 0))} · ${item.payload.orders} orders`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#00D1B2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Top Products Table ── */}
      <SectionCard
        title="Top Products by Revenue & Profit"
        subtitle={`Top ${Math.min(8, topProducts.length)} products · ${topProducts.filter((p) => p.grossProfit != null).length} with cost data`}
        action={
          topProducts.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowTopProductsModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
            >
              View Details ({topProducts.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : null
        }
      >
        {topProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No sales data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-3">#</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Product</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Sold</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Revenue</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Cost</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Profit</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 pl-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 8).map((item, idx) => (
                  <tr key={item.product?.id ?? idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-3">
                      <span className={`text-xs font-bold ${idx < 3 ? "text-amber-500" : "text-gray-300"}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {item.product?.image ? (
                          <img src={item.product.image} alt={item.product.name ?? ""} className="w-8 h-8 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate max-w-[150px]">{item.product?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">
                            {item.product?.purchasePrice
                              ? `Cost: ${INR(item.product.purchasePrice)}`
                              : <span className="text-amber-500">No cost set</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 font-medium">{item.totalQuantitySold}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900"><span>{INR(item.totalRevenue)}</span></td>
                    <td className="py-3 px-3 text-right text-amber-600">
                      {item.totalCost != null ? <span className="text-amber-600">{INR(item.totalCost)}</span> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {item.grossProfit != null ? (
                        <span className={item.grossProfit >= 0 ? "text-emerald-600" : "text-red-500"}>
                          <span>{INR(item.grossProfit)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {item.marginPct != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.marginPct >= 20 ? "bg-emerald-100 text-emerald-700"
                          : item.marginPct >= 10 ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                        }`}>
                          <span>{item.marginPct}%</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Coupon Performance ── */}
      {couponPerformance && couponPerformance.topCoupons.length > 0 && (
        <SectionCard
          title="Coupon Performance"
          subtitle={`${couponPerformance.totalRedemptions} redemption${couponPerformance.totalRedemptions === 1 ? "" : "s"} · ${INR(couponPerformance.totalDiscountGiven)} discounted in the selected period`}
          action={
            <button
              type="button"
              onClick={() => setShowCouponModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
            >
              View Details
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3">Coupon</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Redemptions</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 pl-3">Discount Given</th>
                </tr>
              </thead>
              <tbody>
                {couponPerformance.topCoupons.map((c, i) => (
                  <tr key={`${c.code}-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <span className="inline-flex items-center gap-2 font-mono font-semibold text-gray-800">
                        <Ticket className="h-3.5 w-3.5 text-gray-400" />
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700">{c.redemptions}</td>
                    <td className="py-3 pl-3 text-right font-semibold text-amber-600">{INR(c.discountGiven)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Daily Orders & Revenue Bars ── */}
      {profitByDay.length > 0 && (
        <SectionCard title="Daily Orders & Revenue" subtitle="Grouped bar view">
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={profitByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={shortINR} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                <Bar yAxisId="left" dataKey="revenue" fill="#6366F1" radius={[3, 3, 0, 0]} name="revenue" />
                <Bar yAxisId="right" dataKey="orders" fill="#10B981" radius={[3, 3, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* ── Footer note ── */}
      <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Profit calculations are based on the <strong>purchase price</strong> set on each product.
          Products without a purchase price show <strong>—</strong> in cost and profit columns.
          Set purchase prices in the product add/edit form for complete margin analysis.
        </p>
      </div>

      {/* ── Top Products Detail Modal ── */}
      {showTopProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wide">
                  Product Profitability Registry
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Top Products by Revenue &amp; Profit</h3>
              </div>
              <button
                onClick={() => {
                  setShowTopProductsModal(false);
                  setTopProductsSearch("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Sort Bar */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={topProductsSearch}
                  onChange={(e) => setTopProductsSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Sort by:</span>
                <select
                  value={topProductsSort}
                  onChange={(e) => setTopProductsSort(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none"
                >
                  <option value="revenue">Highest Revenue</option>
                  <option value="profit">Highest Profit</option>
                  <option value="margin">Highest Margin %</option>
                  <option value="sold">Most Units Sold</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {(() => {
                let list = topProducts.filter((p) =>
                  (p.product?.name ?? "").toLowerCase().includes(topProductsSearch.toLowerCase())
                );
                list.sort((a, b) => {
                  if (topProductsSort === "revenue") return (b.totalRevenue || 0) - (a.totalRevenue || 0);
                  if (topProductsSort === "profit") return (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity);
                  if (topProductsSort === "margin") return (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity);
                  if (topProductsSort === "sold") return (b.totalQuantitySold || 0) - (a.totalQuantitySold || 0);
                  return 0;
                });

                if (list.length === 0) {
                  return <div className="py-12 text-center text-slate-400 text-xs italic">No matching products found.</div>;
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="text-left pb-3 pr-2">#</th>
                          <th className="text-left pb-3 px-2">Product</th>
                          <th className="text-right pb-3 px-2">Sold</th>
                          <th className="text-right pb-3 px-2">Revenue</th>
                          <th className="text-right pb-3 px-2">Cost</th>
                          <th className="text-right pb-3 px-2">Profit</th>
                          <th className="text-right pb-3 pl-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {list.map((item, idx) => (
                          <tr key={item.product?.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 pr-2 font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-3">
                                {item.product?.image ? (
                                  <img
                                    src={item.product.image}
                                    alt=""
                                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate max-w-[200px]">
                                    {item.product?.name ?? "—"}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {item.product?.purchasePrice ? `Unit Cost: ${INR(item.product.purchasePrice)}` : <span className="text-amber-500">No cost set</span>}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-medium text-slate-700">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-800">
                                {item.totalQuantitySold}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono">
                              {INR(item.totalRevenue)}
                            </td>
                            <td className="py-3 px-2 text-right text-amber-600 font-mono">
                              {item.totalCost != null ? INR(item.totalCost) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="py-3 px-2 text-right font-black font-mono">
                              {item.grossProfit != null ? (
                                <span className={item.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                  {INR(item.grossProfit)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 pl-2 text-right">
                              {item.marginPct != null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                                  item.marginPct >= 20 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : item.marginPct >= 10 ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}>
                                  {item.marginPct}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Displaying up to 50 top revenue generating products within active date range</span>
              <button
                type="button"
                onClick={() => setShowTopProductsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Insights Detail Modal ── */}
      {showCustomerModal && customerInsights && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wide">
                  Audience Acquisition &amp; Retention
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Customer Insights &amp; Top Spenders</h3>
              </div>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setCustomerSearch("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                {customerInsights.topCustomers.length} Top Spenders Recorded
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-56"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {(() => {
                const filtered = customerInsights.topCustomers.filter((c) =>
                  (c.username ?? "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                  (c.email ?? "").toLowerCase().includes(customerSearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return <div className="py-12 text-center text-slate-400 text-xs italic">No matching customers found.</div>;
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="text-left pb-3 pr-2">Rank</th>
                          <th className="text-left pb-3 px-2">Customer</th>
                          <th className="text-center pb-3 px-2">Profile</th>
                          <th className="text-right pb-3 px-2">Orders</th>
                          <th className="text-right pb-3 px-2">Avg / Order</th>
                          <th className="text-right pb-3 pl-2">Total Spend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((c, idx) => {
                          const avgOrder = c.orders > 0 ? c.totalSpent / c.orders : 0;
                          return (
                            <tr key={c.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 pr-2 font-mono font-bold text-slate-400">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center font-mono text-xs">
                                    {(c.username || "C").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate max-w-[180px]">{c.username}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{c.email || "No email"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  c.isReturning
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                }`}>
                                  {c.isReturning ? "Returning Buyer" : "New Customer"}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-slate-700">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold">
                                  {c.orders}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-600">
                                {INR(Math.round(avgOrder))}
                              </td>
                              <td className="py-3 pl-2 text-right font-black font-mono text-slate-900 text-sm">
                                {INR(c.totalSpent)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Customer spend figures scoped to the current filtered period</span>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Breakdown Detail Modal ── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 uppercase tracking-wide">
                  Taxonomy Performance
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">All Categories Breakdown</h3>
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
                {categories.length} Categories Recorded
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

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {(() => {
                const totalCatRev = categories.reduce((sum, c) => sum + (c.revenue || 0), 0);
                const filtered = categories.filter((c) =>
                  c.name.toLowerCase().includes(categorySearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return <div className="py-12 text-center text-slate-400 text-xs italic">No matching categories found.</div>;
                }
                return (
                  <div className="space-y-2.5">
                    {filtered.map((cat, idx) => {
                      const pct = totalCatRev > 0 ? ((cat.revenue / totalCatRev) * 100).toFixed(1) : "0";
                      return (
                        <div key={cat.id || idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{cat.name}</span>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900">{INR(cat.revenue)}</span>
                              <span className="ml-2 font-mono font-bold text-indigo-600">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          {cat.unitsSold !== undefined && (
                            <p className="text-[10px] text-slate-400">{cat.unitsSold} units fulfilled</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sales by Location Detail Modal ── */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100 uppercase tracking-wide">
                  Geographical Distribution
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Sales by Shipping Location</h3>
              </div>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setLocationSearch("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                {salesByLocation.length} Shipping Destinations
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search state..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-52"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {(() => {
                const totalLocRev = salesByLocation.reduce((sum, l) => sum + (l.revenue || 0), 0);
                const filtered = salesByLocation.filter((l) =>
                  (l.state ?? "").toLowerCase().includes(locationSearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return <div className="py-12 text-center text-slate-400 text-xs italic">No shipping regions match your query.</div>;
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="text-left pb-3 pr-2">#</th>
                          <th className="text-left pb-3 px-2">State / Territory</th>
                          <th className="text-right pb-3 px-2">Orders</th>
                          <th className="text-right pb-3 px-2">Avg / Order</th>
                          <th className="text-right pb-3 px-2">Revenue Share</th>
                          <th className="text-right pb-3 pl-2">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((loc, idx) => {
                          const avgOrder = loc.orders > 0 ? loc.revenue / loc.orders : 0;
                          const pct = totalLocRev > 0 ? ((loc.revenue / totalLocRev) * 100).toFixed(1) : "0";
                          return (
                            <tr key={loc.state ?? idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 pr-2 font-mono font-bold text-slate-400">#{idx + 1}</td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                  <MapPin className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
                                  <span>{loc.state || "Unknown State"}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-slate-700">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold">
                                  {loc.orders}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-600">
                                {INR(Math.round(avgOrder))}
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-bold text-teal-600">
                                {pct}%
                              </td>
                              <td className="py-3 pl-2 text-right font-black font-mono text-slate-900 text-sm">
                                {INR(loc.revenue)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Coupon Performance Detail Modal ── */}
      {showCouponModal && couponPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 uppercase tracking-wide">
                  Promotion Analytics
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">Coupon Performance Ledger</h3>
              </div>
              <button
                onClick={() => setShowCouponModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Redemptions</p>
                  <p className="text-2xl font-black font-mono text-amber-950 mt-1">{couponPerformance.totalRedemptions}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Discount Given</p>
                  <p className="text-2xl font-black font-mono text-emerald-950 mt-1">{INR(couponPerformance.totalDiscountGiven)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="text-left pb-3">Coupon Code</th>
                      <th className="text-right pb-3 px-3">Redemptions</th>
                      <th className="text-right pb-3 px-3">Avg Savings</th>
                      <th className="text-right pb-3 pl-3">Total Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {couponPerformance.topCoupons.map((c, i) => {
                      const avgDisc = c.redemptions > 0 ? c.discountGiven / c.redemptions : 0;
                      return (
                        <tr key={`${c.code}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <Ticket className="h-3.5 w-3.5 text-amber-500" />
                            {c.code}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">{c.redemptions}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{INR(Math.round(avgDisc))}</td>
                          <td className="py-3 pl-3 text-right font-black font-mono text-amber-600 text-sm">{INR(c.discountGiven)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
