"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Mail, Lock } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { AuthInput } from "./auth-input";
import { PasswordInput } from "./password-input";
import { AuthButton } from "./auth-button";

export interface SignInFormProps {
  onSubmitSuccess?: () => void;
  redirectTo?: string;
}

export function SignInForm({
  onSubmitSuccess,
  redirectTo = "/dashboard",
}: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to sign in. Please verify your credentials.");
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred during sign in.",
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
          Welcome back!
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          Your customer stories are waiting for you.
        </p>
      </div>

      {/* Error Banner */}
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
      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        {/* Work email input */}
        <AuthInput
          label="Work email"
          id="sign-in-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          icon={<Mail size={15} />}
        />

        {/* Password input with toggle */}
        <PasswordInput
          label="Password"
          id="sign-in-password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          icon={<Lock size={15} />}
        />

        {/* Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-ink-700 hover:text-ink-900">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded-md border-line text-brand-500 focus:ring-brand-500/20 focus:ring-offset-0 transition-colors cursor-pointer"
            />
            <span className="font-medium">Remember me</span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="font-medium text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Full-width purple Sign in button */}
        <div className="pt-1.5">
          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Signing in..."
            icon={<ArrowRight size={15} />}
          >
            Sign in
          </AuthButton>
        </div>
      </form>

      {/* Link to create a new account */}
      <div className="border-t border-line/80 pt-5 text-center text-xs text-ink-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="font-semibold text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
