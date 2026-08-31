import { serverLogger, LogEntry } from "./logger";
import { roomManager } from "./room-manager";
import { matchmakingManager } from "./matchmaking-manager";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n==========================================");
  console.log("STAGE 24: ONLINE OBSERVABILITY & OPERATOR DIAGNOSTICS TESTS");
  console.log("==========================================\n");

  // 1. Logger unit tests & sanitization
  console.log("--- 1. Logger Sanitization & Circular Buffer ---");
  serverLogger.clear();

  serverLogger.info("TEST_SANITIZE", {
    roomId: "test_room_1",
    details: {
      sessionToken: "st_123456789abcdef",
      apiKey: "secret_value_123",
      safeValue: 42,
    },
  });

  const logs = serverLogger.getLogs();
  assert(logs.length === 1, "Log entry recorded in logger buffer");
  const firstLog = logs[0];
  assert(firstLog.event === "TEST_SANITIZE", "Event name recorded correctly");
  assert(firstLog.roomId === "test_room_1", "Room ID recorded correctly");
  assert(
    typeof firstLog.details?.sessionToken === "string" &&
      firstLog.details.sessionToken.endsWith("***"),
    "sessionToken was sanitized with masking",
  );
  assert(
    typeof firstLog.details?.apiKey === "string" && firstLog.details.apiKey.endsWith("***"),
    "apiKey was sanitized with masking",
  );
  assert(firstLog.details?.safeValue === 42, "Non-sensitive data preserved");

  // Circular buffer overflow test
  serverLogger.clear();
  for (let i = 0; i < 2050; i++) {
    serverLogger.debug("BULK_TEST", { details: { index: i } });
  }
  const overflowLogs = serverLogger.getLogs();
  assert(overflowLogs.length === 2000, "Circular buffer bounds max 2000 logs without memory leak");
  assert(
    overflowLogs[overflowLogs.length - 1].details?.index === 2049,
    "Most recent log kept at head of buffer",
  );

  // 2. Room lifecycle and correlation trace
  console.log("\n--- 2. Room Lifecycle & Correlation Trace ---");
  serverLogger.clear();
  roomManager.clear();
  matchmakingManager.clear();

  // Create private room
  const p1Socket = "socket_host_1";
  const room = roomManager.createPrivateRoom(p1Socket, "Alice", "folk", {
    type: "standard",
    initialSeconds: 3600,
  });
  const pin = room.pin!;

  assert(Boolean(room.id), "Private room created with ID");
  let roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(roomLogs.length >= 1, "Logs queryable by roomId");
  assert(roomLogs[0].event === "ROOM_CREATE", "ROOM_CREATE logged with correlation");
  assert(roomLogs[0].playerName === "Alice", "Host player name logged");

  // Join private room with invalid PIN
  const joinFail = roomManager.joinPrivateRoom("999999", "socket_guest_fail", "Bob");
  assert(!joinFail.success && joinFail.code === "ROOM_NOT_FOUND", "Invalid PIN rejected");
  const joinFailLogs = serverLogger.getLogs("ROOM_JOIN");
  assert(joinFailLogs.length >= 1, "Failed join logged with ROOM_JOIN event");
  assert(
    joinFailLogs.some((l) => l.details?.code === "ROOM_NOT_FOUND"),
    "Error code preserved in log details",
  );

  // Join private room successfully
  const joinSuccess = roomManager.joinPrivateRoom(pin, "socket_guest_1", "Bob");
  assert(joinSuccess.success, "Guest joined room successfully");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  const joinLog = roomLogs.find((l) => l.event === "ROOM_JOIN" && l.color === "b");
  assert(Boolean(joinLog), "Successful ROOM_JOIN logged with player color b");
  assert(joinLog?.playerName === "Bob", "Guest name logged on join");

  // 3. Move acceptance and rejection trace
  console.log("\n--- 3. Move Acceptance & Rejection Trace ---");
  // Illegal move attempt (White tries invalid destination)
  const badMoveResult = roomManager.handleMove(p1Socket, 40, 20);
  assert(!badMoveResult.success, "Illegal move rejected");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  const rejLog = roomLogs.find((l) => l.event === "MOVE_REJECTED");
  assert(Boolean(rejLog), "MOVE_REJECTED logged with correlation");
  assert(rejLog?.details?.code === "INVALID_MOVE", "Rejection code included in trace");

  // Valid move attempt (White moves Fish at 40 forward to 32)
  const goodMoveResult = roomManager.handleMove(p1Socket, 40, 32);
  assert(goodMoveResult.success, "Valid move accepted");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  const accLog = roomLogs.find((l) => l.event === "MOVE_ACCEPTED");
  assert(Boolean(accLog), "MOVE_ACCEPTED logged with correlation");
  assert(accLog?.color === "w", "White move logged with color w");
  assert(accLog?.details?.from === 40 && accLog?.details?.to === 32, "Move coordinates logged");

  // 4. Draw & Resign trace
  console.log("\n--- 4. Draw & Resign Trace ---");
  const drawOffer = roomManager.handleDrawOffer("socket_guest_1");
  assert(drawOffer.success, "Draw offer created");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(
    roomLogs.some((l) => l.event === "DRAW_OFFER" && l.color === "b"),
    "DRAW_OFFER logged with color b",
  );

  const drawDecline = roomManager.handleDrawDecline(p1Socket);
  assert(drawDecline.success, "Draw offer declined");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(
    roomLogs.some((l) => l.event === "DRAW_DECLINE"),
    "DRAW_DECLINE logged",
  );

  const resignResult = roomManager.handleResign(p1Socket);
  assert(resignResult.success, "Player resigned");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  const resignLog = roomLogs.find((l) => l.event === "RESIGN");
  assert(Boolean(resignLog), "RESIGN logged with correlation");
  assert(resignLog?.details?.winner === "b", "Winner logged in resign details");

  // 5. Rematch & Reconnect trace
  console.log("\n--- 5. Rematch & Reconnect Trace ---");
  const rematchReq1 = roomManager.handleRematchRequest(
    p1Socket,
    () => {},
    () => {},
  );
  assert(rematchReq1.type === "rematch_offered", "First player requested rematch");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(
    roomLogs.some((l) => l.event === "REMATCH_OFFER"),
    "REMATCH_OFFER logged",
  );

  const rematchReq2 = roomManager.handleRematchRequest(
    "socket_guest_1",
    () => {},
    () => {},
  );
  assert(rematchReq2.type === "rematch_started", "Rematch started with swapped colors");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(
    roomLogs.some((l) => l.event === "REMATCH_START"),
    "REMATCH_START logged",
  );

  // Disconnect & Reconnect trace
  const dcResult = roomManager.handleDisconnect("socket_guest_1");
  assert(dcResult !== null && dcResult.type === "player_disconnected", "Disconnect handled");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  assert(
    roomLogs.some((l) => l.event === "DISCONNECT"),
    "DISCONNECT logged with correlation",
  );

  const guestPlayer = room.players.w?.name === "Bob" ? room.players.w : room.players.b!;
  const reconResult = roomManager.handleReconnect(
    "socket_guest_new",
    room.id,
    guestPlayer.sessionToken,
  );
  assert(reconResult.success, "Player reconnected with session token");
  roomLogs = serverLogger.getLogsByRoom(room.id);
  const reconLog = roomLogs.find((l) => l.event === "RECONNECT");
  assert(Boolean(reconLog), "RECONNECT logged with correlation");
  assert(reconLog?.socketId === "socket_guest_new", "New socketId logged on reconnect");

  // 6. Matchmaking queue trace
  console.log("\n--- 6. Matchmaking Queue Trace ---");
  serverLogger.clear();
  matchmakingManager.clear();

  const mmJoin1 = matchmakingManager.joinQueue("mm_sock_1", "Charlie", "folk");
  assert(!mmJoin1.matched, "First MM player queued");
  assert(
    serverLogger.getLogs("MATCHMAKING_JOIN").length === 1,
    "MATCHMAKING_JOIN logged on queue join",
  );

  const mmJoin2 = matchmakingManager.joinQueue("mm_sock_2", "Dave", "folk");
  assert(mmJoin2.matched, "Second MM player matched");
  assert(
    serverLogger.getLogs("MATCHMAKING_MATCHED").length === 1,
    "MATCHMAKING_MATCHED logged on pairing",
  );

  // 7. Cleanup trace
  console.log("\n--- 7. Room Cleanup Trace ---");
  serverLogger.clear();
  const cleanedCount = roomManager.cleanupStaleRooms(0);
  assert(cleanedCount >= 0, "Room cleanup executed safely");

  // Clean up any remaining timers/state
  roomManager.clear();

  console.log("\n==========================================");
  console.log(`STAGE 24 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
