export class RateLimiter {
  private readonly buckets = new Map<
    string,
    { count: number; resetsAt: number }
  >();

  take(key: string, limit: number, windowMs = 60_000): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetsAt <= now) {
      this.buckets.set(key, { count: 1, resetsAt: now + windowMs });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }
}
