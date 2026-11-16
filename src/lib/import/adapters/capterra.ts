import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class CapterraAdapter implements ExternalSourceAdapter {
  id = "CAPTERRA" as const;
  name = "Capterra / Gartner";
  category = "B2B_DIRECTORY" as const;
  description = "Import Gartner Digital Markets verified buyer reviews from Capterra, GetApp, and Software Advice vendor exports.";
  icon = "capterra";
  color = "#0047FF";
  supportsAutomatedApi = false;
  apiRequirementNote = "Gartner Digital Markets provides reviews via your official Gartner Vendor Portal CSV export. Direct web scraping is strictly prohibited by Gartner terms.";
  supportedInputTypes = ["STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "Review Summary",
    authorName: "Reviewer Name",
    authorCompany: "Company Name",
    authorTitle: "Job Title",
    rating: "Overall Rating",
    sourceUrl: "URL",
    originalDate: "Review Date",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const list = extractRowsFromPayload(payload);
    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || typeof r !== "object") continue;

      const summary =
        r["Review Headline"] ||
        r["Review Summary"] ||
        r.reviewHeadline ||
        r.summary ||
        r.title ||
        "";
      const pros = r.Pros || r.pros || "";
      const cons = r.Cons || r.cons || "";
      const general = r.Comments || r.comments || r.Review || r.text || r.content || r.body || "";

      const parts: string[] = [];
      if (summary) parts.push(summary);
      if (pros) parts.push(`Pros: ${pros}`);
      if (cons) parts.push(`Cons: ${cons}`);
      if (general && general !== pros && general !== cons) parts.push(general);

      const content = parts.length > 0 ? parts.join("\n\n") : (summary || general || pros || "");

      if (!content || !String(content).trim()) continue;

      const authorName =
        r["Reviewer Name"] ||
        r.reviewer?.name ||
        r.authorName ||
        r.name ||
        "Capterra Verified Reviewer";

      const industry = r.Industry || r.industry || "";
      const companySize = r["Company Size"] || r.companySize || "";
      let company = r["Company Name"] || r.reviewer?.organization || r.company || null;
      if (!company && (industry || companySize)) {
        company = industry && companySize ? `${industry} (${companySize})` : industry || companySize;
      }

      const jobTitle = r["Job Title"] || r.reviewer?.jobTitle || r.title || null;

      const rawRating = r["Overall Rating"] || r.overallRating || r.rating || r.score;
      let rating = 5;
      if (rawRating !== undefined && rawRating !== null) {
        const parsed = Number(rawRating);
        if (!isNaN(parsed)) rating = Math.max(1, Math.min(5, Math.round(parsed)));
      }

      let originalDate: string | null = null;
      const rawDate = r["Review Date"] || r.date || r.submitted_at || r.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      items.push({
        externalId: r.id || `capterra-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorCompany: company ? String(company).trim() : null,
        authorTitle: jobTitle ? String(jobTitle).trim() : null,
        rating,
        originalRating: rawRating ? `${rawRating}/5 Stars` : "5/5 Stars",
        sourcePlatform: "CAPTERRA",
        sourceUrl: r.URL || r.url || r.reviewUrl || null,
        originalDate,
        rawRecord: r,
      });
    }

    return items;
  }
}
