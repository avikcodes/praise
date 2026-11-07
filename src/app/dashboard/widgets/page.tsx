"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Layers,
  LayoutGrid,
  Play,
  Quote,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { useToast } from "@/components/dashboard/toast-context";

type WidgetBlueprint = {
  id: string;
  name: string;
  type: "wall-of-love" | "grid" | "carousel" | "quote-card";
  description: string;
  theme: "light" | "dark" | "warm";
  badge: string;
};

const blueprints: WidgetBlueprint[] = [
  {
    id: "w-wall",
    name: "Wall of Love (Masonry)",
    type: "wall-of-love",
    description: "Dynamic masonry columns showcasing mixed text, headshots, video cards, and star ratings.",
    theme: "warm",
    badge: "Popular",
  },
  {
    id: "w-grid",
    name: "Responsive 3-Column Grid",
    type: "grid",
    description: "Clean card layout tailored for dedicated /testimonials or /customers pages.",
    theme: "light",
    badge: "Clean",
  },
  {
    id: "w-carousel",
    name: "Interactive Carousel",
    type: "carousel",
    description: "Compact sliding widget for hero sections, pricing tiers, and mobile displays.",
    theme: "light",
    badge: "Compact",
  },
  {
    id: "w-quote",
    name: "Single Featured Quote Card",
    type: "quote-card",
    description: "Highlighted testimonial card designed for checkout funnels and landing hero CTAs.",
    theme: "warm",
    badge: "High-Impact",
  },
];

export default function WidgetsPage() {
  const [selectedWidget, setSelectedWidget] = useState<WidgetBlueprint | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const embedScript = selectedWidget
    ? `<div id="praise-widget" data-widget-id="${selectedWidget.id}"></div>\n<script src="${typeof window !== "undefined" ? window.location.origin : "https://praise.yourdomain.com"}/embed.js" async></script>`
    : "";

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied", "HTML embed snippet copied to clipboard.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgets &amp; Embeds"
        description="Configure customizable testimonial widgets and generate copy-and-paste embed snippets for any website."
        actions={
          <Link
            href="/docs/widgets"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
          >
            <span>Widget Docs</span>
            <ExternalLink size={12} className="text-ink-400" />
          </Link>
        }
      />

      {/* Widget Blueprint Gallery */}
      <div className="grid gap-4 sm:grid-cols-2">
        {blueprints.map((blueprint) => (
          <div
            key={blueprint.id}
            className="rounded-xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                    {blueprint.type === "wall-of-love" && <Layers size={16} />}
                    {blueprint.type === "grid" && <LayoutGrid size={16} />}
                    {blueprint.type === "carousel" && <Play size={16} />}
                    {blueprint.type === "quote-card" && <Quote size={16} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-ink-900">
                      {blueprint.name}
                    </h2>
                    <span className="text-[10px] text-ink-400 uppercase font-mono">
                      Type: {blueprint.type}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-warm-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 border border-line">
                  {blueprint.badge}
                </span>
              </div>

              <p className="mt-3 text-xs text-ink-600 leading-relaxed">
                {blueprint.description}
              </p>
            </div>

            <div className="mt-5 border-t border-line/70 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-ink-500">
                Theme: <strong className="capitalize text-ink-700">{blueprint.theme}</strong>
              </span>

              <button
                type="button"
                onClick={() => setSelectedWidget(blueprint)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <Code2 size={13} />
                <span>Get Embed Code</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Embed Code Dialog */}
      {selectedWidget && (
        <ModalDialog
          isOpen={Boolean(selectedWidget)}
          onClose={() => setSelectedWidget(null)}
          title={`Embed "${selectedWidget.name}"`}
          description="Copy this snippet and paste it into your website HTML, Webflow, WordPress, or React template."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-ink-500">
                Zero tracking cookies • Lightweight ~6KB
              </span>
              <button
                type="button"
                onClick={() => setSelectedWidget(null)}
                className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-ink-900">
                  HTML / Script Embed
                </span>
                <button
                  type="button"
                  onClick={copyEmbed}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto leading-relaxed">
                {embedScript}
              </pre>
            </div>

            <div className="rounded-lg border border-line bg-warm-50 p-3 text-xs space-y-1">
              <span className="font-semibold text-ink-900 block">
                React / Next.js Component
              </span>
              <p className="text-ink-500 text-[11px]">
                Import our lightweight React component from{" "}
                <code className="text-brand-700 font-mono">@praise/react</code> or fetch
                approved testimonials directly via the JSON REST API.
              </p>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
