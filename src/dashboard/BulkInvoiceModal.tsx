// src/dashboard/BulkInvoiceModal.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Receipt,
  Layers,
  Calendar,
  CreditCard,
  Building2,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import api from "../utils/api";

interface BulkInvoiceOrder {
  id: string;
  createdAt: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus: string;
  shippingAddress?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  user?: {
    username?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    quantity: number;
    price: number;
    product?: {
      name: string;
      code?: string;
      image?: string;
    };
    variant?: {
      options?: Record<string, string>;
    };
  }>;
  coupon?: {
    code: string;
  };
  invoicePrinted?: boolean;
  invoicePrintedAt?: string | null;
}

interface CompanySettings {
  COMPANY_NAME?: string;
  COMPANY_TAGLINE?: string;
  COMPANY_LOGO?: string;
  INVOICE_FORMAT?: "A4" | "THERMAL";
}

interface BulkInvoiceModalProps {
  orderIds?: string[];
  unprintedOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkInvoiceModal({
  orderIds,
  unprintedOnly,
  onClose,
  onSuccess,
}: BulkInvoiceModalProps) {
  const [orders, setOrders] = useState<BulkInvoiceOrder[]>([]);
  const [company, setCompany] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"A4" | "THERMAL">("A4");
  const [showConfirm, setShowConfirm] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [ordersRes, settingsRes] = await Promise.all([
          api.get("/order/bulk-invoices", {
            params: {
              orderIds: orderIds?.length ? orderIds.join(",") : undefined,
              unprintedOnly: unprintedOnly ? "true" : undefined,
              limit: 100,
            },
          }),
          api.get("/admin/company-settings").catch(() => ({ data: { settings: {} } })),
        ]);

        if (mounted) {
          const loadedOrders = ordersRes.data?.orders ?? [];
          setOrders(loadedOrders);
          const s = settingsRes.data?.settings ?? {};
          setCompany(s);
          if (s.INVOICE_FORMAT === "THERMAL") {
            setFormat("THERMAL");
          }
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Failed to load orders for invoice printing");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [orderIds, unprintedOnly]);

  const totalValue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
  const companyName = company.COMPANY_NAME || "Store";
  const companyTagline = company.COMPANY_TAGLINE || "Official Invoice";

  const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatVariant = (variant?: { options?: Record<string, string> } | null) => {
    if (!variant?.options) return "";
    return Object.entries(variant.options)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  };

  // ── A4 Print Handler ────────────────────────────────────────────────────────
  const handleA4Print = () => {
    window.print();
    setShowConfirm(true);
  };

  // ── Thermal (80mm) PDF Download Handler ──────────────────────────────────────
  const handleDownloadThermalPdf = () => {
    if (orders.length === 0) return;

    const PAGE_WIDTH = 80;
    const MARGIN = 4;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const MM_PER_PT = 25.4 / 72;
    const COURIER_CHAR_WIDTH_EM = 0.6;
    const fmtPdf = (n: number) => `Rs.${n.toFixed(2)}`;

    const wrapText = (text: string, maxWidthMm: number, sizePt: number): string[] => {
      const charWidthMm = sizePt * COURIER_CHAR_WIDTH_EM * MM_PER_PT;
      const maxChars = Math.max(1, Math.floor(maxWidthMm / charWidthMm));
      if (text.length <= maxChars) return [text];
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    type DrawCmd =
      | { kind: "text"; text: string; x: number; y: number; align: "left" | "center" | "right"; size: number; bold: boolean }
      | { kind: "line"; y: number };

    // We calculate heights for each receipt
    const compiledOrders = orders.map((order) => {
      const commands: DrawCmd[] = [];
      let y = MARGIN;

      const addLine = (text: string, opts: { align?: "left" | "center" | "right"; size?: number; bold?: boolean } = {}) => {
        const { align = "left", size = 9, bold = false } = opts;
        const maxWidth = align === "center" ? PAGE_WIDTH - MARGIN * 2 : CONTENT_WIDTH;
        const wrapped = wrapText(text, maxWidth, size);
        const lineHeight = size * 0.65;
        wrapped.forEach((line) => {
          const x = align === "center" ? PAGE_WIDTH / 2 : align === "right" ? PAGE_WIDTH - MARGIN : MARGIN;
          commands.push({ kind: "text", text: line, x, y, align, size, bold });
          y += lineHeight;
        });
      };

      const addRow = (left: string, right: string, opts: { size?: number; bold?: boolean } = {}) => {
        const { size = 9, bold = false } = opts;
        commands.push({ kind: "text", text: left, x: MARGIN, y, align: "left", size, bold });
        commands.push({ kind: "text", text: right, x: PAGE_WIDTH - MARGIN, y, align: "right", size, bold });
        y += size * 0.65;
      };

      const addDivider = () => {
        y += 2;
        commands.push({ kind: "line", y });
        y += 4;
      };

      const addGap = () => {
        y += 3;
      };

      const invoiceNumber = `INV-${order.id.slice(-10).toUpperCase()}`;
      const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const addr = order.shippingAddress ?? {};

      addLine(companyName, { align: "center", size: 13, bold: true });
      if (companyTagline) addLine(companyTagline, { align: "center", size: 8 });
      addDivider();

      addLine(`Invoice: ${invoiceNumber}`, { size: 9, bold: true });
      addLine(`Date: ${invoiceDate}`);
      addLine(`Order: #${order.id.slice(-8).toUpperCase()}`);
      addLine(`Status: ${order.orderStatus}`);
      const methodLabel = order.paymentMethod === "ONLINE" ? "Online" : order.paymentMethod === "QR" ? "QR" : "POD";
      addLine(`Payment: ${methodLabel}`);
      addDivider();

      addLine("BILL TO", { size: 7, bold: true });
      if (order.user) {
        addLine(order.user.username ?? "Customer", { bold: true });
        if (order.user.email) addLine(order.user.email);
        if (order.user.phone) addLine(order.user.phone);
      } else {
        addLine("Customer info unavailable");
      }
      addGap();

      addLine("SHIP TO", { size: 7, bold: true });
      if (addr.fullAddress) addLine(addr.fullAddress);
      const cityLine = [addr.city, addr.state].filter(Boolean).join(", ") + (addr.zipCode ? ` - ${addr.zipCode}` : "");
      if (cityLine.trim()) addLine(cityLine);
      if (addr.country) addLine(addr.country);
      addDivider();

      order.items.forEach((item) => {
        addLine(item.product?.name ?? "Product", { bold: true });
        const variantLabel = formatVariant(item.variant);
        if (variantLabel) addLine(variantLabel, { size: 7 });
        addRow(`${item.quantity} x ${fmtPdf(item.price)}`, fmtPdf(item.price * item.quantity));
        addGap();
      });
      addDivider();

      addRow("Subtotal", fmtPdf(order.totalAmount));
      addRow("Shipping", order.shippingCharge > 0 ? fmtPdf(order.shippingCharge) : "Free");
      if (order.discountAmount > 0) {
        addRow(`Discount${order.coupon ? ` (${order.coupon.code})` : ""}`, `-${fmtPdf(order.discountAmount)}`);
      }
      if (order.taxAmount > 0) {
        addRow("Tax", fmtPdf(order.taxAmount));
      }
      addGap();
      addRow("TOTAL", fmtPdf(order.finalAmount), { size: 11, bold: true });
      addDivider();

      addLine(`Thank you for shopping with ${companyName}.`, { align: "center", size: 8 });
      addLine("Computer-generated receipt.", { align: "center", size: 8 });

      const finalHeight = Math.max(y + MARGIN, 90);
      return { commands, height: finalHeight };
    });

    const first = compiledOrders[0];
    const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, first.height] });
    doc.setFont("courier");

    compiledOrders.forEach((item, index) => {
      if (index > 0) {
        doc.addPage([PAGE_WIDTH, item.height]);
        doc.setFont("courier");
      }
      item.commands.forEach((cmd) => {
        if (cmd.kind === "line") {
          doc.setLineDashPattern([0.6, 0.6], 0);
          doc.line(MARGIN, cmd.y, PAGE_WIDTH - MARGIN, cmd.y);
          doc.setLineDashPattern([], 0);
        } else {
          doc.setFontSize(cmd.size);
          doc.setFont("courier", cmd.bold ? "bold" : "normal");
          doc.text(cmd.text, cmd.x, cmd.y, { align: cmd.align });
        }
      });
    });

    const filename = `Invoices-Thermal-Batch-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    setShowConfirm(true);
  };

  // ── Mark Invoices as Printed Handler ─────────────────────────────────────────
  const handleMarkPrinted = async () => {
    try {
      setMarking(true);
      const orderIdsToMark = orders.map((o) => o.id);
      await api.post("/order/mark-invoices-printed", {
        orderIds: orderIdsToMark,
        printed: true,
      });
      toast.success(`Marked ${orderIdsToMark.length} orders as printed!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to mark orders as printed");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* ── Screen Modal Box ── */}
      <div className="print:hidden w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Batch Invoice Printing
                {!loading && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {orders.length} {orders.length === 1 ? "order" : "orders"}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Download or print multiple invoices at once without individual page navigation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <ClipLoader color="#4f46e5" size={36} />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Compiling invoice data…
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-100">
                <PackageCheck className="size-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All invoices are up to date!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No unprinted invoices found for the selected criteria. When new orders arrive, they will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{orders.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Value</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{fmtCurrency(totalValue)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Format</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormat("A4")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        format === "A4"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      A4 Full Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("THERMAL")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        format === "THERMAL"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Thermal (80mm)
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Queue List Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Invoices in this batch ({orders.length})
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Chronological order (oldest to newest)
                  </span>
                </div>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-white">
                  {orders.map((o) => (
                    <div key={o.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-800">
                          #{o.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {o.user?.username ?? "Customer"}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px]">
                          {o.items?.length ?? 0} items
                        </span>
                        <span className="font-bold text-slate-900">
                          {fmtCurrency(o.finalAmount)}
                        </span>
                        {o.invoicePrinted ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-white shadow-xs">
                            Printed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
                            Unprinted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Print Confirmation Box */}
              {showConfirm && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">
                        Print / Download Action Dispatched
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Did your invoices print or save successfully? Marking them as printed removes them from future unprinted batches, preventing duplicate prints.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900 hover:bg-amber-100/60 text-xs font-semibold transition cursor-pointer"
                    >
                      Keep Unprinted
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkPrinted}
                      disabled={marking}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-700 text-white hover:bg-amber-800 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {marking ? <ClipLoader color="white" size={14} /> : <CheckCircle2 className="size-3.5" />}
                      Yes, Mark All as Printed
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>

          {!loading && orders.length > 0 && (
            <div className="flex items-center gap-2">
              {format === "A4" ? (
                <button
                  type="button"
                  onClick={handleA4Print}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 active:scale-98 transition cursor-pointer"
                >
                  <Printer className="size-4" />
                  Print All A4 Invoices ({orders.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadThermalPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 active:scale-98 transition cursor-pointer"
                >
                  <Download className="size-4" />
                  Download Thermal Receipts PDF ({orders.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Print Container (Mounted via Portal directly to body so position:fixed modal never breaks page breaks) ── */}
      {createPortal(
        <div id="bulk-invoice-print-container" className="hidden print:block w-full bg-white">
          {orders.map((order) => {
            const invoiceNumber = `INV-${order.id.slice(-10).toUpperCase()}`;
            const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const addr = order.shippingAddress ?? {};

            return (
              <div key={order.id} className="bulk-invoice-sheet bg-white">
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-6 border-b-2 border-gray-900">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">{companyName}</h1>
                      <p className="text-xs text-gray-500 mt-0.5">{companyTagline}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tax Invoice</p>
                      <p className="text-base font-bold font-mono text-gray-900 mt-0.5">{invoiceNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{invoiceDate}</p>
                    </div>
                  </div>

                  {/* Order Meta Strip */}
                  <div className="grid grid-cols-3 gap-3 py-3.5 border-b border-gray-200 text-xs bg-gray-50/60 px-4 rounded-xl my-4">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Order ID</span>
                      <span className="font-mono font-bold text-gray-900">#{order.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Order Status</span>
                      <span className="font-bold text-gray-900">{order.orderStatus}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Payment Method</span>
                      <span className="font-bold text-gray-900">
                        {order.paymentMethod === "ONLINE" ? "Online" : order.paymentMethod === "QR" ? "QR Code" : "POD"}
                      </span>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-2 gap-6 my-5 text-xs text-gray-700">
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/40">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Bill To</p>
                      {order.user ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-950 text-sm">{order.user.username}</p>
                          <p>{order.user.email}</p>
                          {order.user.phone && <p>{order.user.phone}</p>}
                        </div>
                      ) : (
                        <p className="italic text-gray-400">Customer info unavailable</p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/40">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Ship To</p>
                      <div className="space-y-0.5">
                        {addr.fullAddress && <p className="font-medium text-gray-900">{addr.fullAddress}</p>}
                        <p>
                          {[addr.city, addr.state].filter(Boolean).join(", ")}
                          {addr.zipCode ? ` – ${addr.zipCode}` : ""}
                        </p>
                        {addr.country && <p>{addr.country}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="my-5">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b-2 border-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          <th className="py-2.5">Item</th>
                          <th className="py-2.5 text-center">Qty</th>
                          <th className="py-2.5 text-right">Unit Price</th>
                          <th className="py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {order.items.map((item, i) => (
                          <tr key={i} className="invoice-item-row">
                            <td className="py-3">
                              <p className="font-semibold text-gray-900">{item.product?.name ?? "Product"}</p>
                              {formatVariant(item.variant) && (
                                <p className="text-[10px] font-medium text-indigo-600 mt-0.5">{formatVariant(item.variant)}</p>
                              )}
                            </td>
                            <td className="py-3 text-center text-gray-700 font-medium">{item.quantity}</td>
                            <td className="py-3 text-right text-gray-700">{fmtCurrency(item.price)}</td>
                            <td className="py-3 text-right font-bold text-gray-900">{fmtCurrency(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex justify-end pt-4 border-t border-gray-200 text-xs invoice-totals-block">
                    <div className="w-64 space-y-1.5">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{fmtCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span>{order.shippingCharge > 0 ? fmtCurrency(order.shippingCharge) : "Free"}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                          <span>-{fmtCurrency(order.discountAmount)}</span>
                        </div>
                      )}
                      {order.taxAmount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Tax</span>
                          <span>{fmtCurrency(order.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm border-t-2 border-gray-950 pt-2 text-gray-950">
                        <span>TOTAL</span>
                        <span>{fmtCurrency(order.finalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 invoice-footer-block">
                  <p>Thank you for shopping with {companyName}.</p>
                  <p className="mt-1">Computer-generated invoice · No signature required.</p>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {/* ── Global Print Styles for Strict 1-Invoice-Per-A4 Sheet ── */}
      <style>{`
        @media print {
          /* Hide everything on document body except the portal print container */
          body > *:not(#bulk-invoice-print-container) {
            display: none !important;
          }
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #bulk-invoice-print-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bulk-invoice-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-height: 296mm !important;
            box-sizing: border-box !important;
            padding: 16mm 20mm !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .bulk-invoice-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* Protect table rows and totals from breaking awkwardly across page edges */
          .invoice-item-row,
          .invoice-totals-block,
          .invoice-footer-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #bulk-invoice-print-container, #bulk-invoice-print-container * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
