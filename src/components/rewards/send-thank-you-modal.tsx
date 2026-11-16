"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Video,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Eye,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SendThankYouModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: any) => void;
  testimonial?: {
    id: string;
    customerName?: string | null;
    customerEmail?: string | null;
    customerCompany?: string | null;
    rating?: number | null;
    rewardClaim?: {
      rewardCode?: string | null;
    } | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
  } | null;
}

const TEMPLATE_PRESETS = [
  {
    label: "Warm Appreciation",
    subject: "A personal thank you for your feedback, {{name}}!",
    body: "Hi {{name}},\n\nI wanted to take a moment to personally thank you for sharing your thoughtful review of our product.\n\nYour feedback directly helps us understand what we are doing well and where we can continue to improve. We truly appreciate you taking the time.\n\nWarm regards,\nOur Team",
  },
  {
    label: "With Reward Reference",
    subject: "Thank you for your review + your appreciation gift",
    body: "Hi {{name}},\n\nThank you so much for taking the time to share your honest review.\n\nAs a token of our appreciation, please feel free to use your gift: {{rewardCode}}.\n\nIf there is ever anything we can do to make your experience even better, please do not hesitate to reach out directly.\n\nBest wishes,\nOur Team",
  },
  {
    label: "Video Greeting",
    subject: "We recorded a personal thank-you video for you, {{name}}",
    body: "Hi {{name}},\n\nThank you for sharing your feedback with us! Our team recorded a quick personal video note just for you — check out the link below.\n\nThanks again for being a valued part of our community!",
  },
];

export function SendThankYouModal({
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
  testimonial,
  customer,
}: SendThankYouModalProps) {
  const [channel, setChannel] = useState<"EMAIL" | "MANUAL_NOTE">("EMAIL");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize values when opened
  useEffect(() => {
    if (isOpen) {
      const name = testimonial?.customerName || customer?.name || "";
      const email = testimonial?.customerEmail || customer?.email || "";
      setRecipientName(name);
      setRecipientEmail(email);

      // Default template
      const preset = TEMPLATE_PRESETS[0];
      setSubject(preset.subject);
      setMessage(preset.body);
      setVideoUrl("");
      setIsPreview(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, testimonial, customer]);

  if (!isOpen) return null;

  const rewardCode = testimonial?.rewardClaim?.rewardCode || "";

  // Render interpolated preview
  const previewSubject = subject
    .replace(/\{\{\s*(name|customerName)\s*\}\}/gi, recipientName || "Customer")
    .replace(/\{\{\s*rewardCode\s*\}\}/gi, rewardCode || "[REWARD_CODE]");

  const previewMessage = message
    .replace(/\{\{\s*(name|customerName)\s*\}\}/gi, recipientName || "Customer")
    .replace(/\{\{\s*rewardCode\s*\}\}/gi, rewardCode || "[REWARD_CODE]");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipientName.trim()) {
      setError("Recipient name is required.");
      return;
    }

    if (channel === "EMAIL" && !recipientEmail.trim()) {
      setError("Recipient email address is required for email thank-yous.");
      return;
    }

    if (!subject.trim()) {
      setError("Subject line is required.");
      return;
    }

    if (!message.trim()) {
      setError("Message body is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/thank-yous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testimonialId: testimonial?.id || null,
          customerId: customer?.id || null,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
          channel,
          videoUrl: videoUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver thank-you.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(data.record);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delivery failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-line flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink-900">
                Send Personal Thank-You
              </h2>
              <p className="text-[11px] text-ink-500">
                Customer appreciation & personalized outreach
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-warm-100 hover:text-ink-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Thank-you recorded and dispatched successfully!</span>
            </div>
          )}

          {/* Channel Selector */}
          <div className="flex items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => setChannel("EMAIL")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all",
                channel === "EMAIL"
                  ? "border-brand-500 bg-brand-50/70 text-brand-700 shadow-xs"
                  : "border-line bg-white text-ink-600 hover:bg-warm-50"
              )}
            >
              <Mail size={14} />
              <span>Personal Email</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel("MANUAL_NOTE")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all",
                channel === "MANUAL_NOTE"
                  ? "border-brand-500 bg-brand-50/70 text-brand-700 shadow-xs"
                  : "border-line bg-white text-ink-600 hover:bg-warm-50"
              )}
            >
              <FileText size={14} />
              <span>Log Manual Note</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
              Quick Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSubject(p.subject);
                    setMessage(p.body);
                  }}
                  className="rounded-lg bg-warm-100 hover:bg-warm-200 px-2.5 py-1 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                Recipient Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            {channel === "EMAIL" && (
              <div>
                <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                  Recipient Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-ink-700">
                Subject Line <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="text-[11px] font-medium text-brand-600 hover:underline flex items-center gap-1"
              >
                <Eye size={12} />
                <span>{isPreview ? "Edit Message" : "Live Preview"}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Message Body or Live Preview */}
          {isPreview ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
              <div className="text-[11px] font-bold text-ink-900 border-b border-brand-200/60 pb-2">
                Subject: {previewSubject}
              </div>
              <div className="whitespace-pre-line text-ink-700 leading-relaxed text-xs">
                {previewMessage}
              </div>
              {videoUrl && (
                <div className="mt-2 p-3 rounded-lg bg-white border border-brand-200 text-center space-y-1">
                  <div className="text-[11px] font-semibold text-ink-800 flex items-center justify-center gap-1.5">
                    <Video size={13} className="text-brand-600" />
                    <span>Personal Video Attachment Included</span>
                  </div>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand-600 underline font-mono truncate block max-w-xs mx-auto"
                  >
                    {videoUrl}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-ink-700">
                  Message <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-ink-400">
                  Variables: {"{{name}}"}, {"{{rewardCode}}"}
                </span>
              </div>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed"
              />
            </div>
          )}

          {/* Optional Video Attachment */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-700 mb-1">
              Optional Video Thank-You Link (Loom, YouTube, Vimeo, or MP4)
            </label>
            <div className="relative">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.loom.com/share/..."
                className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono text-[11px]"
              />
              <Video
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
              />
            </div>
            <p className="text-[10px] text-ink-400 mt-1">
              Add a personal recorded video greeting. Customers receive an embedded card with direct playback access.
            </p>
          </div>

          {/* Ethics & Compliance Notice */}
          <div className="rounded-xl bg-warm-100 p-2.5 text-[10px] text-ink-500 flex items-start gap-1.5 leading-normal">
            <Info size={13} className="text-ink-400 shrink-0 mt-0.5" />
            <span>
              Customer appreciation notes are delivered independently of review ratings and never alter original testimonial content.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-ink-600 hover:bg-warm-100 font-semibold transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>{channel === "EMAIL" ? "Send Thank You" : "Save Appreciation Note"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
