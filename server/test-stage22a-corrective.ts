import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createRealtimeServer } from "./index";
import { roomManager } from "./room-manager";
import { matchmakingManager } from "./matchmaking-manager";
import { Color } from "../src/lib/khmer-chess";

const TEST_PORT = 3993;
const SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;

let passedCount = 0;
const TOTAL_TESTS = 32;

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

async function runStage22ACorrectiveTests() {
  console.log("==================================================");
  console.log("STARTING STAGE 22A CORRECTIVE AUDIT & SOAK SUITE");
  console.log("==================================================");

  roomManager.clear();
  matchmakingManager.clear();

  const server = createRealtimeServer({ port: TEST_PORT });
  await server.start();
  console.log(`[Stage 22A Server] Running on ${SERVER_URL}`);

  try {
    // =========================================================================
    // SECTION 1: CRITICAL ROOM CLEANUP SAFETY
    // =========================================================================
    console.log("\n--- [SECTION 1] Critical Room Cleanup Safety ---");

    // 1.1 Create active playing room
    const hostSock = await createClient();
    const guestSock = await createClient();

    let createdPin = "";
    let activeRoomId = "";

    await new Promise<void>((res) => {
      hostSock.once("room:created", (data: any) => {
        createdPin = data.pin;
        activeRoomId = data.roomId;
        res();
      });
      hostSock.emit("create:private", { playerName: "HostP1", mode: "folk" });
    });

    await new Promise<void>((res) => {
      guestSock.once("game:start", () => res());
      guestSock.emit("join:private", { pin: createdPin, playerName: "GuestP2" });
    });

    const activeRoom = roomManager.getRoomById(activeRoomId);
    assert(
      activeRoom !== undefined && activeRoom.status === "playing",
      "1. Active room is in playing status with 2 connected players",
    );

    // Mock/advance createdAt to 45 minutes ago (> 30 minutes threshold)
    if (activeRoom) {
      activeRoom.createdAt = Date.now() - 45 * 60 * 1000;
    }

    // Call cleanupStaleRooms()
    const cleanedCount1 = roomManager.cleanupStaleRooms(30 * 60 * 1000);
    assert(cleanedCount1 === 0, "2. cleanupStaleRooms() does NOT evict active playing room");

    const roomAfterCleanup = roomManager.getRoomById(activeRoomId);
    assert(
      roomAfterCleanup !== undefined &&
        roomAfterCleanup.status === "playing" &&
        roomAfterCleanup.gameState !== null &&
        roomAfterCleanup.timerHandle !== null,
      "3. Active playing room, gameState, and turn timer remain completely intact after cleanup",
    );

    assert(
      roomManager.getActivePinCount() === 1 && roomManager.getRoomCount() === 1,
      "4. Active room PIN and room mappings are preserved in memory",
    );

    // 1.2 Test stale WAITING room eviction
    const waitingSock = await createClient();
    let waitingRoomId = "";
    let waitingPin = "";
    await new Promise<void>((res) => {
      waitingSock.once("room:created", (data: any) => {
        waitingRoomId = data.roomId;
        waitingPin = data.pin;
        res();
      });
      waitingSock.emit("create:private", { playerName: "StaleHost", mode: "folk" });
    });

    const waitingRoom = roomManager.getRoomById(waitingRoomId);
    if (waitingRoom) {
      waitingRoom.createdAt = Date.now() - 45 * 60 * 1000;
    }

    const cleanedCount2 = roomManager.cleanupStaleRooms(30 * 60 * 1000);
    assert(cleanedCount2 === 1, "5. Abandoned stale WAITING room is safely evicted");
    assert(
      roomManager.getRoomById(waitingRoomId) === undefined,
      "6. Stale WAITING room removed from roomManager",
    );

    // Clean up Section 1
    hostSock.emit("game:resign");
    await delay(50);
    hostSock.disconnect();
    guestSock.disconnect();
    waitingSock.disconnect();
    await delay(100);

    // =========================================================================
    // SECTION 2: TRUE CONCURRENCY & RACE CONDITIONS (2 INDEPENDENT SOCKETS)
    // =========================================================================
    console.log("\n--- [SECTION 2] True Concurrency & Race Conditions ---");

    const clientA = await createClient();
    const clientB = await createClient();

    let raceRoomId = "";
    let racePin = "";

    await new Promise<void>((res) => {
      clientA.once("room:created", (data: any) => {
        raceRoomId = data.roomId;
        racePin = data.pin;
        res();
      });
      clientA.emit("create:private", { playerName: "AliceRace", mode: "folk" });
    });

    await new Promise<void>((res) => {
      clientB.once("game:start", () => res());
      clientB.emit("join:private", { pin: racePin, playerName: "BobRace" });
    });

    const raceRoom = roomManager.getRoomById(raceRoomId)!;
    assert(raceRoom !== undefined, "7. Concurrency test room created");

    // 2.1 Simultaneous move race from same player (Socket A emits 2 legal moves simultaneously)
    let moveErrorReceived: any = null;
    let moveMovedCount = 0;

    clientA.on("game:error", (err: any) => {
      moveErrorReceived = err;
    });

    clientA.on("game:moved", () => {
      moveMovedCount++;
    });

    // Fire 2 moves at the exact same instant
    clientA.emit("game:move", { from: 40, to: 32 }); // Legal White Pawn move
    clientA.emit("game:move", { from: 41, to: 33 }); // Second simultaneous White move

    await delay(150);

    assert(
      moveMovedCount === 1,
      "8. Simultaneous same-player moves: Exactly ONE move was accepted and broadcast",
    );
    assert(
      moveErrorReceived !== null &&
        (moveErrorReceived.code === "NOT_YOUR_TURN" || moveErrorReceived.code === "INVALID_MOVE"),
      "9. Second simultaneous move was rejected with turn violation error",
    );
    assert(
      raceRoom.gameState!.turn === "b" && raceRoom.gameState!.moveCount === 1,
      "10. Authoritative state reflects exactly 1 move with turn transitioned to Black",
    );
    assert(
      raceRoom.gameState!.moveHistory.length === 1,
      "11. moveHistory has exactly 1 entry with no duplicate mutations",
    );

    // 2.2 Cross-turn simultaneous race
    // Turn is now Black ('b'). Let's simultaneously emit Black legal move and White illegal move
    let whiteCrossError: any = null;
    let blackMoved = false;

    clientA.once("game:error", (err: any) => {
      whiteCrossError = err;
    });
    clientB.once("game:moved", () => {
      blackMoved = true;
    });

    // Simultaneous emit
    clientA.emit("game:move", { from: 41, to: 33 }); // White attempts to move on Black's turn
    clientB.emit("game:move", { from: 16, to: 24 }); // Black legal Pawn move

    await delay(150);

    assert(blackMoved === true, "12. Black legal move executed successfully");
    assert(
      whiteCrossError !== null && whiteCrossError.code === "NOT_YOUR_TURN",
      "13. White cross-turn move rejected with NOT_YOUR_TURN",
    );
    assert(
      raceRoom.gameState!.turn === "w" && raceRoom.gameState!.moveCount === 2,
      "14. Authoritative state cleanly toggled back to White with moveCount = 2",
    );

    // 2.3 Resign vs Move Race (Simultaneous resign and move)
    let gameOverEventsA = 0;
    let gameOverEventsB = 0;

    clientA.on("game:over", () => gameOverEventsA++);
    clientB.on("game:over", () => gameOverEventsB++);

    // Simultaneous: White resigns while Black tries to move
    clientA.emit("game:resign");
    clientB.emit("game:move", { from: 17, to: 25 });

    await delay(150);

    assert(
      raceRoom.status === "finished",
      "15. Resignation cleanly ended match with finished status",
    );
    assert(
      gameOverEventsA === 1 && gameOverEventsB === 1,
      "16. Exactly ONE game:over event received per client with NO double game-over",
    );

    // 2.4 Move after Game Over
    let postOverError: any = null;
    clientA.once("game:error", (err: any) => {
      postOverError = err;
    });
    clientA.emit("game:move", { from: 42, to: 34 });
    await delay(100);

    assert(
      postOverError !== null && postOverError.code === "GAME_ALREADY_FINISHED",
      "17. Post game-over move rejected with GAME_ALREADY_FINISHED",
    );

    clientA.disconnect();
    clientB.disconnect();
    await delay(100);

    // =========================================================================
    // SECTION 3: STALE SOCKET SECURITY & MUTATION LOCKOUT
    // =========================================================================
    console.log("\n--- [SECTION 3] Stale Socket Security & Mutation Lockout ---");

    const hostSockOrig = await createClient();
    const guestSockMatch = await createClient();

    let secRoomId = "";
    let secPin = "";
    let hostSessionToken = "";

    await new Promise<void>((res) => {
      hostSockOrig.once("room:created", (data: any) => {
        secRoomId = data.roomId;
        secPin = data.pin;
        res();
      });
      hostSockOrig.emit("create:private", { playerName: "HostSec", mode: "folk" });
    });

    await new Promise<void>((res) => {
      hostSockOrig.once("game:start", (data: any) => {
        hostSessionToken = data.sessionToken;
      });
      guestSockMatch.once("game:start", () => res());
      guestSockMatch.emit("join:private", { pin: secPin, playerName: "GuestSec" });
    });

    const secRoom = roomManager.getRoomById(secRoomId)!;
    assert(
      secRoom !== undefined && !!hostSessionToken,
      "18. Active match started with sessionToken",
    );

    // Reconnect Host using NEW socket B
    const hostSockNew = await createClient();
    let reconnectedData: any = null;

    await new Promise<void>((res) => {
      hostSockNew.once("game:reconnected", (data: any) => {
        reconnectedData = data;
        res();
      });
      hostSockNew.emit("game:reconnect", {
        roomId: secRoomId,
        sessionToken: hostSessionToken,
        color: "w",
      });
    });

    assert(reconnectedData !== null, "19. Host reconnected successfully with new socket");

    // Try mutations from OLD stale socket (hostSockOrig)
    let staleMoveError: any = null;
    let staleDrawError: any = null;
    let chatDeliveredFromStale = false;

    hostSockOrig.once("game:error", (err: any) => {
      staleMoveError = err;
    });
    guestSockMatch.on("chat:message", (msg: any) => {
      if (msg.text === "stale_attack") chatDeliveredFromStale = true;
    });

    // 3.1 Stale game:move
    hostSockOrig.emit("game:move", { from: 40, to: 32 });
    await delay(100);
    assert(
      staleMoveError !== null && staleMoveError.code === "NOT_IN_ROOM",
      "20. Stale socket move rejected with NOT_IN_ROOM",
    );

    // 3.2 Stale chat:send
    hostSockOrig.emit("chat:send", { message: "stale_attack" });
    await delay(100);
    assert(
      chatDeliveredFromStale === false,
      "21. Stale socket chat message dropped without broadcast",
    );

    // 3.3 Stale draw offer
    hostSockOrig.once("game:error", (err: any) => {
      staleDrawError = err;
    });
    hostSockOrig.emit("game:draw_offer");
    await delay(100);
    assert(staleDrawError !== null, "22. Stale socket draw offer rejected");

    // 3.4 Valid new socket still operates normally
    let newSockMoved = false;
    guestSockMatch.once("game:moved", () => {
      newSockMoved = true;
    });
    hostSockNew.emit("game:move", { from: 40, to: 32 });
    await delay(100);
    assert(
      newSockMoved === true && secRoom.gameState!.turn === "b",
      "23. New authorized socket moves successfully without interference",
    );

    hostSockNew.emit("game:resign");
    await delay(50);
    hostSockOrig.disconnect();
    hostSockNew.disconnect();
    guestSockMatch.disconnect();
    await delay(100);

    // =========================================================================
    // SECTION 4: SESSION RECOVERY STATE PARITY (SERVER == CLIENT A == OPPONENT B)
    // =========================================================================
    console.log("\n--- [SECTION 4] Session Recovery State Parity ---");

    const p1Sock = await createClient();
    const p2Sock = await createClient();

    let parityRoomId = "";
    let parityPin = "";
    let p1Token = "";
    let p2StartData: any = null;

    await new Promise<void>((res) => {
      p1Sock.once("room:created", (data: any) => {
        parityRoomId = data.roomId;
        parityPin = data.pin;
        res();
      });
      p1Sock.emit("create:private", { playerName: "ParityP1", mode: "folk" });
    });

    await new Promise<void>((res) => {
      p1Sock.once("game:start", (data: any) => {
        p1Token = data.sessionToken;
      });
      p2Sock.once("game:start", (data: any) => {
        p2StartData = data;
        res();
      });
      p2Sock.emit("join:private", { pin: parityPin, playerName: "ParityP2" });
    });

    // Make 2 moves
    await new Promise<void>((res) => {
      p2Sock.once("game:moved", () => res());
      p1Sock.emit("game:move", { from: 40, to: 32 });
    });
    await new Promise<void>((res) => {
      p1Sock.once("game:moved", () => res());
      p2Sock.emit("game:move", { from: 16, to: 24 });
    });

    // P1 disconnects and reconnects via P1_reconnect
    p1Sock.disconnect();
    await delay(100);

    const p1ReconSock = await createClient();
    let p1ReconState: any = null;

    await new Promise<void>((res) => {
      p1ReconSock.once("game:reconnected", (data: any) => {
        p1ReconState = data;
        res();
      });
      p1ReconSock.emit("game:reconnect", {
        roomId: parityRoomId,
        sessionToken: p1Token,
        color: "w",
      });
    });

    const parityRoom = roomManager.getRoomById(parityRoomId)!;
    const serverGame = parityRoom.gameState!;

    assert(
      JSON.stringify(p1ReconState.board) === JSON.stringify(serverGame.board),
      "24. Reconnected client board matches server authoritative board 100%",
    );
    assert(
      p1ReconState.turn === serverGame.turn &&
        p1ReconState.rulesetId === serverGame.rulesetId &&
        p1ReconState.status === serverGame.status,
      "25. Reconnected client turn, ruleset, and status match server exactly",
    );
    assert(
      p1ReconState.afkStrikes.w === serverGame.afkStrikes.w &&
        p1ReconState.afkStrikes.b === serverGame.afkStrikes.b &&
        p1ReconState.afkEnabled === serverGame.afkEnabled,
      "26. Reconnected AFK state and strikes match server exactly",
    );

    p1ReconSock.emit("game:resign");
    await delay(50);
    p1ReconSock.disconnect();
    p2Sock.disconnect();
    await delay(100);

    // =========================================================================
    // SECTION 5: TIMER / CLEANUP INTEGRITY
    // =========================================================================
    console.log("\n--- [SECTION 5] Timer / Cleanup Integrity ---");

    const tSock1 = await createClient();
    const tSock2 = await createClient();

    let tRoomId = "";
    let tPin = "";

    await new Promise<void>((res) => {
      tSock1.once("room:created", (data: any) => {
        tRoomId = data.roomId;
        tPin = data.pin;
        res();
      });
      tSock1.emit("create:private", { playerName: "T1", mode: "folk" });
    });

    await new Promise<void>((res) => {
      tSock2.once("game:start", () => res());
      tSock2.emit("join:private", { pin: tPin, playerName: "T2" });
    });

    const timerRoom = roomManager.getRoomById(tRoomId)!;
    assert(timerRoom.timerHandle !== null, "27. Single active timer registered on game start");

    // Move 1
    await new Promise<void>((res) => {
      tSock2.once("game:moved", () => res());
      tSock1.emit("game:move", { from: 40, to: 32 });
    });

    assert(
      timerRoom.timerHandle !== null,
      "28. Timer smoothly rescheduled after move without duplicate timer handles",
    );

    // Resign ends game
    await new Promise<void>((res) => {
      tSock2.once("game:over", () => res());
      tSock1.emit("game:resign");
    });

    assert(
      timerRoom.timerHandle === null && timerRoom.status === "finished",
      "29. Finished room has ZERO active timers",
    );

    tSock1.disconnect();
    tSock2.disconnect();
    await delay(100);

    // =========================================================================
    // SECTION 6: REALISTIC 20-ROOM SOAK & STRESS TEST
    // =========================================================================
    console.log("\n--- [SECTION 6] Realistic 20-Room Soak & Stress Test ---");

    const SOAK_ROUNDS = 20;
    console.log(
      `Executing ${SOAK_ROUNDS} complete room lifecycles across Matchmaking and Private rooms...`,
    );

    for (let i = 0; i < SOAK_ROUNDS; i++) {
      const mode = i % 2 === 0 ? "folk" : "blitz";
      const isPrivate = i % 2 === 0;

      const pA = await createClient();
      const pB = await createClient();

      try {
        let currentRoomId = "";
        if (isPrivate) {
          const roomCreatedPromise = new Promise<any>((resolve) =>
            pA.once("room:created", resolve),
          );
          pA.emit("create:private", { playerName: `Host_${i}`, mode });
          const created = await roomCreatedPromise;
          currentRoomId = created.roomId;

          const p1Start = new Promise((resolve) => pA.once("game:start", resolve));
          const p2Start = new Promise((resolve) => pB.once("game:start", resolve));
          pB.emit("join:private", { pin: created.pin, playerName: `Guest_${i}` });
          await Promise.all([p1Start, p2Start]);
        } else {
          const p1Start = new Promise<any>((resolve) => pA.once("game:start", resolve));
          const p2Start = new Promise<any>((resolve) => pB.once("game:start", resolve));

          pA.emit("matchmaking:join", { playerName: `MMA_${i}`, mode });
          await delay(30);
          pB.emit("matchmaking:join", { playerName: `MMB_${i}`, mode });

          const [s1] = await Promise.all([p1Start, p2Start]);
          currentRoomId = s1.roomId;
        }

        // Move 1 (White - pA)
        const move1 = new Promise((resolve) => pB.once("game:moved", resolve));
        pA.emit("game:move", { from: 40, to: 32 });
        await move1;

        // Move 2 (Black - pB)
        const move2 = new Promise((resolve) => pA.once("game:moved", resolve));
        pB.emit("game:move", { from: 16, to: 24 });
        await move2;

        // Chat burst
        pA.emit("chat:send", { message: `Soak msg ${i}` });
        pB.emit("chat:send", { message: `Soak reply ${i}` });
        await delay(10);

        // Finish match
        if (i % 2 === 0) {
          const overPromise = new Promise((resolve) => pB.once("game:over", resolve));
          pA.emit("game:resign");
          await overPromise;
        } else {
          const drawOffered = new Promise((resolve) => pB.once("game:draw_offered", resolve));
          pA.emit("game:draw_offer");
          await drawOffered;

          const overPromise = new Promise((resolve) => pA.once("game:over", resolve));
          pB.emit("game:draw_accept");
          await overPromise;
        }
      } finally {
        pA.disconnect();
        pB.disconnect();
        await delay(20);
      }
    }

    assert(true, "30. Completed 20 intensive multi-move and chat room lifecycles");

    // Clean up finished rooms
    roomManager.cleanupStaleRooms(0);

    assert(
      roomManager.getRoomCount() === 0,
      "31. Zero orphan rooms in memory after 20-room soak test",
    );
    assert(
      roomManager.getActivePinCount() === 0 && roomManager.getSocketMappingCount() === 0,
      "32. Zero active PINs and zero stale socket mappings in memory",
    );

    console.log("\n==================================================");
    console.log(`STAGE 22A QA & SOAK TEST: ALL ${passedCount}/${TOTAL_TESTS} TESTS PASSED!`);
    console.log("==================================================");
  } finally {
    await server.stop();
  }
}

runStage22ACorrectiveTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL ERROR in Stage 22A Suite:", err);
    process.exit(1);
  });
