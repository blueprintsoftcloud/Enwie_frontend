// src/dashboard/PaymentTransactionLogs.tsx
// Payment Transaction Logs — Admin & Super Admin.
// Shows every payment lifecycle event with Razorpay IDs, gateway response,
// signature verification status, and full order detail in a side-drawer.

import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  CreditCardIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  DocumentMagnifyingGlassIcon,
  WifiIcon,
  BanknotesIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheckIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import DatePicker from "../components/DatePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentUser {
  id: string;
  username: string;
  email: string | null;
  phone: string;
  role?: string;
}

interface PaymentOrder {
  id: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  finalAmount: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  transactionId?: string | null;
  paymentScreenshot?: string | null;
  shippingAddress: Record<string, string>;
  createdAt: string;
}

interface PaymentLog {
  id: string;
  orderId: string;
  event: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  transactionId?: string | null;
  paymentScreenshot?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  gatewayResponse: Record<string, unknown> | null;
  signatureValid: boolean | null;
  ipAddress: string | null;
  createdAt: string;
  user: PaymentUser;
  order: Omit<PaymentOrder, "razorpayOrderId" | "razorpayPaymentId" | "razorpaySignature" | "shippingAddress" | "createdAt" | "totalAmount" | "shippingCharge" | "discountAmount" | "paymentStatus" | "paymentMethod">;
}

interface DetailLog extends PaymentLog {
  order: PaymentOrder;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Summary {
  paid: number;
  failed: number;
  pending: number;
  refunded: number;
  totalRevenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; color: string }> = {
  ORDER_CREATED:      { label: "Order Created",     color: "bg-blue-100 text-blue-700" },
  PAYMENT_SUCCESS:    { label: "Payment Success",   color: "bg-green-100 text-green-700" },
  PAYMENT_FAILED:     { label: "Payment Failed",    color: "bg-red-100 text-red-700" },
  ORDER_POD:          { label: "Placed (COD)",      color: "bg-amber-100 text-amber-700" },
  ORDER_QR:           { label: "Placed (QR)",       color: "bg-purple-100 text-purple-700" },
  ADMIN_ORDER_PLACED: { label: "Admin Order",       color: "bg-violet-100 text-violet-700" },
  ORDER_CANCELLED:    { label: "Order Cancelled",   color: "bg-orange-100 text-orange-700" },
  REFUND_RECORDED:    { label: "Refund Recorded",   color: "bg-purple-100 text-purple-700" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  PAID:     { label: "Paid",     color: "bg-green-100 text-green-700" },
  PENDING:  { label: "Pending",  color: "bg-yellow-100 text-yellow-700" },
  FAILED:   { label: "Failed",   color: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Refunded", color: "bg-purple-100 text-purple-700" },
};

const METHOD_META: Record<string, { label: string; color: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  ONLINE: { label: "Online", color: "bg-blue-100 text-blue-700", Icon: WifiIcon },
  QR:     { label: "Pay with QR", color: "bg-purple-100 text-purple-700", Icon: QrCodeIcon },
  POD:    { label: "COD",    color: "bg-gray-100 text-gray-700", Icon: BanknotesIcon },
  CASH:   { label: "Cash",   color: "bg-teal-100 text-teal-700", Icon: BanknotesIcon },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const truncate = (s: string | null | undefined, n = 18) =>
  s ? (s.length > n ? `${s.slice(0, n)}…` : s) : "—";

const orderRef = (orderId: string) => `#${orderId.slice(-8).toUpperCase()}`;

// A signature verdict only means something for a real Razorpay round trip — POD/CASH/
// admin/refund events never had a signature to check, so their stored value is `null`.
// Treat anything that isn't strictly `true`/`false` as "not applicable", not "invalid".
const hasSignatureVerdict = (v: boolean | null | undefined): v is boolean => v === true || v === false;

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({
  label, value, icon: Icon, color,
}: { label: string; value: string | number; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  </div>
);

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const DetailDrawer = ({
  logId,
  onClose,
}: { logId: string; onClose: () => void }) => {
  const [log, setLog] = useState<DetailLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/payment-logs/${logId}`)
      .then((r) => { if (!cancelled) setLog(r.data.log); })
      .catch(() => toast.error("Failed to load log detail"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [logId]);

  const evt = log ? (EVENT_META[log.event] ?? { label: log.event, color: "bg-gray-100 text-gray-700" }) : null;
  const sta = log ? (STATUS_META[log.paymentStatus] ?? { label: log.paymentStatus, color: "bg-gray-100 text-gray-700" }) : null;
  const method = log ? (METHOD_META[log.paymentMethod] ?? METHOD_META.POD) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <DocumentMagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">Transaction Detail</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : !log ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Log not found</div>
        ) : (
          <div className="p-6 space-y-6 text-sm">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${evt!.color}`}>{evt!.label}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sta!.color}`}>{sta!.label}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${method!.color}`}>
                <method.Icon className="w-3.5 h-3.5" />
                {method!.label}
              </span>
            </div>

            {/* Amount */}
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <p className="text-xs text-indigo-600 font-medium">Amount</p>
              <p className="text-3xl font-bold text-indigo-700 tabular-nums">{money(log.amount)}</p>
            </div>

            {/* Signature Verification — only meaningful for a real Razorpay round trip */}
            {hasSignatureVerdict(log.signatureValid) ? (
              <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${log.signatureValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {log.signatureValid
                  ? <ShieldCheckIcon className="w-5 h-5 shrink-0" />
                  : <ShieldExclamationIcon className="w-5 h-5 shrink-0" />}
                <span className="font-medium text-sm">
                  Razorpay signature {log.signatureValid ? "verified ✓" : "INVALID — possible tamper attempt ✗"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-gray-50 text-gray-500">
                <ShieldCheckIcon className="w-5 h-5 shrink-0 opacity-40" />
                <span className="font-medium text-sm">No gateway signature to verify for this event</span>
              </div>
            )}

            {/* Razorpay IDs */}
            <Section title="Razorpay Identifiers">
              <Row label="Order ID" value={log.razorpayOrderId ?? "—"} mono />
              <Row label="Payment ID" value={log.razorpayPaymentId ?? "—"} mono />
              <Row label="Signature" value={log.razorpaySignature ? truncate(log.razorpaySignature, 30) : "—"} mono />
            </Section>

            {/* QR Payment Verification */}
            {((log.transactionId || log.order?.transactionId) || (log.paymentScreenshot || log.order?.paymentScreenshot)) && (
              <Section title="QR Payment Verification">
                {(log.transactionId || log.order?.transactionId) && (
                  <Row label="Transaction ID / UTR" value={(log.transactionId || log.order?.transactionId)!} mono />
                )}
                {(log.paymentScreenshot || log.order?.paymentScreenshot) && (
                  <div className="py-1.5 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Receipt Screenshot</span>
                    <a
                      href={(log.paymentScreenshot || log.order?.paymentScreenshot)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 font-bold hover:underline"
                    >
                      View Receipt ↗
                    </a>
                  </div>
                )}
              </Section>
            )}

            {/* Order Info */}
            <Section title="Order Info">
              <Row label="Order Ref" value={orderRef(log.orderId)} />
              <Row label="Order Status" value={log.order?.orderStatus ?? "—"} />
              <Row label="Final Amount" value={log.order ? money(log.order.finalAmount) : "—"} />
              {log.order?.shippingAddress && (
                <Row
                  label="Delivery To"
                  value={`${log.order.shippingAddress.city || ""}, ${log.order.shippingAddress.state || ""} ${log.order.shippingAddress.zipCode || ""}`}
                />
              )}
            </Section>

            {/* Customer */}
            <Section title="Customer">
              <Row label="Name" value={log.user?.username ?? "—"} />
              <Row label="Email" value={log.user?.email ?? "—"} />
              <Row label="Phone" value={log.user?.phone ?? "—"} />
            </Section>

            {/* Gateway Response */}
            {log.gatewayResponse && (
              <Section title="Raw Gateway Response">
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-auto max-h-48 text-gray-700">
                  {JSON.stringify(log.gatewayResponse, null, 2)}
                </pre>
              </Section>
            )}

            {/* Meta */}
            <Section title="Meta">
              <Row label="IP Address" value={log.ipAddress ?? "—"} mono />
              <Row label="Currency" value={log.currency} />
              <Row label="Logged At" value={fmt(log.createdAt)} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
    <div className="bg-gray-50 rounded-lg divide-y divide-gray-100 border border-gray-200">
      {children}
    </div>
  </div>
);

const Row = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between items-center px-3 py-2">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className={`text-gray-900 text-xs text-right break-all max-w-[60%] ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentTransactionLogs() {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  useBodyScrollLock(!!selectedLogId);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("method", methodFilter);
      if (eventFilter) params.set("event", eventFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const { data } = await api.get(`/payment-logs?${params}`);
      setLogs(data.logs);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch {
      toast.error("Failed to load payment logs");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, methodFilter, eventFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const handleReset = () => {
    setSearch(""); setStatusFilter(""); setMethodFilter("");
    setEventFilter(""); setFromDate(""); setToDate("");
  };

  const hasFilters = Boolean(search || statusFilter || methodFilter || eventFilter || fromDate || toDate);
  const isSystemEmpty = !loading && logs.length === 0 && !hasFilters;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <CreditCardIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-950">Payment Transaction Logs</h1>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 tabular-nums">
                  {pagination.total.toLocaleString("en-IN")} {pagination.total === 1 ? "log" : "logs"}
                </span>
              )}
            </div>
            <p className="text-sm mt-1 text-gray-500">Razorpay IDs, gateway responses, and signature verification</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isSystemEmpty && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
            </button>
          )}
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Revenue"
            value={money(summary.totalRevenue)}
            icon={CreditCardIcon}
            color="bg-indigo-100 text-indigo-600"
          />
          <SummaryCard
            label="Paid"
            value={summary.paid}
            icon={CheckCircleIcon}
            color="bg-green-100 text-green-600"
          />
          <SummaryCard
            label="Pending"
            value={summary.pending}
            icon={ClockIcon}
            color="bg-yellow-100 text-yellow-600"
          />
          <SummaryCard
            label="Failed"
            value={summary.failed}
            icon={XCircleIcon}
            color="bg-red-100 text-red-600"
          />
          <SummaryCard
            label="Refunded"
            value={summary.refunded}
            icon={ArrowUturnLeftIcon}
            color="bg-purple-100 text-purple-600"
          />
        </div>
      )}

      {/* Search bar & Filter Panel - only render if logs exist or active filter is present */}
      {!isSystemEmpty && (
        <>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Razorpay ID, customer name, email, or order ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {showFilters && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All</option>
                  <option value="ONLINE">Online</option>
                  <option value="POD">Cash on Delivery (COD)</option>
                  <option value="CASH">Cash (Admin-placed)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Event</label>
                <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All</option>
                  <option value="ORDER_CREATED">Order Created</option>
                  <option value="PAYMENT_SUCCESS">Payment Success</option>
                  <option value="PAYMENT_FAILED">Payment Failed</option>
                  <option value="ORDER_POD">Placed (COD)</option>
                  <option value="ADMIN_ORDER_PLACED">Admin Order</option>
                  <option value="ORDER_CANCELLED">Order Cancelled</option>
                  <option value="REFUND_RECORDED">Refund Recorded</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <DatePicker value={fromDate} onChange={setFromDate}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <DatePicker value={toDate} onChange={setToDate} align="right"
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
              </div>
              {hasFilters && (
                <div className="col-span-full flex justify-end">
                  <button onClick={handleReset}
                    className="text-xs text-indigo-600 hover:underline font-medium">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Ref</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Razorpay ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sig. Valid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 2 ? "70%" : "50%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <DocumentMagnifyingGlassIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">
                      {hasFilters ? "No logs match these filters" : "No payment logs yet"}
                    </p>
                    {hasFilters && (
                      <button onClick={handleReset} className="mt-2 text-xs text-indigo-600 hover:underline font-medium">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const evt = EVENT_META[log.event] ?? { label: log.event, color: "bg-gray-100 text-gray-700" };
                  const sta = STATUS_META[log.paymentStatus] ?? { label: log.paymentStatus, color: "bg-gray-100 text-gray-700" };
                  const method = METHOD_META[log.paymentMethod] ?? METHOD_META.POD;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedLogId(log.id)}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${evt.color}`}>
                          {evt.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {orderRef(log.orderId)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{log.user?.username ?? ""}</p>
                        <p className="text-xs text-gray-500">{log.user?.email ?? log.user?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${method.color}`}>
                          <method.Icon className="w-3 h-3" />
                          {method.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {truncate(log.razorpayPaymentId ?? log.razorpayOrderId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sta.color}`}>
                          {sta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                        {money(log.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {!hasSignatureVerdict(log.signatureValid) ? (
                          <span className="text-xs text-gray-400">N/A</span>
                        ) : log.signatureValid ? (
                          <ShieldCheckIcon className="w-4 h-4 text-green-500" title="Signature valid" />
                        ) : (
                          <ShieldExclamationIcon className="w-4 h-4 text-red-500" title="Signature INVALID" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmt(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLogId(log.id); }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedLogId && (
        <DetailDrawer logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
      )}
    </div>
  );
}
