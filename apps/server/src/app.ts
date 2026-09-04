import crypto from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createMemorySchema,
  createOrganizationSchema,
  createRepositorySchema,
  createTokenSchema,
  detectSecretLikeContent,
  getContextSchema,
  memoryListQuerySchema,
  paginationSchema,
  personalMemoryImportSchema,
  personalMemoryListQuerySchema,
  reportMemorySchema,
  searchContextSchema,
  updateMemorySchema,
  updateRepositorySchema,
} from "@intertool/contracts";
import { IntertoolStore, StoreError, type Actor } from "@intertool/db";
import {
  compactContext,
  rankMemories,
  searchExcerpts,
} from "@intertool/retrieval";
import { authenticateRequest, verifyWebIdentity } from "./auth.js";
import { createMcpServer } from "./mcp.js";
import { RateLimiter } from "./rate-limit.js";

function validationError(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return {
    error: {
      code: "validation_error",
      message: "Request validation failed",
      fields: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  };
}

function uuidParam(
  request: FastifyRequest,
  reply: FastifyReply,
  name: string
): string | null {
  const value = (request.params as Record<string, unknown>)[name];
  const parsed = z.uuid().safeParse(value);
  if (parsed.success) return parsed.data;
  void reply.status(400).send(validationError(parsed.error));
  return null;
}

export function buildApp(
  options: { store?: IntertoolStore; logger?: boolean } = {}
) {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: process.env.LOG_LEVEL ?? "info",
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              "request.headers.authorization",
              "request.headers.cookie",
            ],
          },
    bodyLimit: 32 * 1024,
    genReqId: () => crypto.randomUUID(),
  });
  const store = options.store ?? new IntertoolStore();
  const rateLimiter = new RateLimiter();

  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Cache-Control", "no-store");
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof StoreError) {
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message } });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const message =
      status >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed";
    return reply
      .status(status)
      .send({ error: { code: "request_failed", message } });
  });

  async function actorFor(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<Actor | null> {
    const actor = await authenticateRequest(request, store);
    if (!actor) {
      await reply
        .status(401)
        .send({ error: { code: "unauthorized", message: "Unauthorized" } });
      return null;
    }
    return actor;
  }

  function limited(reply: FastifyReply, key: string, limit: number): boolean {
    if (rateLimiter.take(key, limit)) return false;
    void reply
      .status(429)
      .send({ error: { code: "rate_limited", message: "Too many requests" } });
    return true;
  }

  app.get("/health", async (_request, reply) => {
    await store.health();
    return reply.send({ status: "ok" });
  });

  app.post("/api/organizations", async (request, reply) => {
    const identity = verifyWebIdentity(request);
    if (!identity)
      return reply
        .status(401)
        .send({ error: { code: "unauthorized", message: "Unauthorized" } });
    if (limited(reply, `org:${identity.subject}`, 5)) return;
    const parsed = createOrganizationSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    const organization = await store.createOrganization(identity, parsed.data);
    return reply.status(201).send({ organization });
  });

  app.get("/api/me", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    return store.me(actor);
  });
  app.get("/api/organizations/current", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    return (await store.me(actor)).organization;
  });
  app.get("/api/dashboard", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    return store.dashboard(actor);
  });
  app.get("/api/members", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return store.listMembers(actor, parsed.data);
  });

  app.get("/api/repositories", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return store.listRepositories(actor, parsed.data);
  });
  app.post("/api/repositories", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = createRepositorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return reply
      .status(201)
      .send({ repository: await store.createRepository(actor, parsed.data) });
  });
  app.patch("/api/repositories/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    const parsed = updateRepositorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return { repository: await store.updateRepository(actor, id, parsed.data) };
  });
  app.delete("/api/repositories/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    await store.deleteRepository(actor, id);
    return reply.status(204).send();
  });

  app.get("/api/tokens", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return store.listTokens(actor, parsed.data);
  });
  app.post("/api/tokens", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    if (limited(reply, `token:${actor.userId}`, 10)) return;
    const parsed = createTokenSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return reply
      .status(201)
      .send({ token: await store.createToken(actor, parsed.data) });
  });
  app.delete("/api/tokens/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    await store.revokeToken(actor, id);
    return reply.status(204).send();
  });

  app.get("/api/personal-memories", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = personalMemoryListQuerySchema.safeParse(request.query);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return store.listPersonalMemories(actor, parsed.data);
  });
  app.get("/api/personal-memories/stats", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    return store.personalMemoryStats(actor);
  });
  app.get("/api/personal-memories/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    return { memory: await store.getPersonalMemory(actor, id) };
  });
  app.post(
    "/api/personal-memories/import",
    { bodyLimit: 1024 * 1024 },
    async (request, reply) => {
      const actor = await actorFor(request, reply);
      if (!actor) return;
      if (limited(reply, `personal-memory-import:${actor.userId}`, 1_000))
        return;
      const parsed = personalMemoryImportSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.status(400).send(validationError(parsed.error));
      const result = await store.upsertPersonalMemory(actor, parsed.data);
      return reply
        .status(result.outcome === "created" ? 201 : 200)
        .send(result);
    }
  );

  app.get("/api/memories", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = memoryListQuerySchema.safeParse(request.query);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return store.listMemories(actor, parsed.data);
  });
  app.post("/api/memories", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const parsed = createMemorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    const secret = detectSecretLikeContent(
      `${parsed.data.title}\n${parsed.data.content}`
    );
    if (secret) {
      return reply.status(400).send({
        error: {
          code: "secret_detected",
          message: `Memory appears to contain a ${secret}. Remove it before saving.`,
        },
      });
    }
    return reply
      .status(201)
      .send({ memory: await store.createMemory(actor, parsed.data) });
  });
  app.get("/api/memories/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    return store.getMemoryDetail(actor, id);
  });
  app.patch("/api/memories/:id", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    const parsed = updateMemorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    if (parsed.data.content || parsed.data.title) {
      const secret = detectSecretLikeContent(
        `${parsed.data.title ?? ""}\n${parsed.data.content ?? ""}`
      );
      if (secret)
        return reply.status(400).send({
          error: {
            code: "secret_detected",
            message: `Memory appears to contain a ${secret}.`,
          },
        });
    }
    return { memory: await store.updateMemory(actor, id, parsed.data) };
  });
  for (const [path, action] of [
    ["publish", "publishMemory"],
    ["dispute", "disputeMemory"],
    ["archive", "archiveMemory"],
  ] as const) {
    app.post(`/api/memories/:id/${path}`, async (request, reply) => {
      const actor = await actorFor(request, reply);
      if (!actor) return;
      const id = uuidParam(request, reply, "id");
      if (!id) return;
      return { memory: await store[action](actor, id) };
    });
  }
  app.post("/api/memories/:id/reports", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    const id = uuidParam(request, reply, "id");
    if (!id) return;
    const parsed = reportMemorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    return reply
      .status(201)
      .send({ report: await store.reportMemory(actor, id, parsed.data) });
  });
  app.post(
    "/api/memories/:id/reports/:reportId/resolve",
    async (request, reply) => {
      const actor = await actorFor(request, reply);
      if (!actor) return;
      const id = uuidParam(request, reply, "id");
      if (!id) return;
      const reportId = uuidParam(request, reply, "reportId");
      if (!reportId) return;
      return { report: await store.resolveReport(actor, id, reportId) };
    }
  );

  app.post("/api/context/search", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    if (limited(reply, `search:${actor.userId}`, 60)) return;
    const parsed = searchContextSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    const candidates = await store.searchCandidates(actor, parsed.data);
    return {
      results: searchExcerpts(
        rankMemories(candidates, {
          repository: parsed.data.repository,
          query: parsed.data.query,
          paths: parsed.data.paths,
        }),
        parsed.data.limit
      ),
    };
  });
  app.post("/api/context/get", async (request, reply) => {
    const actor = await actorFor(request, reply);
    if (!actor) return;
    if (limited(reply, `context:${actor.userId}`, 60)) return;
    const parsed = getContextSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.status(400).send(validationError(parsed.error));
    const candidates = await store.searchCandidates(actor, {
      repository: parsed.data.repository,
      query: parsed.data.task,
    });
    return compactContext(
      rankMemories(candidates, {
        repository: parsed.data.repository,
        query: parsed.data.task,
        paths: parsed.data.paths,
      }),
      {
        repository: parsed.data.repository,
        query: parsed.data.task,
        limit: parsed.data.limit,
        maxCharacters: parsed.data.max_characters,
      }
    );
  });

  app.post("/mcp", async (request, reply) => {
    const startedAt = performance.now();
    const rpcBody = request.body as {
      method?: string;
      params?: { name?: string };
    } | null;
    const operation =
      rpcBody?.method === "tools/call"
        ? (rpcBody.params?.name ?? "tools/call")
        : (rpcBody?.method ?? "unknown");
    const authorization = request.headers.authorization;
    const actor = authorization?.startsWith("Bearer ")
      ? await store.authenticateToken(authorization.slice(7))
      : null;
    if (!actor)
      return reply
        .status(401)
        .send({ error: { code: "unauthorized", message: "Unauthorized" } });
    if (limited(reply, `mcp:${actor.userId}`, 120)) return;
    const mcpServer = createMcpServer(store, actor);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    reply.hijack();
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } finally {
      request.log.info(
        {
          mcp_operation: operation,
          duration_ms: Math.round((performance.now() - startedAt) * 100) / 100,
          status_code: reply.raw.statusCode,
        },
        "MCP operation completed"
      );
      await transport.close();
      await mcpServer.close();
    }
  });

  app.route({
    method: ["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    url: "/mcp",
    handler: async (_request, reply) =>
      reply.status(405).send({
        error: { code: "method_not_allowed", message: "Use POST /mcp" },
      }),
  });

  return app;
}
