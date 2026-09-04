import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { auth } from "@/lib/auth";
import { getPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPublicPageMetadata({
  title: "Reviewed engineering memory for every coding agent",
  description:
    "Install Intertool to give coding agents reviewed, source-backed context scoped to the right organisation, repository, and path.",
  path: "/",
});

export default async function HomePage() {
  const session = await auth();

  const productBackendAvailable =
    process.env.NODE_ENV !== "production" || Boolean(process.env.SERVER_URL);

  if (session?.user && productBackendAvailable) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
