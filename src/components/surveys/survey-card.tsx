"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Heart,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import {
  SurveyDetail,
  FollowUpQuestion,
  SurveyType,
  validateScore,
  validateFollowUpAnswers,
} from "@/types/surveys";
import { cn } from "@/lib/utils";

export interface SurveyCardProps {
  survey: Partial<SurveyDetail>;
  onSubmitResponse?: (payload: {
    score: number;
    feedback?: string;
    answers: Record<string, any>;
    respondentName?: string;
    respondentEmail?: string;
    respondentCompany?: string;
  }) => Promise<{ success: boolean; error?: string } | void>;
  isPreview?: boolean;
  onPreviewReset?: () => void;
  className?: string;
}

export function SurveyCard({
  survey,
  onSubmitResponse,
  isPreview = false,
  onPreviewReset,
  className,
}: SurveyCardProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [writtenFeedback, setWrittenFeedback] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentCompany, setRespondentCompany] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const type = (survey.type as SurveyType) || "NPS";
  const accentColor = survey.accentColor || "#7049D8";
  const theme = survey.theme || "warm";

  const questions: FollowUpQuestion[] = useMemo(() => {
    return Array.isArray(survey.questions) ? survey.questions : [];
  }, [survey.questions]);

  // Handle follow-up answer updates
  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (questionId: string, option: string) => {
    const current: string[] = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    handleAnswerChange(questionId, next);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // 1. Validate primary score
    const scoreVal = validateScore(type, selectedScore);
    if (!scoreVal.isValid) {
      setFormError(scoreVal.error || "Please select a score rating.");
      return;
    }

    // 2. Validate written feedback if required
    if (survey.feedbackRequired && !writtenFeedback.trim()) {
      setFormError("Written feedback is required for this survey.");
      return;
    }

    // 3. Validate respondent fields if required
    if (survey.collectName && survey.nameRequired && !respondentName.trim()) {
      setFormError("Please enter your name.");
      return;
    }

    if (survey.collectEmail && survey.emailRequired) {
      if (!respondentEmail.trim()) {
        setFormError("Please enter your email.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(respondentEmail.trim())) {
        setFormError("Please enter a valid email address.");
        return;
      }
    }

    if (survey.collectCompany && survey.companyRequired && !respondentCompany.trim()) {
      setFormError("Please enter your company name.");
      return;
    }

    // 4. Validate follow-up questions
    const questionVal = validateFollowUpAnswers(questions, answers);
    if (!questionVal.isValid) {
      setFieldErrors(questionVal.errors);
      const firstError = Object.values(questionVal.errors)[0] || "Please complete all required questions.";
      setFormError(firstError);
      return;
    }

    if (isPreview) {
      // In builder preview mode, show immediate thank-you state
      setIsSubmitted(true);
      return;
    }

    if (onSubmitResponse && selectedScore !== null) {
      setIsSubmitting(true);
      try {
        const res = await onSubmitResponse({
          score: selectedScore,
          feedback: writtenFeedback.trim() || undefined,
          answers,
          respondentName: respondentName.trim() || undefined,
          respondentEmail: respondentEmail.trim() || undefined,
          respondentCompany: respondentCompany.trim() || undefined,
        });

        if (res && !res.success) {
          setFormError(res.error || "Failed to submit survey. Please try again.");
          return;
        }

        setIsSubmitted(true);
      } catch (err: any) {
        setFormError(err?.message || "An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Theme container classes
  const themeStyles = useMemo(() => {
    switch (theme) {
      case "dark":
        return {
          wrapper: "bg-zinc-950 text-zinc-100",
          card: "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl",
          input: "bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400",
          pill: "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200",
          label: "text-zinc-300",
          subtext: "text-zinc-400",
          border: "border-zinc-800",
        };
      case "midnight":
        return {
          wrapper: "bg-[#0B0F19] text-white",
          card: "bg-[#111827]/90 border-slate-800 text-white shadow-2xl backdrop-blur-md",
          input: "bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-400 focus:border-indigo-400",
          pill: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200",
          label: "text-slate-200",
          subtext: "text-slate-400",
          border: "border-slate-800",
        };
      case "emerald":
        return {
          wrapper: "bg-[#F0FDF4] text-emerald-950",
          card: "bg-white border-emerald-100 text-emerald-950 shadow-md",
          input: "bg-emerald-50/40 border-emerald-200 text-emerald-950 placeholder:text-emerald-700/50 focus:border-emerald-500",
          pill: "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900",
          label: "text-emerald-900",
          subtext: "text-emerald-700/80",
          border: "border-emerald-100",
        };
      case "minimal":
        return {
          wrapper: "bg-white text-black",
          card: "bg-white border-black/15 text-black shadow-none",
          input: "bg-white border-black/20 text-black placeholder:text-zinc-400 focus:border-black",
          pill: "bg-white hover:bg-zinc-100 border-zinc-300 text-black",
          label: "text-black",
          subtext: "text-zinc-600",
          border: "border-zinc-200",
        };
      case "light":
        return {
          wrapper: "bg-slate-50 text-slate-900",
          card: "bg-white border-slate-200 text-slate-900 shadow-sm",
          input: "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500",
          pill: "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800",
          label: "text-slate-800",
          subtext: "text-slate-500",
          border: "border-slate-200",
        };
      case "warm":
      default:
        return {
          wrapper: "bg-[#FAF7F2] text-zinc-900",
          card: "bg-white border-[#E8E2D9] text-zinc-900 shadow-sm",
          input: "bg-white border-[#DDD5C7] text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600",
          pill: "bg-[#F5EFEB] hover:bg-[#EBE2DB] border-[#DDD5C7] text-zinc-800",
          label: "text-zinc-800",
          subtext: "text-zinc-500",
          border: "border-[#E8E2D9]",
        };
    }
  }, [theme]);

  // Thank You Screen State
  if (isSubmitted) {
    return (
      <div
        className={cn(
          "w-full max-w-xl mx-auto rounded-2xl border p-8 text-center transition-all animate-in fade-in zoom-in-95 duration-200",
          themeStyles.card,
          className
        )}
      >
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-white shadow-md"
          style={{ backgroundColor: accentColor }}
        >
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          {survey.thankYouHeading || "Thank you for your feedback!"}
        </h2>
        <p className={cn("text-sm sm:text-base max-w-md mx-auto mb-6", themeStyles.subtext)}>
          {survey.thankYouMessage || "Your response helps us improve our product and service."}
        </p>

        {survey.redirectUrl && (
          <a
            href={survey.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <span>Continue</span>
            <ExternalLink size={14} />
          </a>
        )}

        {isPreview && (
          <div className="mt-8 pt-6 border-t border-dashed border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setSelectedScore(null);
                setWrittenFeedback("");
                setAnswers({});
                onPreviewReset?.();
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Reset Preview</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto rounded-2xl border p-6 sm:p-8 transition-all",
        themeStyles.card,
        className
      )}
    >
      {/* Brand Header */}
      {survey.customLogoUrl && (
        <div className="mb-6 flex items-center justify-center">
          <Image
            src={survey.customLogoUrl}
            alt="Brand Logo"
            width={160}
            height={40}
            unoptimized
            className="max-h-10 w-auto object-contain"
          />
        </div>
      )}

      {/* Welcome & Intro */}
      <div className="text-center mb-6">
        {survey.welcomeHeading && (
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5">
            {survey.welcomeHeading}
          </h1>
        )}
        {survey.welcomeText && (
          <p className={cn("text-xs sm:text-sm max-w-md mx-auto", themeStyles.subtext)}>
            {survey.welcomeText}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================================== */}
        {/* 1. PRIMARY SCORE SELECTION */}
        {/* =================================================================== */}
        <div className="space-y-3">
          <label className={cn("block text-sm sm:text-base font-semibold", themeStyles.label)}>
            {survey.primaryPrompt || "How likely are you to recommend us?"}
            <span className="text-rose-500 ml-1">*</span>
          </label>

          {/* NPS: 0 to 10 Scale */}
          {type === "NPS" && (
            <div className="space-y-2">
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                  const isSelected = selectedScore === score;
                  // Detractor: 0-6, Passive: 7-8, Promoter: 9-10
                  const isDetractor = score <= 6;
                  const isPassive = score === 7 || score === 8;
                  const isPromoter = score >= 9;

                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => {
                        setSelectedScore(score);
                        setFormError(null);
                      }}
                      className={cn(
                        "h-10 sm:h-11 rounded-lg border text-xs sm:text-sm font-bold transition-all focus:outline-none flex items-center justify-center",
                        isSelected
                          ? "text-white shadow-md scale-105"
                          : cn(themeStyles.pill, "hover:scale-102")
                      )}
                      style={{
                        backgroundColor: isSelected
                          ? isPromoter
                            ? "#10B981"
                            : isPassive
                            ? "#F59E0B"
                            : "#EF4444"
                          : undefined,
                        borderColor: isSelected
                          ? isPromoter
                            ? "#10B981"
                            : isPassive
                            ? "#F59E0B"
                            : "#EF4444"
                          : undefined,
                      }}
                      aria-label={`Score ${score} out of 10`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[11px] font-medium px-1 text-zinc-400">
                <span>{survey.scoringConfig?.minLabel || "0 = Not likely at all"}</span>
                <span>{survey.scoringConfig?.maxLabel || "10 = Extremely likely"}</span>
              </div>
            </div>
          )}

          {/* CSAT: 1 to 5 Satisfaction Scale */}
          {type === "CSAT" && (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { score: 1, emoji: "😠", text: "Very Dissatisfied" },
                  { score: 2, emoji: "🙁", text: "Dissatisfied" },
                  { score: 3, emoji: "😐", text: "Neutral" },
                  { score: 4, emoji: "🙂", text: "Satisfied" },
                  { score: 5, emoji: "🤩", text: "Very Satisfied" },
                ].map((item) => {
                  const isSelected = selectedScore === item.score;
                  return (
                    <button
                      key={item.score}
                      type="button"
                      onClick={() => {
                        setSelectedScore(item.score);
                        setFormError(null);
                      }}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center focus:outline-none",
                        isSelected
                          ? "border-transparent text-white shadow-md scale-105"
                          : cn(themeStyles.pill, "hover:scale-102")
                      )}
                      style={{
                        backgroundColor: isSelected ? accentColor : undefined,
                      }}
                    >
                      <span className="text-xl sm:text-2xl">{item.emoji}</span>
                      <span className="text-[10px] sm:text-xs font-semibold leading-tight line-clamp-1">
                        {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CES: 1 to 7 Customer Effort Score */}
          {type === "CES" && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((score) => {
                  const isSelected = selectedScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => {
                        setSelectedScore(score);
                        setFormError(null);
                      }}
                      className={cn(
                        "h-10 sm:h-12 rounded-xl border text-sm sm:text-base font-bold transition-all focus:outline-none flex items-center justify-center",
                        isSelected
                          ? "text-white shadow-md scale-105"
                          : cn(themeStyles.pill, "hover:scale-102")
                      )}
                      style={{
                        backgroundColor: isSelected ? accentColor : undefined,
                        borderColor: isSelected ? accentColor : undefined,
                      }}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[11px] font-medium px-1 text-zinc-400">
                <span>{survey.scoringConfig?.minLabel || "1 = Strongly Disagree"}</span>
                <span>{survey.scoringConfig?.maxLabel || "7 = Strongly Agree"}</span>
              </div>
            </div>
          )}

          {/* FIVE_STAR: 1 to 5 Stars */}
          {type === "FIVE_STAR" && (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoveredStar ?? selectedScore ?? 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      onClick={() => {
                        setSelectedScore(star);
                        setFormError(null);
                      }}
                      className="p-1.5 rounded-lg transition-transform hover:scale-115 focus:outline-none"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        size={32}
                        className={cn(
                          "transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                            : "text-zinc-300 dark:text-zinc-600"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-semibold text-zinc-500">
                {selectedScore ? `${selectedScore} of 5 Stars` : "Select a rating"}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 2. WRITTEN FEEDBACK (Optional or Required) */}
        {/* =================================================================== */}
        <div className="space-y-2">
          <label className={cn("block text-xs sm:text-sm font-semibold", themeStyles.label)}>
            {survey.feedbackPrompt || "What is the primary reason for your score?"}
            {survey.feedbackRequired ? (
              <span className="text-rose-500 ml-1">*</span>
            ) : (
              <span className="text-[11px] font-normal text-zinc-400 ml-1.5">(Optional)</span>
            )}
          </label>
          <textarea
            value={writtenFeedback}
            onChange={(e) => setWrittenFeedback(e.target.value)}
            rows={3}
            placeholder="Share your thoughts, experiences, or recommendations..."
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all resize-y",
              themeStyles.input
            )}
          />
        </div>

        {/* =================================================================== */}
        {/* 3. CUSTOM FOLLOW-UP QUESTIONS */}
        {/* =================================================================== */}
        {questions.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
            {questions.map((q) => {
              const val = answers[q.id];
              const error = fieldErrors[q.id];

              return (
                <div key={q.id} className="space-y-1.5">
                  <label
                    className={cn(
                      "block text-xs sm:text-sm font-semibold",
                      themeStyles.label,
                      error && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {q.label}
                    {q.isRequired ? (
                      <span className="text-rose-500 ml-1">*</span>
                    ) : (
                      <span className="text-[11px] font-normal text-zinc-400 ml-1.5">(Optional)</span>
                    )}
                  </label>
                  {q.description && (
                    <p className={cn("text-[11px]", themeStyles.subtext)}>{q.description}</p>
                  )}

                  {/* Question Type: TEXT */}
                  {q.type === "TEXT" && (
                    <input
                      type="text"
                      value={val || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder || "Enter your answer..."}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-xs sm:text-sm outline-none transition-all",
                        themeStyles.input,
                        error && "border-rose-500 focus:border-rose-500"
                      )}
                    />
                  )}

                  {/* Question Type: LONG_TEXT */}
                  {q.type === "LONG_TEXT" && (
                    <textarea
                      value={val || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={q.placeholder || "Enter your detailed thoughts..."}
                      rows={3}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-xs sm:text-sm outline-none transition-all resize-y",
                        themeStyles.input,
                        error && "border-rose-500 focus:border-rose-500"
                      )}
                    />
                  )}

                  {/* Question Type: SINGLE_CHOICE */}
                  {q.type === "SINGLE_CHOICE" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = val === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={cn(
                              "px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all",
                              isSelected
                                ? "border-transparent text-white shadow-2xs font-semibold"
                                : themeStyles.pill
                            )}
                            style={{
                              backgroundColor: isSelected ? accentColor : undefined,
                            }}
                          >
                            <span className="truncate">{opt}</span>
                            {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Type: MULTIPLE_CHOICE */}
                  {q.type === "MULTIPLE_CHOICE" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = Array.isArray(val) && val.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleCheckboxToggle(q.id, opt)}
                            className={cn(
                              "px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all",
                              isSelected
                                ? "border-transparent text-white shadow-2xs font-semibold"
                                : themeStyles.pill
                            )}
                            style={{
                              backgroundColor: isSelected ? accentColor : undefined,
                            }}
                          >
                            <span className="truncate">{opt}</span>
                            {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Type: RATING */}
                  {q.type === "RATING" && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {Array.from({ length: (q.maxRating || 5) - (q.minRating || 1) + 1 }).map(
                        (_, i) => {
                          const ratingNum = (q.minRating || 1) + i;
                          const isSelected = val === ratingNum;
                          return (
                            <button
                              key={ratingNum}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, ratingNum)}
                              className={cn(
                                "w-10 h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center",
                                isSelected
                                  ? "border-transparent text-white shadow-sm"
                                  : themeStyles.pill
                              )}
                              style={{
                                backgroundColor: isSelected ? accentColor : undefined,
                              }}
                            >
                              {ratingNum}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Question Type: BOOLEAN */}
                  {q.type === "BOOLEAN" && (
                    <div className="flex items-center gap-2 pt-1">
                      {[
                        { label: "Yes", value: true },
                        { label: "No", value: false },
                      ].map((item) => {
                        const isSelected = val === item.value;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, item.value)}
                            className={cn(
                              "px-5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5",
                              isSelected
                                ? "border-transparent text-white shadow-sm"
                                : themeStyles.pill
                            )}
                            style={{
                              backgroundColor: isSelected ? accentColor : undefined,
                            }}
                          >
                            <span>{item.label}</span>
                            {isSelected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Type: DROPDOWN */}
                  {q.type === "DROPDOWN" && q.options && (
                    <div className="relative">
                      <select
                        value={val || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2 text-xs sm:text-sm outline-none transition-all appearance-none cursor-pointer",
                          themeStyles.input,
                          error && "border-rose-500"
                        )}
                      >
                        <option value="">Select an option...</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"
                      />
                    </div>
                  )}

                  {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. RESPONDENT DETAILS (Optional or Required) */}
        {/* =================================================================== */}
        {(survey.collectName || survey.collectEmail || survey.collectCompany) && (
          <div className="space-y-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
            <h3 className={cn("text-xs font-bold uppercase tracking-wider", themeStyles.subtext)}>
              Your Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {survey.collectName && (
                <div className="space-y-1">
                  <label className={cn("block text-[11px] font-semibold", themeStyles.label)}>
                    Full Name {survey.nameRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Jane Doe"
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-xs outline-none transition-all",
                      themeStyles.input
                    )}
                  />
                </div>
              )}

              {survey.collectEmail && (
                <div className="space-y-1">
                  <label className={cn("block text-[11px] font-semibold", themeStyles.label)}>
                    Email Address {survey.emailRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-xs outline-none transition-all",
                      themeStyles.input
                    )}
                  />
                </div>
              )}

              {survey.collectCompany && (
                <div className="space-y-1 sm:col-span-2">
                  <label className={cn("block text-[11px] font-semibold", themeStyles.label)}>
                    Company / Organization{" "}
                    {survey.companyRequired && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={respondentCompany}
                    onChange={(e) => setRespondentCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-xs outline-none transition-all",
                      themeStyles.input
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Validation Error Message */}
        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold animate-in fade-in duration-150">
            {formError}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            style={{ backgroundColor: accentColor }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting feedback...</span>
              </>
            ) : (
              <>
                <span>Submit Response</span>
              </>
            )}
          </button>
        </div>

        {/* Powered by Praise branding */}
        {survey.showBranding && (
          <div className="pt-2 text-center">
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
              <span>Powered by</span>
              <span className="font-bold text-zinc-600 dark:text-zinc-300">Praise</span>
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
