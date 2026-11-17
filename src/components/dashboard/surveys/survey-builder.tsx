"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  HelpCircle,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Minus,
  Monitor,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Sliders,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  SurveyDetail,
  SurveyType,
  SurveyStatus,
  FollowUpQuestion,
  FollowUpQuestionType,
  ScoringConfig,
} from "@/types/surveys";
import { SURVEY_TEMPLATES } from "@/lib/surveys/templates";
import { SurveyCard } from "@/components/surveys/survey-card";
import { RoutingRuleBuilder } from "@/components/dashboard/surveys/routing-rule-builder";
import { useToast } from "@/components/dashboard/toast-context";
import { cn } from "@/lib/utils";

interface SurveyBuilderProps {
  workspaceId: string;
  initialSurvey?: SurveyDetail | null;
  onBack: () => void;
  onSaved: (survey: SurveyDetail) => void;
}

const PRESET_ACCENTS = [
  "#7049D8", // Praise Violet
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#0F172A", // Slate Dark
];

const THEME_OPTIONS = [
  { id: "warm", name: "Warm Zinc", description: "Default editorial styling with soft warm tones" },
  { id: "light", name: "Crisp Light", description: "Ultra-clean white backdrop with modern slate borders" },
  { id: "dark", name: "Deep Dark", description: "Sleek dark mode with high contrast cards" },
  { id: "minimal", name: "Monochrome Minimal", description: "High-contrast black & white typography" },
  { id: "midnight", name: "Midnight Indigo", description: "Atmospheric navy & indigo backdrop with subtle glow" },
  { id: "emerald", name: "Fresh Emerald", description: "Organic green hues, perfect for eco & growth brands" },
];

export function SurveyBuilder({
  workspaceId,
  initialSurvey,
  onBack,
  onSaved,
}: SurveyBuilderProps) {
  const toast = useToast();

  // Primary configuration state
  const [title, setTitle] = useState(initialSurvey?.title || "Customer Feedback Survey");
  const [slug, setSlug] = useState(initialSurvey?.slug || "customer-feedback");
  const [description, setDescription] = useState(initialSurvey?.description || "");
  const [type, setType] = useState<SurveyType>(initialSurvey?.type || "NPS");
  const [status, setStatus] = useState<SurveyStatus>(initialSurvey?.status || "ACTIVE");

  // Introductory & prompt content
  const [welcomeHeading, setWelcomeHeading] = useState(
    initialSurvey?.welcomeHeading ?? "We value your honest feedback"
  );
  const [welcomeText, setWelcomeText] = useState(
    initialSurvey?.welcomeText ?? "Takes less than 60 seconds. Your feedback helps us build a better product."
  );
  const [primaryPrompt, setPrimaryPrompt] = useState(
    initialSurvey?.primaryPrompt || "How likely are you to recommend us to a friend or colleague?"
  );
  const [feedbackPrompt, setFeedbackPrompt] = useState(
    initialSurvey?.feedbackPrompt || "What is the primary reason for your score?"
  );
  const [feedbackRequired, setFeedbackRequired] = useState(initialSurvey?.feedbackRequired || false);

  // Thank you screen & redirect
  const [thankYouHeading, setThankYouHeading] = useState(
    initialSurvey?.thankYouHeading || "Thank you for your feedback!"
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    initialSurvey?.thankYouMessage || "Your response helps us improve our product and service."
  );
  const [redirectUrl, setRedirectUrl] = useState(initialSurvey?.redirectUrl || "");

  // Branding & Appearance
  const [accentColor, setAccentColor] = useState(initialSurvey?.accentColor || "#7049D8");
  const [theme, setTheme] = useState(initialSurvey?.theme || "warm");
  const [customLogoUrl, setCustomLogoUrl] = useState(initialSurvey?.customLogoUrl || "");
  const [showBranding, setShowBranding] = useState(initialSurvey?.showBranding ?? true);

  // Scoring labels
  const [minLabel, setMinLabel] = useState(initialSurvey?.scoringConfig?.minLabel || "");
  const [maxLabel, setMaxLabel] = useState(initialSurvey?.scoringConfig?.maxLabel || "");
  const [midLabel, setMidLabel] = useState(initialSurvey?.scoringConfig?.midLabel || "");

  // Respondent Info Collection
  const [collectName, setCollectName] = useState(initialSurvey?.collectName || false);
  const [nameRequired, setNameRequired] = useState(initialSurvey?.nameRequired || false);
  const [collectEmail, setCollectEmail] = useState(initialSurvey?.collectEmail || false);
  const [emailRequired, setEmailRequired] = useState(initialSurvey?.emailRequired || false);
  const [collectCompany, setCollectCompany] = useState(initialSurvey?.collectCompany || false);
  const [companyRequired, setCompanyRequired] = useState(initialSurvey?.companyRequired || false);

  // Custom follow-up questions
  const [questions, setQuestions] = useState<FollowUpQuestion[]>(
    initialSurvey?.questions || [
      {
        id: "q-1",
        label: "What could we do to improve your experience?",
        placeholder: "Tell us what would make this a 10/10 experience...",
        type: "LONG_TEXT",
        isRequired: false,
        orderIndex: 0,
      },
    ]
  );

  // Active UI Tabs
  const [activeTab, setActiveTab] = useState<
    "basics" | "questions" | "followups" | "respondent" | "appearance" | "routing"
  >("basics");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Load a prebuilt template
  const handleApplyTemplate = (tpl: typeof SURVEY_TEMPLATES[0]) => {
    setType(tpl.type);
    setTitle(tpl.name);
    setPrimaryPrompt(tpl.primaryPrompt);
    setFeedbackPrompt(tpl.feedbackPrompt);
    setWelcomeHeading(tpl.welcomeHeading);
    setWelcomeText(tpl.welcomeText);
    setThankYouHeading(tpl.thankYouHeading);
    setThankYouMessage(tpl.thankYouMessage);
    setAccentColor(tpl.accentColor);
    setTheme(tpl.theme);
    setMinLabel(tpl.scoringConfig?.minLabel || "");
    setMaxLabel(tpl.scoringConfig?.maxLabel || "");
    setMidLabel(tpl.scoringConfig?.midLabel || "");

    const newQuestions: FollowUpQuestion[] = tpl.questions.map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      label: q.label,
      description: q.description,
      placeholder: q.placeholder,
      type: q.type,
      isRequired: q.isRequired,
      options: q.options ? [...q.options] : undefined,
      minRating: q.minRating,
      maxRating: q.maxRating,
      orderIndex: idx,
    }));
    setQuestions(newQuestions);
    setShowTemplateModal(false);
    toast.success("Template Applied", `Loaded ${tpl.name} template.`);
  };

  // Follow-up question actions
  const handleAddQuestion = () => {
    const newQ: FollowUpQuestion = {
      id: `q-${Date.now()}`,
      label: "New follow-up question",
      type: "TEXT",
      isRequired: false,
      orderIndex: questions.length,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<FollowUpQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setQuestions(reordered.map((q, i) => ({ ...q, orderIndex: i })));
  };

  // Construct current preview survey object
  const previewSurvey: Partial<SurveyDetail> = useMemo(() => {
    return {
      title,
      slug,
      type,
      status,
      welcomeHeading,
      welcomeText,
      primaryPrompt,
      feedbackPrompt,
      feedbackRequired,
      thankYouHeading,
      thankYouMessage,
      redirectUrl,
      accentColor,
      theme,
      customLogoUrl: customLogoUrl.trim() || null,
      showBranding,
      collectName,
      nameRequired,
      collectEmail,
      emailRequired,
      collectCompany,
      companyRequired,
      questions,
      scoringConfig: {
        minLabel: minLabel || undefined,
        maxLabel: maxLabel || undefined,
        midLabel: midLabel || undefined,
      },
    };
  }, [
    title,
    slug,
    type,
    status,
    welcomeHeading,
    welcomeText,
    primaryPrompt,
    feedbackPrompt,
    feedbackRequired,
    thankYouHeading,
    thankYouMessage,
    redirectUrl,
    accentColor,
    theme,
    customLogoUrl,
    showBranding,
    collectName,
    nameRequired,
    collectEmail,
    emailRequired,
    collectCompany,
    companyRequired,
    questions,
    minLabel,
    maxLabel,
    midLabel,
  ]);

  // Save handler (create or update)
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Missing Title", "Please enter a title for this survey.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        type,
        status,
        welcomeHeading: welcomeHeading.trim() || null,
        welcomeText: welcomeText.trim() || null,
        primaryPrompt: primaryPrompt.trim(),
        feedbackPrompt: feedbackPrompt.trim() || null,
        feedbackRequired,
        thankYouHeading: thankYouHeading.trim() || null,
        thankYouMessage: thankYouMessage.trim() || null,
        redirectUrl: redirectUrl.trim() || null,
        accentColor,
        theme,
        customLogoUrl: customLogoUrl.trim() || null,
        showBranding,
        collectName,
        nameRequired,
        collectEmail,
        emailRequired,
        collectCompany,
        companyRequired,
        questions,
        scoringConfig: {
          minLabel: minLabel || undefined,
          maxLabel: maxLabel || undefined,
          midLabel: midLabel || undefined,
        },
      };

      const isEdit = Boolean(initialSurvey?.id);
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/surveys/${initialSurvey?.id}`
        : `/api/workspaces/${workspaceId}/surveys`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save survey.");
      }

      toast.success(
        isEdit ? "Survey Updated" : "Survey Created",
        `"${data.survey.title}" is ready.`
      );
      onSaved(data.survey);
    } catch (err: any) {
      toast.error("Save Error", err?.message || "Could not save survey.");
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${slug}` : `/s/${slug}`;
  const embedCode = `<iframe\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/survey/${initialSurvey?.id || slug}"\n  width="100%"\n  height="650"\n  frameborder="0"\n  style="border: 0; max-width: 600px; width: 100%;"\n  title="${title}"\n></iframe>`;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* =================================================================== */}
      {/* TOP HEADER BAR */}
      {/* =================================================================== */}
      <div className="h-14 border-b border-line px-4 sm:px-6 flex items-center justify-between gap-4 bg-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors shrink-0"
            aria-label="Back to surveys"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate">
                {title || "Untitled Survey"}
              </h2>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                  status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "PAUSED"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : status === "CLOSED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                )}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] text-ink-500 truncate hidden sm:block">
              {type === "NPS"
                ? "Net Promoter Score (0-10)"
                : type === "CSAT"
                ? "Customer Satisfaction (1-5)"
                : type === "CES"
                ? "Customer Effort Score (1-7)"
                : "Five-Star Rating Review"}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
          >
            <Sparkles size={13} className="text-brand-600" />
            <span>Templates</span>
          </button>

          {initialSurvey?.id && (
            <button
              type="button"
              onClick={() => setShowEmbedModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            >
              <Code2 size={13} />
              <span className="hidden sm:inline">Embed Code</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>Save Survey</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN DUAL-PANE WORKSPACE */}
      {/* =================================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: CONFIGURATION CONTROLS */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 xl:col-span-5 border-r border-line flex flex-col h-full bg-white z-10 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex border-b border-line bg-warm-50 px-3 pt-2 shrink-0 gap-1 overflow-x-auto">
            {[
              { id: "basics", label: "Basics & Type", icon: LayoutGrid },
              { id: "questions", label: "Primary Score", icon: Star },
              { id: "followups", label: `Follow-ups (${questions.length})`, icon: MessageSquare },
              { id: "respondent", label: "Respondent Info", icon: UserCheck },
              { id: "appearance", label: "Style & Thank You", icon: Palette },
              { id: "routing", label: "Feedback Routing", icon: Sliders },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-brand-600 text-brand-700 bg-white rounded-t-lg shadow-2xs font-bold"
                      : "border-transparent text-ink-600 hover:text-ink-900"
                  )}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: BASICS & SURVEY TYPE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "basics" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Survey Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q4 Customer Satisfaction Pulse"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Public URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-lg border border-line bg-warm-50 px-3 py-1.5 text-xs">
                    <span className="text-ink-400 font-mono">/s/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^\w-]/g, "-")
                        )
                      }
                      placeholder="customer-feedback"
                      className="flex-1 bg-transparent text-xs text-ink-900 font-mono outline-none pl-1"
                    />
                  </div>
                  <p className="text-[11px] text-ink-500">
                    Your public link:{" "}
                    <span className="font-mono text-brand-600">{publicUrl}</span>
                  </p>
                </div>

                {/* Survey Type Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink-800">
                    Survey Scoring Methodology
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        type: "NPS" as SurveyType,
                        name: "NPS (0–10)",
                        desc: "Standard 0 to 10 recommendation score with promoter & detractor segmentation.",
                      },
                      {
                        type: "CSAT" as SurveyType,
                        name: "CSAT (1–5)",
                        desc: "5-point satisfaction rating with intuitive emoji feedback.",
                      },
                      {
                        type: "CES" as SurveyType,
                        name: "CES (1–7)",
                        desc: "Customer effort score assessing task and resolution friction.",
                      },
                      {
                        type: "FIVE_STAR" as SurveyType,
                        name: "Five-Star Rating",
                        desc: "Classic 1 to 5 star rating ideal for reviews and testimonials.",
                      },
                    ].map((item) => {
                      const isSelected = type === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setType(item.type);
                            if (item.type === "NPS") {
                              setPrimaryPrompt("How likely are you to recommend us to a friend or colleague?");
                              setMinLabel("Not likely at all");
                              setMaxLabel("Extremely likely");
                            } else if (item.type === "CSAT") {
                              setPrimaryPrompt("How satisfied are you with your overall experience?");
                              setMinLabel("Very Dissatisfied");
                              setMaxLabel("Very Satisfied");
                            } else if (item.type === "CES") {
                              setPrimaryPrompt("The company made it easy for me to handle my issue.");
                              setMinLabel("Strongly Disagree");
                              setMaxLabel("Strongly Agree");
                            } else if (item.type === "FIVE_STAR") {
                              setPrimaryPrompt("How would you rate your experience with our product?");
                              setMinLabel("1 Star");
                              setMaxLabel("5 Stars");
                            }
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1",
                            isSelected
                              ? "border-brand-500 bg-brand-50/50 shadow-2xs ring-1 ring-brand-500"
                              : "border-line bg-white hover:border-ink-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-ink-900">{item.name}</span>
                            {isSelected && <Check size={14} className="text-brand-600" />}
                          </div>
                          <p className="text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Survey Status Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Survey Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "ACTIVE", label: "Active", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                      { id: "DRAFT", label: "Draft", color: "text-zinc-700 bg-zinc-50 border-zinc-200" },
                      { id: "PAUSED", label: "Paused", color: "text-amber-700 bg-amber-50 border-amber-200" },
                      { id: "CLOSED", label: "Closed", color: "text-rose-700 bg-rose-50 border-rose-200" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatus(s.id as SurveyStatus)}
                        className={cn(
                          "py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-all",
                          status === s.id
                            ? cn(s.color, "ring-2 ring-brand-500 font-bold")
                            : "border-line bg-white text-ink-600 hover:bg-warm-50"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Internal Description / Purpose (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notes for your team about this survey campaign..."
                    rows={2}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: PRIMARY PROMPT & SCORING */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "questions" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Welcome Heading (Introductory)
                  </label>
                  <input
                    type="text"
                    value={welcomeHeading}
                    onChange={(e) => setWelcomeHeading(e.target.value)}
                    placeholder="e.g. We value your honest feedback"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Welcome Subtitle / Instructions
                  </label>
                  <textarea
                    value={welcomeText}
                    onChange={(e) => setWelcomeText(e.target.value)}
                    placeholder="Takes less than 60 seconds..."
                    rows={2}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-line">
                  <label className="block text-xs font-bold text-ink-800">
                    Primary Question Prompt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={primaryPrompt}
                    onChange={(e) => setPrimaryPrompt(e.target.value)}
                    placeholder="How likely are you to recommend us?"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                {/* Scale endpoint labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Lowest Rating Label (Left)
                    </label>
                    <input
                      type="text"
                      value={minLabel}
                      onChange={(e) => setMinLabel(e.target.value)}
                      placeholder="e.g. Not likely at all"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Highest Rating Label (Right)
                    </label>
                    <input
                      type="text"
                      value={maxLabel}
                      onChange={(e) => setMaxLabel(e.target.value)}
                      placeholder="e.g. Extremely likely"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Written feedback prompt */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-ink-800">
                      Written Feedback Prompt
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-ink-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedbackRequired}
                        onChange={(e) => setFeedbackRequired(e.target.checked)}
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>Make Required</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={feedbackPrompt}
                    onChange={(e) => setFeedbackPrompt(e.target.value)}
                    placeholder="What is the primary reason for your score?"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-ink-500">
                    Provides an open-ended comment box immediately following the score selection.
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: CUSTOM FOLLOW-UP QUESTIONS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "followups" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-ink-900">Custom Follow-Up Questions</h3>
                    <p className="text-[11px] text-ink-500">
                      Add targeted questions tailored to customer responses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-500">
                    No custom follow-up questions yet. Click &quot;Add Question&quot; above to create one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-line bg-warm-50/40 p-3.5 space-y-3 transition-all hover:border-ink-300"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                            Question {idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                              title="Move Up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, "down")}
                              disabled={idx === questions.length - 1}
                              className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                              title="Move Down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                              title="Delete Question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Question label input */}
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={q.label}
                            onChange={(e) => handleUpdateQuestion(q.id, { label: e.target.value })}
                            placeholder="Question label / prompt..."
                            className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 font-semibold outline-none focus:border-brand-500"
                          />
                        </div>

                        {/* Question Type & Required Toggle */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={q.type}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, {
                                  type: e.target.value as FollowUpQuestionType,
                                  options:
                                    e.target.value === "SINGLE_CHOICE" ||
                                    e.target.value === "MULTIPLE_CHOICE" ||
                                    e.target.value === "DROPDOWN"
                                      ? q.options || ["Option 1", "Option 2", "Option 3"]
                                      : undefined,
                                })
                              }
                              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-800 outline-none"
                            >
                              <option value="TEXT">Short Text</option>
                              <option value="LONG_TEXT">Long Text / Paragraph</option>
                              <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                              <option value="MULTIPLE_CHOICE">Multiple Choice (Checkboxes)</option>
                              <option value="RATING">Rating (1 to 5)</option>
                              <option value="BOOLEAN">Yes / No Toggle</option>
                              <option value="DROPDOWN">Dropdown Menu</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-end">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.isRequired}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, { isRequired: e.target.checked })
                                }
                                className="rounded border-line text-brand-600 focus:ring-brand-500"
                              />
                              <span>Required Field</span>
                            </label>
                          </div>
                        </div>

                        {/* Options editor for choice / dropdown types */}
                        {(q.type === "SINGLE_CHOICE" ||
                          q.type === "MULTIPLE_CHOICE" ||
                          q.type === "DROPDOWN") && (
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[10px] font-bold text-ink-600 uppercase">
                              Choices (one per line)
                            </label>
                            <textarea
                              value={(q.options || []).join("\n")}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, {
                                  options: e.target.value
                                    .split("\n")
                                    .filter((s) => s.trim().length > 0),
                                })
                              }
                              rows={3}
                              className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 font-mono outline-none"
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: RESPONDENT INFORMATION */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "respondent" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-ink-900">Respondent Info Collection</h3>
                  <p className="text-[11px] text-ink-500">
                    Optionally collect respondent identity alongside their scores.
                  </p>
                </div>

                <div className="rounded-xl border border-line divide-y divide-line bg-white">
                  {/* Name field */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink-900">Collect Full Name</span>
                      <p className="text-[11px] text-ink-500">Asks respondent for their name</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {collectName && (
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-ink-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={nameRequired}
                            onChange={(e) => setNameRequired(e.target.checked)}
                            className="rounded border-line text-brand-600"
                          />
                          <span>Required</span>
                        </label>
                      )}
                      <input
                        type="checkbox"
                        checked={collectName}
                        onChange={(e) => setCollectName(e.target.checked)}
                        className="rounded border-line text-brand-600 h-4 w-4"
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink-900">Collect Email Address</span>
                      <p className="text-[11px] text-ink-500">Enables follow-ups and CRM matching</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {collectEmail && (
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-ink-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailRequired}
                            onChange={(e) => setEmailRequired(e.target.checked)}
                            className="rounded border-line text-brand-600"
                          />
                          <span>Required</span>
                        </label>
                      )}
                      <input
                        type="checkbox"
                        checked={collectEmail}
                        onChange={(e) => setCollectEmail(e.target.checked)}
                        className="rounded border-line text-brand-600 h-4 w-4"
                      />
                    </div>
                  </div>

                  {/* Company field */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink-900">Collect Company / Org</span>
                      <p className="text-[11px] text-ink-500">Identifies the respondent&apos;s business</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {collectCompany && (
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-ink-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={companyRequired}
                            onChange={(e) => setCompanyRequired(e.target.checked)}
                            className="rounded border-line text-brand-600"
                          />
                          <span>Required</span>
                        </label>
                      )}
                      <input
                        type="checkbox"
                        checked={collectCompany}
                        onChange={(e) => setCollectCompany(e.target.checked)}
                        className="rounded border-line text-brand-600 h-4 w-4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: APPEARANCE & THANK YOU */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink-800">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_ACCENTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccentColor(c)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-transform",
                          accentColor === c ? "scale-110 border-ink-900" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                    <div className="flex items-center rounded-lg border border-line bg-white px-2 py-1 text-xs ml-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-4 h-4 rounded cursor-pointer border-0 p-0 mr-1.5"
                      />
                      <span className="font-mono text-ink-700">{accentColor}</span>
                    </div>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-ink-800">
                    Visual Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all",
                          theme === t.id
                            ? "border-brand-500 bg-brand-50/50 shadow-2xs ring-1 ring-brand-500"
                            : "border-line bg-white hover:border-ink-300"
                        )}
                      >
                        <span className="text-xs font-bold text-ink-900 block">{t.name}</span>
                        <span className="text-[10px] text-ink-500 line-clamp-1">{t.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Logo URL */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink-800">
                    Custom Logo Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                {/* Show Branding Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-warm-50/50">
                  <div>
                    <span className="text-xs font-bold text-ink-900 block">Show &quot;Powered by Praise&quot;</span>
                    <span className="text-[11px] text-ink-500">Display subtle social proof badge</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBranding}
                    onChange={(e) => setShowBranding(e.target.checked)}
                    className="rounded border-line text-brand-600 h-4 w-4"
                  />
                </div>

                {/* Thank You Configuration */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <h3 className="text-xs font-bold text-ink-900">Post-Submission Experience</h3>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Thank You Headline
                    </label>
                    <input
                      type="text"
                      value={thankYouHeading}
                      onChange={(e) => setThankYouHeading(e.target.value)}
                      placeholder="Thank you for your feedback!"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Confirmation Subtext
                    </label>
                    <textarea
                      value={thankYouMessage}
                      onChange={(e) => setThankYouMessage(e.target.value)}
                      placeholder="Your response helps us improve..."
                      rows={2}
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Redirect URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      placeholder="https://yourwebsite.com/thank-you"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 6: FEEDBACK ROUTING RULES */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "routing" && (
              <div className="space-y-4">
                {initialSurvey?.id ? (
                  <RoutingRuleBuilder
                    workspaceId={workspaceId}
                    surveyId={initialSurvey.id}
                    surveyType={type}
                    surveyTitle={title}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-8 text-center space-y-3 bg-warm-50/50">
                    <Sliders size={36} className="mx-auto text-ink-300" />
                    <div>
                      <h4 className="text-sm font-bold text-ink-900">Save Survey to Configure Rules</h4>
                      <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                        Please save this survey first. Once saved, you can build condition-based routing rules and review audit execution history.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold shadow-xs hover:bg-brand-600 transition-colors"
                    >
                      Save Survey Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: INTERACTIVE LIVE PREVIEW */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 bg-warm-100 flex flex-col h-full overflow-hidden">
          {/* Preview Toolbar */}
          <div className="h-10 border-b border-line bg-white px-4 flex items-center justify-between text-xs text-ink-600 shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-ink-700">
              <Eye size={13} className="text-brand-600" />
              <span>Interactive Live Preview</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Device Toggle */}
              <div className="flex items-center rounded-lg border border-line bg-warm-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    previewDevice === "desktop" ? "bg-white shadow-2xs text-brand-700" : "text-ink-500"
                  )}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    previewDevice === "mobile" ? "bg-white shadow-2xs text-brand-700" : "text-ink-500"
                  )}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
              </div>

              {/* Copy public link */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                  toast.success("Link Copied", "Public survey URL copied to clipboard.");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 font-semibold text-[11px] transition-colors"
              >
                {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>

              {/* Open public link */}
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 font-semibold text-[11px] transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div
              className={cn(
                "transition-all duration-300 w-full flex justify-center",
                previewDevice === "mobile" && "max-w-[400px] border-8 border-zinc-800 rounded-3xl p-1 shadow-2xl bg-zinc-800"
              )}
            >
              <div className={cn("w-full", previewDevice === "mobile" && "rounded-2xl overflow-hidden")}>
                <SurveyCard survey={previewSurvey} isPreview />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL: PREBUILT TEMPLATES SELECTOR */}
      {/* =================================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-base font-bold text-ink-900">Choose a Survey Template</h3>
                <p className="text-xs text-ink-500">
                  Jumpstart your survey with proven, industry-standard question frameworks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1 rounded-lg text-ink-400 hover:bg-warm-100 text-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {SURVEY_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-line p-4 flex flex-col justify-between gap-3 hover:border-brand-500 hover:shadow-sm transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                        {tpl.badge}
                      </span>
                      <span className="text-xs font-semibold text-ink-500 font-mono">
                        {tpl.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-ink-900">{tpl.name}</h4>
                    <p className="text-xs text-ink-500 leading-relaxed">{tpl.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full py-2 px-3 rounded-lg bg-warm-100 hover:bg-brand-500 hover:text-white text-ink-800 text-xs font-bold transition-all text-center"
                  >
                    Apply Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EMBED CODE */}
      {/* =================================================================== */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-brand-600" />
                <h3 className="text-base font-bold text-ink-900">Embed Survey on Your Website</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmbedModal(false)}
                className="p-1 rounded-lg text-ink-400 hover:bg-warm-100 text-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              Copy and paste this snippet into your HTML, React, Webflow, WordPress, or documentation site to embed this survey seamlessly.
            </p>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800">
                {embedCode}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  setCopiedEmbed(true);
                  setTimeout(() => setCopiedEmbed(false), 2000);
                  toast.success("Embed Code Copied", "HTML iframe code copied to clipboard.");
                }}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs transition-colors flex items-center gap-1"
              >
                {copiedEmbed ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedEmbed ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2 rounded-xl border border-line bg-warm-100 text-xs font-bold text-ink-800 hover:bg-warm-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
