"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Settings, Shield, Loader2, Check, Database, Globe } from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  s3_bucket: string;
  s3_region: string;
  s3_access_key_id: string;
  s3_secret_access_key: string;
  s3_endpoint?: string;
  admin_username: string;
  configured_at: string;
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
        if (data.settings) {
          setBucket(data.settings.s3_bucket || "");
          setRegion(data.settings.s3_region || "us-east-1");
          setAccessKeyId(data.settings.s3_access_key_id || "");
          setSecretAccessKey(""); // never send back
          setEndpoint(data.settings.s3_endpoint || "");
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
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
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
            ? "Configure S3 storage where all skills will be stored."
            : "Manage the S3 storage configuration."}
        </p>
      </div>

      {/* S3 config */}
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
    </div>
  );
}
