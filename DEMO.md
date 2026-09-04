# Intertool MVP demo

1. Start the database and applications:

   ```bash
   docker compose up -d postgres
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

2. Open `http://localhost:3000/sign-in`, choose **Alice**, and open the seeded Acme organisation.
3. Confirm `acme/payments-service` is registered under **Repositories**.
4. Create Alice's personal token under **API tokens** and export it locally.
5. Connect an MCP client to `http://localhost:3001/mcp`, then call `propose_memory` with:

   ```json
   {
     "repository": "acme/payments-service",
     "type": "warning",
     "title": "Refund tests require ledger events",
     "content": "Run Redis and set ENABLE_LEDGER_EVENTS=true before refund integration tests.",
     "paths": ["tests/refunds/**"],
     "tags": ["tests", "redis"],
     "source_url": "https://github.com/acme/payments-service/pull/1842",
     "source_label": "PR #1842",
     "confidence": "confirmed"
   }
   ```

6. Inspect the exact returned draft. After explicit human approval, call `publish_memory` with its ID.
7. Sign in as **Bob**, create a distinct token, and connect a fresh MCP client.
8. Call `get_context`:

   ```json
   {
     "repository": "acme/payments-service",
     "task": "Fix the failing refund integration tests",
     "paths": ["tests/refunds/refund.test.ts"]
   }
   ```

   The returned context includes the warning, `PR #1842`, confidence, and update timestamp.

9. Sign in as **Mallory**, create a token for the separate Other Co organisation, and repeat the query. It cannot resolve Acme's repository or memory.
10. Revoke Bob's token under **API tokens**. The next MCP request with it returns `401`.

The integration suite automates the token, lifecycle, ranking, MCP handshake, Alice-to-Bob retrieval, isolation, and revocation parts of this scenario:

```bash
pnpm test:integration
```
