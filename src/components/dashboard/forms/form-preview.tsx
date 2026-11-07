"use client";

import { useState } from "react";
import {
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
import { CollectionFormDetail, FormFieldItem } from "@/types/form-builder";
import { PraiseLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

type FormPreviewProps = {
  form: Partial<CollectionFormDetail>;
  workspaceName?: string;
};

export function FormPreview({ form, workspaceName = "Praise" }: FormPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"text" | "video" | "audio">("text");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form fields preview state
  const [customRatings, setCustomRatings] = useState<Record<number, number>>({});

  const allowVideo = form.allowVideo ?? true;
  const allowAudio = form.allowAudio ?? true;
  const allowText = form.allowText ?? true;
  const accentColor = form.accentColor || "#7049D8";

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const parseOptions = (optionsJson?: string | null): string[] => {
    if (!optionsJson) return ["Option 1", "Option 2", "Option 3"];
    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // split by comma if string
      return optionsJson.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["Option 1", "Option 2"];
  };

  return (
    <div className="flex flex-col h-full bg-warm-100/60 rounded-2xl border border-line overflow-hidden">
      {/* Top Preview Controls Bar */}
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-ink-800">
            Live Form Preview
          </span>
          <span className="rounded bg-warm-100 px-1.5 py-0.5 text-[10px] text-ink-500 font-mono">
            /p/{form.slug || "form-preview"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isSubmitted && (
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
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
            "w-full transition-all duration-200",
            device === "mobile"
              ? "max-w-sm rounded-3xl border-4 border-ink-800 bg-white p-5 shadow-2xl my-2"
              : "max-w-2xl rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-xs",
          )}
        >
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
              <h2 className="text-base font-bold text-ink-900">
                Thank You for Your Feedback!
              </h2>
              <p className="text-xs text-ink-600 max-w-sm mx-auto leading-relaxed">
                {form.thankYouMessage ||
                  "Your testimonial has been received and will be reviewed shortly."}
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="rounded-lg bg-warm-100 px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-200 transition-colors"
                >
                  Submit Another Response
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSimulateSubmit} className="pt-5 space-y-5">
              {/* Submission Format Selector (Text, Video, Audio) */}
              {(allowVideo || allowAudio) && (
                <div className="flex items-center justify-center gap-2 border-b border-line pb-4">
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

              {/* Video Recording Placeholder Preview */}
              {activeTab === "video" && allowVideo && (
                <div className="rounded-xl border border-dashed border-line bg-warm-50 p-6 text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
                    <Video size={20} />
                  </div>
                  <h3 className="text-xs font-semibold text-ink-900">
                    Webcam Video Recorder
                  </h3>
                  <p className="text-[11px] text-ink-500 max-w-xs mx-auto">
                    Respondents can record up to {form.maxVideoDurationSeconds ?? 120} seconds directly in their browser.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                  >
                    <span>Start Recording</span>
                  </button>
                </div>
              )}

              {/* Audio Recording Placeholder Preview */}
              {activeTab === "audio" && allowAudio && (
                <div className="rounded-xl border border-dashed border-line bg-warm-50 p-6 text-center space-y-2">
                  <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
                    <Mic size={20} />
                  </div>
                  <h3 className="text-xs font-semibold text-ink-900">
                    Voice Note Recorder
                  </h3>
                  <p className="text-[11px] text-ink-500 max-w-xs mx-auto">
                    Respondents can record an audio snippet with noise cancellation.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                  >
                    <span>Record Audio</span>
                  </button>
                </div>
              )}

              {/* Star Rating Selector */}
              {form.collectRating && (
                <div className="text-center space-y-1.5 py-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Overall Rating {form.ratingRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="inline-flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
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
              )}

              {/* Testimonial Content (Text) */}
              {form.collectText && activeTab === "text" && (
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Your Testimonial {form.textRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={4}
                    required={form.textRequired}
                    placeholder="Write what you loved about working with us, key results achieved, or why you'd recommend our product..."
                    className="w-full rounded-xl border border-line p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Standard Respondent Fields */}
              <div className="space-y-3 pt-1 border-t border-line/60">
                <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  About You
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Name */}
                  {form.collectName && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 mb-1">
                        Your Full Name {form.nameRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={form.nameRequired}
                        placeholder="e.g. Jane Doe"
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Email */}
                  {form.collectEmail && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 mb-1">
                        Email Address {form.emailRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="email"
                        required={form.emailRequired}
                        placeholder="e.g. jane@company.com"
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Company */}
                  {form.collectCompany && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 mb-1">
                        Company Name {form.companyRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={form.companyRequired}
                        placeholder="e.g. Acme Studio"
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Job Title */}
                  {form.collectJobTitle && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 mb-1">
                        Job Title {form.jobTitleRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={form.jobTitleRequired}
                        placeholder="e.g. Head of Growth"
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Website */}
                  {form.collectWebsite && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-ink-800 mb-1">
                        Website or Social Profile {form.websiteRequired && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="url"
                        required={form.websiteRequired}
                        placeholder="https://company.com or @username"
                        className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>

                {/* Avatar / Photo Prompt */}
                {form.collectAvatar && (
                  <div className="rounded-xl border border-line bg-warm-50/60 p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-warm-200 text-ink-500 flex items-center justify-center shrink-0">
                        <User size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-ink-800 block text-xs">
                          Profile Photo (Optional)
                        </span>
                        <span className="text-[11px] text-ink-500">
                          Upload headshot or company avatar
                        </span>
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
                )}
              </div>

              {/* Custom Questions Section */}
              {form.fields && form.fields.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-line/60">
                  <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                    Additional Questions
                  </div>

                  {form.fields.map((field: FormFieldItem, idx: number) => {
                    const options = parseOptions(field.optionsJson);
                    return (
                      <div key={field.id || idx} className="space-y-1">
                        <label className="block text-xs font-semibold text-ink-900">
                          {field.label} {field.isRequired && <span className="text-rose-500">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-[11px] text-ink-500">
                            {field.description}
                          </p>
                        )}

                        {/* Short text */}
                        {field.type === "SHORT_TEXT" && (
                          <input
                            type="text"
                            required={field.isRequired}
                            placeholder={field.placeholder || "Your answer..."}
                            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}

                        {/* Long text */}
                        {field.type === "LONG_TEXT" && (
                          <textarea
                            rows={3}
                            required={field.isRequired}
                            placeholder={field.placeholder || "Enter detailed response..."}
                            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}

                        {/* Email */}
                        {field.type === "EMAIL" && (
                          <input
                            type="email"
                            required={field.isRequired}
                            placeholder={field.placeholder || "name@example.com"}
                            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}

                        {/* URL */}
                        {field.type === "URL" && (
                          <input
                            type="url"
                            required={field.isRequired}
                            placeholder={field.placeholder || "https://example.com"}
                            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}

                        {/* Single Choice */}
                        {field.type === "SINGLE_CHOICE" && (
                          <select
                            required={field.isRequired}
                            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          >
                            <option value="">Select an option...</option>
                            {options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Multiple Choice */}
                        {field.type === "MULTIPLE_CHOICE" && (
                          <div className="space-y-1.5 pt-1">
                            {options.map((opt, oIdx) => (
                              <label
                                key={oIdx}
                                className="flex items-center gap-2 text-xs text-ink-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Checkbox */}
                        {field.type === "CHECKBOX" && (
                          <label className="flex items-start gap-2 text-xs text-ink-700 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              required={field.isRequired}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-600 focus:ring-brand-500"
                            />
                            <span>{field.placeholder || "I agree to this condition"}</span>
                          </label>
                        )}

                        {/* Star Rating */}
                        {field.type === "STAR_RATING" && (
                          <div className="flex items-center gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setCustomRatings((prev) => ({
                                    ...prev,
                                    [idx]: star,
                                  }))
                                }
                                className="p-0.5 text-amber-400 focus:outline-none"
                              >
                                <Star
                                  size={18}
                                  className={cn(
                                    (customRatings[idx] || 0) >= star
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-ink-200 fill-transparent",
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Consent Checkbox */}
              {form.collectConsent && (
                <div className="pt-2 border-t border-line/60">
                  <label className="flex items-start gap-2.5 text-xs text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      required={form.consentRequired}
                      defaultChecked
                      className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                    />
                    <span className="leading-relaxed">
                      {form.consentText ||
                        "I grant permission to use my feedback, name, and submitted media for public marketing purposes."}{" "}
                      {form.consentRequired && (
                        <span className="text-rose-500">*</span>
                      )}
                    </span>
                  </label>
                </div>
              )}

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
