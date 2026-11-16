"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail, User } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { AuthInput } from "./auth-input";
import { PasswordInput } from "./password-input";
import { AuthButton } from "./auth-button";

export interface SignUpFormProps {
  onSubmitSuccess?: () => void;
  redirectTo?: string;
}

export function SignUpForm({
  onSubmitSuccess,
  redirectTo = "/dashboard",
}: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Please enter your full name (at least 2 characters).";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid work email address.";
    }

    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to create account. Please check your details.");
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during registration.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-7">
      {/* Headings */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
          Create your Praise account.
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          Start collecting and showcasing the words your customers share.
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 animate-in fade-in-50 duration-150"
        >
          <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {/* Form Controls */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <AuthInput
          label="Full name"
          id="sign-up-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={fieldErrors.name}
          placeholder="Sarah Lin"
          icon={<User size={15} />}
        />

        {/* Work Email */}
        <AuthInput
          label="Work email"
          id="sign-up-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={fieldErrors.email}
          placeholder="sarah@company.com"
          icon={<Mail size={15} />}
        />

        {/* Password */}
        <PasswordInput
          label="Password"
          id="sign-up-password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={fieldErrors.password}
          placeholder="At least 8 characters"
          icon={<Lock size={15} />}
          helperText="Must be at least 8 characters long."
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm password"
          id="sign-up-confirm-password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword)
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={fieldErrors.confirmPassword}
          placeholder="Re-enter your password"
          icon={<Lock size={15} />}
        />

        {/* Terms and Privacy disclaimer */}
        <div className="pt-1 text-xs text-ink-500 leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-ink-800 hover:text-brand-600 underline-offset-4 hover:underline transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-ink-800 hover:text-brand-600 underline-offset-4 hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </div>

        {/* Full-width Create account button */}
        <div className="pt-2">
          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Creating account..."
            icon={<ArrowRight size={15} />}
          >
            Create account
          </AuthButton>
        </div>
      </form>

      {/* Link to existing account sign-in */}
      <div className="border-t border-line/80 pt-5 text-center text-xs text-ink-500">
        Already have an account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-semibold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
