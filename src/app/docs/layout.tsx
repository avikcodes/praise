import { DocsSidebar } from "@/components/docs/sidebar";
import { Container } from "@/components/ui/container";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-warm-50/30">
      <Container className="flex flex-col lg:flex-row lg:gap-10 py-6 lg:py-10">
        <DocsSidebar />
        <div className="flex-1 min-w-0 pt-4 lg:pt-0">
          {children}
        </div>
      </Container>
    </div>
  );
}

