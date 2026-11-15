import { Prisma } from "@prisma/client";

export type SegmentFilterRules = {
  matchMode?: "ALL" | "ANY";
  stages?: string[];
  tagIds?: string[];
  minTestimonialCount?: number;
  maxTestimonialCount?: number;
  hasApprovedTestimonial?: boolean;
  hasVideoTestimonial?: boolean;
  submissionDateAfter?: string; // ISO date
  submissionDateBefore?: string; // ISO date
  hasCompany?: boolean;
  searchQuery?: string;
  customAttributes?: Record<string, unknown>;
};

export type CustomerForEvaluation = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  stage: string;
  createdAt: Date | string;
  testimonialCount: number;
  tagIds: string[];
  testimonials?: Array<{
    id: string;
    status: string;
    type?: string;
    submittedAt: Date | string;
  }>;
  customAttributes?: Record<string, unknown> | null;
};

/**
 * In-memory evaluator for dynamic customer segments.
 * Tests whether a customer meets the segment criteria.
 */
export function evaluateCustomerAgainstSegment(
  customer: CustomerForEvaluation,
  rules: SegmentFilterRules,
): boolean {
  const matchMode = rules.matchMode || "ALL";
  const checks: boolean[] = [];

  // 1. Stage filter
  if (rules.stages && rules.stages.length > 0) {
    const stageNormalized = (customer.stage || "").toUpperCase();
    checks.push(rules.stages.map((s) => s.toUpperCase()).includes(stageNormalized));
  }

  // 2. Tag IDs filter
  if (rules.tagIds && rules.tagIds.length > 0) {
    const customerTags = new Set(customer.tagIds || []);
    const hasAnyTag = rules.tagIds.some((t) => customerTags.has(t));
    checks.push(hasAnyTag);
  }

  // 3. Minimum Testimonial Count
  if (rules.minTestimonialCount !== undefined && rules.minTestimonialCount !== null) {
    checks.push(customer.testimonialCount >= rules.minTestimonialCount);
  }

  // 4. Maximum Testimonial Count
  if (rules.maxTestimonialCount !== undefined && rules.maxTestimonialCount !== null) {
    checks.push(customer.testimonialCount <= rules.maxTestimonialCount);
  }

  // 5. Has Approved Testimonial
  if (rules.hasApprovedTestimonial !== undefined) {
    const hasApproved =
      customer.testimonials?.some((t) => t.status === "APPROVED") ?? false;
    checks.push(rules.hasApprovedTestimonial ? hasApproved : !hasApproved);
  }

  // 6. Has Video Testimonial
  if (rules.hasVideoTestimonial !== undefined) {
    const hasVideo = customer.testimonials?.some((t) => t.type === "VIDEO") ?? false;
    checks.push(rules.hasVideoTestimonial ? hasVideo : !hasVideo);
  }

  // 7. Submission Date Range
  if (rules.submissionDateAfter || rules.submissionDateBefore) {
    const latestSubmission = customer.testimonials?.[0]?.submittedAt;
    if (!latestSubmission) {
      checks.push(false);
    } else {
      const subTime = new Date(latestSubmission).getTime();
      let dateMatch = true;
      if (rules.submissionDateAfter) {
        dateMatch = dateMatch && subTime >= new Date(rules.submissionDateAfter).getTime();
      }
      if (rules.submissionDateBefore) {
        dateMatch = dateMatch && subTime <= new Date(rules.submissionDateBefore).getTime();
      }
      checks.push(dateMatch);
    }
  }

  // 8. Has Company
  if (rules.hasCompany !== undefined) {
    const hasComp = Boolean(customer.company && customer.company.trim().length > 0);
    checks.push(rules.hasCompany ? hasComp : !hasComp);
  }

  // 9. Search Query
  if (rules.searchQuery && rules.searchQuery.trim().length > 0) {
    const q = rules.searchQuery.toLowerCase().trim();
    const matches =
      customer.name.toLowerCase().includes(q) ||
      (customer.email || "").toLowerCase().includes(q) ||
      (customer.company || "").toLowerCase().includes(q) ||
      (customer.title || "").toLowerCase().includes(q);
    checks.push(matches);
  }

  // 10. Custom Attributes match
  if (rules.customAttributes && Object.keys(rules.customAttributes).length > 0) {
    const custAttrs = customer.customAttributes || {};
    let attrMatches = true;
    for (const [key, val] of Object.entries(rules.customAttributes)) {
      if (val === undefined || val === null || val === "") continue;
      const custVal = custAttrs[key];
      if (String(custVal).toLowerCase() !== String(val).toLowerCase()) {
        attrMatches = false;
        break;
      }
    }
    checks.push(attrMatches);
  }

  // If no checks specified, customer matches by default
  if (checks.length === 0) return true;

  return matchMode === "ANY" ? checks.some(Boolean) : checks.every(Boolean);
}

/**
 * Builds a Prisma CustomerWhereInput object from segment filter rules.
 */
export function buildPrismaWhereForSegment(
  workspaceId: string,
  rules: SegmentFilterRules,
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { workspaceId };
  const conditions: Prisma.CustomerWhereInput[] = [];

  // Stage condition
  if (rules.stages && rules.stages.length > 0) {
    conditions.push({
      stage: { in: rules.stages.map((s) => s.toUpperCase()) },
    });
  }

  // Tags condition
  if (rules.tagIds && rules.tagIds.length > 0) {
    conditions.push({
      customerTags: {
        some: {
          tagId: { in: rules.tagIds },
        },
      },
    });
  }

  // Has company condition
  if (rules.hasCompany !== undefined) {
    if (rules.hasCompany) {
      conditions.push({
        company: { not: null },
      });
    } else {
      conditions.push({
        OR: [{ company: null }, { company: "" }],
      });
    }
  }

  // Testimonial status or count conditions
  if (rules.hasApprovedTestimonial) {
    conditions.push({
      testimonials: {
        some: { status: "APPROVED" },
      },
    });
  }

  if (rules.submissionDateAfter || rules.submissionDateBefore) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (rules.submissionDateAfter) dateFilter.gte = new Date(rules.submissionDateAfter);
    if (rules.submissionDateBefore) dateFilter.lte = new Date(rules.submissionDateBefore);
    conditions.push({
      testimonials: {
        some: { submittedAt: dateFilter },
      },
    });
  }

  // Search query
  if (rules.searchQuery && rules.searchQuery.trim().length > 0) {
    const q = rules.searchQuery.trim();
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (conditions.length > 0) {
    if (rules.matchMode === "ANY") {
      where.OR = conditions;
    } else {
      where.AND = conditions;
    }
  }

  return where;
}
