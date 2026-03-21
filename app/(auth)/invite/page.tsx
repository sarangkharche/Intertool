"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Package, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface InvitationDetails {
  email: string;
  role: string;
  invited_by: string;
  org_slug?: string;
  expires_at: string;
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, status: sessionStatus } = useSession();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

  const fetchInvitation = useCallback(async () => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setError("This invitation was not found or has already been used.");
        setLoading(false);
        return;
      }
      if (res.status === 410) {
        setError("This invitation has expired.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load invitation");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInvitation(data.invitation);
    } catch {
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleAccept = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to accept invitation");
        return;
      }
      setAccepted(true);
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to decline invitation");
        return;
      }
      setDeclined(true);
    } catch {
      setError("Failed to decline invitation");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invitation...
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>
        <h1 className="mb-2 text-lg font-medium tracking-tight">
          Invitation unavailable
        </h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </>
    );
  }

  if (accepted) {
    return (
      <>
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-lg font-medium tracking-tight">Welcome!</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You've joined as a {invitation?.role}.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to Dashboard
        </a>
      </>
    );
  }

  if (declined) {
    return (
      <>
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-500/10">
          <XCircle className="h-5 w-5 text-zinc-400" />
        </div>
        <h1 className="mb-2 text-lg font-medium tracking-tight">
          Invitation declined
        </h1>
        <p className="text-sm text-muted-foreground">
          You've declined this invitation. You can close this page.
        </p>
      </>
    );
  }

  if (!invitation) return null;

  const expiresIn = Math.max(
    0,
    Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  // Not signed in: show sign-in buttons
  if (!session) {
    const callbackUrl = `/invite?token=${token}`;
    return (
      <>
        <h1 className="mb-1 text-lg font-medium tracking-tight">
          You're invited
        </h1>
        <p className="mb-2 text-sm text-muted-foreground">
          <strong className="text-foreground">{invitation.invited_by}</strong>{" "}
          invited you to join as a{" "}
          <strong className="text-foreground">{invitation.role}</strong>.
        </p>
        <p className="mb-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          Expires in {expiresIn} day{expiresIn !== 1 ? "s" : ""}
        </p>

        <p className="mb-3 text-sm text-muted-foreground">
          Sign in to accept this invitation.
        </p>

        <div className="space-y-2">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-all duration-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-all duration-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
      </>
    );
  }

  // Signed in: show accept/decline
  return (
    <>
      <h1 className="mb-1 text-lg font-medium tracking-tight">
        You're invited
      </h1>
      <p className="mb-2 text-sm text-muted-foreground">
        <strong className="text-foreground">{invitation.invited_by}</strong>{" "}
        invited you to join as a{" "}
        <strong className="text-foreground">{invitation.role}</strong>.
      </p>
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
        <Clock className="h-3 w-3" />
        Expires in {expiresIn} day{expiresIn !== 1 ? "s" : ""}
      </p>

      <div className="space-y-2">
        <button
          onClick={handleAccept}
          disabled={actionLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Accept Invitation
        </button>
        <button
          onClick={handleDecline}
          disabled={actionLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-all duration-100 hover:bg-muted disabled:opacity-50"
        >
          Decline
        </button>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/50">
        Signed in as {session.user?.email || (session.user as { username?: string })?.username}
      </p>
    </>
  );
}

export default function InvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <Suspense>
          <InviteContent />
        </Suspense>
      </div>
    </div>
  );
}
