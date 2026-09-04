import { getAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

function mcpUrlFor(origin: string): string {
  const configured =
    process.env.INTERTOOL_MCP_URL ||
    process.env.NEXT_PUBLIC_MCP_URL ||
    process.env.SERVER_URL;
  const base = (configured || origin).replace(/\/$/, "");
  return base.endsWith("/mcp") ? base : `${base}/mcp`;
}

export function GET() {
  const siteUrl = getAbsoluteUrl("/").replace(/\/$/, "");
  const defaultMcpUrl = mcpUrlFor(siteUrl);
  const tokenUrl = getAbsoluteUrl("/settings/tokens");
  const docsUrl = getAbsoluteUrl("/docs/getting-started");

  const instructions = `# Install the Intertool MCP

You are reading Intertool's canonical agent-install instructions. Help the user connect the AI coding client they are currently using to Intertool's Streamable HTTP MCP server.

## Safety rules

- Never ask the user to paste an Intertool token into chat.
- Never print, log, commit, or place token plaintext in a repository file.
- Do not overwrite an existing MCP configuration. Read it first and merge only the \`intertool\` entry.
- Preserve unrelated servers and settings.
- Before changing a user-level config, tell the user which file you will update.
- If an \`intertool\` entry already exists, show the non-secret differences and ask before replacing it.
- Use the \`INTERTOOL_API_TOKEN\` environment variable for the token.

## 1. Collect the two local values

MCP URL:

\`\`\`text
${defaultMcpUrl}
\`\`\`

For local development, the URL may instead be \`http://localhost:3001/mcp\`. Ask which Intertool deployment the user wants when the correct URL is not clear.

The user creates a personal token at ${tokenUrl}. Tell them to export it in their own terminal or secret manager:

\`\`\`bash
export INTERTOOL_API_TOKEN="itk_..."
\`\`\`

Do not ask them to send the value to you. Confirm only that the variable is set, without displaying it.

## 2. Detect and configure the current client

Use the current client when it is known. Otherwise, inspect installed commands and ask the user to choose if more than one is available.

### ChatGPT desktop, Codex CLI, or Codex IDE extension

Merge this into \`~/.codex/config.toml\` (or project-scoped \`.codex/config.toml\` when the user explicitly wants repository scope):

\`\`\`toml
[mcp_servers.intertool]
url = "${defaultMcpUrl}"
bearer_token_env_var = "INTERTOOL_API_TOKEN"
\`\`\`

These clients share the same Codex-host MCP configuration. Restart the app or extension after editing.

### Claude Code

Merge this into the repository's \`.mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "intertool": {
      "type": "http",
      "url": "\${INTERTOOL_URL:-${defaultMcpUrl}}",
      "headers": {
        "Authorization": "Bearer \${INTERTOOL_API_TOKEN}"
      }
    }
  }
}
\`\`\`

The environment-variable references are safe to share; the token value is not. Prefer a local or untracked config when repository policy does not allow shared MCP definitions.

### GitHub Copilot CLI

Merge this server into \`~/.copilot/mcp-config.json\`:

\`\`\`json
{
  "mcpServers": {
    "intertool": {
      "type": "http",
      "url": "${defaultMcpUrl}",
      "headers": {
        "Authorization": "Bearer \${INTERTOOL_API_TOKEN}"
      },
      "tools": ["get_context", "search_context", "propose_memory", "publish_memory", "report_stale"]
    }
  }
}
\`\`\`

For Copilot cloud agent, do not edit a local file. Tell a repository administrator to add the remote server under Repository settings -> Copilot -> MCP servers and store the token as an Agents secret beginning with \`COPILOT_MCP_\`.

### Grok CLI

Merge this into \`~/.grok/config.toml\`:

\`\`\`toml
[mcp_servers.intertool]
url = "${defaultMcpUrl}"
headers = { "Authorization" = "Bearer \${INTERTOOL_API_TOKEN}" }
\`\`\`

For Grok Bot or a cloud connector, use a deployed public HTTPS URL. Cloud clients cannot reach localhost.

### Another MCP client

Configure a Streamable HTTP server named \`intertool\` at \`${defaultMcpUrl}\`. Send \`Authorization: Bearer <token>\`, sourcing the token from \`INTERTOOL_API_TOKEN\` or the client's secret store.

## 3. Verify

After configuration:

1. Restart or reload the client if required.
2. Use the client's MCP status command: \`/mcp\` in Codex or Claude Code, \`copilot mcp list\` for Copilot CLI, or \`grok mcp doctor intertool\` for Grok CLI.
3. Confirm that Intertool exposes: \`get_context\`, \`search_context\`, \`propose_memory\`, \`publish_memory\`, and \`report_stale\`.
4. If authentication returns \`401\`, confirm the environment variable exists in the process that launched the client. Do not display its value.
5. Report exactly which file changed and whether verification passed.

Full documentation: ${docsUrl}
`;

  return new Response(instructions, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
