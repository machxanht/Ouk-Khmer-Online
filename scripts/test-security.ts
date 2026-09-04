import assert from "node:assert/strict";
import {
  FixedWindowRateLimiter,
  getEventRatePolicy,
  resolveCorsOrigin,
} from "../server/socket-security";
import { MatchmakingManager } from "../server/matchmaking-manager";
import { ServerLogger } from "../server/logger";
import { sanitizePublicLeaderboardDocument } from "../server/public-leaderboard";
import fs from "node:fs";

function testCorsDefaults() {
  const production = resolveCorsOrigin(undefined, "production");
  assert.ok(Array.isArray(production), "production CORS must be an explicit origin list");
  assert.ok(production.includes("https://ouk.kuonkhmer.com"));
  assert.ok(production.includes("https://ouk-khmer-online.vercel.app"));
  assert.ok(!production.includes("*"), "production CORS must never silently allow wildcard");

  const productionWildcard = resolveCorsOrigin("*", "production");
  assert.ok(Array.isArray(productionWildcard));
  assert.ok(!productionWildcard.includes("*"), "explicit wildcard is ignored in production");

  const withExtra = resolveCorsOrigin("https://preview.example.com", "production");
  assert.ok(Array.isArray(withExtra));
  assert.ok(withExtra.includes("https://preview.example.com"));

  assert.equal(resolveCorsOrigin(undefined, "development"), "*");
}

function testRateLimiter() {
  const limiter = new FixedWindowRateLimiter();
  assert.equal(limiter.hit("join:user-a", 2, 1_000, 10_000), true);
  assert.equal(limiter.hit("join:user-a", 2, 1_000, 10_100), true);
  assert.equal(limiter.hit("join:user-a", 2, 1_000, 10_200), false);
  assert.equal(limiter.hit("join:user-a", 2, 1_000, 11_001), true, "window must reset");
  assert.equal(limiter.hit("join:user-b", 2, 1_000, 10_200), true, "keys are isolated");

  for (const event of [
    "matchmaking:join",
    "join:private",
    "game:reconnect",
    "game:move",
    "chat:send",
    "game:draw_offer",
    "game:rematch_request",
  ]) {
    assert.ok(getEventRatePolicy(event), `${event} must have a rate-limit policy`);
  }
}

function testLogRedaction() {
  const logger = new ServerLogger({ enabled: false });
  const entry = logger.info("TEST_SANITIZE", {
    details: {
      pin: "123456",
      sessionToken: "st_do-not-leak",
      nested: {
        apiKey: "secret-key",
        safe: "visible",
        deeper: { password: "do-not-leak" },
      },
    },
  });

  assert.equal(entry.details?.pin, "[REDACTED]");
  assert.equal(entry.details?.sessionToken, "[REDACTED]");
  const nested = entry.details?.nested as Record<string, unknown>;
  assert.equal(nested.apiKey, "[REDACTED]");
  assert.equal(nested.safe, "visible");
  const deeper = nested.deeper as Record<string, unknown>;
  assert.equal(deeper.password, "[REDACTED]");
}

function testMatchmakingCannotSelfMatchByUid() {
  const manager = new MatchmakingManager();

  const first = manager.joinQueue(
    "socket-a1",
    "Same Account A",
    "folk",
    undefined,
    "folk",
    { uid: "uid-a" },
  );
  assert.equal(first.matched, false);

  const second = manager.joinQueue(
    "socket-a2",
    "Same Account B",
    "folk",
    undefined,
    "folk",
    { uid: "uid-a" },
  );
  assert.equal(second.matched, false, "two sockets with the same Firebase UID must not pair");

  const third = manager.joinQueue(
    "socket-b",
    "Other Account",
    "folk",
    undefined,
    "folk",
    { uid: "uid-b" },
  );
  assert.equal(third.matched, true, "a different UID should still match normally");
  if (third.matched) {
    assert.notEqual(third.p1.uid, third.p2.uid, "matched players must have different UIDs");
  }
}

function testPublicLeaderboardPrivacy() {
  const publicEntry = sanitizePublicLeaderboardDocument(
    "projects/p/databases/d/documents/users/uid-private",
    {
      displayName: { stringValue: "Dara" },
      photoURL: { stringValue: "https://example.com/avatar.png" },
      rating: { integerValue: "1510" },
      peakRating: { integerValue: "1560" },
      wins: { integerValue: "9" },
      losses: { integerValue: "3" },
      draws: { integerValue: "2" },
      winStreak: { integerValue: "4" },
      gamesPlayed: { integerValue: "14" },
      email: { stringValue: "private@example.com" },
      emailVerified: { booleanValue: true },
      providerId: { stringValue: "google.com" },
      serverCreatedAt: { timestampValue: "2026-09-04T00:00:00Z" },
    },
  );
  assert.equal(publicEntry.uid, "uid-private");
  assert.equal(publicEntry.displayName, "Dara");
  assert.equal(publicEntry.rating, 1510);
  for (const privateKey of ["email", "emailVerified", "providerId", "serverCreatedAt"]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(publicEntry, privateKey),
      false,
      `${privateKey} must never appear in the public leaderboard shape`,
    );
  }

  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.ok(rules.includes("allow read: if isOwner(userId);"));
  assert.ok(!rules.includes("allow read: if true;"), "users collection must not be public-readable");
}

function main() {
  testCorsDefaults();
  testRateLimiter();
  testLogRedaction();
  testMatchmakingCannotSelfMatchByUid();
  testPublicLeaderboardPrivacy();
  console.log("✓ server security regression tests passed");
}

main();
