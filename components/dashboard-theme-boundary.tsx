"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/my-memory",
  "/memories",
  "/repositories",
  "/settings",
  "/onboarding",
  "/design-system",
];

function isDashboardRoute(pathname: string): boolean {
  return DASHBOARD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function DashboardThemeBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const usesDashboardShell = isDashboardRoute(pathname);
  const usesDashboardPalette = usesDashboardShell || pathname === "/";

  if (!usesDashboardPalette) return children;

  return (
    <div
      className={cn(
        "dashboard-theme flex flex-1 flex-col",
        usesDashboardShell && "dashboard-shell"
      )}
    >
      {children}
    </div>
  );
}
