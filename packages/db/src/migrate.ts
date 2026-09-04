import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export async function migrate(url = process.env.DATABASE_URL): Promise<void> {
  if (!url) throw new Error("DATABASE_URL is required");
  const db = postgres(url, { max: 1 });
  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../migrations"
  );
  try {
    await db`
      CREATE TABLE IF NOT EXISTS intertool_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of files) {
      const applied =
        await db`SELECT 1 FROM intertool_migrations WHERE name = ${name}`;
      if (applied[0]) continue;
      const sql = await fs.readFile(path.join(migrationsDir, name), "utf8");
      await db.begin(async (tx) => {
        await tx.unsafe(sql);
        await tx`INSERT INTO intertool_migrations (name) VALUES (${name})`;
      });
      process.stdout.write(`Applied ${name}\n`);
    }
  } finally {
    await db.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
}
