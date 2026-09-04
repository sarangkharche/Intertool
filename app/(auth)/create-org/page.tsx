import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateOrgPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/create-org");
  }

  redirect("/onboarding");
}
