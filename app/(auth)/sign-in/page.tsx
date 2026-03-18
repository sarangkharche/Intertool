"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Package } from "lucide-react";

interface AuthConfig {
  github: boolean;
  google: boolean;
  google_domain_hint: string | null;
  github_org_required: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  domain: "Your email domain is not allowed. Contact your admin.",
  google_disabled: "Google sign-in is not enabled for this organization.",
  no_domains: "Google sign-in has not been configured with allowed domains.",
  unverified: "Your Google email is not verified.",
  github_org:
    "You must be a member of this organization\u2019s GitHub org to sign in.",
};

function SignInForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ github: true, google: false, google_domain_hint: null, github_org_required: false }));
  }, []);

  return (
    <>
      <h1 className="mb-1 text-lg font-medium tracking-tight">
        Sign in to Intertool
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {config?.google
          ? "Use your organization account."
          : "Use your organization\u2019s GitHub account."}
      </p>

      {error && ERROR_MESSAGES[error] && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      <div className="space-y-2">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        {config?.google && (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            {config.google_domain_hint && (
              <p className="text-[11px] text-muted-foreground/60">
                For @{config.google_domain_hint} accounts
              </p>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground/50">
        Your identity is used for auth only. No repos or data are accessed.
      </p>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
