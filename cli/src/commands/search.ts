import { Command } from "commander";
import { apiGet } from "../lib/api.js";

interface SearchResult {
  slug: string;
  name: string;
  type: string;
  description: string;
}

export const searchCommand = new Command("search")
  .description("Search the skill registry")
  .argument("<query>", "Search query")
  .action(async (query: string) => {
    try {
      const results = (await apiGet(
        `/api/search?q=${encodeURIComponent(query)}`
      )) as SearchResult[];

      if (results.length === 0) {
        console.log("No results found.");
        return;
      }

      console.log(`Found ${results.length} result(s):\n`);
      for (const r of results) {
        const typeLabel = r.type.padEnd(16);
        console.log(`  ${r.name}`);
        console.log(`    ${typeLabel} @team/${r.slug}`);
        console.log(`    ${r.description}\n`);
      }
    } catch (err) {
      console.error(
        "Search failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });
