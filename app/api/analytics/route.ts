import { NextRequest, NextResponse } from "next/server";
import { getSkills } from "@/lib/registry";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    // If CRON_SECRET is set, require it
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // If CRON_SECRET is not set, require a valid session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
