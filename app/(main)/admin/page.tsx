"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Settings, Shield, Loader2, Check, Database, Globe, KeyRound, Github } from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  s3_bucket: string;
  s3_region: string;
  s3_access_key_id: string;
  s3_secret_access_key: string;
  s3_endpoint?: string;
  admin_username: string;
  configured_at: string;
  google_auth_enabled?: boolean;
  google_allowed_domains?: string[];
  github_org?: string;
  github_org_required?: boolean;
}

const REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-south-1",
  "sa-east-1",
  "ca-central-1",
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [endpoint, setEndpoint] = useState("");

  // Google auth state
  const [googleClientConfigured, setGoogleClientConfigured] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleDomains, setGoogleDomains] = useState("");
  const [savingAuth, setSavingAuth] = useState(false);

  // GitHub org state
  const [githubOrg, setGithubOrg] = useState("");
  const [githubOrgRequired, setGithubOrgRequired] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setIsAdmin(data.is_admin);
        setNeedsSetup(data.needs_setup);
        setGoogleClientConfigured(data.google_client_configured ?? false);
        if (data.settings) {
          setBucket(data.settings.s3_bucket || "");
          setRegion(data.settings.s3_region || "us-east-1");
          setAccessKeyId(data.settings.s3_access_key_id || "");
          setSecretAccessKey(""); // never send back
          setEndpoint(data.settings.s3_endpoint || "");
          setGoogleEnabled(data.settings.google_auth_enabled ?? false);
          setGoogleDomains(
            (data.settings.google_allowed_domains ?? []).join(", ")
          );
          setGithubOrg(data.settings.github_org ?? "");
          setGithubOrgRequired(data.settings.github_org_required ?? false);
        }
        setLoading(false);
      });
  }, [status, router]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_bucket: bucket.trim(),
          s3_region: region,
          s3_access_key_id: accessKeyId.trim(),
          s3_secret_access_key: secretAccessKey.trim(),
          s3_endpoint: endpoint.trim() || undefined,
          s3_session_token: sessionToken.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          toast.error(err.error || `Connection failed (${res.status})`);
        } catch {
          toast.error(`Connection failed: ${res.status} ${res.statusText}`);
        }
        return;
      }
      const data = await res.json();
      if (data.ok) {
        toast.success("Connection successful");
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!bucket.trim() || !accessKeyId.trim()) {
      toast.error("Bucket and access key are required");
      return;
    }
    if (needsSetup && !secretAccessKey.trim()) {
      toast.error("Secret access key is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_bucket: bucket.trim(),
          s3_region: region,
          s3_access_key_id: accessKeyId.trim(),
          s3_secret_access_key: secretAccessKey.trim() || undefined,
          s3_endpoint: endpoint.trim() || undefined,
          s3_session_token: sessionToken.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("S3 settings saved");
      setNeedsSetup(false);
      setSettings({
        s3_bucket: bucket.trim(),
        s3_region: region,
        s3_access_key_id: accessKeyId.trim(),
        s3_secret_access_key: "",
        s3_endpoint: endpoint.trim() || undefined,
        admin_username:
          (session?.user as { username?: string })?.username ?? "",
        configured_at: new Date().toISOString(),
        google_auth_enabled: googleEnabled,
        google_allowed_domains: googleDomains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    const domains = googleDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    if (googleEnabled && domains.length === 0) {
      toast.error("At least one allowed domain is required when Google auth is enabled");
      return;
    }

    setSavingAuth(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Pass existing S3 settings to preserve them
          s3_bucket: bucket.trim(),
          s3_region: region,
          s3_access_key_id: accessKeyId.trim(),
          s3_endpoint: endpoint.trim() || undefined,
          // Auth fields
          google_auth_enabled: googleEnabled,
          google_allowed_domains: domains,
          github_org: githubOrg.trim() || undefined,
          github_org_required: githubOrgRequired,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Authentication settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingAuth(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!isAdmin && !needsSetup) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-lg border border-border p-8 text-center">
          <Shield className="mx-auto mb-3 h-5 w-5 text-muted-foreground/40" />
          <p className="mb-1 text-sm font-medium">Admin access required</p>
          <p className="text-xs text-muted-foreground">
            Only the admin can change storage settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-xl font-medium tracking-tight">
            {needsSetup ? "Setup" : "Admin Settings"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {needsSetup
            ? "Configure your registry storage and access controls."
            : "Manage storage, authentication, and access controls."}
        </p>
      </div>

      {/* S3 Storage */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-medium">S3 Storage</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Works with AWS S3, MinIO, Cloudflare R2, Wasabi, and any
            S3-compatible service.
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Bucket name
              </label>
              <Input
                placeholder="my-skill-registry"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Access Key ID
            </label>
            <Input
              placeholder="AKIA..."
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              className="h-8 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Secret Access Key
              {!needsSetup && (
                <span className="ml-1 text-muted-foreground/60">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <Input
              type="password"
              placeholder={needsSetup ? "wJalrXUtn..." : "********"}
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              className="h-8 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <label className="text-xs text-muted-foreground">
                Endpoint URL{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>
            </div>
            <Input
              placeholder="https://s3.us-east-1.amazonaws.com"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="h-8 font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground/60">
              Only needed for S3-compatible services (MinIO, R2, Wasabi). Leave
              blank for AWS S3.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Session Token{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              type="password"
              placeholder="IQoJb3..."
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              className="h-8 font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground/60">
              Required for AWS SSO / IAM Identity Center temporary credentials.
              Leave blank for permanent IAM keys.
            </p>
          </div>

          {/* Folder structure preview */}
          <div className="rounded-md border border-border bg-card px-3 py-2.5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Bucket structure
            </p>
            <pre className="font-mono text-xs text-muted-foreground leading-relaxed">
{`s3://${bucket || "bucket"}/
├── skills/{slug}/skill.json
├── mcp-servers/{slug}/skill.json
├── agent-tools/{slug}/skill.json
├── prompt-templates/{slug}/skill.json
├── _index.json
└── _categories.json`}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2">
            {settings && (
              <p className="text-xs text-muted-foreground">
                Configured by @{settings.admin_username}
              </p>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !bucket.trim() || !accessKeyId.trim()}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                Test Connection
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !bucket.trim() || !accessKeyId.trim()}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {needsSetup ? "Save & activate" : "Update"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="mt-6 rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-medium">Access Control</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Restrict who can sign in and access this registry.
          </p>
        </div>

        <div className="space-y-4 p-4">
          {/* GitHub org restriction */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">GitHub Organization</p>
                <p className="text-[11px] text-muted-foreground">
                  Only members of this GitHub org can sign in
                </p>
              </div>
            </div>
            <button
              onClick={() => setGithubOrgRequired(!githubOrgRequired)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                githubOrgRequired ? "bg-emerald-500" : "bg-muted-foreground/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  githubOrgRequired ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>

          {githubOrgRequired && (
            <div className="space-y-1.5 pl-5.5">
              <label className="text-xs text-muted-foreground">
                Organization name
              </label>
              <Input
                placeholder="my-github-org"
                value={githubOrg}
                onChange={(e) => setGithubOrg(e.target.value)}
                className="h-8 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60">
                The GitHub organization login name (from the URL). Users must
                be a member to sign in.
              </p>
            </div>
          )}

          {/* Google Workspace */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Google Workspace</p>
                  <p className="text-[11px] text-muted-foreground">
                    Restrict access to specific email domains
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {googleClientConfigured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Configured
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    Not configured
                  </span>
                )}
                <button
                  onClick={() => setGoogleEnabled(!googleEnabled)}
                  disabled={!googleClientConfigured}
                  className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-40 ${
                    googleEnabled ? "bg-emerald-500" : "bg-muted-foreground/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      googleEnabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {!googleClientConfigured && (
              <div className="mt-3 rounded-md border border-border bg-card px-3 py-2.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Setup:</span>
                  {" "}Create OAuth credentials in{" "}
                  <span className="font-mono text-[11px]">Google Cloud Console</span>
                  {" "}&rarr; Set{" "}
                  <span className="font-mono text-[11px]">GOOGLE_CLIENT_ID</span> and{" "}
                  <span className="font-mono text-[11px]">GOOGLE_CLIENT_SECRET</span>{" "}
                  env vars &rarr; Enable and add your domain(s) here.
                </p>
              </div>
            )}

            {googleEnabled && (
              <div className="mt-3 space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Allowed domains
                </label>
                <Input
                  placeholder="acme.com, subsidiary.com"
                  value={googleDomains}
                  onChange={(e) => setGoogleDomains(e.target.value)}
                  className="h-8 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  Comma-separated list of Google Workspace domains. Only users
                  with these email domains can sign in.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <button
              onClick={handleSaveAuth}
              disabled={savingAuth}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {savingAuth ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
