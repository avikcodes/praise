"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Globe,
  Layers,
  Layout,
  Loader2,
  Palette,
  Plus,
  Quote,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { CASE_STUDY_TEMPLATES, DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyFormDetail, CaseStudyQuestionsConfig, CaseStudyTemplateItem } from "@/lib/case-studies/types";
import { PublicCaseStudyForm } from "@/components/case-studies/public-case-study-form";
import { cn } from "@/lib/utils";

type CaseStudyBuilderProps = {
  workspaceId: string;
  projects?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  existingForm?: CaseStudyFormDetail | null;
  onSaved: (form: CaseStudyFormDetail) => void;
  onCancel: () => void;
};

export function CaseStudyBuilder({
  workspaceId,
  projects = [],
  brands = [],
  existingForm,
  onSaved,
  onCancel,
}: CaseStudyBuilderProps) {
  const isEditing = Boolean(existingForm);

  // Builder Tabs
  const [activeTab, setActiveTab] = useState<"template" | "basics" | "sections" | "appearance">("template");

  // Selected Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    existingForm?.templateId || "b2b-saas-growth"
  );

  // Form Basic Settings
  const [title, setTitle] = useState(existingForm?.title || "Customer Success Story");
  const [slug, setSlug] = useState(existingForm?.slug || "");
  const [description, setDescription] = useState(
    existingForm?.description || "Tell us how our product helped your team achieve real, measurable results."
  );
  const [projectId, setProjectId] = useState<string>(existingForm?.projectId || "");
  const [brandId, setBrandId] = useState<string>(existingForm?.brandId || "");

  // Appearance & Styling
  const [accentColor, setAccentColor] = useState(existingForm?.accentColor || "#7049D8");
  const [theme, setTheme] = useState(existingForm?.theme || "warm");
  const [customLogoUrl, setCustomLogoUrl] = useState(existingForm?.customLogoUrl || "");
  const [showBranding, setShowBranding] = useState(existingForm?.showBranding ?? true);
  const [welcomeHeading, setWelcomeHeading] = useState(
    existingForm?.welcomeHeading || "Share Your Success Story"
  );
  const [welcomeText, setWelcomeText] = useState(
    existingForm?.welcomeText || "Help others understand how our product helped your team achieve real results."
  );
  const [thankYouHeading, setThankYouHeading] = useState(
    existingForm?.thankYouHeading || "Thank You for Sharing Your Story!"
  );
  const [thankYouText, setThankYouText] = useState(
    existingForm?.thankYouText || "We appreciate your time and transparency. We will review your submission shortly."
  );
  const [redirectUrl, setRedirectUrl] = useState(existingForm?.redirectUrl || "");

  // Section Toggles
  const [collectCustomerBackground, setCollectCustomerBackground] = useState(
    existingForm?.collectCustomerBackground ?? true
  );
  const [collectCompanyRole, setCollectCompanyRole] = useState(
    existingForm?.collectCompanyRole ?? true
  );
  const [collectInitialProblem, setCollectInitialProblem] = useState(
    existingForm?.collectInitialProblem ?? true
  );
  const [collectPreviousSolution, setCollectPreviousSolution] = useState(
    existingForm?.collectPreviousSolution ?? true
  );
  const [collectProductImplementation, setCollectProductImplementation] = useState(
    existingForm?.collectProductImplementation ?? true
  );
  const [collectExperience, setCollectExperience] = useState(
    existingForm?.collectExperience ?? true
  );
  const [collectResultsAchieved, setCollectResultsAchieved] = useState(
    existingForm?.collectResultsAchieved ?? true
  );
  const [collectMeasurableOutcomes, setCollectMeasurableOutcomes] = useState(
    existingForm?.collectMeasurableOutcomes ?? true
  );
  const [collectQuotes, setCollectQuotes] = useState(
    existingForm?.collectQuotes ?? true
  );
  const [allowImages, setAllowImages] = useState(existingForm?.allowImages ?? true);
  const [allowVideo, setAllowVideo] = useState(existingForm?.allowVideo ?? true);
  const [collectConsent, setCollectConsent] = useState(
    existingForm?.collectConsent ?? true
  );
  const [consentRequired, setConsentRequired] = useState(
    existingForm?.consentRequired ?? true
  );
  const [consentText, setConsentText] = useState(
    existingForm?.consentText ||
      "I grant permission to publish this case study, business results, and company quotes for marketing purposes."
  );

  // Question configuration details
  const [questionsConfig, setQuestionsConfig] = useState<CaseStudyQuestionsConfig>(
    existingForm?.questionsConfig || DEFAULT_QUESTIONS_CONFIG
  );

  // States
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle template selection
  const handleSelectTemplate = (tmpl: CaseStudyTemplateItem) => {
    setSelectedTemplateId(tmpl.id);
    if (!isEditing) {
      setTitle(tmpl.name);
      setDescription(tmpl.description);
      setWelcomeHeading(tmpl.welcomeHeading);
      setWelcomeText(tmpl.welcomeText);
      setQuestionsConfig(tmpl.questionsConfig);
    }
  };

  // Build live preview object
  const previewForm: CaseStudyFormDetail = {
    id: existingForm?.id || "preview-form",
    workspaceId,
    projectId: projectId || null,
    brandId: brandId || null,
    templateId: selectedTemplateId,
    templateType: selectedTemplateId.toUpperCase().replace(/-/g, "_"),
    title,
    slug: slug || "preview-slug",
    description,
    status: "ACTIVE",
    accentColor,
    theme,
    customLogoUrl: customLogoUrl || null,
    showBranding,
    welcomeHeading,
    welcomeText,
    thankYouHeading,
    thankYouText,
    redirectUrl: redirectUrl || null,
    collectCustomerBackground,
    collectCompanyRole,
    collectInitialProblem,
    collectPreviousSolution,
    collectProductImplementation,
    collectExperience,
    collectResultsAchieved,
    collectMeasurableOutcomes,
    collectQuotes,
    allowImages,
    allowVideo,
    collectConsent,
    consentRequired,
    consentText,
    questionsConfig,
    submissionsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Form title is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      projectId: projectId || null,
      brandId: brandId || null,
      templateId: selectedTemplateId,
      templateType: selectedTemplateId.toUpperCase().replace(/-/g, "_"),
      accentColor,
      theme,
      customLogoUrl: customLogoUrl.trim() || null,
      showBranding,
      welcomeHeading,
      welcomeText,
      thankYouHeading,
      thankYouText,
      redirectUrl: redirectUrl.trim() || null,
      collectCustomerBackground,
      collectCompanyRole,
      collectInitialProblem,
      collectPreviousSolution,
      collectProductImplementation,
      collectExperience,
      collectResultsAchieved,
      collectMeasurableOutcomes,
      collectQuotes,
      allowImages,
      allowVideo,
      collectConsent,
      consentRequired,
      consentText,
      questionsConfig,
    };

    try {
      const url = isEditing
        ? `/api/workspaces/${workspaceId}/case-studies/forms/${existingForm!.id}`
        : `/api/workspaces/${workspaceId}/case-studies/forms`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save case study form");
      }

      const data = await res.json();
      onSaved(data.form);
    } catch (err: any) {
      setError(err.message || "Failed to save case study form.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-warm-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex h-16 items-center justify-between border-b border-line bg-white px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-ink-500 hover:bg-warm-100 hover:text-ink-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" />
              <span>{isEditing && existingForm ? `Edit "${existingForm.title}"` : "Create Case Study Form"}</span>
            </h1>
            <p className="text-[11px] text-ink-500">Configure questions, measurable outcomes, and appearance</p>
          </div>
        </div>

        {/* Builder Step Tabs */}
        <div className="hidden md:flex items-center gap-1 rounded-xl border border-line bg-warm-50 p-1">
          {[
            { id: "template", label: "1. Template", icon: Layout },
            { id: "basics", label: "2. Basics", icon: Settings },
            { id: "sections", label: "3. Questions", icon: Sliders },
            { id: "appearance", label: "4. Styling", icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-white text-ink-900 shadow-2xs"
                    : "text-ink-500 hover:text-ink-900"
                )}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{isEditing ? "Save Changes" : "Create Form"}</span>
          </button>
        </div>
      </div>

      {/* Builder Body: Split into Settings Panel (Left) and Live Preview (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Settings Panel */}
        <div className="w-full lg:w-1/2 border-r border-line bg-white p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* TAB 1: TEMPLATE SELECTION */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Choose Case Study Template</h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Start with a proven structure tailored to your business model and target metrics.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {CASE_STUDY_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={cn(
                        "rounded-2xl border p-4 cursor-pointer transition-all space-y-2",
                        isSelected
                          ? "border-brand-500 bg-brand-50/50 shadow-xs ring-2 ring-brand-500/20"
                          : "border-line bg-white hover:border-warm-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold",
                              isSelected ? "bg-brand-500 text-white" : "bg-warm-100 text-ink-700"
                            )}
                          >
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-ink-900">{tmpl.name}</span>
                            <span className="ml-2 rounded-md bg-white border border-line px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                              {tmpl.category}
                            </span>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-brand-600" />}
                      </div>

                      <p className="text-xs text-ink-600 leading-relaxed">{tmpl.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("basics")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600"
                >
                  <span>Next: Basics</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BASICS */}
          {activeTab === "basics" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Form Details & Scope</h3>
                <p className="text-xs text-ink-500 mt-0.5">Basic information and project/brand association.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Form Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Acme Corp Customer Case Study"
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Public Slug URL</label>
                  <div className="flex items-center rounded-xl border border-line bg-warm-50 px-3 py-2 text-xs text-ink-500">
                    <span>/cs/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="acme-success-story"
                      className="flex-1 bg-transparent text-ink-900 outline-none pl-1"
                    />
                  </div>
                  <span className="text-[10px] text-ink-400">Leave blank to auto-generate from title.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Introduction Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief prompt for respondents..."
                    className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink-900 outline-none focus:border-brand-500 leading-relaxed"
                  />
                </div>

                {/* Scope to Project */}
                {projects.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-900">Associate with Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                    >
                      <option value="">No Project (Workspace-wide)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Scope to Brand */}
                {brands.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-900">Associate with Brand Profile</label>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                    >
                      <option value="">No Brand Profile</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("template")}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-warm-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("sections")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600"
                >
                  <span>Next: Questions</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUESTIONS & SECTIONS */}
          {activeTab === "sections" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Configure Sections & Questions</h3>
                <p className="text-xs text-ink-500 mt-0.5">Toggle which questions are enabled and configure custom prompts.</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "initialProblem",
                    label: "Initial Challenge & Problem",
                    state: collectInitialProblem,
                    setter: setCollectInitialProblem,
                    cfg: questionsConfig.initialProblem,
                  },
                  {
                    key: "previousSolution",
                    label: "Previous Solution & Alternatives",
                    state: collectPreviousSolution,
                    setter: setCollectPreviousSolution,
                    cfg: questionsConfig.previousSolution,
                  },
                  {
                    key: "productImplementation",
                    label: "Implementation & Rollout",
                    state: collectProductImplementation,
                    setter: setCollectProductImplementation,
                    cfg: questionsConfig.productImplementation,
                  },
                  {
                    key: "experience",
                    label: "Day-to-Day Product Experience",
                    state: collectExperience,
                    setter: setCollectExperience,
                    cfg: questionsConfig.experience,
                  },
                  {
                    key: "resultsAchieved",
                    label: "Business Results Achieved",
                    state: collectResultsAchieved,
                    setter: setCollectResultsAchieved,
                    cfg: questionsConfig.resultsAchieved,
                  },
                  {
                    key: "measurableOutcomes",
                    label: "Measurable Outcomes & Metrics",
                    state: collectMeasurableOutcomes,
                    setter: setCollectMeasurableOutcomes,
                    cfg: questionsConfig.measurableOutcomes,
                  },
                  {
                    key: "quotes",
                    label: "Executive Quotes & Advice",
                    state: collectQuotes,
                    setter: setCollectQuotes,
                    cfg: questionsConfig.quotes,
                  },
                  {
                    key: "allowImages",
                    label: "Supporting Screenshots & Images",
                    state: allowImages,
                    setter: setAllowImages,
                  },
                  {
                    key: "allowVideo",
                    label: "Video Walkthrough & Testimonial",
                    state: allowVideo,
                    setter: setAllowVideo,
                  },
                ].map((sec) => (
                  <div
                    key={sec.key}
                    className="flex items-center justify-between rounded-xl border border-line bg-warm-50/50 p-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-ink-900">{sec.label}</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sec.state}
                        onChange={(e) => sec.setter(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-warm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Consent Box Configuration */}
              <div className="rounded-2xl border border-line p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900">Publication Consent Checkbox</span>
                  <input
                    type="checkbox"
                    checked={collectConsent}
                    onChange={(e) => setCollectConsent(e.target.checked)}
                    className="h-4 w-4 rounded border-line text-brand-600"
                  />
                </div>
                {collectConsent && (
                  <textarea
                    rows={2}
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                    className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 outline-none"
                  />
                )}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("basics")}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-warm-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("appearance")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600"
                >
                  <span>Next: Styling</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: APPEARANCE & STYLING */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Form Appearance & Branding</h3>
                <p className="text-xs text-ink-500 mt-0.5">Customize colors, theme, and confirmation messaging.</p>
              </div>

              <div className="space-y-3">
                {/* Accent Color */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Brand Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded-lg border border-line bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-32 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Theme Mode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Color Palette Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "warm", label: "Warm Clay" },
                      { id: "light", label: "Clean Light" },
                      { id: "dark", label: "Modern Dark" },
                      { id: "emerald", label: "Emerald" },
                      { id: "midnight", label: "Midnight" },
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setTheme(th.id)}
                        className={cn(
                          "rounded-xl border p-2 text-xs font-semibold transition-all text-center",
                          theme === th.id
                            ? "border-brand-500 bg-brand-50 text-brand-700 shadow-2xs"
                            : "border-line bg-white text-ink-700 hover:bg-warm-100"
                        )}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo URL */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Custom Logo URL</label>
                  <input
                    type="url"
                    value={customLogoUrl}
                    onChange={(e) => setCustomLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none"
                  />
                </div>

                {/* Welcome Heading */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Welcome Screen Heading</label>
                  <input
                    type="text"
                    value={welcomeHeading}
                    onChange={(e) => setWelcomeHeading(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none"
                  />
                </div>

                {/* Thank You Heading */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Thank You Heading</label>
                  <input
                    type="text"
                    value={thankYouHeading}
                    onChange={(e) => setThankYouHeading(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none"
                  />
                </div>

                {/* Thank You Message */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Thank You Message</label>
                  <textarea
                    rows={2}
                    value={thankYouText}
                    onChange={(e) => setThankYouText(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white p-2 text-xs text-ink-900 outline-none leading-relaxed"
                  />
                </div>

                {/* Redirect URL */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-900">Optional Post-Submission Redirect URL</label>
                  <input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://company.com/thank-you"
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("sections")}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-warm-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{isEditing ? "Save Changes" : "Finish & Create Form"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Live Interactive Preview */}
        <div className="hidden lg:flex flex-1 flex-col bg-warm-100/70 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-white/80 px-4 py-2.5 backdrop-blur-xs text-xs">
            <span className="font-bold text-ink-700 flex items-center gap-1.5">
              <Eye size={14} className="text-brand-600" />
              <span>Live Respondent Preview</span>
            </span>
            <span className="text-[11px] text-ink-400">Interactive simulation of the public form</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="rounded-3xl shadow-xl overflow-hidden border border-line bg-white">
              <PublicCaseStudyForm form={previewForm} isPreview={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
