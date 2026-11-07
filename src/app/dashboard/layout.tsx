import { ToastProvider } from "@/components/dashboard/toast-context";
import { WorkspaceProvider } from "@/components/dashboard/workspace-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata = {
  title: "Dashboard",
  description: "Praise Core application workspace",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <DashboardShell>{children}</DashboardShell>
      </WorkspaceProvider>
    </ToastProvider>
  );
}
