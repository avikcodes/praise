import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  GitFork,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Get Started — Quickstart & Deployment Guide",
  description:
    "How to get started with Praise: prerequisites checklist, Docker deployment steps, creating your first collection link, and links to documentation and roadmap.",
  path: "/get-started",
});

const prerequisites = [
  {
    title: "Docker & Docker Compose",
    description: "Docker 20.10+ and Docker Compose v2 installed on your server or development machine.",
  },
  {
    title: "A Linux Server or Cloud VM",
    description: "Any cloud VPS (Hetzner, DigitalOcean, AWS, Linode) with 1-2 vCPU and 1-4 GB RAM.",
  },
  {
    title: "Domain or Subdomain",
    description: "A DNS record (e.g. praise.yourdomain.com) pointed at your server's public IP address.",
  },
  {
    title: "Reverse Proxy with SSL",
    description: "A reverse proxy (such as Caddy, Nginx, or Traefik) providing automated HTTPS termination.",
  },
];

const steps = [
  {
    step: "01",
    title: "Obtain the Deployment Configuration",
    description:
      "Clone the Praise repository or download the production docker-compose.yml configuration to your server directory.",
    code: "git clone https://github.com/ossproject/praise.git\ncd praise",
  },
  {
    step: "02",
    title: "Configure Environment Settings",
    description:
      "Copy .env.example to .env and configure your production origin (NEXT_PUBLIC_SITE_URL) so canonical links, widget embeds, and media paths resolve correctly.",
    code: "cp .env.example .env\n# Edit .env: NEXT_PUBLIC_SITE_URL=https://praise.yourdomain.com",
  },
  {
    step: "03",
    title: "Launch Containers with Docker Compose",
    description:
      "Start the Praise web application and attached PostgreSQL database in detached mode. Migrations run automatically during initial startup.",
    code: "docker compose up -d",
  },
  {
    step: "04",
    title: "Create Your First Collection Form",
    description:
      "Open your domain in your browser, set up your initial administrator credentials, customize your form prompts, and copy your collection link.",
    code: "# Open https://praise.yourdomain.com in your browser",
  },
];

export default function GetStartedPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Get Started Guide</span>
          <h1 className="display mt-4 max-w-3xl">
            Launch Praise on your infrastructure in minutes
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Everything you need to deploy, configure, and start gathering
            authentic customer video and written proof today.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#steps"
              className="btn btn-primary btn-lg"
            >
              Follow quickstart steps
              <ArrowRight size={16} />
            </a>
            <ButtonLink href="/self-host" variant="secondary" size="lg">
              Self-hosting architecture
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Prerequisites Checklist */}
      <Section tone="white">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Prerequisites"
            title="What you need before deploying"
            description="Praise is self-hosted and requires standard container infrastructure."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {prerequisites.map((item) => (
              <div key={item.title} className="card flex flex-col gap-2">
                <span className="icon-tile">
                  <CheckCircle2 size={18} />
                </span>
                <h3 className="heading-md mt-1">{item.title}</h3>
                <p className="muted text-xs leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 4-Step Quickstart Steps */}
      <Section id="steps" tone="muted">
        <div className="flex flex-col gap-10 max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="Quickstart"
            title="Four steps to your live testimonial hub"
            description="From zero to receiving your first customer testimonial."
          />

          <div className="flex flex-col gap-6">
            {steps.map((s) => (
              <div key={s.step} className="surface overflow-hidden p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand-500 font-mono text-xs font-bold text-white">
                    {s.step}
                  </span>
                  <h3 className="heading-md">{s.title}</h3>
                </div>
                <p className="lead text-sm text-ink-600 mb-4">{s.description}</p>
                <div className="rounded-xl border border-line bg-[#1b1a18] p-4 font-mono text-xs text-[#f6f4ef] overflow-x-auto">
                  <pre>{s.code}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Documentation, Roadmap & GitHub Resource Hub */}
      <Section tone="white">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Resources"
            title="Where to find documentation & community"
            description="Explore guides, specifications, and roadmap details across the Praise ecosystem."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {/* Documentation Hub */}
            <div className="card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="icon-tile">
                  <BookOpen size={18} />
                </span>
                <h3 className="heading-md">Documentation</h3>
                <p className="muted text-xs leading-relaxed">
                  In-depth architectural guides, widget customization tutorials,
                  and deployment references.
                </p>
                <ul className="flex flex-col gap-2 pt-2 border-t border-line text-xs">
                  <li>
                    <Link href="/self-host" className="link flex items-center gap-1">
                      Self-hosting & Docker guide &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/developers" className="link flex items-center gap-1">
                      REST API & widget embeds &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/security" className="link flex items-center gap-1">
                      Security & data practices &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/how-it-works" className="link flex items-center gap-1">
                      Three-step workflow guide &rarr;
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Roadmap Hub */}
            <div className="card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="icon-tile">
                  <Compass size={18} />
                </span>
                <h3 className="heading-md">Product Roadmap</h3>
                <p className="muted text-xs leading-relaxed">
                  Follow our phased releases from Core collection up to the
                  upcoming Intelligence and MCP milestones.
                </p>
                <ul className="flex flex-col gap-2 pt-2 border-t border-line text-xs">
                  <li>
                    <Link href="/features#core" className="link flex items-center gap-1">
                      Core Release features &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/features#complete" className="link flex items-center gap-1">
                      Complete Release roadmap &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/ai-integrations" className="link flex items-center gap-1">
                      Model Context Protocol (MCP) &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="link flex items-center gap-1">
                      Frequently asked questions &rarr;
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* GitHub & Open Source */}
            <div className="card flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="icon-tile">
                  <GitFork size={18} />
                </span>
                <h3 className="heading-md">GitHub & Community</h3>
                <p className="muted text-xs leading-relaxed">
                  Contribute code, participate in design discussions, report
                  bugs, or review pull requests.
                </p>
                <ul className="flex flex-col gap-2 pt-2 border-t border-line text-xs">
                  <li>
                    <Link href="/open-source" className="link flex items-center gap-1">
                      Open source & AGPL-3.0 licensing &rarr;
                    </Link>
                  </li>
                  <li>
                    <Link href="/open-source#contributing" className="link flex items-center gap-1">
                      Contributing guidelines &rarr;
                    </Link>
                  </li>
                  <li>
                    <a href="https://github.com" className="link flex items-center gap-1">
                      GitHub repository &rarr;
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com" className="link flex items-center gap-1">
                      Issue tracker &rarr;
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Start today</span>
          <h2 className="heading-lg max-w-2xl">
            Bring customer praise onto your website
          </h2>
          <p className="lead max-w-xl">
            Join developers and teams who own their social proof without monthly
            vendor fees or storage restrictions.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/features" variant="primary" size="lg">
              Explore product features
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/faq" variant="secondary" size="lg">
              Read the FAQ
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
