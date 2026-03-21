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
  Mail,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgUser, OrgRole, Invitation } from "@/lib/types";

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

function relativeExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

interface PendingInvitation {
  token: string;
  email: string;
  role: OrgRole;
  invited_by: string;
  created_at: string;
  expires_at: string;
}

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<OrgUser[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);

  const username = (
    (session?.user as { username?: string })?.username ??
    session?.user?.name ??
    "unknown"
  ).toLowerCase();

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembers(data.members);
      setInvitations(data.invitations ?? []);
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
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        let msg = "Failed to send invitation";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success(`Invitation sent to ${email}`);
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (token: string, email: string) => {
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let msg = "Failed to revoke invitation";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success(`Revoked invitation for ${email}`);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
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
            type="email"
            placeholder="Email address..."
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="h-8 text-sm"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="btn-pill shrink-0"
          >
            {inviting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <UserPlus className="h-3 w-3" />
            )}
            Invite
          </button>
        </div>
      )}

      {/* Pending invitations */}
      {canManage && invitations.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pending Invitations
          </h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border-subtle">
            {invitations.map((inv) => {
              const badge = ROLE_BADGE[inv.role];
              return (
                <div
                  key={inv.token}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {relativeExpiry(inv.expires_at)}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${badge.className}`}
                  >
                    {badge.label}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-500/15"
                  >
                    Pending
                  </Badge>

                  <button
                    onClick={() => handleRevoke(inv.token, inv.email)}
                    className="btn-ghost h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Revoke invitation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
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
