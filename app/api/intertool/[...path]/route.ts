import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, signedWebHeaders } from "@/lib/intertool-api";

export const dynamic = "force-dynamic";

function csrfAllowed(request: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host");
  if (!requestHost) return false;
  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const identity = await getSessionIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    );
  }
  if (!csrfAllowed(request)) {
    return NextResponse.json(
      {
        error: {
          code: "csrf_rejected",
          message: "Cross-origin mutation rejected",
        },
      },
      { status: 403 }
    );
  }
  const { path } = await context.params;
  const targetPath = `/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers = signedWebHeaders(identity, request.method, targetPath);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();
  const response = await fetch(
    `${process.env.SERVER_URL ?? "http://127.0.0.1:3001"}${targetPath}`,
    { method: request.method, headers, body, cache: "no-store" }
  );
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
