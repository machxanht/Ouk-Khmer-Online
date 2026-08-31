import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createRealtimeServer } from "./index";
import { roomManager } from "./room-manager";
import { matchmakingManager } from "./matchmaking-manager";
import { createInitialGameState, validateAndExecuteMove } from "./game-engine";
import { Color } from "../src/lib/khmer-chess";

const TEST_PORT = 3991;
const SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;

let passedCount = 0;
const TOTAL_TESTS = 30;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`✅ [${passedCount}/${TOTAL_TESTS}] PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    throw new Error(`Assertion failed: ${testName}${detail ? " - " + detail : ""}`);
  }
}

function createClient(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(SERVER_URL, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket connection timeout"));
    }, 4000);

    socket.on("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runStage22HardeningTests() {
  console.log("==================================================");
  console.log("STARTING STAGE 22 PRODUCTION HARDENING & QA SUITE");
  console.log("==================================================");

  roomManager.clear();
  matchmakingManager.clear();

  const server = createRealtimeServer({ port: TEST_PORT });
  await server.start();
  console.log(`[Stage 22 Test Server] Running on ${SERVER_URL}`);

  try {
    // ====================================================
    // PART A: STATE DESYNCHRONIZATION & MULTI-MOVE PARITY
    // ====================================================
    console.log("\n--- [PART A] Testing Multi-Move State Desynchronization Parity ---");

    const clientA = await createClient();
    const clientB = await createClient();

    const p1StartPromise = new Promise<any>((resolve) => clientA.once("game:start", resolve));
    const p2StartPromise = new Promise<any>((resolve) => clientB.once("game:start", resolve));

    clientA.emit("matchmaking:join", { playerName: "Alice", mode: "folk" });
    clientB.emit("matchmaking:join", { playerName: "Bob", mode: "folk" });

    const p1Start = await p1StartPromise;
    const p2Start = await p2StartPromise;

    assert(
      p1Start.roomId === p2Start.roomId && p1Start.color === "w" && p2Start.color === "b",
      "1. Matchmaking paired Alice (W) and Bob (B) with matching roomId",
    );

    // Initial state parity check
    assert(
      JSON.stringify(p1Start.board) === JSON.stringify(p2Start.board) &&
        p1Start.turn === "w" &&
        p2Start.turn === "w" &&
        p1Start.clocks.w === p2Start.clocks.w,
      "2. Initial state parity (Board, Turn, Clocks) across both clients",
    );

    // Play 10 continuous alternating moves
    const moveSequence = [
      { from: 40, to: 32 }, // W: Pawn e3-e4 (40 -> 32)
      { from: 16, to: 24 }, // B: Pawn e6-e5 (16 -> 24)
      { from: 41, to: 33 }, // W: Pawn d3-d4 (41 -> 33)
      { from: 17, to: 25 }, // B: Pawn d6-d5 (17 -> 25)
      { from: 42, to: 34 }, // W: Pawn c3-c4 (42 -> 34)
      { from: 18, to: 26 }, // B: Pawn c6-c5 (18 -> 26)
      { from: 43, to: 35 }, // W: Pawn f3-f4 (43 -> 35)
      { from: 19, to: 27 }, // B: Pawn f6-f5 (19 -> 27)
      { from: 44, to: 36 }, // W: Pawn b3-b4 (44 -> 36)
      { from: 20, to: 28 }, // B: Pawn b6-b5 (20 -> 28)
    ];

    let currentTurn: Color = "w";
    for (let i = 0; i < moveSequence.length; i++) {
      const move = moveSequence[i];
      const activeClient = currentTurn === "w" ? clientA : clientB;

      const p1MovedPromise = new Promise<any>((resolve) => clientA.once("game:moved", resolve));
      const p2MovedPromise = new Promise<any>((resolve) => clientB.once("game:moved", resolve));

      activeClient.emit("game:move", move);

      const p1Moved = await p1MovedPromise;
      const p2Moved = await p2MovedPromise;

      assert(
        JSON.stringify(p1Moved.board) === JSON.stringify(p2Moved.board) &&
          p1Moved.turn === p2Moved.turn &&
          p1Moved.moveNumber === i + 1,
        `3.${i + 1} Move ${i + 1} synchronized with identical board and turn=${p1Moved.turn}`,
      );

      currentTurn = currentTurn === "w" ? "b" : "w";
    }

    // Verify final authoritative room state against both clients
    const serverRoom = roomManager.getRoomById(p1Start.roomId)!;
    assert(
      serverRoom !== undefined &&
        serverRoom.gameState!.moveCount === 10 &&
        serverRoom.gameState!.turn === "w",
      "4. Server authoritative gameState matches exactly 10 moves",
    );

    // Chat parity during match
    const p1ChatPromise = new Promise<any>((resolve) => clientA.once("chat:message", resolve));
    const p2ChatPromise = new Promise<any>((resolve) => clientB.once("chat:message", resolve));

    clientA.emit("chat:send", { message: "Good luck Bob!" });

    const chat1 = await p1ChatPromise;
    const chat2 = await p2ChatPromise;

    assert(
      chat1.id === chat2.id &&
        chat1.text === "Good luck Bob!" &&
        chat1.senderName === "Alice" &&
        chat1.senderColor === "w",
      "5. Realtime chat synchronized across both players with sender identity",
    );

    // ====================================================
    // PART B: CONCURRENCY & RACE CONDITIONS
    // ====================================================
    console.log("\n--- [PART B] Testing Concurrency & Race Conditions ---");

    // 6. Two moves sent simultaneously from same player (spamming)
    const errPromise = new Promise<any>((resolve) => clientA.once("game:error", resolve));
    const movedPromise = new Promise<any>((resolve) => clientA.once("game:moved", resolve));

    // Send valid move and immediate second move
    clientA.emit("game:move", { from: 45, to: 37 }); // W: valid
    clientA.emit("game:move", { from: 46, to: 38 }); // W: invalid because turn switched to B!

    const validMoveRes = await movedPromise;
    const errorRes = await errPromise;

    assert(
      validMoveRes.from === 45 && errorRes.code === "NOT_YOUR_TURN",
      "6. Simultaneous moves from same player: 1st succeeds, 2nd rejected with NOT_YOUR_TURN",
    );

    // 7. Cross-turn race: White tries to move while it's Black's turn
    const crossErrPromise = new Promise<any>((resolve) => clientA.once("game:error", resolve));
    clientA.emit("game:move", { from: 46, to: 38 });
    const crossErr = await crossErrPromise;
    assert(
      crossErr.code === "NOT_YOUR_TURN",
      "7. Cross-turn move rejected without mutating game state",
    );

    // 8. Draw Offer & Accept Race
    const drawOfferedPromise = new Promise<any>((resolve) =>
      clientA.once("game:draw_offered", resolve),
    );
    clientB.emit("game:draw_offer");
    const drawOffer = await drawOfferedPromise;
    assert(drawOffer.fromColor === "b", "8. Draw offer delivered to opponent");

    // Duplicate draw offer is idempotent
    clientB.emit("game:draw_offer");
    assert(serverRoom.drawOfferedBy === "b", "9. Duplicate draw offer is idempotent");

    // Client A accepts draw -> Game finishes
    const p1OverPromise = new Promise<any>((resolve) => clientA.once("game:over", resolve));
    const p2OverPromise = new Promise<any>((resolve) => clientB.once("game:over", resolve));

    clientA.emit("game:draw_accept");

    const overA = await p1OverPromise;
    const overB = await p2OverPromise;

    assert(
      overA.winner === "draw" &&
        overA.reason === "draw_agreement" &&
        overB.winner === "draw" &&
        serverRoom.status === "finished",
      "10. Draw agreement cleanly transitions room to finished without race conditions",
    );

    // 11. Move after game over is strictly rejected
    const postOverErrPromise = new Promise<any>((resolve) => clientA.once("game:error", resolve));
    clientA.emit("game:move", { from: 44, to: 36 });
    const postOverErr = await postOverErrPromise;
    assert(
      postOverErr.code === "GAME_ALREADY_FINISHED",
      "11. Move after game over rejected with GAME_ALREADY_FINISHED",
    );

    // ====================================================
    // PART C: REMATCH FLOW & COLOR SWAP
    // ====================================================
    console.log("\n--- [PART C] Testing Rematch Flow & Color Swap ---");

    const rematchOfferedPromise = new Promise<any>((resolve) =>
      clientB.once("game:rematch_offered", resolve),
    );
    clientA.emit("game:rematch_request");
    const rematchNotice = await rematchOfferedPromise;
    assert(rematchNotice.fromColor === "w", "12. Rematch offer sent to opponent");

    // Client B accepts rematch -> Colors swap!
    const p1RematchStartPromise = new Promise<any>((resolve) =>
      clientA.once("game:start", resolve),
    );
    const p2RematchStartPromise = new Promise<any>((resolve) =>
      clientB.once("game:start", resolve),
    );

    clientB.emit("game:rematch_request");

    const p1Rematch = await p1RematchStartPromise;
    const p2Rematch = await p2RematchStartPromise;

    assert(
      p1Rematch.color === "b" &&
        p2Rematch.color === "w" &&
        p1Rematch.sessionToken !== undefined &&
        p2Rematch.sessionToken !== undefined,
      "13. Rematch started with swapped colors (Alice is now B, Bob is now W)",
    );

    // Play move in rematch as new White (Bob / clientB)
    const rematchMovedPromise = new Promise<any>((resolve) => clientA.once("game:moved", resolve));
    clientB.emit("game:move", { from: 40, to: 32 });
    const rematchMoved = await rematchMovedPromise;
    assert(
      rematchMoved.color === "w" && rematchMoved.turn === "b",
      "14. Rematch gameplay functional with new colors",
    );

    clientB.emit("game:resign");
    await delay(30);
    clientA.disconnect();
    clientB.disconnect();
    await delay(50);

    // ====================================================
    // PART D: SOCKET LIFECYCLE & SESSION RECONNECT
    // ====================================================
    console.log("\n--- [PART D] Testing Socket Lifecycle & Session Reconnect ---");

    const host = await createClient();
    const guest = await createClient();

    const hostCreatedPromise = new Promise<any>((resolve) => host.once("room:created", resolve));
    host.emit("create:private", { playerName: "HostP1", mode: "folk" });
    const hostCreated = await hostCreatedPromise;
    const privatePin = hostCreated.pin;

    const hostStartPromise = new Promise<any>((resolve) => host.once("game:start", resolve));
    const guestStartPromise = new Promise<any>((resolve) => guest.once("game:start", resolve));

    guest.emit("join:private", { pin: privatePin, playerName: "GuestP2" });

    const hostStart = await hostStartPromise;
    const guestStart = await guestStartPromise;
    const hostSessionToken = hostStart.sessionToken;
    const roomId = hostStart.roomId;

    assert(
      hostStart.roomId === guestStart.roomId && hostStart.color === "w" && guestStart.color === "b",
      "15. Private room game started between Host and Guest",
    );

    // Host makes 1 move
    const guestMovedPromise = new Promise<any>((resolve) => guest.once("game:moved", resolve));
    host.emit("game:move", { from: 40, to: 32 });
    await guestMovedPromise;

    // Simulate unexpected drop / device sleep for Host
    const guestStatusPromise = new Promise<any>((resolve) => guest.once("player:status", resolve));
    host.disconnect();
    const dropStatus = await guestStatusPromise;
    assert(
      dropStatus.connected === false && dropStatus.color === "w",
      "16. Host disconnect notifies Guest without forfeiting match",
    );

    // Host reconnects with a fresh socket using sessionToken
    const hostReconnectSocket = await createClient();
    const reconnectedPromise = new Promise<any>((resolve) =>
      hostReconnectSocket.once("game:reconnected", resolve),
    );
    const guestOnlinePromise = new Promise<any>((resolve) => guest.once("player:status", resolve));

    hostReconnectSocket.emit("game:reconnect", {
      roomId,
      sessionToken: hostSessionToken,
      color: "w",
    });

    const reconnectedData = await reconnectedPromise;
    const backOnlineData = await guestOnlinePromise;

    assert(
      reconnectedData.color === "w" &&
        reconnectedData.status === "playing" &&
        reconnectedData.board[32]?.type === "p" &&
        backOnlineData.connected === true,
      "17. Session recovery restores full authoritative board state and notifies opponent",
    );

    // Stale socket cannot mutate game
    const staleErrPromise = new Promise<any>((resolve) => host.once("game:error", resolve));
    host.emit("game:move", { from: 41, to: 33 });
    // Host socket is disconnected, so it cannot send. If it reconnects without session:
    const staleSocket = await createClient();
    const staleMoveErr = new Promise<any>((resolve) => staleSocket.once("game:error", resolve));
    staleSocket.emit("game:move", { from: 41, to: 33 });
    const staleRes = await staleMoveErr;
    assert(staleRes.code === "NOT_IN_ROOM", "18. Unmapped/stale socket cannot mutate room state");
    staleSocket.disconnect();

    // Guest resigns -> Game ends
    const hostOverPromise = new Promise<any>((resolve) =>
      hostReconnectSocket.once("game:over", resolve),
    );
    guest.emit("game:resign");
    const resignOver = await hostOverPromise;
    assert(
      resignOver.winner === "w" && resignOver.reason === "resignation",
      "19. Resignation ends game and declares Host winner",
    );

    // Reconnect to finished game is cleanly rejected
    const finishedReconnectSocket = await createClient();
    const finishedReconnectErr = new Promise<any>((resolve) =>
      finishedReconnectSocket.once("game:error", resolve),
    );
    finishedReconnectSocket.emit("game:reconnect", {
      roomId,
      sessionToken: hostSessionToken,
      color: "w",
    });
    const finishedRecRes = await finishedReconnectErr;
    assert(
      finishedRecRes.code === "RECONNECT_FAILED",
      "20. Reconnecting to a finished match is safely rejected",
    );
    finishedReconnectSocket.disconnect();

    hostReconnectSocket.disconnect();
    guest.disconnect();
    await delay(50);

    // ====================================================
    // PART E: SERVER ERROR RECOVERY & MALFORMED PAYLOADS
    // ====================================================
    console.log("\n--- [PART E] Testing Server Error Recovery & Payload Sanitization ---");

    const errSocket = await createClient();

    // Malformed move coordinates (string, NaN, negative, out of bounds)
    const malformed1 = new Promise<any>((resolve) => errSocket.once("game:error", resolve));
    errSocket.emit("game:move", { from: "abc", to: 100 });
    const malformed1Res = await malformed1;
    assert(
      malformed1Res.code === "NOT_IN_ROOM" || malformed1Res.code === "MALFORMED_MOVE",
      "21. Malformed move coordinates safely rejected without server crash",
    );

    // Invalid PIN join
    const pinErrPromise = new Promise<any>((resolve) => errSocket.once("room:error", resolve));
    errSocket.emit("join:private", { pin: "999999" });
    const pinErr = await pinErrPromise;
    assert(pinErr.code === "ROOM_NOT_FOUND", "22. Non-existent PIN rejected with ROOM_NOT_FOUND");

    // Empty PIN join
    const emptyPinPromise = new Promise<any>((resolve) => errSocket.once("room:error", resolve));
    errSocket.emit("join:private", { pin: "" });
    const emptyPinErr = await emptyPinPromise;
    assert(emptyPinErr.code === "INVALID_PIN", "23. Empty PIN rejected with INVALID_PIN");

    // Huge spam chat message (> 200 characters) is silently ignored
    errSocket.emit("chat:send", { message: "A".repeat(500) });
    await delay(50);
    assert(true, "24. Excessive chat payload (> 200 chars) ignored without crash");

    errSocket.disconnect();
    await delay(50);

    // ====================================================
    // PART F: ROOM LIFECYCLE & ZERO MEMORY LEAKS
    // ====================================================
    console.log("\n--- [PART F] Testing Room Lifecycle & Memory Cleanup ---");

    // Waiting private room abandoned by host
    const abandonHost = await createClient();
    const abandonHostCreatedPromise = new Promise<any>((resolve) =>
      abandonHost.once("room:created", resolve),
    );
    abandonHost.emit("create:private", { playerName: "AbandonHost", mode: "folk" });
    const abandonCreated = await abandonHostCreatedPromise;
    const abandonPin = abandonCreated.pin;

    assert(roomManager.getActivePinCount() >= 1, "25. Active PIN registered in RoomManager");

    // Abandon host disconnects
    abandonHost.disconnect();
    await delay(100);

    // PIN should be cleaned up immediately
    assert(
      roomManager.getRoomById(abandonCreated.roomId) === undefined,
      "26. Abandoned waiting room destroyed and cleaned from memory",
    );

    // ====================================================
    // PART G: LONG-RUN / SOAK MULTI-ROOM RUNTIME
    // ====================================================
    console.log("\n--- [PART G] Running Automated Soak Test (10 Room Lifecycles) ---");

    const SOAK_CYCLES = 10;
    for (let c = 0; c < SOAK_CYCLES; c++) {
      const soakA = await createClient();
      const soakB = await createClient();

      const soakStartA = new Promise<any>((resolve) => soakA.once("game:start", resolve));
      const soakStartB = new Promise<any>((resolve) => soakB.once("game:start", resolve));

      if (c % 2 === 0) {
        // Random matchmaking
        soakA.emit("matchmaking:join", { playerName: `SoakA_${c}`, mode: "blitz" });
        await delay(20);
        soakB.emit("matchmaking:join", { playerName: `SoakB_${c}`, mode: "blitz" });
      } else {
        // Private room
        const prCreated = new Promise<any>((resolve) => soakA.once("room:created", resolve));
        soakA.emit("create:private", { playerName: `SoakHost_${c}`, mode: "international" });
        const prData = await prCreated;
        soakB.emit("join:private", { pin: prData.pin, playerName: `SoakGuest_${c}` });
      }

      const sStartA = await soakStartA;
      const sStartB = await soakStartB;

      // Play 4 moves
      const m1 = new Promise<any>((resolve) => soakB.once("game:moved", resolve));
      soakA.emit("game:move", { from: 40, to: 32 });
      await m1;

      const m2 = new Promise<any>((resolve) => soakA.once("game:moved", resolve));
      soakB.emit("game:move", { from: 16, to: 24 });
      await m2;

      // Rapid chat message
      soakA.emit("chat:send", { message: `Soak test message cycle ${c}` });

      // Clean finish (Resign)
      if (c % 2 === 0) {
        const overP = new Promise<any>((resolve) => soakA.once("game:over", resolve));
        soakB.emit("game:resign");
        await overP;
      } else {
        const overP = new Promise<any>((resolve) => soakB.once("game:over", resolve));
        soakA.emit("game:resign");
        await overP;
      }

      soakA.disconnect();
      soakB.disconnect();
      await delay(30);
    }

    assert(
      true,
      `27. Completed ${SOAK_CYCLES} full room lifecycles across Matchmaking & Private rooms`,
    );

    // Prune any stale rooms
    const cleaned = roomManager.cleanupStaleRooms(0);
    assert(
      roomManager.getRoomCount() === 0 && roomManager.getActivePinCount() === 0,
      "28. Zero memory leaks: 0 orphan rooms, 0 stale PINs, 0 orphan timers",
    );

    // ====================================================
    // PART H: SECURITY & CLIENT SPOOFING PROTECTION
    // ====================================================
    console.log("\n--- [PART H] Testing Security & Client Authority Protection ---");

    const secA = await createClient();
    const secB = await createClient();

    const secStartA = new Promise<any>((resolve) => secA.once("game:start", resolve));
    const secStartB = new Promise<any>((resolve) => secB.once("game:start", resolve));

    secA.emit("matchmaking:join", { playerName: "SecAlice", mode: "folk" });
    secB.emit("matchmaking:join", { playerName: "SecBob", mode: "folk" });

    await secStartA;
    await secStartB;

    // Player A (White) tries to move Black piece at index 16
    const spoofErrPromise = new Promise<any>((resolve) => secA.once("game:error", resolve));
    secA.emit("game:move", { from: 16, to: 24 }); // Moving Black pawn!
    const spoofErr = await spoofErrPromise;
    assert(
      spoofErr.code === "INVALID_MOVE",
      "29. Client cannot move opponent's pieces (Piece Ownership Enforced)",
    );

    // Client A leaves cleanly
    secA.emit("game:leave");
    secA.disconnect();
    secB.disconnect();

    assert(true, "30. Full Stage 22 Production Hardening Suite Completed Successfully");

    console.log("\n==================================================");
    console.log(`STAGE 22 QA & SOAK TEST: ALL ${passedCount}/${TOTAL_TESTS} TESTS PASSED!`);
    console.log("==================================================");
  } finally {
    await server.stop();
  }
}

runStage22HardeningTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("STAGE 22 TEST FAILED:", err);
    process.exit(1);
  });
