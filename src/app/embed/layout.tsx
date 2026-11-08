import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Praise Testimonials Widget",
  description: "Embeddable customer testimonials powered by Praise.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-auto min-h-0 bg-transparent p-0 m-0 overflow-x-hidden antialiased selection:bg-brand-500 selection:text-white">
      {children}
    </div>
  );
}

