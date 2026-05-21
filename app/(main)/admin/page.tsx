import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Admin");

export default function AdminPage() {
  redirect("/settings/admin");
}
