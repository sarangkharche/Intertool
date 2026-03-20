import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { Package } from "lucide-react";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{
        title: (
          <span className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <Package className="h-4 w-4" />
            intertool
          </span>
        ),
        url: "/",
      }}
    >
      {children}
    </DocsLayout>
  );
}
