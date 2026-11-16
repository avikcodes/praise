"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import { AuthInput } from "./auth-input";
import { AuthButton } from "./auth-button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid work email address.");
      return;
    }

    setLoading(true);

    try {
      // Gentle pause to provide a smooth user experience
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process password reset request at this time.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full space-y-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 border border-brand-200">
          <CheckCircle2 size={24} className="text-brand-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
            Check your email
          </h1>
          <p className="text-sm leading-relaxed text-ink-500">
            If an account exists for{" "}
            <span className="font-semibold text-ink-900">{email}</span>, we have
            sent instructions to reset your password.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 text-xs text-ink-600 leading-relaxed shadow-2xs">
          Did not receive the email? Check your spam folder or ensure your
          organization allows emails from your Praise instance.
        </div>

        <div className="space-y-3 pt-2">
          <AuthButton
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="w-full"
          >
            Try another email address
          </AuthButton>

          <Link
            href="/auth/sign-in"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to sign in</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-7">
      {/* Headings */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
          Reset your password
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          Enter your work email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 animate-in fade-in-50 duration-150"
        >
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthInput
          label="Work email"
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@company.com"
          icon={<Mail size={15} />}
          helperText="We will send reset instructions to this email."
        />

        <div className="pt-1.5">
          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Sending reset link..."
            icon={<Send size={14} />}
          >
            Send reset link
          </AuthButton>
        </div>
      </form>

      {/* Back to sign in */}
      <div className="border-t border-line/80 pt-5 text-center text-xs">
        <Link
          href="/auth/sign-in"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  );
}
