import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  normalizeAuthCallbackUrl,
  orgAwareAuthRedirectPath,
} from "@/lib/auth-redirects";
import { getOrgSlug, isSaasMode } from "@/lib/org";
import { getOrgForUser, getOrgsForUser } from "@/lib/settings";
import { SignInForm } from "./sign-in-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function requestOrigin(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}

async function resolveUserOrg(username: string | undefined) {
  const activeOrg = await getOrgSlug();
  if (!username) return null;

  try {
    const orgs = await getOrgsForUser(username);
    if (activeOrg && orgs.includes(activeOrg)) return activeOrg;
    return orgs[0] ?? (await getOrgForUser(username));
  } catch {
    return null;
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const callbackUrl = normalizeAuthCallbackUrl(
    firstParam(params.callbackUrl),
    await requestOrigin()
  );
  const session = await auth();

  if (session?.user) {
    const username = (session.user as { username?: string }).username;

    if (isSaasMode()) {
      const orgSlug = await resolveUserOrg(username);
      if (orgSlug) {
        redirect(orgAwareAuthRedirectPath(callbackUrl, orgSlug));
      }
      redirect("/create-org");
    }

    redirect(callbackUrl);
  }

  return <SignInForm callbackUrl={callbackUrl} />;
}
