import { NextResponse } from "next/server";

export function apiError(
  message: string,
  status: number,
  details?: { field: string; message: string }[]
): NextResponse {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}), status },
    { status }
  );
}
