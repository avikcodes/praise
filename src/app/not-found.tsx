import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * A real 404 page rather than the framework default: it keeps the
 * branding and points visitors back to real content. Next.js already
 * injects `<meta name="robots" content="noindex">` for every 404, so no
 * `robots` value is declared — declaring one again would emit a
 * duplicate robots tag. `robots: null` instead clears the `index,
 * follow` the root layout would otherwise inherit onto a URL that does
 * not exist. There is no canonical to clear — the root layout does not
 * declare one; `canonical: null` keeps it that way if that changes.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
  alternates: {
    canonical: null,
  },
  robots: null,
};

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
      <span className="eyebrow">404</span>
      <h1 className="display">Page not found</h1>
      <p className="lead max-w-xl">
        That URL does not exist on this site. The home page covers what
        Praise does, how it works, and how to run it yourself.
      </p>
      <ButtonLink href="/" variant="primary" size="lg">
        Back to the home page
        <ArrowRight size={17} />
      </ButtonLink>
    </Container>
  );
}
