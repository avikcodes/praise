"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Building, Lock, Mail, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          workspaceName: workspaceName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
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
          Create instance account
        </h1>
        <p className="text-xs text-ink-500">
          Set up your administrator profile and initial workspace.
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
            Full Name
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@yourdomain.example"
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Workspace Name (Optional)
          </label>
          <div className="relative">
            <Building size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Password (min 8 characters)
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="password"
              required
              minLength={8}
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
            <span>Creating account...</span>
          ) : (
            <>
              <span>Get started</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="border-t border-line pt-4 text-center text-xs text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </div>
    </div>
  );
}
