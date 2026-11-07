import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PraiseLogo } from "@/components/brand";
import {
  ISSUES_URL,
  RELEASES_URL,
  REPOSITORY_URL,
} from "@/lib/site";

/**
 * `cacheComponents` (enabled in next.config.ts) forbids calling `new Date()`
 * while prerendering, so the year is a literal here. Bump it, or compute it
 * at request time if this route ever becomes dynamic.
 */
const COPYRIGHT_YEAR = 2026;

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export function SiteFooter() {
  const productColumn: FooterColumn = {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Open source", href: "/open-source" },
      { label: "Developers", href: "/developers" },
      { label: "AI integrations", href: "/ai-integrations" },
      { label: "Self-host", href: "/self-host" },
      { label: "Security", href: "/security" },
      { label: "FAQ", href: "/faq" },
      { label: "Get started", href: "/get-started" },
    ],
  };

  const docsColumn: FooterColumn = {
    title: "Documentation",
    links: [
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "API reference", href: "/docs/api-reference" },
      { label: "Widgets", href: "/docs/widgets" },
      { label: "Deployment", href: "/docs/deployment" },
    ],
  };

  const communityColumn: FooterColumn = {
    title: "Community",
    links: [
      { label: "Discussions", href: "/community/discussions" },
      { label: "Contributing", href: "/community/contributing" },
      { label: "Roadmap", href: "/community/roadmap" },
      { label: "Changelog", href: "/community/changelog" },
    ],
  };

  // GitHub links: only include if real repository URLs are supplied
  const githubLinks: FooterLink[] = [
    REPOSITORY_URL ? { label: "Repository", href: REPOSITORY_URL, external: true } : null,
    ISSUES_URL ? { label: "Issues", href: ISSUES_URL, external: true } : null,
    RELEASES_URL ? { label: "Releases", href: RELEASES_URL, external: true } : null,
  ].filter(Boolean) as FooterLink[];

  const githubColumn: FooterColumn | null =
    githubLinks.length > 0
      ? {
          title: "GitHub",
          links: githubLinks,
        }
      : null;

  const legalColumn: FooterColumn = {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  };

  const columns: FooterColumn[] = [
    productColumn,
    docsColumn,
    communityColumn,
    ...(githubColumn ? [githubColumn] : []),
    legalColumn,
  ];

  const legalBarLinks: FooterLink[] = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
  ];

  return (
    <footer className="border-t border-line bg-warm-50">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="w-fit rounded-lg" aria-label="Praise home">
              <PraiseLogo size="md" decorative />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-ink-500">
              The open-source platform for collecting, organizing and
              showcasing customer testimonials — free and self-hosted.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-sm font-semibold tracking-tight text-ink-900">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="footer-link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-400">
            © {COPYRIGHT_YEAR} Praise. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalBarLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="footer-link text-xs">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
