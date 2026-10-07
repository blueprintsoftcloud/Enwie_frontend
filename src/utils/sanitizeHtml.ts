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
 * Safely sanitizes and formats product descriptions.
 * If the description is plain text with newlines/spaces (from a standard textarea),
 * it preserves paragraphs and line breaks without combining them into a single blob.
 * If the description already contains HTML markup, it safely sanitizes it.
 */
export const formatProductDescription = (desc: string | null | undefined): string => {
  if (!desc || !desc.trim()) return "<p>No description available.</p>";

  // Convert markdown bold syntax **text** into <strong>text</strong>
  let processed = desc.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

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
  if (!html || !html.trim()) return fallbackPlain;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove unwanted non-visual tags
    const toRemove = doc.querySelectorAll("script, style, meta, link, noscript, svg");
    toRemove.forEach((el) => el.remove());

    const isBoldNode = (node: HTMLElement): boolean => {
      const tag = node.tagName.toUpperCase();
      if (tag === "B" || tag === "STRONG" || /^H[1-6]$/.test(tag)) return true;
      const style = node.getAttribute("style") || "";
      const fontWeight = node.style?.fontWeight || style;
      if (
        fontWeight.includes("bold") ||
        fontWeight.includes("700") ||
        fontWeight.includes("800") ||
        fontWeight.includes("900")
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

    return result || fallbackPlain;
  } catch (err) {
    console.error("Error converting clipboard HTML:", err);
    return fallbackPlain;
  }
};
