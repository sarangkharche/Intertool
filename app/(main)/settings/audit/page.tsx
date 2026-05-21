import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { authorize } from "@/lib/rbac";
import { listAuditEvents } from "@/lib/audit-log";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

function formatAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" / ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AuditSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();
  const authz = await authorize(username, "settings:manage", orgSlug);
  if (!authz.allowed) redirect("/settings");

  const events = await listAuditEvents(orgSlug, 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg text-display">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent administrative and registry governance events.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Activity className="mx-auto mb-3 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm font-medium">No audit events yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Settings changes, submissions, approvals, and member changes will
            appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle rounded-lg border border-border bg-card">
          {events.map((event) => (
            <div key={event.id} className="px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {formatAction(event.action)}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {event.target_type}:{event.target_id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Actor: {event.actor}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(event.created_at)}
                </span>
              </div>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
