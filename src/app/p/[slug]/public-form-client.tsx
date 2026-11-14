"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Loader2,
  Mic,
  RotateCcw,
  ShieldCheck,
  Star,
  Upload,
  User,
  Video,
} from "lucide-react";
import { CollectionFormDetail, FormFieldItem, FieldValidationRules } from "@/types/form-builder";
import {
  FormFlowConfig,
  FormStep,
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
import { MediaAssetDetail } from "@/types/media";
import { MediaUpload } from "@/components/ui/media-upload";
import {
  BrowserMediaRecorder,
  RecordedMediaResult,
} from "@/components/ui/browser-media-recorder";
import { PraiseLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

type PublicFormClientProps = {
  form: CollectionFormDetail;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uploadMediaWithProgress(
  url: string,
  file: File | Blob,
  typeHint: string,
  onProgress: (percent: number) => void,
): Promise<MediaAssetDetail> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", typeHint);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.asset) {
            resolve(res.asset);
          } else {
            reject(new Error(res.error || "Upload failed."));
          }
        } catch {
          reject(new Error("Invalid response from server."));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during media upload. Check your connection."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was interrupted."));
    });

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

export function PublicFormClient({ form }: PublicFormClientProps) {
  // Anti-abuse tracking (initialized with current timestamp)
  const [formLoadedAt] = useState<number>(() => Date.now());
  const [honeypot, setHoneypot] = useState("");

  // Form input state
  const [activeTab, setActiveTab] = useState<"text" | "video" | "audio">("text");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerTitle, setCustomerTitle] = useState("");
  const [customerWebsite, setCustomerWebsite] = useState("");
  const [isConsentGranted, setIsConsentGranted] = useState(false);
  const [isMediaConsentGranted, setIsMediaConsentGranted] = useState(true);
  const [allowSocialMedia, setAllowSocialMedia] = useState(false);
  const [allowMarketingMaterials, setAllowMarketingMaterials] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [customResponses, setCustomResponses] = useState<Record<string, unknown>>({});

  // Media upload state
  const [uploadedVideoAsset, setUploadedVideoAsset] = useState<MediaAssetDetail | null>(null);
  const [uploadedAvatarAsset, setUploadedAvatarAsset] = useState<MediaAssetDetail | null>(null);

  // Staged media recording (never uploaded until customer submits the form)
  const [recordedMedia, setRecordedMedia] = useState<RecordedMediaResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Validation & Submission state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);

  const accentColor = form.accentColor || "#7049D8";

  // Sanitize and scope form-level custom CSS
  const { scopedCss } = useMemo(() => {
    return sanitizeAndScopeCss(form.customCss || "", ".praise-form-scope");
  }, [form.customCss]);

  // Flow Configuration & Multi-Step Logic
  const flowConfig: FormFlowConfig | null = useMemo(() => {
    if (!form.isMultiStep || !form.flowConfigJson) return null;
    try {
      const parsed = JSON.parse(form.flowConfigJson);
      return parsed.enabled ? parsed : null;
    } catch {
      return null;
    }
  }, [form.isMultiStep, form.flowConfigJson]);

  const isMultiStep = Boolean(flowConfig && flowConfig.steps && flowConfig.steps.length > 0);
  const steps = useMemo(() => flowConfig?.steps || [], [flowConfig]);

  // Multi-step navigation state
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [stepHistory, setStepHistory] = useState<string[]>([]);

  // Current effective step ID
  const effectiveStepId = useMemo(() => {
    if (!isMultiStep || steps.length === 0) return "";
    if (steps.some((s) => s.id === currentStepId)) return currentStepId;
    return steps[0].id;
  }, [isMultiStep, steps, currentStepId]);

  const currentStep = useMemo(() => {
    return steps.find((s) => s.id === effectiveStepId) || steps[0] || null;
  }, [steps, effectiveStepId]);

  const currentStepIndex = useMemo(() => {
    return steps.findIndex((s) => s.id === effectiveStepId);
  }, [steps, effectiveStepId]);

  // Aggregate values map for conditions and branching evaluation
  const formValuesMap = useMemo(() => {
    return {
      rating,
      content,
      name: customerName,
      email: customerEmail,
      company: customerCompany,
      jobTitle: customerTitle,
      website: customerWebsite,
      consent: isConsentGranted,
      ...customResponses,
    };
  }, [
    rating,
    content,
    customerName,
    customerEmail,
    customerCompany,
    customerTitle,
    customerWebsite,
    isConsentGranted,
    customResponses,
  ]);

  // Track Form View (privacy-conscious, session-deduplicated)
  useEffect(() => {
    if (typeof window === "undefined" || !form.id) return;
    try {
      const sessionKey = `praise_form_view_${form.id}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "FORM",
          targetId: form.id,
          eventType: "VIEW",
          workspaceId: form.workspaceId,
          slug: form.slug,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [form.id, form.workspaceId, form.slug]);

  // Redirect countdown when redirectUrl is provided
  useEffect(() => {
    if (isSuccess && redirectUrl) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            window.location.href = redirectUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSuccess, redirectUrl]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
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

  // Validate a single field ID
  const validateFieldId = (fieldId: string, errors: Record<string, string>) => {
    if (fieldId === "STANDARD_NAME") {
      if (form.collectName && form.nameRequired && !customerName.trim()) {
        errors.name = "Your full name is required.";
      }
    } else if (fieldId === "STANDARD_EMAIL") {
      if (form.collectEmail) {
        if (form.emailRequired && !customerEmail.trim()) {
          errors.email = "Your email address is required.";
        } else if (customerEmail.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
          errors.email = "Please enter a valid email address (e.g. name@domain.com).";
        }
      }
    } else if (fieldId === "STANDARD_COMPANY") {
      if (form.collectCompany && form.companyRequired && !customerCompany.trim()) {
        errors.company = "Company name is required.";
      }
    } else if (fieldId === "STANDARD_JOB_TITLE") {
      if (form.collectJobTitle && form.jobTitleRequired && !customerTitle.trim()) {
        errors.jobTitle = "Job title is required.";
      }
    } else if (fieldId === "STANDARD_WEBSITE") {
      if (form.collectWebsite && form.websiteRequired && !customerWebsite.trim()) {
        errors.website = "Website or social profile is required.";
      }
    } else if (fieldId === "STANDARD_RATING") {
      if (form.collectRating && form.ratingRequired && (!rating || rating < 1)) {
        errors.rating = "Please select a star rating.";
      }
    } else if (fieldId === "STANDARD_TEXT") {
      if (form.collectText && activeTab === "text") {
        if (form.textRequired && !content.trim()) {
          errors.content = "Please write your testimonial or feedback.";
        }
      }
      if (activeTab === "video") {
        if (form.textRequired && !uploadedVideoAsset && !recordedMedia) {
          errors.video = "Please record or upload your video testimonial.";
        }
      }
      if (activeTab === "audio") {
        if (form.textRequired && !uploadedVideoAsset && !recordedMedia) {
          errors.audio = "Please record or upload your voice note.";
        }
      }
    } else if (fieldId === "STANDARD_CONSENT") {
      if (form.collectConsent && form.consentRequired && !isConsentGranted) {
        errors.consent = "You must grant permission before submitting.";
      }
    } else {
      // Custom questions
      const customField = form.fields?.find(
        (f, idx) => f.id === fieldId || `custom_${idx}` === fieldId || `q-${idx}` === fieldId,
      );
      if (customField) {
        const fieldKey = customField.id || fieldId;
        const val = customResponses[fieldKey];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0);

        if (customField.isRequired && isEmpty) {
          errors[fieldKey] = `"${customField.label}" is required.`;
          return;
        }

        // Advanced validation rules
        if (!isEmpty && customField.validationRulesJson) {
          try {
            const rules: FieldValidationRules = JSON.parse(customField.validationRulesJson);

            // Numeric range
            if (customField.type === "NUMBER") {
              const num = Number(val);
              if (isNaN(num)) {
                errors[fieldKey] =
                  rules.customErrorMessage || `"${customField.label}" must be a valid number.`;
              } else {
                if (rules.minNumeric !== undefined && num < rules.minNumeric) {
                  errors[fieldKey] =
                    rules.customErrorMessage ||
                    `"${customField.label}" must be at least ${rules.minNumeric}.`;
                } else if (rules.maxNumeric !== undefined && num > rules.maxNumeric) {
                  errors[fieldKey] =
                    rules.customErrorMessage ||
                    `"${customField.label}" cannot exceed ${rules.maxNumeric}.`;
                }
              }
            }

            // String length and regex
            if (typeof val === "string") {
              if (rules.minLength !== undefined && val.length < rules.minLength) {
                errors[fieldKey] =
                  rules.customErrorMessage ||
                  `"${customField.label}" must be at least ${rules.minLength} characters.`;
              } else if (rules.maxLength !== undefined && val.length > rules.maxLength) {
                errors[fieldKey] =
                  rules.customErrorMessage ||
                  `"${customField.label}" cannot exceed ${rules.maxLength} characters.`;
              } else if (rules.pattern) {
                try {
                  const reg = new RegExp(rules.pattern);
                  if (!reg.test(val)) {
                    errors[fieldKey] =
                      rules.customErrorMessage || `"${customField.label}" format is invalid.`;
                  }
                } catch {
                  // ignore invalid regex string
                }
              }
            }

            // Date range
            if (customField.type === "DATE" && typeof val === "string") {
              if (rules.minDate && val < rules.minDate) {
                errors[fieldKey] =
                  rules.customErrorMessage ||
                  `"${customField.label}" cannot be earlier than ${rules.minDate}.`;
              } else if (rules.maxDate && val > rules.maxDate) {
                errors[fieldKey] =
                  rules.customErrorMessage ||
                  `"${customField.label}" cannot be later than ${rules.maxDate}.`;
              }
            }

            // Phone format
            if (customField.type === "PHONE" && typeof val === "string") {
              const cleaned = val.replace(/[\s\-\(\)\.]/g, "");
              if (!/^\+?\d{7,15}$/.test(cleaned)) {
                errors[fieldKey] =
                  rules.customErrorMessage || "Please enter a valid phone number.";
              }
            }

            // Website format
            if (customField.type === "WEBSITE" && typeof val === "string") {
              if (!/^https?:\/\/.+/i.test(val)) {
                errors[fieldKey] =
                  rules.customErrorMessage ||
                  "Please enter a valid URL starting with http:// or https://.";
              }
            }
          } catch {
            // ignore JSON parse error
          }
        }
      }
    }
  };

  // Validate fields for a specific step in multi-step flow
  const validateStep = (step: FormStep): boolean => {
    const errors: Record<string, string> = {};

    for (const section of step.sections) {
      if (!isSectionVisible(section, formValuesMap)) continue;
      for (const fieldId of section.fieldIds) {
        if (!isFieldVisibleInStep(fieldId, step, formValuesMap)) continue;
        validateFieldId(fieldId, errors);
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Full validation for single-page forms
  const validateFullForm = (): boolean => {
    const errors: Record<string, string> = {};

    validateFieldId("STANDARD_NAME", errors);
    validateFieldId("STANDARD_EMAIL", errors);
    validateFieldId("STANDARD_COMPANY", errors);
    validateFieldId("STANDARD_JOB_TITLE", errors);
    validateFieldId("STANDARD_WEBSITE", errors);
    validateFieldId("STANDARD_RATING", errors);
    validateFieldId("STANDARD_TEXT", errors);
    validateFieldId("STANDARD_CONSENT", errors);

    if (form.fields && form.fields.length > 0) {
      for (let i = 0; i < form.fields.length; i++) {
        const field = form.fields[i];
        validateFieldId(field.id || `custom_${i}`, errors);
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission handler
  const executeSubmission = async () => {
    setIsSubmitting(true);
    setServerError("");

    try {
      let mediaAssetId = uploadedVideoAsset?.id || null;

      // Upload staged media ONLY now when customer clicks submit
      if (recordedMedia && !mediaAssetId) {
        setIsUploadingMedia(true);
        setUploadProgress(0);

        try {
          const uploaded = await uploadMediaWithProgress(
            `/api/forms/${form.slug}/media/upload`,
            recordedMedia.file,
            recordedMedia.type.toLowerCase(),
            (pct) => setUploadProgress(pct),
          );
          mediaAssetId = uploaded.id;
          setUploadedVideoAsset(uploaded);
        } catch (uploadErr) {
          const errMessage =
            uploadErr instanceof Error
              ? uploadErr.message
              : "Media upload failed. Your recording was preserved; please click Submit again.";
          setServerError(errMessage);
          setIsSubmitting(false);
          setIsUploadingMedia(false);
          setUploadProgress(null);
          return;
        }

        setIsUploadingMedia(false);
        setUploadProgress(null);
      }

      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formSlug: form.slug,
          customerName,
          customerEmail,
          customerCompany,
          customerTitle,
          customerWebsite,
          customerAvatarUrl: uploadedAvatarAsset?.url || null,
          content:
            activeTab === "video" && !content.trim()
              ? "Customer submitted a video testimonial."
              : activeTab === "audio" && !content.trim()
              ? "Customer submitted a voice note testimonial."
              : content,
          rating,
          type: activeTab === "video" ? "VIDEO" : activeTab === "audio" ? "AUDIO" : "TEXT",
          isConsentGranted,
          consentVersion: "v1.0",
          permittedPurposes: {
            publicWebsite: true,
            socialMedia: allowSocialMedia,
            marketingMaterials: allowMarketingMaterials,
          },
          mediaConsentGranted: Boolean(mediaAssetId || uploadedAvatarAsset)
            ? isMediaConsentGranted
            : true,
          allowNameDisplay: true,
          allowCompanyDisplay: true,
          customResponses,
          mediaAssetId,
          recordingQuestionsJson: form.recordingQuestionsJson || null,
          // Anti-abuse parameters
          honeypot,
          formLoadedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Failed to submit testimonial. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      if (data.redirectUrl) {
        setRedirectUrl(data.redirectUrl);
      }
    } catch {
      setServerError("A network error occurred. Please verify your connection and try again.");
    } finally {
      setIsSubmitting(false);
      setIsUploadingMedia(false);
      setUploadProgress(null);
    }
  };

  // Form submit for single-page form
  const handleSinglePageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFullForm()) return;
    await executeSubmission();
  };

  // Multi-step Next button
  const handleStepForward = async () => {
    if (!currentStep || !flowConfig) return;

    if (!validateStep(currentStep)) {
      return;
    }

    const nextId = resolveNextStepId(effectiveStepId, flowConfig, formValuesMap);
    if (nextId === "SUBMIT") {
      // Final step reached -> Submit form!
      await executeSubmission();
    } else {
      setStepHistory((prev) => [...prev, effectiveStepId]);
      setCurrentStepId(nextId);
      setFieldErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Multi-step Previous button (preserves all answers!)
  const handleStepBack = () => {
    if (stepHistory.length === 0) return;
    const prevId = stepHistory[stepHistory.length - 1];
    setStepHistory((prev) => prev.slice(0, -1));
    setCurrentStepId(prevId);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setContent("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerCompany("");
    setCustomerTitle("");
    setCustomerWebsite("");
    setCustomResponses({});
    setUploadedVideoAsset(null);
    setUploadedAvatarAsset(null);
    setRecordedMedia(null);
    setUploadProgress(null);
    setIsUploadingMedia(false);
    setRating(5);
    setFieldErrors({});
    setServerError("");
    setStepHistory([]);
    if (steps[0]) {
      setCurrentStepId(steps[0].id);
    }
  };

  // Render individual form field inputs
  const renderFieldInput = (fieldId: string) => {
    switch (fieldId) {
      case "STANDARD_RATING": {
        if (!form.collectRating) return null;
        return (
          <div key={fieldId} className="text-center space-y-1.5 py-1">
            <label className="block text-xs font-semibold text-ink-800">
              Overall Rating {form.ratingRequired && <span className="text-rose-500">*</span>}
            </label>
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    onClick={() => {
                      setRating(star);
                      clearFieldError("rating");
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 text-amber-400 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-brand-500/20 rounded-md"
                  >
                    <Star
                      size={28}
                      className={cn(
                        isFilled
                          ? "fill-amber-400 text-amber-400"
                          : "text-ink-200 fill-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-medium text-ink-500">
              {rating === 5 && "5 stars — Outstanding"}
              {rating === 4 && "4 stars — Great experience"}
              {rating === 3 && "3 stars — Good / Average"}
              {rating === 2 && "2 stars — Room for improvement"}
              {rating === 1 && "1 star — Needs improvement"}
            </div>
            {fieldErrors.rating && (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.rating}</p>
            )}
          </div>
        );
      }

      case "STANDARD_TEXT": {
        if (!form.collectText && !form.allowVideo && !form.allowAudio) return null;
        return (
          <div key={fieldId} className="space-y-4">
            {/* Format Selector */}
            {(form.allowVideo || form.allowAudio) && (
              <div className="flex items-center justify-center gap-2 border-b border-line pb-4">
                {form.allowText && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("text")}
                    style={
                      activeTab === "text"
                        ? { backgroundColor: accentColor, color: "#fff" }
                        : {}
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "text"
                        ? "shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <FileText size={13} />
                    <span>Written Review</span>
                  </button>
                )}

                {form.allowVideo && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("video")}
                    style={
                      activeTab === "video"
                        ? { backgroundColor: accentColor, color: "#fff" }
                        : {}
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "video"
                        ? "shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <Video size={13} />
                    <span>Record Video</span>
                  </button>
                )}

                {form.allowAudio && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audio")}
                    style={
                      activeTab === "audio"
                        ? { backgroundColor: accentColor, color: "#fff" }
                        : {}
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      activeTab === "audio"
                        ? "shadow-xs"
                        : "bg-warm-100 text-ink-700 hover:bg-warm-200",
                    )}
                  >
                    <Mic size={13} />
                    <span>Record Voice</span>
                  </button>
                )}
              </div>
            )}

            {/* Written Testimonial Text */}
            {form.collectText && activeTab === "text" && (
              <div>
                <label htmlFor="pf-content" className="block text-xs font-semibold text-ink-900 mb-1">
                  Your Testimonial {form.textRequired && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  id="pf-content"
                  rows={4}
                  value={content}
                  aria-invalid={Boolean(fieldErrors.content)}
                  onChange={(e) => {
                    setContent(e.target.value);
                    clearFieldError("content");
                  }}
                  placeholder="Share what you loved about working with us, key results achieved, or why you'd recommend our product..."
                  className={cn(
                    "w-full rounded-xl border p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 leading-relaxed",
                    fieldErrors.content
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                      : "border-line focus:border-brand-500 focus:ring-brand-500",
                  )}
                />
                {fieldErrors.content && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {fieldErrors.content}
                  </p>
                )}
              </div>
            )}

            {/* Video Testimonial Recording & Fallback */}
            {form.allowVideo && activeTab === "video" && (
              <div className="space-y-2">
                <BrowserMediaRecorder
                  mode="video"
                  maxDurationSeconds={form.maxVideoDurationSeconds || 120}
                  accentColor={accentColor}
                  videoInstructions={form.videoInstructions}
                  recordingQuestionsJson={form.recordingQuestionsJson}
                  onMediaReady={(result) => {
                    setRecordedMedia(result);
                    clearFieldError("video");
                  }}
                  onMediaClear={() => {
                    setRecordedMedia(null);
                    setUploadedVideoAsset(null);
                  }}
                />
                {fieldErrors.video && (
                  <p className="text-[11px] text-rose-600 font-medium px-1">{fieldErrors.video}</p>
                )}
              </div>
            )}

            {/* Audio Testimonial Recording & Fallback */}
            {form.allowAudio && activeTab === "audio" && (
              <div className="space-y-2">
                <BrowserMediaRecorder
                  mode="audio"
                  maxDurationSeconds={form.maxVideoDurationSeconds || 120}
                  accentColor={accentColor}
                  onMediaReady={(result) => {
                    setRecordedMedia(result);
                    clearFieldError("audio");
                  }}
                  onMediaClear={() => {
                    setRecordedMedia(null);
                    setUploadedVideoAsset(null);
                  }}
                />
                {fieldErrors.audio && (
                  <p className="text-[11px] text-rose-600 font-medium px-1">{fieldErrors.audio}</p>
                )}
              </div>
            )}
          </div>
        );
      }

      case "STANDARD_NAME": {
        if (!form.collectName) return null;
        return (
          <div key={fieldId}>
            <label htmlFor="pf-name" className="block text-xs font-semibold text-ink-800 mb-1">
              Your Full Name {form.nameRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="pf-name"
              type="text"
              value={customerName}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => {
                setCustomerName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="e.g. Jane Doe"
              className={cn(
                "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                fieldErrors.name
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                  : "border-line focus:border-brand-500 focus:ring-brand-500",
              )}
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.name}</p>
            )}
          </div>
        );
      }

      case "STANDARD_EMAIL": {
        if (!form.collectEmail) return null;
        return (
          <div key={fieldId}>
            <label htmlFor="pf-email" className="block text-xs font-semibold text-ink-800 mb-1">
              Email Address {form.emailRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="pf-email"
              type="email"
              value={customerEmail}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="e.g. jane@company.com"
              className={cn(
                "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                fieldErrors.email
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                  : "border-line focus:border-brand-500 focus:ring-brand-500",
              )}
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.email}</p>
            )}
          </div>
        );
      }

      case "STANDARD_COMPANY": {
        if (!form.collectCompany) return null;
        return (
          <div key={fieldId}>
            <label htmlFor="pf-company" className="block text-xs font-semibold text-ink-800 mb-1">
              Company Name {form.companyRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="pf-company"
              type="text"
              value={customerCompany}
              aria-invalid={Boolean(fieldErrors.company)}
              onChange={(e) => {
                setCustomerCompany(e.target.value);
                clearFieldError("company");
              }}
              placeholder="e.g. Acme Studio"
              className={cn(
                "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                fieldErrors.company
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                  : "border-line focus:border-brand-500 focus:ring-brand-500",
              )}
            />
            {fieldErrors.company && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.company}</p>
            )}
          </div>
        );
      }

      case "STANDARD_JOB_TITLE": {
        if (!form.collectJobTitle) return null;
        return (
          <div key={fieldId}>
            <label htmlFor="pf-job" className="block text-xs font-semibold text-ink-800 mb-1">
              Job Title {form.jobTitleRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="pf-job"
              type="text"
              value={customerTitle}
              aria-invalid={Boolean(fieldErrors.jobTitle)}
              onChange={(e) => {
                setCustomerTitle(e.target.value);
                clearFieldError("jobTitle");
              }}
              placeholder="e.g. Head of Growth"
              className={cn(
                "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                fieldErrors.jobTitle
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                  : "border-line focus:border-brand-500 focus:ring-brand-500",
              )}
            />
            {fieldErrors.jobTitle && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.jobTitle}</p>
            )}
          </div>
        );
      }

      case "STANDARD_WEBSITE": {
        if (!form.collectWebsite) return null;
        return (
          <div key={fieldId} className="sm:col-span-2">
            <label htmlFor="pf-web" className="block text-xs font-semibold text-ink-800 mb-1">
              Website or Social Profile {form.websiteRequired && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="pf-web"
              type="url"
              value={customerWebsite}
              aria-invalid={Boolean(fieldErrors.website)}
              onChange={(e) => {
                setCustomerWebsite(e.target.value);
                clearFieldError("website");
              }}
              placeholder="https://company.com or @username"
              className={cn(
                "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                fieldErrors.website
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                  : "border-line focus:border-brand-500 focus:ring-brand-500",
              )}
            />
            {fieldErrors.website && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.website}</p>
            )}
          </div>
        );
      }

      case "STANDARD_AVATAR": {
        if (!form.collectAvatar) return null;
        return (
          <div key={fieldId} className="sm:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-ink-800">
              Profile Photo (Optional)
            </label>
            <MediaUpload
              uploadUrl={`/api/forms/${form.slug}/media/upload`}
              acceptType="image"
              maxSizeBytes={10 * 1024 * 1024}
              label="Upload Headshot or Logo"
              onSuccess={(asset) => setUploadedAvatarAsset(asset)}
              onRemove={() => setUploadedAvatarAsset(null)}
            />
          </div>
        );
      }

      case "STANDARD_CONSENT": {
        if (!form.collectConsent) return null;
        return (
          <div key={fieldId} className="pt-3 border-t border-line/70 space-y-3">
            <div className="rounded-xl border border-line bg-warm-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-900 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-600" />
                  <span>Permission &amp; Consent</span>
                </span>
                <span className="text-[10px] font-mono text-ink-400 bg-white px-2 py-0.5 rounded border border-line">
                  v1.0
                </span>
              </div>

              {/* Primary Publishing Agreement Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-ink-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConsentGranted}
                  aria-invalid={Boolean(fieldErrors.consent)}
                  onChange={(e) => {
                    setIsConsentGranted(e.target.checked);
                    clearFieldError("consent");
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <span className="leading-relaxed">
                  {form.consentText ||
                    "I grant permission to use my feedback, name, and company on public websites and testimonial widgets."}{" "}
                  {form.consentRequired && <span className="text-rose-500 font-semibold">*</span>}
                </span>
              </label>

              {/* Separate Media Permission Checkbox */}
              {(activeTab === "video" || Boolean(uploadedAvatarAsset) || Boolean(uploadedVideoAsset)) && (
                <label className="flex items-start gap-2.5 text-xs text-ink-800 cursor-pointer pt-1 border-t border-line/40">
                  <input
                    type="checkbox"
                    checked={isMediaConsentGranted}
                    onChange={(e) => setIsMediaConsentGranted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                  />
                  <span className="leading-relaxed">
                    I specifically grant permission to display my submitted photo or video recording alongside my feedback.
                  </span>
                </label>
              )}

              {/* Optional Granular Usage Controls */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowConsentDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  {showConsentDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>{showConsentDetails ? "Hide usage details" : "Customize permitted usage"}</span>
                </button>

                {showConsentDetails && (
                  <div className="mt-2.5 space-y-2 rounded-lg border border-line bg-white p-3 text-[11px] text-ink-700 animate-in fade-in duration-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSocialMedia}
                        onChange={(e) => setAllowSocialMedia(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>Allow quoting snippet on official social media channels</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowMarketingMaterials}
                        onChange={(e) => setAllowMarketingMaterials(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>Allow featuring in marketing presentations or case studies</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Privacy Disclosure Notice */}
              <div className="flex items-start gap-1.5 pt-1 text-[11px] text-ink-500 border-t border-line/40 leading-relaxed">
                <Info size={13} className="shrink-0 mt-0.5 text-ink-400" />
                <span>
                  You may request withdrawal of your consent or deletion of your testimonial at any time. We never sell contact information.
                </span>
              </div>
            </div>

            {fieldErrors.consent && (
              <p className="text-[11px] text-rose-600 font-medium px-1">
                {fieldErrors.consent}
              </p>
            )}
          </div>
        );
      }

      default: {
        // Custom Questions
        const customField = form.fields?.find(
          (f, idx) => f.id === fieldId || `custom_${idx}` === fieldId || `q-${idx}` === fieldId,
        );
        if (!customField) return null;
        const fieldKey = customField.id || fieldId;
        const options = parseOptions(customField.optionsJson);
        const curVal = customResponses[fieldKey];
        const errorMsg = fieldErrors[fieldKey];

        // Parse optional validation rules
        let rules: FieldValidationRules | null = null;
        if (customField.validationRulesJson) {
          try {
            rules = JSON.parse(customField.validationRulesJson);
          } catch {
            rules = null;
          }
        }

        // Preset options
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                placeholder={customField.placeholder || "Your answer..."}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
              />
            )}

            {/* Long text / Long-form response */}
            {(customField.type === "LONG_TEXT" || customField.type === "LONG_FORM") && (
              <textarea
                rows={customField.type === "LONG_FORM" ? 4 : 3}
                value={String(curVal ?? "")}
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                placeholder={customField.placeholder || "Enter detailed response..."}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 leading-relaxed",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                  aria-invalid={Boolean(errorMsg)}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setCustomResponses((prev) => ({ ...prev, [fieldKey]: val }));
                    clearFieldError(fieldKey);
                  }}
                  placeholder={
                    customField.placeholder ||
                    (rules?.minNumeric !== undefined && rules?.maxNumeric !== undefined
                      ? `Between ${rules.minNumeric} and ${rules.maxNumeric}`
                      : "Enter a number...")
                  }
                  className={cn(
                    "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                    errorMsg
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                      : "border-line focus:border-brand-500 focus:ring-brand-500",
                  )}
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                placeholder={customField.placeholder || "+1 (555) 000-0000"}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                  aria-invalid={Boolean(errorMsg)}
                  onChange={(e) => {
                    setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                    clearFieldError(fieldKey);
                  }}
                  className={cn(
                    "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                    errorMsg
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                      : "border-line focus:border-brand-500 focus:ring-brand-500",
                  )}
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                placeholder={customField.placeholder || "name@example.com"}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
              />
            )}

            {/* URL / Website */}
            {(customField.type === "URL" || customField.type === "WEBSITE") && (
              <input
                type="url"
                value={String(curVal ?? "")}
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                placeholder={customField.placeholder || "https://example.com"}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
              />
            )}

            {/* Dropdown / Single Choice */}
            {(customField.type === "DROPDOWN" || customField.type === "SINGLE_CHOICE") && (
              <select
                value={String(curVal ?? "")}
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                aria-invalid={Boolean(errorMsg)}
                onChange={(e) => {
                  setCustomResponses((prev) => ({ ...prev, [fieldKey]: e.target.value }));
                  clearFieldError(fieldKey);
                }}
                className={cn(
                  "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                  errorMsg
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                    : "border-line focus:border-brand-500 focus:ring-brand-500",
                )}
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
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: [...arr, opt],
                            }));
                          } else {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: arr.filter((x) => x !== opt),
                            }));
                          }
                          clearFieldError(fieldKey);
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
                  aria-invalid={Boolean(errorMsg)}
                  onChange={(e) => {
                    setCustomResponses((prev) => ({
                      ...prev,
                      [fieldKey]: e.target.checked,
                    }));
                    clearFieldError(fieldKey);
                  }}
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
                    onClick={() => {
                      setCustomResponses((prev) => ({
                        ...prev,
                        [fieldKey]: star,
                      }));
                      clearFieldError(fieldKey);
                    }}
                    className="p-0.5 text-amber-400 focus:outline-none"
                  >
                    <Star
                      size={20}
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
              <div className="space-y-1.5 pt-1">
                <MediaUpload
                  uploadUrl={`/api/forms/${form.slug}/media/upload`}
                  acceptType="both"
                  maxSizeBytes={(rules?.maxFileSizeMB || rules?.maxFileSizeMb || 10) * 1024 * 1024}
                  label={curVal ? `Uploaded: ${String(curVal)}` : customField.placeholder || "Upload Document / File"}
                  onSuccess={(asset) => {
                    setCustomResponses((prev) => ({
                      ...prev,
                      [fieldKey]: asset.url || asset.id,
                    }));
                    clearFieldError(fieldKey);
                  }}
                  onRemove={() => {
                    setCustomResponses((prev) => {
                      const copy = { ...prev };
                      delete copy[fieldKey];
                      return copy;
                    });
                  }}
                />
                <p className="text-[10px] text-ink-500">
                  {rules?.allowedExtensions && rules.allowedExtensions.length > 0
                    ? `Supported: ${rules.allowedExtensions.join(", ")}`
                    : "Supported: PDF, DOCX, PNG, JPG"}{" "}
                  &bull; Max {rules?.maxFileSizeMB || 10}MB
                </p>
              </div>
            )}

            {errorMsg && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{errorMsg}</p>
            )}
          </div>
        );
      }
    }
  };

  // Render progress indicator
  const renderProgress = () => {
    if (!isMultiStep || !flowConfig || flowConfig.progressStyle === "none") return null;

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

    // Default 'bar'
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
    <div className="min-h-screen bg-warm-50/80 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="praise-form-scope w-full max-w-xl rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        {/* Form Scoped Custom CSS */}
        {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}

        {/* Header / Branding */}
        <div className="text-center pb-5 border-b border-line/70">
          <div className="inline-flex items-center justify-center mb-3">
            {form.customLogoUrl ? (
              <div className="h-10 max-w-[160px] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.customLogoUrl}
                  alt={`${form.title} logo`}
                  className="max-h-10 object-contain mx-auto"
                />
              </div>
            ) : (
              <PraiseLogo size="sm" decorative />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">
            {form.title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
            {form.headerPrompt}
          </p>
          {form.description && (
            <p className="mt-1 text-xs text-ink-400 max-w-sm mx-auto">
              {form.description}
            </p>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUCCESS STATE */}
        {/* ------------------------------------------------------------- */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-5 animate-in fade-in duration-300">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-ink-900">
                Thank You for Your Feedback!
              </h2>
              <p className="text-xs sm:text-sm text-ink-600 max-w-sm mx-auto leading-relaxed">
                {form.thankYouMessage ||
                  "Your testimonial has been submitted successfully and received for review."}
              </p>
            </div>

            {/* Submission Receipt Card */}
            <div className="rounded-xl border border-line/80 bg-warm-50/70 p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-line/50">
                <span className="font-semibold text-ink-800">Submission Receipt</span>
                <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                  Pending Review
                </span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= rating ? "fill-amber-400" : "text-ink-200 fill-transparent"}
                  />
                ))}
                <span className="text-[11px] font-medium text-ink-600 ml-1">
                  {rating} of 5 stars
                </span>
              </div>
              {content && (
                <p className="text-ink-700 italic line-clamp-3">
                  &ldquo;{content}&rdquo;
                </p>
              )}
              {customerName && (
                <div className="text-[11px] text-ink-500 pt-1">
                  Submitted by <span className="font-semibold text-ink-800">{customerName}</span>
                  {customerCompany && ` (${customerCompany})`}
                </div>
              )}
              {uploadedVideoAsset && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-700">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>
                    Video attachment confirmed (
                    {(uploadedVideoAsset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Redirect notice if configured */}
            {redirectUrl ? (
              <div className="pt-2 text-xs text-ink-500 space-y-1">
                <p>Redirecting in {countdown} seconds...</p>
                <a
                  href={redirectUrl}
                  className="font-semibold underline inline-block"
                  style={{ color: accentColor }}
                >
                  Click here if not automatically redirected
                </a>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                >
                  <RotateCcw size={13} />
                  <span>Submit Another Response</span>
                </button>
              </div>
            )}
          </div>
        ) : isMultiStep && currentStep ? (
          /* ------------------------------------------------------------- */
          /* MULTI-STEP FLOW SUBMISSION EXPERIENCE */
          /* ------------------------------------------------------------- */
          <div className="pt-6 space-y-5">
            {/* Top-Level Server Error Notification */}
            {serverError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{serverError}</span>
              </div>
            )}

            {/* Invisible Honeypot Anti-Spam Field */}
            <div
              style={{
                position: "absolute",
                left: "-9999px",
                opacity: 0,
                pointerEvents: "none",
                height: 0,
                width: 0,
                overflow: "hidden",
              }}
              aria-hidden="true"
            >
              <label htmlFor="hp_praise_fax_ms">Leave this field blank</label>
              <input
                id="hp_praise_fax_ms"
                type="text"
                name="hp_praise_fax_ms"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Progress Bar / Step Dots / Percentage */}
            {renderProgress()}

            {/* Step Heading */}
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink-900">{currentStep.title}</h2>
              {currentStep.description && (
                <p className="text-xs text-ink-500">{currentStep.description}</p>
              )}
            </div>

            {/* Step Sections & Form Fields */}
            <div className="space-y-5">
              {currentStep.sections
                .filter((sec) => isSectionVisible(sec, formValuesMap))
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
                        .filter((fId) => isFieldVisibleInStep(fId, currentStep, formValuesMap))
                        .map((fId) => renderFieldInput(fId))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Upload progress feedback */}
            {isUploadingMedia && uploadProgress !== null && (
              <div className="w-full rounded-xl border border-brand-200 bg-brand-50/70 p-3 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-brand-900">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-brand-600" />
                    <span>Uploading {activeTab === "video" ? "video" : "voice"} recording...</span>
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-brand-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%`, backgroundColor: accentColor }}
                  />
                </div>
              </div>
            )}

            {/* Step Navigation Bar */}
            <div className="pt-4 flex items-center justify-between gap-3 border-t border-line/60">
              {stepHistory.length > 0 ? (
                <button
                  type="button"
                  onClick={handleStepBack}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-warm-50 transition-colors shadow-2xs disabled:opacity-50"
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleStepForward}
                disabled={isSubmitting}
                style={{ backgroundColor: accentColor }}
                className="inline-flex items-center gap-1.5 rounded-xl py-2.5 px-5 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                <span>
                  {flowConfig && resolveNextStepId(effectiveStepId, flowConfig, formValuesMap) !== "SUBMIT"
                    ? "Next Step"
                    : isSubmitting
                    ? "Submitting Testimonial..."
                    : "Submit Testimonial"}
                </span>
                {!isSubmitting && flowConfig && resolveNextStepId(effectiveStepId, flowConfig, formValuesMap) !== "SUBMIT" && (
                  <ArrowRight size={13} />
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <span className="text-[10px] text-ink-400">
                Powered by <span className="font-semibold text-ink-600">Praise</span>
              </span>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* SINGLE-PAGE ACTIVE FORM (Version 1 Compatibility) */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleSinglePageSubmit} noValidate className="pt-6 space-y-5">
            {/* Top-Level Server Error Notification */}
            {serverError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{serverError}</span>
              </div>
            )}

            {/* Invisible Honeypot Anti-Spam Field */}
            <div
              style={{
                position: "absolute",
                left: "-9999px",
                opacity: 0,
                pointerEvents: "none",
                height: 0,
                width: 0,
                overflow: "hidden",
              }}
              aria-hidden="true"
            >
              <label htmlFor="hp_praise_fax">Leave this field blank</label>
              <input
                id="hp_praise_fax"
                type="text"
                name="hp_praise_fax"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {renderFieldInput("STANDARD_TEXT")}
            {renderFieldInput("STANDARD_RATING")}

            {/* Standard Respondent Fields */}
            <div className="space-y-3 pt-2 border-t border-line/70">
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                About You
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {renderFieldInput("STANDARD_NAME")}
                {renderFieldInput("STANDARD_EMAIL")}
                {renderFieldInput("STANDARD_COMPANY")}
                {renderFieldInput("STANDARD_JOB_TITLE")}
                {renderFieldInput("STANDARD_WEBSITE")}
                {renderFieldInput("STANDARD_AVATAR")}
              </div>
            </div>

            {/* Custom Questions Section */}
            {form.fields && form.fields.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-line/70">
                <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  Additional Questions
                </div>
                {form.fields.map((field: FormFieldItem, idx: number) =>
                  renderFieldInput(field.id || `custom_${idx}`),
                )}
              </div>
            )}

            {/* Consent & Privacy */}
            {renderFieldInput("STANDARD_CONSENT")}

            {/* Upload progress feedback */}
            {isUploadingMedia && uploadProgress !== null && (
              <div className="w-full rounded-xl border border-brand-200 bg-brand-50/70 p-3 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-brand-900">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-brand-600" />
                    <span>Uploading {activeTab === "video" ? "video" : "voice"} recording...</span>
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-brand-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%`, backgroundColor: accentColor }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: accentColor }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isSubmitting ? "Submitting Testimonial..." : "Submit Testimonial"}</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <span className="text-[10px] text-ink-400">
                Powered by <span className="font-semibold text-ink-600">Praise</span>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}