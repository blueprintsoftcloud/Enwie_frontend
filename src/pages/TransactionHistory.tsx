import { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { motion, Variants } from "framer-motion";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowLeft,
  Banknote,
  Wifi,
  Truck,
  Receipt,
  ShoppingBag,
  QrCode,
  RotateCcw,
} from "lucide-react";
// ── Types ────────────────────────────────────────────────────────────────────

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
  coupon: { code: string } | null;
  items: TransactionItem[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement }> = {
  PAID: { cls: "bg-emerald-500 text-white border-emerald-600", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PENDING: { cls: "bg-amber-400 text-white border-amber-500", icon: <Clock className="w-3.5 h-3.5" /> },
  FAILED: { cls: "bg-red-500 text-white border-red-600", icon: <XCircle className="w-3.5 h-3.5" /> },
  REFUNDED: { cls: "bg-violet-500 text-white border-violet-600", icon: <CreditCard className="w-3.5 h-3.5" /> },
};

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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm bg-slate-100 text-slate-600 border-slate-200">
        <XCircle className="w-3.5 h-3.5 text-slate-400" /> No Payment Made
      </span>
    );
  }
  const { cls, icon } = PAYMENT_STATUS_CFG[status] ?? PAYMENT_STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${cls}`}>
      {icon} {status}
    </span>
  );
};

const ORDER_STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement; label: string }> = {
  PROCESSING: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3.5 h-3.5" />, label: "Processing" },
  CONFIRMED: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Confirmed" },
  SHIPPED: { cls: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: <Truck className="w-3.5 h-3.5" />, label: "Shipped" },
  DELIVERED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Package className="w-3.5 h-3.5" />, label: "Delivered" },
  CANCELLED: { cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" />, label: "Cancelled" },
  RETURNED: { cls: "bg-purple-50 text-purple-700 border-purple-200", icon: <RotateCcw className="w-3.5 h-3.5" />, label: "Returned" },
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const cfg = ORDER_STATUS_CFG[status] ?? { cls: "bg-gray-50 text-gray-600 border-gray-200", icon: <Package className="w-3.5 h-3.5" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const PAYMENT_METHOD_CFG: Record<string, { label: string; icon: React.ReactElement }> = {
  ONLINE: { label: "Online", icon: <Wifi className="w-3.5 h-3.5 text-[var(--theme-primary)]" /> },
  QR: { label: "Pay with QR", icon: <QrCode className="w-3.5 h-3.5 text-purple-600" /> },
  POD: { label: "Pay on Delivery", icon: <Banknote className="w-3.5 h-3.5 text-amber-600" /> },
  CASH: { label: "Cash", icon: <Banknote className="w-3.5 h-3.5 text-teal-600" /> },
};

const PaymentMethodBadge = ({ method }: { method: string }) => {
  const cfg = PAYMENT_METHOD_CFG[method] ?? PAYMENT_METHOD_CFG.POD;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-white text-gray-600 border-gray-200 shadow-sm">
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Animations ────────────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="rounded-3xl border border-gray-100 bg-gray-50/50 px-6 py-5 animate-pulse">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 bg-gray-200 rounded" />
              <div className="h-3.5 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-gray-200 rounded-full" />
        <div className="h-7 w-24 bg-gray-200 rounded-full" />
      </div>
    </div>
  </div>
);

// ── Expanded detail panel — shared between the desktop table row and mobile card ──

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const TransactionDetails = ({
  tx,
  onViewInvoice,
}: {
  tx: Transaction;
  onViewInvoice: () => void;
}) => (
  <div className="space-y-6">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
        Items Summary
      </p>
      <div className="divide-y divide-gray-50 bg-gray-50/50 rounded-2xl border border-gray-100 px-5">
        {tx.items.map((it, idx) => (
          <div key={idx} className="flex items-center py-4 gap-4">
            {it.product?.image ? (
              <img
                src={it.product.image}
                alt={it.product.name}
                className="w-12 h-12 object-cover rounded-xl border border-gray-100 bg-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Package className="w-5 h-5 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {it.product?.name ?? "Product Unavailable"}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Qty {it.quantity} × {fmt(it.price)}
              </p>
            </div>
            <p className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
              {fmt(it.quantity * it.price)}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Payment Breakdown
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 text-sm shadow-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Subtotal</span>
            <span className="font-bold text-gray-800 tabular-nums">{fmt(tx.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Shipping Charge</span>
            <span className="font-bold text-gray-800 tabular-nums">
              {tx.shippingCharge === 0 ? (
                <span className="text-emerald-600 font-bold uppercase text-xs tracking-wide">Free</span>
              ) : (
                fmt(tx.shippingCharge)
              )}
            </span>
          </div>
          {tx.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span className="inline-flex items-center gap-1.5">
                Coupon applied
                {tx.coupon?.code && (
                  <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                    {tx.coupon.code}
                  </span>
                )}
              </span>
              <span className="font-bold tabular-nums">-{fmt(tx.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-3 font-black text-base text-gray-900">
            <span>Total Net Paid</span>
            <span className="tabular-nums">{fmt(tx.finalAmount)}</span>
          </div>
        </div>
      </div>

      {tx.paymentMethod === "ONLINE" && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Payment Reference Gateway
          </p>
          <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 space-y-2.5 text-xs font-mono text-gray-600 break-all shadow-inner">
            {tx.razorpayPaymentId && (
              <p className="flex flex-col gap-0.5">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Gateway Payment ID
                </span>
                <span className="text-gray-800 font-medium">{tx.razorpayPaymentId}</span>
              </p>
            )}
            {tx.razorpayOrderId && (
              <p className="flex flex-col gap-0.5 pt-1">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Razorpay Order Reference
                </span>
                <span className="text-gray-800 font-medium">{tx.razorpayOrderId}</span>
              </p>
            )}
            {!tx.razorpayPaymentId && !tx.razorpayOrderId && (
              <p className="font-sans text-gray-400 italic">
                No transaction gateway references documented.
              </p>
            )}
          </div>
        </div>
      )}
    </div>

    <button
      onClick={onViewInvoice}
      className="w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-md transition-all text-center hover:brightness-110"
      style={{ background: "var(--theme-primary)", color: "var(--theme-primary-ink)" }}
    >
      View Invoice
    </button>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/order/my-transactions?page=${p}&limit=10`);
      setTransactions(res.data.transactions ?? []);
      setPagination(res.data.pagination ?? null);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="relative bg-white min-h-screen pb-20 pt-(--app-header-h) font-sans overflow-x-hidden">
      {/* Decorative background blob — themed. `absolute` (not `fixed`) so the
          `overflow-x-hidden` above actually clips it instead of letting it bleed
          past the viewport edge and force a page-wide horizontal scrollbar. */}
      <div
        className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full blur-3xl opacity-40 pointer-events-none z-0"
        style={{ background: "color-mix(in srgb, var(--theme-accent) 35%, transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-6">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors duration-300 mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            Go Back
          </button>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-hover) 100%)" }}
            >
              <Receipt className="w-5.5 h-5.5" style={{ color: "var(--theme-primary-ink)" }} />
            </div>
            <div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900"
                style={{ fontFamily: "var(--theme-font-heading)" }}
              >
                Transaction History
              </h1>
              {!loading && pagination && (
                <p className="text-sm text-gray-400 mt-1">
                  {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "color-mix(in srgb, var(--theme-primary) 10%, white)" }}
            >
              <ShoppingBag className="w-7 h-7" style={{ color: "var(--theme-primary)" }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
              No Transactions Yet
            </h3>
            <p className="mt-2 text-gray-500 font-light max-w-xs mx-auto">
              Your billing and payment histories will settle here once an order has been initiated.
            </p>
            <button
              onClick={() => navigate("/products")}
              className="mt-6 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all hover:brightness-110"
              style={{ background: "var(--theme-primary)", color: "var(--theme-primary-ink)" }}
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Desktop: real table, contained horizontal scroll only if the
                  viewport is ever narrower than the table needs — never the page. */}
              <div className="hidden md:block bg-white rounded-3xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/70 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Order ID</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Order</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Method</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map((tx) => {
                        const isOpen = expanded === tx.id;
                        return (
                          <Fragment key={tx.id}>
                            <tr
                              className="cursor-pointer select-none hover:bg-gray-50/70 transition-colors"
                              onClick={() => setExpanded(isOpen ? null : tx.id)}
                            >
                              <td className="px-5 py-4 whitespace-nowrap text-gray-600 font-medium">{fmtDate(tx.createdAt)}</td>
                              <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                                #{tx.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                {fmt(tx.finalAmount)}
                              </td>
                              <td className="px-5 py-4"><OrderStatusBadge status={tx.orderStatus} /></td>
                              <td className="px-5 py-4"><PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} /></td>
                              <td className="px-5 py-4"><PaymentMethodBadge method={tx.paymentMethod} /></td>
                              <td className="px-5 py-4 text-center">
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" strokeWidth={2.5} />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" strokeWidth={2.5} />
                                )}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={7} className="bg-gray-50/50 px-6 py-7">
                                  <TransactionDetails tx={tx} onViewInvoice={() => navigate(`/invoice/${tx.id}`)} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: compact stacked cards — a table doesn't work at this width */}
              <div className="md:hidden space-y-4">
                {transactions.map((tx) => {
                  const isOpen = expanded === tx.id;
                  return (
                    <motion.div
                      key={tx.id}
                      variants={itemVariants}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    >
                      <div
                        className="p-4 cursor-pointer select-none"
                        onClick={() => setExpanded(isOpen ? null : tx.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400 font-medium">{fmtDate(tx.createdAt)}</p>
                            <p className="text-xs font-mono text-gray-500 mt-0.5">#{tx.id.slice(-8).toUpperCase()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-base font-bold text-gray-900 tabular-nums">{fmt(tx.finalAmount)}</p>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <OrderStatusBadge status={tx.orderStatus} />
                          <PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} />
                          <PaymentMethodBadge method={tx.paymentMethod} />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-6">
                          <TransactionDetails tx={tx} onViewInvoice={() => navigate(`/invoice/${tx.id}`)} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 rounded-full border border-gray-200 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="p-3 rounded-full border border-gray-200 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
