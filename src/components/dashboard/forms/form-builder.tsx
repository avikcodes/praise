"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  ChevronDown,
  FileText,
  Globe,
  ListFilter,
  Loader2,
  Mail,
  Mic,
  Palette,
  Plus,
  Radio,
  Save,
  Sliders,
  Star,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import {
  CollectionFormDetail,
  FormCustomFieldType,
  FormFieldItem,
} from "@/types/form-builder";
import { FormPreview } from "@/components/dashboard/forms/form-preview";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { cn } from "@/lib/utils";

type FormBuilderProps = {
  initialForm?: CollectionFormDetail | null;
  onSaveSuccess: (savedForm: CollectionFormDetail) => void;
  onCancel: () => void;
};

const customFieldTypeDefinitions: {
  type: FormCustomFieldType;
  label: string;
  icon: typeof Type;
  description: string;
}[] = [
  { type: "SHORT_TEXT", label: "Short Text", icon: Type, description: "Single-line text response" },
  { type: "LONG_TEXT", label: "Long Text", icon: FileText, description: "Multi-line paragraph answer" },
  { type: "EMAIL", label: "Email", icon: Mail, description: "Email address with validation" },
  { type: "URL", label: "Website URL", icon: Globe, description: "Web link or portfolio URL" },
  { type: "SINGLE_CHOICE", label: "Single Choice", icon: Radio, description: "Select one option from a dropdown" },
  { type: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: ListFilter, description: "Select multiple options with checkboxes" },
  { type: "CHECKBOX", label: "Consent Checkbox", icon: CheckSquare, description: "Single toggle checkbox agreement" },
  { type: "STAR_RATING", label: "Star Rating", icon: Star, description: "1 to 5 star rating question" },
];

export function FormBuilder({
  initialForm,
  onSaveSuccess,
  onCancel,
}: FormBuilderProps) {
  const { activeWorkspace, projects } = useWorkspace();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    "general" | "standard" | "custom" | "appearance"
  >("general");
  const [isSaving, setIsSaving] = useState(false);
  const [addFieldMenuOpen, setAddFieldMenuOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialForm?.title || "Customer Feedback Form");
  const [slug, setSlug] = useState(initialForm?.slug || "customer-feedback");
  const [description, setDescription] = useState(initialForm?.description || "");
  const [projectId, setProjectId] = useState<string>(initialForm?.projectId || "");
  const [headerPrompt, setHeaderPrompt] = useState(
    initialForm?.headerPrompt || "How has our product helped your team succeed?",
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    initialForm?.thankYouMessage || "Thank you for sharing your feedback with us!",
  );
  const [allowVideo, setAllowVideo] = useState(initialForm?.allowVideo ?? true);
  const [allowAudio, setAllowAudio] = useState(initialForm?.allowAudio ?? true);
  const [allowText, setAllowText] = useState(initialForm?.allowText ?? true);
  const [maxVideoDurationSeconds, setMaxVideoDurationSeconds] = useState(
    initialForm?.maxVideoDurationSeconds ?? 120,
  );
  const [isPublished, setIsPublished] = useState(initialForm?.isPublished ?? true);

  // Submission controls & Appearance
  const [submissionsEnabled, setSubmissionsEnabled] = useState(
    initialForm?.submissionsEnabled ?? true,
  );
  const [redirectUrl, setRedirectUrl] = useState(initialForm?.redirectUrl || "");
  const [customLogoUrl, setCustomLogoUrl] = useState(initialForm?.customLogoUrl || "");
  const [accentColor, setAccentColor] = useState(
    initialForm?.accentColor || "#7049D8",
  );
  const [theme, setTheme] = useState(initialForm?.theme || "warm");

  // Standard fields state
  const [collectName, setCollectName] = useState(initialForm?.collectName ?? true);
  const [nameRequired, setNameRequired] = useState(initialForm?.nameRequired ?? true);

  const [collectEmail, setCollectEmail] = useState(initialForm?.collectEmail ?? true);
  const [emailRequired, setEmailRequired] = useState(initialForm?.emailRequired ?? true);

  const [collectCompany, setCollectCompany] = useState(initialForm?.collectCompany ?? true);
  const [companyRequired, setCompanyRequired] = useState(initialForm?.companyRequired ?? false);

  const [collectJobTitle, setCollectJobTitle] = useState(initialForm?.collectJobTitle ?? false);
  const [jobTitleRequired, setJobTitleRequired] = useState(initialForm?.jobTitleRequired ?? false);

  const [collectWebsite, setCollectWebsite] = useState(initialForm?.collectWebsite ?? false);
  const [websiteRequired, setWebsiteRequired] = useState(initialForm?.websiteRequired ?? false);

  const [collectRating, setCollectRating] = useState(initialForm?.collectRating ?? true);
  const [ratingRequired, setRatingRequired] = useState(initialForm?.ratingRequired ?? false);

  const [collectText, setCollectText] = useState(initialForm?.collectText ?? true);
  const [textRequired, setTextRequired] = useState(initialForm?.textRequired ?? true);

  const [collectAvatar, setCollectAvatar] = useState(initialForm?.collectAvatar ?? true);

  const [collectConsent, setCollectConsent] = useState(initialForm?.collectConsent ?? true);
  const [consentRequired, setConsentRequired] = useState(initialForm?.consentRequired ?? true);
  const [consentText, setConsentText] = useState(
    initialForm?.consentText ||
      "I grant permission to use my feedback, name, and submitted media for public marketing purposes.",
  );

  // Custom questions state
  const [customFields, setCustomFields] = useState<FormFieldItem[]>(
    initialForm?.fields || [],
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialForm) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const addCustomField = (type: FormCustomFieldType) => {
    const typeDef = customFieldTypeDefinitions.find((d) => d.type === type);
    const newField: FormFieldItem = {
      label: `New ${typeDef?.label || "Question"}`,
      description: "",
      placeholder:
        type === "CHECKBOX"
          ? "I agree to the terms above"
          : type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
          ? ""
          : "Your response here...",
      type,
      isRequired: false,
      orderIndex: customFields.length,
      optionsJson:
        type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
          ? JSON.stringify(["Option A", "Option B", "Option C"])
          : null,
    };
    setCustomFields((prev) => [...prev, newField]);
    setAddFieldMenuOpen(false);
    setActiveTab("custom");
  };

  const updateCustomField = (index: number, updates: Partial<FormFieldItem>) => {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === customFields.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...customFields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setCustomFields(
      reordered.map((item, idx) => ({ ...item, orderIndex: idx })),
    );
  };

  const deleteField = (index: number) => {
    setCustomFields((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, orderIndex: idx })),
    );
  };

  const handleSave = async () => {
    if (!activeWorkspace?.id) {
      toast.error("Error", "No active workspace selected.");
      return;
    }
    if (!title.trim()) {
      toast.error("Validation error", "Form name is required.");
      return;
    }
    if (!headerPrompt.trim()) {
      toast.error("Validation error", "Introduction prompt is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: (slug || title).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      description: description.trim() || undefined,
      projectId: projectId || null,
      headerPrompt: headerPrompt.trim(),
      thankYouMessage: thankYouMessage.trim() || undefined,
      allowVideo,
      allowAudio,
      allowText,
      maxVideoDurationSeconds: Number(maxVideoDurationSeconds) || 120,
      collectName,
      nameRequired,
      collectEmail,
      emailRequired,
      collectCompany,
      companyRequired,
      collectJobTitle,
      jobTitleRequired,
      collectWebsite,
      websiteRequired,
      collectRating,
      ratingRequired,
      collectText,
      textRequired,
      collectAvatar,
      collectConsent,
      consentRequired,
      consentText: consentText.trim(),
      submissionsEnabled,
      redirectUrl: redirectUrl.trim() || undefined,
      customLogoUrl: customLogoUrl.trim() || undefined,
      accentColor,
      theme,
      isPublished,
      fields: customFields.map((f, idx) => ({
        id: f.id,
        label: f.label.trim() || `Question ${idx + 1}`,
        description: f.description?.trim() || null,
        placeholder: f.placeholder?.trim() || null,
        type: f.type,
        isRequired: f.isRequired,
        orderIndex: idx,
        optionsJson: f.optionsJson || null,
      })),
    };

    setIsSaving(true);
    try {
      const url = initialForm
        ? `/api/workspaces/${activeWorkspace.id}/forms/${initialForm.id}`
        : `/api/workspaces/${activeWorkspace.id}/forms`;
      const method = initialForm ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to save form", data.error || "An error occurred");
        setIsSaving(false);
        return;
      }

      toast.success(
        initialForm ? "Form updated" : "Form created",
        `"${payload.title}" is ready.`,
      );
      onSaveSuccess(data.form);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      toast.error("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  // Construct current preview object
  const previewData: Partial<CollectionFormDetail> = {
    title,
    slug,
    description,
    headerPrompt,
    thankYouMessage,
    allowVideo,
    allowAudio,
    allowText,
    maxVideoDurationSeconds,
    collectName,
    nameRequired,
    collectEmail,
    emailRequired,
    collectCompany,
    companyRequired,
    collectJobTitle,
    jobTitleRequired,
    collectWebsite,
    websiteRequired,
    collectRating,
    ratingRequired,
    collectText,
    textRequired,
    collectAvatar,
    collectConsent,
    consentRequired,
    consentText,
    submissionsEnabled,
    redirectUrl,
    customLogoUrl,
    accentColor,
    theme,
    isPublished,
    fields: customFields,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[640px] rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
            title="Back to Forms"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 truncate">
            <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate">
              {title || "Untitled Form"}
            </h2>
            <span className="text-[11px] text-ink-500">
              {initialForm ? "Editing Form" : "Creating New Form"} &bull;{" "}
              {activeWorkspace?.name || "Workspace"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>{initialForm ? "Save Changes" : "Create Form"}</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Pane: Configuration Panel (7 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-5 border-r border-line flex flex-col h-full bg-white">
          {/* Tabs Bar */}
          <div className="flex border-b border-line bg-warm-50 px-3 pt-2 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={cn(
                "rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5",
                activeTab === "general"
                  ? "bg-white text-ink-900 border-t border-x border-line shadow-2xs -mb-px"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <Sliders size={13} />
              <span>General &amp; Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("standard")}
              className={cn(
                "rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5",
                activeTab === "standard"
                  ? "bg-white text-ink-900 border-t border-x border-line shadow-2xs -mb-px"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <CheckSquare size={13} />
              <span>Standard Fields</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={cn(
                "rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5",
                activeTab === "custom"
                  ? "bg-white text-ink-900 border-t border-x border-line shadow-2xs -mb-px"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <Plus size={13} />
              <span>Questions ({customFields.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5",
                activeTab === "appearance"
                  ? "bg-white text-ink-900 border-t border-x border-line shadow-2xs -mb-px"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <Palette size={13} />
              <span>Appearance</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. GENERAL TAB */}
            {activeTab === "general" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Form Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Q3 Customer Testimonials"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Public URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. customer-feedback"
                      className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Project Association
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">None (Workspace Level)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Customer Introduction / Header Prompt *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={headerPrompt}
                    onChange={(e) => setHeaderPrompt(e.target.value)}
                    placeholder="What did you enjoy most about using our product?"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    Shown prominently at the top of the testimonial collection screen.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Internal Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Internal reference notes or brief subtitle..."
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Allowed Response Formats */}
                <div className="rounded-xl border border-line bg-warm-50/60 p-4 space-y-3">
                  <div className="font-semibold text-xs text-ink-900">
                    Accepted Review Formats
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={allowText}
                        onChange={(e) => setAllowText(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <FileText size={13} className="text-ink-500" />
                      <span>Text</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={allowVideo}
                        onChange={(e) => setAllowVideo(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <Video size={13} className="text-brand-600" />
                      <span>Video</span>
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-line bg-white p-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={allowAudio}
                        onChange={(e) => setAllowAudio(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <Mic size={13} className="text-brand-600" />
                      <span>Audio</span>
                    </label>
                  </div>

                  {allowVideo && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                        Max Video Duration (seconds)
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={300}
                        value={maxVideoDurationSeconds}
                        onChange={(e) => setMaxVideoDurationSeconds(Number(e.target.value))}
                        className="w-32 rounded-lg border border-line p-1.5 text-xs text-ink-900"
                      />
                    </div>
                  )}
                </div>

                {/* Thank You Screen */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Thank You Message
                  </label>
                  <input
                    type="text"
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    placeholder="Thank you for sharing your feedback!"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Optional Redirect URL */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Redirect URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://example.com/thank-you"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    Automatically redirect customers to your custom thank-you or landing page after submitting.
                  </p>
                </div>

                {/* Submissions Enabled Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="block text-xs font-semibold text-ink-900">
                      Enable Submissions
                    </span>
                    <span className="text-[11px] text-ink-500">
                      {submissionsEnabled
                        ? "Enabled — customers can submit new testimonials"
                        : "Paused — new customer submissions are currently blocked"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmissionsEnabled(!submissionsEnabled)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      submissionsEnabled ? "bg-brand-500" : "bg-ink-200",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        submissionsEnabled ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>

                {/* Published status toggle */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="block text-xs font-semibold text-ink-900">
                      Published Status
                    </span>
                    <span className="text-[11px] text-ink-500">
                      {isPublished
                        ? "Published — public link is accessible"
                        : "Unpublished — hidden from respondents"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isPublished ? "bg-brand-500" : "bg-ink-200",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        isPublished ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 2. STANDARD FIELDS TAB */}
            {activeTab === "standard" && (
              <div className="space-y-3">
                <p className="text-xs text-ink-500 leading-relaxed">
                  Configure the core respondent profile fields and marketing consent. Toggle whether each field is enabled and required.
                </p>

                {/* Name */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Customer Full Name
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Display name for the testimonial quote
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nameRequired}
                        disabled={!collectName}
                        onChange={(e) => setNameRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectName}
                      onChange={(e) => setCollectName(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Email Address
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Used for verification and follow-ups
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailRequired}
                        disabled={!collectEmail}
                        onChange={(e) => setEmailRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectEmail}
                      onChange={(e) => setCollectEmail(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Star Rating */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Star Rating (1-5 Stars)
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Numeric satisfaction score
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ratingRequired}
                        disabled={!collectRating}
                        onChange={(e) => setRatingRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectRating}
                      onChange={(e) => setCollectRating(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Written Testimonial Text */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Written Testimonial Content
                    </span>
                    <span className="text-[11px] text-ink-500">
                      The core paragraph quote
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={textRequired}
                        disabled={!collectText}
                        onChange={(e) => setTextRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectText}
                      onChange={(e) => setCollectText(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Company / Organization Name
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Organization attribution
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={companyRequired}
                        disabled={!collectCompany}
                        onChange={(e) => setCompanyRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectCompany}
                      onChange={(e) => setCollectCompany(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Job Title / Role
                    </span>
                    <span className="text-[11px] text-ink-500">
                      e.g. Chief Marketing Officer
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jobTitleRequired}
                        disabled={!collectJobTitle}
                        onChange={(e) => setJobTitleRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectJobTitle}
                      onChange={(e) => setCollectJobTitle(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Website / Social Profile
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Links to the respondent&apos;s site or Twitter handle
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={websiteRequired}
                        disabled={!collectWebsite}
                        onChange={(e) => setWebsiteRequired(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Required</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={collectWebsite}
                      onChange={(e) => setCollectWebsite(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3">
                  <div>
                    <span className="font-semibold text-xs text-ink-900 block">
                      Avatar / Headshot Upload
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Customer photo for widget display
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={collectAvatar}
                    onChange={(e) => setCollectAvatar(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                </div>

                {/* Consent Disclosure */}
                <div className="rounded-xl border border-line p-4 space-y-3 bg-warm-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-ink-900 block">
                        Publishing Consent Checkbox
                      </span>
                      <span className="text-[11px] text-ink-500">
                        Explicit permission to display testimonials publicly
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentRequired}
                          disabled={!collectConsent}
                          onChange={(e) => setConsentRequired(e.target.checked)}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span>Required</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={collectConsent}
                        onChange={(e) => setCollectConsent(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {collectConsent && (
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                        Consent Text Wording
                      </label>
                      <textarea
                        rows={2}
                        value={consentText}
                        onChange={(e) => setConsentText(e.target.value)}
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CUSTOM QUESTIONS TAB */}
            {activeTab === "custom" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-500">
                    Add custom survey questions tailored to your product.
                  </p>

                  {/* Add Field Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddFieldMenuOpen(!addFieldMenuOpen)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Add Question</span>
                      <ChevronDown size={12} />
                    </button>

                    {addFieldMenuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-ink-400">
                          Select Question Type
                        </div>
                        <div className="space-y-0.5">
                          {customFieldTypeDefinitions.map((def) => {
                            const Icon = def.icon;
                            return (
                              <button
                                key={def.type}
                                type="button"
                                onClick={() => addCustomField(def.type)}
                                className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left hover:bg-warm-50 transition-colors"
                              >
                                <Icon size={14} className="text-brand-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="block text-xs font-semibold text-ink-900">
                                    {def.label}
                                  </span>
                                  <span className="block text-[10px] text-ink-400 leading-tight">
                                    {def.description}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {customFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-warm-50/50 p-8 text-center">
                    <Type size={28} className="mx-auto text-ink-300 mb-2" />
                    <h3 className="text-xs font-semibold text-ink-800 mb-1">
                      No custom questions yet
                    </h3>
                    <p className="text-[11px] text-ink-500 max-w-xs mx-auto mb-3">
                      Add custom text fields, dropdown choices, or extra star rating questions.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddFieldMenuOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100"
                    >
                      <Plus size={12} className="text-brand-600" />
                      <span>Add First Question</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field, index) => {
                      const typeDef = customFieldTypeDefinitions.find(
                        (d) => d.type === field.type,
                      );
                      const Icon = typeDef?.icon || Type;

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-line bg-white p-4 shadow-xs space-y-3"
                        >
                          {/* Field Header / Actions */}
                          <div className="flex items-center justify-between border-b border-line pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-brand-50 p-1 text-brand-600">
                                <Icon size={13} />
                              </span>
                              <span className="text-xs font-semibold text-ink-900">
                                #{index + 1} &bull; {typeDef?.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveField(index, "up")}
                                disabled={index === 0}
                                className="rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-warm-100 disabled:opacity-30"
                                title="Move up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveField(index, "down")}
                                disabled={index === customFields.length - 1}
                                className="rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-warm-100 disabled:opacity-30"
                                title="Move down"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteField(index)}
                                className="rounded p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete question"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Field Configuration Inputs */}
                          <div className="space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                Question Label *
                              </label>
                              <input
                                type="text"
                                required
                                value={field.label}
                                onChange={(e) =>
                                  updateCustomField(index, { label: e.target.value })
                                }
                                placeholder="e.g. What specific feature did you use most?"
                                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                  Help Text (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={field.description || ""}
                                  onChange={(e) =>
                                    updateCustomField(index, { description: e.target.value })
                                  }
                                  placeholder="Brief explanation..."
                                  className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                  Placeholder (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ""}
                                  onChange={(e) =>
                                    updateCustomField(index, { placeholder: e.target.value })
                                  }
                                  placeholder="Input hint..."
                                  className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900"
                                />
                              </div>
                            </div>

                            {/* Options editor for SINGLE_CHOICE / MULTIPLE_CHOICE */}
                            {(field.type === "SINGLE_CHOICE" ||
                              field.type === "MULTIPLE_CHOICE") && (
                              <div>
                                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                  Choices (Comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    field.optionsJson
                                      ? (() => {
                                          try {
                                            const p = JSON.parse(field.optionsJson);
                                            return Array.isArray(p) ? p.join(", ") : field.optionsJson;
                                          } catch {
                                            return field.optionsJson;
                                          }
                                        })()
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const opts = e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    updateCustomField(index, {
                                      optionsJson: JSON.stringify(opts),
                                    });
                                  }}
                                  placeholder="Option 1, Option 2, Option 3"
                                  className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900"
                                />
                                <p className="mt-1 text-[10px] text-ink-400">
                                  Separate each choice with a comma.
                                </p>
                              </div>
                            )}

                            {/* Required toggle */}
                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 text-xs text-ink-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.isRequired}
                                  onChange={(e) =>
                                    updateCustomField(index, { isRequired: e.target.checked })
                                  }
                                  className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                <span>Respondent must answer this question</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. APPEARANCE & BRANDING TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-ink-900 mb-1">
                    Form Branding &amp; Appearance
                  </h3>
                  <p className="text-[11px] text-ink-500 leading-relaxed">
                    Personalize the customer-facing review experience with your brand colors and custom logo.
                  </p>
                </div>

                {/* Custom Logo URL */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Custom Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.svg"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[10px] text-ink-400">
                    If left blank, the default Praise logo is displayed.
                  </p>
                </div>

                {/* Accent Color Customization */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-900">
                    Primary Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: "Praise Purple", hex: "#7049D8" },
                      { name: "Ocean Blue", hex: "#0284c7" },
                      { name: "Emerald Green", hex: "#059669" },
                      { name: "Amber Sun", hex: "#d97706" },
                      { name: "Rose Crimson", hex: "#e11d48" },
                      { name: "Midnight Slate", hex: "#334155" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setAccentColor(c.hex)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors",
                          accentColor.toLowerCase() === c.hex.toLowerCase()
                            ? "border-brand-500 bg-brand-50 text-ink-900 font-semibold"
                            : "border-line bg-white text-ink-600 hover:bg-warm-50",
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border border-line bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#7049D8"
                      className="w-32 rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900"
                    />
                    <span className="text-[11px] text-ink-500">Custom Hex Code</span>
                  </div>
                </div>

                {/* Theme Style */}
                <div className="space-y-2 pt-1 border-t border-line/60">
                  <label className="block text-xs font-semibold text-ink-900">
                    Background Theme Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "warm", label: "Warm Natural", desc: "Warm white tones" },
                      { id: "light", label: "Minimal Clean", desc: "Pure crisp white" },
                      { id: "dark", label: "Modern Dark", desc: "High contrast dark" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          theme === t.id
                            ? "border-brand-500 bg-brand-50/50 shadow-2xs"
                            : "border-line bg-white hover:bg-warm-50",
                        )}
                      >
                        <span className="block text-xs font-semibold text-ink-900">
                          {t.label}
                        </span>
                        <span className="block text-[10px] text-ink-500 mt-0.5">
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Live Interactive Preview (5 cols on lg, 7 cols on xl) */}
        <div className="lg:col-span-6 xl:col-span-7 h-full p-4 bg-warm-50/70 overflow-hidden flex flex-col">
          <FormPreview
            form={previewData}
            workspaceName={activeWorkspace?.name || "Praise"}
          />
        </div>
      </div>
    </div>
  );
}
