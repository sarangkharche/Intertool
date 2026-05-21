import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrivatePageMetadata } from "@/lib/seo";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { authorize } from "@/lib/rbac";
import { getSkillsByStatus } from "@/lib/registry";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { ReviewQueueActions } from "@/components/review-queue-actions";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, ShieldCheck } from "lucide-react";

export const metadata: Metadata = getPrivatePageMetadata("Review");

function formatDate(value?: string): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();
  const authz = await authorize(username, "skill:edit_any", orgSlug);
  if (!authz.allowed) redirect("/dashboard?mine=true");

  const items = await getSkillsByStatus(["review"], 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-lg text-display">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve new submissions before they become available to the
          organization.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm font-medium">No pending submissions</p>
          <p className="mt-1 text-xs text-muted-foreground">
            New items that require review will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle rounded-lg border border-border bg-card">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/skills/${item.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
                  <Badge variant="outline" className="text-[10px]">
                    {SKILL_TYPE_LABELS[item.type]}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                  <span>
                    Submitted by @{item.review_requested_by ?? item.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.review_requested_at ?? item.created_at)}
                  </span>
                </div>
              </div>
              <ReviewQueueActions slug={item.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
