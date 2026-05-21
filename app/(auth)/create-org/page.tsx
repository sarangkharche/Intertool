import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSaasMode } from "@/lib/org";
import { getOrgForUser } from "@/lib/settings";
import { CreateOrgForm } from "./create-org-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateOrgPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/create-org");
  }

  const username = (session.user as { username?: string }).username;
  if (isSaasMode() && username) {
    let orgSlug: string | null = null;
    try {
      orgSlug = await getOrgForUser(username);
    } catch {
      // Render the form so the API can show a concrete storage error.
    }
    if (orgSlug) redirect(`/${orgSlug}/settings`);
  }

  return <CreateOrgForm />;
}
