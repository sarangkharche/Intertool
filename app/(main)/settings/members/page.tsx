"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Loader2,
  UserPlus,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  UserMinus,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgUser, OrgRole } from "@/lib/types";

const ROLE_BADGE: Record<OrgRole, { label: string; className: string }> = {
  owner: {
    label: "Owner",
    className: "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-500/15",
  },
  admin: {
    label: "Admin",
    className: "bg-blue-500/8 text-blue-700 dark:text-blue-400 border-blue-500/15",
  },
  member: {
    label: "Member",
    className: "bg-zinc-500/8 text-zinc-600 dark:text-zinc-400 border-zinc-500/15",
  },
};

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteId, setInviteId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);

  const username = (
    (session?.user as { username?: string })?.username ??
    session?.user?.name ??
    "unknown"
  ).toLowerCase();

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembers(data.members);
      const me = data.members.find(
        (m: OrgUser) => m.id === username
      );
      setCurrentRole(me?.role ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }
    if (status === "authenticated") fetchMembers();
  }, [status, router, fetchMembers]);

  const canManage = currentRole === "owner" || currentRole === "admin";

  const handleInvite = async () => {
    const id = inviteId.trim().toLowerCase();
    if (!id) return;

    setInviting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      if (!res.ok) {
        let msg = "Failed to add member";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success(`Added ${id}`);
      setInviteId("");
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (id: string, role: OrgRole) => {
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        let msg = "Failed to change role";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success(`Changed ${id} to ${role}`);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let msg = "Failed to remove member";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success(`Removed ${id}`);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg text-display">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? "s" : ""} in this registry
        </p>
      </div>

      {/* Invite bar */}
      {canManage && (
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="GitHub username or email..."
            value={inviteId}
            onChange={(e) => setInviteId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="h-8 text-sm"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteId.trim()}
            className="btn-pill shrink-0"
          >
            {inviting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <UserPlus className="h-3 w-3" />
            )}
            Add
          </button>
        </div>
      )}

      {/* Member list */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border-subtle">
        {members.map((member) => {
          const badge = ROLE_BADGE[member.role];
          const isMe = member.id === username;
          const isOwner = member.role === "owner";

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Avatar className="h-8 w-8">
                {member.avatar_url && (
                  <AvatarImage src={member.avatar_url} alt={member.display_name} />
                )}
                <AvatarFallback className="text-xs">
                  {member.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {member.display_name}
                  </p>
                  {isMe && (
                    <span className="text-[10px] text-muted-foreground">(you)</span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {member.id}
                  {member.provider === "google" ? " (Google)" : ""}
                </p>
              </div>

              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${badge.className}`}
              >
                {badge.label}
              </Badge>

              {canManage && !isMe && !isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="btn-ghost h-7 w-7 p-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {member.role === "member" && (
                      <DropdownMenuItem
                        onClick={() => handleChangeRole(member.id, "admin")}
                      >
                        <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                        Promote to Admin
                      </DropdownMenuItem>
                    )}
                    {member.role === "admin" && (
                      <DropdownMenuItem
                        onClick={() => handleChangeRole(member.id, "member")}
                      >
                        <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                        Demote to Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemove(member.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="mr-2 h-3.5 w-3.5" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isOwner && (
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No members yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
