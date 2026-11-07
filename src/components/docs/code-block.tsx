"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
};

export function CodeBlock({
  code,
  language = "bash",
  filename,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={cn(
        "surface my-4 overflow-hidden border-line shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line bg-warm-100 px-4 py-2 text-xs font-medium text-ink-700">
        <span className="font-mono text-ink-600">
          {filename ?? language}
        </span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-ink-500 hover:bg-warm-200 hover:text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
          aria-label={copied ? "Copied code" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-600" aria-hidden="true" />
              <span className="text-emerald-600 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto bg-[#1b1a18] p-4 text-xs font-mono leading-relaxed text-[#f6f4ef]">
        <pre className="m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

