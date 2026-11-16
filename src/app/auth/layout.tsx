import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Praise",
  description: "Sign in or create your Praise account.",
};

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
