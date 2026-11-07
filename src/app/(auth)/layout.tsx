import Link from "next/link";
import { PraiseLogo } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/" aria-label="Praise Home" className="mb-6">
          <PraiseLogo size="md" decorative />
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="surface rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Open-source social proof engine &bull; Self-hosted &bull;{" "}
          <Link href="/privacy" className="underline hover:text-ink-800">
            Privacy
          </Link>{" "}
          &bull;{" "}
          <Link href="/terms" className="underline hover:text-ink-800">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}

