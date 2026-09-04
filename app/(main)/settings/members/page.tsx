import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import { formatDate, type MeResponse } from "@/lib/memory-types";

interface Member {
  id: string;
  github_user_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/settings/members");

  const me = await intertoolApi<MeResponse>("/api/me");
  if (me.user.role === "member") redirect("/dashboard");
  const { items } = await intertoolApi<{ items: Member[] }>("/api/members");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-lg font-medium tracking-tight">Team members</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          People authorised to publish and retrieve context for{" "}
          {me.organization.name}.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-subtle bg-muted/35 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Joined
              </th>
              <th className="px-4 py-3 text-right font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3.5">
                  <p className="font-medium">{member.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </td>
                <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell">
                  {formatDate(member.created_at)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="rounded-full border border-border px-2 py-1 text-[11px] font-medium capitalize">
                    {member.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
