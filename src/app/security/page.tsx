import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  HardDrive,
  Lock,
  Mail,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Security & Privacy Practices — Data Sovereignty",
  description:
    "Security architecture and privacy practices for Praise: full data ownership, explicit customer consent, granular permissions, GDPR data deletion, and responsible vulnerability reporting.",
  path: "/security",
});

const securityPillars = [
  {
    icon: Database,
    title: "1. Complete Data Sovereignty",
    description:
      "Unlike multi-tenant cloud SaaS tools, your customer testimonials and video files never pass through or get stored on third-party servers. Everything resides strictly within your own network perimeter.",
    points: [
      "Zero phone-home telemetry or analytics scripts included in Praise code",
      "No third-party tracking pixels or behavioral cookies embedded in widgets",
      "You choose the physical geography and cloud provider for your server and storage",
    ],
  },
  {
    icon: UserCheck,
    title: "2. Explicit Customer Consent & Attribution",
    description:
      "Collecting customer social proof requires unambiguous legal permission. Praise forms embed clear, configurable consent disclosures before respondents submit.",
    points: [
      "Mandatory consent checkboxes acknowledging publication terms",
      "Clear records of submission timestamps, IP (optional), and user authorization",
      "Attribution settings: allow customers to choose full name, first name only, or company anonymity",
    ],
  },
  {
    icon: Trash2,
    title: "3. Data Deletion & GDPR / CCPA Compliance",
    description:
      "When a customer exercises their right to be forgotten or revokes permission to use their testimonial, Praise provides immediate, permanent deletion.",
    points: [
      "One-click purge removes database records and metadata permanently",
      "Associated video files (MP4/WebM) and audio voice notes are deleted from disk",
      "Widgets immediately cease serving purged testimonials without cache lag",
    ],
  },
  {
    icon: Users,
    title: "4. Granular Access Permissions",
    description:
      "Protect your testimonial library with role-based access control (RBAC), ensuring that only authorized team members can approve or publish testimonials.",
    points: [
      "Admin role: full access to server settings, API keys, and team members",
      "Moderator / Editor role: review, tag, approve, or hide submissions",
      "Viewer role: read-only access to browse approved proof for marketing use",
    ],
  },
  {
    icon: Lock,
    title: "5. Encryption in Transit & At Rest",
    description:
      "All network communication between customer browsers, the dashboard, and embed widgets is secured using modern TLS 1.3 encryption.",
    points: [
      "Automated SSL/TLS certificate termination via reverse proxy (Caddy, Traefik, Nginx)",
      "Secure cookie flags (HttpOnly, SameSite, Secure) enabled on all session tokens",
      "Underlying storage volume encryption managed via standard Linux LUKS or cloud EBS/volume encryption",
    ],
  },
  {
    icon: HardDrive,
    title: "6. Resilient Backups & Recovery",
    description:
      "Because Praise stores data in standard PostgreSQL tables and standard filesystem paths, standard enterprise backup workflows integrate seamlessly.",
    points: [
      "Native compatibility with automated pg_dump scripts",
      "Snapshot-friendly volume architecture for filesystem backups",
      "Zero proprietary database wrappers or locked binary archives",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Security &amp; Privacy</span>
          <h1 className="display mt-4 max-w-3xl">
            Security, privacy, and full customer data sovereignty
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Customer testimonials contain names, faces, voices, and candid
            opinions. Praise is designed from the foundation to respect customer
            consent, prevent unauthorized leaks, and keep your proof under your
            sole governance.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/self-host" variant="primary" size="lg">
              Explore self-hosting
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/open-source" variant="secondary" size="lg">
              Read open-source license
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Audit & Compliance Transparency Disclaimer */}
      <Section tone="white" className="py-8">
        <div className="surface border-line bg-warm-50 p-6 sm:p-8 flex flex-col md:flex-row items-start gap-4">
          <span className="icon-tile shrink-0 bg-white border-line text-ink-700">
            <ShieldAlert size={20} />
          </span>
          <div className="text-sm">
            <h3 className="font-semibold text-ink-900 text-base">
              Security Certification Transparency Statement
            </h3>
            <p className="text-ink-600 mt-1 leading-relaxed">
              Praise is an open-source, self-hosted software application, not a
              multi-tenant hosted SaaS service. As such, Praise <strong>does not claim
              commercial certifications such as SOC 2 Type II or ISO 27001 audits</strong>.
              Security and compliance are governed by the infrastructure where you
              choose to deploy Praise, combined with the 100% open, inspectable
              codebase provided to your security auditors.
            </p>
          </div>
        </div>
      </Section>

      {/* Security Pillars */}
      <Section tone="muted">
        <div className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Practices"
            title="Core Security Architecture"
            description="How Praise safeguards customer identity, permissions, and media storage."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="card flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <span className="icon-tile">
                      <Icon size={18} />
                    </span>
                    <h3 className="heading-md">{pillar.title}</h3>
                    <p className="muted text-sm leading-relaxed">{pillar.description}</p>
                  </div>

                  <div className="border-t border-line/60 pt-3">
                    <ul className="flex flex-col gap-2">
                      {pillar.points.map((pt) => (
                        <li
                          key={pt}
                          className="flex items-start gap-2 text-xs text-ink-700"
                        >
                          <CheckCircle2
                            size={13}
                            className="mt-0.5 shrink-0 text-brand-600"
                            aria-hidden="true"
                          />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Vulnerability Reporting & Disclosure */}
      <Section tone="white">
        <div className="surface p-6 sm:p-10 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="tag">Vulnerability Disclosure</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Responsible Reporting
            </span>
          </div>

          <h2 className="heading-lg max-w-2xl">
            Vulnerability Reporting &amp; Security Inquiries
          </h2>
          <p className="lead max-w-3xl">
            We take the security of Praise seriously and appreciate responsible
            disclosure by security researchers, system administrators, and
            developers.
          </p>

          <div className="grid gap-6 md:grid-cols-2 mt-2">
            <div className="rounded-xl border border-line bg-warm-50 p-5 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <FileCheck2 size={16} className="text-brand-600" />
                GitHub Security Advisories
              </h4>
              <p className="muted text-xs leading-relaxed">
                If you discover a potential vulnerability in Praise, please
                report it privately via GitHub Security Advisories in our
                repository rather than opening a public issue. This allows our
                maintainers to review, patch, and release a fix before public
                exposure.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-warm-50 p-5 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <Mail size={16} className="text-brand-600" />
                Coordinated Response Process
              </h4>
              <p className="muted text-xs leading-relaxed">
                Our team aims to acknowledge security vulnerability submissions
                within 48 hours, validate the reproduction steps, and coordinate a
                security advisory release alongside container image patches.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Enterprise-Ready Control</span>
          <h2 className="heading-lg max-w-2xl">
            Audit our codebase and deploy inside your secure VPC
          </h2>
          <p className="lead max-w-xl">
            Never risk third-party data breaches or unauthorized scraping of
            your customer proof. Deploy Praise on hardware you govern today.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/self-host" variant="primary" size="lg">
              Self-hosting guide
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/faq" variant="secondary" size="lg">
              Frequently asked questions
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
