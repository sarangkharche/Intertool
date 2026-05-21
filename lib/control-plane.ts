import postgres from "postgres";
import type { RegistrySettings } from "./settings";
import type { ApiToken, AuditEvent, Invitation, OrgRole, OrgUser } from "./types";

type SqlClient = ReturnType<typeof postgres>;

let client: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

export function hasControlPlane(): boolean {
  return !!connectionString();
}

function sql(): SqlClient {
  if (client) return client;
  const url = connectionString();
  if (!url) throw new Error("Postgres control plane is not configured");
  client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}

async function ensureSchema(): Promise<void> {
  if (!hasControlPlane()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS intertool_orgs (
        slug TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        plan TEXT NOT NULL DEFAULT 'free',
        subscription_status TEXT NOT NULL DEFAULT 'trialing',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS intertool_user_orgs (
        user_id TEXT NOT NULL,
        org_slug TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, org_slug)
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS intertool_user_orgs_user_idx
      ON intertool_user_orgs (user_id)
    `;
    await db`
      CREATE TABLE IF NOT EXISTS intertool_org_members (
        org_slug TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        display_name TEXT NOT NULL,
        provider TEXT NOT NULL,
        avatar_url TEXT,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (org_slug, user_id)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS intertool_api_tokens (
        hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        org_slug TEXT,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS intertool_api_tokens_user_idx
      ON intertool_api_tokens (org_slug, user_id)
    `;
    await db`
      CREATE TABLE IF NOT EXISTS intertool_invitations (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        invited_by TEXT NOT NULL,
        org_slug TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS intertool_invitations_email_idx
      ON intertool_invitations (org_slug, email)
    `;
    await db`
      CREATE TABLE IF NOT EXISTS intertool_audit_events (
        id TEXT PRIMARY KEY,
        org_slug TEXT,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS intertool_audit_events_org_created_idx
      ON intertool_audit_events (org_slug, created_at DESC)
    `;
  })();

  return schemaReady;
}

function orgId(orgSlug?: string): string {
  return orgSlug ?? "default";
}

function dateString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function orgSettingsFromRow(row: Record<string, unknown>): RegistrySettings {
  const settings = row.settings as RegistrySettings;
  return {
    ...settings,
    org_slug: String(row.slug),
    org_name: String(row.name),
    plan: row.plan as RegistrySettings["plan"],
    subscription_status:
      row.subscription_status as RegistrySettings["subscription_status"],
    stripe_customer_id: row.stripe_customer_id as string | undefined,
    stripe_subscription_id: row.stripe_subscription_id as string | undefined,
  } as RegistrySettings;
}

export async function cpOrgExists(orgSlug: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`SELECT 1 FROM intertool_orgs WHERE slug = ${orgSlug}`;
  return rows.length > 0;
}

export async function cpGetSettings(
  orgSlug: string
): Promise<RegistrySettings | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_orgs
    WHERE slug = ${orgSlug}
    LIMIT 1
  `;
  return rows[0] ? orgSettingsFromRow(rows[0]) : null;
}

export async function cpSaveSettings(
  settings: RegistrySettings,
  orgSlug?: string
): Promise<void> {
  await ensureSchema();
  const slug = orgId(orgSlug ?? settings.org_slug);
  const name = settings.org_name ?? slug;
  await sql()`
    INSERT INTO intertool_orgs (
      slug,
      name,
      settings,
      plan,
      subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      updated_at
    )
    VALUES (
      ${slug},
      ${name},
      ${sql().json(JSON.parse(JSON.stringify(settings)))},
      ${settings.plan ?? "free"},
      ${settings.subscription_status ?? "trialing"},
      ${settings.stripe_customer_id ?? null},
      ${settings.stripe_subscription_id ?? null},
      NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      settings = EXCLUDED.settings,
      plan = EXCLUDED.plan,
      subscription_status = EXCLUDED.subscription_status,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      updated_at = NOW()
  `;
}

export async function cpAddUserOrg(
  userId: string,
  orgSlug: string,
  active = true
): Promise<void> {
  await ensureSchema();
  const id = userId.toLowerCase();
  if (active) {
    await sql()`
      UPDATE intertool_user_orgs
      SET is_active = FALSE
      WHERE user_id = ${id}
    `;
  }
  await sql()`
    INSERT INTO intertool_user_orgs (user_id, org_slug, is_active)
    VALUES (${id}, ${orgSlug}, ${active})
    ON CONFLICT (user_id, org_slug) DO UPDATE SET
      is_active = EXCLUDED.is_active
  `;
}

export async function cpRemoveUserOrg(
  userId: string,
  orgSlug: string
): Promise<void> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const rows = await sql()`
    DELETE FROM intertool_user_orgs
    WHERE user_id = ${id} AND org_slug = ${orgSlug}
    RETURNING is_active
  `;
  if (!rows[0]?.is_active) return;
  await sql()`
    UPDATE intertool_user_orgs
    SET is_active = TRUE
    WHERE user_id = ${id}
      AND org_slug = (
        SELECT org_slug
        FROM intertool_user_orgs
        WHERE user_id = ${id}
        ORDER BY created_at ASC
        LIMIT 1
      )
  `;
}

export async function cpGetOrgForUser(
  userId: string
): Promise<string | null> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const rows = await sql()`
    SELECT org_slug
    FROM intertool_user_orgs
    WHERE user_id = ${id}
    ORDER BY is_active DESC, created_at ASC
    LIMIT 1
  `;
  return rows[0]?.org_slug ? String(rows[0].org_slug) : null;
}

export async function cpGetOrgsForUser(userId: string): Promise<string[]> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const rows = await sql()`
    SELECT org_slug
    FROM intertool_user_orgs
    WHERE user_id = ${id}
    ORDER BY is_active DESC, created_at ASC
  `;
  return rows.map((row) => String(row.org_slug));
}

export async function cpIsOrgMember(
  orgSlug: string,
  userId: string
): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    SELECT 1
    FROM intertool_org_members
    WHERE org_slug = ${orgSlug}
      AND user_id = ${userId.toLowerCase()}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function cpGetOrgMembers(orgSlug: string): Promise<string[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT user_id
    FROM intertool_org_members
    WHERE org_slug = ${orgSlug}
    ORDER BY joined_at ASC
  `;
  return rows.map((row) => String(row.user_id));
}

export async function cpGetUserRole(
  userId: string,
  orgSlug?: string
): Promise<OrgRole | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT role
    FROM intertool_org_members
    WHERE org_slug = ${orgId(orgSlug)}
      AND user_id = ${userId.toLowerCase()}
    LIMIT 1
  `;
  return (rows[0]?.role as OrgRole | undefined) ?? null;
}

export async function cpSetUserRole(
  userId: string,
  role: OrgRole,
  orgSlug?: string
): Promise<void> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const org = orgId(orgSlug);
  await sql()`
    INSERT INTO intertool_org_members (
      org_slug,
      user_id,
      role,
      display_name,
      provider,
      joined_at,
      last_seen_at
    )
    VALUES (${org}, ${id}, ${role}, ${userId}, 'github', NOW(), NOW())
    ON CONFLICT (org_slug, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      last_seen_at = NOW()
  `;
  await cpAddUserOrg(id, org, true);
}

export async function cpEnsureUserRecord(
  userId: string,
  profile: {
    display_name: string;
    provider: "github" | "google";
    avatar_url?: string;
  },
  role: OrgRole,
  orgSlug?: string
): Promise<OrgUser> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const org = orgId(orgSlug);
  const rows = await sql()`
    INSERT INTO intertool_org_members (
      org_slug,
      user_id,
      role,
      display_name,
      provider,
      avatar_url,
      joined_at,
      last_seen_at
    )
    VALUES (
      ${org},
      ${id},
      ${role},
      ${profile.display_name},
      ${profile.provider},
      ${profile.avatar_url ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT (org_slug, user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      provider = EXCLUDED.provider,
      avatar_url = EXCLUDED.avatar_url,
      last_seen_at = NOW()
    RETURNING *
  `;
  await cpAddUserOrg(id, org, true);
  const row = rows[0];
  return {
    id: String(row.user_id),
    role: row.role as OrgRole,
    display_name: String(row.display_name),
    provider: row.provider as "github" | "google",
    avatar_url: (row.avatar_url as string | null) ?? undefined,
    joined_at: dateString(row.joined_at),
    last_seen_at: dateString(row.last_seen_at),
  };
}

export async function cpListMembers(orgSlug?: string): Promise<OrgUser[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_org_members
    WHERE org_slug = ${orgId(orgSlug)}
    ORDER BY
      CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
      joined_at ASC
  `;
  return rows.map((row) => ({
    id: String(row.user_id),
    role: row.role as OrgRole,
    display_name: String(row.display_name),
    provider: row.provider as "github" | "google",
    avatar_url: (row.avatar_url as string | null) ?? undefined,
    joined_at: dateString(row.joined_at),
    last_seen_at: dateString(row.last_seen_at),
  }));
}

export async function cpRemoveMember(
  userId: string,
  orgSlug?: string
): Promise<void> {
  await ensureSchema();
  const id = userId.toLowerCase();
  const org = orgId(orgSlug);
  await sql()`
    DELETE FROM intertool_org_members
    WHERE org_slug = ${org}
      AND user_id = ${id}
  `;
  await sql()`
    DELETE FROM intertool_api_tokens
    WHERE org_slug = ${org}
      AND user_id = ${id}
  `;
  await cpRemoveUserOrg(id, org);
}

export async function cpCreateApiToken(token: ApiToken): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO intertool_api_tokens (hash, user_id, org_slug, label, created_at)
    VALUES (
      ${token.hash},
      ${token.user_id},
      ${token.org_slug ?? null},
      ${token.label},
      ${token.created_at}
    )
  `;
}

export async function cpGetApiTokenByHash(
  hash: string
): Promise<ApiToken | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_api_tokens
    WHERE hash = ${hash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    hash: String(row.hash),
    user_id: String(row.user_id),
    org_slug: (row.org_slug as string | null) ?? undefined,
    label: String(row.label),
    created_at: dateString(row.created_at),
  };
}

export async function cpListUserTokens(
  userId: string,
  orgSlug?: string
): Promise<ApiToken[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_api_tokens
    WHERE user_id = ${userId.toLowerCase()}
      AND org_slug IS NOT DISTINCT FROM ${orgSlug ?? null}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    hash: String(row.hash),
    user_id: String(row.user_id),
    org_slug: (row.org_slug as string | null) ?? undefined,
    label: String(row.label),
    created_at: dateString(row.created_at),
  }));
}

export async function cpRevokeToken(
  hash: string,
  orgSlug?: string
): Promise<ApiToken | null> {
  await ensureSchema();
  const token = await cpGetApiTokenByHash(hash);
  if (!token || (token.org_slug ?? undefined) !== orgSlug) return null;
  await sql()`DELETE FROM intertool_api_tokens WHERE hash = ${hash}`;
  return token;
}

export async function cpCreateInvitation(invitation: Invitation): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO intertool_invitations (
      token,
      email,
      role,
      invited_by,
      org_slug,
      created_at,
      expires_at
    )
    VALUES (
      ${invitation.token},
      ${invitation.email},
      ${invitation.role},
      ${invitation.invited_by},
      ${invitation.org_slug ?? null},
      ${invitation.created_at},
      ${invitation.expires_at}
    )
  `;
}

export async function cpGetInvitation(
  token: string
): Promise<Invitation | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_invitations
    WHERE token = ${token}
      AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    token: String(row.token),
    email: String(row.email),
    role: row.role as OrgRole,
    invited_by: String(row.invited_by),
    org_slug: (row.org_slug as string | null) ?? undefined,
    created_at: dateString(row.created_at),
    expires_at: dateString(row.expires_at),
  };
}

export async function cpGetInvitationByEmail(
  email: string,
  orgSlug?: string
): Promise<Invitation | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT token
    FROM intertool_invitations
    WHERE email = ${email.toLowerCase()}
      AND org_slug IS NOT DISTINCT FROM ${orgSlug ?? null}
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0]?.token ? cpGetInvitation(String(rows[0].token)) : null;
}

export async function cpListPendingInvitations(
  orgSlug?: string
): Promise<Invitation[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_invitations
    WHERE org_slug IS NOT DISTINCT FROM ${orgSlug ?? null}
      AND expires_at > NOW()
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    token: String(row.token),
    email: String(row.email),
    role: row.role as OrgRole,
    invited_by: String(row.invited_by),
    org_slug: (row.org_slug as string | null) ?? undefined,
    created_at: dateString(row.created_at),
    expires_at: dateString(row.expires_at),
  }));
}

export async function cpDeleteInvitation(token: string): Promise<void> {
  await ensureSchema();
  await sql()`DELETE FROM intertool_invitations WHERE token = ${token}`;
}

export async function cpAppendAuditEvent(event: AuditEvent): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO intertool_audit_events (
      id,
      org_slug,
      actor,
      action,
      target_type,
      target_id,
      metadata,
      created_at
    )
    VALUES (
      ${event.id},
      ${event.org_slug ?? null},
      ${event.actor},
      ${event.action},
      ${event.target_type},
      ${event.target_id},
      ${event.metadata ? sql().json(event.metadata) : null},
      ${event.created_at}
    )
  `;
}

export async function cpListAuditEvents(
  orgSlug?: string,
  limit = 100
): Promise<AuditEvent[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT *
    FROM intertool_audit_events
    WHERE org_slug IS NOT DISTINCT FROM ${orgSlug ?? null}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: String(row.id),
    org_slug: (row.org_slug as string | null) ?? undefined,
    actor: String(row.actor),
    action: row.action as AuditEvent["action"],
    target_type: row.target_type as AuditEvent["target_type"],
    target_id: String(row.target_id),
    metadata:
      (row.metadata as Record<string, string | number | boolean | null>) ??
      undefined,
    created_at: dateString(row.created_at),
  }));
}

export async function cpFindOrgByStripeSubscription(
  subscriptionId: string
): Promise<string | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT slug
    FROM intertool_orgs
    WHERE stripe_subscription_id = ${subscriptionId}
    LIMIT 1
  `;
  return rows[0]?.slug ? String(rows[0].slug) : null;
}

export async function cpFindOrgByStripeCustomer(
  customerId: string
): Promise<string | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT slug
    FROM intertool_orgs
    WHERE stripe_customer_id = ${customerId}
    LIMIT 1
  `;
  return rows[0]?.slug ? String(rows[0].slug) : null;
}
