import { CommunityNav } from "@/components/community/community-nav";
import { Container } from "@/components/ui/container";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-warm-50/30">
      {/* Community Section Sub-Header / Nav */}
      <div className="border-b border-line bg-warm-50/80 sticky top-16 z-30 backdrop-blur-xs">
        <Container className="flex items-center justify-between py-1">
          <CommunityNav />
        </Container>
      </div>

      <div className="py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}

