import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, Download, ArrowLeft, CheckCircle, Clock, XCircle, Truck, Package, MapPin, User, Calendar, Hash, RotateCcw, QrCode } from "lucide-react";
import jsPDF from "jspdf";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface CompanySettings {
  COMPANY_NAME: string | null;
  COMPANY_TAGLINE: string | null;
  COMPANY_LOGO: string | null;
  INVOICE_FORMAT?: string | null;
}

interface OrderItem {
  product: { id: string; name: string; image?: string; code?: string } | null;
  quantity: number;
  price: number;
  /** e.g. { Storage: "128GB", Color: "Black" } — the specific option this line item
   * was purchased in, if the product has variants (see mongoose.ts's ProductVariant).
   * null/absent for a plain single-SKU product. Needed on the invoice for fulfillment
   * — "128GB Black" vs "256GB Silver" are different physical items to pack/ship. */
  variant?: { options: Record<string, string>; image?: string | null; secondaryImage?: string | null } | null;
}

const formatVariantOptions = (variant: OrderItem["variant"]): string =>
  variant?.options ? Object.entries(variant.options).map(([axis, value]) => `${axis}: ${value}`).join(" · ") : "";

interface ShippingAddress {
  fullAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface Coupon {
  code: string;
  discountType: string;
  discountValue: number;
}

interface OrderUser {
  username: string;
  email: string;
  phone?: string;
}

interface Order {
  id: string;
  createdAt: string;
  user?: OrderUser;
  items: OrderItem[];
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  paymentScreenshot?: string;
  shippingAddress: ShippingAddress;
  coupon?: Coupon | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt = (n: number) => `₹${n.toFixed(2)}`;

const statusMeta: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PROCESSING: { label: "Processing", color: "#d97706", icon: Clock },
  CONFIRMED:  { label: "Confirmed",  color: "#2563eb", icon: CheckCircle },
  SHIPPED:    { label: "Shipped",    color: "#0891b2", icon: Truck },
  DELIVERED:  { label: "Delivered",  color: "#16a34a", icon: Package },
  CANCELLED:  { label: "Cancelled",  color: "#dc2626", icon: XCircle },
  RETURNED:   { label: "Returned",   color: "#7c3aed", icon: RotateCcw },
};

const paymentStatusMeta: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pending",  color: "#d97706" },
  PAID:     { label: "Paid",     color: "#16a34a" },
  FAILED:   { label: "Failed",   color: "#dc2626" },
  REFUNDED: { label: "Refunded", color: "#7c3aed" },
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  // The format toggle is an operational tool for whoever prints/downloads on the
  // business's behalf — customers just get the tenant's configured default, no switch.
  const canChooseFormat = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(user.role ?? "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanySettings>({
    COMPANY_NAME: null,
    COMPANY_TAGLINE: null,
    COMPANY_LOGO: null,
    INVOICE_FORMAT: "A4",
  });
  // Per-invoice override — starts unset (falls back to the tenant's Company Settings
  // default) and, once the toggle below is used, wins over that default for this
  // viewing/download only. Never persisted anywhere.
  const [formatOverride, setFormatOverride] = useState<"A4" | "THERMAL" | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api.get(`/order/${orderId}`)
      .then((res) => setOrder(res.data.order))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) setError("You are not authorised to view this invoice.");
        else if (status === 404) setError("Order not found.");
        else setError("Failed to load invoice. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    api.get("/admin/company-settings")
      .then((res) => setCompany(res.data.settings ?? {}))
      .catch(() => {});
  }, []);

  const handlePrint = () => window.print();

  /* ── Skeleton / Error states ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium uppercase tracking-widest">Loading Invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center p-8 bg-white rounded-2xl border border-gray-200 shadow">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 mb-6">{error ?? "Order not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold uppercase tracking-wider hover:bg-gray-900 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const addr = order.shippingAddress ?? {};
  const orderMeta = statusMeta[order.orderStatus] ?? { label: order.orderStatus, color: "#6b7280", icon: Package };
  const payMeta = paymentStatusMeta[order.paymentStatus] ?? { label: order.paymentStatus, color: "#6b7280" };
  const invoiceNumber = `INV-${order.id.slice(-10).toUpperCase()}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });

  const companyName = company.COMPANY_NAME || "blueprint_crm";
  const companyTagline = company.COMPANY_TAGLINE || "Premium Fabric & Draping Solutions";
  const companyLogo = company.COMPANY_LOGO;
  // Customers (and anyone else without the format toggle) always get A4 — THERMAL is
  // an internal packing-slip format for whoever prints on the business's behalf, not
  // something a customer-facing invoice should ever fall back to.
  const format = formatOverride ?? (canChooseFormat && company.INVOICE_FORMAT === "THERMAL" ? "THERMAL" : "A4");

  // Thermal receipts are generated directly as a PDF at a fixed 80mm width, instead of
  // going through window.print(). Browsers' print-to-PDF only honors a custom @page size
  // (like 80mm) when the print dialog's "Paper size" is left on Default — in practice it's
  // frequently overridden to Letter/A4, producing a full-size page with the narrow receipt
  // stranded in one corner. Drawing the PDF directly guarantees correct sizing every time,
  // regardless of browser/print-dialog state. The "Print" button still uses window.print()
  // for both formats — printing to an actual thermal printer is constrained by the
  // printer's own paper width, not by this @page CSS, so that path doesn't have the bug.
  //
  // Layout is computed in two passes rather than drawn straight into the doc:
  //  1. Walk the content purely as arithmetic (manual Courier word-wrap — Courier is exactly
  //     0.6em/char, a fixed metric, so no jsPDF instance is needed to measure it) to get the
  //     exact final content height and a list of draw commands with their coordinates.
  //  2. Create the jsPDF doc ONCE at that final size and draw the commands.
  // This avoids two real jsPDF bugs found while building this: (a) jsPDF bakes each text
  // position into PDF coordinates using the page height AT THE TIME .text() is called —
  // resizing doc.internal.pageSize.height afterward (to trim to content) does not move
  // already-drawn content, so it ends up positioned outside the new, smaller page and
  // renders as blank; (b) jsPDF's default "portrait" orientation silently SWAPS width and
  // height whenever width > height (verified via doc.internal.pageSize.getWidth/getHeight()),
  // which happens for any receipt shorter than the 80mm width — the page comes out
  // transposed and content clips off the actual (much narrower) edge. Fixed here by always
  // creating the doc with the final height already known, floored at 90mm (never < the 80mm
  // width) so the swap never triggers.
  const handleDownloadThermalPdf = () => {
    const PAGE_WIDTH = 80;
    const MARGIN = 4;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const MM_PER_PT = 25.4 / 72;
    const COURIER_CHAR_WIDTH_EM = 0.6; // standard PDF Courier metric: exactly 0.6em/char

    // jsPDF's built-in Courier is a standard PDF14 font (WinAnsi-ish encoding only) — it has
    // no glyph for ₹ (U+20B9). Drawing it corrupts both the glyph and the spacing/kerning of
    // everything after it on that line (verified — this is exactly what produced the garbled
    // "¹4500.00" output). The on-screen preview still uses fmt()/₹ via HTML, which renders
    // Unicode fine; only the PDF-drawing path needs an ASCII-safe currency prefix instead.
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

    addLine(companyName, { align: "center", size: 13, bold: true });
    addLine(companyTagline, { align: "center", size: 8 });
    addDivider();

    addLine(`Invoice: ${invoiceNumber}`, { size: 9, bold: true });
    addLine(`Date: ${invoiceDate}`);
    addLine(`Order: #${order.id.slice(-8).toUpperCase()}`);
    addLine(`Status: ${orderMeta.label}`);
    const thermalMethod = order.paymentMethod === "ONLINE" ? "Online" : order.paymentMethod === "QR" ? "QR" : "POD";
    addLine(`Payment: ${thermalMethod}`);
    addDivider();

    addLine("BILL TO", { size: 7, bold: true });
    if (order.user) {
      addLine(order.user.username, { bold: true });
      addLine(order.user.email);
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
      addLine(item.product?.name ?? "Product Unavailable", { bold: true });
      const variantLabel = formatVariantOptions(item.variant);
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
    addLine("Computer-generated invoice. No signature required.", { align: "center", size: 8 });

    const finalHeight = Math.max(y + MARGIN, 90);
    const doc = new jsPDF({ unit: "mm", format: [PAGE_WIDTH, finalHeight] });
    doc.setFont("courier");

    commands.forEach((cmd) => {
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

    doc.save(`${invoiceNumber}.pdf`);
  };

  const handleSaveAsPdf = format === "THERMAL" ? handleDownloadThermalPdf : handlePrint;

  return (
    <>
      {/* ─── Print / Download Toolbar (hidden when printing) ─── */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {canChooseFormat && (
              <div className="flex items-center bg-gray-100 rounded-full p-1">
                {(["A4", "THERMAL"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFormatOverride(opt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      format === opt ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {opt === "A4" ? "A4" : "Thermal (80mm)"}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleSaveAsPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-900 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* ─── Invoice Document ─── */}
      <div className="bg-gray-100 min-h-screen py-10 px-4 print:bg-white print:p-0 print:min-h-0">
        <div
          ref={invoiceRef}
          id="invoice-print-area"
          className={
            format === "THERMAL"
              ? "max-w-[320px] mx-auto bg-white shadow-xl shadow-gray-300/40 rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none font-mono"
              : "max-w-3xl mx-auto bg-white shadow-xl shadow-gray-300/40 rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none"
          }
        >
          {format === "THERMAL" ? (
          /* ── Thermal Receipt Body (80mm) ── */
          <div className="px-4 py-6 text-[11px] leading-loose text-gray-800">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-5 mb-5">
              <p className="text-sm font-extrabold tracking-tight">{companyName}</p>
              <p className="text-[10px] text-gray-500 mt-1">{companyTagline}</p>
            </div>

            {/* Invoice meta */}
            <div className="space-y-1.5 mb-5">
              <p><span className="font-bold">Invoice:</span> {invoiceNumber}</p>
              <p><span className="font-bold">Date:</span> {invoiceDate}</p>
              <p><span className="font-bold">Order:</span> #{order.id.slice(-8).toUpperCase()}</p>
              <p><span className="font-bold">Status:</span> {orderMeta.label}</p>
              <p><span className="font-bold">Payment:</span> {order.paymentMethod === "ONLINE" ? "Online" : order.paymentMethod === "QR" ? "Pay with QR" : "POD"}</p>
            </div>

            <div className="border-b border-dashed border-gray-400 mb-5" />

            {/* Bill To */}
            <div className="mb-5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Bill To</p>
              {order.user ? (
                <>
                  <p className="font-bold">{order.user.username}</p>
                  <p>{order.user.email}</p>
                  {order.user.phone && <p>{order.user.phone}</p>}
                </>
              ) : (
                <p className="italic text-gray-400">Customer info unavailable</p>
              )}
            </div>

            {/* Ship To */}
            <div className="mb-5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ship To</p>
              {addr.fullAddress && <p>{addr.fullAddress}</p>}
              <p>
                {[addr.city, addr.state].filter(Boolean).join(", ")}
                {addr.zipCode ? ` - ${addr.zipCode}` : ""}
              </p>
              {addr.country && <p>{addr.country}</p>}
            </div>

            <div className="border-b border-dashed border-gray-400 mb-5" />

            {/* Items */}
            <div className="space-y-4 mb-5">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <p className="font-semibold">{item.product?.name ?? "Product Unavailable"}</p>
                  {formatVariantOptions(item.variant) && (
                    <p className="text-xs text-gray-500">{formatVariantOptions(item.variant)}</p>
                  )}
                  <div className="flex justify-between text-gray-600 mt-0.5">
                    <span>{item.quantity} x {fmt(item.price)}</span>
                    <span className="font-semibold text-gray-900">{fmt(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-gray-400 mb-5" />

            {/* Totals */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(order.totalAmount)}</span></div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shippingCharge > 0 ? fmt(order.shippingCharge) : "Free"}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                  <span>-{fmt(order.discountAmount)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between"><span>Tax</span><span>{fmt(order.taxAmount)}</span></div>
              )}
              <div className="flex justify-between font-extrabold text-sm border-t border-gray-900 pt-2 mt-2">
                <span>TOTAL</span><span>{fmt(order.finalAmount)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 mb-5" />

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-500 space-y-2">
              <p>Thank you for shopping with {companyName}.</p>
              <p>Computer-generated invoice. No signature required.</p>
            </div>
          </div>
          ) : (
          <>
          {/* ── Accent bar — tinted with the order's own status color, so the
               document reads at a glance without needing to find the status chip ── */}
          <div className="h-1.5 w-full" style={{ backgroundColor: orderMeta.color }} />

          {/* ── Header ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white px-8 py-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Faint decorative ring, purely cosmetic — degrades gracefully if a
                browser strips print backgrounds. */}
            <div
              className="absolute -right-16 -top-20 w-56 h-56 rounded-full opacity-[0.07] pointer-events-none print:hidden"
              style={{ background: `radial-gradient(circle, ${orderMeta.color}, transparent 70%)` }}
            />
            <div className="relative flex items-center gap-4">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-14 h-14 object-contain rounded-2xl bg-white/10 ring-1 ring-white/10 p-1.5 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-black tracking-tight">{companyName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight">{companyName}</h1>
                <p className="text-gray-400 text-sm mt-1">{companyTagline}</p>
              </div>
            </div>
            <div className="relative text-left sm:text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Tax Invoice</p>
              <p className="text-lg font-bold text-white mt-1 font-mono tracking-tight">{invoiceNumber}</p>
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5 sm:justify-end">
                <Calendar className="w-3.5 h-3.5" />
                {invoiceDate}
              </p>
            </div>
          </div>

          {/* ── Status strip ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-8 py-6 bg-gray-50/60 border-b border-gray-100">
            {[
              { label: "Order ID",       value: `#${order.id.slice(-8).toUpperCase()}`, color: "#475569", icon: Hash },
              { label: "Order Status",   value: orderMeta.label,                        color: orderMeta.color, icon: orderMeta.icon },
              {
                label: "Payment Method",
                value:
                  order.paymentMethod === "ONLINE"
                    ? "Online (Razorpay)"
                    : order.paymentMethod === "QR"
                      ? "Pay with QR"
                      : "Pay on Delivery (POD)",
                color: order.paymentMethod === "QR" ? "#9333ea" : "#475569",
                icon:
                  order.paymentMethod === "ONLINE"
                    ? CheckCircle
                    : order.paymentMethod === "QR"
                      ? QrCode
                      : RotateCcw,
              },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-xs">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}1a` }}
                  >
                    <ItemIcon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{item.label}</p>
                    <p className="text-xs font-bold text-gray-900 truncate" style={{ color: item.color }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Addresses ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-8 py-6 border-b border-gray-100">
            {/* Bill To */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bill To</p>
              </div>
              {order.user ? (
                <div className="text-sm text-gray-700 space-y-0.5">
                  <p className="font-bold text-gray-900 text-base">{order.user.username}</p>
                  <p>{order.user.email}</p>
                  {order.user.phone && <p>{order.user.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Customer info unavailable</p>
              )}
            </div>
            {/* Ship To */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ship To</p>
              </div>
              <div className="text-sm text-gray-700 space-y-0.5">
                {addr.fullAddress && <p className="font-medium text-gray-900">{addr.fullAddress}</p>}
                <p>
                  {[addr.city, addr.state].filter(Boolean).join(", ")}
                  {addr.zipCode ? ` – ${addr.zipCode}` : ""}
                </p>
                {addr.country && <p>{addr.country}</p>}
              </div>
            </div>
          </div>

          {/* ── Items Table ── */}
          <div className="px-8 py-6">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-widest w-1/2 border-b-2 border-gray-900">Item</th>
                  <th className="pb-3 text-center text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b-2 border-gray-900">Qty</th>
                  <th className="pb-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b-2 border-gray-900">Unit Price</th>
                  <th className="pb-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b-2 border-gray-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="py-3.5 pl-2 pr-4 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        {item.variant?.image || item.product?.image ? (
                          <img
                            src={item.variant?.image || item.product!.image}
                            alt={item.product?.name ?? "Product"}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {item.product?.name ?? "Product Unavailable"}
                          </p>
                          {formatVariantOptions(item.variant) && (
                            <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{formatVariantOptions(item.variant)}</p>
                          )}
                          {item.product?.code && (
                            <p className="text-[11px] text-gray-400 mt-0.5">Code: {item.product.code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center text-gray-600 font-medium tabular-nums">{item.quantity}</td>
                    <td className="py-3.5 text-right text-gray-600 tabular-nums">{fmt(item.price)}</td>
                    <td className="py-3.5 pr-2 text-right font-bold text-gray-900 tabular-nums rounded-r-xl">{fmt(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ── */}
          <div className="px-8 pb-8 flex justify-end">
            <div className="w-full max-w-xs">
              <div className="space-y-2.5 pb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="tabular-nums">{order.shippingCharge > 0 ? fmt(order.shippingCharge) : <span className="text-green-600 font-semibold">Free</span>}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>
                      Discount
                      {order.coupon && (
                        <span className="ml-2 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-[11px] font-bold text-green-700 print:border print:border-green-300">
                          {order.coupon.code}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">−{fmt(order.discountAmount)}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span className="tabular-nums">{fmt(order.taxAmount)}</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-gray-950 text-white px-5 py-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total</span>
                  <span className="text-xl font-extrabold tabular-nums">{fmt(order.finalAmount)}</span>
                </div>
              </div>

              {order.paymentStatus === "PAID" && (
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Amount Paid
                  </span>
                  <span className="text-sm font-bold text-green-700 tabular-nums">{fmt(order.finalAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Transaction details ── */}
          {(order.razorpayOrderId || order.razorpayPaymentId || order.transactionId || order.paymentScreenshot) && (
            <div className="mx-8 mb-8 p-4 bg-gray-50/70 rounded-2xl text-xs text-gray-500 space-y-1.5 border border-gray-100">
              <p className="font-bold text-gray-700 uppercase tracking-widest text-[10px] mb-1.5">Transaction Details</p>
              {order.razorpayOrderId && (
                <p className="flex flex-wrap gap-x-1.5">
                  <span className="font-semibold text-gray-600 shrink-0">Razorpay Order ID:</span>
                  <span className="font-mono text-gray-500">{order.razorpayOrderId}</span>
                </p>
              )}
              {order.razorpayPaymentId && (
                <p className="flex flex-wrap gap-x-1.5">
                  <span className="font-semibold text-gray-600 shrink-0">Payment ID:</span>
                  <span className="font-mono text-gray-500">{order.razorpayPaymentId}</span>
                </p>
              )}
              {order.transactionId && (
                <p className="flex flex-wrap gap-x-1.5">
                  <span className="font-semibold text-purple-700 shrink-0">UPI Transaction ID / UTR:</span>
                  <span className="font-mono text-gray-900 font-bold">{order.transactionId}</span>
                </p>
              )}
              {order.paymentScreenshot && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-semibold text-purple-700 shrink-0">Payment Proof:</span>
                  <a
                    href={order.paymentScreenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 underline font-medium"
                  >
                    View Receipt Screenshot ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-gray-100 px-8 py-7 text-center print:bg-white">
            <p className="text-xs text-gray-400 font-medium">
              Thank you for shopping with{" "}
              <span className="font-bold text-gray-700">{companyName}</span>.
            </p>
            <p className="text-[10px] text-gray-300 mt-3 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="h-px w-6 bg-gray-200" />
              Computer-generated invoice · No signature required
              <span className="h-px w-6 bg-gray-200" />
            </p>
          </div>
          </>
          )}
        </div>
      </div>

      {/* ─── Print Styles ─── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: fixed !important;
            top: 0; left: 0;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          /* Chrome/Safari/Firefox all default to stripping background colors, gradients
             and images on print (only the "Background graphics" checkbox — usually off
             by default — restores them), which is why the dark header, the coloured
             status chips and the black Total box printed as plain white/black text with
             no fill. Forcing color-adjust here makes the browser print exactly what's
             rendered on screen regardless of that checkbox. */
          #invoice-print-area, #invoice-print-area * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          ${format === "THERMAL"
            ? "#invoice-print-area { font-size: 11px; } @page { margin: 2mm; size: 80mm auto; }"
            : "@page { margin: 0.5cm; size: A4; }"}
        }
      `}</style>
    </>
  );
}
