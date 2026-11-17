"use client";

import { useState } from "react";
import Link from "next/link";
import { SurveyDetail } from "@/types/surveys";
import { SurveyCard } from "@/components/surveys/survey-card";
import { cn } from "@/lib/utils";
import { AlertCircle, PauseCircle } from "lucide-react";

interface PublicSurveyClientProps {
  initialSurvey: SurveyDetail;
}

export function PublicSurveyClient({ initialSurvey }: PublicSurveyClientProps) {
  const [survey] = useState<SurveyDetail>(initialSurvey);

  // Background theme wrapper classes
  const themeBg = (() => {
    switch (survey.theme) {
      case "dark":
        return "bg-zinc-950 text-zinc-100";
      case "midnight":
        return "bg-[#0B0F19] text-white";
      case "emerald":
        return "bg-[#F0FDF4] text-emerald-950";
      case "minimal":
        return "bg-zinc-50 text-black";
      case "light":
        return "bg-slate-50 text-slate-900";
      case "warm":
      default:
        return "bg-[#FAF7F2] text-zinc-900";
    }
  })();

  const handleSubmitResponse = async (payload: {
    score: number;
    feedback?: string;
    answers: Record<string, any>;
    respondentName?: string;
    respondentEmail?: string;
    respondentCompany?: string;
  }) => {
    const res = await fetch(`/api/public/surveys/${survey.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to submit survey." };
    }

    return { success: true };
  };

  // Paused or Closed state handling
  if (survey.status !== "ACTIVE") {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4", themeBg)}>
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-lg">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 mb-4">
            <PauseCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
            {survey.status === "PAUSED" ? "Survey Paused" : "Survey Closed"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {survey.status === "PAUSED"
              ? "This survey is currently paused and is not taking responses at this time."
              : "This survey has concluded. Thank you for your interest."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6", themeBg)}>
      <div className="flex-1 flex items-center justify-center">
        <SurveyCard survey={survey} onSubmitResponse={handleSubmitResponse} />
      </div>

      {survey.showBranding && (
        <footer className="mt-8 text-center text-xs text-zinc-400">
          <span>Powered by </span>
          <Link
            href="/"
            className="font-semibold text-zinc-600 dark:text-zinc-300 hover:underline"
          >
            Praise
          </Link>
          <span> · The Social Proof & Feedback Platform</span>
        </footer>
      )}
    </div>
  );
}
