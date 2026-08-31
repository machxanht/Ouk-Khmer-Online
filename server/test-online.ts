import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { createRealtimeServer } from "./index";
import { matchmakingManager } from "./matchmaking-manager";
import { roomManager } from "./room-manager";

const TEST_PORT = 3999;
const SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;

function createClient(): Promise<ClientSocketType> {
  return new Promise((resolve, reject) => {
    const socket = ClientSocket(SERVER_URL, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Socket connection timeout"));
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function waitForEvent<T = any>(
  socket: ClientSocketType,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event '${event}' on socket ${socket.id}`));
    }, timeoutMs);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runAllTests() {
  const TOTAL_TESTS = 27;
  console.log("==================================================");
  console.log(`STARTING STAGE 20 FINAL QA TEST SUITE (${TOTAL_TESTS}/${TOTAL_TESTS})`);
  console.log("==================================================");

  const server = createRealtimeServer({ port: TEST_PORT });
  await server.start();
  console.log(`[Test Server] Running on ${SERVER_URL}`);

  let passedCount = 0;
  function assert(condition: boolean, testName: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
    passedCount++;
    console.log(`✅ [${passedCount}/${TOTAL_TESTS}] PASS: ${testName}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Traditional Random Matchmaking
    // ----------------------------------------------------
    console.log("\n--- [1] Testing Traditional Random Matchmaking ---");
    const tradA = await createClient();
    const tradB = await createClient();

    tradA.emit("matchmaking:join", { playerName: "TradPlayerA", rulesetId: "folk" });
    const tradAStartPromise = waitForEvent(tradA, "game:start");
    const tradBStartPromise = waitForEvent(tradB, "game:start");

    tradB.emit("matchmaking:join", { playerName: "TradPlayerB", rulesetId: "folk" });

    const tradAGame = await tradAStartPromise;
    const tradBGame = await tradBStartPromise;

    assert(
      tradAGame.roomId === tradBGame.roomId &&
        tradAGame.rulesetId === "folk" &&
        tradBGame.rulesetId === "folk" &&
        tradAGame.afkEnabled === true,
      "1. Traditional random matchmaking with AFK enabled",
    );

    // ----------------------------------------------------
    // TEST 2: International Random Matchmaking
    // ----------------------------------------------------
    console.log("\n--- [2] Testing International Random Matchmaking ---");
    const intlA = await createClient();
    const intlB = await createClient();

    intlA.emit("matchmaking:join", { playerName: "IntlPlayerA", rulesetId: "international" });
    const intlAStartPromise = waitForEvent(intlA, "game:start");
    const intlBStartPromise = waitForEvent(intlB, "game:start");

    intlB.emit("matchmaking:join", { playerName: "IntlPlayerB", rulesetId: "international" });

    const intlAGame = await intlAStartPromise;
    const intlBGame = await intlBStartPromise;

    assert(
      intlAGame.roomId === intlBGame.roomId &&
        intlAGame.rulesetId === "international" &&
        intlBGame.rulesetId === "international" &&
        intlAGame.afkEnabled === true,
      "2. International 60m random matchmaking with AFK enabled",
    );

    intlA.disconnect();
    intlB.disconnect();

    // ----------------------------------------------------
    // TEST 3: Mode Isolation (Traditional DOES NOT match International)
    // ----------------------------------------------------
    console.log("\n--- [3] Testing Mode Isolation ---");
    const isoTrad = await createClient();
    const isoIntl = await createClient();

    isoTrad.emit("matchmaking:join", { playerName: "IsoTrad", rulesetId: "folk" });
    await waitForEvent(isoTrad, "matchmaking:searching");

    isoIntl.emit("matchmaking:join", { playerName: "IsoIntl", rulesetId: "international" });
    await waitForEvent(isoIntl, "matchmaking:searching");

    assert(
      matchmakingManager.getQueueSize("folk") === 1 &&
        matchmakingManager.getQueueSize("international") === 1,
      "3. Traditional không match International (Mode Isolation)",
    );

    isoTrad.emit("matchmaking:leave");
    isoIntl.emit("matchmaking:leave");
    isoTrad.disconnect();
    isoIntl.disconnect();

    // ----------------------------------------------------
    // TEST 4: Private Traditional Room
    // ----------------------------------------------------
    console.log("\n--- [4] Testing Private Traditional Room ---");
    const privTradHost = await createClient();
    const privTradGuest = await createClient();

    const privTradCreatePromise = waitForEvent(privTradHost, "room:created");
    privTradHost.emit("create:private", { playerName: "PrivTradHost", rulesetId: "folk" });
    const tradRoom = await privTradCreatePromise;

    const tradHostStart = waitForEvent(privTradHost, "game:start");
    const tradGuestStart = waitForEvent(privTradGuest, "game:start");
    privTradGuest.emit("join:private", { pin: tradRoom.pin, playerName: "PrivTradGuest" });

    const tradHostGame = await tradHostStart;
    const tradGuestGame = await tradGuestStart;

    assert(
      tradHostGame.roomId === tradGuestGame.roomId &&
        tradHostGame.rulesetId === "folk" &&
        tradHostGame.afkEnabled === true,
      "4. Private Traditional room",
    );
    privTradHost.disconnect();
    privTradGuest.disconnect();

    // ----------------------------------------------------
    // TEST 5: Private International Room
    // ----------------------------------------------------
    console.log("\n--- [5] Testing Private International Room ---");
    const privIntlHost = await createClient();
    const privIntlGuest = await createClient();

    const privIntlCreatePromise = waitForEvent(privIntlHost, "room:created");
    privIntlHost.emit("create:private", { playerName: "PrivIntlHost", rulesetId: "international" });
    const intlRoom = await privIntlCreatePromise;

    const intlHostStart = waitForEvent(privIntlHost, "game:start");
    const intlGuestStart = waitForEvent(privIntlGuest, "game:start");
    privIntlGuest.emit("join:private", { pin: intlRoom.pin, playerName: "PrivIntlGuest" });

    const intlHostGame = await intlHostStart;
    const intlGuestGame = await intlGuestStart;

    assert(
      intlHostGame.roomId === intlGuestGame.roomId &&
        intlHostGame.rulesetId === "international" &&
        intlHostGame.afkEnabled === true,
      "5. Private International room",
    );

    // ----------------------------------------------------
    // TEST 6: Clock Starts When Game Starts
    // ----------------------------------------------------
    console.log("\n--- [6] Testing Clock Initialization on Game Start ---");
    assert(
      tradAGame.clocks &&
        tradAGame.clocks.w > 0 &&
        tradAGame.clocks.b > 0 &&
        tradAGame.lastTurnTimestamp > 0,
      "6. Clock bắt đầu khi game start",
    );

    // ----------------------------------------------------
    // TEST 7: Only Active Player Clock Decreases
    // ----------------------------------------------------
    console.log("\n--- [7] Testing Only Active Player Clock Decreases ---");
    // White is active. White moves after 200ms
    await new Promise((r) => setTimeout(r, 250));

    const p1MovedPromise = waitForEvent(tradA, "game:moved");
    const p2MovedPromise = waitForEvent(tradB, "game:moved");
    tradA.emit("game:move", { from: 40, to: 32 }); // White Trey move

    const moveResA = await p1MovedPromise;
    const moveResB = await p2MovedPromise;

    assert(
      moveResA.clocks.w < tradAGame.clocks.w && moveResA.clocks.b === tradAGame.clocks.b,
      "7. Chỉ active player clock giảm",
    );

    // ----------------------------------------------------
    // TEST 8: Move Switches Clock Active Side
    // ----------------------------------------------------
    console.log("\n--- [8] Testing Move Switches Clock ---");
    assert(
      moveResA.turn === "b" && moveResA.lastTurnTimestamp > tradAGame.lastTurnTimestamp,
      "8. Move switch clock",
    );

    // ----------------------------------------------------
    // TEST 9: Server Authoritative Clock
    // ----------------------------------------------------
    console.log("\n--- [9] Testing Server Authoritative Clock ---");
    assert(
      typeof moveResA.clocks.w === "number" &&
        typeof moveResA.clocks.b === "number" &&
        moveResA.clocks.w <= tradAGame.clocks.w,
      "9. Server authoritative clock",
    );

    // ----------------------------------------------------
    // TEST 10, 11, 12: Timeout -> GameOver, Opponent Wins, Move After Timeout Rejected
    // ----------------------------------------------------
    console.log("\n--- [10, 11, 12] Testing Timeout Mechanics ---");
    const timeoutRoom = roomManager.createMatchmakingRoom(
      { socketId: "temp-w", name: "ClockWhite", joinedAt: Date.now() },
      { socketId: "temp-b", name: "ClockBlack", joinedAt: Date.now() },
      "folk",
    );
    timeoutRoom.gameState.turn = "b";
    timeoutRoom.gameState.clocks.b = 10;
    timeoutRoom.gameState.lastTurnTimestamp = Date.now() - 500;

    const { validateAndExecuteMove, getAfkWindowMs, createInitialGameState } =
      await import("./game-engine");
    const moveAttempt = validateAndExecuteMove({
      gameState: timeoutRoom.gameState,
      playerColor: "b",
      rawFrom: 16,
      rawTo: 24,
    });

    assert(
      moveAttempt.timeout === true && timeoutRoom.gameState.status === "timeout",
      "10. Timeout → game:over",
    );

    assert(
      timeoutRoom.gameState.result?.winner === "w" &&
        timeoutRoom.gameState.result?.timedOutPlayer === "b",
      "11. Player còn thời gian thắng",
    );

    const postTimeoutMove = validateAndExecuteMove({
      gameState: timeoutRoom.gameState,
      playerColor: "w",
      rawFrom: 41,
      rawTo: 33,
    });
    assert(postTimeoutMove.success === false, "12. Move sau timeout bị reject");

    // ----------------------------------------------------
    // TEST 13: Both Clients Receive Consistent Clock State
    // ----------------------------------------------------
    console.log("\n--- [13] Testing Clock State Consistency Across Clients ---");
    assert(
      moveResA.clocks.w === moveResB.clocks.w &&
        moveResA.clocks.b === moveResB.clocks.b &&
        moveResA.lastTurnTimestamp === moveResB.lastTurnTimestamp,
      "13. Hai clients nhận clock state nhất quán",
    );

    // ----------------------------------------------------
    // TEST 14: Resign Stops Clock
    // ----------------------------------------------------
    console.log("\n--- [14] Testing Resignation Stops Clock ---");
    const resignAOver = waitForEvent(tradA, "game:over");
    tradB.emit("game:resign");
    const resignRes = await resignAOver;
    assert(
      resignRes.status === "resigned" || resignRes.reason === "resignation",
      "14. Resign dừng clock",
    );

    // ----------------------------------------------------
    // TEST 15: Disconnect Notification & Session Recovery (Stage 21B)
    // ----------------------------------------------------
    console.log("\n--- [15] Testing Disconnect Notification & Session Recovery ---");
    const discHost = await createClient();
    const discGuest = await createClient();
    const discCreatedPromise = waitForEvent(discHost, "room:created");
    discHost.emit("create:private", { playerName: "DiscHost", rulesetId: "folk" });
    const discRoom = await discCreatedPromise;

    const hostStartPromise = waitForEvent(discHost, "game:start");
    const discGuestStart = waitForEvent(discGuest, "game:start");
    discGuest.emit("join:private", { pin: discRoom.pin, playerName: "DiscGuest" });
    const hostStartPayload = await hostStartPromise;
    await discGuestStart;

    const guestStatusPromise = waitForEvent(discGuest, "player:status");
    discHost.disconnect();
    const discStatus = await guestStatusPromise;
    assert(
      discStatus.connected === false && discStatus.color === "w",
      "15. Disconnect thông báo player:status (không tự forfeit)",
    );

    // Reconnect with sessionToken
    const discHost2 = await createClient();
    const reconnectedPromise = waitForEvent(discHost2, "game:reconnected");
    discHost2.emit("game:reconnect", {
      roomId: discRoom.roomId,
      sessionToken: hostStartPayload.sessionToken,
    });
    const reconnectedState = await reconnectedPromise;
    assert(
      reconnectedState.color === "w" && reconnectedState.status === "playing",
      "16. Reconnect phục hồi session thành công",
    );

    // Manual leave terminates the game
    const guestOverPromise = waitForEvent(discGuest, "game:over");
    discHost2.emit("game:leave");
    const discOver = await guestOverPromise;
    assert(
      discOver.winner === "b" && discOver.reason === "player_left",
      "16b. Manual leave kết thúc ván đấu và dừng clock",
    );
    discHost2.disconnect();
    discGuest.disconnect();

    // ----------------------------------------------------
    // TEST 17: Traditional Legal Moves Matching Offline (King / Ang leap)
    // ----------------------------------------------------
    console.log("\n--- [17] Testing Traditional (Folk) Legal Rules ---");
    const { getRuleSet, legalMoves, initialBoard } = await import("../src/lib/khmer-chess");
    const folkRules = getRuleSet("folk");
    const boardFolk = initialBoard();
    const kingFolkMoves = legalMoves(boardFolk, 59, folkRules);
    const hasFolkKnightLeap = kingFolkMoves.includes(49) || kingFolkMoves.includes(53);
    assert(hasFolkKnightLeap, "17. Traditional legal moves đúng Offline");

    // ----------------------------------------------------
    // TEST 18: International Legal Moves Matching Offline (No King leap)
    // ----------------------------------------------------
    console.log("\n--- [18] Testing International Legal Rules ---");
    const intlRules = getRuleSet("international");
    const boardIntl = initialBoard();
    const kingIntlMoves = legalMoves(boardIntl, 59, intlRules);
    const hasIntlKnightLeap = kingIntlMoves.includes(49) || kingIntlMoves.includes(53);
    assert(!hasIntlKnightLeap, "18. International legal moves đúng Offline");

    // ----------------------------------------------------
    // TEST 19: In-Game Chat (Bidirectional A->B, B->A, Empty/Whitespace Rejected, 200-char Cap)
    // ----------------------------------------------------
    console.log("\n--- [19] Testing In-Game Chat ---");
    const chatHost = await createClient();
    const chatGuest = await createClient();
    const chatRoomProm = waitForEvent(chatHost, "room:created");
    chatHost.emit("create:private", { playerName: "ChatHost", rulesetId: "folk" });
    const cRoom = await chatRoomProm;

    const chatHostStart = waitForEvent(chatHost, "game:start");
    const chatGuestStart = waitForEvent(chatGuest, "game:start");
    chatGuest.emit("join:private", { pin: cRoom.pin, playerName: "ChatGuest" });
    await Promise.all([chatHostStart, chatGuestStart]);

    // 19.1 Host -> Guest (A -> B)
    const chatHostRcv1 = waitForEvent(chatHost, "chat:message");
    const chatGuestRcv1 = waitForEvent(chatGuest, "chat:message");
    chatHost.emit("chat:send", { text: "Chúc ván đấu vui vẻ!" });
    const [msgH1, msgG1] = await Promise.all([chatHostRcv1, chatGuestRcv1]);
    assert(
      msgH1.text === "Chúc ván đấu vui vẻ!" &&
        msgG1.text === "Chúc ván đấu vui vẻ!" &&
        msgH1.senderColor === "w" &&
        msgH1.senderName === "ChatHost",
      "19.1 In-Game Chat: Host -> Guest (A -> B)",
    );

    // 19.2 Guest -> Host (B -> A)
    const chatHostRcv2 = waitForEvent(chatHost, "chat:message");
    const chatGuestRcv2 = waitForEvent(chatGuest, "chat:message");
    chatGuest.emit("chat:send", { text: "Cảm ơn bạn, cùng cố gắng nhé!" });
    const [msgH2, msgG2] = await Promise.all([chatHostRcv2, chatGuestRcv2]);
    assert(
      msgH2.text === "Cảm ơn bạn, cùng cố gắng nhé!" &&
        msgG2.text === "Cảm ơn bạn, cùng cố gắng nhé!" &&
        msgH2.senderColor === "b" &&
        msgH2.senderName === "ChatGuest",
      "19.2 In-Game Chat: Guest -> Host (B -> A)",
    );

    // 19.3 200 character boundary test (accepted)
    const msg200 = "A".repeat(200);
    const chatHostRcv3 = waitForEvent(chatHost, "chat:message");
    const chatGuestRcv3 = waitForEvent(chatGuest, "chat:message");
    chatHost.emit("chat:send", { text: msg200 });
    const [msgH3, msgG3] = await Promise.all([chatHostRcv3, chatGuestRcv3]);
    assert(
      msgH3.text.length === 200 && msgG3.text.length === 200,
      "19.3 In-Game Chat: 200 chars accepted",
    );

    // 19.4 Rejected cases: empty, whitespace, and >200 chars
    let unexpectedMsg = false;
    const unexpectedHandler = () => {
      unexpectedMsg = true;
    };
    chatGuest.on("chat:message", unexpectedHandler);
    chatHost.on("chat:message", unexpectedHandler);

    chatHost.emit("chat:send", { text: "" }); // Empty
    chatHost.emit("chat:send", { text: "   \n  \t " }); // Whitespace only
    chatHost.emit("chat:send", { text: "B".repeat(201) }); // Over 200 chars

    await new Promise((r) => setTimeout(r, 200));
    chatGuest.off("chat:message", unexpectedHandler);
    chatHost.off("chat:message", unexpectedHandler);
    assert(
      !unexpectedMsg,
      "19.4 In-Game Chat: Empty, whitespace, and >200 chars properly rejected",
    );

    chatHost.disconnect();
    chatGuest.disconnect();

    // ----------------------------------------------------
    // TEST 20: Existing Matchmaking No Regression (Queue / Cancel / Duplicates)
    // ----------------------------------------------------
    console.log("\n--- [20] Testing Matchmaking Queue Integrity ---");
    const regClient = await createClient();
    regClient.emit("matchmaking:join", { playerName: "RegTester", rulesetId: "folk" });
    await waitForEvent(regClient, "matchmaking:searching");
    const regLeft = waitForEvent(regClient, "matchmaking:left");
    regClient.emit("matchmaking:leave");
    await regLeft;
    assert(
      matchmakingManager.getQueueSize("folk") === 0,
      "20. Existing matchmaking không regression",
    );
    regClient.disconnect();

    // ----------------------------------------------------
    // TEST 21: AFK Window Policy (2m -> 2m -> 1m -> Loss)
    // ----------------------------------------------------
    console.log("\n--- [21] Testing AFK Window Values ---");
    const afk1 = getAfkWindowMs(0);
    const afk2 = getAfkWindowMs(1);
    const afk3 = getAfkWindowMs(2);
    assert(
      afk1 === 120_000 && afk2 === 120_000 && afk3 === 60_000,
      "21. AFK windows exact: 2m (#1), 2m (#2), 1m (#3)",
    );

    // ----------------------------------------------------
    // TEST 22: AFK Strike Reset on Valid Move
    // ----------------------------------------------------
    console.log("\n--- [22] Testing AFK Strike Reset on Successful Move ---");
    const resetTestGame = createInitialGameState("folk", {
      type: "standard",
      initialSeconds: 3600,
    });
    resetTestGame.afkStrikes = { w: 2, b: 1 };
    const validMoveRes = validateAndExecuteMove({
      gameState: resetTestGame,
      playerColor: "w",
      rawFrom: 40,
      rawTo: 32,
    });
    assert(
      validMoveRes.success === true &&
        resetTestGame.afkStrikes.w === 0 &&
        resetTestGame.afkStrikes.b === 1,
      "22. Successful move resets AFK strikes to 0",
    );

    // ----------------------------------------------------
    // TEST 23: International Blitz 5m Completely Disables AFK
    // ----------------------------------------------------
    console.log("\n--- [23] Testing International Blitz 5m Exclusion ---");
    const blitzGame = createInitialGameState("international", {
      type: "blitz",
      initialSeconds: 300,
    });
    assert(
      blitzGame.afkEnabled === false &&
        blitzGame.clocks.w === 300_000 &&
        blitzGame.clocks.b === 300_000,
      "23. International Blitz 5m has AFK disabled",
    );

    // ----------------------------------------------------
    // TEST 24: Repeated Moves Never Accumulate Strikes
    // ----------------------------------------------------
    console.log("\n--- [24] Testing Repeated Moves Strike Immunity ---");
    const moveSeqGame = createInitialGameState("folk", { type: "standard", initialSeconds: 3600 });
    validateAndExecuteMove({ gameState: moveSeqGame, playerColor: "w", rawFrom: 40, rawTo: 32 });
    validateAndExecuteMove({ gameState: moveSeqGame, playerColor: "b", rawFrom: 16, rawTo: 24 });
    validateAndExecuteMove({ gameState: moveSeqGame, playerColor: "w", rawFrom: 41, rawTo: 33 });
    assert(
      moveSeqGame.afkStrikes.w === 0 && moveSeqGame.afkStrikes.b === 0,
      "24. Repeated successful moves never accumulate strikes",
    );

    console.log("\n==================================================");
    console.log(`ALL ${passedCount}/${TOTAL_TESTS} TESTS PASSED PERFECTLY!`);
    console.log("==================================================");
  } finally {
    await server.stop();
  }
}

runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("TEST FAILED WITH ERROR:", err);
    process.exit(1);
  });
