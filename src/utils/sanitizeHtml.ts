import DOMPurify from "dompurify";

// Render-time defense in depth for any HTML sourced from the backend and rendered via
// dangerouslySetInnerHTML (currently: product.description on ProductDetailPage). The
// backend already sanitizes on write (see backend/src/utils/sanitizeHtml.ts), but this
// stops it from ever reaching the DOM even if some other path reintroduces raw HTML.
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "span", "div", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
};

/**
 * Strips all HTML tags and decodes entities into clean, readable plain text.
 * Prevents raw tags like <b>, <br>, <font>, &amp; from showing in plain-text snippets.
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.replace(/\s+/g, " ").trim() || "";
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
};

/**
 * Converts Unicode mathematical bold characters (serif, sans-serif, bold digits)
 * into standard characters wrapped in <b>...</b> tags.
 * This ensures bold text copied from WhatsApp, Instagram, font generators (e.g. YayText, LingoJam)
 * is cleanly preserved and renders beautifully with regular fonts & accessible SEO.
 */
export const convertUnicodeBoldToTags = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(
    /(?:[\u{1D400}-\u{1D433}\u{1D5D4}-\u{1D607}\u{1D7CE}-\u{1D7F5}]+(?:\s+[\u{1D400}-\u{1D433}\u{1D5D4}-\u{1D607}\u{1D7CE}-\u{1D7F5}]+)*)/gu,
    (match) => {
      let converted = "";
      for (const char of match) {
        const cp = char.codePointAt(0);
        if (!cp) continue;
        // Math Bold Serif A-Z (1D400..1D419) -> 65..90
        if (cp >= 0x1D400 && cp <= 0x1D419) converted += String.fromCharCode(cp - 0x1D400 + 65);
        // Math Bold Serif a-z (1D41A..1D433) -> 97..122
        else if (cp >= 0x1D41A && cp <= 0x1D433) converted += String.fromCharCode(cp - 0x1D41A + 97);
        // Math Bold Sans A-Z (1D5D4..1D5ED) -> 65..90
        else if (cp >= 0x1D5D4 && cp <= 0x1D5ED) converted += String.fromCharCode(cp - 0x1D5D4 + 65);
        // Math Bold Sans a-z (1D5EE..1D607) -> 97..122
        else if (cp >= 0x1D5EE && cp <= 0x1D607) converted += String.fromCharCode(cp - 0x1D5EE + 97);
        // Math Bold Digits 0-9 (1D7CE..1D7D7) -> 48..57
        else if (cp >= 0x1D7CE && cp <= 0x1D7D7) converted += String.fromCharCode(cp - 0x1D7CE + 48);
        // Math Sans Bold Digits 0-9 (1D7EC..1D7F5) -> 48..57
        else if (cp >= 0x1D7EC && cp <= 0x1D7F5) converted += String.fromCharCode(cp - 0x1D7EC + 48);
        else converted += char;
      }
      return `<b>${converted}</b>`;
    }
  );
};

/**
 * Safely sanitizes and formats product descriptions.
 * If the description is plain text with newlines/spaces (from a standard textarea),
 * it preserves paragraphs and line breaks without combining them into a single blob.
 * If the description already contains HTML markup, it safely sanitizes it.
 */
export const formatProductDescription = (desc: string | null | undefined): string => {
  if (!desc || !desc.trim()) return "<p>No description available.</p>";

  // Convert any Unicode bold characters into <b> tags
  let processed = convertUnicodeBoldToTags(desc);

  // Convert markdown bold syntax **text** into <strong>text</strong>
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  const sanitized = sanitizeHtml(processed);

  // Check if content already contains HTML block tags (<p>, <div>, <ul>, <ol>, <h1>-<h6>, etc.)
  const hasHtmlBlockFormatting = /<\s*(p|div|ul|ol|li|h[1-6]|table|blockquote)\b/i.test(sanitized);
  if (hasHtmlBlockFormatting) {
    return sanitized;
  }

  // For plain text or inline HTML (like <b>, <strong>, <em>, <br>): convert double newlines to paragraphs and single newlines to <br/>
  return sanitized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("");
};

/**
 * Converts clipboard HTML (copied from websites, Google Docs, Word, etc.) into
 * clean text with <b>...</b> tags and paragraphs preserved.
 */
export const convertClipboardHtmlToText = (
  html: string | undefined | null,
  fallbackPlain: string
): string => {
  if (!html || !html.trim()) return convertUnicodeBoldToTags(fallbackPlain);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove unwanted non-visual tags
    const toRemove = doc.querySelectorAll("script, style, meta, link, noscript, svg");
    toRemove.forEach((el) => el.remove());

    const isBoldNode = (node: HTMLElement): boolean => {
      const tag = node.tagName.toUpperCase();
      const style = (node.getAttribute("style") || "").toLowerCase();
      const fontWeight = (node.style?.fontWeight || "").toLowerCase();

      // If explicitly normal/400 (common in Google Docs wrappers), do not treat as bold
      if (
        fontWeight === "normal" ||
        fontWeight === "400" ||
        style.includes("font-weight: normal") ||
        style.includes("font-weight:normal") ||
        style.includes("font-weight: 400") ||
        style.includes("font-weight:400")
      ) {
        return false;
      }

      if (tag === "B" || tag === "STRONG" || /^H[1-6]$/.test(tag)) return true;
      if (
        fontWeight.includes("bold") ||
        fontWeight.includes("600") ||
        fontWeight.includes("700") ||
        fontWeight.includes("800") ||
        fontWeight.includes("900") ||
        style.includes("font-weight: bold") ||
        style.includes("font-weight:bold") ||
        style.includes("font-weight: 600") ||
        style.includes("font-weight:600") ||
        style.includes("font-weight: 700") ||
        style.includes("font-weight:700") ||
        style.includes("font-weight: 800") ||
        style.includes("font-weight:800") ||
        style.includes("font-weight: 900") ||
        style.includes("font-weight:900")
      ) {
        return true;
      }
      return false;
    };

    const serializeNode = (node: Node, parentIsBold = false): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (tag === "BR") {
        return "\n";
      }

      const isCurrentBold = !parentIsBold && isBoldNode(el);

      let childText = "";
      el.childNodes.forEach((child) => {
        childText += serializeNode(child, parentIsBold || isCurrentBold);
      });

      if (isCurrentBold && childText.trim()) {
        const match = childText.match(/^(\s*)(.*?)(\s*)$/s);
        if (match) {
          const [, leading, content, trailing] = match;
          if (content) {
            childText = `${leading}<b>${content}</b>${trailing}`;
          }
        }
      }

      // Add newlines around block elements
      const isBlock = ["P", "DIV", "LI", "TR", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6"].includes(tag);
      if (isBlock) {
        return `\n${childText}\n`;
      }

      return childText;
    };

    let result = "";
    doc.body.childNodes.forEach((child) => {
      result += serializeNode(child, false);
    });

    // Normalize newlines (clean up multiple empty lines)
    result = result
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const finalResult = result || fallbackPlain;
    return convertUnicodeBoldToTags(finalResult);
  } catch (err) {
    console.error("Error converting clipboard HTML:", err);
    return convertUnicodeBoldToTags(fallbackPlain);
  }
};
