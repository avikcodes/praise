"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PraiseLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Landing-page navigation.
 *
 * In-page anchors point at sections of this page; `Documentation` and
 * `GitHub` are placeholders until those routes exist — swap the hrefs then.
 */
const navLinks = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Community", href: "/community" },
  { label: "Open source", href: "/open-source" },
  { label: "Developers", href: "/developers" },
  { label: "Self-host", href: "/self-host" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-warm-50">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg"
          aria-label="Praise home"
          onClick={closeMenu}
        >
          <PraiseLogo size="md" decorative />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ButtonLink href="/dashboard" variant="primary" size="sm">
            Get started
          </ButtonLink>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </Container>

      <div
        id="mobile-menu"
        className={cn(
          "border-t border-line bg-warm-50 lg:hidden",
          menuOpen ? "block" : "hidden",
        )}
      >
        <Container className="flex flex-col gap-1 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="nav-link"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-3 border-t border-line pt-4 flex flex-col gap-2">
            <Link href="/security" className="nav-link" onClick={closeMenu}>
              Security
            </Link>
            <Link href="/faq" className="nav-link" onClick={closeMenu}>
              FAQ
            </Link>
            <ButtonLink
              href="/dashboard"
              variant="primary"
              size="md"
              className="w-full mt-2"
              onClick={closeMenu}
            >
              Get started
            </ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}
