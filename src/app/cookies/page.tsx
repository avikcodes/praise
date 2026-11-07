import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Cookie,
  ExternalLink,
  EyeOff,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  PRIVACY_EMAIL,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Cookie Policy (Draft Template)",
  description:
    "Draft Cookie Policy template for Praise deployments: essential authentication cookies, zero third-party tracking, embed widget behavior, and cookie management.",
  path: "/cookies",
});

export default function CookiesPage() {
  const entityName = LEGAL_ENTITY_NAME || "[Entity Name / Organization]";
  const privacyEmail = PRIVACY_EMAIL || CONTACT_EMAIL || "privacy@yourdomain.example";

  return (
    <div className="py-12 sm:py-16">
      <Container className="max-w-4xl">
        {/* Header */}
        <div className="border-b border-line pb-8">
          <span className="eyebrow mb-3">Legal &amp; Privacy</span>
          <h1 className="display text-3xl sm:text-4xl">
            Cookie Policy
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
                Draft Cookie Policy Notice for Self-Hosting Administrators
              </strong>
              <p>
                This document is a standardized draft cookie policy describing the
                default technical behavior of Praise. Out of the box, Praise is designed
                with a strict privacy-first architecture: it does not include advertising
                trackers, marketing pixels, or third-party behavioral analytics.
              </p>
              <p className="text-amber-800">
                If the operating organization ({entityName}) injects custom analytics
                scripts, tag managers, or third-party widgets into their deployment, this
                document must be updated to disclose those specific cookies before publication.
              </p>
            </div>
          </div>
        </div>

        {/* Core Principles Cards */}
        <div className="grid gap-4 sm:grid-cols-3 my-8">
          <div className="surface p-4">
            <ShieldCheck size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Essential Only</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Core Praise uses cookies strictly for authentication and security tokens
              required to operate the platform.
            </p>
          </div>
          <div className="surface p-4">
            <EyeOff size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Zero Ad Trackers</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              No cross-site tracking, no retargeting pixels, and no data syndication to
              commercial advertising brokers.
            </p>
          </div>
          <div className="surface p-4">
            <Cookie size={20} className="text-brand-600 mb-2" />
            <h3 className="text-sm font-semibold text-ink-900">Cookie-Free Widgets</h3>
            <p className="text-xs text-ink-600 mt-1 leading-relaxed">
              Public testimonial embed widgets render cleanly on client sites without
              dropping third-party cookies on visitors.
            </p>
          </div>
        </div>

        {/* Main Sections */}
        <div className="space-y-12 text-sm leading-relaxed text-ink-800 mt-10">
          {/* Section 1: What Are Cookies */}
          <Section id="what-are-cookies" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">1.</span>
              What Are Cookies and Local Storage?
            </h2>
            <p>
              Cookies are small text files placed on your device (computer, tablet, or
              smartphone) by web browsers when you visit a website. They are widely used
              to make web applications function correctly, maintain secure sessions, and
              remember user preferences.
            </p>
            <p>
              In addition to cookies, modern web applications may utilize browser storage
              mechanisms such as <code>localStorage</code> or <code>sessionStorage</code> to
              store client-side interface state without transmitting data over the network
              with every HTTP request.
            </p>
          </Section>

          {/* Section 2: Essential Cookies */}
          <Section id="essential-cookies" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">2.</span>
              Essential &amp; Strictly Necessary Cookies
            </h2>
            <p>
              These cookies are technically required for the core functionality and security
              of the Praise dashboard. Without them, authenticated services such as logging into
              workspaces, approving testimonials, or configuring forms cannot function:
            </p>

            <div className="surface overflow-hidden border-line">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-warm-100/70 border-b border-line text-ink-900">
                    <tr>
                      <th className="p-3 font-semibold">Cookie Name</th>
                      <th className="p-3 font-semibold">Purpose &amp; Category</th>
                      <th className="p-3 font-semibold">Security Flags</th>
                      <th className="p-3 font-semibold">Typical Expiration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-700">
                    <tr>
                      <td className="p-3 font-mono font-medium text-ink-900">
                        praise_session
                      </td>
                      <td className="p-3">
                        Stores an encrypted session token to authenticate administrators and workspace
                        members after login.
                      </td>
                      <td className="p-3 font-mono text-ink-600">
                        HttpOnly, SameSite=Lax, Secure
                      </td>
                      <td className="p-3">Session or up to 14 days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-medium text-ink-900">
                        csrf_token / praise_csrf
                      </td>
                      <td className="p-3">
                        Protects state-modifying requests (form creation, testimonial moderation, tag
                        updates) against Cross-Site Request Forgery attacks.
                      </td>
                      <td className="p-3 font-mono text-ink-600">
                        SameSite=Strict, Secure
                      </td>
                      <td className="p-3">Session lifetime</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-medium text-ink-900">
                        praise_theme (local)
                      </td>
                      <td className="p-3">
                        Stores UI preferences (such as light or dark theme choice) in browser local
                        storage. Contains no personal data.
                      </td>
                      <td className="p-3 font-mono text-ink-600">
                        Client-side only
                      </td>
                      <td className="p-3">Persistent (until cleared)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-ink-600">
              Under Article 5(3) of the EU ePrivacy Directive (Directive 2002/58/EC) and applicable
              transpositions, strictly necessary cookies required to carry out the transmission of a
              communication or provide an explicitly requested service do not require prior consent.
            </p>
          </Section>

          {/* Section 3: Optional Analytics Cookies */}
          <Section id="optional-analytics" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">3.</span>
              Optional Analytics &amp; Performance Cookies
            </h2>
            <div className="surface p-4 space-y-2 border-line">
              <p className="font-semibold text-ink-900">
                Default Core Status: None bundled or loaded
              </p>
              <p className="text-xs text-ink-700">
                The open-source Praise software repository includes <strong>zero tracking or analytics
                libraries</strong> (no Google Analytics, no Plausible, no PostHog, no Segment, no Mixpanel).
              </p>
            </div>
            <p>
              If a self-hosting organization chooses to instrument their deployment with telemetry or
              web analytics:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-ink-700">
              <li>
                The organization must declare the specific analytics vendor, cookie names, and storage
                duration in this section.
              </li>
              <li>
                In jurisdictions requiring opt-in consent (e.g., the European Union and United Kingdom),
                the organization must implement a consent mechanism before firing non-essential analytics
                cookies.
              </li>
              <li>
                Privacy-friendly self-hosted analytics engines (such as Umami or cookieless Plausible)
                should be prioritized where measurement is deemed operationally necessary.
              </li>
            </ul>
          </Section>

          {/* Section 4: Third-Party Cookies and Embed Widgets */}
          <Section id="third-party-cookies" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">4.</span>
              Third-Party Cookies &amp; Public Embed Widgets
            </h2>
            <p>
              A major concern for website owners embedding social proof is third-party cross-site
              tracking. Praise addresses this fundamentally:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="surface p-4">
                <span className="font-semibold text-ink-900 block mb-1">
                  Public Embed Widgets
                </span>
                <p className="text-ink-600">
                  When you embed Praise testimonial walls, carousels, or grids on your public marketing
                  pages using our lightweight JavaScript loader or React/Next.js components, <strong>no
                  cookies are placed on your visitors&apos; browsers</strong>. Widgets retrieve public
                  testimonial JSON and render DOM elements natively.
                </p>
              </div>
              <div className="surface p-4">
                <span className="font-semibold text-ink-900 block mb-1">
                  Customer Submission Forms
                </span>
                <p className="text-ink-600">
                  When a customer opens a standalone collection form (<code>/p/[slug]</code>) to submit a
                  review or video testimonial, only transient CSRF protection tokens and rate-limiting
                  headers are utilized to prevent abuse. No persistent advertising identifiers are stored.
                </p>
              </div>
            </div>
          </Section>

          {/* Section 5: Cookie Preferences */}
          <Section id="preferences" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">5.</span>
              Cookie Preferences &amp; Consent Banners
            </h2>
            <p>
              Because default Praise installations do not utilize non-essential tracking cookies,
              a blocking consent banner is not strictly required under ePrivacy regulations for pure
              self-hosted deployments using only essential session cookies.
            </p>
            <p className="text-xs text-ink-700">
              However, if your organization configures optional third-party integrations (such as S3 media
              CDNs that set tracking cookies, custom chat support widgets, or marketing pixels), you must
              deploy a compliant Consent Management Platform (CMP) allowing visitors to accept or reject
              non-essential cookie categories.
            </p>
          </Section>

          {/* Section 6: How to Manage Cookies */}
          <Section id="managing-cookies" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">6.</span>
              How to Manage and Disable Cookies in Your Browser
            </h2>
            <p>
              You have the right to accept, refuse, or remove cookies at any time through your web browser
              settings. Please note that if you choose to reject or block strictly necessary session
              cookies, you will not be able to log in to the Praise administrative dashboard.
            </p>
            <p className="text-xs text-ink-700">
              For detailed instructions on configuring cookie settings in popular browsers, refer to their
              official documentation:
            </p>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="surface p-3 flex items-center justify-between hover:border-brand-300 transition-colors"
              >
                <span className="font-medium text-ink-900">Google Chrome</span>
                <ExternalLink size={13} className="text-ink-400" />
              </a>
              <a
                href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop"
                target="_blank"
                rel="noopener noreferrer"
                className="surface p-3 flex items-center justify-between hover:border-brand-300 transition-colors"
              >
                <span className="font-medium text-ink-900">Mozilla Firefox</span>
                <ExternalLink size={13} className="text-ink-400" />
              </a>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="surface p-3 flex items-center justify-between hover:border-brand-300 transition-colors"
              >
                <span className="font-medium text-ink-900">Apple Safari</span>
                <ExternalLink size={13} className="text-ink-400" />
              </a>
              <a
                href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="surface p-3 flex items-center justify-between hover:border-brand-300 transition-colors"
              >
                <span className="font-medium text-ink-900">Microsoft Edge</span>
                <ExternalLink size={13} className="text-ink-400" />
              </a>
            </div>
          </Section>

          {/* Section 7: Inquiries */}
          <Section id="inquiries" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <span className="text-brand-600 font-mono text-base">7.</span>
              Questions &amp; Contact Information
            </h2>
            <p>
              If you have questions or concerns about how this Praise deployment uses cookies or
              manages local storage, please contact the administrator:
            </p>
            <div className="surface p-4 text-xs space-y-1.5">
              <p>
                <strong>Operating Entity:</strong> {entityName}
              </p>
              <p className="flex items-center gap-2 text-ink-800">
                <Mail size={14} className="text-brand-600" />
                <span>
                  <strong>Privacy &amp; Cookie Inquiries:</strong>{" "}
                  <a
                    href={`mailto:${privacyEmail}`}
                    className="underline text-brand-600 hover:text-brand-700"
                  >
                    {privacyEmail}
                  </a>
                </span>
              </p>
              <p className="text-ink-500 pt-2 border-t border-line mt-2">
                For complete information on data collection, consent retention, and GDPR rights,
                please review our{" "}
                <Link href="/privacy" className="underline text-ink-800 hover:text-ink-900">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="underline text-ink-800 hover:text-ink-900">
                  Terms of Service
                </Link>.
              </p>
            </div>
          </Section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="text-ink-600 hover:text-ink-900 underline">
              Privacy Policy
            </Link>
            <span className="text-ink-300">&bull;</span>
            <Link href="/terms" className="text-ink-600 hover:text-ink-900 underline">
              Terms of Service
            </Link>
            <span className="text-ink-300">&bull;</span>
            <Link href="/security" className="text-ink-600 hover:text-ink-900 underline">
              Security Overview
            </Link>
          </div>
          <ButtonLink href="/get-started" variant="secondary" size="sm">
            <span>Get Started</span>
            <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
