import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { auth } from "@/lib/auth";
import { getPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPublicPageMetadata({
  title: "Governed engineering memory for teams and enterprises",
  description:
    "Intertool scales reviewed, source-backed engineering context from one repository to an enterprise-wide coding-agent rollout.",
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
