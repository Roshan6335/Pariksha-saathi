// Lightweight in-memory sliding-window rate limiter. Works per serverless
// instance — not perfectly distributed across every Vercel edge instance,
// but it's zero-cost, zero-setup, and meaningfully protects the shared
// Groq/OpenRouter API budget from being drained by one abusive client,
// which is what actually causes "everyone's requests start failing."
//
// If this app grows a lot, swap this for Upstash Redis (same pattern you
// used in KeryoAI) for a properly distributed limit — this file is written
// so that swap only touches this one file.

const WINDOW_MS = 60_000;
const buckets = new Map();

export function rateLimit(key, limit = 20) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (buckets.size > 5000) {
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of buckets) {
      if (v.start < cutoff) buckets.delete(k);
    }
  }

  return bucket.count <= limit;
}

export function getClientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitResponse() {
  return Response.json(
    { error: "Too many requests from this device right now — please wait a minute and try again." },
    { status: 429 }
  );
}
