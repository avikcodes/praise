"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  Upload,
  X,
  FileVideo,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { MediaAssetDetail } from "@/types/media";
import { cn } from "@/lib/utils";

type MediaUploadProps = {
  uploadUrl: string; // e.g. /api/workspaces/${id}/media/upload or /api/forms/${slug}/media/upload
  acceptType?: "image" | "video" | "both";
  maxSizeBytes?: number;
  onSuccess: (asset: MediaAssetDetail) => void;
  onError?: (errorMsg: string) => void;
  onRemove?: () => void;
  initialAsset?: MediaAssetDetail | null;
  className?: string;
  label?: string;
};

export function MediaUpload({
  uploadUrl,
  acceptType = "both",
  maxSizeBytes,
  onSuccess,
  onError,
  onRemove,
  initialAsset = null,
  className,
  label,
}: MediaUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentAsset, setCurrentAsset] = useState<MediaAssetDetail | null>(
    initialAsset,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accepted MIME types for file input dialog
  const acceptMime =
    acceptType === "image"
      ? "image/jpeg,image/png,image/webp,image/gif"
      : acceptType === "video"
        ? "video/mp4,video/webm,video/quicktime"
        : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

  const defaultMaxSize =
    acceptType === "video"
      ? 100 * 1024 * 1024 // 100MB
      : 10 * 1024 * 1024; // 10MB

  const limitBytes = maxSizeBytes || defaultMaxSize;
  const limitMb = Math.round(limitBytes / (1024 * 1024));

  const validateFile = (file: File): string | null => {
    if (file.size > limitBytes) {
      return `File size exceeds the maximum limit of ${limitMb} MB.`;
    }

    if (acceptType === "image" && !file.type.startsWith("image/")) {
      return "Only image files (JPEG, PNG, WebP, GIF) are accepted.";
    }

    if (acceptType === "video" && !file.type.startsWith("video/")) {
      return "Only video files (MP4, WebM, QuickTime) are accepted.";
    }

    return null;
  };

  const uploadFile = (file: File) => {
    setErrorMsg(null);

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    if (acceptType === "image") formData.append("type", "image");
    if (acceptType === "video") formData.append("type", "video");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    // Track real upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success && data.asset) {
          setCurrentAsset(data.asset);
          onSuccess(data.asset);
        } else {
          const err = data.error || "Upload failed. Please try again.";
          setErrorMsg(err);
          onError?.(err);
        }
      } catch {
        const err = "Failed to process upload response.";
        setErrorMsg(err);
        onError?.(err);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      const err = "Network error during upload. Please check your connection.";
      setErrorMsg(err);
      onError?.(err);
    };

    xhr.send(formData);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setCurrentAsset(null);
    setErrorMsg(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <span className="block text-xs font-semibold text-ink-800">
          {label}
        </span>
      )}

      {/* 1. Uploaded State Preview */}
      {currentAsset ? (
        <div className="relative rounded-xl border border-line bg-warm-50/60 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentAsset.type === "VIDEO" ? (
              <div className="h-14 w-14 rounded-lg bg-warm-200/80 flex items-center justify-center shrink-0 text-brand-600">
                <FileVideo size={24} />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-lg border border-line overflow-hidden bg-white shrink-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAsset.url}
                  alt="Uploaded media"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-900 truncate">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">
                  {currentAsset.type === "VIDEO" ? "Video Testimonial" : "Image File"}
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">
                {(currentAsset.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB &bull;{" "}
                {currentAsset.mimeType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg p-1.5 text-ink-400 hover:text-rose-600 hover:bg-white transition-colors"
            title="Remove media"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* 2. Drag & Drop Upload Zone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
            dragActive
              ? "border-brand-500 bg-brand-50/50 scale-[0.99]"
              : "border-line bg-white hover:border-line-dark hover:bg-warm-50/50",
            isUploading && "pointer-events-none opacity-80",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptMime}
            onChange={handleChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-3 py-1">
              <Loader2 size={24} className="animate-spin text-brand-600 mx-auto" />
              <div className="space-y-1.5 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs font-medium text-ink-700">
                  <span>Uploading securely...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-warm-200 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all duration-150 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-warm-100 text-brand-600 flex items-center justify-center mx-auto">
                {acceptType === "video" ? (
                  <FileVideo size={20} />
                ) : acceptType === "image" ? (
                  <FileImage size={20} />
                ) : (
                  <Upload size={20} />
                )}
              </div>
              <div className="text-xs">
                <span className="font-semibold text-brand-600 hover:underline">
                  Click to upload
                </span>{" "}
                <span className="text-ink-500">or drag and drop</span>
              </div>
              <p className="text-[11px] text-ink-400">
                {acceptType === "video"
                  ? `MP4, WebM or MOV up to ${limitMb} MB`
                  : acceptType === "image"
                    ? `PNG, JPG, WebP or GIF up to ${limitMb} MB`
                    : `Images (up to 10 MB) or Videos (up to ${limitMb} MB)`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600 font-medium pt-1">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
