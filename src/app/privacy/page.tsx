import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import {
  LEGAL_ENTITY_NAME,
  PRIVACY_EMAIL,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Privacy Policy (Draft Template)",
  description:
    "Draft Privacy Policy template for Praise deployments: customer testimonial collection, video and audio media handling, consent, data sovereignty, and GDPR/CCPA rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const entityName = LEGAL_ENTITY_NAME || "[Entity Name / Organization]";
  const privacyEmail = PRIVACY_EMAIL || "privacy@yourdomain.example";

  return (
    <div className="py-12 sm:py-16">
      <Container className="max-w-4xl">
        {/* Policy Header */}
        <div className="border-b border-line pb-8">
          <span className="eyebrow mb-3">Legal &amp; Privacy</span>
          <h1 className="display text-3xl sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="lead mt-3 text-sm text-ink-600">
            Last updated: November 6, 2026 &bull; Status: Draft Template for Review
          </p>
        </div>

        {/* Draft Notice Alert */}
        <div className="surface my-8 border-amber-300 bg-amber-50/60 p-5 sm:p-6 text-xs text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <strong className="font-semibold block text-sm text-amber-900">
                Draft Policy Notice for Self-Hosting Administrators
              </strong>
              <p>
                This document is a comprehensive template policy designed for
                review, adaptation, and formal adoption by administrators
                deploying Praise. Because Praise is open-source, self-hosted
                software, the entity hosting this instance is the independent Data
                Controller. This policy must be reviewed by your qualified legal
                counsel and tailored to your specific organizational jurisdiction,
                hosting provider, and optional integrations prior to production
                publication.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Highlights */}
        <div className="grid gap-4 sm:grid-cols-3 my-8">
          <div className="surface p-4">
            <UserCheck size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Consent-Driven</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Testimonials, images, and voice recordings require explicit opt-in
              consent and clear attribution controls.
            </p>
          </div>
          <div className="surface p-4">
            <Database size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Self-Hosted Data</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Records live exclusively in your PostgreSQL database and local or
              private S3 media storage.
            </p>
          </div>
          <div className="surface p-4">
            <ShieldCheck size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Zero Ad Trackers</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Praise core contains no third-party behavioral trackers, advertising
              pixels, or invasive telemetry.
            </p>
          </div>
        </div>

        {/* Policy Body */}
        <div className="space-y-10 text-sm leading-relaxed text-ink-800">
          {/* 1. Overview & Data Controller Distinction */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              1. Overview &amp; Self-Hosted Architecture
            </h2>
            <p>
              This Privacy Policy explains how <strong>{entityName}</strong> (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects personal
              information through our self-hosted instance of Praise.
            </p>
            <p>
              <strong>Data Controller Responsibility:</strong> Praise is an
              open-source software application. The core developers and
              maintainers of the Praise open-source project have no access to,
              ownership of, or control over the data stored on this self-hosted
              instance. <strong>{entityName}</strong> operates the underlying
              server infrastructure and acts as the sole Data Controller for all
              information submitted to this instance.
            </p>
          </section>

          {/* 2. Information Collected */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              2. Information Collected
            </h2>
            <p>
              Depending on whether you are an administrative team member or a
              customer submitting a testimonial, we collect the following categories
              of information:
            </p>

            <div className="surface overflow-hidden divide-y divide-line text-xs my-3">
              <div className="p-4 space-y-1">
                <span className="font-semibold text-ink-900 block">
                  A. Account &amp; Profile Information (Team Members)
                </span>
                <p className="text-ink-600">
                  When administrators and moderators create an account, we collect
                  their name, email address, role, and securely hashed passwords.
                  Passwords are never stored in plaintext.
                </p>
              </div>

              <div className="p-4 space-y-1">
                <span className="font-semibold text-ink-900 block">
                  B. Customer Testimonials &amp; Submissions
                </span>
                <p className="text-ink-600">
                  When a customer submits a testimonial form, we collect the
                  details provided by the respondent: full name, email address,
                  job title, company name, avatar photograph, 1-to-5 star
                  ratings, written answers to custom questions, in-browser webcam
                  video recordings (WebM/MP4), and audio voice recordings.
                </p>
              </div>

              <div className="p-4 space-y-1">
                <span className="font-semibold text-ink-900 block">
                  C. Technical &amp; Operational Data
                </span>
                <p className="text-ink-600">
                  When interacting with collection forms or embedded widgets, our
                  web server logs standard operational connection data, including
                  the visitor&apos;s IP address, browser user-agent, operating system,
                  and timestamp. This data is processed strictly for intrusion
                  prevention, rate limiting, and network diagnostics.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Consent & Permissions */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              3. Consent, Permissions &amp; Attribution
            </h2>
            <p>
              Customer feedback and likeness are collected exclusively on the
              basis of explicit consent:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ink-700">
              <li>
                <strong>Mandatory Consent Notice:</strong> Customers must check an
                explicit authorization box acknowledging how their quote, image,
                or video will be displayed prior to submission.
              </li>
              <li>
                <strong>Attribution Controls:</strong> Customers may choose their
                preferred attribution level (e.g. full name, first name only, or
                organization-only attribution).
              </li>
              <li>
                <strong>Withdrawal of Consent:</strong> Customers may withdraw their
                consent at any time by contacting our privacy contact. Upon
                request, their testimonial and associated media are permanently
                deleted.
              </li>
            </ul>
          </section>

          {/* 4. Storage & Retention */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              4. Storage, Hosting &amp; Data Retention
            </h2>
            <p>
              All customer records, ratings, video files, and voice notes reside
              on infrastructure managed by <strong>{entityName}</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ink-700">
              <li>
                Structured records are stored in a self-hosted PostgreSQL
                database.
              </li>
              <li>
                Video and audio recordings are stored on mounted filesystem
                volumes or private S3-compatible object buckets.
              </li>
              <li>
                We retain testimonial records only for as long as they serve
                their intended social proof purpose or until deletion is
                requested by the submitter or our moderation team.
              </li>
            </ul>
          </section>

          {/* 5. Third-Party Services Configured by Administrator */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              5. Third-Party Services &amp; Sub-Processors
            </h2>
            <p>
              By default, Praise does not bundle or communicate with external
              third-party analytics or behavioral trackers. However, depending on
              how <strong>{entityName}</strong> configures this self-hosted
              instance, data may interact with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ink-700">
              <li>
                <strong>Cloud Hosting &amp; Storage Providers:</strong> Infrastructure
                hosts (such as AWS, Hetzner, DigitalOcean, or private data centers)
                where our servers and storage disks operate.
              </li>
              <li>
                <strong>Transactional Email Services:</strong> Optional SMTP
                gateways used to send invitation magic links or moderation
                notifications.
              </li>
              <li>
                <strong>Reverse Proxy &amp; CDN Services:</strong> Optional edge
                proxies (e.g. Cloudflare, Caddy) providing DDoS protection and
                TLS certificate management.
              </li>
            </ul>
          </section>

          {/* 6. Optional AI Integrations */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              6. Optional AI Integrations &amp; Protocols
            </h2>
            <p>
              Praise includes architectural designs for the Model Context
              Protocol (MCP) and assistant integrations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ink-700">
              <li>
                <strong>Local MCP Queries:</strong> When the Praise MCP server is
                deployed locally, AI queries execute over your private network. No
                customer records are sent to external third-party vector databases.
              </li>
              <li>
                <strong>Assistant &amp; Custom GPT Connectors:</strong> If enabled
                by our administrators, only testimonials explicitly marked as
                &quot;Approved&quot; may be queried by authorized AI models. Private emails
                and unapproved drafts are strictly excluded from API responses.
              </li>
            </ul>
          </section>

          {/* 7. Data Export & Deletion Rights (GDPR & CCPA) */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              7. Your Rights: Export &amp; Deletion
            </h2>
            <p>
              In accordance with applicable privacy laws (including GDPR, CCPA,
              and UK GDPR), respondents and users hold the following rights:
            </p>
            <div className="surface p-4 text-xs space-y-2 text-ink-700">
              <p>
                <strong>Right of Access &amp; Portability:</strong> You may request
                a copy of your testimonial data. Data can be exported in open JSON
                or CSV format.
              </p>
              <p>
                <strong>Right to Erasure (Right to be Forgotten):</strong> You may
                request the permanent deletion of your testimonial. When an
                administrator purges a submission, database records are erased,
                media files (MP4/WebM) are deleted from disk, and all public
                widgets immediately stop serving the quote.
              </p>
              <p>
                <strong>Right to Rectification:</strong> You may request updates or
                corrections to your name, job title, or company details.
              </p>
            </div>
          </section>

          {/* 8. Security Practices */}
          <section className="space-y-3">
            <h2 className="heading-md text-xl text-ink-900">
              8. Security Practices
            </h2>
            <p>
              We implement industry-standard technical measures to safeguard
              personal data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-ink-700">
              <li>All web traffic is encrypted in transit using TLS 1.3.</li>
              <li>Administrative sessions use secure, HttpOnly, SameSite cookie tokens.</li>
              <li>Role-based access controls limit moderation actions to authorized team members.</li>
              <li>Database volumes are backed up regularly using standard PostgreSQL snapshots.</li>
            </ul>
          </section>

          {/* 9. Contact for Privacy Questions */}
          <section className="space-y-3 border-t border-line pt-6">
            <h2 className="heading-md text-xl text-ink-900">
              9. Privacy Questions &amp; Data Inquiries
            </h2>
            <p>
              To exercise your rights, submit a deletion request, or ask
              questions regarding this privacy policy, please contact our
              designated privacy representative:
            </p>
            <div className="surface p-4 text-xs space-y-1.5 text-ink-800">
              <div>
                <strong>Data Controller:</strong> {entityName}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-brand-600" />
                <span>
                  <strong>Privacy Contact Email:</strong>{" "}
                  <a href={`mailto:${privacyEmail}`} className="link font-semibold">
                    {privacyEmail}
                  </a>
                </span>
              </div>
              <p className="text-ink-500 mt-2 text-[11px]">
                Note for administrators: Configure <code>NEXT_PUBLIC_PRIVACY_EMAIL</code>{" "}
                and <code>NEXT_PUBLIC_LEGAL_ENTITY_NAME</code> in your <code>.env</code>{" "}
                file to update these contact details automatically.
              </p>
            </div>
          </section>
        </div>

        {/* Bottom Navigation / Links */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/terms" className="text-ink-600 hover:text-ink-900 underline">
              Terms of Service
            </Link>
            <span className="text-ink-300">&bull;</span>
            <Link href="/cookies" className="text-ink-600 hover:text-ink-900 underline">
              Cookie Policy
            </Link>
            <span className="text-ink-300">&bull;</span>
            <Link href="/security" className="text-ink-600 hover:text-ink-900 underline">
              Security Overview
            </Link>
          </div>
          <ButtonLink href="/get-started" variant="secondary" size="sm">
            <span>Explore Deployment</span>
            <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
