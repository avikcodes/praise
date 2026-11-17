"use client";

import { useEffect, useRef } from "react";
import { SurveyDetail } from "@/types/surveys";
import { SurveyCard } from "@/components/surveys/survey-card";

interface EmbeddedSurveyClientProps {
  survey: SurveyDetail;
}

export function EmbeddedSurveyClient({ survey }: EmbeddedSurveyClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize postMessage to parent container
  useEffect(() => {
    const notifyHeight = () => {
      if (!containerRef.current) return;
      const height = containerRef.current.offsetHeight;
      try {
        window.parent.postMessage(
          {
            type: "PRAISE_SURVEY_RESIZE",
            surveyId: survey.id,
            height,
          },
          "*"
        );
      } catch {}
    };

    notifyHeight();
    const ro = new ResizeObserver(notifyHeight);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => ro.disconnect();
  }, [survey.id]);

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

    try {
      window.parent.postMessage(
        {
          type: "PRAISE_SURVEY_SUBMITTED",
          surveyId: survey.id,
          responseId: data.responseId,
          score: payload.score,
        },
        "*"
      );
    } catch {}

    return { success: true };
  };

  return (
    <div ref={containerRef} className="w-full p-2 sm:p-4 bg-transparent flex justify-center">
      <SurveyCard survey={survey} onSubmitResponse={handleSubmitResponse} className="shadow-none border" />
    </div>
  );
}
