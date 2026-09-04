import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { normalizeAuthCallbackUrl } from "@/lib/auth-redirects";
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
    redirect(callbackUrl);
  }

  return <SignInForm callbackUrl={callbackUrl} />;
}
