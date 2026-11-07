import { ArrowDown, ArrowRight, Box, HardDrive } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { FeatureList } from "@/components/ui/feature-list";

const capabilities = [
  "Bring it up with Docker Compose and a config file — no hosted account, no trial, no seat count",
  "Testimonials are stored on the servers you run, so customer proof never leaves your infrastructure",
  "The whole product is open source: fork it, patch it, or shape the roadmap alongside everyone else",
];

/**
 * Section — deploying Praise yourself, with a simple Docker illustration.
 */
export function SelfHost() {
  return (
    <Section id="self-host" tone="muted">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="Self-hosted"
            title="Run it on your own infrastructure"
            description="Praise is free and open-source. Deploy it wherever you like, keep every testimonial on hardware you control, and never hand your customer proof to a vendor."
          />
          <FeatureList items={capabilities} />
        </div>

        <DockerPreview />
      </div>
    </Section>
  );
}

/**
 * Static preview of a Docker deployment: one compose command starts the
 * Praise container, which writes to volumes on your own server.
 */
function DockerPreview() {
  return (
    <div
      role="img"
      aria-label="Deployment illustration: the docker compose up command starts a Praise container holding the app, database and media storage, which writes data to volumes on your own server."
      className="surface overflow-hidden shadow-[0_24px_48px_-32px_rgba(27,26,24,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-50 px-4 py-3">
        <span className="text-xs font-semibold tracking-tight text-ink-900">
          Deployment
        </span>
        <span className="chip">
          <Box size={12} aria-hidden="true" />
          Docker Compose
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="rounded-lg border border-line bg-warm-50 px-3 py-2.5 font-mono text-xs text-ink-700">
          <span className="text-ink-400" aria-hidden="true">
            $&nbsp;
          </span>
          docker compose up -d
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="flex-1 rounded-xl border border-line bg-white p-3">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-tight text-ink-900">
              <Box size={14} className="text-brand-600" aria-hidden="true" />
              Praise container
            </span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="chip">App</span>
              <span className="chip">Database</span>
              <span className="chip">Media storage</span>
            </div>
          </div>

          <span
            aria-hidden="true"
            className="hidden shrink-0 items-center justify-center text-ink-400 sm:flex"
          >
            <ArrowRight size={16} />
          </span>
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center text-ink-400 sm:hidden"
          >
            <ArrowDown size={16} />
          </span>

          <div className="flex-1 rounded-xl border border-line bg-white p-3">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-tight text-ink-900">
              <HardDrive
                size={14}
                className="text-brand-600"
                aria-hidden="true"
              />
              Your server
            </span>
            <div className="mt-2.5 flex flex-col gap-1.5 text-[11px] text-ink-400">
              <span>Data written to your volumes</span>
              <span>Ports you choose to expose</span>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-ink-400">
          One compose file to configure — the app, its database and its media
          all run on hardware you control.
        </p>
      </div>
    </div>
  );
}
