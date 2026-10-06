import crypto from "node:crypto";
import postgres from "postgres";
import type {
  CreateMemoryInput,
  MemoryConfidence,
  MemoryStatus,
  MemoryType,
  PersonalMemoryImportInput,
  ReportReason,
  Role,
} from "@intertool/contracts";

export interface Actor {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  role: Role;
  subject: string;
  name: string;
  email: string;
}

export interface MemoryRecord {
  id: string;
  organization_id: string;
  repository_id: string | null;
  repository_full_name: string | null;
  type: MemoryType;
  title: string;
  content: string;
  status: MemoryStatus;
  confidence: MemoryConfidence;
  paths: string[];
  tags: string[];
  source_url: string | null;
  source_label: string | null;
  created_by: string;
  author_name: string;
  published_by: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  open_report_count?: number;
  text_rank?: number;
}

export interface PersonalMemoryRecord {
  id: string;
  user_id: string;
  source_kind: string;
  source_key: string;
  title: string;
  content: string;
  content_hash: string;
  source_modified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type Sql = ReturnType<typeof postgres>;
type Row = Record<string, unknown>;

let sharedClient: Sql | null = null;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return value;
}

export function getDatabase(): Sql {
  if (!sharedClient) {
    sharedClient = postgres(databaseUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sharedClient;
}

export async function closeDatabase(): Promise<void> {
  if (sharedClient) await sharedClient.end();
  sharedClient = null;
}

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
  }
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function memoryFromRow(row: Row): MemoryRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    repository_id: row.repository_id ? String(row.repository_id) : null,
    repository_full_name: row.repository_full_name
      ? String(row.repository_full_name)
      : null,
    type: row.type as MemoryType,
    title: String(row.title),
    content: String(row.content),
    status: row.status as MemoryStatus,
    confidence: row.confidence as MemoryConfidence,
    paths: (row.paths as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    source_url: row.source_url ? String(row.source_url) : null,
    source_label: row.source_label ? String(row.source_label) : null,
    created_by: String(row.created_by),
    author_name: String(row.author_name ?? "Unknown"),
    published_by: row.published_by ? String(row.published_by) : null,
    published_at: iso(row.published_at),
    expires_at: iso(row.expires_at),
    created_at: iso(row.created_at) ?? "",
    updated_at: iso(row.updated_at) ?? "",
    open_report_count: Number(row.open_report_count ?? 0),
    text_rank: Number(row.text_rank ?? 0),
  };
}

function personalMemoryFromRow(row: Row): PersonalMemoryRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    source_kind: String(row.source_kind),
    source_key: String(row.source_key),
    title: String(row.title),
    content: String(row.content),
    content_hash: String(row.content_hash),
    source_modified_at: iso(row.source_modified_at),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: iso(row.created_at) ?? "",
    updated_at: iso(row.updated_at) ?? "",
  };
}

function encodeCursor(row: { created_at: unknown; id: unknown }): string {
  return Buffer.from(
    JSON.stringify([iso(row.created_at), String(row.id)])
  ).toString("base64url");
}

function decodeCursor(value?: string): [string | null, string | null] {
  if (!value) return [null, null];
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    );
    if (!Array.isArray(decoded) || decoded.length !== 2) throw new Error();
    return [String(decoded[0]), String(decoded[1])];
  } catch {
    throw new StoreError("Invalid pagination cursor", 400, "invalid_cursor");
  }
}

function canManage(actor: Actor, ownerId: string): boolean {
  return (
    actor.role === "owner" || actor.role === "admin" || actor.userId === ownerId
  );
}

async function appendAudit(
  db: Sql,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await db`
    INSERT INTO audit_events (
      organization_id, actor_user_id, action, entity_type, entity_id, metadata
    ) VALUES (
      ${actor.organizationId}, ${actor.userId}, ${action}, ${entityType},
      ${entityId}, ${db.json(JSON.parse(JSON.stringify(metadata)))}
    )
  `;
}

export class IntertoolStore {
  constructor(private readonly db: Sql = getDatabase()) {}

  async health(): Promise<void> {
    await this.db`SELECT 1`;
  }

  async ensureUser(input: {
    subject: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<Row> {
    const email =
      input.email?.toLowerCase() ||
      (input.subject.includes("@")
        ? input.subject.toLowerCase()
        : `${input.subject}@users.invalid`);
    const rows = await this.db`
      INSERT INTO users (github_user_id, email, name, avatar_url)
      VALUES (${input.subject}, ${email}, ${input.name ?? input.subject}, ${input.avatarUrl ?? null})
      ON CONFLICT (github_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = NOW()
      RETURNING *
    `;
    return rows[0] as Row;
  }

  async createOrganization(
    identity: {
      subject: string;
      email?: string;
      name?: string;
      avatarUrl?: string;
    },
    input: { name: string; slug: string }
  ): Promise<{ id: string; name: string; slug: string }> {
    return this.db.begin(async (tx) => {
      const email =
        identity.email?.toLowerCase() ||
        (identity.subject.includes("@")
          ? identity.subject.toLowerCase()
          : `${identity.subject}@users.invalid`);
      const users = await tx`
        INSERT INTO users (github_user_id, email, name, avatar_url)
        VALUES (${identity.subject}, ${email}, ${identity.name ?? identity.subject}, ${identity.avatarUrl ?? null})
        ON CONFLICT (github_user_id) DO UPDATE SET
          email = EXCLUDED.email, name = EXCLUDED.name,
          avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url), updated_at = NOW()
        RETURNING id
      `;
      let orgRows;
      try {
        orgRows = await tx`
          INSERT INTO organizations (name, slug)
          VALUES (${input.name}, ${input.slug})
          RETURNING id, name, slug
        `;
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new StoreError(
            "Organization slug is already in use",
            409,
            "slug_taken"
          );
        }
        throw error;
      }
      await tx`
        INSERT INTO memberships (organization_id, user_id, role)
        VALUES (${orgRows[0].id}, ${users[0].id}, 'owner')
      `;
      return {
        id: String(orgRows[0].id),
        name: String(orgRows[0].name),
        slug: String(orgRows[0].slug),
      };
    });
  }

  async addMembership(
    actor: Actor,
    identity: {
      subject: string;
      email?: string;
      name?: string;
      avatarUrl?: string;
    },
    role: Role = "member"
  ): Promise<void> {
    if (actor.role === "member") {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    const user = await this.ensureUser(identity);
    await this.db`
      INSERT INTO memberships (organization_id, user_id, role)
      VALUES (${actor.organizationId}, ${String(user.id)}, ${role})
      ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `;
  }

  async authenticateInternal(
    subject: string,
    orgSlug?: string
  ): Promise<Actor | null> {
    const rows = await this.db`
      SELECT
        u.id AS user_id, u.github_user_id, u.email, u.name,
        o.id AS organization_id, o.slug AS organization_slug, m.role
      FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN organizations o ON o.id = m.organization_id
      WHERE (u.github_user_id = ${subject} OR LOWER(u.email) = LOWER(${subject}))
        AND (${orgSlug ?? null}::text IS NULL OR o.slug = ${orgSlug ?? null})
      ORDER BY m.created_at ASC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      userId: String(row.user_id),
      organizationId: String(row.organization_id),
      organizationSlug: String(row.organization_slug),
      role: row.role as Role,
      subject: String(row.github_user_id ?? row.email),
      name: String(row.name),
      email: String(row.email),
    };
  }

  async authenticateToken(token: string): Promise<Actor | null> {
    const match = /^itk_([a-f0-9]{8})_([A-Za-z0-9_-]{20,})$/.exec(token);
    if (!match) return null;
    const candidates = await this.db`
      SELECT
        t.id AS token_id, t.token_hash, t.revoked_at, t.expires_at,
        u.id AS user_id, u.github_user_id, u.email, u.name,
        o.id AS organization_id, o.slug AS organization_slug, m.role
      FROM api_tokens t
      JOIN users u ON u.id = t.user_id
      JOIN organizations o ON o.id = t.organization_id
      JOIN memberships m ON m.user_id = u.id AND m.organization_id = o.id
      WHERE t.token_prefix = ${match[1]}
    `;
    const suppliedHash = crypto.createHash("sha256").update(token).digest();
    let matched: (typeof candidates)[number] | undefined;
    for (const row of candidates) {
      const storedHash = Buffer.from(String(row.token_hash), "hex");
      if (
        storedHash.length === suppliedHash.length &&
        crypto.timingSafeEqual(storedHash, suppliedHash)
      ) {
        matched = row;
      }
    }
    if (!matched || matched.revoked_at) return null;
    if (
      matched.expires_at &&
      new Date(String(matched.expires_at)) <= new Date()
    )
      return null;
    await this
      .db`UPDATE api_tokens SET last_used_at = NOW() WHERE id = ${matched.token_id}`;
    return {
      userId: String(matched.user_id),
      organizationId: String(matched.organization_id),
      organizationSlug: String(matched.organization_slug),
      role: matched.role as Role,
      subject: String(matched.github_user_id ?? matched.email),
      name: String(matched.name),
      email: String(matched.email),
    };
  }

  async me(actor: Actor) {
    return {
      user: {
        id: actor.userId,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
      organization: {
        id: actor.organizationId,
        slug: actor.organizationSlug,
        name: String(
          (
            await this.db`
          SELECT name FROM organizations WHERE id = ${actor.organizationId}
        `
          )[0]?.name ?? actor.organizationSlug
        ),
      },
    };
  }

  async listMembers(
    actor: Actor,
    options: { cursor?: string; limit?: number } = {}
  ) {
    if (actor.role === "member") {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    const limit = options.limit ?? 25;
    const [cursorDate, cursorId] = decodeCursor(options.cursor);
    const rows = await this.db`
      SELECT
        u.id, u.github_user_id, u.email, u.name, u.avatar_url,
        m.role, m.created_at
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE m.organization_id = ${actor.organizationId}
        AND (${cursorDate}::timestamptz IS NULL OR (m.created_at, u.id) < (${cursorDate}::timestamptz, ${cursorId}::uuid))
      ORDER BY m.created_at DESC, u.id DESC
      LIMIT ${limit + 1}
    `;
    const items = rows.slice(0, limit);
    return {
      items,
      next_cursor:
        rows.length > limit && items.length
          ? encodeCursor({
              created_at: items[items.length - 1].created_at,
              id: items[items.length - 1].id,
            })
          : null,
    };
  }

  async listRepositories(
    actor: Actor,
    options: { cursor?: string; limit?: number } = {}
  ) {
    const limit = options.limit ?? 25;
    const [cursorDate, cursorId] = decodeCursor(options.cursor);
    const rows = await this.db`
      SELECT id, provider, full_name, default_branch, created_at, updated_at
      FROM repositories
      WHERE organization_id = ${actor.organizationId}
        AND (${cursorDate}::timestamptz IS NULL OR (created_at, id) < (${cursorDate}::timestamptz, ${cursorId}::uuid))
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit + 1}
    `;
    const items = rows.slice(0, limit);
    return {
      items,
      next_cursor:
        rows.length > limit && items.length
          ? encodeCursor({
              created_at: items[items.length - 1].created_at,
              id: items[items.length - 1].id,
            })
          : null,
    };
  }

  async createRepository(
    actor: Actor,
    input: { full_name: string; default_branch: string }
  ) {
    if (actor.role === "member") {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    try {
      const rows = await this.db`
        INSERT INTO repositories (organization_id, provider, full_name, default_branch)
        VALUES (${actor.organizationId}, 'github', ${input.full_name}, ${input.default_branch})
        RETURNING id, provider, full_name, default_branch, created_at, updated_at
      `;
      return rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new StoreError(
          "Repository is already registered",
          409,
          "repository_exists"
        );
      }
      throw error;
    }
  }

  async updateRepository(
    actor: Actor,
    id: string,
    input: { full_name?: string; default_branch?: string }
  ) {
    if (actor.role === "member")
      throw new StoreError("Insufficient permission", 403, "forbidden");
    const current = await this.db`
      SELECT * FROM repositories WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    if (!current[0])
      throw new StoreError("Repository not found", 404, "not_found");
    const rows = await this.db`
      UPDATE repositories SET
        full_name = ${input.full_name ?? String(current[0].full_name)},
        default_branch = ${input.default_branch ?? String(current[0].default_branch)},
        updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
      RETURNING id, provider, full_name, default_branch, created_at, updated_at
    `;
    return rows[0];
  }

  async deleteRepository(actor: Actor, id: string): Promise<void> {
    if (actor.role === "member")
      throw new StoreError("Insufficient permission", 403, "forbidden");
    const rows = await this.db`
      DELETE FROM repositories WHERE id = ${id} AND organization_id = ${actor.organizationId}
      RETURNING id
    `;
    if (!rows[0])
      throw new StoreError("Repository not found", 404, "not_found");
  }

  async repositoryByName(actor: Actor, fullName: string): Promise<Row | null> {
    const rows = await this.db`
      SELECT * FROM repositories
      WHERE organization_id = ${actor.organizationId} AND LOWER(full_name) = LOWER(${fullName})
      LIMIT 1
    `;
    return (rows[0] as Row | undefined) ?? null;
  }

  async createToken(
    actor: Actor,
    input: { name: string; expires_at?: string | null }
  ): Promise<{
    id: string;
    name: string;
    token_prefix: string;
    expires_at: string | null;
    created_at: string;
    token: string;
  }> {
    const prefix = crypto.randomBytes(4).toString("hex");
    const plaintext = `itk_${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
    const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
    const rows = await this.db`
      INSERT INTO api_tokens (
        organization_id, user_id, name, token_prefix, token_hash, expires_at
      ) VALUES (
        ${actor.organizationId}, ${actor.userId}, ${input.name}, ${prefix},
        ${hash}, ${input.expires_at ?? null}
      )
      RETURNING id, name, token_prefix, expires_at, created_at
    `;
    await appendAudit(
      this.db,
      actor,
      "token.created",
      "api_token",
      String(rows[0].id),
      {
        name: input.name,
        token_prefix: prefix,
      }
    );
    return {
      id: String(rows[0].id),
      name: String(rows[0].name),
      token_prefix: String(rows[0].token_prefix),
      expires_at: iso(rows[0].expires_at),
      created_at: iso(rows[0].created_at) ?? "",
      token: plaintext,
    };
  }

  async listTokens(
    actor: Actor,
    options: { cursor?: string; limit?: number } = {}
  ) {
    const includeAll = actor.role === "owner" || actor.role === "admin";
    const limit = options.limit ?? 25;
    const [cursorDate, cursorId] = decodeCursor(options.cursor);
    const rows = await this.db`
      SELECT t.id, t.name, t.token_prefix, t.last_used_at, t.expires_at,
             t.revoked_at, t.created_at, u.name AS owner_name,
             (t.user_id = ${actor.userId}) AS is_own
      FROM api_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.organization_id = ${actor.organizationId}
        AND (${includeAll} OR t.user_id = ${actor.userId})
        AND (${cursorDate}::timestamptz IS NULL OR (t.created_at, t.id) < (${cursorDate}::timestamptz, ${cursorId}::uuid))
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${limit + 1}
    `;
    const items = rows.slice(0, limit);
    return {
      items,
      next_cursor:
        rows.length > limit && items.length
          ? encodeCursor({
              created_at: items[items.length - 1].created_at,
              id: items[items.length - 1].id,
            })
          : null,
    };
  }

  async revokeToken(actor: Actor, id: string): Promise<void> {
    const rows = await this.db`
      SELECT id, user_id FROM api_tokens
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
      LIMIT 1
    `;
    if (!rows[0]) throw new StoreError("Token not found", 404, "not_found");
    if (!canManage(actor, String(rows[0].user_id))) {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    await this.db`
      UPDATE api_tokens SET revoked_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    await appendAudit(this.db, actor, "token.revoked", "api_token", id);
  }

  async capturePersonalMemory(
    actor: Actor,
    input: {
      repository: string;
      title: string;
      content: string;
      evidence: string;
    }
  ): Promise<PersonalMemoryRecord> {
    const contentHash = crypto
      .createHash("sha256")
      .update(input.content)
      .digest("hex");
    const sourceKey = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const metadata = {
      repository: input.repository,
      evidence: input.evidence,
      captured_by: "agent",
    };
    const rows = await this.db`
      INSERT INTO personal_memories (
        user_id, source_kind, source_key, title, content, content_hash, metadata
      ) VALUES (
        ${actor.userId}, 'agent_capture', ${sourceKey}, ${input.title},
        ${input.content}, ${contentHash}, ${this.db.json(metadata)}
      )
      ON CONFLICT (user_id, source_kind, source_key)
      DO UPDATE SET source_key = EXCLUDED.source_key
      RETURNING *
    `;
    return personalMemoryFromRow(rows[0] as Row);
  }

  async recentPersonalCaptures(actor: Actor, repository: string) {
    const rows = await this.db`
      SELECT id, title, LEFT(content, 1500) AS content,
        LEFT(metadata->>'evidence', 500) AS evidence, created_at
      FROM personal_memories
      WHERE user_id = ${actor.userId} AND source_kind = 'agent_capture'
        AND metadata->>'repository' = ${repository}
      ORDER BY created_at DESC, id DESC LIMIT 3
    `;
    return rows;
  }

  async recallPersonalMemories(
    actor: Actor,
    input: { repository: string; query: string; limit: number }
  ): Promise<PersonalMemoryRecord[]> {
    const rows = await this.db`
      SELECT * FROM personal_memories
      WHERE user_id = ${actor.userId}
        AND source_kind = 'agent_capture'
        AND metadata->>'repository' = ${input.repository}
        AND search_vector @@ websearch_to_tsquery('english', ${input.query})
      ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${input.query})) DESC,
        created_at DESC, id DESC
      LIMIT ${input.limit}
    `;
    return rows.map((row) => personalMemoryFromRow(row as Row));
  }

  async upsertPersonalMemory(
    actor: Actor,
    input: PersonalMemoryImportInput
  ): Promise<{
    memory: PersonalMemoryRecord;
    outcome: "created" | "updated" | "unchanged";
  }> {
    const contentHash = crypto
      .createHash("sha256")
      .update(input.content, "utf8")
      .digest("hex");
    const existing = await this.db`
      SELECT * FROM personal_memories
      WHERE user_id = ${actor.userId}
        AND source_kind = ${input.source_kind}
        AND source_key = ${input.source_key}
      LIMIT 1
    `;

    if (existing[0] && String(existing[0].content_hash) === contentHash) {
      return {
        memory: personalMemoryFromRow(existing[0] as Row),
        outcome: "unchanged",
      };
    }

    if (existing[0]) {
      const rows = await this.db`
        UPDATE personal_memories SET
          title = ${input.title},
          content = ${input.content},
          content_hash = ${contentHash},
          source_modified_at = ${input.source_modified_at ?? null},
          metadata = ${this.db.json(JSON.parse(JSON.stringify(input.metadata)))},
          updated_at = NOW()
        WHERE id = ${existing[0].id} AND user_id = ${actor.userId}
        RETURNING *
      `;
      return {
        memory: personalMemoryFromRow(rows[0] as Row),
        outcome: "updated",
      };
    }

    const rows = await this.db`
      INSERT INTO personal_memories (
        user_id, source_kind, source_key, title, content, content_hash,
        source_modified_at, metadata
      ) VALUES (
        ${actor.userId}, ${input.source_kind}, ${input.source_key},
        ${input.title}, ${input.content}, ${contentHash},
        ${input.source_modified_at ?? null},
        ${this.db.json(JSON.parse(JSON.stringify(input.metadata)))}
      )
      RETURNING *
    `;
    return {
      memory: personalMemoryFromRow(rows[0] as Row),
      outcome: "created",
    };
  }

  async listPersonalMemories(
    actor: Actor,
    filters: {
      cursor?: string;
      limit: number;
      query?: string;
      source_kind?: string;
    }
  ) {
    const [cursorDate, cursorId] = decodeCursor(filters.cursor);
    const rows = await this.db`
      SELECT id, user_id, source_kind, source_key, title,
        LEFT(content, 280) AS content, content_hash, source_modified_at,
        metadata, created_at, updated_at
      FROM personal_memories
      WHERE user_id = ${actor.userId}
        AND (${filters.source_kind ?? ""} = '' OR source_kind = ${filters.source_kind ?? ""})
        AND (${filters.query ?? ""} = '' OR search_vector @@ websearch_to_tsquery('english', ${filters.query ?? ""}))
        AND (${cursorDate}::timestamptz IS NULL OR (created_at, id) < (${cursorDate}::timestamptz, ${cursorId}::uuid))
      ORDER BY created_at DESC, id DESC
      LIMIT ${filters.limit + 1}
    `;
    const mapped = rows.map((row) => personalMemoryFromRow(row as Row));
    const hasMore = mapped.length > filters.limit;
    const items = mapped.slice(0, filters.limit);
    return {
      items,
      next_cursor:
        hasMore && items.length ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  async getPersonalMemory(
    actor: Actor,
    id: string
  ): Promise<PersonalMemoryRecord> {
    const rows = await this.db`
      SELECT * FROM personal_memories
      WHERE id = ${id} AND user_id = ${actor.userId}
      LIMIT 1
    `;
    if (!rows[0])
      throw new StoreError("Personal memory not found", 404, "not_found");
    return personalMemoryFromRow(rows[0] as Row);
  }

  async personalMemoryStats(actor: Actor) {
    const [totals, sources, collections] = await Promise.all([
      this.db`
        SELECT COUNT(*)::int AS total, MAX(updated_at) AS last_imported_at
        FROM personal_memories
        WHERE user_id = ${actor.userId}
      `,
      this.db`
        SELECT source_kind, COUNT(*)::int AS count
        FROM personal_memories
        WHERE user_id = ${actor.userId}
        GROUP BY source_kind
        ORDER BY source_kind ASC
      `,
      this.db`
        SELECT
          source_kind,
          CASE
            WHEN position('/' in source_key) > 0
              THEN split_part(source_key, '/', 1)
            ELSE ''
          END AS collection_key,
          COUNT(*)::int AS count
        FROM personal_memories
        WHERE user_id = ${actor.userId}
        GROUP BY
          source_kind,
          CASE
            WHEN position('/' in source_key) > 0
              THEN split_part(source_key, '/', 1)
            ELSE ''
          END
        ORDER BY count DESC, collection_key ASC
      `,
    ]);
    return {
      total: Number(totals[0]?.total ?? 0),
      last_imported_at: iso(totals[0]?.last_imported_at),
      sources: sources.map((row) => ({
        source_kind: String(row.source_kind),
        count: Number(row.count),
      })),
      collections: collections.map((row) => ({
        source_kind: String(row.source_kind),
        collection_key: String(row.collection_key),
        count: Number(row.count),
      })),
    };
  }

  private async assertRepository(
    actor: Actor,
    repositoryId?: string | null
  ): Promise<void> {
    if (!repositoryId) return;
    const rows = await this.db`
      SELECT 1 FROM repositories
      WHERE id = ${repositoryId} AND organization_id = ${actor.organizationId}
    `;
    if (!rows[0])
      throw new StoreError("Repository not found", 404, "not_found");
  }

  async createMemory(
    actor: Actor,
    input: CreateMemoryInput
  ): Promise<MemoryRecord> {
    await this.assertRepository(actor, input.repository_id);
    const rows = await this.db`
      INSERT INTO memories (
        organization_id, repository_id, type, title, content, status,
        confidence, paths, tags, source_url, source_label, created_by, expires_at
      ) VALUES (
        ${actor.organizationId}, ${input.repository_id ?? null}, ${input.type},
        ${input.title}, ${input.content}, 'draft', ${input.confidence},
        ${input.paths}, ${input.tags}, ${input.source_url ?? null},
        ${input.source_label ?? null}, ${actor.userId}, ${input.expires_at ?? null}
      )
      RETURNING *
    `;
    return this.getMemory(actor, String(rows[0].id));
  }

  async listMemories(
    actor: Actor,
    filters: {
      cursor?: string;
      limit: number;
      query?: string;
      repository_id?: string;
      type?: MemoryType;
      status?: MemoryStatus;
      confidence?: MemoryConfidence;
    }
  ) {
    const [cursorDate, cursorId] = decodeCursor(filters.cursor);
    const rows = await this.db`
      SELECT m.*, r.full_name AS repository_full_name, u.name AS author_name,
        COUNT(mr.id) FILTER (WHERE mr.resolved_at IS NULL)::int AS open_report_count
      FROM memories m
      LEFT JOIN repositories r ON r.id = m.repository_id
      JOIN users u ON u.id = m.created_by
      LEFT JOIN memory_reports mr ON mr.memory_id = m.id
      WHERE m.organization_id = ${actor.organizationId}
        AND (${filters.repository_id ?? null}::uuid IS NULL OR m.repository_id = ${filters.repository_id ?? null})
        AND (${filters.type ?? null}::memory_type IS NULL OR m.type = ${filters.type ?? null})
        AND (${filters.status ?? null}::memory_status IS NULL OR m.status = ${filters.status ?? null})
        AND (${filters.confidence ?? null}::memory_confidence IS NULL OR m.confidence = ${filters.confidence ?? null})
        AND (${filters.query ?? ""} = '' OR m.search_vector @@ websearch_to_tsquery('english', ${filters.query ?? ""}))
        AND (${cursorDate}::timestamptz IS NULL OR (m.created_at, m.id) < (${cursorDate}::timestamptz, ${cursorId}::uuid))
      GROUP BY m.id, r.full_name, u.name
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${filters.limit + 1}
    `;
    const mapped = rows.map((row) => memoryFromRow(row as Row));
    const hasMore = mapped.length > filters.limit;
    const items = mapped.slice(0, filters.limit);
    return {
      items,
      next_cursor:
        hasMore && items.length ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  async getMemory(actor: Actor, id: string): Promise<MemoryRecord> {
    const rows = await this.db`
      SELECT m.*, r.full_name AS repository_full_name, u.name AS author_name,
        COUNT(mr.id) FILTER (WHERE mr.resolved_at IS NULL)::int AS open_report_count
      FROM memories m
      LEFT JOIN repositories r ON r.id = m.repository_id
      JOIN users u ON u.id = m.created_by
      LEFT JOIN memory_reports mr ON mr.memory_id = m.id
      WHERE m.id = ${id} AND m.organization_id = ${actor.organizationId}
      GROUP BY m.id, r.full_name, u.name
      LIMIT 1
    `;
    if (!rows[0]) throw new StoreError("Memory not found", 404, "not_found");
    return memoryFromRow(rows[0] as Row);
  }

  async getMemoryDetail(actor: Actor, id: string) {
    const memory = await this.getMemory(actor, id);
    const [versions, reports] = await Promise.all([
      this.db`
        SELECT mv.id, mv.version_number, mv.snapshot, mv.created_at, u.name AS changed_by_name
        FROM memory_versions mv JOIN users u ON u.id = mv.changed_by
        WHERE mv.memory_id = ${id}
        ORDER BY mv.version_number DESC
      `,
      this.db`
        SELECT mr.id, mr.reason, mr.comment, mr.created_at, mr.resolved_at,
               u.name AS reported_by_name
        FROM memory_reports mr JOIN users u ON u.id = mr.reported_by
        WHERE mr.memory_id = ${id} AND mr.organization_id = ${actor.organizationId}
        ORDER BY mr.created_at DESC
      `,
    ]);
    return { memory, versions, reports };
  }

  private async snapshot(actor: Actor, memory: MemoryRecord): Promise<void> {
    const rows = await this.db`
      SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
      FROM memory_versions WHERE memory_id = ${memory.id}
    `;
    const snapshot = {
      repository_id: memory.repository_id,
      type: memory.type,
      title: memory.title,
      content: memory.content,
      status: memory.status,
      confidence: memory.confidence,
      paths: memory.paths,
      tags: memory.tags,
      source_url: memory.source_url,
      source_label: memory.source_label,
      expires_at: memory.expires_at,
      updated_at: memory.updated_at,
    };
    await this.db`
      INSERT INTO memory_versions (memory_id, version_number, snapshot, changed_by)
      VALUES (${memory.id}, ${Number(rows[0].version_number)}, ${this.db.json(snapshot)}, ${actor.userId})
    `;
  }

  async updateMemory(
    actor: Actor,
    id: string,
    input: Partial<CreateMemoryInput>
  ) {
    const current = await this.getMemory(actor, id);
    if (!canManage(actor, current.created_by)) {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    await this.assertRepository(actor, input.repository_id);
    if (current.status !== "draft") await this.snapshot(actor, current);
    const merged = { ...current, ...input };
    await this.db`
      UPDATE memories SET
        repository_id = ${merged.repository_id}, type = ${merged.type},
        title = ${merged.title}, content = ${merged.content},
        confidence = ${merged.confidence}, paths = ${merged.paths}, tags = ${merged.tags},
        source_url = ${merged.source_url}, source_label = ${merged.source_label},
        expires_at = ${merged.expires_at}, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    if (current.status !== "draft") {
      await appendAudit(this.db, actor, "memory.edited", "memory", id);
    }
    return this.getMemory(actor, id);
  }

  async publishMemory(actor: Actor, id: string) {
    const current = await this.getMemory(actor, id);
    if (!canManage(actor, current.created_by)) {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    if (current.status !== "draft") {
      throw new StoreError(
        "Only draft memories can be published",
        409,
        "invalid_transition"
      );
    }
    await this.db`
      UPDATE memories SET status = 'published', published_by = ${actor.userId},
        published_at = NOW(), updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    await appendAudit(this.db, actor, "memory.published", "memory", id);
    return this.getMemory(actor, id);
  }

  async disputeMemory(actor: Actor, id: string) {
    if (actor.role === "member")
      throw new StoreError("Insufficient permission", 403, "forbidden");
    const current = await this.getMemory(actor, id);
    if (current.status !== "published") {
      throw new StoreError(
        "Only published memories can be disputed",
        409,
        "invalid_transition"
      );
    }
    await this.snapshot(actor, current);
    await this.db`
      UPDATE memories SET status = 'disputed', updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    await appendAudit(this.db, actor, "memory.disputed", "memory", id);
    return this.getMemory(actor, id);
  }

  async archiveMemory(actor: Actor, id: string) {
    const current = await this.getMemory(actor, id);
    if (!canManage(actor, current.created_by)) {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    if (current.status === "archived") {
      throw new StoreError(
        "Memory is already archived",
        409,
        "invalid_transition"
      );
    }
    if (current.status !== "draft") await this.snapshot(actor, current);
    await this.db`
      UPDATE memories SET status = 'archived', updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${actor.organizationId}
    `;
    await appendAudit(this.db, actor, "memory.archived", "memory", id);
    return this.getMemory(actor, id);
  }

  async reportMemory(
    actor: Actor,
    id: string,
    input: { reason: ReportReason; comment: string }
  ) {
    await this.getMemory(actor, id);
    const rows = await this.db`
      INSERT INTO memory_reports (
        organization_id, memory_id, reported_by, reason, comment
      ) VALUES (
        ${actor.organizationId}, ${id}, ${actor.userId}, ${input.reason}, ${input.comment}
      ) RETURNING id, reason, comment, created_at
    `;
    return rows[0];
  }

  async resolveReport(actor: Actor, memoryId: string, reportId: string) {
    if (actor.role === "member") {
      throw new StoreError("Insufficient permission", 403, "forbidden");
    }
    const rows = await this.db`
      UPDATE memory_reports SET
        resolved_at = NOW(), resolved_by = ${actor.userId}
      WHERE id = ${reportId}
        AND memory_id = ${memoryId}
        AND organization_id = ${actor.organizationId}
        AND resolved_at IS NULL
      RETURNING id, reason, comment, created_at, resolved_at
    `;
    if (!rows[0]) throw new StoreError("Report not found", 404, "not_found");
    await appendAudit(
      this.db,
      actor,
      "memory_report.resolved",
      "memory_report",
      reportId,
      {
        memory_id: memoryId,
      }
    );
    return rows[0];
  }

  async searchCandidates(
    actor: Actor,
    input: {
      repository: string;
      query: string;
      types?: MemoryType[];
    }
  ): Promise<MemoryRecord[]> {
    const repository = await this.repositoryByName(actor, input.repository);
    if (!repository)
      throw new StoreError("Repository not found", 404, "not_found");
    const rows = await this.db`
      SELECT m.*, r.full_name AS repository_full_name, u.name AS author_name,
        COUNT(mr.id) FILTER (WHERE mr.resolved_at IS NULL)::int AS open_report_count,
        ts_rank_cd(m.search_vector, websearch_to_tsquery('english', ${input.query})) AS text_rank
      FROM memories m
      LEFT JOIN repositories r ON r.id = m.repository_id
      JOIN users u ON u.id = m.created_by
      LEFT JOIN memory_reports mr ON mr.memory_id = m.id
      WHERE m.organization_id = ${actor.organizationId}
        AND m.status = 'published'
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
        AND (m.repository_id = ${String(repository.id)} OR m.repository_id IS NULL)
        AND (${input.types ?? null}::memory_type[] IS NULL OR m.type = ANY(${input.types ?? null}::memory_type[]))
      GROUP BY m.id, r.full_name, u.name
      ORDER BY text_rank DESC, m.updated_at DESC, m.id ASC
      LIMIT 200
    `;
    return rows.map((row) => memoryFromRow(row as Row));
  }

  async dashboard(actor: Actor) {
    const counts = await this.db`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
        COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed
      FROM memories WHERE organization_id = ${actor.organizationId}
    `;
    const reports = await this.db`
      SELECT COUNT(*)::int AS open_reports FROM memory_reports
      WHERE organization_id = ${actor.organizationId} AND resolved_at IS NULL
    `;
    const recent = await this.listMemories(actor, {
      limit: 6,
      status: "published",
    });
    return {
      ...counts[0],
      open_reports: Number(reports[0].open_reports),
      recent: recent.items,
    };
  }
}
