"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold tracking-tight text-ink-900">
          Sign in to your instance
        </h1>
        <p className="text-xs text-ink-500">
          Enter your team credentials to access your Praise dashboard.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700">
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.example"
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink-900">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 py-2 px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="border-t border-line pt-4 text-center text-xs text-ink-500">
        Setting up for the first time?{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
          Create instance account
        </Link>
      </div>
    </div>
  );
}
