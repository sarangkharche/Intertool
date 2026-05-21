import type { Metadata } from "next";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Registry item");

export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
