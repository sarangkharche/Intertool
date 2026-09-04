"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { developmentSignIn } from "./actions";

interface AuthConfig {
  github: boolean;
  development: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "GitHub sign-in could not be started. Try again.",
};

function SignInControls({ callbackUrl }: { callbackUrl: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [developmentUser, setDevelopmentUser] = useState("");

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() =>
        setConfig({
          github: true,
          development: false,
        })
      );
  }, []);

  return (
    <>
      <h1 className="mb-1 text-lg font-medium tracking-tight">
        Sign in to Intertool
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Use your organization account.
      </p>

      {error && ERROR_MESSAGES[error] && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      <div className="space-y-2">
        {config?.github && (
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-all duration-100 hover:bg-muted focus-ring"
            onClick={() => signIn("github", { redirectTo: callbackUrl })}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
        )}

        {config?.development && (
          <form action={developmentSignIn} className="pt-3">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">
                local development
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div
              className="grid grid-cols-3 gap-2"
              aria-label="Development users"
            >
              {["alice", "bob", "mallory"].map((user) => (
                <button
                  key={user}
                  type="submit"
                  name="user"
                  value={user}
                  className="min-h-11 rounded-md border border-border px-2 text-xs font-medium capitalize transition-colors hover:bg-muted focus-ring"
                >
                  {user}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <label className="sr-only" htmlFor="development-user">
                Development username
              </label>
              <input
                id="development-user"
                name="user"
                value={developmentUser}
                onChange={(event) =>
                  setDevelopmentUser(event.target.value.toLowerCase())
                }
                placeholder="another local user"
                pattern="[a-z0-9-]{3,40}"
                className="h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="submit"
                disabled={!/^[a-z0-9-]{3,40}$/.test(developmentUser)}
                className="btn-pill min-h-11 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground/50">
        Your identity is used for auth only. No repos or data are accessed.
      </p>
    </>
  );
}

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="dashboard-theme flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <Link
          href="/"
          aria-label="Back to Intertool home"
          className="mx-auto mb-5 flex h-10 w-10 items-center justify-center focus-ring"
        >
          <Package className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Suspense>
          <SignInControls callbackUrl={callbackUrl} />
        </Suspense>
      </div>
    </div>
  );
}
