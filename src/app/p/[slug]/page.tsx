import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { PublicFormClient } from "@/app/p/[slug]/public-form-client";
import { PraiseLogo } from "@/components/brand";
import { CollectionFormDetail, FormFieldItem } from "@/types/form-builder";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Fallback demo form when testing locally and database is empty/unseeded
const fallbackDevForm: CollectionFormDetail = {
  id: "form-dev-preview",
  workspaceId: "ws-default",
  projectId: "proj-default",
  title: "Customer Praise & Feedback",
  slug: "feedback",
  description: "We would love to hear about your experience using our product.",
  headerPrompt: "How has our product helped you or your team?",
  thankYouMessage: "Thank you for your valuable feedback! We truly appreciate your time.",
  allowVideo: true,
  allowAudio: true,
  allowText: true,
  maxVideoDurationSeconds: 120,
  collectName: true,
  nameRequired: true,
  collectEmail: true,
  emailRequired: true,
  collectCompany: true,
  companyRequired: false,
  collectJobTitle: true,
  jobTitleRequired: false,
  collectWebsite: true,
  websiteRequired: false,
  collectRating: true,
  ratingRequired: true,
  collectText: true,
  textRequired: true,
  collectAvatar: true,
  collectConsent: true,
  consentRequired: true,
  consentText:
    "I grant permission to use my feedback, name, and company logo for public marketing purposes.",
  submissionsEnabled: true,
  redirectUrl: null,
  customLogoUrl: null,
  accentColor: "#7049D8",
  theme: "warm",
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fields: [
    {
      id: "fld-1",
      label: "What specific problem did our product solve for you?",
      description: "Briefly describe your workflow before and after.",
      placeholder: "Before using Praise, collecting quotes was manual...",
      type: "LONG_TEXT",
      isRequired: false,
      orderIndex: 0,
    },
    {
      id: "fld-2",
      label: "How likely are you to recommend us to a colleague?",
      description: "1 = Unlikely, 5 = Highly likely",
      placeholder: "",
      type: "STAR_RATING",
      isRequired: false,
      orderIndex: 1,
    },
  ],
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const form = await prisma.collectionForm.findFirst({
      where: { slug },
      select: { title: true, headerPrompt: true },
    });

    if (form) {
      return {
        title: `${form.title} — Praise`,
        description: form.headerPrompt,
      };
    }
  } catch {
    // ignore
  }

  return {
    title: "Testimonial Collection Form — Praise",
    description: "Submit customer feedback and reviews.",
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug } = await params;

  let form: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    form = await prisma.collectionForm.findFirst({
      where: { slug },
      include: {
        fields: {
          orderBy: { orderIndex: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // In local dev without DB, render fallback test form so submission UI can be tested
      return <PublicFormClient form={{ ...fallbackDevForm, slug }} />;
    }
    console.error("Failed to query public form:", error);
  }

  // 1. Form does not exist
  if (!form) {
    if (process.env.NODE_ENV !== "production") {
      // Allow testing any slug in local development
      return <PublicFormClient form={{ ...fallbackDevForm, slug }} />;
    }

    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-line bg-white p-8 shadow-xs space-y-4">
          <div className="inline-flex items-center justify-center">
            <PraiseLogo size="md" decorative />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            Form Not Found
          </h1>
          <p className="text-xs text-ink-600 leading-relaxed">
            The collection link you requested does not exist or the link may have been changed.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-warm-100 px-3.5 py-2 text-xs font-semibold text-ink-800 hover:bg-warm-200 transition-colors"
            >
              &larr; Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Form is unpublished
  if (!form.isPublished) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-line bg-white p-8 shadow-xs space-y-4">
          <div className="inline-flex items-center justify-center">
            <PraiseLogo size="md" decorative />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            Form Unpublished
          </h1>
          <p className="text-xs text-ink-600 leading-relaxed">
            This collection form is currently unpublished by the workspace administrator.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-warm-100 px-3.5 py-2 text-xs font-semibold text-ink-800 hover:bg-warm-200 transition-colors"
            >
              &larr; Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Form has submissions paused / disabled
  if (!form.submissionsEnabled) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-line bg-white p-8 shadow-xs space-y-4">
          <div className="inline-flex items-center justify-center">
            <PraiseLogo size="md" decorative />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            Submissions Paused
          </h1>
          <p className="text-xs text-ink-600 leading-relaxed">
            This form has temporarily paused accepting new submissions. Please contact the administrator or check back later.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-warm-100 px-3.5 py-2 text-xs font-semibold text-ink-800 hover:bg-warm-200 transition-colors"
            >
              &larr; Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const serializableForm: CollectionFormDetail = {
    ...form,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    fields: form.fields.map(
      (f: any): FormFieldItem => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: f.id,
        label: f.label,
        description: f.description,
        placeholder: f.placeholder,
        type: f.type as FormFieldItem["type"],
        isRequired: f.isRequired,
        orderIndex: f.orderIndex,
        optionsJson: f.optionsJson,
      }),
    ),
  };

  return <PublicFormClient form={serializableForm} />;
}
