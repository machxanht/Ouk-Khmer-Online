import { RoomManager } from "../server/room-manager";
import {
  createInitialGameState,
  getAfkWindowMs,
  validateAndExecuteMove,
} from "../server/game-engine";
import { getRuleSet, legalMoves, initialBoard } from "../src/lib/khmer-chess";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  passedCount++;
  console.log(`[PASS] ${msg}`);
}

console.log("==================================================");
console.log("EXECUTING COMPREHENSIVE MULTIPLAYER CORE SUITE");
console.log("==================================================");

// ----------------------------------------------------
// MODULE 1: RoomManager Initialization & Private Rooms
// ----------------------------------------------------
console.log("\n--- [1] RoomManager & Private Room Creation ---");
const roomManager = new RoomManager();
assert(roomManager !== null, "1.1 RoomManager instantiated successfully");

const socketHost = "socket_host_001";
const hostRoom = roomManager.createPrivateRoom(socketHost, "Sophea_Host", "folk");
assert(Boolean(hostRoom && hostRoom.id), "1.2 Private room created with unique ID");
assert(
  hostRoom.pin?.length === 6 && /^\d{6}$/.test(hostRoom.pin),
  "1.3 Room PIN is exactly 6 digits",
);
assert(hostRoom.status === "waiting", "1.4 Initial room status is 'waiting'");
assert(hostRoom.players.w?.name === "Sophea_Host", "1.5 Host assigned to White ('w')");
assert(hostRoom.players.b === null, "1.6 Black seat ('b') is initially null");
assert(hostRoom.rulesetId === "folk", "1.7 Ruleset carried is 'folk'");

// ----------------------------------------------------
// MODULE 2: PIN Validation & Joining
// ----------------------------------------------------
console.log("\n--- [2] PIN Validation & Guest Joining ---");
// Invalid PIN format
const invalidPinResult = roomManager.joinPrivateRoom("123", "socket_guest_err", "Guest");
assert(
  invalidPinResult.success === false && invalidPinResult.code === "INVALID_PIN",
  "2.1 Rejects short PIN",
);

// Non-existent PIN
const nonExistentResult = roomManager.joinPrivateRoom("999999", "socket_guest_err", "Guest");
assert(
  nonExistentResult.success === false && nonExistentResult.code === "ROOM_NOT_FOUND",
  "2.2 Rejects non-existent PIN",
);

// Host tries to join own room
const selfJoinResult = roomManager.joinPrivateRoom(hostRoom.pin!, socketHost, "Sophea_Host");
assert(
  selfJoinResult.success === false && selfJoinResult.code === "ALREADY_IN_ROOM",
  "2.3 Prevents host from double-joining own room",
);

// Valid Guest Join
const socketGuest = "socket_guest_002";
const guestJoinResult = roomManager.joinPrivateRoom(hostRoom.pin!, socketGuest, "Dara_Guest");
assert(guestJoinResult.success === true, "2.4 Guest joined room successfully");
assert(hostRoom.status === "playing", "2.5 Room transitioned to 'playing'");
assert(hostRoom.players.b?.name === "Dara_Guest", "2.6 Guest assigned to Black ('b')");
assert(Boolean(hostRoom.gameState), "2.7 Authoritative GameState initialized in room");

// Trying to join already full room
const thirdPlayerResult = roomManager.joinPrivateRoom(hostRoom.pin!, "socket_third", "Third");
assert(
  thirdPlayerResult.success === false && thirdPlayerResult.code === "ROOM_FULL",
  "2.8 Rejects 3rd player from full room",
);

// ----------------------------------------------------
// MODULE 3: Room & Player Lookups
// ----------------------------------------------------
console.log("\n--- [3] Room & Player Lookups ---");
const foundHostRoom = roomManager.getRoomBySocket(socketHost);
assert(foundHostRoom?.id === hostRoom.id, "3.1 getRoomBySocket finds host room");
const hostColor = roomManager.getPlayerColor(hostRoom, socketHost);
assert(hostColor === "w", "3.2 getPlayerColor identifies White for host");
const guestColor = roomManager.getPlayerColor(hostRoom, socketGuest);
assert(guestColor === "b", "3.3 getPlayerColor identifies Black for guest");
const opponentOfHost = roomManager.getOpponent(hostRoom, socketHost);
assert(opponentOfHost?.socketId === socketGuest, "3.4 getOpponent of host returns guest");
const opponentOfGuest = roomManager.getOpponent(hostRoom, socketGuest);
assert(opponentOfGuest?.socketId === socketHost, "3.5 getOpponent of guest returns host");

// ----------------------------------------------------
// MODULE 4: Direct validateAndExecuteMove Validations
// ----------------------------------------------------
console.log("\n--- [4] Authoritative Move Engine Validations ---");
const freshGame = createInitialGameState("folk", { type: "standard", initialSeconds: 3600 });

// 4.1 Turn Enforcement: Black tries to move first
const wrongTurnRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "b",
  rawFrom: 16,
  rawTo: 24,
});
assert(
  wrongTurnRes.success === false && wrongTurnRes.error.code === "NOT_YOUR_TURN",
  "4.1 Rejects move when not player turn",
);

// 4.2 Empty Square Selection
const emptySquareRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "w",
  rawFrom: 32, // empty middle square
  rawTo: 24,
});
assert(
  emptySquareRes.success === false && emptySquareRes.error.code === "INVALID_MOVE",
  "4.2 Rejects moving from empty square",
);

// 4.3 Moving Opponent Piece
const moveOpponentRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "w",
  rawFrom: 16, // Black pawn
  rawTo: 24,
});
assert(
  moveOpponentRes.success === false && moveOpponentRes.error.code === "INVALID_MOVE",
  "4.3 Rejects moving opponent piece",
);

// 4.4 Malformed Coordinates
const malformedRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "w",
  rawFrom: -1,
  rawTo: 100,
});
assert(
  malformedRes.success === false && malformedRes.error.code === "MALFORMED_MOVE",
  "4.4 Rejects malformed / out-of-bounds coordinates",
);

// 4.5 Illegal Move Geometry
const illegalGeomRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "w",
  rawFrom: 40, // White Trey (pawn)
  rawTo: 48, // backward
});
assert(
  illegalGeomRes.success === false && illegalGeomRes.error.code === "INVALID_MOVE",
  "4.5 Rejects illegal piece move geometry",
);

// 4.6 Folk vs International King Leaps
const folkGame = createInitialGameState("folk");
const intlGame = createInitialGameState("international");
// King at square 59 (row 7, col 3)
const folkKingLeap = validateAndExecuteMove({
  gameState: folkGame,
  playerColor: "w",
  rawFrom: 59,
  rawTo: 49, // knight leap r=6, c=1
});
assert(folkKingLeap.success === true, "4.6 Folk allows King Knight-leap on opening");

const intlKingLeap = validateAndExecuteMove({
  gameState: intlGame,
  playerColor: "w",
  rawFrom: 59,
  rawTo: 49,
});
assert(intlKingLeap.success === false, "4.7 International forbids King Knight-leap");

// 4.8 Legal Move Execution & State Mutation
const legalMoveRes = validateAndExecuteMove({
  gameState: freshGame,
  playerColor: "w",
  rawFrom: 40, // White pawn
  rawTo: 32,
});
assert(legalMoveRes.success === true, "4.8 Legal move executes successfully");
assert(freshGame.turn === "b", "4.9 Turn toggled to Black ('b')");
assert(freshGame.moveCount === 1, "4.10 Move count incremented to 1");
assert(freshGame.moveHistory.length === 1, "4.11 Move recorded in moveHistory");
assert(
  freshGame.lastMove?.from === 40 && freshGame.lastMove?.to === 32,
  "4.12 lastMove metadata matches",
);

// ----------------------------------------------------
// MODULE 5: Captures & Piece Accounting
// ----------------------------------------------------
console.log("\n--- [5] Captures & Piece Accounting ---");
const captureGame = createInitialGameState("folk");
// Setup a direct capture scenario
// Move White Pawn 40 -> 32 (r=5,c=0 -> r=4,c=0)
validateAndExecuteMove({ gameState: captureGame, playerColor: "w", rawFrom: 40, rawTo: 32 });
// Move Black Pawn 17 -> 25 (r=2,c=1 -> r=3,c=1)
validateAndExecuteMove({ gameState: captureGame, playerColor: "b", rawFrom: 17, rawTo: 25 });
// Move White Pawn 41 -> 33 (r=5,c=1 -> r=4,c=1)
validateAndExecuteMove({ gameState: captureGame, playerColor: "w", rawFrom: 41, rawTo: 33 });
// Black Pawn at 25 (r=3,c=1) captures White Pawn at 32 (r=4,c=0, diagonal forward: 25 -> 32)
const captureRes = validateAndExecuteMove({
  gameState: captureGame,
  playerColor: "b",
  rawFrom: 25,
  rawTo: 32,
});
assert(captureRes.success === true, "5.1 Pawn diagonal capture executes successfully");
assert(
  captureRes.movedPayload.captured !== null,
  "5.2 Captured piece object present in movedPayload",
);
assert(captureRes.movedPayload.captured?.type === "p", "5.3 Captured piece type is Pawn ('p')");
assert(
  captureGame.board[32]?.color === "b",
  "5.4 Black pawn now occupies capture destination square",
);

// ----------------------------------------------------
// MODULE 6: Authoritative Clock & Timeout Mechanics
// ----------------------------------------------------
console.log("\n--- [6] Authoritative Clock & Timeout Mechanics ---");
const clockGame = createInitialGameState("folk", { type: "standard", initialSeconds: 3600 });
const originalWhiteClock = clockGame.clocks.w;
// Simulate 500ms elapsed
clockGame.lastTurnTimestamp = Date.now() - 500;
const clockMoveRes = validateAndExecuteMove({
  gameState: clockGame,
  playerColor: "w",
  rawFrom: 40,
  rawTo: 32,
});
assert(clockMoveRes.success === true, "6.1 Move under active clock succeeds");
assert(clockGame.clocks.w < originalWhiteClock, "6.2 Active player's clock accurately deducted");
assert(clockGame.clocks.b === originalWhiteClock, "6.3 Inactive player's clock remained unchanged");

// Expired clock timeout test
const expiredGame = createInitialGameState("folk", { type: "standard", initialSeconds: 1 });
expiredGame.clocks.w = 50;
expiredGame.lastTurnTimestamp = Date.now() - 1000; // 1000ms elapsed > 50ms remaining
const timeoutMoveRes = validateAndExecuteMove({
  gameState: expiredGame,
  playerColor: "w",
  rawFrom: 40,
  rawTo: 32,
});
assert(
  timeoutMoveRes.success === false && timeoutMoveRes.timeout === true,
  "6.4 Move rejected when clock is expired",
);
assert(expiredGame.status === "timeout", "6.5 Game status set to 'timeout'");
assert(expiredGame.result?.winner === "b", "6.6 Opponent ('b') declared winner on timeout");

// Move after game finished rejection
const postFinishRes = validateAndExecuteMove({
  gameState: expiredGame,
  playerColor: "b",
  rawFrom: 16,
  rawTo: 24,
});
assert(
  postFinishRes.success === false && postFinishRes.error.code === "GAME_ALREADY_FINISHED",
  "6.7 Move rejected when game is already finished",
);

// ----------------------------------------------------
// MODULE 7: AFK Policy (2m -> 2m -> 1m -> Loss) & Reset
// ----------------------------------------------------
console.log("\n--- [7] AFK Window & Strike Reset Semantics ---");
assert(getAfkWindowMs(0) === 120_000, "7.1 AFK #1 window is 120,000ms (2 minutes)");
assert(getAfkWindowMs(1) === 120_000, "7.2 AFK #2 window is 120,000ms (2 minutes)");
assert(getAfkWindowMs(2) === 60_000, "7.3 AFK #3 window is 60,000ms (1 minute)");

const afkResetGame = createInitialGameState("folk", { type: "standard", initialSeconds: 3600 });
afkResetGame.afkStrikes = { w: 2, b: 1 };
const timelyMove = validateAndExecuteMove({
  gameState: afkResetGame,
  playerColor: "w",
  rawFrom: 40,
  rawTo: 32,
});
assert(timelyMove.success === true, "7.4 Timely move executed");
assert(
  afkResetGame.afkStrikes.w === 0,
  "7.5 Active player's AFK strikes reset to 0 upon successful move",
);
assert(afkResetGame.afkStrikes.b === 1, "7.6 Opponent strikes untouched");

// Blitz 5m exclusion
const blitzGame = createInitialGameState("international", { type: "blitz", initialSeconds: 300 });
assert(blitzGame.afkEnabled === false, "7.7 International Blitz 5m has afkEnabled=false");

// ----------------------------------------------------
// MODULE 8: RoomManager handleMove, Resign & Disconnect
// ----------------------------------------------------
console.log("\n--- [8] RoomManager Lifecycle (Move, Resign, Disconnect) ---");
const liveRoomManager = new RoomManager();
const p1Socket = "sock_p1";
const p2Socket = "sock_p2";
const activeRoom = liveRoomManager.createPrivateRoom(p1Socket, "Alice", "folk");
liveRoomManager.joinPrivateRoom(activeRoom.pin!, p2Socket, "Bob");

// Move via handleMove
const rmMoveRes = liveRoomManager.handleMove(p1Socket, 40, 32);
assert(rmMoveRes.success === true, "8.1 RoomManager.handleMove executes valid move");
assert(activeRoom.gameState?.turn === "b", "8.2 Turn updated in room gameState");

// Resignation
const resignRes = liveRoomManager.handleResign(p2Socket);
assert(resignRes.success === true, "8.3 Player resignation handled successfully");
if (resignRes.success) {
  assert(resignRes.winnerColor === "w", "8.4 Non-resigning player declared winner");
  assert(resignRes.resignedColor === "b", "8.5 Resigning player identified accurately");
}
assert(activeRoom.status === "finished", "8.6 Room status changed to 'finished'");

// Disconnect handling in waiting room
const waitRoom = liveRoomManager.createPrivateRoom("sock_temp_host", "TempHost");
const waitDisconnectRes = liveRoomManager.handleDisconnect("sock_temp_host");
assert(
  waitDisconnectRes?.type === "waiting_room_closed",
  "8.7 Disconnecting in waiting room closes room cleanly",
);

// ----------------------------------------------------
// MODULE 9: Matchmaking Room Creation & Mode Isolation
// ----------------------------------------------------
console.log("\n--- [9] Matchmaking Room Creation ---");
const mmFolkRoom = liveRoomManager.createMatchmakingRoom(
  { socketId: "mm_1", name: "MM_Alice", joinedAt: Date.now() },
  { socketId: "mm_2", name: "MM_Bob", joinedAt: Date.now() },
  "folk",
);
assert(
  mmFolkRoom.rulesetId === "folk" && mmFolkRoom.gameState?.afkEnabled === true,
  "9.1 Matchmaking Folk room created with AFK enabled",
);

const mmBlitzRoom = liveRoomManager.createMatchmakingRoom(
  { socketId: "mm_3", name: "MM_Charlie", joinedAt: Date.now() },
  { socketId: "mm_4", name: "MM_Dave", joinedAt: Date.now() },
  "international",
  { type: "blitz", initialSeconds: 300 },
);
assert(
  mmBlitzRoom.rulesetId === "international" &&
    mmBlitzRoom.gameState?.afkEnabled === false &&
    mmBlitzRoom.gameState?.clocks.w === 300_000,
  "9.2 Matchmaking Blitz room created with 300s clock and AFK disabled",
);

// ----------------------------------------------------
// MODULE 10: Draw Offer, Accept & Decline Flow
// ----------------------------------------------------
console.log("\n--- [10] Draw Offer, Accept & Decline Flow ---");
const drawRoomManager = new RoomManager();
const d1 = "sock_draw_1";
const d2 = "sock_draw_2";
const drawRoom = drawRoomManager.createPrivateRoom(d1, "DrawAlice", "folk");
drawRoomManager.joinPrivateRoom(drawRoom.pin!, d2, "DrawBob");

// Alice offers draw
const offer1 = drawRoomManager.handleDrawOffer(d1);
assert(offer1.success === true && offer1.offererColor === "w", "10.1 White player offers draw");
assert(drawRoom.drawOfferedBy === "w", "10.2 Room records drawOfferedBy: 'w'");

// Alice offering again (while already offered)
const offerAgain = drawRoomManager.handleDrawOffer(d1);
assert(offerAgain.success === true, "10.3 Idempotent draw offer");

// Bob declines draw
const decline1 = drawRoomManager.handleDrawDecline(d2);
assert(decline1.success === true, "10.4 Black player declines draw");
assert(drawRoom.drawOfferedBy === null, "10.5 Room resets drawOfferedBy to null");

// Bob offers draw and Alice accepts
const offer2 = drawRoomManager.handleDrawOffer(d2);
assert(offer2.success === true && offer2.offererColor === "b", "10.6 Black offers draw");
const acceptRes = drawRoomManager.handleDrawAccept(d1);
assert(acceptRes.success === true, "10.7 White accepts draw");
assert(drawRoom.status === "finished", "10.8 Room status set to 'finished'");
assert(drawRoom.gameState?.winner === "draw", "10.9 Winner is set to 'draw'");
assert(drawRoom.gameState?.reason === "draw_agreement", "10.10 End reason is 'draw_agreement'");

// ----------------------------------------------------
// MODULE 11: Rematch Flow (Offer, Decline, and Accept with Color Swap)
// ----------------------------------------------------
console.log("\n--- [11] Rematch Flow & Color Swapping ---");
const rematchRoomManager = new RoomManager();
const r1 = "sock_r1";
const r2 = "sock_r2";
const rRoom = rematchRoomManager.createPrivateRoom(r1, "RematchAlice", "folk");
rematchRoomManager.joinPrivateRoom(rRoom.pin!, r2, "RematchBob");

// Resign to finish game
rematchRoomManager.handleResign(r2);
assert(rRoom.status === "finished", "11.1 Game finished via resignation");

// Alice requests rematch
const dummyTimeout = () => {};
const remReq1 = rematchRoomManager.handleRematchRequest(r1, dummyTimeout);
assert(remReq1.type === "rematch_offered", "11.2 Alice requests rematch (type: rematch_offered)");
assert(rRoom.rematchRequestedBy?.has("w") === true, "11.3 Room tracks rematchRequestedBy: 'w'");

// Bob declines rematch
const remDec = rematchRoomManager.handleRematchDecline(r2);
assert(remDec.success === true, "11.4 Bob declines rematch");
assert(
  rRoom.rematchRequestedBy === null || rRoom.rematchRequestedBy.size === 0,
  "11.5 Room clears rematchRequestedBy",
);

// Bob requests rematch and Alice accepts
const remReq2 = rematchRoomManager.handleRematchRequest(r2, dummyTimeout);
assert(remReq2.type === "rematch_offered", "11.6 Bob requests rematch");
const remAccept = rematchRoomManager.handleRematchRequest(r1, dummyTimeout);
assert(remAccept.type === "rematch_started", "11.7 Alice accepts rematch (type: rematch_started)");
assert(rRoom.status === "playing", "11.8 Room status reset to 'playing'");
assert(rRoom.players.w?.name === "RematchBob", "11.9 White seat is now RematchBob (swapped)");
assert(rRoom.players.b?.name === "RematchAlice", "11.10 Black seat is now RematchAlice (swapped)");
assert(
  rRoom.gameState?.moveCount === 0 && rRoom.gameState?.turn === "w",
  "11.11 Fresh game state initialized",
);
rematchRoomManager.clearRoomTimer(rRoom);
drawRoomManager.clearRoomTimer(drawRoom);
liveRoomManager.clearRoomTimer(activeRoom);
liveRoomManager.clearRoomTimer(mmFolkRoom);
liveRoomManager.clearRoomTimer(mmBlitzRoom);

console.log("\n==================================================");
console.log(`ALL ${passedCount}/${totalCount} CORE UNIT/INTEGRATION TESTS PASSED!`);
console.log("==================================================");
process.exit(0);
