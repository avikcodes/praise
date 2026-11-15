import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { importContactsSafely, ImportContactInput } from "@/lib/customers/crm";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Parses raw CSV string into contact objects.
 */
function parseCsvContacts(csvText: string): ImportContactInput[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const companyIdx = headers.findIndex((h) => h.includes("company") || h.includes("org"));
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("role"));
  const websiteIdx = headers.findIndex((h) => h.includes("website") || h.includes("url"));
  const stageIdx = headers.findIndex((h) => h.includes("stage"));
  const tagsIdx = headers.findIndex((h) => h.includes("tag"));

  const contacts: ImportContactInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV parser handling quotes
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const email = emailIdx >= 0 ? values[emailIdx] || "" : "";
    const name = nameIdx >= 0 ? values[nameIdx] || "" : email ? email.split("@")[0] : "";

    if (!email && !name) continue;

    const company = companyIdx >= 0 ? values[companyIdx] || null : null;
    const title = titleIdx >= 0 ? values[titleIdx] || null : null;
    const website = websiteIdx >= 0 ? values[websiteIdx] || null : null;
    const stage = stageIdx >= 0 ? values[stageIdx] || null : null;
    const rawTags = tagsIdx >= 0 ? values[tagsIdx] || "" : "";
    const tags = rawTags ? rawTags.split(/[;,|]/).map((t) => t.trim()).filter(Boolean) : [];

    contacts.push({
      name: name || "Anonymous",
      email,
      company,
      title,
      website,
      stage,
      tags,
    });
  }

  return contacts;
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { contacts, csvText, updateExisting = true, defaultStage = "NEW" } = body;

    let parsedContacts: ImportContactInput[] = [];

    if (Array.isArray(contacts)) {
      parsedContacts = contacts;
    } else if (typeof csvText === "string" && csvText.trim()) {
      parsedContacts = parseCsvContacts(csvText);
    } else {
      return NextResponse.json(
        { error: "Provide either a 'contacts' JSON array or 'csvText' content to import." },
        { status: 400 },
      );
    }

    if (parsedContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contact rows detected." },
        { status: 400 },
      );
    }

    const result = await importContactsSafely({
      workspaceId,
      contacts: parsedContacts,
      updateExisting: Boolean(updateExisting),
      defaultStage,
      actorId: member.user.id,
      actorName: member.user.name,
    });

    return NextResponse.json({
      success: true,
      message: `Import complete: ${result.createdCount} created, ${result.updatedCount} updated, ${result.skippedCount} skipped.`,
      result,
    });
  } catch (error) {
    console.error("Import contacts error:", error);
    return NextResponse.json(
      { error: "Failed to import contacts." },
      { status: 500 },
    );
  }
}
