/**
 * CSS Sanitizer & Scoper for Praise Form Builder
 *
 * Scopes custom CSS to the form container while strictly stripping:
 * - HTML and XML tags (<script>, <style>, <html>, etc.)
 * - JavaScript protocols (javascript:, vbscript:, data:text/html)
 * - CSS expressions (expression(...), -moz-binding, behavior:)
 * - Unsafe @import and remote execution vectors
 */

const DANGEROUS_PATTERNS = [
  { pattern: /<script[\s\S]*?<\/script>/gi, label: "<script> block injection" },
  { pattern: /<style[\s\S]*?<\/style>/gi, label: "<style> block injection" },
  { pattern: /<\/?\w+[^>]*>/gi, label: "HTML tag injection" },
  { pattern: /javascript\s*:/gi, label: "javascript: protocol URI" },
  { pattern: /vbscript\s*:/gi, label: "vbscript: protocol URI" },
  { pattern: /data\s*:\s*text\/html/gi, label: "data:text/html URI" },
  { pattern: /expression\s*\(/gi, label: "CSS expression(...) exploit" },
  { pattern: /-moz-binding\s*:/gi, label: "XBL -moz-binding exploit" },
  { pattern: /behavior\s*:/gi, label: "HTC behavior property exploit" },
  { pattern: /@import\s+[^;]+;/gi, label: "@import remote directive" },
  { pattern: /@charset\s+[^;]+;/gi, label: "@charset directive" },
];

/**
 * Sanitizes CSS by removing malicious executable code and injection vectors.
 */
export function sanitizeCss(rawCss: string): { cleanCss: string; warnings: string[] } {
  if (!rawCss || typeof rawCss !== "string") {
    return { cleanCss: "", warnings: [] };
  }

  const warnings: string[] = [];
  let clean = rawCss;

  for (const item of DANGEROUS_PATTERNS) {
    item.pattern.lastIndex = 0;
    if (item.pattern.test(clean)) {
      warnings.push(`Restricted unsafe CSS construct removed: ${item.label}`);
      item.pattern.lastIndex = 0;
      clean = clean.replace(item.pattern, "/* removed unsafe rule */");
    }
  }

  // Prevent breaking out of CSS context
  clean = clean.replace(/<\//g, "<\\/");

  return { cleanCss: clean, warnings };
}

/**
 * Scopes CSS selectors so that styles only apply within the targeted form container.
 *
 * Example:
 * Input:
 *   .praise-card { background: #fff; }
 *   h2, h3 { color: #333; }
 *
 * Output (scoped to .praise-form-scope):
 *   .praise-form-scope .praise-card { background: #fff; }
 *   .praise-form-scope h2, .praise-form-scope h3 { color: #333; }
 */
export function scopeCss(css: string, scopeSelector: string): string {
  if (!css || !css.trim()) return "";

  let result = "";
  let i = 0;
  const len = css.length;

  while (i < len) {
    const openBrace = css.indexOf("{", i);
    if (openBrace === -1) {
      result += css.slice(i);
      break;
    }

    const header = css.slice(i, openBrace);
    const trimmedHeader = header.trim();

    // Check if this is a nested at-rule like @media or @supports
    if (trimmedHeader.startsWith("@media") || trimmedHeader.startsWith("@supports")) {
      let depth = 1;
      let j = openBrace + 1;
      while (j < len && depth > 0) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        j++;
      }

      const innerContent = css.slice(openBrace + 1, j - 1);
      const scopedInner = scopeCss(innerContent, scopeSelector);
      result += `${header}{\n${scopedInner}\n}`;
      i = j;
      continue;
    }

    // Normal rule (or @keyframes rule)
    const closeBrace = css.indexOf("}", openBrace);
    if (closeBrace === -1) {
      result += css.slice(i);
      break;
    }

    const declarations = css.slice(openBrace + 1, closeBrace);

    // If @keyframes or keyframe step percentage, keep as-is
    if (
      trimmedHeader.startsWith("@") ||
      trimmedHeader.endsWith("%") ||
      trimmedHeader === "from" ||
      trimmedHeader === "to"
    ) {
      result += `${header}{${declarations}}`;
      i = closeBrace + 1;
      continue;
    }

    // Normal selectors: split on comma and prefix with scopeSelector
    // Strip comments from selector string to prevent syntax corruption
    const cleanSelectors = trimmedHeader.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    const scopedSelectors = cleanSelectors
      .split(",")
      .map((sel) => {
        const s = sel.trim();
        if (!s) return "";
        if (s === ":root" || s === "body" || s === "html" || s === ":host") {
          return scopeSelector;
        }
        if (s.startsWith(scopeSelector)) {
          return s;
        }
        return `${scopeSelector} ${s}`;
      })
      .filter(Boolean)
      .join(", ");

    const leadingWsMatch = header.match(/^\s*/);
    const leadingWs = leadingWsMatch ? leadingWsMatch[0] : "";

    result += `${leadingWs}${scopedSelectors} {${declarations}}`;
    i = closeBrace + 1;
  }

  return result;
}

/**
 * Combined sanitize and scope utility.
 */
export function sanitizeAndScopeCss(
  rawCss: string,
  scopeSelector: string
): { scopedCss: string; warnings: string[] } {
  const { cleanCss, warnings } = sanitizeCss(rawCss);
  const scopedCss = scopeCss(cleanCss, scopeSelector);
  return { scopedCss, warnings };
}
