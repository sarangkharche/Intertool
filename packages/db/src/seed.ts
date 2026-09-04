import { fileURLToPath } from "node:url";
import { IntertoolStore, closeDatabase } from "./index.js";
import { migrate } from "./migrate.js";

export async function seed(): Promise<void> {
  await migrate();
  const store = new IntertoolStore();
  const acmeOwner = await store.authenticateInternal("alice");
  let alice = acmeOwner;
  if (!alice) {
    await store.createOrganization(
      { subject: "alice", email: "alice@acme.test", name: "Alice" },
      { name: "Acme", slug: "acme" }
    );
    alice = await store.authenticateInternal("alice", "acme");
  }
  if (!alice) throw new Error("Could not seed Alice");

  await store.addMembership(
    alice,
    { subject: "bob", email: "bob@acme.test", name: "Bob" },
    "member"
  );

  let repositories = (await store.listRepositories(alice, { limit: 100 }))
    .items;
  if (!repositories.some((row) => row.full_name === "acme/payments-service")) {
    await store.createRepository(alice, {
      full_name: "acme/payments-service",
      default_branch: "main",
    });
    repositories = (await store.listRepositories(alice, { limit: 100 })).items;
  }
  const repository = repositories.find(
    (row) => row.full_name === "acme/payments-service"
  );
  if (!repository) throw new Error("Could not seed repository");

  const existing = await store.listMemories(alice, { limit: 100 });
  if (
    !existing.items.some(
      (memory) => memory.title === "Refund tests require Redis"
    )
  ) {
    const warning = await store.createMemory(alice, {
      repository_id: String(repository.id),
      type: "warning",
      title: "Refund tests require Redis",
      content: "Run Redis before starting the refund integration tests.",
      confidence: "confirmed",
      paths: ["tests/refunds/**"],
      tags: ["tests", "redis"],
      source_url: "https://github.com/acme/payments-service/pull/1800",
      source_label: "PR #1800",
      expires_at: null,
    });
    await store.publishMemory(alice, warning.id);
  }
  if (
    !existing.items.some((memory) => memory.title === "Refund queue migration")
  ) {
    await store.createMemory(alice, {
      repository_id: String(repository.id),
      type: "decision",
      title: "Refund queue migration",
      content: "Keep the old queue during the staged ledger migration.",
      confidence: "tentative",
      paths: ["src/refunds/**"],
      tags: ["migration"],
      source_url: null,
      source_label: "Architecture review",
      expires_at: null,
    });
  }

  if (!(await store.authenticateInternal("mallory", "other-co"))) {
    await store.createOrganization(
      { subject: "mallory", email: "mallory@other.test", name: "Mallory" },
      { name: "Other Co", slug: "other-co" }
    );
  }
  process.stdout.write("Seeded Acme (Alice and Bob) plus Other Co.\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seed();
  } finally {
    await closeDatabase();
  }
}
