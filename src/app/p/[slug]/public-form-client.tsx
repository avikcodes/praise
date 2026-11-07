"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  RotateCcw,
  Star,
  Video,
} from "lucide-react";
import { CollectionFormDetail, FormFieldItem } from "@/types/form-builder";
import { MediaAssetDetail } from "@/types/media";
import { MediaUpload } from "@/components/ui/media-upload";
import { PraiseLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

type PublicFormClientProps = {
  form: CollectionFormDetail;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [isConsentGranted, setIsConsentGranted] = useState(true);
  const [customResponses, setCustomResponses] = useState<Record<string, unknown>>({});

  // Media upload state
  const [uploadedVideoAsset, setUploadedVideoAsset] = useState<MediaAssetDetail | null>(null);
  const [uploadedAvatarAsset, setUploadedAvatarAsset] = useState<MediaAssetDetail | null>(null);

  // Validation & Submission state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);

  const accentColor = form.accentColor || "#7049D8";

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

  const validateClientInputs = (): boolean => {
    const errors: Record<string, string> = {};

    if (form.collectName && form.nameRequired && !customerName.trim()) {
      errors.name = "Your full name is required.";
    }

    if (form.collectEmail) {
      if (form.emailRequired && !customerEmail.trim()) {
        errors.email = "Your email address is required.";
      } else if (customerEmail.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
        errors.email = "Please enter a valid email address (e.g. name@domain.com).";
      }
    }

    if (form.collectCompany && form.companyRequired && !customerCompany.trim()) {
      errors.company = "Company name is required.";
    }

    if (form.collectJobTitle && form.jobTitleRequired && !customerTitle.trim()) {
      errors.jobTitle = "Job title is required.";
    }

    if (form.collectWebsite && form.websiteRequired && !customerWebsite.trim()) {
      errors.website = "Website or social profile is required.";
    }

    if (form.collectRating && form.ratingRequired && (!rating || rating < 1)) {
      errors.rating = "Please select a star rating.";
    }

    if (form.collectText && activeTab === "text") {
      if (form.textRequired && !content.trim()) {
        errors.content = "Please write your testimonial or feedback.";
      }
    }

    if (activeTab === "video") {
      if (form.textRequired && !uploadedVideoAsset) {
        errors.video = "Please upload or record your video testimonial.";
      }
    }

    if (form.collectConsent && form.consentRequired && !isConsentGranted) {
      errors.consent = "You must grant permission before submitting.";
    }

    // Custom fields validation
    if (form.fields && form.fields.length > 0) {
      for (let i = 0; i < form.fields.length; i++) {
        const field = form.fields[i];
        const fieldKey = field.id || `q-${i}`;
        if (field.isRequired) {
          const val = customResponses[fieldKey];
          const isEmpty =
            val === undefined ||
            val === null ||
            (typeof val === "string" && !val.trim()) ||
            (Array.isArray(val) && val.length === 0);

          if (isEmpty) {
            errors[fieldKey] = `"${field.label}" is required.`;
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateClientInputs()) {
      return;
    }

    setIsSubmitting(true);
    try {
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
              : content,
          rating,
          type: activeTab === "video" ? "VIDEO" : activeTab === "audio" ? "AUDIO" : "TEXT",
          isConsentGranted,
          customResponses,
          mediaAssetId: uploadedVideoAsset?.id || null,
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
    }
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
    setRating(5);
    setFieldErrors({});
    setServerError("");
  };

  const parseOptions = (optionsJson?: string | null): string[] => {
    if (!optionsJson) return ["Option 1", "Option 2"];
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return optionsJson.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["Option 1", "Option 2"];
  };

  return (
    <div className="min-h-screen bg-warm-50/80 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
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
        ) : (
          /* ----------------------------------------------------------- */
          /* ACTIVE FORM */
          /* ----------------------------------------------------------- */
          <form onSubmit={handleSubmit} noValidate className="pt-6 space-y-5">
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

            {/* Allowed Response Formats (Text, Video, Audio) */}
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

            {/* Star Rating Selector */}
            {form.collectRating && (
              <div className="text-center space-y-1.5 py-1">
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
            )}

            {/* Written Review Area */}
            {form.collectText && activeTab === "text" && (
              <div>
                <label
                  htmlFor="pf-content"
                  className="block text-xs font-semibold text-ink-900 mb-1"
                >
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

            {/* Video Testimonial Upload Area */}
            {activeTab === "video" && (
              <div className="space-y-3">
                <MediaUpload
                  uploadUrl={`/api/forms/${form.slug}/media/upload`}
                  acceptType="video"
                  maxSizeBytes={100 * 1024 * 1024}
                  label="Upload Video Testimonial"
                  onSuccess={(asset) => {
                    setUploadedVideoAsset(asset);
                    clearFieldError("video");
                  }}
                  onRemove={() => setUploadedVideoAsset(null)}
                  initialAsset={uploadedVideoAsset}
                />
                {fieldErrors.video && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {fieldErrors.video}
                  </p>
                )}
                <div>
                  <label
                    htmlFor="pf-video-notes"
                    className="block text-xs font-semibold text-ink-800 mb-1"
                  >
                    Optional Video Summary or Notes
                  </label>
                  <textarea
                    id="pf-video-notes"
                    rows={2}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Briefly describe what you mentioned in the video..."
                    className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            )}

            {/* Standard Profile Fields */}
            <div className="space-y-3 pt-1 border-t border-line/60">
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                About You
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {form.collectName && (
                  <div>
                    <label
                      htmlFor="pf-name"
                      className="block text-xs font-semibold text-ink-800 mb-1"
                    >
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
                      placeholder="Jane Doe"
                      className={cn(
                        "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                        fieldErrors.name
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                          : "border-line focus:border-brand-500 focus:ring-brand-500",
                      )}
                    />
                    {fieldErrors.name && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                )}

                {form.collectEmail && (
                  <div>
                    <label
                      htmlFor="pf-email"
                      className="block text-xs font-semibold text-ink-800 mb-1"
                    >
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
                      placeholder="jane@company.com"
                      className={cn(
                        "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                        fieldErrors.email
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                          : "border-line focus:border-brand-500 focus:ring-brand-500",
                      )}
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                )}

                {form.collectCompany && (
                  <div>
                    <label
                      htmlFor="pf-company"
                      className="block text-xs font-semibold text-ink-800 mb-1"
                    >
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
                      placeholder="Acme Studio"
                      className={cn(
                        "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                        fieldErrors.company
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                          : "border-line focus:border-brand-500 focus:ring-brand-500",
                      )}
                    />
                    {fieldErrors.company && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {fieldErrors.company}
                      </p>
                    )}
                  </div>
                )}

                {form.collectJobTitle && (
                  <div>
                    <label
                      htmlFor="pf-title"
                      className="block text-xs font-semibold text-ink-800 mb-1"
                    >
                      Job Title {form.jobTitleRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      id="pf-title"
                      type="text"
                      value={customerTitle}
                      aria-invalid={Boolean(fieldErrors.jobTitle)}
                      onChange={(e) => {
                        setCustomerTitle(e.target.value);
                        clearFieldError("jobTitle");
                      }}
                      placeholder="Head of Marketing"
                      className={cn(
                        "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                        fieldErrors.jobTitle
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                          : "border-line focus:border-brand-500 focus:ring-brand-500",
                      )}
                    />
                    {fieldErrors.jobTitle && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {fieldErrors.jobTitle}
                      </p>
                    )}
                  </div>
                )}

                {form.collectWebsite && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="pf-website"
                      className="block text-xs font-semibold text-ink-800 mb-1"
                    >
                      Website / Social Profile {form.websiteRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      id="pf-website"
                      type="url"
                      value={customerWebsite}
                      aria-invalid={Boolean(fieldErrors.website)}
                      onChange={(e) => {
                        setCustomerWebsite(e.target.value);
                        clearFieldError("website");
                      }}
                      placeholder="https://company.com or @handle"
                      className={cn(
                        "w-full rounded-lg border p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1",
                        fieldErrors.website
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400"
                          : "border-line focus:border-brand-500 focus:ring-brand-500",
                      )}
                    />
                    {fieldErrors.website && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {fieldErrors.website}
                      </p>
                    )}
                  </div>
                )}

                {form.collectAvatar && (
                  <div className="sm:col-span-2">
                    <MediaUpload
                      uploadUrl={`/api/forms/${form.slug}/media/upload`}
                      acceptType="image"
                      maxSizeBytes={10 * 1024 * 1024}
                      label="Your Photo / Avatar (Optional)"
                      onSuccess={(asset) => setUploadedAvatarAsset(asset)}
                      onRemove={() => setUploadedAvatarAsset(null)}
                      initialAsset={uploadedAvatarAsset}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* Custom Questions (All 8 Field Types) */}
            {/* --------------------------------------------------------- */}
            {form.fields && form.fields.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-line/60">
                <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  Additional Questions
                </div>

                {form.fields.map((field: FormFieldItem, idx: number) => {
                  const options = parseOptions(field.optionsJson);
                  const fieldKey = field.id || `q-${idx}`;
                  const fieldError = fieldErrors[fieldKey];
                  const currentVal = customResponses[fieldKey];

                  return (
                    <div key={fieldKey} className="space-y-1">
                      <label className="block text-xs font-semibold text-ink-900">
                        {field.label} {field.isRequired && <span className="text-rose-500">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-[11px] text-ink-500">{field.description}</p>
                      )}

                      {/* SHORT_TEXT */}
                      {field.type === "SHORT_TEXT" && (
                        <input
                          type="text"
                          placeholder={field.placeholder || "Your answer..."}
                          value={(currentVal as string) || ""}
                          onChange={(e) => {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            clearFieldError(fieldKey);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                            fieldError
                              ? "border-rose-300 focus:border-rose-500"
                              : "border-line focus:border-brand-500",
                          )}
                        />
                      )}

                      {/* LONG_TEXT */}
                      {field.type === "LONG_TEXT" && (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || "Enter details..."}
                          value={(currentVal as string) || ""}
                          onChange={(e) => {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            clearFieldError(fieldKey);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                            fieldError
                              ? "border-rose-300 focus:border-rose-500"
                              : "border-line focus:border-brand-500",
                          )}
                        />
                      )}

                      {/* EMAIL */}
                      {field.type === "EMAIL" && (
                        <input
                          type="email"
                          placeholder={field.placeholder || "name@example.com"}
                          value={(currentVal as string) || ""}
                          onChange={(e) => {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            clearFieldError(fieldKey);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                            fieldError
                              ? "border-rose-300 focus:border-rose-500"
                              : "border-line focus:border-brand-500",
                          )}
                        />
                      )}

                      {/* URL */}
                      {field.type === "URL" && (
                        <input
                          type="url"
                          placeholder={field.placeholder || "https://example.com"}
                          value={(currentVal as string) || ""}
                          onChange={(e) => {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            clearFieldError(fieldKey);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                            fieldError
                              ? "border-rose-300 focus:border-rose-500"
                              : "border-line focus:border-brand-500",
                          )}
                        />
                      )}

                      {/* SINGLE_CHOICE */}
                      {field.type === "SINGLE_CHOICE" && (
                        <select
                          value={(currentVal as string) || ""}
                          onChange={(e) => {
                            setCustomResponses((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }));
                            clearFieldError(fieldKey);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-2 text-xs text-ink-900 focus:outline-none focus:ring-1",
                            fieldError
                              ? "border-rose-300 focus:border-rose-500"
                              : "border-line focus:border-brand-500",
                          )}
                        >
                          <option value="">Select option...</option>
                          {options.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* MULTIPLE_CHOICE */}
                      {field.type === "MULTIPLE_CHOICE" && (
                        <div className="space-y-1.5 pt-1">
                          {options.map((opt, oIdx) => {
                            const selectedList = Array.isArray(currentVal)
                              ? (currentVal as string[])
                              : [];
                            const isChecked = selectedList.includes(opt);

                            return (
                              <label
                                key={oIdx}
                                className="flex items-center gap-2 text-xs text-ink-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextList = e.target.checked
                                      ? [...selectedList, opt]
                                      : selectedList.filter((item) => item !== opt);
                                    setCustomResponses((prev) => ({
                                      ...prev,
                                      [fieldKey]: nextList,
                                    }));
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

                      {/* CHECKBOX */}
                      {field.type === "CHECKBOX" && (
                        <label className="flex items-start gap-2 text-xs text-ink-700 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(currentVal)}
                            onChange={(e) => {
                              setCustomResponses((prev) => ({
                                ...prev,
                                [fieldKey]: e.target.checked,
                              }));
                              clearFieldError(fieldKey);
                            }}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                          />
                          <span>{field.placeholder || "Yes / I agree"}</span>
                        </label>
                      )}

                      {/* STAR_RATING */}
                      {field.type === "STAR_RATING" && (
                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const currentNum = Number(currentVal) || 0;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setCustomResponses((prev) => ({
                                    ...prev,
                                    [fieldKey]: s,
                                  }));
                                  clearFieldError(fieldKey);
                                }}
                                className="p-1 text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star
                                  size={20}
                                  className={cn(
                                    currentNum >= s
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-ink-200 fill-transparent",
                                  )}
                                />
                              </button>
                            );
                          })}
                          <span className="text-[11px] text-ink-500 ml-1.5">
                            {Number(currentVal) ? `${currentVal} / 5` : "Click to rate"}
                          </span>
                        </div>
                      )}

                      {fieldError && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">
                          {fieldError}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Consent Disclosure Checkbox */}
            {form.collectConsent && (
              <div className="pt-2 border-t border-line/60">
                <label className="flex items-start gap-2.5 text-xs text-ink-700 cursor-pointer">
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
                    {form.consentText}{" "}
                    {form.consentRequired && <span className="text-rose-500">*</span>}
                  </span>
                </label>
                {fieldErrors.consent && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {fieldErrors.consent}
                  </p>
                )}
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
