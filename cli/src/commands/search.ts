import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { bold, dim, cyan, cross, isJsonMode, spinner } from "../lib/format.js";

interface SearchResult {
  slug: string;
  name: string;
  type: string;
  description: string;
  author?: string;
}

export const searchCommand = new Command("search")
  .description("Search the skill registry")
  .argument("<query>", "Search query")
  .addHelpText("after", `
Examples:
  $ intertool search "code review"
  $ intertool search mcp --json
`)
  .action(async (query: string) => {
    const s = spinner("Searching...");

    try {
      const results = (await apiGet(
        `/api/search?q=${encodeURIComponent(query)}`
      )) as SearchResult[];

      s.stop();

      if (isJsonMode()) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(dim("No results found."));
        return;
      }

      console.log(`Found ${results.length} result(s):\n`);
      for (const r of results) {
        const author = r.author ?? "unknown";
        const typeLabel = dim(`[${r.type}]`.padEnd(18));
        console.log(`  ${bold(r.name)}  ${typeLabel}  ${cyan(`@${author}/${r.slug}`)}`);
        console.log(`  ${dim(r.description)}\n`);
      }
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Search failed")
      );
      process.exit(1);
    }
  });
