"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Mail,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import { CaseStudyFormDetail, MeasurableOutcome } from "@/lib/case-studies/types";
import { cn } from "@/lib/utils";

type PublicCaseStudyFormProps = {
  form: CaseStudyFormDetail & {
    workspaceName?: string;
  };
  isPreview?: boolean;
};

export function PublicCaseStudyForm({ form, isPreview = false }: PublicCaseStudyFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerRole, setCustomerRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("11-50 employees");
  const [companyIndustry, setCompanyIndustry] = useState("Software / SaaS");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [initialProblem, setInitialProblem] = useState("");
  const [previousSolution, setPreviousSolution] = useState("");
  const [productImplementation, setProductImplementation] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [resultsAchieved, setResultsAchieved] = useState("");

  // Measurable Outcomes List
  const [measurableOutcomes, setMeasurableOutcomes] = useState<MeasurableOutcome[]>([
    { id: "outcome-1", metric: "", before: "", after: "", improvement: "", timeframe: "" },
  ]);

  const [primaryQuote, setPrimaryQuote] = useState("");
  const [peerAdvice, setPeerAdvice] = useState("");

  // Media
  const [uploadedImageIds, setUploadedImageIds] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Consent
  const [consentGranted, setConsentGranted] = useState(false);

  const q = form.questionsConfig;

  // Compute active steps based on form toggles
  const steps: { id: string; label: string }[] = [];
  steps.push({ id: "intro", label: "Overview" });
  if (form.collectCustomerBackground || form.collectCompanyRole) {
    steps.push({ id: "background", label: "Profile" });
  }
  if (form.collectInitialProblem || form.collectPreviousSolution) {
    steps.push({ id: "challenge", label: "Challenge" });
  }
  if (form.collectProductImplementation || form.collectExperience) {
    steps.push({ id: "implementation", label: "Solution" });
  }
  if (form.collectResultsAchieved || form.collectMeasurableOutcomes) {
    steps.push({ id: "results", label: "Outcomes" });
  }
  if (form.collectQuotes || form.allowImages || form.allowVideo) {
    steps.push({ id: "media", label: "Proof & Quotes" });
  }
  if (form.collectConsent) {
    steps.push({ id: "consent", label: "Review & Sign" });
  }

  const activeStepId = steps[currentStep]?.id || "intro";

  // Outcomes helper
  const handleAddOutcome = () => {
    setMeasurableOutcomes((prev) => [
      ...prev,
      {
        id: `outcome-${Date.now().toString().slice(-4)}`,
        metric: "",
        before: "",
        after: "",
        improvement: "",
        timeframe: "",
      },
    ]);
  };

  const handleUpdateOutcome = (index: number, field: keyof MeasurableOutcome, val: string) => {
    setMeasurableOutcomes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveOutcome = (index: number) => {
    setMeasurableOutcomes((prev) => prev.filter((_, i) => i !== index));
  };

  // Image Upload handler
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isPreview) {
      const fakeUrl = URL.createObjectURL(files[0]);
      setUploadedImageIds((prev) => [...prev, `preview-img-${Date.now()}`]);
      setUploadedImageUrls((prev) => [...prev, fakeUrl]);
      return;
    }

    setIsUploadingMedia(true);
    setErrorMessage(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");

        const res = await fetch(`/api/public/case-studies/${form.slug}/media/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to upload image");
        }

        const data = await res.json();
        setUploadedImageIds((prev) => [...prev, data.assetId]);
        setUploadedImageUrls((prev) => [...prev, data.url]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload image.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Video Upload handler
  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPreview) {
      const fakeUrl = URL.createObjectURL(file);
      setUploadedVideoId(`preview-vid-${Date.now()}`);
      setUploadedVideoUrl(fakeUrl);
      return;
    }

    setIsUploadingMedia(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");

      const res = await fetch(`/api/public/case-studies/${form.slug}/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload video");
      }

      const data = await res.json();
      setUploadedVideoId(data.assetId);
      setUploadedVideoUrl(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload video response.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Submission handler
  const handleSubmit = async () => {
    if (isPreview) {
      setIsSubmitted(true);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!customerName.trim()) {
        throw new Error("Your name is required.");
      }
      if (!customerEmail.trim() || !customerEmail.includes("@")) {
        throw new Error("A valid email address is required.");
      }
      if (!companyName.trim()) {
        throw new Error("Company name is required.");
      }
      if (form.collectInitialProblem && !initialProblem.trim()) {
        throw new Error("Please complete the initial problem description.");
      }
      if (form.collectResultsAchieved && !resultsAchieved.trim()) {
        throw new Error("Please describe the business results achieved.");
      }
      if (form.collectConsent && form.consentRequired && !consentGranted) {
        throw new Error("You must grant publication consent to submit.");
      }

      // Filter non-empty outcomes
      const validOutcomes = measurableOutcomes.filter(
        (o) => o.metric.trim() && o.improvement.trim()
      );

      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerRole: customerRole.trim() || null,
        companyName: companyName.trim(),
        companySize: companySize || null,
        companyIndustry: companyIndustry || null,
        companyWebsite: companyWebsite.trim() || null,
        avatarUrl: avatarUrl.trim() || null,

        initialProblem: initialProblem.trim(),
        previousSolution: previousSolution.trim() || null,
        productImplementation: productImplementation.trim() || null,
        experienceSummary: experienceSummary.trim() || null,
        resultsAchieved: resultsAchieved.trim(),
        measurableOutcomes: validOutcomes,
        primaryQuote: primaryQuote.trim() || null,
        peerAdvice: peerAdvice.trim() || null,
        imageAssetIds: uploadedImageIds,
        videoAssetId: uploadedVideoId,

        consentGranted,
        consentText: form.consentText,
      };

      const res = await fetch(`/api/public/case-studies/${form.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit case study.");
      }

      setIsSubmitted(true);
      if (form.redirectUrl) {
        setTimeout(() => {
          window.location.href = form.redirectUrl!;
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme styling helpers
  const theme = form.theme || "warm";
  const bgClasses = {
    warm: "bg-warm-50 text-ink-900",
    light: "bg-slate-50 text-slate-900",
    dark: "bg-neutral-950 text-white",
    emerald: "bg-emerald-950 text-emerald-50",
    midnight: "bg-slate-950 text-slate-100",
  }[theme] || "bg-warm-50 text-ink-900";

  const cardClasses = {
    warm: "bg-white border-line text-ink-900 shadow-sm",
    light: "bg-white border-slate-200 text-slate-900 shadow-sm",
    dark: "bg-neutral-900 border-neutral-800 text-white shadow-xl",
    emerald: "bg-emerald-900/40 border-emerald-800 text-white shadow-xl backdrop-blur-md",
    midnight: "bg-slate-900/60 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md",
  }[theme] || "bg-white border-line text-ink-900 shadow-sm";

  const inputClasses = {
    warm: "border-line bg-white text-ink-900 focus:border-brand-500 focus:ring-brand-500/20",
    light: "border-slate-300 bg-white text-slate-900 focus:border-indigo-600 focus:ring-indigo-500/20",
    dark: "border-neutral-700 bg-neutral-800 text-white focus:border-brand-400 focus:ring-brand-400/20",
    emerald: "border-emerald-700 bg-emerald-950/60 text-white focus:border-emerald-400",
    midnight: "border-slate-700 bg-slate-800 text-white focus:border-indigo-400",
  }[theme] || "border-line bg-white text-ink-900";

  const isDarkMode = theme === "dark" || theme === "emerald" || theme === "midnight";

  if (isSubmitted) {
    return (
      <div className={cn("min-h-screen py-16 px-4 flex items-center justify-center", bgClasses)}>
        <div className={cn("w-full max-w-xl rounded-3xl border p-8 sm:p-12 text-center space-y-6", cardClasses)}>
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: form.accentColor }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {form.thankYouHeading || "Thank You for Sharing Your Story!"}
            </h2>
            <p className={cn("text-sm max-w-md mx-auto leading-relaxed", isDarkMode ? "text-neutral-300" : "text-ink-600")}>
              {form.thankYouText || "We appreciate your time and transparency. We will review your submission shortly."}
            </p>
          </div>

          {form.redirectUrl && (
            <p className="text-xs text-brand-600 animate-pulse font-medium">
              Redirecting you in a moment...
            </p>
          )}

          {isPreview && (
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setCurrentStep(0);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold underline text-brand-500 hover:text-brand-600"
            >
              Reset Preview
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen py-8 sm:py-16 px-4", bgClasses)}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Branding */}
        <div className="text-center space-y-3">
          {form.customLogoUrl && (
            <div className="flex justify-center mb-4">
              <Image
                src={form.customLogoUrl}
                alt={form.title}
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
                unoptimized
              />
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/50 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600">
            <Sparkles size={13} />
            <span>Customer Case Study</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {form.title}
          </h1>

          {form.description && (
            <p className={cn("text-xs sm:text-sm max-w-xl mx-auto", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
              {form.description}
            </p>
          )}
        </div>

        {/* Step Progress Pills */}
        {steps.length > 1 && (
          <div className="flex items-center justify-between gap-1 max-w-md mx-auto pt-2">
            {steps.map((s, idx) => (
              <div
                key={s.id}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer"
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
              >
                <div
                  className={cn(
                    "w-full h-1.5 rounded-full transition-all duration-300",
                    idx === currentStep
                      ? "bg-brand-500"
                      : idx < currentStep
                      ? "bg-brand-500/50"
                      : isDarkMode
                      ? "bg-neutral-800"
                      : "bg-warm-200"
                  )}
                  style={idx === currentStep ? { backgroundColor: form.accentColor } : {}}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold hidden sm:inline",
                    idx === currentStep
                      ? isDarkMode
                        ? "text-white"
                        : "text-ink-900"
                      : isDarkMode
                      ? "text-neutral-500"
                      : "text-ink-400"
                  )}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Main Card */}
        <div className={cn("rounded-3xl border p-6 sm:p-10 transition-all duration-300", cardClasses)}>
          {/* STEP 0: Welcome / Context */}
          {activeStepId === "intro" && (
            <div className="space-y-6 text-center py-6">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: form.accentColor }}
              >
                <TrendingUp size={30} />
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {form.welcomeHeading || "Share Your Success Story"}
                </h2>
                <p className={cn("text-xs sm:text-sm leading-relaxed", isDarkMode ? "text-neutral-300" : "text-ink-600")}>
                  {form.welcomeText || "Help others understand how our product helped your team achieve real results."}
                </p>
              </div>

              <div className={cn("rounded-2xl border p-4 text-left space-y-2 text-xs", isDarkMode ? "border-neutral-800 bg-neutral-900/60" : "border-warm-200 bg-warm-50")}>
                <div className="font-bold flex items-center gap-1.5 text-brand-600">
                  <ShieldCheck size={15} />
                  <span>Transparent & Authentic Proof</span>
                </div>
                <p className={cn("text-[11px] leading-relaxed", isDarkMode ? "text-neutral-400" : "text-ink-600")}>
                  This case study is published under your explicit consent. Your original statements, challenges, and measurable results will remain faithfully represented. You can upload visual screenshots or video walkthroughs to showcase your success.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all"
                  style={{ backgroundColor: form.accentColor }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Customer & Company Profile */}
          {activeStepId === "background" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <User size={18} className="text-brand-500" />
                  <span>{q.customerBackground.title || "About You & Your Company"}</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  {q.customerBackground.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="elena@company.com"
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Job Title / Role</label>
                  <input
                    type="text"
                    value={customerRole}
                    onChange={(e) => setCustomerRole(e.target.value)}
                    placeholder="e.g. VP of Product"
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Cloud Systems"
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Company Website</label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                  >
                    <option value="1-10 employees">1-10 employees</option>
                    <option value="11-50 employees">11-50 employees</option>
                    <option value="51-200 employees">51-200 employees</option>
                    <option value="201-1000 employees">201-1000 employees</option>
                    <option value="1000+ employees">1000+ employees</option>
                  </select>
                </div>
              </div>

              {/* Avatar Image URL or Quick input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Profile Photo / Avatar URL (optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className={cn("w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none", inputClasses)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: The Challenge (Problem & Previous Solutions) */}
          {activeStepId === "challenge" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building size={18} className="text-rose-500" />
                  <span>{q.initialProblem.title || "The Initial Challenge"}</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  {q.initialProblem.description}
                </p>
              </div>

              {form.collectInitialProblem && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {q.initialProblem.promptText || "What specific obstacle or challenge did you face?"} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={initialProblem}
                    onChange={(e) => setInitialProblem(e.target.value)}
                    placeholder={q.initialProblem.placeholderText || "Describe your bottlenecks or lost opportunities before finding our product."}
                    className={cn("w-full rounded-xl border p-3.5 text-xs outline-none leading-relaxed", inputClasses)}
                  />
                </div>
              )}

              {form.collectPreviousSolution && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {q.previousSolution.promptText || "What tools or manual workflows did you try previously?"}
                  </label>
                  <textarea
                    rows={3}
                    value={previousSolution}
                    onChange={(e) => setPreviousSolution(e.target.value)}
                    placeholder={q.previousSolution.placeholderText || "e.g. We tried legacy spreadsheets or competitors, but lacked scalability and automation."}
                    className={cn("w-full rounded-xl border p-3.5 text-xs outline-none leading-relaxed", inputClasses)}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Implementation & Product Experience */}
          {activeStepId === "implementation" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <span>{q.productImplementation.title || "Implementation & Rollout"}</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  {q.productImplementation.description}
                </p>
              </div>

              {form.collectProductImplementation && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {q.productImplementation.promptText || "How did your team roll out and integrate the product?"}
                  </label>
                  <textarea
                    rows={3}
                    value={productImplementation}
                    onChange={(e) => setProductImplementation(e.target.value)}
                    placeholder={q.productImplementation.placeholderText || "Describe how long rollout took, team onboarding, or ease of integration."}
                    className={cn("w-full rounded-xl border p-3.5 text-xs outline-none leading-relaxed", inputClasses)}
                  />
                </div>
              )}

              {form.collectExperience && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {q.experience.promptText || "What has been the day-to-day experience for your team?"}
                  </label>
                  <textarea
                    rows={3}
                    value={experienceSummary}
                    onChange={(e) => setExperienceSummary(e.target.value)}
                    placeholder={q.experience.placeholderText || "Explain usability, developer experience, or how your team's workflow improved."}
                    className={cn("w-full rounded-xl border p-3.5 text-xs outline-none leading-relaxed", inputClasses)}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Results & Measurable Outcomes */}
          {activeStepId === "results" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  <span>{q.resultsAchieved.title || "Business Results Achieved"}</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  {q.resultsAchieved.description}
                </p>
              </div>

              {form.collectResultsAchieved && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">
                    {q.resultsAchieved.promptText || "What major business results or strategic impact did you achieve?"} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={resultsAchieved}
                    onChange={(e) => setResultsAchieved(e.target.value)}
                    placeholder={q.resultsAchieved.placeholderText || "Describe qualitative and strategic achievements (e.g. accelerated deal cycles, happier team, higher customer trust)."}
                    className={cn("w-full rounded-xl border p-3.5 text-xs outline-none leading-relaxed", inputClasses)}
                  />
                </div>
              )}

              {/* Measurable Outcomes Array */}
              {form.collectMeasurableOutcomes && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600">
                        {q.measurableOutcomes.title || "Measurable Outcomes & Metrics"}
                      </h3>
                      <p className={cn("text-[11px]", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                        Add quantifiable metrics (e.g. % increase, hours saved, dollars saved, multiplier).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOutcome}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100"
                    >
                      <Plus size={13} />
                      <span>Add Metric</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {measurableOutcomes.map((outcome, idx) => (
                      <div
                        key={outcome.id || idx}
                        className={cn("rounded-2xl border p-3.5 space-y-3", isDarkMode ? "border-neutral-800 bg-neutral-900/60" : "border-line bg-warm-50/50")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-ink-500">Metric #{idx + 1}</span>
                          {measurableOutcomes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOutcome(idx)}
                              className="text-ink-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-ink-700">Metric Name</label>
                            <input
                              type="text"
                              value={outcome.metric}
                              onChange={(e) => handleUpdateOutcome(idx, "metric", e.target.value)}
                              placeholder="e.g. Trial-to-Paid Conversion"
                              className={cn("w-full rounded-xl border px-3 py-1.5 text-xs outline-none", inputClasses)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-emerald-700">Improvement / Delta</label>
                            <input
                              type="text"
                              value={outcome.improvement}
                              onChange={(e) => handleUpdateOutcome(idx, "improvement", e.target.value)}
                              placeholder="e.g. +145% or 3x"
                              className={cn("w-full rounded-xl border px-3 py-1.5 text-xs font-bold text-emerald-700 outline-none", inputClasses)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-ink-600">Before (Optional)</label>
                            <input
                              type="text"
                              value={outcome.before || ""}
                              onChange={(e) => handleUpdateOutcome(idx, "before", e.target.value)}
                              placeholder="e.g. 2.1%"
                              className={cn("w-full rounded-xl border px-3 py-1.5 text-xs outline-none", inputClasses)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-ink-600">After (Optional)</label>
                            <input
                              type="text"
                              value={outcome.after || ""}
                              onChange={(e) => handleUpdateOutcome(idx, "after", e.target.value)}
                              placeholder="e.g. 5.2%"
                              className={cn("w-full rounded-xl border px-3 py-1.5 text-xs outline-none", inputClasses)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-ink-600">Timeframe (Optional)</label>
                            <input
                              type="text"
                              value={outcome.timeframe || ""}
                              onChange={(e) => handleUpdateOutcome(idx, "timeframe", e.target.value)}
                              placeholder="e.g. Within 60 days"
                              className={cn("w-full rounded-xl border px-3 py-1.5 text-xs outline-none", inputClasses)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Quotes & Visual Proof / Media */}
          {activeStepId === "media" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Quote size={18} className="text-brand-500" />
                  <span>{q.quotes.title || "Quotes & Supporting Evidence"}</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  {q.quotes.description}
                </p>
              </div>

              {form.collectQuotes && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">
                      Headline Quote / Executive Takeaway
                    </label>
                    <textarea
                      rows={2}
                      value={primaryQuote}
                      onChange={(e) => setPrimaryQuote(e.target.value)}
                      placeholder={q.quotes.placeholderText || "A memorable one-sentence pull quote summarizing your experience."}
                      className={cn("w-full rounded-xl border p-3 text-xs outline-none leading-relaxed", inputClasses)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">
                      Advice for Peers / Other Leaders
                    </label>
                    <textarea
                      rows={2}
                      value={peerAdvice}
                      onChange={(e) => setPeerAdvice(e.target.value)}
                      placeholder="What recommendation would you give to someone facing the same problem?"
                      className={cn("w-full rounded-xl border p-3 text-xs outline-none leading-relaxed", inputClasses)}
                    />
                  </div>
                </div>
              )}

              {/* Image Uploads */}
              {form.allowImages && (
                <div className="space-y-2.5 pt-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-brand-600" />
                    <span>Upload Supporting Screenshots, Diagrams, or Charts</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className={cn("flex flex-col items-center justify-center w-36 h-24 border-2 border-dashed rounded-2xl cursor-pointer hover:border-brand-500 transition-colors", isDarkMode ? "border-neutral-700 bg-neutral-900/40" : "border-line bg-warm-50")}>
                      <Upload size={20} className="text-ink-400 mb-1" />
                      <span className="text-[10px] font-semibold text-ink-600">Select Images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleUploadImage}
                        disabled={isUploadingMedia}
                        className="hidden"
                      />
                    </label>

                    {uploadedImageUrls.map((url, idx) => (
                      <div key={idx} className="relative w-36 h-24 rounded-2xl overflow-hidden border border-line group">
                        <Image
                          src={url}
                          alt="Supporting screenshot"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImageUrls((p) => p.filter((_, i) => i !== idx));
                            setUploadedImageIds((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Response */}
              {form.allowVideo && (
                <div className="space-y-2.5 pt-2">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Video size={14} className="text-indigo-600" />
                    <span>Video Response (Optional video testimonial or clip)</span>
                  </label>

                  {uploadedVideoUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-line max-w-sm">
                      <video src={uploadedVideoUrl} controls className="w-full h-auto max-h-48 rounded-xl" />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedVideoUrl(null);
                          setUploadedVideoId(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-md text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <label className={cn("flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer hover:border-brand-500 transition-colors max-w-sm", isDarkMode ? "border-neutral-700 bg-neutral-900/40" : "border-line bg-warm-50")}>
                      <Video size={24} className="text-indigo-500 mb-1" />
                      <span className="text-xs font-semibold">Attach Video File</span>
                      <span className="text-[10px] text-ink-500 mt-0.5">MP4, WebM or MOV up to 100MB</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleUploadVideo}
                        disabled={isUploadingMedia}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Consent & Final Confirmation */}
          {activeStepId === "consent" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>Review & Consent</span>
                </h2>
                <p className={cn("text-xs mt-1", isDarkMode ? "text-neutral-400" : "text-ink-500")}>
                  Please review your submission and confirm your publication authorization.
                </p>
              </div>

              {/* Summary preview of what's being submitted */}
              <div className={cn("rounded-2xl border p-4 space-y-3 text-xs", isDarkMode ? "border-neutral-800 bg-neutral-900/60" : "border-line bg-warm-50/50")}>
                <div className="font-bold text-ink-900 flex items-center justify-between">
                  <span>{companyName || "Your Company"} Case Study</span>
                  <span className="text-[10px] text-ink-500 font-normal">By {customerName || "You"} ({customerRole || "Role"})</span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-ink-700">Challenge:</div>
                  <p className="text-[11px] line-clamp-2 text-ink-600">{initialProblem || "No problem stated"}</p>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-700">Results:</div>
                  <p className="text-[11px] line-clamp-2 text-ink-600">{resultsAchieved || "No results stated"}</p>
                </div>

                {measurableOutcomes.filter((o) => o.metric.trim()).length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-2">
                    {measurableOutcomes
                      .filter((o) => o.metric.trim())
                      .map((o, idx) => (
                        <span key={idx} className="rounded-lg bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">
                          {o.metric}: {o.improvement}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Consent Checkbox */}
              {form.collectConsent && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGranted}
                      onChange={(e) => setConsentGranted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-brand-900">
                        Publication Permission & Marketing Consent {form.consentRequired && <span className="text-rose-500">*</span>}
                      </span>
                      <p className="text-[11px] leading-relaxed text-brand-800">
                        {form.consentText || "I grant permission to publish this case study, business results, and company quotes for marketing purposes."}
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 pt-4 border-t border-line flex items-center justify-between gap-3">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                style={{ backgroundColor: form.accentColor }}
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (form.consentRequired && !consentGranted)}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all disabled:opacity-50"
                style={{ backgroundColor: form.accentColor }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Submit Case Study</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        {form.showBranding && (
          <div className="text-center text-[11px] text-ink-400">
            Powered by <strong>Praise</strong> • Authentic Social Proof & Case Studies
          </div>
        )}
      </div>
    </div>
  );
}
