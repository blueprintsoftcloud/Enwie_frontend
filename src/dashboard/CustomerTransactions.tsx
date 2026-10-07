import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  User,
  Wifi,
  Banknote,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Truck,
  Undo2,
  AlertTriangle,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransactionUser {
  id: string;
  username: string;
  email: string;
  phone?: string;
}

interface TransactionItem {
  product: { id: string; name: string; image: string } | null;
  quantity: number;
  price: number;
}

interface Transaction {
  id: string;
  createdAt: string;
  paymentMethod: "ONLINE" | "POD" | "CASH" | "QR";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  orderStatus: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  finalAmount: number;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  transactionId?: string | null;
  paymentScreenshot?: string | null;
  coupon: { code: string } | null;
  user: TransactionUser;
  items: TransactionItem[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const PaymentStatusBadge = ({
  status,
  orderStatus,
  paymentMethod,
}: {
  status: string;
  orderStatus?: string;
  paymentMethod?: string;
}) => {
  const isCod = paymentMethod === "POD" || paymentMethod === "COD" || paymentMethod === "CASH";

  if (orderStatus === "CANCELLED" && status === "PENDING" && isCod) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
        <XCircle className="w-3.5 h-3.5 text-slate-400" /> No Payment Made
      </span>
    );
  }
  const cfg: Record<string, { cls: string; icon: React.ReactElement }> = {
    PAID: { cls: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    PENDING: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3.5 h-3.5" /> },
    FAILED: { cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" /> },
    REFUNDED: { cls: "bg-purple-100 text-purple-700 border-purple-200", icon: <Undo2 className="w-3.5 h-3.5" /> },
  };
  const { cls, icon } = cfg[status] ?? cfg["PENDING"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {icon} {status}
    </span>
  );
};

const ORDER_STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement; label: string }> = {
  PROCESSING: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3.5 h-3.5" />, label: "Processing" },
  CONFIRMED: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Confirmed" },
  SHIPPED: { cls: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: <Truck className="w-3.5 h-3.5" />, label: "Shipped" },
  DELIVERED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Package className="w-3.5 h-3.5" />, label: "Delivered" },
  CANCELLED: { cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" />, label: "Cancelled" },
  RETURNED: { cls: "bg-purple-50 text-purple-700 border-purple-200", icon: <Undo2 className="w-3.5 h-3.5" />, label: "Returned" },
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const cfg = ORDER_STATUS_CFG[status] ?? { cls: "bg-gray-100 text-gray-700 border-gray-200", icon: <Package className="w-3.5 h-3.5" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const PAYMENT_METHOD_CFG: Record<string, { cls: string; label: string }> = {
  ONLINE: { cls: "bg-blue-100 text-blue-700 border-blue-200", label: "Online" },
  QR: { cls: "bg-purple-100 text-purple-700 border-purple-200", label: "Pay with QR" },
  POD: { cls: "bg-gray-100 text-gray-700 border-gray-200", label: "COD" },
  CASH: { cls: "bg-teal-100 text-teal-700 border-teal-200", label: "Cash" },
};

const PaymentMethodBadge = ({ method }: { method: string }) => {
  const cfg = PAYMENT_METHOD_CFG[method] ?? PAYMENT_METHOD_CFG.POD;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {method === "QR" ? <QrCode className="w-3 h-3 text-purple-600" /> : method === "ONLINE" ? <Wifi className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
};

// ── Payment breakdown + reference block, shared between desktop/mobile ────────

const PaymentDetails = ({
  tx,
  onRefund,
  refunding,
}: {
  tx: Transaction;
  onRefund: (tx: Transaction) => void;
  refunding: boolean;
}) => {
  const canRefund = tx.paymentStatus === "PAID" && (tx.orderStatus === "CANCELLED" || tx.orderStatus === "RETURNED");
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Payment Breakdown</p>
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tx.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span>
              {tx.shippingCharge === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tx.shippingCharge)
              )}
            </span>
          </div>
          {tx.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                Coupon
                {tx.coupon?.code && <span className="ml-1 font-mono text-xs">({tx.coupon.code})</span>}
              </span>
              <span>-{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tx.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-gray-900">
            <span>Total</span>
            <span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tx.finalAmount)}</span>
          </div>
        </div>
      </div>

      {tx.paymentMethod === "ONLINE" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Payment Reference</p>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-xs font-mono text-gray-600 break-all space-y-1">
            {tx.razorpayPaymentId && (
              <p>
                <span className="font-sans font-semibold mr-1">Payment ID:</span>
                {tx.razorpayPaymentId}
              </p>
            )}
            {tx.razorpayOrderId && (
              <p>
                <span className="font-sans font-semibold mr-1">Razorpay Order:</span>
                {tx.razorpayOrderId}
              </p>
            )}
            {tx.transactionId && (
              <p>
                <span className="font-sans font-semibold mr-1">Transaction / UTR:</span>
                <span className="text-purple-700 font-bold">{tx.transactionId}</span>
              </p>
            )}
            {tx.paymentScreenshot && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="font-sans font-semibold block text-gray-700 mb-1">Receipt Screenshot:</span>
                <a
                  href={tx.paymentScreenshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Payment Receipt
                </a>
              </div>
            )}
            {tx.user?.phone && (
              <p className="font-sans">
                <span className="font-semibold mr-1">Phone:</span>
                {tx.user.phone}
              </p>
            )}
            {!tx.razorpayPaymentId && !tx.razorpayOrderId && !tx.transactionId && !tx.paymentScreenshot && (
              <p className="font-sans text-gray-400 italic">No payment reference.</p>
            )}
          </div>
        </div>
      )}

      {/* Refund action — reachable for a PAID payment on a CANCELLED or RETURNED order.
          Storra has no live gateway refund integration; this only records that a
          refund was already handled outside the system (see order.controller.ts's
          refundOrder), so paymentStatus doesn't stay stuck on "PAID" forever. */}
      {canRefund && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-800">
                Payment collected on a {tx.orderStatus === "RETURNED" ? "returned" : "cancelled"} order
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Once you've refunded this customer outside Storra, record it here so this doesn't keep showing as PAID.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefund(tx);
                }}
                disabled={refunding}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {refunding ? "Recording…" : "Mark as Refunded"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function CustomerTransactions() {
  // This page (Payment History) is reachable via ORDER_VIEW alone (see StaffDashboard.
  // tsx's buildNav) — refunding is a genuinely different, write-level permission
  // (ORDER_UPDATE, same one the actual /order/:id/refund route requires). A staff
  // member with ORDER_VIEW but not ORDER_UPDATE could previously click Refund and get
  // a raw backend 403 with no warning.
  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();
  const canRefund = user.role !== "STAFF" || hasPermission("ORDER_UPDATE");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refundConfirmTx, setRefundConfirmTx] = useState<Transaction | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const fetchTransactions = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("limit", "15");
        if (search) params.set("search", search);
        if (paymentStatus) params.set("paymentStatus", paymentStatus);
        if (paymentMethod) params.set("paymentMethod", paymentMethod);

        const res = await api.get(`/order/customer-transactions?${params.toString()}`);
        setTransactions(res.data.transactions ?? []);
        setPagination(res.data.pagination ?? null);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [search, paymentStatus, paymentMethod],
  );

  useEffect(() => {
    setPage(1);
  }, [search, paymentStatus, paymentMethod]);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setPaymentStatus("");
    setPaymentMethod("");
    setPage(1);
  };

  const handleConfirmRefund = async () => {
    if (!refundConfirmTx) return;
    if (!canRefund) {
      toast.error("You don't have permission to issue refunds — ask an admin to grant it.");
      setRefundConfirmTx(null);
      return;
    }
    const tx = refundConfirmTx;
    setRefundConfirmTx(null);
    setRefundingId(tx.id);
    try {
      await api.patch(`/order/${tx.id}/refund`);
      toast.success("Refund recorded");
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, paymentStatus: "REFUNDED" } : t)));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to record refund");
    } finally {
      setRefundingId(null);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const hasFilters = search || paymentStatus || paymentMethod;
  const isSystemEmpty = !loading && transactions.length === 0 && !hasFilters;

  return (
    <div className="px-8 py-8 w-full bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-200">
            <CreditCard className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-950">Customer Payment History</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Track customer checkouts, evaluate transactional platform values, filter specific reference settlement tokens, and monitor active processing status logs.
            </p>
          </div>
        </div>
        {pagination && pagination.total > 0 && (
          <span className="hidden lg:inline-flex items-center self-start md:self-center px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500 tabular-nums">
            {pagination.total.toLocaleString("en-IN")} transactions
          </span>
        )}
      </div>

      {/* Filters - only render if transactions exist or active filter is present */}
      {!isSystemEmpty && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white cursor-pointer"
            >
              <option value="">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white cursor-pointer"
            >
              <option value="">All Payment Methods</option>
              <option value="ONLINE">Online (Razorpay)</option>
              <option value="POD">Cash on Delivery (COD)</option>
              <option value="CASH">Cash (Admin-placed)</option>
            </select>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            {pagination ? `${pagination.total} transaction${pagination.total !== 1 ? "s" : ""} found` : ""}
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No transactions found</p>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-3 text-sm text-blue-600 hover:underline cursor-pointer">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Order</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => {
                  const needsRefundAttention = tx.paymentStatus === "PAID" && (tx.orderStatus === "CANCELLED" || tx.orderStatus === "RETURNED");
                  return (
                  <React.Fragment key={tx.id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${needsRefundAttention ? "bg-amber-50/40" : ""}`}
                      onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{tx.user?.username ?? "Deleted User"}</p>
                            <p className="text-xs text-gray-400">{tx.user?.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">#{tx.id.slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{fmtDate(tx.createdAt)}</td>
                      <td className="px-4 py-3">
                        <PaymentMethodBadge method={tx.paymentMethod} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} />
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={tx.orderStatus} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(tx.finalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        {expanded === tx.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expanded === tx.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Items */}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Items Ordered</p>
                              <div className="space-y-2">
                                {tx.items.map((it, idx) => (
                                  <div key={idx} className="flex items-center gap-3">
                                    {it.product?.image ? (
                                      <img
                                        src={it.product.image}
                                        alt={it.product.name}
                                        className="w-9 h-9 object-cover rounded-lg border border-gray-200"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Package className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {it.product?.name ?? "Deleted Product"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Qty {it.quantity} × {fmt(it.price)}
                                      </p>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">{fmt(it.quantity * it.price)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <PaymentDetails tx={tx} onRefund={setRefundConfirmTx} refunding={refundingId === tx.id} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => {
              const needsRefundAttention = tx.paymentStatus === "PAID" && (tx.orderStatus === "CANCELLED" || tx.orderStatus === "RETURNED");
              return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${needsRefundAttention ? "border-amber-200" : "border-gray-100"}`}
              >
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{tx.user?.username ?? "Deleted User"}</p>
                        <p className="text-xs text-gray-400">{tx.user?.email ?? "—"}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{fmt(tx.finalAmount)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} />
                    <OrderStatusBadge status={tx.orderStatus} />
                    <PaymentMethodBadge method={tx.paymentMethod} />
                    <span className="text-xs text-gray-400 ml-auto">{fmtDate(tx.createdAt)}</span>
                  </div>
                </div>

                {expanded === tx.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    <div className="space-y-2">
                      {tx.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {it.product?.image ? (
                            <img
                              src={it.product.image}
                              alt={it.product.name}
                              className="w-9 h-9 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 text-xs">
                            <p className="font-medium text-gray-800 truncate">{it.product?.name ?? "Deleted Product"}</p>
                            <p className="text-gray-400">
                              Qty {it.quantity} × {fmt(it.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <PaymentDetails tx={tx} onRefund={setRefundConfirmTx} refunding={refundingId === tx.id} />
                  </div>
                )}
              </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-full border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-full border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Refund confirm — replaces window.confirm so it matches the app's styling */}
      {refundConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Undo2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Mark {fmt(refundConfirmTx.finalAmount)} as refunded?
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    This only updates Storra's own records — it doesn't trigger a real refund through Razorpay or
                    any gateway. Only confirm once you've actually refunded {refundConfirmTx.user?.username ?? "the customer"} outside the system.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handleConfirmRefund}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition cursor-pointer"
              >
                Mark as Refunded
              </button>
              <button
                onClick={() => setRefundConfirmTx(null)}
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
