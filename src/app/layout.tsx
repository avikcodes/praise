import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SUMMARY,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Site-wide metadata. `metadataBase` resolves the relative canonical and
 * social URLs; the Open Graph and Twitter images come from the
 * `opengraph-image.tsx` / `twitter-image.tsx` file conventions, so they
 * are deliberately not repeated here.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Praise",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // No `alternates.canonical` or `openGraph.url` here: those are per-page
  // facts. A value set in this layout would be inherited by every child
  // route (canonicalising the whole site to "/") unless each page
  // remembered to override it. Pages set them through `pageMetadata()`.
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * Who the site belongs to and what the software is. Deliberately
 * minimal: no logo, social profiles, addresses, ratings or prices are
 * claimed because none are established for the project yet.
 */
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/praise-logo.svg`,
  image: `${SITE_URL}/brand/praise-social.png`,
  description: SITE_SUMMARY,
};

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_SUMMARY,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Docker, Linux, macOS, Windows",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={[organization, softwareApplication]} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:border focus:border-brand-200 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-700"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <MarketingShell>{children}</MarketingShell>
        </Suspense>
      </body>
    </html>
  );
}
