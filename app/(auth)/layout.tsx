import type { Metadata } from "next";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Authentication");

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
