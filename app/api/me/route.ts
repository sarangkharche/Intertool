import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  return NextResponse.json({
    username: authResult.username,
    role: authResult.role,
  });
}
