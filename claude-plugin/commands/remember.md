---
description: Propose durable learnings from the current work for explicit human review.
---

Review the completed work for durable, non-obvious engineering learnings that would help another engineer in a fresh session.

Exclude:

- facts already obvious from current code or checked-in instructions;
- raw conversation, prompts, terminal output, or source files;
- credentials, secrets, personal data, or customer data;
- guesses without a clear confidence level.

For each useful learning, call `propose_memory` with the narrowest repository and path scope, a concise title and content, confidence, and an attributable source where available.

Then show the user the exact proposed draft or drafts. Ask for explicit approval. Call `publish_memory` only for the exact draft IDs the user explicitly approves. If the user changes the wording, update the draft and show it again before publication.
