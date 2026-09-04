import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import { OnboardingFlow } from "@/components/memory/onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/onboarding");
  let hasOrganization = false;
  try {
    await intertoolApi("/api/me");
    hasOrganization = true;
  } catch {
    hasOrganization = false;
  }
  return <OnboardingFlow hasOrganization={hasOrganization} />;
}
