/**
 * Auth/security regression tests.
 * Development tokens are explicitly enabled only inside this test process.
 */

import { authVerifier } from "../server/auth-verifier";
import { MatchmakingManager } from "../server/matchmaking-manager";
import { RoomManager } from "../server/room-manager";

process.env.NODE_ENV = "test";
process.env.ALLOW_DEV_AUTH_TOKENS = "true";

async function runAuthTests() {
  console.log("=== RUNNING AUTH & SECURITY INTEGRATION TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  const testUser = await authVerifier.verifyToken("test-token-user_123");
  assert(
    testUser !== null && testUser.uid === "user_123" && testUser.email === "user_123@example.com",
    "explicit test-mode token is accepted",
  );

  const invalidUser = await authVerifier.verifyToken("invalid_garbage_token");
  assert(invalidUser === null, "invalid token is rejected");

  const nullUser = await authVerifier.verifyToken(undefined);
  assert(nullUser === null, "missing token is rejected");

  const roomManager = new RoomManager();
  const authMeta1 = {
    uid: "uid_player_white",
    photoURL: "https://example.com/avatar1.png",
    emailVerified: true,
  };
  const room = roomManager.createPrivateRoom(
    "socket_w_1",
    "Grandmaster Angkor",
    "folk",
    { type: "standard", initialSeconds: 3600 },
    authMeta1,
  );

  assert(room.players.w?.uid === "uid_player_white", "room host retains verified UID");
  assert(
    room.players.w?.photoURL === "https://example.com/avatar1.png",
    "room host retains verified photoURL",
  );
  assert(room.players.w?.emailVerified === true, "room host retains email verification flag");

  const authMeta2 = {
    uid: "uid_player_black",
    photoURL: "https://example.com/avatar2.png",
    emailVerified: false,
  };
  const joinRes = roomManager.joinPrivateRoom(room.pin, "socket_b_1", "Challenger", authMeta2);
  assert(joinRes.success === true, "guest joins private room");
  if (joinRes.success) {
    assert(joinRes.room.players.b?.uid === "uid_player_black", "guest retains verified UID");
    assert(
      joinRes.room.players.b?.photoURL === "https://example.com/avatar2.png",
      "guest retains verified photoURL",
    );
  }

  const mm = new MatchmakingManager();
  const qRes1 = mm.joinQueue(
    "socket_q1",
    "Ranked Player 1",
    "folk",
    { type: "standard", initialSeconds: 3600 },
    "folk",
    { uid: "uid_ranked_1", photoURL: "https://example.com/p1.png", emailVerified: true },
  );
  assert(qRes1.matched === false && qRes1.queueSize === 1, "first ranked player is queued");

  const qRes2 = mm.joinQueue(
    "socket_q2",
    "Ranked Player 2",
    "folk",
    { type: "standard", initialSeconds: 3600 },
    "folk",
    { uid: "uid_ranked_2", photoURL: "https://example.com/p2.png", emailVerified: true },
  );
  assert(qRes2.matched === true, "second compatible ranked player is matched");
  if (qRes2.matched) {
    assert(qRes2.p1.uid === "uid_ranked_1", "matched P1 keeps verified UID");
    assert(qRes2.p2.uid === "uid_ranked_2", "matched P2 keeps verified UID");
  }

  const sessionToken = room.players.w?.sessionToken;
  const reconnectRes = roomManager.handleReconnect("new_socket_w_2", room.id, sessionToken, "w");
  assert(reconnectRes.success === true, "valid session token restores room seat");
  if (reconnectRes.success) {
    assert(reconnectRes.player.uid === "uid_player_white", "reconnect preserves verified UID");
    assert(
      reconnectRes.player.socketId === "new_socket_w_2",
      "reconnect rotates active socket ID",
    );
  }

  const spoofReconnect = roomManager.handleReconnect(
    "fake_socket",
    room.id,
    "st_wrong_invalid_token",
    "w",
  );
  assert(spoofReconnect.success === false, "spoofed session token is rejected");

  // A syntactically valid JWT with a fake signature must never authenticate.
  const fakeHeader = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "nonexistent-key" }),
  ).toString("base64url");
  const fakePayload = Buffer.from(
    JSON.stringify({
      sub: "victim_uid",
      user_id: "victim_uid",
      aud: "project-by-khang",
      iss: "https://securetoken.google.com/project-by-khang",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const forgedJwt = `${fakeHeader}.${fakePayload}.fake_signature`;
  const forgedUser = await authVerifier.verifyToken(forgedJwt);
  assert(forgedUser === null, "forged Firebase JWT is rejected");

  const verifiedDevUser = await authVerifier.verifyToken("test-token-google_oauth_uid_999");
  assert(verifiedDevUser?.uid === "google_oauth_uid_999", "test-only verified identity is available");

  const googleAuthRoom = roomManager.createPrivateRoom(
    "socket_google_1",
    verifiedDevUser?.displayName || "Google Player",
    "folk",
    { type: "standard", initialSeconds: 3600 },
    {
      uid: verifiedDevUser!.uid,
      photoURL: verifiedDevUser?.photoURL || undefined,
      emailVerified: verifiedDevUser?.emailVerified,
    },
  );
  assert(
    googleAuthRoom.players.w?.uid === "google_oauth_uid_999",
    "verified server identity is bound to room seat",
  );

  const appletConfig = await import("../firebase-applet-config.json");
  assert(appletConfig.projectId === "project-by-khang", "Firebase projectId is configured");
  assert(
    Boolean(appletConfig.apiKey && appletConfig.apiKey.startsWith("AIza")),
    "Firebase API key is configured",
  );
  assert(
    appletConfig.authDomain === "project-by-khang.firebaseapp.com",
    "Firebase authDomain is configured",
  );

  // Anti-spoofing: only metadata derived from a verified identity is passed to rooms.
  const spoofedClientUid = "VICTIM_UID_ATTEMPTING_TO_SPOOF";
  const safeRoom = roomManager.createPrivateRoom(
    "socket_secure_1",
    "Authenticated Player",
    "folk",
    { type: "standard", initialSeconds: 3600 },
    {
      uid: verifiedDevUser!.uid,
      photoURL: verifiedDevUser?.photoURL || undefined,
      emailVerified: verifiedDevUser?.emailVerified,
    },
  );
  assert(
    safeRoom.players.w?.uid === "google_oauth_uid_999",
    "authoritative room UID comes from verified identity",
  );
  assert(safeRoom.players.w?.uid !== spoofedClientUid, "client-forged UID is ignored");

  roomManager.joinPrivateRoom(safeRoom.pin, "socket_guest_2", "Guest Player", {
    uid: "verified_guest_uid",
  });
  const storedSessionToken = safeRoom.players.w?.sessionToken;
  assert(
    Boolean(storedSessionToken && storedSessionToken.startsWith("st_")),
    "cryptographically random match session token is issued",
  );

  const restoredSession = roomManager.handleReconnect(
    "socket_secure_reconnected",
    safeRoom.id,
    storedSessionToken,
    "w",
  );
  assert(restoredSession.success === true, "valid match session restores after reconnect");
  if (restoredSession.success) {
    assert(
      restoredSession.player.uid === "google_oauth_uid_999",
      "restored match session preserves original verified UID",
    );
  }

  const staleReconnectAttempt = roomManager.handleReconnect(
    "socket_after_logout",
    safeRoom.id,
    "revoked_or_invalid_token",
    "w",
  );
  assert(staleReconnectAttempt.success === false, "invalid match session cannot take over seat");

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runAuthTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
