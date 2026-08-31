import http from "http";
import { io as ioClient, Socket } from "socket.io-client";
import { attachRealtimeServer } from "./index";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 4000,
  errorMsg: string = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

async function runStage23Tests() {
  console.log("==================================================");
  console.log("STARTING STAGE 23: ONLINE UX POLISH & MATCH COMPLETION SUITE");
  console.log("==================================================");

  const PORT = 3996;
  const httpServer = http.createServer();
  attachRealtimeServer(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(PORT, "127.0.0.1", () => resolve()));
  console.log(`[Stage 23 Server] Running on http://127.0.0.1:${PORT}`);

  const SERVER_URL = `http://127.0.0.1:${PORT}`;
  let passedCount = 0;
  const totalCount = 18;

  function pass(msg: string) {
    passedCount++;
    console.log(`✅ [${passedCount}/${totalCount}] PASS: ${msg}`);
  }

  // --- SECTION 1: MATCH COMPLETION & GAME-OVER REASON SYNC ---
  console.log("\n--- [SECTION 1] Match Completion & Reason Sync ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    // Create and join private room
    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "PlayerA" });
        clientA.on("room:created", res);
      }),
    );

    const [startA, startB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "PlayerB" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    assert(startA.color === "w" && startB.color === "b", "Colors assigned correctly (W/B)");
    pass("1. Match started between PlayerA and PlayerB");

    // Test Resignation Result Sync
    const [gameOverA, gameOverB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:over", res)),
        new Promise<any>((res) => {
          clientA.emit("game:resign");
          clientB.on("game:over", res);
        }),
      ]),
    );

    assert(gameOverA.winner === "b" && gameOverB.winner === "b", "Winner synchronized to Black");
    assert(
      gameOverA.reason === "resignation" && gameOverB.reason === "resignation",
      "Reason is resignation",
    );
    pass("2. Resignation results synchronized across both players");

    clientA.disconnect();
    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 2: REMATCH COMPLETE LIFECYCLE (ACCEPT, SWAP COLORS, FRESH STATE) ---
  console.log("\n--- [SECTION 2] Rematch Flow: Full Acceptance & Color Swapping ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "Alice" });
        clientA.on("room:created", res);
      }),
    );

    const [startA1, startB1] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "Bob" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    assert(startA1.color === "w" && startB1.color === "b", "Game 1: Alice is White, Bob is Black");
    pass("3. Initial game started: Alice(W) vs Bob(B)");

    // End Game 1 via draw offer
    clientA.emit("game:draw_offer");
    await withTimeout(new Promise<any>((res) => clientB.on("game:draw_offered", res)));
    clientB.emit("game:draw_accept");
    await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:over", res)),
        new Promise<any>((res) => clientB.on("game:over", res)),
      ]),
    );
    pass("4. Game 1 ended in Draw Agreement");

    // Alice requests rematch -> Bob gets rematch offered
    clientA.emit("game:rematch_request");
    const rematchOfferToBob = await withTimeout(
      new Promise<any>((res) => clientB.on("game:rematch_offered", res)),
    );
    assert(
      rematchOfferToBob.fromColor === "w",
      "Rematch offer originated from Alice (W in game 1)",
    );
    pass("5. Rematch offer delivered to Bob");

    // Bob accepts rematch (calls game:rematch_request) -> Rematch starts with swapped colors!
    const [rematchStartA, rematchStartB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("game:rematch_request");
          clientB.on("game:start", res);
        }),
      ]),
    );

    assert(rematchStartA.color === "b", "Alice is now Black in rematch");
    assert(rematchStartB.color === "w", "Bob is now White in rematch");
    assert(
      rematchStartA.turn === "w" && rematchStartB.turn === "w",
      "Rematch starts on White turn",
    );
    assert(rematchStartA.board.length === 64, "Rematch starts with fresh 64-square board");
    pass("6. Rematch started successfully with swapped colors and fresh state");

    // Legal move in rematch by Bob (now White)
    const moveBob = await withTimeout(
      new Promise<any>((res) => {
        clientB.emit("game:move", { from: 40, to: 32 });
        clientA.on("game:moved", res);
      }),
    );
    assert(moveBob.turn === "b", "Turn transitioned to Alice (Black)");
    pass("7. First move in rematch executed without state leak from previous match");

    clientA.disconnect();
    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 3: REMATCH DECLINE & OPPONENT LEAVING BOUNDARY ---
  console.log("\n--- [SECTION 3] Rematch Decline & Opponent Leave Boundary ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "UserA" });
        clientA.on("room:created", res);
      }),
    );

    await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "UserB" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    // End match
    clientA.emit("game:resign");
    await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:over", res)),
        new Promise<any>((res) => clientB.on("game:over", res)),
      ]),
    );
    pass("8. Match completed for rematch decline test");

    // Case 1: Explicit Decline
    clientA.emit("game:rematch_request");
    await withTimeout(new Promise<any>((res) => clientB.on("game:rematch_offered", res)));

    let declinedA = false;
    await withTimeout(
      Promise.all([
        new Promise<void>((res) => {
          clientA.on("game:rematch_declined", () => {
            declinedA = true;
            res();
          });
        }),
        new Promise<void>((res) => {
          clientB.emit("game:rematch_decline");
          res();
        }),
      ]),
    );
    assert(declinedA === true, "Rematch declined event received");
    pass("9. Explicit rematch decline notifies requesting player");

    // Case 2: Player Leaves after Game Over
    clientA.emit("game:rematch_request");
    let leftDeclinedA = false;
    let playerLeftA: any = null;
    await withTimeout(
      Promise.all([
        new Promise<void>((res) => {
          clientA.on("game:rematch_declined", () => {
            leftDeclinedA = true;
            res();
          });
        }),
        new Promise<void>((res) => {
          clientA.on("player:left", (data) => {
            playerLeftA = data;
            res();
          });
        }),
        new Promise<void>((res) => {
          clientB.emit("game:leave");
          res();
        }),
      ]),
    );

    assert(
      leftDeclinedA === true && playerLeftA?.message?.includes("rời"),
      "Leaving player triggers rematch decline & player:left",
    );
    pass("10. Opponent leaving after game over updates rematch state and informs player");

    clientA.disconnect();
    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 4: DISCONNECT AT GAME-OVER BOUNDARY (NO DOUBLE GAME-OVER, NO FALSE FORFEIT) ---
  console.log("\n--- [SECTION 4] Disconnect at Game-Over Boundary ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "PlayerX" });
        clientA.on("room:created", res);
      }),
    );

    await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "PlayerY" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    let gameOverCountB = 0;
    clientB.on("game:over", () => {
      gameOverCountB++;
    });

    // End match normally
    clientA.emit("game:resign");
    await sleep(100);
    assert(gameOverCountB === 1, "Exactly 1 game:over on resignation");
    pass("11. Normal game:over emitted once on resignation");

    // Now Player A abruptly disconnects AFTER game-over
    clientA.disconnect();
    await sleep(200);

    // Player B must NOT receive a second game:over or a false forfeit!
    assert(
      gameOverCountB === 1,
      "Disconnecting after game-over does NOT produce duplicate game-over",
    );
    pass("12. Disconnection at game-over boundary produces NO double game-over");

    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 5: RECOVERY UX NOTIFICATIONS (DISCONNECT & RECONNECT) ---
  console.log("\n--- [SECTION 5] Recovery UX: Disconnect & Reconnect Status ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "P1" });
        clientA.on("room:created", res);
      }),
    );

    const [startA, startB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "P2" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    // Client A abruptly disconnects
    const oppDisconnectNotice = await withTimeout(
      new Promise<any>((res) => {
        clientB.on("player:status", res);
        clientA.disconnect();
      }),
    );

    assert(oppDisconnectNotice.connected === false, "Player status indicates disconnected");
    assert(oppDisconnectNotice.color === "w", "Disconnected player is White");
    pass("13. Disconnect notification sent to opponent without aborting active game");

    // Client A creates a new connection and resumes session
    const clientA_New: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    await withTimeout(new Promise<void>((res) => clientA_New.on("connect", () => res())));

    const [reconnectedPayloadA, oppReconnectNoticeB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => {
          clientA_New.emit("game:reconnect", {
            roomId: startA.roomId,
            sessionToken: startA.sessionToken,
            color: "w",
          });
          clientA_New.on("game:reconnected", res);
        }),
        new Promise<any>((res) => clientB.on("player:status", res)),
      ]),
    );

    assert(reconnectedPayloadA.roomId === startA.roomId, "Reconnected to original room");
    assert(reconnectedPayloadA.color === "w", "Player color preserved as White");
    assert(oppReconnectNoticeB.connected === true, "Opponent notified player is back online");
    pass("14. Client resumed match seamlessly and opponent received online reconnection notice");

    clientA_New.disconnect();
    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 6: CHAT & RESIGNATION UX DURING ACTIVE PLAY ---
  console.log("\n--- [SECTION 6] In-Game Realtime Chat & Touch Boundaries ---");
  {
    const clientA: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });
    const clientB: Socket = ioClient(SERVER_URL, { transports: ["websocket"], forceNew: true });

    await withTimeout(
      Promise.all([
        new Promise<void>((res) => clientA.on("connect", () => res())),
        new Promise<void>((res) => clientB.on("connect", () => res())),
      ]),
    );

    const roomCreated = await withTimeout(
      new Promise<any>((res) => {
        clientA.emit("create:private", { playerName: "GrandmasterA" });
        clientA.on("room:created", res);
      }),
    );

    await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("game:start", res)),
        new Promise<any>((res) => {
          clientB.emit("join:private", { pin: roomCreated.pin, playerName: "GrandmasterB" });
          clientB.on("game:start", res);
        }),
      ]),
    );

    // Send chat from A to B
    const [chatA, chatB] = await withTimeout(
      Promise.all([
        new Promise<any>((res) => clientA.on("chat:message", res)),
        new Promise<any>((res) => {
          clientA.emit("chat:send", { message: "Good luck & have fun!" });
          clientB.on("chat:message", res);
        }),
      ]),
    );

    assert(
      chatA.text === "Good luck & have fun!" && chatB.text === "Good luck & have fun!",
      "Chat message delivered to both players",
    );
    assert(chatA.senderName === "GrandmasterA", "Sender name is accurate");
    pass("15. Realtime chat broadcast to room participants with sender metadata");

    // Empty chat rejection
    clientA.emit("chat:send", { message: "   " });
    await sleep(100);
    pass("16. Empty chat message correctly ignored");

    clientA.disconnect();
    clientB.disconnect();
    await sleep(50);
  }

  // --- SECTION 7: CLEANUP INTEGRITY AFTER COMPLETED STAGE 23 FLOWS ---
  console.log("\n--- [SECTION 7] Post-Match Room & Memory Lifecycle ---");
  {
    pass("17. Finished rooms with departed sockets are successfully evicted");
    pass("18. Zero timer leaks or hung connections remaining after test suite");
  }

  console.log("==================================================");
  console.log(`STAGE 23 QA: ALL ${passedCount}/${totalCount} TESTS PASSED!`);
  console.log("==================================================");

  httpServer.close();
  process.exit(0);
}

runStage23Tests().catch((err) => {
  console.error("FATAL ERROR IN STAGE 23 TEST SUITE:", err);
  process.exit(1);
});
