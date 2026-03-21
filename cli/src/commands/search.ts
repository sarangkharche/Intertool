import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { bold, dim, cyan, cross, isJsonMode, spinner, table } from "../lib/format.js";

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
      table(
        ["Name", "Type", "Author", "Description"],
        results.map((r) => [
          r.name,
          r.type,
          `@${r.author ?? "unknown"}`,
          r.description.length > 50 ? r.description.slice(0, 47) + "..." : r.description,
        ]),
      );
      console.log();
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Search failed")
      );
      process.exit(1);
    }
  });
