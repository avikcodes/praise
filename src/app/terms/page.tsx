import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  HardDrive,
  Mail,
  Scale,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of Service (Draft Template)",
  description:
    "Draft Terms of Service template for Praise deployments: acceptable use, customer consent requirements, content ownership, self-hosting responsibilities, and open-source licensing.",
  path: "/terms",
});

export default function TermsPage() {
  const entityName = LEGAL_ENTITY_NAME || "[Entity Name / Organization]";
  const contactEmail = CONTACT_EMAIL || "legal@yourdomain.example";

  return (
    <div className="py-12 sm:py-16">
      <Container className="max-w-4xl">
        {/* Header */}
        <div className="border-b border-line pb-8">
          <span className="eyebrow mb-3">Legal &amp; Governance</span>
          <h1 className="display text-3xl sm:text-4xl">
            Terms of Service
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
                Draft Terms Template for Self-Hosting Administrators
              </strong>
              <p>
                This document is a standardized terms template for organizations
                deploying and administering instances of Praise. Because Praise
                is an open-source, self-hosted software platform, the operating entity
                ({entityName}) is solely responsible for determining its binding legal
                terms with its end users, workspace members, and testimonial submitters.
              </p>
              <p className="text-amber-800">
                You must review, modify, and have these terms approved by your qualified
                legal counsel before publishing them for commercial or public use.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3 my-8">
          <div className="surface p-4">
            <Scale size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Dual Legal Framework</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              The software engine is distributed under open-source licenses; instance
              access and service terms govern operational hosting and data relations.
            </p>
          </div>
          <div className="surface p-4">
            <UserCheck size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Mandatory Consent</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Operators and collection form creators must obtain verified, explicit consent
              prior to publishing customer names, images, or statements.
            </p>
          </div>
          <div className="surface p-4">
            <HardDrive size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Self-Host Sovereignty</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Operators manage their own infrastructure, backups, access keys, and compliance
              with international consumer privacy laws.
            </p>
          </div>
        </div>

        {/* Main Terms Content */}
        <div className="space-y-12 text-sm leading-relaxed text-ink-800 mt-10">
          {/* Section 1 */}
          <Section id="acceptance" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">1.</span>
              Acceptance of Terms &amp; Scope of Service
            </h2>
            <p>
              By accessing, browsing, submitting content to, or deploying this instance of
              Praise (&quot;the Service&quot;), operated by {entityName} (&quot;Operator&quot;,
              &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you acknowledge that you
              have read, understood, and agreed to be legally bound by these Terms of Service.
            </p>
            <p>
              If you represent an organization or business entity, you represent and warrant
              that you have full corporate authority to bind that entity to these terms.
              If you do not agree to every provision in this agreement, you must refrain
              from accessing the administrative portal, submitting testimonials, or embedding
              widgets powered by this instance.
            </p>
          </Section>

          {/* Section 2 */}
          <Section id="acceptable-use" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">2.</span>
              Acceptable Use Policy
            </h2>
            <p>
              The Praise platform is built to facilitate honest, transparent customer
              feedback and social proof. You agree that you will use the Service strictly
              in compliance with all applicable local, national, and international laws and
              regulations.
            </p>
            <div className="surface p-5 space-y-3 bg-warm-50/50">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-900">
                Prohibited Conduct
              </h4>
              <ul className="space-y-2 text-xs text-ink-700">
                <li className="flex items-start gap-2">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Fabrication or Impersonation:</strong> Submitting fake, fraudulent,
                    manipulated, or deceptive reviews, or impersonating any individual, company,
                    or brand without verified authority.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unlawful or Harassing Content:</strong> Submitting or hosting content
                    that is defamatory, obscene, pornographic, hateful, racially or ethnically
                    offensive, or encouraging criminal conduct.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Intellectual Property Infringement:</strong> Uploading video, audio,
                    photographs, or logos without necessary copyright licenses or performer releases.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Service Disruption:</strong> Attempting to overwhelm, probe, scan,
                    or reverse engineer the hosting infrastructure, inject malicious code, or bypass
                    rate limits and authentication boundaries.
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-xs text-ink-600">
              The Operator reserves the right to immediately suspend or terminate access, disable
              embed widgets, or delete offending testimonials without prior notice upon discovering
              violations of this policy.
            </p>
          </Section>

          {/* Section 3 */}
          <Section id="user-responsibilities" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">3.</span>
              User &amp; Administrator Responsibilities
            </h2>
            <p>
              When administering workspaces or project collections on this instance, you are
              responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-ink-700">
              <li>
                <strong>Account Credentials:</strong> Maintaining the absolute confidentiality of
                your administrator credentials, session cookies, and API tokens.
              </li>
              <li>
                <strong>Access Audits:</strong> Periodically reviewing authorized workspace members,
                editors, and API keys with write permissions.
              </li>
              <li>
                <strong>Infrastructure Safeguards:</strong> In self-hosted setups, keeping the host OS,
                Docker daemon, PostgreSQL database, and reverse proxy patched against known CVEs.
              </li>
              <li>
                <strong>Notification of Breach:</strong> Immediately alerting {contactEmail} if you
                detect unauthorized access or credential compromise impacting this deployment.
              </li>
            </ul>
          </Section>

          {/* Section 4 */}
          <Section id="ownership" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">4.</span>
              Ownership of Submitted Content &amp; Testimonials
            </h2>
            <p>
              We respect user content rights and distinguish clearly between software code,
              instance data, and customer media:
            </p>
            <div className="space-y-3 text-xs">
              <div className="surface p-4">
                <strong className="text-ink-900 block mb-1 font-semibold">
                  Customer &amp; Submitter Rights
                </strong>
                <p className="text-ink-600">
                  Customers who submit written quotes, video recordings, audio tracks, or headshots
                  retain all original intellectual property rights in their personal content. By
                  checking the submission consent box on collection forms, the customer grants the
                  workspace administrator a non-exclusive, worldwide, royalty-free license to publish,
                  display, and syndicate the review on websites, social media, and sales materials.
                </p>
              </div>
              <div className="surface p-4">
                <strong className="text-ink-900 block mb-1 font-semibold">
                  Operator &amp; Open-Source Project Non-Ownership
                </strong>
                <p className="text-ink-600">
                  The upstream Praise open-source project, contributors, and codebase maintainers
                  claim zero ownership, licensing rights, or access to your submitted testimonials,
                  recordings, or workspace databases. All data remains exclusively on your
                  self-hosted instance or designated cloud storage provider.
                </p>
              </div>
            </div>
          </Section>

          {/* Section 5 */}
          <Section id="consent-requirements" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">5.</span>
              Customer Consent &amp; Withdrawal Obligations
            </h2>
            <p>
              Consumer protection laws and privacy frameworks (including GDPR Article 6/7 and FTC
              endorsement guides) impose affirmative legal obligations on businesses publishing
              customer reviews:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-ink-700">
              <li>
                <strong>Explicit Opt-in Consent:</strong> Testimonial forms generated by this instance
                must feature unambiguous consent checkboxes clarifying where testimonials will be
                showcased. Pre-ticked consent boxes are strictly prohibited.
              </li>
              <li>
                <strong>Verifiable Records:</strong> The Praise backend stores timestamped consent
                flags alongside submitted media. Administrators must retain these audit trails for
                the entire duration the review remains publicly visible.
              </li>
              <li>
                <strong>Obligation to Honor Withdrawal:</strong> If a customer contacts you to
                revoke consent or request deletion of their video, image, or quote, you must
                promptly unpublish the testimonial from public widgets and delete the media from your
                database and storage volumes.
              </li>
            </ul>
          </Section>

          {/* Section 6 */}
          <Section id="open-source-licensing" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">6.</span>
              Open-Source Licensing vs. Operational Terms
            </h2>
            <p>
              Praise is free software developed under open-source licenses (such as AGPL-3.0 once
              formally adopted in the project repository). It is important to distinguish the
              underlying source code license from these operational Terms of Service:
            </p>
            <div className="surface p-4 space-y-2 text-xs">
              <p>
                <strong>Software Code License:</strong> Grants you the right to inspect, modify, fork,
                and self-host the source code in accordance with the terms of the repository license.
              </p>
              <p>
                <strong>Instance Terms of Service:</strong> Governs access to this particular hosted
                endpoint, uptime expectations, acceptable use of shared server resources, and data
                relations between the Operator and end users.
              </p>
            </div>
          </Section>

          {/* Section 7 */}
          <Section id="self-host-responsibilities" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">7.</span>
              Self-Hosting Responsibilities &amp; Data Portability
            </h2>
            <p>
              If you run your own Praise instance, you assume complete legal, administrative, and
              operational responsibility for:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="surface p-3">
                <span className="font-semibold text-ink-900 block mb-1">Backup &amp; Recovery</span>
                Scheduling database dumps (`pg_dump`) and object storage snapshots to prevent data loss.
              </div>
              <div className="surface p-3">
                <span className="font-semibold text-ink-900 block mb-1">Network &amp; SSL</span>
                Provisioning valid TLS certificates, firewall rules, and DDoS protection for public forms.
              </div>
              <div className="surface p-3">
                <span className="font-semibold text-ink-900 block mb-1">Compliance Disclosures</span>
                Publishing customized, legally vetted Privacy and Cookie policies for your end visitors.
              </div>
              <div className="surface p-3">
                <span className="font-semibold text-ink-900 block mb-1">Data Portability</span>
                Providing JSON and CSV export tools to your workspace users upon reasonable request.
              </div>
            </div>
          </Section>

          {/* Section 8 */}
          <Section id="third-party-services" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">8.</span>
              Third-Party Integrations &amp; External Storage
            </h2>
            <p>
              Praise instances may be configured to integrate with external cloud infrastructure,
              such as Amazon S3, Cloudflare R2, MinIO, or optional AI inference providers.
            </p>
            <p className="text-xs text-ink-700">
              Your use of such third-party services is subject exclusively to their respective terms,
              service level agreements, and privacy policies. The Operator and the Praise project
              disclaim all liability for downtime, billing discrepancies, data loss, or breaches
              originating inside third-party cloud infrastructure configured by the self-hoster.
            </p>
          </Section>

          {/* Section 9 */}
          <Section id="service-availability" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">9.</span>
              Service Availability &amp; Maintenance
            </h2>
            <p>
              This instance is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis.
              Unless a separate written Service Level Agreement (SLA) has been executed with
              {entityName}, we do not warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-ink-700">
              <li>The Service will be uninterrupted, error-free, timely, or completely secure.</li>
              <li>Public embed widgets will maintain continuous 100% uptime on host websites.</li>
              <li>Defects or minor rendering glitches across obscure browser configurations will be corrected immediately.</li>
            </ul>
            <p className="text-xs text-ink-600">
              Routine maintenance, database vacuuming, and application upgrades may require scheduled
              service interruptions.
            </p>
          </Section>

          {/* Section 10 */}
          <Section id="limitation-of-liability" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">10.</span>
              Limitation of Liability &amp; Disclaimers
            </h2>
            <div className="surface p-4 text-xs leading-relaxed text-ink-800 space-y-2 border-line">
              <p className="uppercase font-semibold tracking-wider text-ink-900">
                Statutory Disclaimer of Warranties
              </p>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {entityName} AND THE UPSTREAM
                PRAISE OPEN-SOURCE CONTRIBUTORS DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS,
                IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                IN NO EVENT SHALL {entityName}, ITS DIRECTORS, EMPLOYEES, CONTRIBUTORS, OR AFFILIATES
                BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING LOSS OF PROFITS, DATA LOSS, LOSS OF GOODWILL, OR BUSINESS INTERRUPTION,
                ARISING OUT OF OR IN CONNECTION WITH YOUR USE OR INABILITY TO USE THE SERVICE.
              </p>
            </div>
          </Section>

          {/* Section 11 */}
          <Section id="modifications" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">11.</span>
              Modifications to These Terms
            </h2>
            <p>
              The Operator reserves the right to modify or replace these Terms at any time. When
              updates are made, the revised date at the top of this document will be updated. For
              material modifications impacting account rights or content licensing, administrators
              should provide reasonable advance notice through the application interface or
              registered email channels.
            </p>
            <p className="text-xs text-ink-600">
              Continued use of the Service following the publication of updated terms constitutes
              binding acceptance of the revised agreement.
            </p>
          </Section>

          {/* Section 12 */}
          <Section id="contact" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">12.</span>
              Contact &amp; Legal Notices
            </h2>
            <p>
              If you have any questions, legal notices, or copyright infringement notifications
              regarding these Terms of Service or this deployment, please contact the designated
              administrative contact:
            </p>
            <div className="surface p-4 text-xs space-y-1.5">
              <p>
                <strong>Operating Entity:</strong> {entityName}
              </p>
              <p className="flex items-center gap-2 text-ink-800">
                <Mail size={14} className="text-brand-600" />
                <span>
                  <strong>Legal Email:</strong>{" "}
                  <a href={`mailto:${contactEmail}`} className="underline text-brand-600 hover:text-brand-700">
                    {contactEmail}
                  </a>
                </span>
              </p>
              <p className="text-ink-500 pt-2 border-t border-line mt-2">
                For questions regarding the open-source software license or code contributions, visit the{" "}
                <Link href="/community/contributing" className="underline text-ink-800 hover:text-ink-900">
                  Contributing Guide
                </Link>{" "}
                or the{" "}
                <Link href="/open-source" className="underline text-ink-800 hover:text-ink-900">
                  Open Source overview
                </Link>.
              </p>
            </div>
          </Section>
        </div>

        {/* Bottom Navigation / Links */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="text-ink-600 hover:text-ink-900 underline">
              Privacy Policy
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
            <span>Explore Deployment Options</span>
            <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
