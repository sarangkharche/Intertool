import { NextRequest, NextResponse } from "next/server";
import { getSkills } from "@/lib/registry";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skills, total } = await getSkills({ limit: 1000 });

  const typeCounts: Record<string, number> = {};
  for (const s of skills) {
    typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
  }

  return NextResponse.json({
    total_skills: total,
    by_type: typeCounts,
    aggregated_at: new Date().toISOString(),
  });
}
