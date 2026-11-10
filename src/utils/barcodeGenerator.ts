// src/utils/barcodeGenerator.ts
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

/**
 * Standard Code 128 (Subset B) ISO/IEC 15417 pattern table (fallback)
 * Exactly 107 symbols (0 to 106).
 */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                 // 100-106
];

export interface BarcodeRenderOptions {
  moduleWidth?: number; // width of 1 unit bar in px (default 2)
  barHeight?: number;   // height of bars in px (default 50)
  includeText?: boolean;
  quietZone?: number;   // quiet zone modules (default 12)
  fontSize?: number;
}

/**
 * Fallback encoder: Encodes ASCII string (subset B) to alternating bar-space width digits
 */
export function encodeCode128B(text: string): string {
  const clean = text.replace(/[^\x20-\x7E]/g, ""); // Keep printable ASCII
  if (!clean) return "";

  let sum = 104; // Start Code B
  const codes: number[] = [104];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    sum += code * (i + 1);
  }

  const checksum = sum % 103;
  codes.push(checksum);
  codes.push(106); // Stop symbol

  return codes.map((c) => CODE128_PATTERNS[c] || "").join("");
}

/**
 * Renders Code 128 barcode onto an offscreen canvas using industry-standard JsBarcode (CODE128 Auto).
 * Switches dynamically between Code A, B, and C for maximum readability on all retail laser scanners.
 */
export function renderBarcodeCanvas(text: string, options: BarcodeRenderOptions = {}): HTMLCanvasElement {
  const {
    moduleWidth = 2,
    barHeight = 54,
    includeText = true,
    quietZone = 12,
    fontSize = 13,
  } = options;

  const clean = (text || "").trim();
  const canvas = document.createElement("canvas");

  if (!clean) {
    canvas.width = 100;
    canvas.height = 30;
    return canvas;
  }

  try {
    // Primary: JsBarcode auto engine (industry standard, optimal bar widths)
    JsBarcode(canvas, clean, {
      format: "CODE128",
      width: moduleWidth,
      height: barHeight,
      displayValue: includeText,
      fontSize: fontSize,
      font: "monospace",
      textMargin: 3,
      margin: quietZone,
      background: "#ffffff",
      lineColor: "#000000",
      valid: (valid) => {
        if (!valid) console.warn("JsBarcode invalid format for", clean);
      },
    });
    return canvas;
  } catch {
    // Fallback: ISO/IEC 15417 Subset B Manual Renderer
    const pattern = encodeCode128B(clean);
    const ctx = canvas.getContext("2d");

    if (!pattern || !ctx) {
      canvas.width = 100;
      canvas.height = 30;
      return canvas;
    }

    let totalModules = quietZone * 2;
    for (let i = 0; i < pattern.length; i++) {
      totalModules += parseInt(pattern[i], 10);
    }

    const textExtraHeight = includeText ? fontSize + 10 : 0;
    canvas.width = Math.ceil(totalModules * moduleWidth);
    canvas.height = Math.ceil(barHeight + textExtraHeight + 6);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000000";
    let curX = quietZone * moduleWidth;

    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i], 10) * moduleWidth;
      const isBar = i % 2 === 0;
      if (isBar) {
        ctx.fillRect(Math.round(curX), 3, Math.round(w), barHeight);
      }
      curX += w;
    }

    if (includeText) {
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(clean, canvas.width / 2, barHeight + 5);
    }

    return canvas;
  }
}

/**
 * Returns Base64 PNG Data URL of the barcode
 */
export function getBarcodeDataUrl(text: string, options: BarcodeRenderOptions = {}): string {
  const canvas = renderBarcodeCanvas(text, options);
  return canvas.toDataURL("image/png");
}

export interface BarcodeLabelDetails {
  barcode: string;
  name: string;
  price: number;
  sku?: string;
  categoryName?: string;
  storeName?: string;
}

export type BarcodeLayoutFormat = "thermal_2up" | "thermal" | "a4";

export interface GeneratePDFOptions {
  label: BarcodeLabelDetails;
  quantity: number;
  format: BarcodeLayoutFormat;
}

/**
 * Creates and formats the printable jsPDF document instance
 */
export async function createBarcodeLabelsPDF({
  label,
  quantity,
  format,
}: GeneratePDFOptions): Promise<{ doc: jsPDF; cleanBarcode: string; totalLines: number }> {
  const cleanBarcode = (label.barcode || label.sku || "ENW-0000").trim();
  const barcodeCanvas = renderBarcodeCanvas(cleanBarcode, {
    moduleWidth: 3, // High DPI for razor-sharp physical printouts
    barHeight: 55,
    includeText: true,
    fontSize: 12,
    quietZone: 12,
  });
  const barcodeImg = barcodeCanvas.toDataURL("image/png");
  const barcodeAspect = barcodeCanvas.width / barcodeCanvas.height;

  const storeTitle = label.storeName || "ENWIE";
  const formattedPrice = `Rs. ${Number(label.price || 0).toLocaleString("en-IN")}`;
  const totalLines = Math.ceil(quantity / 2);

  if (format === "thermal" || (format as string) === "single") {
    // 1-in-1 Line: 50mm x 25mm single sticker roll
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [50, 25],
    });

    const maxW = 44;
    const maxH = 13.5;
    let drawW = maxW;
    let drawH = drawW / barcodeAspect;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * barcodeAspect;
    }
    const drawX = 25 - drawW / 2;
    const truncatedName = label.name.length > 25 ? label.name.slice(0, 23) + "…" : label.name;

    for (let i = 0; i < quantity; i++) {
      if (i > 0) doc.addPage([50, 25], "landscape");

      // Store Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(storeTitle, 25, 3.2, { align: "center" });

      // Product Name
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(truncatedName, 25, 6.2, { align: "center" });

      // Barcode Image
      doc.addImage(barcodeImg, "PNG", drawX, 7.0, drawW, drawH);

      // Price Tag
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`MRP: ${formattedPrice}`, 25, 23.4, { align: "center" });
    }

    return { doc, cleanBarcode, totalLines: quantity };
  } else if (format === "a4") {
    // Standard A4 sticker sheet: 3 columns x 8 rows = 24 labels per page
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const cols = 3;
    const rows = 8;
    const labelsPerPage = cols * rows;

    const startX = 6.5;
    const startY = 11;
    const labelWidth = 63.5;
    const labelHeight = 33.5;
    const gapX = 3;
    const gapY = 0.5;

    const maxW = labelWidth - 7;
    const maxH = 16.5;
    let drawW = maxW;
    let drawH = drawW / barcodeAspect;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * barcodeAspect;
    }

    for (let q = 0; q < quantity; q++) {
      const pageIndex = Math.floor(q / labelsPerPage);
      const slotOnPage = q % labelsPerPage;

      if (slotOnPage === 0 && pageIndex > 0) {
        doc.addPage("a4", "portrait");
      }

      const col = slotOnPage % cols;
      const row = Math.floor(slotOnPage / cols);

      const x = startX + col * (labelWidth + gapX);
      const y = startY + row * (labelHeight + gapY);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, labelWidth, labelHeight, 1.5, 1.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(storeTitle, x + labelWidth / 2, y + 4.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      const truncatedName = label.name.length > 32 ? label.name.slice(0, 30) + "…" : label.name;
      doc.text(truncatedName, x + labelWidth / 2, y + 8, { align: "center" });

      const drawX = x + (labelWidth - drawW) / 2;
      doc.addImage(barcodeImg, "PNG", drawX, y + 9.5, drawW, drawH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`MRP: ${formattedPrice}`, x + labelWidth / 2, y + labelHeight - 2.5, { align: "center" });
    }

    return { doc, cleanBarcode, totalLines: Math.ceil(quantity / 24) };
  } else {
    // Default: 2-in-1 Line (thermal_2up)
    // 2 stickers across side-by-side on standard 102mm roll (50mm x 25mm each)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [102, 25],
    });

    const maxBarW = 44;
    const maxBarH = 13.5;
    let drawW = maxBarW;
    let drawH = drawW / barcodeAspect;
    if (drawH > maxBarH) {
      drawH = maxBarH;
      drawW = drawH * barcodeAspect;
    }

    const centers = [25.5, 76.5]; // Left sticker (0-51mm) center = 25.5mm, Right sticker (51-102mm) center = 76.5mm
    const truncatedName = label.name.length > 25 ? label.name.slice(0, 23) + "…" : label.name;

    for (let r = 0; r < totalLines; r++) {
      if (r > 0) doc.addPage([102, 25], "landscape");

      for (let side = 0; side < 2; side++) {
        const itemIndex = r * 2 + side;
        if (itemIndex >= quantity) break;

        const centerX = centers[side];
        const barX = centerX - drawW / 2;

        // Store Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(storeTitle, centerX, 3.2, { align: "center" });

        // Product Name
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(truncatedName, centerX, 6.2, { align: "center" });

        // Barcode Image (sharp, centered, tall bars)
        doc.addImage(barcodeImg, "PNG", barX, 7.0, drawW, drawH);

        // Price Tag
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(`MRP: ${formattedPrice}`, centerX, 23.4, { align: "center" });
      }
    }

    return { doc, cleanBarcode, totalLines };
  }
}

/**
 * Directly redirects / opens browser print dialog for the generated barcode labels
 */
export async function printBarcodeLabelsPDF(options: GeneratePDFOptions): Promise<void> {
  const { doc } = await createBarcodeLabelsPDF(options);
  doc.autoPrint();
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  // Open in new window/tab which auto-opens print dialog
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) {
    // If popups are blocked, use hidden iframe fallback
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print error", err);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    };
  } else {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  }
}

/**
 * Downloads a printable barcode labels PDF file to disk
 */
export async function downloadBarcodeLabelsPDF(options: GeneratePDFOptions): Promise<void> {
  const { doc, cleanBarcode } = await createBarcodeLabelsPDF(options);
  const suffix = options.format === "thermal" ? "single_thermal" : options.format === "a4" ? "a4_sheet" : "2in1_line";
  doc.save(`${cleanBarcode}_${suffix}_labels_x${options.quantity}.pdf`);
}

// ───────────────────────────── POS AUDIO FEEDBACK ─────────────────────────────

/**
 * Plays an audio beep using Web Audio API (no external sound files required)
 */
export function playBeep(frequency = 1200, durationMs = 110, type: OscillatorType = "sine"): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function playSuccessBeep(): void {
  playBeep(1760, 90, "sine");
}

export function playErrorBeep(): void {
  playBeep(320, 220, "sawtooth");
}
