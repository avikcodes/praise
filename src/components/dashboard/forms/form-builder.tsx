"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  FileText,
  FileUp,
  GitFork,
  Globe,
  Hash,
  LayoutTemplate,
  ListFilter,
  Loader2,
  Mail,
  Mic,
  Package,
  Palette,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Type,
  UserCheck,
  Video,
} from "lucide-react";
import {
  CollectionFormDetail,
  FormCustomFieldType,
  FormFieldItem,
} from "@/types/form-builder";
import {
  PRESET_COMPANY_SIZES,
  PRESET_CUSTOMER_ROLES,
  PRESET_PRODUCT_PLANS,
} from "@/lib/forms/templates";
import { FormFlowConfig, createDefaultFlowConfig } from "@/lib/forms/flow-engine";
import { FormFlowEditor } from "@/components/dashboard/forms/form-flow-editor";
import { FormPreview } from "@/components/dashboard/forms/form-preview";
import { TemplateSelectorModal } from "@/components/dashboard/forms/template-selector-modal";
import { SaveTemplateModal } from "@/components/dashboard/forms/save-template-modal";
import { AdvancedFieldModal } from "@/components/dashboard/forms/advanced-field-modal";
import { sanitizeCss } from "@/lib/forms/css-sanitizer";
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
  icon: any;
  description: string;
}[] = [
  { type: "SHORT_TEXT", label: "Short Text", icon: Type, description: "Single-line text response" },
  { type: "LONG_TEXT", label: "Long Text", icon: FileText, description: "Multi-line paragraph answer" },
  { type: "LONG_FORM", label: "Long-Form Story", icon: FileText, description: "Extended paragraph for customer stories" },
  { type: "NUMBER", label: "Number", icon: Hash, description: "Quantifiable metrics, scores, or ratings" },
  { type: "PHONE", label: "Phone Number", icon: Phone, description: "Contact phone number with formatting" },
  { type: "DATE", label: "Date", icon: Calendar, description: "Purchase, event, or project completion date" },
  { type: "DROPDOWN", label: "Dropdown Select", icon: ChevronDown, description: "Single selection from a dropdown list" },
  { type: "SINGLE_CHOICE", label: "Single Choice", icon: Radio, description: "Select one option from a list" },
  { type: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: ListFilter, description: "Select multiple options with checkboxes" },
  { type: "FILE_UPLOAD", label: "File Attachment", icon: FileUp, description: "PDF, document, or image attachment" },
  { type: "WEBSITE", label: "Website URL", icon: Globe, description: "Web link, portfolio, or social profile URL" },
  { type: "CUSTOMER_ROLE", label: "Customer Role", icon: UserCheck, description: "Predefined organization role dropdown" },
  { type: "COMPANY_SIZE", label: "Company Size", icon: Building2, description: "B2B employee range selector" },
  { type: "PRODUCT_PLAN", label: "Product / Plan Tier", icon: Package, description: "Product model or subscription plan" },
  { type: "STAR_RATING", label: "Star Rating", icon: Star, description: "1 to 5 star rating question" },
  { type: "CHECKBOX", label: "Consent Checkbox", icon: CheckSquare, description: "Single toggle checkbox agreement" },
];

export function FormBuilder({
  initialForm,
  onSaveSuccess,
  onCancel,
}: FormBuilderProps) {
  const { activeWorkspace, projects } = useWorkspace();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    "general" | "standard" | "custom" | "flow" | "appearance"
  >("general");
  const [isSaving, setIsSaving] = useState(false);
  const [addFieldMenuOpen, setAddFieldMenuOpen] = useState(false);

  // Form Flow State (Multi-step & Conditional Branching)
  const [flowConfig, setFlowConfig] = useState<FormFlowConfig>(() => {
    if (initialForm?.flowConfigJson) {
      try {
        const parsed = JSON.parse(initialForm.flowConfigJson);
        return {
          ...parsed,
          enabled: initialForm.isMultiStep ?? parsed.enabled ?? false,
        };
      } catch {
        // fallback to default
      }
    }
    return {
      ...createDefaultFlowConfig(),
      enabled: initialForm?.isMultiStep ?? false,
    };
  });

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
  const [videoInstructions, setVideoInstructions] = useState<string>(
    initialForm?.videoInstructions || "",
  );
  const [recordingQuestions, setRecordingQuestions] = useState<
    { id: string; text: string }[]
  >(() => {
    if (initialForm?.recordingQuestionsJson) {
      try {
        const parsed = JSON.parse(initialForm.recordingQuestionsJson);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            id: item.id || `rq_${idx}_${Date.now()}`,
            text: typeof item === "string" ? item : item.text || "",
          }));
        }
      } catch {
        // ignore
      }
    }
    return [
      { id: "rq_1", text: "Who are you and what company or role do you represent?" },
      { id: "rq_2", text: "What specific challenge were you looking to solve?" },
      { id: "rq_3", text: "What measurable results have you achieved?" },
    ];
  });
  const [newQuestionInput, setNewQuestionInput] = useState<string>("");
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
  const [customCss, setCustomCss] = useState(initialForm?.customCss || "");

  // Modal Dialogs State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [editingFieldModalIndex, setEditingFieldModalIndex] = useState<number | null>(null);

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
    let optionsJson: string | null = null;
    let validationRulesJson: string | null = null;
    let helpText: string | null = null;
    let placeholder = "Your response here...";

    if (type === "CHECKBOX") {
      placeholder = "I agree to the terms above";
    } else if (
      type === "SINGLE_CHOICE" ||
      type === "MULTIPLE_CHOICE" ||
      type === "DROPDOWN"
    ) {
      placeholder = "Select an option...";
      optionsJson = JSON.stringify(["Option A", "Option B", "Option C"]);
    } else if (type === "CUSTOMER_ROLE") {
      placeholder = "Select your role...";
      helpText = "Choose the option matching your responsibility.";
      optionsJson = JSON.stringify(PRESET_CUSTOMER_ROLES);
    } else if (type === "COMPANY_SIZE") {
      placeholder = "Select company size...";
      helpText = "Approximate team size across your organization.";
      optionsJson = JSON.stringify(PRESET_COMPANY_SIZES);
    } else if (type === "PRODUCT_PLAN") {
      placeholder = "Select product tier...";
      helpText = "Active edition or subscription tier.";
      optionsJson = JSON.stringify(PRESET_PRODUCT_PLANS);
    } else if (type === "NUMBER") {
      placeholder = "e.g. 42";
      helpText = "Enter a numeric value.";
      validationRulesJson = JSON.stringify({ minNumber: 0 });
    } else if (type === "PHONE") {
      placeholder = "+1 (555) 000-0000";
      helpText = "We will never share your phone number.";
    } else if (type === "DATE") {
      placeholder = "YYYY-MM-DD";
      helpText = "Select the relevant date.";
    } else if (type === "FILE_UPLOAD") {
      placeholder = "Choose attachment...";
      helpText = "Document or image file (up to 10MB).";
      validationRulesJson = JSON.stringify({
        maxFileSizeMb: 10,
        allowedExtensions: ["pdf", "docx", "png", "jpg"],
      });
    } else if (type === "WEBSITE") {
      placeholder = "https://yourcompany.com";
      helpText = "Website or social profile link.";
    } else if (type === "LONG_FORM") {
      placeholder = "Share your detailed story and results...";
      helpText = "Provide an in-depth testimonial response.";
    }

    const newField: FormFieldItem = {
      label: `New ${typeDef?.label || "Question"}`,
      description: "",
      helpText,
      placeholder,
      type,
      isRequired: false,
      orderIndex: customFields.length,
      optionsJson,
      validationRulesJson,
    };
    setCustomFields((prev) => [...prev, newField]);
    setAddFieldMenuOpen(false);
    setActiveTab("custom");
  };

  const handleApplyTemplate = (config: any) => {
    if (config.title) setTitle(config.title);
    if (config.headerPrompt) setHeaderPrompt(config.headerPrompt);
    if (config.description !== undefined) setDescription(config.description || "");
    if (config.thankYouMessage !== undefined)
      setThankYouMessage(config.thankYouMessage || "");
    if (config.allowVideo !== undefined) setAllowVideo(config.allowVideo);
    if (config.allowAudio !== undefined) setAllowAudio(config.allowAudio);
    if (config.allowText !== undefined) setAllowText(config.allowText);
    if (config.collectName !== undefined) setCollectName(config.collectName);
    if (config.nameRequired !== undefined) setNameRequired(config.nameRequired);
    if (config.collectEmail !== undefined) setCollectEmail(config.collectEmail);
    if (config.emailRequired !== undefined) setEmailRequired(config.emailRequired);
    if (config.collectCompany !== undefined) setCollectCompany(config.collectCompany);
    if (config.companyRequired !== undefined)
      setCompanyRequired(config.companyRequired);
    if (config.collectJobTitle !== undefined)
      setCollectJobTitle(config.collectJobTitle);
    if (config.jobTitleRequired !== undefined)
      setJobTitleRequired(config.jobTitleRequired);
    if (config.collectWebsite !== undefined)
      setCollectWebsite(config.collectWebsite);
    if (config.websiteRequired !== undefined)
      setWebsiteRequired(config.websiteRequired);
    if (config.collectRating !== undefined) setCollectRating(config.collectRating);
    if (config.ratingRequired !== undefined)
      setRatingRequired(config.ratingRequired);
    if (config.collectText !== undefined) setCollectText(config.collectText);
    if (config.textRequired !== undefined) setTextRequired(config.textRequired);
    if (config.collectAvatar !== undefined) setCollectAvatar(config.collectAvatar);
    if (config.collectConsent !== undefined) setCollectConsent(config.collectConsent);
    if (config.consentRequired !== undefined)
      setConsentRequired(config.consentRequired);
    if (config.consentText) setConsentText(config.consentText);
    if (config.accentColor) setAccentColor(config.accentColor);
    if (config.theme) setTheme(config.theme);
    if (config.customCss !== undefined) setCustomCss(config.customCss || "");
    if (config.fields && Array.isArray(config.fields)) {
      setCustomFields(
        config.fields.map((f: any, idx: number) => ({
          ...f,
          orderIndex: idx,
        }))
      );
    }
  };

  const handleRestoreDefaultStyling = () => {
    setCustomCss("");
    setAccentColor("#7049D8");
    setTheme("warm");
    toast.success(
      "Default Styling Restored",
      "Custom CSS and theme styling reset to default."
    );
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

  // Guided Video Recording Questions Management
  const addRecordingQuestion = () => {
    if (!newQuestionInput.trim()) return;
    setRecordingQuestions((prev) => [
      ...prev,
      { id: `rq_${Date.now()}_${prev.length + 1}`, text: newQuestionInput.trim() },
    ]);
    setNewQuestionInput("");
  };

  const removeRecordingQuestion = (index: number) => {
    setRecordingQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRecordingQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === recordingQuestions.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...recordingQuestions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setRecordingQuestions(reordered);
  };

  const updateRecordingQuestionText = (index: number, newText: string) => {
    setRecordingQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text: newText } : q)),
    );
  };

  const loadPresetQuestions = (type: "saas" | "case_study" | "clear") => {
    if (type === "saas") {
      setRecordingQuestions([
        { id: `rq_${Date.now()}_1`, text: "Who are you and what company do you represent?" },
        { id: `rq_${Date.now()}_2`, text: "What specific challenge were you looking to solve?" },
        { id: `rq_${Date.now()}_3`, text: "What results or measurable outcome have you achieved?" },
      ]);
    } else if (type === "case_study") {
      setRecordingQuestions([
        { id: `rq_${Date.now()}_1`, text: "What was your workflow like before using our product?" },
        { id: `rq_${Date.now()}_2`, text: "What was your primary hesitation before signing up?" },
        { id: `rq_${Date.now()}_3`, text: "What feature or aspect surprised you the most?" },
        { id: `rq_${Date.now()}_4`, text: "What would you tell someone on the fence about trying it?" },
      ]);
    } else {
      setRecordingQuestions([]);
    }
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
      isMultiStep: Boolean(flowConfig.enabled),
      flowConfigJson: flowConfig.enabled ? JSON.stringify(flowConfig) : null,
      customCss: customCss.trim() || undefined,
      videoInstructions: videoInstructions.trim() || undefined,
      recordingQuestionsJson:
        recordingQuestions.length > 0 ? JSON.stringify(recordingQuestions) : null,
      fields: customFields.map((f, idx) => ({
        id: f.id,
        label: f.label.trim() || `Question ${idx + 1}`,
        description: f.description?.trim() || null,
        helpText: f.helpText?.trim() || null,
        placeholder: f.placeholder?.trim() || null,
        type: f.type,
        isRequired: f.isRequired,
        orderIndex: f.orderIndex ?? idx,
        optionsJson: f.optionsJson || null,
        conditionsJson: f.conditionsJson || null,
        validationRulesJson: f.validationRulesJson || null,
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
    isMultiStep: Boolean(flowConfig.enabled),
    flowConfigJson: flowConfig.enabled ? JSON.stringify(flowConfig) : null,
    customCss,
    videoInstructions,
    recordingQuestionsJson:
      recordingQuestions.length > 0 ? JSON.stringify(recordingQuestions) : null,
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            title="Choose from pre-built templates"
          >
            <LayoutTemplate size={13} className="text-brand-600" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setSaveTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            title="Save current form layout as a reusable template"
          >
            <Bookmark size={13} className="text-amber-600" />
            <span className="hidden sm:inline">Save as Template</span>
          </button>

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
              onClick={() => setActiveTab("flow")}
              className={cn(
                "rounded-t-lg px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5",
                activeTab === "flow"
                  ? "bg-white text-ink-900 border-t border-x border-line shadow-2xs -mb-px"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              <GitFork size={13} />
              <span>Form Flow</span>
              {flowConfig.enabled && (
                <span className="rounded-full bg-brand-100 text-brand-700 px-1.5 py-0.5 text-[9px] font-bold">
                  Multi-Step
                </span>
              )}
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
                    <div className="pt-3 border-t border-line/70 space-y-4">
                      {/* Max Duration Controls */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-ink-900">
                            Maximum Recording Duration
                          </label>
                          <span className="text-[10px] text-ink-500 font-mono">
                            {maxVideoDurationSeconds} seconds
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[60, 120, 180, 300].map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => setMaxVideoDurationSeconds(dur)}
                              className={cn(
                                "flex-1 rounded-lg py-1 px-2 text-[11px] font-semibold transition-colors border",
                                maxVideoDurationSeconds === dur
                                  ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs"
                                  : "bg-white border-line text-ink-700 hover:bg-warm-50",
                              )}
                            >
                              {dur}s
                            </button>
                          ))}
                          <div className="w-20">
                            <input
                              type="number"
                              min={15}
                              max={300}
                              value={maxVideoDurationSeconds}
                              onChange={(e) => setMaxVideoDurationSeconds(Number(e.target.value))}
                              className="w-full rounded-lg border border-line p-1 text-[11px] text-center text-ink-900"
                              title="Custom seconds"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Custom Pre-Recording Instructions */}
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-900 mb-1">
                          Custom Pre-Recording Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={videoInstructions}
                          onChange={(e) => setVideoInstructions(e.target.value)}
                          placeholder="e.g. Please find a quiet place with good lighting. Speak naturally from the heart and don't worry about being perfect!"
                          className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                        />
                        <p className="mt-1 text-[10px] text-ink-500">
                          Displayed to respondents before recording begins to help them prepare.
                        </p>
                      </div>

                      {/* Configurable Recording Questions (Teleprompter Prompts) */}
                      <div className="space-y-2 pt-2 border-t border-line/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-ink-900 flex items-center gap-1.5">
                            <Video size={12} className="text-brand-600" />
                            <span>Guided Recording Questions ({recordingQuestions.length})</span>
                          </label>
                          <div className="flex items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => loadPresetQuestions("saas")}
                              className="text-brand-600 hover:underline"
                            >
                              SaaS Preset
                            </button>
                            <span className="text-ink-300">&bull;</span>
                            <button
                              type="button"
                              onClick={() => loadPresetQuestions("case_study")}
                              className="text-brand-600 hover:underline"
                            >
                              Case Study
                            </button>
                            <span className="text-ink-300">&bull;</span>
                            <button
                              type="button"
                              onClick={() => loadPresetQuestions("clear")}
                              className="text-ink-400 hover:text-rose-600"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-ink-500 leading-normal">
                          Shown as an interactive live teleprompter during recording so respondents can glance at questions without looking away.
                        </p>

                        {/* Questions List with Reordering */}
                        <div className="space-y-1.5">
                          {recordingQuestions.map((q, idx) => (
                            <div
                              key={q.id || idx}
                              className="flex items-center gap-1.5 rounded-lg border border-line bg-white p-1.5 shadow-2xs"
                            >
                              <span className="h-4 w-4 rounded-full bg-warm-100 text-ink-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={q.text}
                                onChange={(e) => updateRecordingQuestionText(idx, e.target.value)}
                                className="flex-1 text-xs text-ink-900 bg-transparent focus:outline-none"
                                placeholder={`Question ${idx + 1}...`}
                              />
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveRecordingQuestion(idx, "up")}
                                  className="p-1 text-ink-400 hover:text-ink-800 disabled:opacity-20 transition-colors"
                                  title="Move Up"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === recordingQuestions.length - 1}
                                  onClick={() => moveRecordingQuestion(idx, "down")}
                                  className="p-1 text-ink-400 hover:text-ink-800 disabled:opacity-20 transition-colors"
                                  title="Move Down"
                                >
                                  <ArrowDown size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRecordingQuestion(idx)}
                                  className="p-1 text-ink-400 hover:text-rose-600 transition-colors ml-0.5"
                                  title="Remove question"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Question Input */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            value={newQuestionInput}
                            onChange={(e) => setNewQuestionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addRecordingQuestion();
                              }
                            }}
                            placeholder="Add a new guided prompt..."
                            className="flex-1 rounded-lg border border-line p-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={addRecordingQuestion}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors shrink-0"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
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
                              {field.validationRulesJson && (
                                <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[9px] font-semibold border border-amber-200">
                                  Rules Active
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingFieldModalIndex(index)}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-ink-700 hover:text-brand-600 hover:border-brand-300 transition-colors mr-1"
                                title="Configure advanced field rules & validation"
                              >
                                <Sliders size={11} className="text-brand-600" />
                                <span>Advanced</span>
                              </button>
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

                            <div>
                              <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                Contextual Help Text (Optional)
                              </label>
                              <input
                                type="text"
                                value={field.helpText || ""}
                                onChange={(e) =>
                                  updateCustomField(index, { helpText: e.target.value })
                                }
                                placeholder="Subtle guidance displayed beneath the input..."
                                className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                                  Secondary Description (Optional)
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

                            {/* Options editor for choice / dropdown fields */}
                            {(field.type === "SINGLE_CHOICE" ||
                              field.type === "MULTIPLE_CHOICE" ||
                              field.type === "DROPDOWN" ||
                              field.type === "CUSTOMER_ROLE" ||
                              field.type === "COMPANY_SIZE" ||
                              field.type === "PRODUCT_PLAN") && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-semibold text-ink-800">
                                    Configured Choices (Comma-separated)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setEditingFieldModalIndex(index)}
                                    className="text-[10px] text-brand-600 hover:underline font-semibold"
                                  >
                                    Edit via Advanced Modal &rarr;
                                  </button>
                                </div>
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

            {/* 4. FORM FLOW & CONDITIONAL LOGIC TAB */}
            {activeTab === "flow" && (
              <FormFlowEditor
                flowConfig={flowConfig}
                onChange={setFlowConfig}
                availableCustomFields={customFields}
                accentColor={accentColor}
              />
            )}

            {/* 5. APPEARANCE & BRANDING TAB */}
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

                {/* Form-Level Custom CSS */}
                <div className="space-y-2.5 pt-3 border-t border-line/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-ink-900">
                        Form-Level Custom CSS
                      </label>
                      <span className="text-[10px] text-ink-500">
                        Scoped automatically to <code>.praise-form-scope</code>. Scripts and unsafe HTML are sanitized.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRestoreDefaultStyling}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-600 hover:text-rose-600 transition-colors"
                      title="Reset custom CSS and theme styles to system default"
                    >
                      <RotateCcw size={12} />
                      <span>Restore Default Styling</span>
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder={`.praise-form-scope .praise-card {\n  border-radius: 20px;\n}\n.praise-form-scope button {\n  font-weight: 700;\n}`}
                    className="w-full rounded-xl border border-line bg-ink-900 text-amber-300 font-mono text-[11px] p-3 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed placeholder:text-ink-600"
                  />

                  {sanitizeCss(customCss).warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertCircle size={12} className="text-amber-600" />
                        <span>Restricted CSS Constructs Detected</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                        {sanitizeCss(customCss).warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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

      {/* Template Selector Modal */}
      {templateModalOpen && activeWorkspace?.id && (
        <TemplateSelectorModal
          isOpen={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          workspaceId={activeWorkspace.id}
          onSelectTemplate={handleApplyTemplate}
        />
      )}

      {/* Save Current Form As Template Modal */}
      {saveTemplateModalOpen && activeWorkspace?.id && (
        <SaveTemplateModal
          isOpen={saveTemplateModalOpen}
          onClose={() => setSaveTemplateModalOpen(false)}
          workspaceId={activeWorkspace.id}
          formConfigPayload={previewData}
        />
      )}

      {/* Advanced Field Modal */}
      {editingFieldModalIndex !== null && customFields[editingFieldModalIndex] && (
        <AdvancedFieldModal
          isOpen={editingFieldModalIndex !== null}
          onClose={() => setEditingFieldModalIndex(null)}
          field={customFields[editingFieldModalIndex]}
          fieldIndex={editingFieldModalIndex}
          totalFields={customFields.length}
          onSave={(updatedField) => {
            updateCustomField(editingFieldModalIndex, updatedField);
            setEditingFieldModalIndex(null);
          }}
        />
      )}
    </div>
  );
}
