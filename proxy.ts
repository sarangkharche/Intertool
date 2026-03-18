import { NextRequest, NextResponse } from "next/server";

const SAAS_DOMAIN = process.env.INTERTOOL_DOMAIN || "intertool.sh";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // Extract org slug from subdomain (e.g., storio.intertool.sh → storio)
  if (process.env.INTERTOOL_MODE === "saas" && host.endsWith(`.${SAAS_DOMAIN}`)) {
    const orgSlug = host.replace(`.${SAAS_DOMAIN}`, "").split(".")[0];

    if (orgSlug && orgSlug !== "www") {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-slug", orgSlug);

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
