type RateLimitTier = "chat" | "import" | "write" | "read";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const TIERS: Record<RateLimitTier, RateLimitConfig> = {
  chat: { limit: 20, windowMs: 60_000 },
  import: { limit: 5, windowMs: 60_000 },
  write: { limit: 40, windowMs: 60_000 },
  read: { limit: 120, windowMs: 60_000 },
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function getRateLimitTier(pathname: string, method: string): RateLimitTier {
  if (pathname === "/api/chat" && method === "POST") return "chat";
  if (
    (pathname === "/api/transactions/import" ||
      pathname === "/api/transactions/mock-bank-import") &&
    method === "POST"
  ) {
    return "import";
  }
  if (method === "GET" || method === "HEAD") return "read";
  return "write";
}

export function checkRateLimit(
  key: string,
  tier: RateLimitTier
): { ok: true } | { ok: false; retryAfter: number } {
  const config = TIERS[tier];
  const now = Date.now();
  const bucketKey = `${tier}:${key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || now >= existing.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + config.windowMs });
    return { ok: true };
  }

  if (existing.count >= config.limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

// Prevent unbounded memory growth in long-running dev servers
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, 60_000);
}
