import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit.js";

describe("RateLimiter", () => {
  it("rejects requests above the configured window limit", () => {
    const limiter = new RateLimiter();
    expect(limiter.take("alice", 2)).toBe(true);
    expect(limiter.take("alice", 2)).toBe(true);
    expect(limiter.take("alice", 2)).toBe(false);
    expect(limiter.take("bob", 2)).toBe(true);
  });
});
