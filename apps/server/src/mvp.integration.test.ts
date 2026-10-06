import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  IntertoolStore,
  StoreError,
  closeDatabase,
  getDatabase,
  type Actor,
} from "@intertool/db";
import { migrate } from "@intertool/db/migrate";
import { compactContext, rankMemories } from "@intertool/retrieval";
import { buildApp } from "./app.js";

const suffix = crypto.randomBytes(5).toString("hex");
let store: IntertoolStore;
let alice: Actor;
let bob: Actor;
let outsider: Actor;
let repositoryId: string;

beforeAll(async () => {
  await migrate();
  store = new IntertoolStore();
  await store.createOrganization(
    {
      subject: `alice-${suffix}`,
      email: `alice-${suffix}@acme.test`,
      name: "Alice",
    },
    { name: `Acme ${suffix}`, slug: `acme-${suffix}` }
  );
  alice = (await store.authenticateInternal(
    `alice-${suffix}`,
    `acme-${suffix}`
  ))!;
  await store.addMembership(
    alice,
    { subject: `bob-${suffix}`, email: `bob-${suffix}@acme.test`, name: "Bob" },
    "member"
  );
  bob = (await store.authenticateInternal(`bob-${suffix}`, `acme-${suffix}`))!;
  await store.createOrganization(
    {
      subject: `mallory-${suffix}`,
      email: `mallory-${suffix}@other.test`,
      name: "Mallory",
    },
    { name: `Other ${suffix}`, slug: `other-${suffix}` }
  );
  outsider = (await store.authenticateInternal(
    `mallory-${suffix}`,
    `other-${suffix}`
  ))!;
  const repository = await store.createRepository(alice, {
    full_name: `acme-${suffix}/payments-service`,
    default_branch: "main",
  });
  repositoryId = String(repository.id);
});

afterAll(async () => {
  await closeDatabase();
});

describe("MVP isolation and lifecycle", () => {
  it("stores only token hashes and rejects revoked tokens", async () => {
    const created = await store.createToken(bob, { name: "Bob MCP" });
    expect(created.token).toMatch(/^itk_[a-f0-9]{8}_/);
    const rows =
      await getDatabase()`SELECT token_hash FROM api_tokens WHERE id = ${created.id}`;
    expect(String(rows[0].token_hash)).not.toContain(created.token);
    expect((await store.authenticateToken(created.token))?.userId).toBe(
      bob.userId
    );
    await store.revokeToken(bob, String(created.id));
    expect(await store.authenticateToken(created.token)).toBeNull();

    const expired = await store.createToken(bob, {
      name: "Expired MCP",
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    expect(await store.authenticateToken(expired.token)).toBeNull();
    await expect(store.revokeToken(outsider, expired.id)).rejects.toMatchObject(
      {
        status: 404,
        code: "not_found",
      }
    );
  });

  it("lets administrators view only members in their own organization", async () => {
    const acmeMembers = await store.listMembers(alice);
    expect(acmeMembers.items.map((member) => member.name).sort()).toEqual([
      "Alice",
      "Bob",
    ]);
    const firstPage = await store.listMembers(alice, { limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.next_cursor).toBeTruthy();
    const secondPage = await store.listMembers(alice, {
      limit: 1,
      cursor: firstPage.next_cursor ?? undefined,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    const otherMembers = await store.listMembers(outsider);
    expect(otherMembers.items.map((member) => member.name)).toEqual([
      "Mallory",
    ]);
    await expect(store.listMembers(bob)).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
  });

  it("isolates every known cross-tenant memory path", async () => {
    const draft = await store.createMemory(alice, {
      repository_id: repositoryId,
      type: "warning",
      title: "Refund tests require ledger events",
      content: "Run Redis and set ENABLE_LEDGER_EVENTS=true before the tests.",
      confidence: "confirmed",
      paths: ["tests/refunds/**"],
      tags: ["redis", "tests"],
      source_url: `https://github.com/acme-${suffix}/payments-service/pull/1842`,
      source_label: "PR #1842",
      expires_at: null,
    });

    await expect(store.getMemory(outsider, draft.id)).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    } satisfies Partial<StoreError>);
    await expect(store.publishMemory(outsider, draft.id)).rejects.toMatchObject(
      { status: 404 }
    );
    await expect(
      store.updateMemory(outsider, draft.id, { title: "Cross-tenant edit" })
    ).rejects.toMatchObject({ status: 404 });
    await expect(store.disputeMemory(outsider, draft.id)).rejects.toMatchObject(
      { status: 404 }
    );
    await expect(store.archiveMemory(outsider, draft.id)).rejects.toMatchObject(
      { status: 404 }
    );
    await expect(
      store.reportMemory(outsider, draft.id, {
        reason: "stale",
        comment: "Cross tenant",
      })
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      store.createMemory(outsider, {
        repository_id: repositoryId,
        type: "warning",
        title: "Cross-tenant repository",
        content:
          "This must never be attached to a repository in another organization.",
        confidence: "tentative",
        paths: [],
        tags: [],
        source_url: null,
        source_label: null,
        expires_at: null,
      })
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      store.updateRepository(outsider, repositoryId, {
        default_branch: "trunk",
      })
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      store.deleteRepository(outsider, repositoryId)
    ).rejects.toMatchObject({ status: 404 });
    const outsiderList = await store.listMemories(outsider, { limit: 25 });
    expect(outsiderList.items.some((memory) => memory.id === draft.id)).toBe(
      false
    );

    const beforePublish = await store.searchCandidates(alice, {
      repository: `acme-${suffix}/payments-service`,
      query: "refund tests",
    });
    expect(beforePublish.some((memory) => memory.id === draft.id)).toBe(false);

    await store.publishMemory(alice, draft.id);
    const afterPublish = await store.searchCandidates(bob, {
      repository: `acme-${suffix}/payments-service`,
      query: "refund tests",
    });
    expect(afterPublish.some((memory) => memory.id === draft.id)).toBe(true);
  });

  it("excludes expired, disputed, and archived memories and versions transitions", async () => {
    async function create(title: string, expires_at: string | null = null) {
      return store.createMemory(alice, {
        repository_id: repositoryId,
        type: "decision",
        title,
        content: "A durable decision with enough detail for another engineer.",
        confidence: "tentative",
        paths: [],
        tags: ["decision"],
        source_url: null,
        source_label: "Architecture review",
        expires_at,
      });
    }

    const expired = await create(
      "Expired decision",
      "2020-01-01T00:00:00.000Z"
    );
    await store.publishMemory(alice, expired.id);
    const disputed = await create("Disputed decision");
    await store.publishMemory(alice, disputed.id);
    await store.disputeMemory(alice, disputed.id);
    const archived = await create("Archived decision");
    await store.publishMemory(alice, archived.id);
    await store.archiveMemory(alice, archived.id);
    const reported = await create("Reported decision");
    await store.publishMemory(alice, reported.id);
    const report = await store.reportMemory(bob, reported.id, {
      reason: "stale",
      comment: "This decision needs an owner review.",
    });
    await expect(
      store.resolveReport(outsider, reported.id, String(report.id))
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      store.resolveReport(bob, reported.id, String(report.id))
    ).rejects.toMatchObject({ status: 403 });
    const resolved = await store.resolveReport(
      alice,
      reported.id,
      String(report.id)
    );
    expect(resolved.resolved_at).toBeTruthy();

    const candidates = await store.searchCandidates(alice, {
      repository: `acme-${suffix}/payments-service`,
      query: "decision",
    });
    expect(candidates.map((item) => item.id)).not.toEqual(
      expect.arrayContaining([expired.id, disputed.id, archived.id])
    );
    expect(
      (await store.getMemoryDetail(alice, disputed.id)).versions
    ).toHaveLength(1);
    expect(
      (await store.getMemoryDetail(alice, archived.id)).versions
    ).toHaveLength(1);
    const audits = await getDatabase()`
      SELECT action FROM audit_events
      WHERE organization_id = ${alice.organizationId}
    `;
    expect(audits.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "memory.published",
        "memory.disputed",
        "memory.archived",
        "memory_report.resolved",
      ])
    );
  });

  it("ranks path-specific confirmed context and keeps sources under the cap", async () => {
    const candidates = await store.searchCandidates(bob, {
      repository: `acme-${suffix}/payments-service`,
      query: "failing refund integration tests",
    });
    const ranked = rankMemories(candidates, {
      repository: `acme-${suffix}/payments-service`,
      query: "failing refund integration tests",
      paths: ["tests/refunds/refund.test.ts"],
    });
    expect(ranked[0].title).toBe("Refund tests require ledger events");
    const context = compactContext(ranked, {
      repository: `acme-${suffix}/payments-service`,
      query: "failing refund integration tests",
      limit: 8,
      maxCharacters: 4_000,
    });
    expect(context.text).toContain("PR #1842");
    expect(context.text.length).toBeLessThanOrEqual(4_000);
  });

  it("rejects secrets, invalid paths, cursors, and revoked REST credentials", async () => {
    const token = await store.createToken(alice, { name: "REST security" });
    const app = buildApp({ store, logger: false });
    const headers = { authorization: `Bearer ${token.token}` };
    try {
      const secret = await app.inject({
        method: "POST",
        url: "/api/memories",
        headers,
        payload: {
          repository_id: repositoryId,
          type: "warning",
          title: "Leaked production credential",
          content: "api_key=abcdefghijklmnopqrstuvwxyz1234",
          confidence: "tentative",
          paths: [],
          tags: [],
        },
      });
      expect(secret.statusCode).toBe(400);
      expect(secret.json().error.code).toBe("secret_detected");

      const invalidPath = await app.inject({
        method: "POST",
        url: "/api/memories",
        headers,
        payload: {
          repository_id: repositoryId,
          type: "warning",
          title: "Unsafe path scope",
          content: "This is long enough to pass content validation.",
          confidence: "tentative",
          paths: ["../../secrets"],
          tags: [],
        },
      });
      expect(invalidPath.statusCode).toBe(400);
      expect(invalidPath.json().error.code).toBe("validation_error");

      const badCursor = await app.inject({
        method: "GET",
        url: "/api/repositories?cursor=not-a-cursor",
        headers,
      });
      expect(badCursor.statusCode).toBe(400);
      expect(badCursor.json().error.code).toBe("invalid_cursor");

      await store.revokeToken(alice, token.id);
      const revoked = await app.inject({
        method: "GET",
        url: "/api/me",
        headers,
      });
      expect(revoked.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("keeps imported personal memory private, idempotent, and outside team retrieval", async () => {
    const input = {
      source_kind: "codex_local",
      source_key: "rollout_summaries/memory_summary.md",
      title: "Alice's private summary",
      content: "Private detail about a personal deployment preference.",
      source_modified_at: "2026-09-03T12:00:00.000Z",
      metadata: { bytes: 53 },
    };
    const created = await store.upsertPersonalMemory(alice, input);
    expect(created.outcome).toBe("created");
    const unchanged = await store.upsertPersonalMemory(alice, input);
    expect(unchanged.outcome).toBe("unchanged");
    expect(unchanged.memory.id).toBe(created.memory.id);
    const updated = await store.upsertPersonalMemory(alice, {
      ...input,
      content: `${input.content} Updated.`,
    });
    expect(updated.outcome).toBe("updated");
    expect(updated.memory.id).toBe(created.memory.id);

    expect(
      (await store.listPersonalMemories(bob, { limit: 25 })).items
    ).toHaveLength(0);
    await expect(
      store.getPersonalMemory(outsider, created.memory.id)
    ).rejects.toMatchObject({ status: 404 });

    await store.createOrganization(
      {
        subject: `alice-${suffix}`,
        email: `alice-${suffix}@acme.test`,
        name: "Alice",
      },
      { name: `Alice second ${suffix}`, slug: `alice-second-${suffix}` }
    );
    const aliceInSecondOrg = (await store.authenticateInternal(
      `alice-${suffix}`,
      `alice-second-${suffix}`
    ))!;
    expect(
      (await store.listPersonalMemories(aliceInSecondOrg, { limit: 25 })).items
    ).toHaveLength(1);

    const teamCandidates = await store.searchCandidates(alice, {
      repository: `acme-${suffix}/payments-service`,
      query: "personal deployment preference",
    });
    expect(teamCandidates.map((item) => item.id)).not.toContain(
      created.memory.id
    );

    const token = await store.createToken(alice, { name: "Personal import" });
    const app = buildApp({ store, logger: false });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/personal-memories/import",
        headers: { authorization: `Bearer ${token.token}` },
        payload: {
          source_kind: "codex_local",
          source_key: "raw_memories.md",
          title: "Raw memory index",
          content: "memory ".repeat(6_000),
        },
      });
      expect(response.statusCode).toBe(201);
      const list = await app.inject({
        method: "GET",
        url: "/api/personal-memories?query=raw",
        headers: { authorization: `Bearer ${token.token}` },
      });
      expect(list.statusCode).toBe(200);
      expect(list.json().items).toHaveLength(1);
      expect(list.json().items[0].content).toHaveLength(280);
      const stats = await app.inject({
        method: "GET",
        url: "/api/personal-memories/stats",
        headers: { authorization: `Bearer ${token.token}` },
      });
      expect(stats.statusCode).toBe(200);
      expect(stats.json().collections).toEqual(
        expect.arrayContaining([
          {
            source_kind: "codex_local",
            collection_key: "rollout_summaries",
            count: 1,
          },
          {
            source_kind: "codex_local",
            collection_key: "",
            count: 1,
          },
        ])
      );
    } finally {
      await app.close();
    }
  });
});

describe("Agent lifecycle API", () => {
  it("captures idempotently and bootstraps only the token owner's private context", async () => {
    const app = buildApp({ store, logger: false });
    const token = await store.createToken(bob, { name: "Hook adapter" });
    const aliceToken = await store.createToken(alice, {
      name: "Other hook user",
    });
    const headers = { authorization: `Bearer ${token.token}` };
    const input = {
      repository: `acme-${suffix}/payments-service`,
      title: "Hook retry finding",
      content:
        "Hookprivate findings use the original request identifier for payment retries.",
      evidence: "Verified in retry integration tests",
    };
    try {
      const denied = await app.inject({
        method: "POST",
        url: "/api/agent/context",
        payload: { repository: input.repository },
      });
      expect(denied.statusCode).toBe(401);
      const results = await Promise.all(
        [1, 2].map(() =>
          app.inject({
            method: "POST",
            url: "/api/agent/capture",
            headers,
            payload: input,
          })
        )
      );
      expect(results[0].statusCode).toBe(200);
      expect(results[0].json()).toEqual(results[1].json());
      const context = await app.inject({
        method: "POST",
        url: "/api/agent/context",
        headers,
        payload: { repository: input.repository },
      });
      expect(context.statusCode).toBe(200);
      expect(JSON.stringify(context.json().personal)).toContain(input.content);
      expect(JSON.stringify(context.json().team)).not.toContain(input.content);
      for (const [auth, repository] of [
        [aliceToken.token, input.repository],
        [token.token, "other/repository"],
      ]) {
        const isolated = await app.inject({
          method: "POST",
          url: "/api/agent/context",
          headers: { authorization: `Bearer ${auth}` },
          payload: { repository },
        });
        expect(JSON.stringify(isolated.json())).not.toContain(input.content);
      }
      const secret = await app.inject({
        method: "POST",
        url: "/api/agent/capture",
        headers,
        payload: {
          ...input,
          evidence: "ghp_abcdefghijklmnopqrstuvwxyz1234567890ABCD",
        },
      });
      expect(secret.statusCode).toBe(400);
      expect(secret.body).not.toContain("ghp_");
      const oversized = await app.inject({
        method: "POST",
        url: "/api/agent/capture",
        headers,
        payload: { ...input, content: "x".repeat(4001) },
      });
      expect(oversized.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});

describe("MCP protocol", () => {
  it("initializes, lists seven tools, and retrieves Alice's memory with Bob's token", async () => {
    const token = await store.createToken(bob, { name: "MCP integration" });
    const app = buildApp({ store, logger: false });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string")
      throw new Error("No test server address");

    const client = new Client({ name: "intertool-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${token.token}` } } }
    );
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
        [
          "capture_memory",
          "recall_memory",
          "get_context",
          "propose_memory",
          "publish_memory",
          "report_stale",
          "search_context",
        ].sort()
      );
      expect(client.getInstructions()).toContain("automatically save");
      const captureInput = {
        repository: `acme-${suffix}/payments-service`,
        title: "Private retry discovery",
        content:
          "Zebraretry requires the original request identifier to prevent duplicate payments.",
        evidence: "Verified in the retry integration test",
      };
      const captures = await Promise.all(
        [1, 2].map(() =>
          client.callTool({
            name: "capture_memory",
            arguments: captureInput,
          })
        )
      );
      for (const capture of captures) expect(capture.isError).not.toBe(true);
      expect(captures[0].content).toEqual(captures[1].content);
      const recalled = await client.callTool({
        name: "recall_memory",
        arguments: { repository: captureInput.repository, query: "Zebraretry" },
      });
      expect(recalled.isError).not.toBe(true);
      expect(JSON.stringify(recalled.content)).toContain(captureInput.content);
      expect(
        await store.recallPersonalMemories(alice, {
          repository: captureInput.repository,
          query: "Zebraretry",
          limit: 5,
        })
      ).toEqual([]);
      expect(
        await store.recallPersonalMemories(outsider, {
          repository: captureInput.repository,
          query: "Zebraretry",
          limit: 5,
        })
      ).toEqual([]);
      expect(
        await store.recallPersonalMemories(bob, {
          repository: "another/repository",
          query: "Zebraretry",
          limit: 5,
        })
      ).toEqual([]);
      expect(
        JSON.stringify(
          await store.searchCandidates(bob, {
            repository: captureInput.repository,
            query: "Zebraretry",
          })
        )
      ).not.toContain(captureInput.content);
      const rejected = await client.callTool({
        name: "capture_memory",
        arguments: {
          ...captureInput,
          content: "The token is ghp_abcdefghijklmnopqrstuvwxyz1234567890ABCD",
        },
      });
      expect(rejected.isError).toBe(true);
      expect(JSON.stringify(rejected.content)).not.toContain("ghp_");

      const result = await client.callTool({
        name: "get_context",
        arguments: {
          repository: `acme-${suffix}/payments-service`,
          task: "Fix the failing refund integration tests",
          paths: ["tests/refunds/refund.test.ts"],
        },
      });
      expect(JSON.stringify(result.content)).toContain(
        "Refund tests require ledger events"
      );
      expect(JSON.stringify(result.content)).toContain("PR #1842");

      const search = await client.callTool({
        name: "search_context",
        arguments: {
          repository: `acme-${suffix}/payments-service`,
          query: "refund ledger events",
          types: ["warning"],
        },
      });
      expect(search.isError).not.toBe(true);
      expect(JSON.stringify(search.content)).toContain("PR #1842");

      const proposed = await client.callTool({
        name: "propose_memory",
        arguments: {
          repository: `acme-${suffix}/payments-service`,
          type: "convention",
          title: "MCP proposed convention",
          content:
            "Keep the integration-test Redis namespace isolated per worker.",
          paths: ["tests/integration/**"],
          tags: ["tests", "redis"],
          source_label: "MCP integration test",
          confidence: "confirmed",
        },
      });
      expect(proposed.isError).not.toBe(true);
      const proposalContent = proposed.content as Array<{
        type: string;
        text?: string;
      }>;
      const proposedText = proposalContent.find(
        (item) => item.type === "text"
      )?.text;
      if (!proposedText) throw new Error("Missing proposal result");
      const proposedBody = JSON.parse(proposedText) as { draft_id: string };
      expect(proposedText).toContain("explicit confirmation");

      const published = await client.callTool({
        name: "publish_memory",
        arguments: { memory_id: proposedBody.draft_id },
      });
      expect(published.isError).not.toBe(true);
      const republish = await client.callTool({
        name: "publish_memory",
        arguments: { memory_id: proposedBody.draft_id },
      });
      expect(republish.isError).toBe(true);

      const report = await client.callTool({
        name: "report_stale",
        arguments: {
          memory_id: proposedBody.draft_id,
          reason: "stale",
          comment: "The test namespace convention changed.",
        },
      });
      expect(report.isError).not.toBe(true);
      expect(JSON.stringify(report.content)).toContain("was not deleted");

      let validationFailed = false;
      try {
        const invalid = await client.callTool({
          name: "get_context",
          arguments: { task: "missing repository" },
        });
        validationFailed = invalid.isError === true;
      } catch {
        validationFailed = true;
      }
      expect(validationFailed).toBe(true);
    } finally {
      await client.close();
      await app.close();
    }
  });

  it("rejects missing, expired, and cross-tenant MCP access", async () => {
    const expired = await store.createToken(bob, {
      name: "Expired protocol token",
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const outsiderToken = await store.createToken(outsider, {
      name: "Other organization",
    });
    const app = buildApp({ store, logger: false });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string")
      throw new Error("No test server address");
    const endpoint = `http://127.0.0.1:${address.port}/mcp`;

    try {
      expect((await fetch(endpoint, { method: "POST" })).status).toBe(401);
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${expired.token}` },
          })
        ).status
      ).toBe(401);

      const client = new Client({ name: "isolation-test", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: {
          headers: { Authorization: `Bearer ${outsiderToken.token}` },
        },
      });
      await client.connect(transport);
      const result = await client.callTool({
        name: "get_context",
        arguments: {
          repository: `acme-${suffix}/payments-service`,
          task: "refund tests",
        },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).not.toContain(
        "Refund tests require ledger events"
      );
      await client.close();
    } finally {
      await app.close();
    }
  });
});
