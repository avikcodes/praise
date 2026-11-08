import { PraiseFieldKey } from "./types";

/**
 * Robust RFC 4180 CSV parser supporting:
 * - Multi-line content inside quoted strings
 * - Escaped double quotes ("")
 * - Commas, semicolons, or tabs as delimiters
 * - UTF-8 BOM removal
 * - CRLF and LF line breaks
 */
export function parseCsvToRows(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (!clean) {
    return { headers: [], rows: [] };
  }

  // Determine delimiter from the first line
  const firstLine = clean.split(/\r\n|\r|\n/)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ",";
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }

  const rawGrid: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField.trim());
        rawGrid.push(currentRow);
        currentRow = [];
        currentField = "";
        i += 2;
        continue;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField.trim());
        rawGrid.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rawGrid.push(currentRow);
  }

  const nonEmptyRows = rawGrid.filter(
    (row) => row.some((col) => col.trim().length > 0)
  );

  if (nonEmptyRows.length === 0) {
    return { headers: [], rows: [] };
  }

  // Header row
  const rawHeaders = nonEmptyRows[0];
  const headers = rawHeaders.map((h, idx) => {
    const cleaned = h.trim();
    return cleaned || `column_${idx + 1}`;
  });

  // Data rows
  const dataRows: Record<string, string>[] = [];
  for (let r = 1; r < nonEmptyRows.length; r++) {
    const rowValues = nonEmptyRows[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      rowObj[headerName] = (rowValues[c] ?? "").trim();
    }
    dataRows.push(rowObj);
  }

  return { headers, rows: dataRows };
}

/**
 * Parses JSON data into standardized headers and string-record rows.
 * Handles top-level array of objects or wrapped `{ testimonials: [...] }` / `{ reviews: [...] }`.
 */
export function parseJsonToRows(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const clean = text.trim();
  if (!clean) {
    return { headers: [], rows: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(
      `Invalid JSON format: ${err instanceof Error ? err.message : "Malformed syntax"}`
    );
  }

  let rawList: Record<string, unknown>[] = [];

  if (Array.isArray(parsed)) {
    rawList = parsed.filter((item) => typeof item === "object" && item !== null);
  } else if (typeof parsed === "object" && parsed !== null) {
    const candidateKeys = ["testimonials", "reviews", "data", "items", "feedbacks"];
    const foundKey = candidateKeys.find(
      (k) => Array.isArray((parsed as Record<string, unknown>)[k])
    );
    if (foundKey) {
      rawList = (parsed as Record<string, unknown>)[foundKey] as Record<string, unknown>[];
    } else {
      // Single object fallback
      rawList = [parsed as Record<string, unknown>];
    }
  }

  if (rawList.length === 0) {
    return { headers: [], rows: [] };
  }

  // Collect all unique keys across all records
  const headerSet = new Set<string>();
  for (const item of rawList) {
    for (const key of Object.keys(item)) {
      headerSet.add(key);
    }
  }

  const headers = Array.from(headerSet);

  const rows: Record<string, string>[] = rawList.map((item) => {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const val = item[h];
      if (val === null || val === undefined) {
        row[h] = "";
      } else if (Array.isArray(val)) {
        row[h] = val.map((v) => String(v).trim()).join(", ");
      } else if (typeof val === "object") {
        row[h] = JSON.stringify(val);
      } else {
        row[h] = String(val).trim();
      }
    }
    return row;
  });

  return { headers, rows };
}

/**
 * Intelligently maps column header strings to Praise field definitions.
 */
export function autoGuessMappings(headers: string[]): Record<string, PraiseFieldKey> {
  const mappings: Record<string, PraiseFieldKey> = {};
  const mappedPraiseFields = new Set<PraiseFieldKey>();

  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");

    let matched: PraiseFieldKey = "__ignore__";

    // 1. Content / Testimonial text
    if (
      norm.includes("content") ||
      norm.includes("testimonial") ||
      norm.includes("review") ||
      norm.includes("comment") ||
      norm.includes("feedback") ||
      norm.includes("quote") ||
      norm.includes("message") ||
      norm === "text" ||
      norm === "body"
    ) {
      if (!mappedPraiseFields.has("content")) {
        matched = "content";
      }
    }
    // 2. Customer Email
    else if (norm.includes("email") || norm === "mail") {
      matched = "customerEmail";
    }
    // 3. Customer Company
    else if (
      norm.includes("company") ||
      norm.includes("organization") ||
      norm.includes("org") ||
      norm.includes("business")
    ) {
      matched = "customerCompany";
    }
    // 4. Customer Job Title
    else if (
      norm.includes("title") ||
      norm.includes("role") ||
      norm.includes("position") ||
      norm.includes("job")
    ) {
      matched = "customerTitle";
    }
    // 5. Customer Website
    else if (norm.includes("website") || norm.includes("url") || norm.includes("link")) {
      matched = "customerWebsite";
    }
    // 6. Customer Avatar / Photo
    else if (
      norm.includes("avatar") ||
      norm.includes("photo") ||
      norm.includes("picture") ||
      norm.includes("image")
    ) {
      matched = "customerAvatar";
    }
    // 7. Customer Name
    else if (
      norm.includes("name") ||
      norm.includes("author") ||
      norm.includes("customer") ||
      norm.includes("client") ||
      norm.includes("user") ||
      norm.includes("reviewer")
    ) {
      matched = "customerName";
    }
    // 8. Rating / Stars
    else if (
      norm.includes("rating") ||
      norm.includes("star") ||
      norm.includes("score") ||
      norm === "rate"
    ) {
      matched = "rating";
    }
    // 9. Date
    else if (
      norm.includes("date") ||
      norm.includes("created") ||
      norm.includes("submitted") ||
      norm.includes("time")
    ) {
      matched = "submittedAt";
    }
    // 10. Project
    else if (norm.includes("project") || norm.includes("product")) {
      matched = "projectName";
    }
    // 11. Tags
    else if (
      norm.includes("tag") ||
      norm.includes("category") ||
      norm.includes("categories") ||
      norm.includes("label")
    ) {
      matched = "tags";
    }
    // 12. Source platform
    else if (
      norm.includes("source") ||
      norm.includes("platform") ||
      norm.includes("channel") ||
      norm.includes("origin")
    ) {
      matched = "source";
    }

    if (matched !== "__ignore__") {
      mappedPraiseFields.add(matched);
    }

    mappings[h] = matched;
  }

  return mappings;
}

/**
 * Generates sample CSV template string for download.
 */
export function generateSampleCsv(): string {
  return [
    `"Customer Name","Email","Company","Job Title","Testimonial Text","Rating","Submission Date","Project","Tags","Source"`,
    `"Sarah Connor","sarah@cyberdyne.io","Cyberdyne Systems","VP of Operations","Praise has transformed how our marketing team highlights customer love. Clean, beautiful widgets and effortless collection.",5,"2026-03-15","Main Product","Enterprise, High NPS","G2"`,
    `"Alex Rivera","alex@startup.dev","Rivera Labs","Founder","Switched our entire testimonial stack to Praise in an afternoon. Self-hosted and lightning fast.",5,"2026-03-20","Main Product","Founder, Tech","Capterra"`,
    `"Marcus Vance","marcus@designco.com","DesignCo","Creative Director","The public submission forms look stunning out of the box. Our clients actually enjoy leaving reviews.",4,"2026-04-01","Client Portal","Design, Agency","Trustpilot"`,
  ].join("\n");
}

/**
 * Generates sample JSON template string for download.
 */
export function generateSampleJson(): string {
  const data = [
    {
      customerName: "Sarah Connor",
      email: "sarah@cyberdyne.io",
      company: "Cyberdyne Systems",
      jobTitle: "VP of Operations",
      content:
        "Praise has transformed how our marketing team highlights customer love. Clean, beautiful widgets and effortless collection.",
      rating: 5,
      submittedAt: "2026-03-15T12:00:00Z",
      project: "Main Product",
      tags: ["Enterprise", "High NPS"],
      source: "G2",
    },
    {
      customerName: "Alex Rivera",
      email: "alex@startup.dev",
      company: "Rivera Labs",
      jobTitle: "Founder",
      content:
        "Switched our entire testimonial stack to Praise in an afternoon. Self-hosted and lightning fast.",
      rating: 5,
      submittedAt: "2026-03-20T14:30:00Z",
      project: "Main Product",
      tags: ["Founder", "Tech"],
      source: "Capterra",
    },
  ];
  return JSON.stringify(data, null, 2);
}

