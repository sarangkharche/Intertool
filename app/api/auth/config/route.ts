import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export function GET() {
  return NextResponse.json(
    {
      github: Boolean(
        (process.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_ID) &&
        (process.env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_SECRET)
      ),
      development:
        process.env.NODE_ENV !== "production" &&
        process.env.DEV_AUTH_BYPASS === "true",
    },
    { headers: noStoreHeaders() }
  );
}
