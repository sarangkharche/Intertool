import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const sourceKind = "codex_local";
const memoryRoot = path.resolve(
  process.env.CODEX_MEMORY_DIR ??
    path.join(
      process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
      "memories"
    )
);
const serverUrl = (
  process.env.INTERTOOL_URL ?? "http://127.0.0.1:3001"
).replace(/\/$/, "");
const token = process.env.INTERTOOL_API_TOKEN;

if (!token) {
  throw new Error("INTERTOOL_API_TOKEN is required");
}

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.name !== ".git")
      .map(async (entry) => {
        const itemPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return markdownFiles(itemPath);
        return entry.isFile() && entry.name.toLowerCase().endsWith(".md")
          ? [itemPath]
          : [];
      })
  );
  return files.flat().sort((left, right) => left.localeCompare(right));
}

function documentTitle(content: string, filePath: string): string {
  const heading = content
    .split(/\r?\n/)
    .map((line) => /^#\s+(.+)$/.exec(line)?.[1]?.trim())
    .find(Boolean);
  return (heading ?? path.basename(filePath, path.extname(filePath))).slice(
    0,
    200
  );
}

async function importFile(filePath: string) {
  const [content, stats] = await Promise.all([
    fs.readFile(filePath, "utf8"),
    fs.stat(filePath),
  ]);
  const sourceKey = path
    .relative(memoryRoot, filePath)
    .split(path.sep)
    .join("/");
  const response = await fetch(`${serverUrl}/api/personal-memories/import`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      source_kind: sourceKind,
      source_key: sourceKey,
      title: documentTitle(content, filePath),
      content,
      source_modified_at: stats.mtime.toISOString(),
      metadata: {
        bytes: Buffer.byteLength(content, "utf8"),
        sha256: crypto.createHash("sha256").update(content).digest("hex"),
      },
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    outcome?: "created" | "updated" | "unchanged";
    error?: { message?: string };
  } | null;
  if (!response.ok || !body?.outcome) {
    throw new Error(
      `${sourceKey}: ${body?.error?.message ?? `HTTP ${response.status}`}`
    );
  }
  return body.outcome;
}

async function main(): Promise<void> {
  const files = await markdownFiles(memoryRoot);
  const counts = { created: 0, updated: 0, unchanged: 0 };

  process.stdout.write(
    `Importing ${files.length} Markdown documents from ${memoryRoot}\n`
  );

  for (const [index, filePath] of files.entries()) {
    const outcome = await importFile(filePath);
    counts[outcome] += 1;
    if ((index + 1) % 25 === 0 || index === files.length - 1) {
      process.stdout.write(`Processed ${index + 1}/${files.length}\n`);
    }
  }

  process.stdout.write(
    `Done: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged\n`
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Import failed"}\n`
  );
  process.exitCode = 1;
});
