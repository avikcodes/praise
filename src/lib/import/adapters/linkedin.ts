import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class LinkedInAdapter implements ExternalSourceAdapter {
  id = "LINKEDIN" as const;
  name = "LinkedIn Recommendations";
  category = "B2B_DIRECTORY" as const;
  description = "Import professional recommendations and executive endorsements from your LinkedIn Account Data Archive or structured export.";
  icon = "linkedin";
  color = "#0A66C2";
  supportsAutomatedApi = false;
  apiRequirementNote = "In compliance with LinkedIn Terms of Service, automated crawling is restricted. Import directly using your official LinkedIn Data Archive (Settings > Data Privacy > Get a copy of your data > Recommendations) or structured JSON/CSV.";
  supportedInputTypes = ["STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "Text",
    authorName: "Full Name",
    authorCompany: "Company",
    authorTitle: "Job Title",
    originalDate: "Creation Date",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const rows = extractRowsFromPayload(payload);
    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || typeof r !== "object") continue;

      const content =
        r.Text ||
        r.text ||
        r.content ||
        r.recommendation ||
        r.message ||
        r["Recommendation Text"] ||
        "";

      if (!content || !String(content).trim()) continue;

      const firstName = r["First Name"] || r.firstName || "";
      const lastName = r["Last Name"] || r.lastName || "";
      const fullName =
        r["Full Name"] ||
        r.name ||
        r.recommender ||
        `${firstName} ${lastName}`.trim() ||
        "LinkedIn Connection";

      const company = r.Company || r.company || r["Company Name"] || null;
      const jobTitle = r["Job Title"] || r.jobTitle || r.title || r.occupation || null;

      let originalDate: string | null = null;
      const rawDate = r["Creation Date"] || r.creationDate || r.date || r.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      items.push({
        externalId: r.id || `linkedin-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(fullName).trim(),
        authorCompany: company ? String(company).trim() : null,
        authorTitle: jobTitle ? String(jobTitle).trim() : null,
        authorAvatarUrl: r.avatar || r.picture || null,
        rating: 5, // Professional recommendations represent highest positive sentiment
        originalRating: "Recommended",
        sourcePlatform: "LINKEDIN",
        sourceUrl: r.url || r.profileUrl || null,
        originalDate,
        rawRecord: r,
      });
    }

    return items;
  }
}
