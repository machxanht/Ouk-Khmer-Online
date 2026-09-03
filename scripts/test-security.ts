import assert from "node:assert/strict";
import { FixedWindowRateLimiter, resolveCorsOrigin } from "../server/socket-security";
import { MatchmakingManager } from "../server/matchmaking-manager";

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

function main() {
  testCorsDefaults();
  testRateLimiter();
  testMatchmakingCannotSelfMatchByUid();
  console.log("✓ server security regression tests passed");
}

main();
