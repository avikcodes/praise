"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { VideoStudioEditor } from "@/components/dashboard/video-studio/video-studio-editor";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Film } from "lucide-react";

function VideoStudioContent() {
  const { activeWorkspace, isLoadingWorkspaces } = useWorkspace();
  const searchParams = useSearchParams();
  const testimonialIdParam = searchParams.get("testimonialId") || undefined;
  const modeParam = (searchParams.get("mode") || searchParams.get("tab")) as "video" | "marketing" | undefined;

  const workspaceId =
    activeWorkspace && !activeWorkspace.id.startsWith("ws-default")
      ? activeWorkspace.id
      : undefined;

  if (isLoadingWorkspaces) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <EmptyState
        icon={Film}
        title="No Workspace Selected"
        description="Select or create a workspace to access Praise Video Studio."
      />
    );
  }

  return (
    <VideoStudioEditor
      workspaceId={workspaceId}
      initialTestimonialId={testimonialIdParam}
      initialMode={modeParam === "marketing" ? "marketing" : "video"}
    />
  );
}

export default function VideoStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      }
    >
      <VideoStudioContent />
    </Suspense>
  );
}
