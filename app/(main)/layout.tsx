import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NavigationProgress } from "@/components/navigation-progress";
import { PreferencesApplier } from "@/components/preferences-applier";
import { DashboardThemeBoundary } from "@/components/dashboard-theme-boundary";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PreferencesApplier />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <DashboardThemeBoundary>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </DashboardThemeBoundary>
    </div>
  );
}
