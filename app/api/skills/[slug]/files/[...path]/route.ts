import { NextRequest, NextResponse } from "next/server";
import { getSkillFile } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { apiError } from "@/lib/api-utils";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function contentDispositionName(path: string): string {
  const name = path.split("/").pop() || "download";
  return name.replace(/["\\\r\n]/g, "_");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug, path } = await params;
  const filePath = path.join("/");
  const result = await getSkillFile(slug, filePath);
  if (!result) {
    return apiError("File not found", 404);
  }

  return new NextResponse(Buffer.from(result.body), {
    headers: {
      ...noStoreHeaders(),
      "Content-Type": result.contentType,
      "Content-Length": String(result.file.size),
      "Content-Disposition": `attachment; filename="${contentDispositionName(result.file.path)}"`,
      "X-Content-SHA256": result.file.sha256,
    },
  });
}
