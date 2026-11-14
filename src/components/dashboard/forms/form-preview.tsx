"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Laptop,
  Mic,
  RotateCcw,
  Smartphone,
  Star,
  Upload,
  User,
  Video,
} from "lucide-react";
import { CollectionFormDetail, FormFieldItem, FieldValidationRules } from "@/types/form-builder";
import {
  FormFlowConfig,
  isFieldVisibleInStep,
  isSectionVisible,
  resolveNextStepId,
} from "@/lib/forms/flow-engine";
import { sanitizeAndScopeCss } from "@/lib/forms/css-sanitizer";
import {
  PRESET_COMPANY_SIZES,
  PRESET_CUSTOMER_ROLES,
  PRESET_PRODUCT_PLANS,
} from "@/lib/forms/templates";
import { BrowserMediaRecorder, type RecordedMediaResult } from "@/components/ui/browser-media-recorder";
import { PraiseLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

type FormPreviewProps = {
  form: Partial<CollectionFormDetail>;
  workspaceName?: string;
};

export function FormPreview({ form, workspaceName = "Praise" }: FormPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"text" | "video" | "audio">("text");
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [previewRecordedMedia, setPreviewRecordedMedia] = useState<RecordedMediaResult | null>(null);

  // Sanitize and scope form custom CSS
  const { scopedCss } = useMemo(() => {
    return sanitizeAndScopeCss(form.customCss || "", ".praise-form-scope");
  }, [form.customCss]);

  // Form state
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({
    rating: 5,
    content: "",
    name: "",
    email: "",
    company: "",
    jobTitle: "",
    website: "",
    consent: true,
  });

  // Parse flow configuration
  const flowConfig: FormFlowConfig | null = useMemo(() => {
    if (!form.isMultiStep || !form.flowConfigJson) return null;
    try {
      const parsed = JSON.parse(form.flowConfigJson);
      return parsed.enabled ? parsed : null;
    } catch {
      return null;
    }
  }, [form.isMultiStep, form.flowConfigJson]);

  const isMultiStepActive = Boolean(
    flowConfig && flowConfig.steps && flowConfig.steps.length > 0,
  );

  const steps = useMemo(() => flowConfig?.steps || [], [flowConfig]);

  // Multi-step navigation state
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [stepHistory, setStepHistory] = useState<string[]>([]);

  // Effective current step
  const effectiveStepId = useMemo(() => {
    if (!isMultiStepActive || steps.length === 0) return "";
    if (steps.some((s) => s.id === currentStepId)) return currentStepId;
    return steps[0].id;
  }, [isMultiStepActive, steps, currentStepId]);

  const currentStep = useMemo(() => {
    return steps.find((s) => s.id === effectiveStepId) || steps[0] || null;
  }, [steps, effectiveStepId]);

  const currentStepIndex = useMemo(() => {
    return steps.findIndex((s) => s.id === effectiveStepId);
  }, [steps, effectiveStepId]);

  const allowVideo = form.allowVideo ?? true;
  const allowAudio = form.allowAudio ?? true;
  const allowText = form.allowText ?? true;
  const accentColor = form.accentColor || "#7049D8";

  const rating = Number(previewValues.rating ?? 5);

  const updateValue = (key: string, val: unknown) => {
    setPreviewValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleNextStep = () => {
    if (!currentStep || !flowConfig) return;
    const nextId = resolveNextStepId(effectiveStepId, flowConfig, previewValues);
    if (nextId === "SUBMIT") {
      setIsSubmitted(true);
    } else {
      setStepHistory((prev) => [...prev, effectiveStepId]);
      setCurrentStepId(nextId);
    }
  };

  const handlePrevStep = () => {
    if (stepHistory.length === 0) return;
    const prevId = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setCurrentStepId(prevId);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setStepHistory([]);
    if (steps[0]) {
      setCurrentStepId(steps[0].id);
    }
  };

  const parseOptions = (
    optionsJson?: string | null,
    fallback: string[] = ["Option 1", "Option 2"],
  ): string[] => {
    if (!optionsJson) return fallback;
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      const split = optionsJson
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (split.length > 0) return split;
    }
    return fallback;
  };

  // Helper to render individual form field components
  const renderSingleField = (fieldId: string) => {
    switch (fieldId) {
      case "STANDARD_RATING": {
        if (!form.collectRating) return null;
        return (
          <div key={fieldId} className="text-center space-y-1.5 py-2">
            <label className="block text-xs font-semibold text-ink-800">
              Overall Rating {form.ratingRequired && <span className="text-rose-500">*</span>}
            </label>
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateValue("rating", star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    size={24}
                    className={cn(
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-ink-200 fill-transparent",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "STANDARD_TEXT": {
        if (!form.collectText && !allowVideo && !allowAudio) return null;
        return (
          <div key={fieldId} className="space-y-3">
            {/* Format selection */}
            {(allowVideo || allowAudio) && (
              <div className="flex items-center justify-center gap-2 border-b border-line pb-3">
                {allowText && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("text")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "text"
                        ? "bg-brand-500 text-white shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <FileText size={13} />
                    <span>Written Review</span>
                  </button>
                )}

                {allowVideo && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("video")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "video"
                        ? "bg-brand-500 text-white shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <Video size={13} />
                    <span>Record Video</span>
                  </button>
                )}

                {allowAudio && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audio")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "audio"
                        ? "bg-brand-500 text-white shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <Mic size={13} />
                    <span>Record Audio</span>
                  </button>
                )}
              </div>
            )}

            {/* Video recording preview */}
            {activeTab === "video" && allowVideo && (
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-ink-600 flex items-center justify-between">
                  <span>Record or upload a video testimonial:</span>
                  <span className="text-[10px] text-ink-400">
                    Max {form.maxVideoDurationSeconds ?? 120}s
                  </span>
                </div>
                <BrowserMediaRecorder
                  mode="video"
                  maxDurationSeconds={form.maxVideoDurationSeconds ?? 120}
                  accentColor={accentColor}
                  videoInstructions={form.videoInstructions}
                  recordingQuestionsJson={form.recordingQuestionsJson}
                  onMediaReady={(result) => setPreviewRecordedMedia(result)}
                  onMediaClear={() => setPreviewRecordedMedia(null)}
                  initialPreviewUrl={
                    previewRecordedMedia?.type === "VIDEO" ? previewRecordedMedia.previewUrl : null
                  }
                />
              </div>
            )}

            {/* Audio recording preview */}
            {activeTab === "audio" && allowAudio && (
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-ink-600 flex items-center justify-between">
                  <span>Record or upload a voice testimonial:</span>
                  <span className="text-[10px] text-ink-400">Max 120s</span>
                </div>
                <BrowserMediaRecorder
                  mode="audio"
                  maxDurationSeconds={120}
                  accentColor={accentColor}
                  onMediaReady={(result) => setPreviewRecordedMedia(result)}
                  onMediaClear={() => setPreviewRecordedMedia(null)}
                  initialPreviewUrl={
                    previewRecordedMedia?.type === "AUDIO" ? previewRecordedMedia.previewUrl : null
                  }
                />
              </div>
            )}

            {/* Text review */}
            {activeTab === "text" && form.collectText && (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Your Testimonial {form.textRequired && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={String(previewValues.content ?? "")}
                  onChange={(e) => updateValue("content", e.target.value)}
                  placeholder="Write what you loved about working with us, key results achieved, or why you'd recommend our product..."
                  className="w-full rounded-xl border border-line p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>
            )}
          </div>
        );
      }

      case "STANDARD_NAME": {
        if (!form.collectName) return null;
        return (
          <div key={fieldId}>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Your Full Name {form.nameRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={String(previewValues.name ?? "")}
              onChange={(e) => updateValue("name", e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        );
      }

      case "STANDARD_EMAIL": {
        if (!form.collectEmail) return null;
        return (
          <div key={fieldId}>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Email Address {form.emailRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="email"
              value={String(previewValues.email ?? "")}
              onChange={(e) => updateValue("email", e.target.value)}
              placeholder="e.g. jane@company.com"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        );
      }

      case "STANDARD_COMPANY": {
        if (!form.collectCompany) return null;
        return (
          <div key={fieldId}>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Company Name {form.companyRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={String(previewValues.company ?? "")}
              onChange={(e) => updateValue("company", e.target.value)}
              placeholder="e.g. Acme Studio"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        );
      }

      case "STANDARD_JOB_TITLE": {
        if (!form.collectJobTitle) return null;
        return (
          <div key={fieldId}>
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Job Title {form.jobTitleRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={String(previewValues.jobTitle ?? "")}
              onChange={(e) => updateValue("jobTitle", e.target.value)}
              placeholder="e.g. Head of Growth"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        );
      }

      case "STANDARD_WEBSITE": {
        if (!form.collectWebsite) return null;
        return (
          <div key={fieldId} className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink-800 mb-1">
              Website or Social Profile {form.websiteRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="url"
              value={String(previewValues.website ?? "")}
              onChange={(e) => updateValue("website", e.target.value)}
              placeholder="https://company.com or @username"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        );
      }

      case "STANDARD_AVATAR": {
        if (!form.collectAvatar) return null;
        return (
          <div
            key={fieldId}
            className="sm:col-span-2 rounded-xl border border-line bg-warm-50/60 p-3 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-warm-200 text-ink-500 flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <div>
                <span className="font-semibold text-ink-800 block text-xs">Profile Photo (Optional)</span>
                <span className="text-[11px] text-ink-500">Upload headshot or company avatar</span>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100"
            >
              <Upload size={12} />
              <span>Upload</span>
            </button>
          </div>
        );
      }

      case "STANDARD_CONSENT": {
        if (!form.collectConsent) return null;
        return (
          <div key={fieldId} className="pt-2 border-t border-line/60">
            <label className="flex items-start gap-2.5 text-xs text-ink-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(previewValues.consent ?? true)}
                onChange={(e) => updateValue("consent", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
              />
              <span className="leading-relaxed">
                {form.consentText ||
                  "I grant permission to use my feedback, name, and submitted media for public marketing purposes."}{" "}
                {form.consentRequired && <span className="text-rose-500">*</span>}
              </span>
            </label>
          </div>
        );
      }

      default: {
        // Match custom fields by ID or index
        const customField = form.fields?.find(
          (f, idx) => f.id === fieldId || `custom_${idx}` === fieldId || `q-${idx}` === fieldId,
        );
        if (!customField) return null;
        const fieldKey = customField.id || fieldId;
        const options = parseOptions(customField.optionsJson);
        const curVal = previewValues[fieldKey];

        // Parse optional validation rules
        let rules: FieldValidationRules | null = null;
        if (customField.validationRulesJson) {
          try {
            rules = JSON.parse(customField.validationRulesJson);
          } catch {
            rules = null;
          }
        }

        // Options for specialized presets
        const roleOptions = parseOptions(customField.optionsJson, PRESET_CUSTOMER_ROLES);
        const companySizeOptions = parseOptions(customField.optionsJson, PRESET_COMPANY_SIZES);
        const productPlanOptions = parseOptions(customField.optionsJson, PRESET_PRODUCT_PLANS);

        return (
          <div key={fieldId} className="space-y-1.5">
            <div>
              <label className="block text-xs font-semibold text-ink-900">
                {customField.label} {customField.isRequired && <span className="text-rose-500">*</span>}
              </label>
              {customField.helpText && (
                <p className="text-[11px] text-ink-500 mt-0.5">{customField.helpText}</p>
              )}
              {customField.description && (
                <p className="text-[11px] text-ink-400 mt-0.5">{customField.description}</p>
              )}
            </div>

            {/* Short text */}
            {customField.type === "SHORT_TEXT" && (
              <input
                type="text"
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                placeholder={customField.placeholder || "Your answer..."}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}

            {/* Long text / Long-form response */}
            {(customField.type === "LONG_TEXT" || customField.type === "LONG_FORM") && (
              <textarea
                rows={customField.type === "LONG_FORM" ? 4 : 3}
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                placeholder={customField.placeholder || "Enter detailed response..."}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            )}

            {/* Number */}
            {customField.type === "NUMBER" && (
              <div>
                <input
                  type="number"
                  min={rules?.minNumeric}
                  max={rules?.maxNumeric}
                  value={curVal !== undefined && curVal !== null ? String(curVal) : ""}
                  onChange={(e) => updateValue(fieldKey, e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder={
                    customField.placeholder ||
                    (rules?.minNumeric !== undefined && rules?.maxNumeric !== undefined
                      ? `Between ${rules.minNumeric} and ${rules.maxNumeric}`
                      : "Enter a number...")
                  }
                  className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {(rules?.minNumeric !== undefined || rules?.maxNumeric !== undefined) && (
                  <span className="text-[10px] text-ink-400 mt-1 block">
                    Range: {rules?.minNumeric ?? "—"} to {rules?.maxNumeric ?? "—"}
                  </span>
                )}
              </div>
            )}

            {/* Phone */}
            {customField.type === "PHONE" && (
              <input
                type="tel"
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                placeholder={customField.placeholder || "+1 (555) 000-0000"}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}

            {/* Date */}
            {customField.type === "DATE" && (
              <div>
                <input
                  type="date"
                  min={rules?.minDate}
                  max={rules?.maxDate}
                  value={String(curVal ?? "")}
                  onChange={(e) => updateValue(fieldKey, e.target.value)}
                  className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {(rules?.minDate || rules?.maxDate) && (
                  <span className="text-[10px] text-ink-400 mt-1 block">
                    Allowed dates: {rules.minDate || "Any"} to {rules.maxDate || "Any"}
                  </span>
                )}
              </div>
            )}

            {/* Email */}
            {customField.type === "EMAIL" && (
              <input
                type="email"
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                placeholder={customField.placeholder || "name@example.com"}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}

            {/* URL / Website */}
            {(customField.type === "URL" || customField.type === "WEBSITE") && (
              <input
                type="url"
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                placeholder={customField.placeholder || "https://example.com"}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}

            {/* Dropdown / Single Choice */}
            {(customField.type === "DROPDOWN" || customField.type === "SINGLE_CHOICE") && (
              <select
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{customField.placeholder || "Select an option..."}</option>
                {options.map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Customer Role */}
            {customField.type === "CUSTOMER_ROLE" && (
              <select
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{customField.placeholder || "Select your role..."}</option>
                {roleOptions.map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Company Size */}
            {customField.type === "COMPANY_SIZE" && (
              <select
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{customField.placeholder || "Select team / company size..."}</option>
                {companySizeOptions.map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Product / Plan */}
            {customField.type === "PRODUCT_PLAN" && (
              <select
                value={String(curVal ?? "")}
                onChange={(e) => updateValue(fieldKey, e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{customField.placeholder || "Select product or plan..."}</option>
                {productPlanOptions.map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Multiple Choice */}
            {customField.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-1.5 pt-1">
                {options.map((opt, oIdx) => {
                  const arr = Array.isArray(curVal) ? (curVal as string[]) : [];
                  const checked = arr.includes(opt);
                  return (
                    <label
                      key={oIdx}
                      className="flex items-center gap-2 text-xs text-ink-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateValue(fieldKey, [...arr, opt]);
                          } else {
                            updateValue(fieldKey, arr.filter((x) => x !== opt));
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Checkbox */}
            {customField.type === "CHECKBOX" && (
              <label className="flex items-start gap-2 text-xs text-ink-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(curVal)}
                  onChange={(e) => updateValue(fieldKey, e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <span>{customField.placeholder || "I agree to this condition"}</span>
              </label>
            )}

            {/* Star Rating */}
            {customField.type === "STAR_RATING" && (
              <div className="flex items-center gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateValue(fieldKey, star)}
                    className="p-0.5 text-amber-400 focus:outline-none"
                  >
                    <Star
                      size={18}
                      className={cn(
                        Number(curVal ?? 0) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-ink-200 fill-transparent",
                      )}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* File Upload */}
            {customField.type === "FILE_UPLOAD" && (
              <div className="rounded-xl border border-dashed border-line bg-warm-50/60 p-4 text-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-warm-200 text-ink-600 flex items-center justify-center mx-auto">
                  <Upload size={14} />
                </div>
                <div className="text-xs font-semibold text-ink-800">
                  {curVal ? `Uploaded: ${String(curVal)}` : "Click or drag file to upload"}
                </div>
                <p className="text-[10px] text-ink-500">
                  {rules?.allowedExtensions && rules.allowedExtensions.length > 0
                    ? `Supported: ${rules.allowedExtensions.join(", ")}`
                    : "Supported: PDF, PNG, JPG, DOCX"}{" "}
                  &bull; Max {rules?.maxFileSizeMB || 10}MB
                </p>
                <button
                  type="button"
                  onClick={() => updateValue(fieldKey, "sample-document.pdf")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 shadow-2xs"
                >
                  <Upload size={12} />
                  <span>{curVal ? "Change File" : "Choose File"}</span>
                </button>
              </div>
            )}
          </div>
        );
      }
    }
  };

  // Render progress indicator header
  const renderProgressIndicator = () => {
    if (!isMultiStepActive || !flowConfig || flowConfig.progressStyle === "none") {
      return null;
    }

    const totalSteps = steps.length;
    const currentNumber = currentStepIndex + 1;
    const progressPercent = Math.round((currentNumber / totalSteps) * 100);

    if (flowConfig.progressStyle === "steps") {
      return (
        <div className="pb-4 pt-1 border-b border-line/60">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {steps.map((st, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={st.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        isPassed
                          ? "bg-brand-500 text-white"
                          : isCurrent
                            ? "border-2 border-brand-500 bg-brand-50 text-brand-700 shadow-2xs"
                            : "border border-line bg-warm-100 text-ink-400",
                      )}
                    >
                      {isPassed ? "✓" : idx + 1}
                    </div>
                    <span className="text-[10px] text-ink-500 mt-1 truncate max-w-[70px]">
                      {st.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-2 -mt-4 transition-colors",
                        idx < currentStepIndex ? "bg-brand-500" : "bg-line",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (flowConfig.progressStyle === "percentage") {
      return (
        <div className="pb-4 pt-1 border-b border-line/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-600">
            <span>
              Step {currentNumber} of {totalSteps}: {currentStep?.title}
            </span>
            <span className="font-semibold text-brand-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-warm-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
            />
          </div>
        </div>
      );
    }

    // Default: 'bar'
    return (
      <div className="pb-4 pt-1 border-b border-line/60 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-ink-500 uppercase tracking-wider font-semibold">
          <span>
            Step {currentNumber} of {totalSteps}
          </span>
          <span>{currentStep?.title}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-warm-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-warm-100/60 rounded-2xl border border-line overflow-hidden">
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-ink-800">Live Form Preview</span>
          <span className="rounded bg-warm-100 px-1.5 py-0.5 text-[10px] text-ink-500 font-mono">
            /p/{form.slug || "form-preview"}
          </span>
          {isMultiStepActive && (
            <span className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-[10px] font-semibold border border-brand-200">
              Multi-Step Flow
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(isSubmitted || stepHistory.length > 0) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink-600 hover:bg-warm-100 transition-colors mr-2"
              title="Reset preview"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <div className="flex items-center rounded-lg border border-line bg-warm-50 p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors flex items-center gap-1",
                device === "desktop"
                  ? "bg-white text-ink-900 font-semibold shadow-2xs"
                  : "text-ink-500 hover:text-ink-800",
              )}
              title="Desktop View"
            >
              <Laptop size={13} />
              <span className="hidden sm:inline text-[11px]">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors flex items-center gap-1",
                device === "mobile"
                  ? "bg-white text-ink-900 font-semibold shadow-2xs"
                  : "text-ink-500 hover:text-ink-800",
              )}
              title="Mobile View"
            >
              <Smartphone size={13} />
              <span className="hidden sm:inline text-[11px]">Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
        <div
          className={cn(
            "praise-form-scope w-full transition-all duration-200",
            device === "mobile"
              ? "max-w-sm rounded-3xl border-4 border-ink-800 bg-white p-5 shadow-2xl my-2"
              : "max-w-2xl rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs",
          )}
        >
          {/* Form-level Scoped Custom CSS */}
          {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}

          {/* Form Brand Header */}
          <div className="text-center pb-5 border-b border-line/60">
            {form.customLogoUrl ? (
              <div className="h-10 max-w-[160px] relative mb-3 mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.customLogoUrl}
                  alt="Brand Logo"
                  className="max-h-10 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center mb-3">
                <PraiseLogo size="sm" decorative />
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight">
              {form.title || "Share Your Feedback"}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
              {form.headerPrompt || "How has our product helped your team succeed?"}
            </p>
            {form.description && (
              <p className="mt-1 text-[11px] text-ink-400 max-w-sm mx-auto italic">
                {form.description}
              </p>
            )}
          </div>

          {/* Submitted Success Screen */}
          {isSubmitted ? (
            <div className="py-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-base font-bold text-ink-900">Thank You for Your Feedback!</h2>
              <p className="text-xs text-ink-600 max-w-sm mx-auto leading-relaxed">
                {form.thankYouMessage ||
                  "Your testimonial has been received and will be reviewed shortly."}
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg bg-warm-100 px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-200 transition-colors"
                >
                  Submit Another Response
                </button>
              </div>
            </div>
          ) : isMultiStepActive && currentStep ? (
            /* ------------------------------------------------------------- */
            /* MULTI-STEP FLOW PREVIEW */
            /* ------------------------------------------------------------- */
            <div className="pt-5 space-y-5">
              {/* Progress Indicator */}
              {renderProgressIndicator()}

              {/* Step Title & Description */}
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-ink-900">{currentStep.title}</h2>
                {currentStep.description && (
                  <p className="text-xs text-ink-500">{currentStep.description}</p>
                )}
              </div>

              {/* Step Sections */}
              <div className="space-y-5">
                {currentStep.sections
                  .filter((sec) => isSectionVisible(sec, previewValues))
                  .map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-line/60 bg-warm-50/30 p-4 space-y-3"
                    >
                      {section.title && (
                        <div className="border-b border-line/40 pb-2">
                          <h3 className="text-xs font-bold text-ink-800">{section.title}</h3>
                          {section.description && (
                            <p className="text-[11px] text-ink-500 mt-0.5">{section.description}</p>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {section.fieldIds
                          .filter((fId) => isFieldVisibleInStep(fId, currentStep, previewValues))
                          .map((fId) => renderSingleField(fId))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Navigation Controls (Previous & Next/Submit) */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-line/60">
                {stepHistory.length > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-warm-50 transition-colors shadow-2xs"
                  >
                    <ArrowLeft size={13} />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={handleNextStep}
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center gap-1.5 rounded-xl py-2.5 px-5 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
                >
                  <span>
                    {flowConfig && resolveNextStepId(effectiveStepId, flowConfig, previewValues) !== "SUBMIT"
                      ? "Next Step"
                      : "Submit Testimonial"}
                  </span>
                  {flowConfig && resolveNextStepId(effectiveStepId, flowConfig, previewValues) !== "SUBMIT" && (
                    <ArrowRight size={13} />
                  )}
                </button>
              </div>

              {/* Powered by Praise branding footer */}
              <div className="text-center pt-2">
                <span className="text-[10px] text-ink-400">
                  Powered by <span className="font-semibold text-ink-600">Praise</span> &bull; {workspaceName}
                </span>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* SINGLE-PAGE FALLBACK PREVIEW (Version 1 Compatibility) */
            /* ------------------------------------------------------------- */
            <form onSubmit={handleSimulateSubmit} className="pt-5 space-y-5">
              {renderSingleField("STANDARD_TEXT")}
              {renderSingleField("STANDARD_RATING")}

              {/* Standard About You Fields */}
              <div className="space-y-3 pt-1 border-t border-line/60">
                <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  About You
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderSingleField("STANDARD_NAME")}
                  {renderSingleField("STANDARD_EMAIL")}
                  {renderSingleField("STANDARD_COMPANY")}
                  {renderSingleField("STANDARD_JOB_TITLE")}
                  {renderSingleField("STANDARD_WEBSITE")}
                  {renderSingleField("STANDARD_AVATAR")}
                </div>
              </div>

              {/* Custom Questions Section */}
              {form.fields && form.fields.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-line/60">
                  <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                    Additional Questions
                  </div>
                  {form.fields.map((f, idx) => renderSingleField(f.id || `custom_${idx}`))}
                </div>
              )}

              {renderSingleField("STANDARD_CONSENT")}

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  style={{ backgroundColor: accentColor }}
                  className="w-full rounded-xl py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
                >
                  Submit Testimonial
                </button>
              </div>

              {/* Powered by Praise branding footer */}
              <div className="text-center pt-2">
                <span className="text-[10px] text-ink-400">
                  Powered by <span className="font-semibold text-ink-600">Praise</span> &bull; {workspaceName}
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}