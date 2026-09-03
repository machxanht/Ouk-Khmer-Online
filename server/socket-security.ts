import crypto from "crypto";
import type { Server as SocketIOServer, Socket } from "socket.io";

const PRODUCTION_ORIGINS = [
  "https://ouk.kuonkhmer.com",
  "https://ouk-khmer-online.vercel.app",
  "https://localhost",
  "capacitor://localhost",
] as const;

function parseOrigins(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Production must never silently fall back to wildcard CORS if an environment
 * variable disappears. Explicit env origins are additive; development remains
 * permissive for local tooling.
 */
export function resolveCorsOrigin(
  rawCorsOrigin = process.env.CORS_ORIGIN,
  nodeEnv = process.env.NODE_ENV,
): string | string[] {
  const configured = parseOrigins(rawCorsOrigin);

  if (nodeEnv !== "production") {
    if (configured.length === 0) return "*";
    if (configured.includes("*")) return "*";
    return configured.length === 1 ? configured[0] : configured;
  }

  const allowed = new Set<string>(PRODUCTION_ORIGINS);
  for (const origin of configured) {
    if (origin !== "*") allowed.add(origin);
  }
  return [...allowed];
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/** Small fixed-window limiter suitable for a single stateful Socket.IO process. */
export class FixedWindowRateLimiter {
  private buckets = new Map<string, RateBucket>();
  private operations = 0;

  public hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      this.maybePrune(now);
      return true;
    }

    if (existing.count >= limit) {
      this.maybePrune(now);
      return false;
    }

    existing.count += 1;
    this.maybePrune(now);
    return true;
  }

  private maybePrune(now: number) {
    this.operations += 1;
    if (this.operations % 250 !== 0 && this.buckets.size < 5000) return;

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }

    // Bound memory even during a sustained connection flood. Expired entries are
    // removed first; if all entries are still active, drop oldest insertion keys.
    while (this.buckets.size > 5000) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}

type Packet = [event: string, ...args: unknown[]];

export interface EventPolicy {
  limit: number;
  windowMs: number;
  scope: "socket" | "credential";
  surface: "game" | "room";
}

const EVENT_POLICIES: Record<string, EventPolicy> = {
  "matchmaking:join": { limit: 12, windowMs: 30_000, scope: "credential", surface: "game" },
  "create:private": { limit: 6, windowMs: 60_000, scope: "credential", surface: "room" },
  "join:private": { limit: 12, windowMs: 60_000, scope: "credential", surface: "room" },
  "game:reconnect": { limit: 12, windowMs: 60_000, scope: "credential", surface: "game" },
  "game:move": { limit: 40, windowMs: 10_000, scope: "socket", surface: "game" },
  "chat:send": { limit: 15, windowMs: 10_000, scope: "socket", surface: "game" },
  "game:draw_offer": { limit: 6, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:draw_accept": { limit: 8, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:draw_decline": { limit: 8, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:rematch_request": { limit: 6, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:rematch_decline": { limit: 8, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:resign": { limit: 4, windowMs: 30_000, scope: "socket", surface: "game" },
  "game:leave": { limit: 8, windowMs: 30_000, scope: "socket", surface: "game" },
};

export function getEventRatePolicy(event: string): EventPolicy | undefined {
  return EVENT_POLICIES[event];
}

function getPayload(packet: Packet): Record<string, unknown> | undefined {
  const payload = packet[1];
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
}

function credentialFingerprint(socket: Socket, packet: Packet): string {
  const payload = getPayload(packet);
  const credential = payload?.authToken ?? payload?.sessionToken;
  if (typeof credential === "string" && credential.trim()) {
    return crypto.createHash("sha256").update(credential).digest("hex").slice(0, 24);
  }
  return `socket-${socket.id}`;
}

function emitRateLimit(socket: Socket, policy: EventPolicy) {
  const payload = {
    code: "RATE_LIMITED",
    message: "Thao tác quá nhanh. Vui lòng thử lại sau.",
  };
  socket.emit(policy.surface === "room" ? "room:error" : "game:error", payload);
}

/** Install packet-level abuse controls without changing gameplay handlers. */
export function installSocketSecurity(io: SocketIOServer) {
  const limiter = new FixedWindowRateLimiter();

  io.on("connection", (socket) => {
    socket.use((packet: Packet, next) => {
      const event = packet[0];
      const policy = EVENT_POLICIES[event];
      if (!policy) {
        next();
        return;
      }

      const identity =
        policy.scope === "credential"
          ? credentialFingerprint(socket, packet)
          : `socket-${socket.id}`;
      const allowed = limiter.hit(`${event}:${identity}`, policy.limit, policy.windowMs);
      if (!allowed) {
        emitRateLimit(socket, policy);
        return;
      }

      next();
    });
  });
}
